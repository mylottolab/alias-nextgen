-- =====================================================================
-- 누름 (Nureum) 1단계 — 부름 Supabase SQL Editor 에 붙여 넣고 Run.  (2026-10-30)
-- 여러 번 돌려도 괜찮습니다. 부름의 기존 표(links · link_sides · invites · calls)는
-- 읽기만 하고 고치지 않습니다. 초대장만 누름이 대신 만들어 줍니다.
--
--   라인 하나 = 부름 1:1 연결(link) 하나 + 누름 표의 한 줄
--   · 만든 사람(개설자)이 요금을 냅니다. 라인마다 따로 계산.
--   · 1개월권 1,650원 · 12개월권 16,500원(부가세 포함), 여러 장 구입 가능
--   · 한 달 기본 용량: 음성 200분 · 영상 70분 · 저장 1GB (설정 표에서 바꿀 수 있음)
--   · 넘으면 ① 추가 구입(각 1,100원) ② 다음 달 것 당겨 쓰기(남은 기간 1개월 줄어듦)
-- =====================================================================

create table if not exists public.nureum_settings (
  id int primary key default 1 check (id = 1),
  price_1m int not null default 1650,
  price_12m int not null default 16500,
  voice_min int not null default 200,
  video_min int not null default 70,
  storage_mb int not null default 1024,
  extra_price int not null default 1100,
  extra_voice_min int not null default 300,
  extra_video_min int not null default 100,
  extra_storage_mb int not null default 1024,
  code_minutes int not null default 10
);
insert into public.nureum_settings(id) values (1) on conflict do nothing;

create table if not exists public.nureum_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid,                       -- 지금 살아 있는 짝 맺기 초대장(invites.id)
  invite_code text,
  link_id uuid unique,                  -- 짝 맺으면 생기는 부름 1:1 연결
  plan_until timestamptz,               -- 여기까지 쓸 수 있음(null = 아직 안 삼)
  created_at timestamptz not null default now(),
  paired_at timestamptz,
  ended_at timestamptz,
  ended_by uuid
);
create index if not exists nureum_lines_owner on public.nureum_lines(owner_id);
create index if not exists nureum_lines_invite on public.nureum_lines(invite_id);

-- 두 사람 각자가 정한 이름 · 색 · 글자 (나는 "엄마", 엄마는 "아들")
create table if not exists public.nureum_sides (
  line_id uuid not null references public.nureum_lines(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  color text not null default '#E4572E',
  glyph text,
  auto_answer boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (line_id, account_id)
);
create index if not exists nureum_sides_account on public.nureum_sides(account_id);

-- 구입 · 덤 · 당겨 쓰기 기록 (돈이 오간 기록은 지우지 않습니다)
create table if not exists public.nureum_purchases (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.nureum_lines(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('1m','12m','voice','video','storage','borrow','grant')),
  qty int not null default 1 check (qty between 1 and 99),
  months int not null default 0,        -- 기간을 몇 개월 늘렸나(borrow 는 -1)
  amount int not null default 0,        -- 낸 돈(원, 부가세 포함)
  for_month date,                       -- 용량 추가 · 당겨 쓰기가 적용되는 달
  status text not null default 'completed' check (status in ('pending','completed','refunded')),
  order_id text unique,
  store text,                           -- inicis · google · apple · admin
  created_at timestamptz not null default now(),
  note text
);
create index if not exists nureum_purchases_line on public.nureum_purchases(line_id, for_month);

alter table public.nureum_settings enable row level security;
alter table public.nureum_lines enable row level security;
alter table public.nureum_sides enable row level security;
alter table public.nureum_purchases enable row level security;
-- 화면은 표를 직접 읽지 않고 아래 함수로만 씁니다.
revoke all on public.nureum_settings, public.nureum_lines, public.nureum_sides, public.nureum_purchases from anon, authenticated;
grant all on public.nureum_settings, public.nureum_lines, public.nureum_sides, public.nureum_purchases to service_role;

-- ── 도우미 ───────────────────────────────────────────────────────────
create or replace function public.nureum_month() returns date
language sql stable as $$ select (date_trunc('month', now() at time zone 'Asia/Seoul'))::date $$;

create or replace function public.nureum_is_admin() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v boolean;
begin
  begin execute 'select public.is_admin()' into v; exception when others then v := false; end;
  return coalesce(v, false);
end $$;

-- 이 연결이 살아 있는 누름 라인인가 (부름 대화창의 '보내기'가 이걸 보고 이용권 없이도 보냅니다)
create or replace function public.nureum_link_ok(p_link uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from nureum_lines l
     where l.link_id = p_link and l.ended_at is null and l.plan_until > now()
       and exists (select 1 from link_sides s where s.link_id = p_link and s.account_id = auth.uid()))
$$;

-- 짝 맺기 초대장 하나 새로 (전 것은 끊음)
create or replace function public.nureum__new_invite(p_line uuid, p_persona uuid)
returns text language plpgsql security definer set search_path = public as $$
declare l nureum_lines; s nureum_settings; v_id uuid; v_code text;
begin
  select * into l from nureum_lines where id = p_line for update;
  select * into s from nureum_settings where id = 1;
  if l.invite_id is not null then
    update invites set revoked_at = now() where id = l.invite_id and revoked_at is null;
  end if;
  insert into invites(issuer_account_id, issuer_persona_id, memo, max_uses, expires_at)
  values (l.owner_id, p_persona, '누름', 1, now() + make_interval(mins => s.code_minutes))
  returning id, code into v_id, v_code;
  update nureum_lines set invite_id = v_id, invite_code = v_code where id = p_line;
  return v_code;
end $$;
revoke all on function public.nureum__new_invite(uuid, uuid) from public, anon, authenticated;

-- ① 새 라인 만들기 → 라인 id 와 짝 맺기 코드
create or replace function public.nureum_create(p_name text, p_color text, p_glyph text, p_persona uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_line uuid; v_code text;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'login'); end if;
  if not exists (select 1 from personas where id = p_persona and account_id = v_me) then
    return json_build_object('ok', false, 'error', 'persona'); end if;
  if coalesce(char_length(trim(p_name)), 0) not between 1 and 20 then
    return json_build_object('ok', false, 'error', 'name'); end if;
  if (select count(*) from nureum_lines where owner_id = v_me and ended_at is null and link_id is null) >= 5 then
    return json_build_object('ok', false, 'error', 'too_many_waiting'); end if;
  insert into nureum_lines(owner_id) values (v_me) returning id into v_line;
  insert into nureum_sides(line_id, account_id, name, color, glyph)
  values (v_line, v_me, trim(p_name), coalesce(nullif(p_color, ''), '#E4572E'), nullif(trim(coalesce(p_glyph, '')), ''));
  v_code := nureum__new_invite(v_line, p_persona);
  return json_build_object('ok', true, 'line_id', v_line, 'code', v_code);
end $$;

-- 코드가 끝났으면 다시 받기 (짝 맺기 전에만)
create or replace function public.nureum_new_code(p_line uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); l nureum_lines; v_persona uuid; v_code text;
begin
  select * into l from nureum_lines where id = p_line and owner_id = v_me;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if l.link_id is not null or l.ended_at is not null then return json_build_object('ok', false, 'error', 'paired'); end if;
  select issuer_persona_id into v_persona from invites where id = l.invite_id;
  if v_persona is null then
    select id into v_persona from personas where account_id = v_me order by is_default desc, created_at limit 1;
  end if;
  v_code := nureum__new_invite(p_line, v_persona);
  return json_build_object('ok', true, 'code', v_code,
    'expires_at', (select expires_at from invites where code = v_code));
end $$;

-- 받는 쪽: 이 코드가 누름 라인인가 (짝 맺기 화면이 문구를 고르려고 묻습니다)
create or replace function public.nureum_code_info(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare l nureum_lines; i invites;
begin
  select * into l from nureum_lines where lower(invite_code) = lower(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')) limit 1;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if l.link_id is not null or l.ended_at is not null then return json_build_object('ok', false, 'error', 'used'); end if;
  select * into i from invites where id = l.invite_id;
  if i.revoked_at is not null or (i.expires_at is not null and i.expires_at < now()) then
    return json_build_object('ok', false, 'error', 'expired'); end if;
  if l.owner_id = auth.uid() then return json_build_object('ok', false, 'error', 'self'); end if;
  return json_build_object('ok', true, 'code', l.invite_code, 'from', (select display_name from personas where id = i.issuer_persona_id));
end $$;

-- ② 받는 쪽: 부름 accept_invite 로 이어진 뒤, 그 연결을 누름 라인에 붙이고 내 이름 · 색을 정합니다
create or replace function public.nureum_attach(p_code text, p_name text, p_color text, p_glyph text)
returns json language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); l nureum_lines; v_link uuid;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'login'); end if;
  select * into l from nureum_lines where lower(invite_code) = lower(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')) for update;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if l.owner_id = v_me then return json_build_object('ok', false, 'error', 'self'); end if;
  if l.link_id is not null then
    if exists (select 1 from nureum_sides where line_id = l.id and account_id = v_me) then
      return json_build_object('ok', true, 'line_id', l.id, 'link_id', l.link_id); end if;
    return json_build_object('ok', false, 'error', 'used');
  end if;
  select k.id into v_link from links k
    join link_sides s on s.link_id = k.id and s.account_id = v_me
   where k.via_invite_id = l.invite_id
   order by k.created_at desc limit 1;
  if v_link is null then return json_build_object('ok', false, 'error', 'not_linked'); end if;
  update nureum_lines set link_id = v_link, paired_at = now() where id = l.id;
  insert into nureum_sides(line_id, account_id, name, color, glyph)
  values (l.id, v_me, coalesce(nullif(trim(p_name), ''), '누름'), coalesce(nullif(p_color, ''), '#2B59C3'), nullif(trim(coalesce(p_glyph, '')), ''))
  on conflict (line_id, account_id) do nothing;
  return json_build_object('ok', true, 'line_id', l.id, 'link_id', v_link);
end $$;

-- 이번 달 용량 · 사용량 (초 단위로 계산해 분으로 돌려줌)
create or replace function public.nureum__usage(p_line uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare l nureum_lines; s nureum_settings; m date := nureum_month(); v_from timestamptz; v_to timestamptz;
  v_voice int; v_video int; xv int; xd int; xs int; nb int;
begin
  select * into l from nureum_lines where id = p_line;
  select * into s from nureum_settings where id = 1;
  v_from := (m::timestamp) at time zone 'Asia/Seoul';
  v_to := ((m + interval '1 month')::timestamp) at time zone 'Asia/Seoul';
  select coalesce(sum(case when call_type = 'video' then 0 else coalesce(duration_seconds, 0) end), 0),
         coalesce(sum(case when call_type = 'video' then coalesce(duration_seconds, 0) else 0 end), 0)
    into v_voice, v_video
    from calls where l.link_id is not null and link_id = l.link_id and created_at >= v_from and created_at < v_to;
  select coalesce(sum(qty) filter (where kind = 'voice'), 0), coalesce(sum(qty) filter (where kind = 'video'), 0),
         coalesce(sum(qty) filter (where kind = 'storage'), 0), coalesce(sum(qty) filter (where kind = 'borrow'), 0)
    into xv, xd, xs, nb
    from nureum_purchases where line_id = p_line and for_month = m and status = 'completed';
  return json_build_object(
    'month', m,
    'voice_used_min', ceil(v_voice / 60.0)::int,
    'video_used_min', ceil(v_video / 60.0)::int,
    'voice_max_min', s.voice_min * (1 + nb) + s.extra_voice_min * xv,
    'video_max_min', s.video_min * (1 + nb) + s.extra_video_min * xd,
    'storage_max_mb', s.storage_mb * (1 + nb) + s.extra_storage_mb * xs,
    'borrowed', nb);
end $$;
revoke all on function public.nureum__usage(uuid) from public, anon, authenticated;

-- ③ 내 라인들 (바탕화면 아이콘 · 목록용)
create or replace function public.nureum_my_lines()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at), '[]'::json) from (
    select l.id, l.link_id, l.created_at, l.paired_at, l.plan_until,
           (l.owner_id = auth.uid()) as is_owner,
           (l.plan_until is not null and l.plan_until > now()) as active,
           ms.name, ms.color, ms.glyph, ms.auto_answer,
           (select os.name from nureum_sides os where os.line_id = l.id and os.account_id <> auth.uid() limit 1) as peer_name_for_me,
           (select p.display_name from link_sides ls join personas p on p.id = ls.persona_id
             where ls.link_id = l.link_id and ls.account_id <> auth.uid() limit 1) as peer_alias,
           (select ls.id from link_sides ls where ls.link_id = l.link_id and ls.account_id = auth.uid() limit 1) as my_side_id
      from nureum_lines l join nureum_sides ms on ms.line_id = l.id and ms.account_id = auth.uid()
     where l.ended_at is null) x
$$;

-- ④ 라인 하나 (라인 화면 · 요금 화면)
create or replace function public.nureum_line(p_line uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid(); l nureum_lines; ms nureum_sides; s nureum_settings; i invites;
begin
  select * into l from nureum_lines where id = p_line;
  select * into ms from nureum_sides where line_id = p_line and account_id = v_me;
  if l.id is null or ms.line_id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  select * into s from nureum_settings where id = 1;
  select * into i from invites where id = l.invite_id;
  return json_build_object('ok', true,
    'id', l.id, 'link_id', l.link_id, 'is_owner', l.owner_id = v_me,
    'ended', l.ended_at is not null, 'paired', l.link_id is not null,
    'plan_until', l.plan_until, 'active', l.plan_until is not null and l.plan_until > now(),
    'name', ms.name, 'color', ms.color, 'glyph', ms.glyph, 'auto_answer', ms.auto_answer,
    'code', case when l.owner_id = v_me and l.link_id is null then l.invite_code end,
    'code_expires_at', case when l.owner_id = v_me and l.link_id is null then i.expires_at end,
    'usage', nureum__usage(p_line),
    'prices', json_build_object('m1', s.price_1m, 'm12', s.price_12m, 'extra', s.extra_price,
       'extra_voice_min', s.extra_voice_min, 'extra_video_min', s.extra_video_min, 'extra_storage_mb', s.extra_storage_mb));
end $$;

-- ⑤ 내 쪽 이름 · 색 · 글자 · 자동 받기 바꾸기
create or replace function public.nureum_set_side(p_line uuid, p_name text, p_color text, p_glyph text, p_auto boolean)
returns json language plpgsql security definer set search_path = public as $$
begin
  update nureum_sides set
    name = coalesce(nullif(trim(p_name), ''), name),
    color = coalesce(nullif(p_color, ''), color),
    glyph = case when p_glyph is null then glyph else nullif(trim(p_glyph), '') end,
    auto_answer = coalesce(p_auto, auto_answer)
   where line_id = p_line and account_id = auth.uid();
  return json_build_object('ok', found);
end $$;

-- ⑥ 다음 달 것 당겨 쓰기 (개설자만 · 남은 기간이 한 달 넘게 남아 있을 때)
create or replace function public.nureum_borrow(p_line uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); l nureum_lines;
begin
  select * into l from nureum_lines where id = p_line and owner_id = v_me and ended_at is null for update;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if l.plan_until is null or l.plan_until - interval '1 month' <= now() then
    return json_build_object('ok', false, 'error', 'not_enough'); end if;
  update nureum_lines set plan_until = plan_until - interval '1 month' where id = p_line;
  insert into nureum_purchases(line_id, buyer_id, kind, qty, months, amount, for_month, store, note)
  values (p_line, v_me, 'borrow', 1, -1, 0, nureum_month(), 'self', '다음 달 것 당겨 쓰기');
  return json_build_object('ok', true, 'plan_until', l.plan_until - interval '1 month');
end $$;

-- ⑦ 끊기 (어느 쪽이든). 부름 연결은 남지만 누름 아이콘은 더는 이어지지 않습니다.
create or replace function public.nureum_end(p_line uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  update nureum_lines set ended_at = now(), ended_by = auth.uid()
   where id = p_line and ended_at is null
     and exists (select 1 from nureum_sides where line_id = p_line and account_id = auth.uid());
  if found then
    update invites set revoked_at = now()
     where id = (select invite_id from nureum_lines where id = p_line) and revoked_at is null;
  end if;
  return json_build_object('ok', found);
end $$;

-- ⑧ 구입이 확정되면 적용 (결제 서버 함수 · 관리자만 부릅니다)
--    p_kind: '1m' | '12m' (기간)  ·  'voice' | 'video' | 'storage' (이번 달 용량)  ·  'grant' (관리자 무료 지급, p_qty = 개월)
create or replace function public.nureum_apply(p_line uuid, p_kind text, p_qty int, p_amount int, p_order text, p_store text, p_buyer uuid)
returns json language plpgsql security definer set search_path = public as $$
declare l nureum_lines; v_months int := 0; v_until timestamptz;
begin
  if p_order is not null and exists (select 1 from nureum_purchases where order_id = p_order) then
    return json_build_object('ok', true, 'dup', true); end if;
  select * into l from nureum_lines where id = p_line for update;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if p_kind = '1m' then v_months := p_qty;
  elsif p_kind = '12m' then v_months := 12 * p_qty;
  elsif p_kind = 'grant' then v_months := p_qty;
  elsif p_kind not in ('voice','video','storage') then return json_build_object('ok', false, 'error', 'kind'); end if;
  if v_months > 0 then
    v_until := greatest(now(), coalesce(l.plan_until, now())) + make_interval(months => v_months);
    update nureum_lines set plan_until = v_until where id = p_line;
  end if;
  insert into nureum_purchases(line_id, buyer_id, kind, qty, months, amount, for_month, order_id, store)
  values (p_line, p_buyer, p_kind, p_qty, v_months, coalesce(p_amount, 0),
          case when p_kind in ('voice','video','storage') then nureum_month() end, p_order, p_store);
  return json_build_object('ok', true, 'plan_until', coalesce(v_until, l.plan_until));
end $$;
revoke all on function public.nureum_apply(uuid, text, int, int, text, text, uuid) from public, anon, authenticated;
grant execute on function public.nureum_apply(uuid, text, int, int, text, text, uuid) to service_role;

-- 관리자 시험용: 결제 연결 전까지 라인에 기간을 넣어 줍니다
create or replace function public.nureum_admin_grant(p_line uuid, p_months int)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not nureum_is_admin() then return json_build_object('ok', false, 'error', 'admin'); end if;
  return nureum_apply(p_line, 'grant', greatest(1, least(p_months, 24)), 0, null, 'admin', auth.uid());
end $$;

-- 화면이 부를 수 있는 함수
grant execute on function public.nureum_link_ok(uuid), public.nureum_create(text, text, text, uuid),
  public.nureum_new_code(uuid), public.nureum_code_info(text), public.nureum_attach(text, text, text, text),
  public.nureum_my_lines(), public.nureum_line(uuid), public.nureum_set_side(uuid, text, text, text, boolean),
  public.nureum_borrow(uuid), public.nureum_end(uuid), public.nureum_admin_grant(uuid, int) to authenticated;

select 'nureum ok' as result, (select price_1m from nureum_settings) as price_1m, (select price_12m from nureum_settings) as price_12m;

-- =====================================================================
-- 🛡 안심 더하기 — 「무소식 알림」 + 「가족 확인」 (부름 · 누름 · 바로너 · 부름 서버) · 2026-11-15
--   10_sos.sql(안심 긴급) 다음에 돌립니다. 안심 긴급의 보호자 연결 · 이용권을 그대로 씁니다(따로 결제 없음).
--
--   ① 가족 확인 — 수상한 전화(검찰 · 금감원 사칭 등)를 받았거나 돈을 보내기 전에, 버튼 하나로
--      보호자에게 「확인해 줘」를 보냅니다. 보호자가 「제가 전화할게요」를 누르면 이용자에게 알립니다.
--   ② 무소식 알림 — 이용자가 정한 시간(6 · 12 · 24시간) 동안 앱을 전혀 쓰지 않으면
--      먼저 이용자에게 「괜찮으세요?」를 묻고, 1시간 안에 답이 없으면 보호자에게 알립니다.
--      밤 10시 ~ 아침 7시에는 묻지 않습니다(아침에 묻습니다).
--      ⚠ 위치는 쓰지 않습니다. 「마지막으로 앱을 쓴 때」만 적어 둡니다.
--
--   만드는 것
--     care_settings   무소식 알림 켬/끔 · 시간
--     care_signals    마지막으로 앱을 쓴 때 (켠 사람만)
--     care_events     가족 확인 · 무소식 한 건
--     care_acks       보호자 「제가 전화할게요」 · 「안부 확인했어요」
--
--   ⚠ SQL Editor 에 통째로 붙여 Run. 다시 돌려도 안전합니다.
--   ⚠ 무소식 알림이 저절로 돌려면 13_care_cron.sql 도 돌려야 합니다(10분마다 확인).
-- =====================================================================

-- ① 표 -----------------------------------------------------------------
create table if not exists public.care_settings (
  owner_id     uuid primary key references auth.users(id) on delete cascade,
  nosign_on    boolean not null default false,
  nosign_hours int not null default 12 check (nosign_hours between 3 and 72),
  updated_at   timestamptz not null default now()
);
create table if not exists public.care_signals (
  owner_id  uuid primary key references auth.users(id) on delete cascade,
  last_at   timestamptz not null default now(),
  last_kind text
);
create table if not exists public.care_events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('verify', 'nosign')),
  reason      text,
  hours       int,
  stage       text not null default 'open' check (stage in ('open', 'asked', 'alerted', 'resolved')),
  created_at  timestamptz not null default now(),
  asked_at    timestamptz,
  alerted_at  timestamptz,
  resolved_at timestamptz,
  resolved_by uuid,
  resolved_how text
);
create index if not exists care_events_owner_idx on public.care_events (owner_id, created_at desc);
create index if not exists care_events_stage_idx on public.care_events (stage) where stage <> 'resolved';
create table if not exists public.care_acks (
  event_id    uuid not null references public.care_events(id) on delete cascade,
  guardian_id uuid not null references auth.users(id) on delete cascade,
  at          timestamptz not null default now(),
  primary key (event_id, guardian_id)
);

alter table public.care_settings enable row level security;
alter table public.care_signals  enable row level security;
alter table public.care_events   enable row level security;
alter table public.care_acks     enable row level security;
revoke all on public.care_settings, public.care_signals, public.care_events, public.care_acks from public, anon, authenticated;
grant  all on public.care_settings, public.care_signals, public.care_events, public.care_acks to service_role;

-- ② 도우미 ---------------------------------------------------------------
create or replace function public._care_ready(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(_sos_sub_until(p_owner) > now(), false)
     and exists (select 1 from sos_links l where l.owner_id = p_owner);
$$;
create or replace function public._care_who(p_event uuid, p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when e.owner_id = p_user then 'owner'
              when exists (select 1 from sos_links l where l.owner_id = e.owner_id and l.guardian_id = p_user) then 'guardian' end
    from care_events e where e.id = p_event;
$$;
create or replace function public._care_tidy()
returns void language sql security definer set search_path = public as $$
  update care_events set stage = 'resolved', resolved_at = now(), resolved_how = 'timeout'
   where stage <> 'resolved' and kind = 'verify' and created_at < now() - interval '24 hours';
  delete from care_events where created_at < now() - interval '6 months';
$$;

-- ③ 이용자 ---------------------------------------------------------------
create or replace function public.care_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); s care_settings;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  select * into s from care_settings where owner_id = v_uid;
  return jsonb_build_object('ok', true,
    'ready', _care_ready(v_uid),
    'nosign_on', coalesce(s.nosign_on, false), 'nosign_hours', coalesce(s.nosign_hours, 12),
    'last_at', (select last_at from care_signals where owner_id = v_uid),
    'open', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'reason', e.reason, 'stage', e.stage, 'at', e.created_at,
                       'acks', (select count(*) from care_acks a where a.event_id = e.id)) order by e.created_at desc)
                       from care_events e where e.owner_id = v_uid and e.stage <> 'resolved'), '[]'::jsonb),
    'wards', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'reason', e.reason, 'stage', e.stage, 'at', e.created_at,
                        'name', l.owner_name, 'hours', e.hours, 'acked', exists (select 1 from care_acks a where a.event_id = e.id and a.guardian_id = v_uid))
                        order by e.created_at desc)
                        from care_events e join sos_links l on l.owner_id = e.owner_id and l.guardian_id = v_uid
                       where e.stage <> 'resolved' and (e.kind = 'verify' or e.stage = 'alerted')), '[]'::jsonb));
end $$;

-- 무소식 알림 켜기 · 끄기 · 시간
create or replace function public.care_set(p_on boolean, p_hours int default 12)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  insert into care_settings (owner_id, nosign_on, nosign_hours) values (v_uid, coalesce(p_on, false), greatest(3, least(coalesce(p_hours, 12), 72)))
  on conflict (owner_id) do update set nosign_on = excluded.nosign_on, nosign_hours = excluded.nosign_hours, updated_at = now();
  insert into care_signals (owner_id, last_at, last_kind) values (v_uid, now(), 'set')
  on conflict (owner_id) do update set last_at = now(), last_kind = 'set';
  if not coalesce(p_on, false) then
    update care_events set stage = 'resolved', resolved_at = now(), resolved_by = v_uid, resolved_how = 'off'
     where owner_id = v_uid and kind = 'nosign' and stage <> 'resolved';
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- 「앱을 썼어요」 신호 (앱이 열릴 때 10분에 한 번쯤 부릅니다) — 무소식 알림을 켠 사람만 적습니다.
--   열려 있던 무소식 건이 있으면 풀고, 보호자에게 이미 알렸던 건이면 { alerted: true } 를 돌려줍니다(앱이 「괜찮아요」 알림을 보냄).
create or replace function public.care_ping(p_kind text default 'app')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ev uuid; v_alerted boolean := false;
begin
  if v_uid is null then return jsonb_build_object('ok', false); end if;
  if not exists (select 1 from care_settings where owner_id = v_uid and nosign_on) then return jsonb_build_object('ok', true, 'on', false); end if;
  insert into care_signals (owner_id, last_at, last_kind) values (v_uid, now(), left(coalesce(p_kind, 'app'), 20))
  on conflict (owner_id) do update set last_at = now(), last_kind = excluded.last_kind;
  select id, stage = 'alerted' into v_ev, v_alerted from care_events
   where owner_id = v_uid and kind = 'nosign' and stage in ('asked', 'alerted') order by created_at desc limit 1;
  if v_ev is not null then
    update care_events set stage = 'resolved', resolved_at = now(), resolved_by = v_uid, resolved_how = 'signal' where id = v_ev;
  end if;
  return jsonb_build_object('ok', true, 'on', true, 'resolved', v_ev, 'alerted', coalesce(v_alerted, false));
end $$;

-- 가족 확인 보내기
create or replace function public.care_verify(p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_n int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if coalesce(_sos_sub_until(v_uid), now() - interval '1 second') <= now() then return jsonb_build_object('ok', false, 'error', 'no_sub'); end if;
  select count(*) into v_n from sos_links where owner_id = v_uid;
  if v_n = 0 then return jsonb_build_object('ok', false, 'error', 'no_guardian'); end if;
  if (select count(*) from care_events where owner_id = v_uid and kind = 'verify' and created_at > now() - interval '1 hour') >= 6 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;
  perform _care_tidy();
  insert into care_events (owner_id, kind, reason) values (v_uid, 'verify', left(coalesce(nullif(btrim(p_reason), ''), '기타'), 40)) returning id into v_id;
  insert into care_signals (owner_id, last_at, last_kind) values (v_uid, now(), 'verify')
  on conflict (owner_id) do update set last_at = now(), last_kind = 'verify';
  return jsonb_build_object('ok', true, 'event', v_id, 'guardians', v_n);
end $$;

-- 보호자: 「제가 전화할게요」(가족 확인) · 「안부 확인했어요」(무소식)
create or replace function public.care_ack(p_event uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); e care_events;
begin
  if _care_who(p_event, v_uid) is distinct from 'guardian' then return jsonb_build_object('ok', false, 'error', 'not_guardian'); end if;
  select * into e from care_events where id = p_event;
  if e.stage = 'resolved' then return jsonb_build_object('ok', false, 'error', 'not_open'); end if;
  insert into care_acks (event_id, guardian_id) values (p_event, v_uid) on conflict do nothing;
  if e.kind = 'nosign' then
    update care_events set stage = 'resolved', resolved_at = now(), resolved_by = v_uid, resolved_how = 'guardian' where id = p_event;
  end if;
  return jsonb_build_object('ok', true, 'kind', e.kind);
end $$;

-- 끝내기 (이용자 · 보호자)
create or replace function public.care_resolve(p_event uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_who text;
begin
  v_who := _care_who(p_event, v_uid);
  if v_who is null then return jsonb_build_object('ok', false, 'error', 'not_mine'); end if;
  update care_events set stage = 'resolved', resolved_at = now(), resolved_by = v_uid, resolved_how = v_who where id = p_event and stage <> 'resolved';
  return jsonb_build_object('ok', true);
end $$;

-- 한 건 보기
create or replace function public.care_view(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_who text; e care_events;
begin
  v_who := _care_who(p_event, v_uid);
  if v_who is null then return jsonb_build_object('ok', false, 'error', 'not_mine'); end if;
  select * into e from care_events where id = p_event;
  return jsonb_build_object('ok', true, 'id', e.id, 'me', v_who, 'kind', e.kind, 'reason', e.reason, 'hours', e.hours, 'stage', e.stage,
    'created_at', e.created_at, 'asked_at', e.asked_at, 'alerted_at', e.alerted_at, 'resolved_at', e.resolved_at, 'resolved_how', e.resolved_how,
    'name', case when v_who = 'guardian' then (select owner_name from sos_links where owner_id = e.owner_id and guardian_id = v_uid) end,
    'guardians', (select count(*) from sos_links where owner_id = e.owner_id),
    'acked', exists (select 1 from care_acks a where a.event_id = e.id and a.guardian_id = v_uid),
    'acks', coalesce((select jsonb_agg(jsonb_build_object('name', l.guardian_name, 'at', a.at) order by a.at)
                       from care_acks a join sos_links l on l.owner_id = e.owner_id and l.guardian_id = a.guardian_id where a.event_id = e.id), '[]'::jsonb));
end $$;

-- 알림 보낼 기기 (앱이 부르는 care-alert 함수가 이용자 · 보호자 로그인으로 부릅니다)
--   verify    : 이용자 → 보호자 모두
--   ack       : 보호자 → 이용자 + 다른 보호자
--   nosign_ok : 이용자(다시 씀) → 보호자 모두  (보호자에게 이미 알렸던 건만)
drop function if exists public.care_push_targets(uuid, text);
create or replace function public.care_push_targets(p_event uuid, p_kind text)
returns table (push_token text, platform text, role text, label text) language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_who text; e care_events; v_actor text;
begin
  v_who := _care_who(p_event, v_uid);
  if v_who is null then return; end if;
  select * into e from care_events where id = p_event;
  if p_kind in ('verify', 'nosign_ok') then
    if v_who <> 'owner' then return; end if;
    if p_kind = 'verify' and (e.kind <> 'verify' or e.stage = 'resolved') then return; end if;
    if p_kind = 'nosign_ok' and (e.kind <> 'nosign' or e.alerted_at is null) then return; end if;
    return query select d.push_token, d.platform::text, 'guardian'::text, l.owner_name
      from sos_links l join devices d on d.account_id = l.guardian_id
     where l.owner_id = e.owner_id and d.push_token is not null;
  elsif p_kind = 'ack' then
    if v_who <> 'guardian' then return; end if;
    select guardian_name into v_actor from sos_links where owner_id = e.owner_id and guardian_id = v_uid;
    return query
      select d.push_token, d.platform::text, 'owner'::text, coalesce(v_actor, '보호자') from devices d
       where d.account_id = e.owner_id and d.push_token is not null
      union all
      select d.push_token, d.platform::text, 'guardian'::text, l.owner_name || '|' || coalesce(v_actor, '보호자')
        from sos_links l join devices d on d.account_id = l.guardian_id
       where l.owner_id = e.owner_id and l.guardian_id <> v_uid and d.push_token is not null;
  end if;
end $$;

-- ④ 10분마다 (care-alert 함수의 시계 모드가 service_role 로 부릅니다) -----------------
--   돌려주는 것: 할 일 목록 — ask(이용자에게 「괜찮으세요?」) · alert(보호자에게 무소식 알림)
create or replace function public.care_due()
returns table (event_id uuid, owner_id uuid, action text, hours int) language plpgsql security definer set search_path = public as $$
declare v_hour int := extract(hour from (now() at time zone 'Asia/Seoul'));
begin
  perform _care_tidy();
  -- 1시간 안에 답이 없으면 → 보호자에게
  return query
    with up as (
      update care_events e set stage = 'alerted', alerted_at = now()
       where e.kind = 'nosign' and e.stage = 'asked' and e.asked_at < now() - interval '60 minutes'
         and _care_ready(e.owner_id)
      returning e.id, e.owner_id, e.hours)
    select up.id, up.owner_id, 'alert'::text, up.hours from up;
  -- 밤(22~7시)에는 새로 묻지 않습니다
  if v_hour >= 22 or v_hour < 7 then return; end if;
  return query
    with due as (
      select s.owner_id, s.nosign_hours from care_settings s
        join care_signals g on g.owner_id = s.owner_id
       where s.nosign_on and g.last_at < now() - make_interval(hours => s.nosign_hours)
         and _care_ready(s.owner_id)
         and not exists (select 1 from care_events e where e.owner_id = s.owner_id and e.kind = 'nosign'
                          and (e.stage <> 'resolved' or e.created_at > g.last_at))
       limit 500),
    ins as (
      insert into care_events (owner_id, kind, hours, stage, asked_at)
      select due.owner_id, 'nosign', due.nosign_hours, 'asked', now() from due
      returning id, care_events.owner_id, care_events.hours)
    select ins.id, ins.owner_id, 'ask'::text, ins.hours from ins;
end $$;

create or replace function public.care_cron_targets(p_event uuid, p_action text)
returns table (push_token text, platform text, role text, label text) language sql stable security definer set search_path = public as $$
  select d.push_token, d.platform::text, 'owner'::text, ''::text
    from care_events e join devices d on d.account_id = e.owner_id
   where e.id = p_event and p_action = 'ask' and d.push_token is not null
  union all
  select d.push_token, d.platform::text, 'guardian'::text, l.owner_name
    from care_events e join sos_links l on l.owner_id = e.owner_id join devices d on d.account_id = l.guardian_id
   where e.id = p_event and p_action = 'alert' and d.push_token is not null;
$$;

-- ⑤ 권한 ---------------------------------------------------------------
do $$ declare f text; begin
  foreach f in array array['care_state()', 'care_set(boolean, int)', 'care_ping(text)', 'care_verify(text)', 'care_ack(uuid)',
                           'care_resolve(uuid)', 'care_view(uuid)', 'care_push_targets(uuid, text)'] loop
    execute 'revoke execute on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
  foreach f in array array['_care_ready(uuid)', '_care_who(uuid, uuid)', '_care_tidy()', 'care_due()', 'care_cron_targets(uuid, text)'] loop
    execute 'revoke execute on function public.' || f || ' from public, anon, authenticated';
    execute 'grant execute on function public.' || f || ' to service_role';
  end loop;
end $$;

select 'care ok' as result,
       (select count(*) from care_settings where nosign_on) as nosign_users,
       (select count(*) from care_events where stage <> 'resolved') as open_events;

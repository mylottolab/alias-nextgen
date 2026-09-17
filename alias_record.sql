-- =====================================================================
-- Alias Next-Gen — 통화 녹음·녹화
-- 2026-09-19
--
-- ⚠ Alias Next-Gen 프로젝트(azredlrnvsssfjytaotb)에서 한 문장씩 돌리세요.
--
-- 🔴🔴 이 기능의 원칙 — 회사 결정 (2026-09-17)
--
--   ① 시작하면 양쪽 화면에 크게 · 통화 내내  "🔴 녹음 중"
--   ② 상대가 동의하지 않으면 시작되지 않습니다
--   ③ 상대는 언제든 중단을 요구할 수 있습니다
--   ④ 보관 기간에 상한 — 최장 90일
--
--   ⚠ ②를 빼지 마세요. **돈을 냈다고 몰래 녹음할 권리가 생기는 것은
--     아닙니다.** 몰래 녹음할 수 있는 앱이 되면 이 제품이 쌓아온 것이
--     무너집니다. 반대로 "알리고 녹음하는 앱" 이라면 자랑거리가 됩니다.
--
-- 🔴 보관 기간은 **두 사람이 정합니다** (2026-09-19)
--
--   거는 쪽이 15·30·90일 중 하나를 제안하고,
--   받는 쪽은 **줄이기만** 할 수 있습니다. 늘리지는 못합니다.
--   → 늘 조심스러운 쪽을 따릅니다.
--
--   ⚠ 이건 단순한 설정이 아닙니다. 동의의 성격을 바꿉니다.
--     "녹음해도 됩니까" 가 아니라 "며칠 동안 두고 녹음해도 됩니까" 가
--     되어, 상대가 **조건을 걸 수 있게** 됩니다.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────
-- ① 녹음 기록
--
-- ⚠ 한 통화에 녹음은 하나입니다. 중간에 멈췄다 다시 켜면 이어붙이지
--   않고 그 자리에서 끝냅니다. 쪼개지면 나중에 못 찾습니다.
--
-- ⚠ 양쪽 다 갖습니다. 동의하고 한 일이니 상대도 가질 권리가 있습니다.
--   그래서 account_id 가 아니라 link_id 로 묶습니다.
-- ─────────────────────────────────────────────────────────────────
create table if not exists call_records (
  id              uuid primary key default gen_random_uuid(),
  call_id         uuid not null references calls(id) on delete cascade,
  link_id         uuid not null references links(id) on delete cascade,
  kind            text not null default 'audio',   -- audio · video
  path            text not null,                   -- alias-records 서랍의 경로
  bytes           bigint,
  duration_ms     integer,

  -- 누가 녹음을 시작했나 (기록으로 남깁니다)
  started_by      uuid not null references auth.users(id) on delete cascade,

  -- 🔴 두 사람이 정한 보관 기간
  keep_days       smallint not null check (keep_days in (15, 30, 90)),
  asked_days      smallint,        -- 거는 쪽이 제안한 날수 (기록용)
  purge_on        timestamptz not null,

  -- 알림을 보냈는가 (7일 전 · 3일 전)
  warned_7        boolean not null default false,
  warned_3        boolean not null default false,

  created_at      timestamptz not null default now()
);

create index if not exists call_records_link_idx
  on call_records (link_id, created_at desc);
create index if not exists call_records_purge_idx
  on call_records (purge_on);

alter table call_records enable row level security;
grant select, insert, delete on call_records to authenticated;
grant select, insert, update, delete on call_records to service_role;


-- ─────────────────────────────────────────────────────────────────
-- ② 이 관계에 내가 있는가
--
-- ⚠ 정책 안에서 link_sides 를 읽으면 그 표의 정책도 함께 걸립니다
--   (함정 101). 서버 함수로 빼냅니다.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.in_link(p_link uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from link_sides
    where link_id = p_link and account_id = auth.uid()
  );
$$;

grant execute on function public.in_link(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────
-- ③ 정책 — 양쪽 다 보고, 양쪽 다 지울 수 있습니다
--
-- 🔴 지우기를 양쪽에 준 이유
--   녹음된 사람도 지울 수 있어야 합니다. 내 목소리가 담긴 것을
--   남만 지울 수 있다면 "동의" 가 아니라 "포기" 입니다.
-- ─────────────────────────────────────────────────────────────────
create policy "이어진 사이의 녹음을 봅니다" on call_records
  for select to authenticated
  using (public.in_link(link_id));

create policy "이어진 사이의 녹음을 만듭니다" on call_records
  for insert to authenticated
  with check (public.in_link(link_id) and started_by = auth.uid());

create policy "이어진 사이의 녹음을 지웁니다" on call_records
  for delete to authenticated
  using (public.in_link(link_id));


-- ─────────────────────────────────────────────────────────────────
-- ④ 녹음을 만들 때 지울 날을 자동으로 계산합니다
--
-- ⚠ 화면이 보낸 purge_on 을 믿지 않습니다. 화면을 고치면 1년짜리
--   녹음도 만들 수 있게 됩니다. **서버가 정합니다.**
-- ─────────────────────────────────────────────────────────────────
create or replace function set_record_purge()
returns trigger
language plpgsql
as $$
begin
  new.purge_on := now() + make_interval(days => new.keep_days);
  return new;
end;
$$;

drop trigger if exists call_records_purge on call_records;
create trigger call_records_purge
  before insert on call_records
  for each row execute function set_record_purge();


-- ─────────────────────────────────────────────────────────────────
-- ⑤ 지울 때가 된 녹음 찾기
--
-- ⚠ 찾기만 합니다. 지우지 않습니다. 눈으로 먼저 보고 확인할 수
--   있어야 합니다. 지우는 일은 되돌릴 수 없습니다.
--
-- ⚠ 이용권이 끝난 계정의 녹음은 **3개월 뒤**에 지웁니다.
--   (27차 2-4 의 저장물 정리 규칙과 같은 생각입니다)
-- ─────────────────────────────────────────────────────────────────
create or replace function records_to_purge()
returns table (id uuid, link_id uuid, path text, purge_on timestamptz, why text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.link_id, r.path, r.purge_on, '기간 만료'::text
  from call_records r
  where r.purge_on < now()
  order by r.purge_on;
$$;

revoke all on function records_to_purge() from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────
-- ⑥ 곧 지워질 녹음 — 손님에게 알리려고 찾습니다
-- ─────────────────────────────────────────────────────────────────
create or replace function my_records_expiring()
returns table (id uuid, link_id uuid, purge_on timestamptz, days_left integer)
language sql
stable
set search_path = public
as $$
  select r.id, r.link_id, r.purge_on,
         greatest(0, extract(day from (r.purge_on - now()))::integer)
  from call_records r
  join link_sides ls on ls.link_id = r.link_id and ls.account_id = auth.uid()
  where r.purge_on < now() + interval '7 days'
  order by r.purge_on;
$$;

grant execute on function my_records_expiring() to authenticated;


-- ─────────────────────────────────────────────────────────────────
-- ⑦ 확인
-- ─────────────────────────────────────────────────────────────────
-- select * from call_records;
-- select * from my_records_expiring();

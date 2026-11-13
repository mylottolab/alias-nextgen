-- =====================================================================
-- 안심 긴급 (부름 · 누름 · 바로너) — 2026-11-14
--   어르신 · 아이가 긴급 버튼을 누르면, 미리 연결한 보호자(앱 사용자) 휴대폰이 크게 울리고
--   위치 · 배터리가 보호자 화면에 뜹니다.
--
--   원칙
--     · 보호자 전화번호를 서버에 두지 않습니다. 보호자는 「앱 계정」으로만 연결됩니다.
--       (비상 문자를 받을 번호는 이용자 휴대폰 안에만 저장 — 서버와 무관)
--     · 위치는 긴급 상황 동안만 보호자에게 보여 주고, 며칠 뒤(기본 7일) 지웁니다.
--     · 위치정보법: 누구에게 언제 제공했는지(sos_provide_log)는 6개월 보관 후 지웁니다.
--     · 표는 직접 못 읽고, 아래 함수로만 씁니다(security definer + 본인 · 보호자 검사).
--     · 진짜 긴급은 절대 막지 않는 쪽으로: 이용권이 있으면 보호자 1명만 연결돼도 보냅니다.
--       (「개통 완료」 표시는 보호자 2명 이상 + 시험 신호 확인이 된 때)
--
--   ⚠ Supabase(부름 프로젝트) → SQL Editor 에 통째로 붙여 Run. 다시 돌려도 안전합니다.
-- =====================================================================

-- ① 표 -------------------------------------------------------------------
create table if not exists public.sos_settings (
  id            int primary key default 1 check (id = 1),
  price_1m      int not null default 1100,
  price_12m     int not null default 9900,
  max_guardians int not null default 3,
  min_guardians int not null default 2,
  keep_days     int not null default 7,      -- 위치 기록 보관 일수
  updated_at    timestamptz not null default now()
);
insert into public.sos_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.sos_subs (            -- 「안심 긴급」 이용권(이용자만 삽니다)
  user_id    uuid primary key references auth.users(id) on delete cascade,
  until      timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sos_links (           -- 이용자 ↔ 보호자
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  guardian_id   uuid not null references auth.users(id) on delete cascade,
  guardian_name text not null default '보호자',      -- 이용자가 부르는 이름 (예: 큰딸)
  owner_name    text not null default '가족',        -- 보호자가 부르는 이름 (예: 어머니)
  created_at    timestamptz not null default now(),
  test_ok_at    timestamptz,                         -- 시험 신호를 받고 「확인」 누른 때
  unique (owner_id, guardian_id),
  check (owner_id <> guardian_id)
);
create index if not exists sos_links_guardian_idx on public.sos_links (guardian_id);

create table if not exists public.sos_invites (
  code          text primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  guardian_name text not null default '보호자',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '3 days',
  used_at       timestamptz,
  used_by       uuid
);

create table if not exists public.sos_consents (       -- 위치정보 이용 · 보호자 제공 동의 (이용자)
  user_id    uuid primary key references auth.users(id) on delete cascade,
  version    text not null default '2026-11-14',
  agreed_at  timestamptz not null default now()
);

create table if not exists public.sos_events (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  is_test       boolean not null default false,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  ended_by      uuid,
  end_reason    text,
  lat double precision, lng double precision, acc double precision,
  loc_at        timestamptz,
  battery       int,
  alerts        int not null default 0,
  last_alert_at timestamptz
);
create index if not exists sos_events_owner_idx on public.sos_events (owner_id, started_at desc);

create table if not exists public.sos_acks (
  event_id    uuid not null references public.sos_events(id) on delete cascade,
  guardian_id uuid not null references auth.users(id) on delete cascade,
  at          timestamptz not null default now(),
  primary key (event_id, guardian_id)
);

create table if not exists public.sos_locs (
  id       bigserial primary key,
  event_id uuid not null references public.sos_events(id) on delete cascade,
  at       timestamptz not null default now(),
  lat double precision not null, lng double precision not null, acc double precision
);
create index if not exists sos_locs_event_idx on public.sos_locs (event_id, at desc);

create table if not exists public.sos_provide_log (     -- 위치정보 제공사실 확인자료 (6개월)
  id          bigserial primary key,
  event_id    uuid,
  owner_id    uuid,
  guardian_id uuid,
  kind        text,
  at          timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['sos_consents','sos_settings','sos_subs','sos_links','sos_invites','sos_events','sos_acks','sos_locs','sos_provide_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant usage, select on sequence public.sos_locs_id_seq, public.sos_provide_log_id_seq to service_role;

-- ①-2 결제 장부(payments.purpose)에 'sos' 를 쓸 수 있게 ------------------------------------
do $$
declare v_type text; v_udt text; c record; v_def text;
begin
  select data_type, udt_name into v_type, v_udt from information_schema.columns
   where table_schema = 'public' and table_name = 'payments' and column_name = 'purpose';
  if v_type = 'USER-DEFINED' then
    execute format('alter type public.%I add value if not exists %L', v_udt, 'sos');
  end if;
  for c in select conname, pg_get_constraintdef(oid) as def from pg_constraint
            where conrelid = 'public.payments'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%purpose%' loop
    if c.def not ilike '%''sos''%' then
      v_def := regexp_replace(c.def, 'ARRAY\[', 'ARRAY[''sos''::text, ');
      if v_def = c.def then v_def := regexp_replace(c.def, '\(purpose\s*=', '(purpose = ''sos''::text OR purpose ='); end if;
      execute format('alter table public.payments drop constraint %I', c.conname);
      execute format('alter table public.payments add constraint %I %s', c.conname, v_def);
      raise notice 'payments.purpose 규칙에 sos 를 더했습니다: %', c.conname;
    end if;
  end loop;
end $$;

-- ② 안쪽 도우미 ----------------------------------------------------------------
create or replace function public._sos_sub_until(p_user uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select until from sos_subs where user_id = p_user;
$$;

create or replace function public._sos_can_see(p_event uuid, p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when e.owner_id = p_user then 'owner'
              when exists (select 1 from sos_links l where l.owner_id = e.owner_id and l.guardian_id = p_user) then 'guardian'
         end
    from sos_events e where e.id = p_event;
$$;

create or replace function public._sos_tidy()
returns void language plpgsql security definer set search_path = public as $$
declare v_keep int;
begin
  select keep_days into v_keep from sos_settings where id = 1;
  delete from sos_locs where at < now() - make_interval(days => coalesce(v_keep, 7));
  update sos_events set lat = null, lng = null, acc = null
   where ended_at is not null and ended_at < now() - make_interval(days => coalesce(v_keep, 7)) and lat is not null;
  update sos_events set ended_at = now(), end_reason = 'timeout'
   where ended_at is null and (started_at < now() - interval '24 hours' or (is_test and started_at < now() - interval '15 minutes'));
  delete from sos_provide_log where at < now() - interval '6 months';
  delete from sos_invites where expires_at < now() - interval '7 days';
end $$;

-- ③ 내 상태 (이용자 · 보호자 모두) ---------------------------------------------
create or replace function public.sos_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); s sos_settings;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  select * into s from sos_settings where id = 1;
  return jsonb_build_object(
    'ok', true, 'now', now(),
    'sub_until', _sos_sub_until(v_uid),
    'consent_at', (select agreed_at from sos_consents where user_id = v_uid),
    'price_1m', s.price_1m, 'price_12m', s.price_12m,
    'min', s.min_guardians, 'max', s.max_guardians,
    'guardians', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.guardian_name, 'since', l.created_at, 'test_ok_at', l.test_ok_at,
                       'reachable', exists (select 1 from devices d where d.account_id = l.guardian_id and d.push_token is not null))
                       order by l.created_at) from sos_links l where l.owner_id = v_uid), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('code', i.code, 'name', i.guardian_name, 'expires_at', i.expires_at) order by i.created_at)
                       from sos_invites i where i.owner_id = v_uid and i.used_at is null and i.expires_at > now()), '[]'::jsonb),
    'open', (select jsonb_build_object('id', e.id, 'test', e.is_test, 'started_at', e.started_at,
                    'acks', (select count(*) from sos_acks a where a.event_id = e.id))
               from sos_events e where e.owner_id = v_uid and e.ended_at is null order by e.started_at desc limit 1),
    'wards', coalesce((select jsonb_agg(jsonb_build_object('link', l.id, 'name', l.owner_name, 'since', l.created_at,
                       'open', (select jsonb_build_object('id', e.id, 'test', e.is_test, 'started_at', e.started_at)
                                  from sos_events e where e.owner_id = l.owner_id and e.ended_at is null order by e.started_at desc limit 1))
                       order by l.created_at) from sos_links l where l.guardian_id = v_uid), '[]'::jsonb)
  );
end $$;

create or replace function public.sos_consent(p_version text default '2026-11-14')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  insert into sos_consents (user_id, version) values (auth.uid(), coalesce(p_version, '2026-11-14'))
  on conflict (user_id) do update set version = excluded.version, agreed_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.sos_consent_withdraw()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  delete from sos_consents where user_id = auth.uid();
  delete from sos_links where owner_id = auth.uid();          -- 동의를 거두면 보호자 연결도 끊습니다
  delete from sos_invites where owner_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- ④ 보호자 초대 · 수락 · 끊기 · 이름 ------------------------------------------------
create or replace function public.sos_invite(p_guardian_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_max int; v_code text; v_n int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if not exists (select 1 from sos_consents where user_id = v_uid) then return jsonb_build_object('ok', false, 'error', 'consent'); end if;
  select max_guardians into v_max from sos_settings where id = 1;
  select count(*) into v_n from sos_links where owner_id = v_uid;
  if v_n >= v_max then return jsonb_build_object('ok', false, 'error', 'full', 'max', v_max); end if;
  if (select count(*) from sos_invites where owner_id = v_uid and used_at is null and expires_at > now()) >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_invites');
  end if;
  loop
    v_code := substr(translate(upper(md5(gen_random_uuid()::text || clock_timestamp()::text)), '01', ''), 1, 8);
    exit when length(v_code) = 8 and not exists (select 1 from sos_invites where code = v_code);
  end loop;
  insert into sos_invites (code, owner_id, guardian_name)
  values (v_code, v_uid, coalesce(nullif(left(trim(p_guardian_name), 20), ''), '보호자'));
  return jsonb_build_object('ok', true, 'code', v_code, 'expires_at', now() + interval '3 days');
end $$;

create or replace function public.sos_invite_cancel(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  delete from sos_invites where code = upper(trim(p_code)) and owner_id = auth.uid() and used_at is null;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.sos_invite_peek(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare i sos_invites;
begin
  select * into i from sos_invites where code = upper(trim(p_code));
  if i.code is null then return jsonb_build_object('ok', false, 'error', 'no_invite'); end if;
  if i.used_at is not null then return jsonb_build_object('ok', false, 'error', 'used'); end if;
  if i.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  return jsonb_build_object('ok', true, 'name', i.guardian_name, 'mine', i.owner_id = auth.uid());
end $$;

create or replace function public.sos_accept(p_code text, p_owner_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); i sos_invites; v_max int; v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  select * into i from sos_invites where code = upper(trim(p_code)) for update;
  if i.code is null then return jsonb_build_object('ok', false, 'error', 'no_invite'); end if;
  if i.used_at is not null then return jsonb_build_object('ok', false, 'error', 'used'); end if;
  if i.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if i.owner_id = v_uid then return jsonb_build_object('ok', false, 'error', 'self'); end if;
  if exists (select 1 from sos_links where owner_id = i.owner_id and guardian_id = v_uid) then
    update sos_invites set used_at = now(), used_by = v_uid where code = i.code;
    return jsonb_build_object('ok', false, 'error', 'already');
  end if;
  select max_guardians into v_max from sos_settings where id = 1;
  if (select count(*) from sos_links where owner_id = i.owner_id) >= v_max then return jsonb_build_object('ok', false, 'error', 'full'); end if;
  insert into sos_links (owner_id, guardian_id, guardian_name, owner_name)
  values (i.owner_id, v_uid, i.guardian_name, coalesce(nullif(left(trim(p_owner_name), 20), ''), '가족'))
  returning id into v_id;
  update sos_invites set used_at = now(), used_by = v_uid where code = i.code;
  return jsonb_build_object('ok', true, 'link', v_id);
end $$;

create or replace function public.sos_unlink(p_link uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  delete from sos_links where id = p_link and (owner_id = auth.uid() or guardian_id = auth.uid());
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.sos_rename(p_link uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n text := nullif(left(trim(p_name), 20), '');
begin
  if v_n is null then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  update sos_links set guardian_name = v_n where id = p_link and owner_id = auth.uid();
  if not found then update sos_links set owner_name = v_n where id = p_link and guardian_id = auth.uid(); end if;
  return jsonb_build_object('ok', found);
end $$;

-- ⑤ 긴급 시작 · 위치 · 확인 · 끝 -------------------------------------------------
create or replace function public.sos_start(p_test boolean default false, p_lat double precision default null, p_lng double precision default null,
                                            p_acc double precision default null, p_battery int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_n int; v_open sos_events;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  perform _sos_tidy();
  select count(*) into v_n from sos_links where owner_id = v_uid;
  if v_n = 0 then return jsonb_build_object('ok', false, 'error', 'no_guardian'); end if;
  if not p_test and coalesce(_sos_sub_until(v_uid), '-infinity') < now() then
    return jsonb_build_object('ok', false, 'error', 'no_sub');
  end if;
  -- 이미 열린 진짜 긴급이 있으면 그것을 이어 씁니다 (두 번 눌러도 한 건)
  select * into v_open from sos_events where owner_id = v_uid and ended_at is null and is_test = p_test order by started_at desc limit 1;
  if v_open.id is not null then
    v_id := v_open.id;
  else
    if not p_test then   -- 진짜가 시작되면 열린 시험은 닫습니다
      update sos_events set ended_at = now(), end_reason = 'replaced' where owner_id = v_uid and ended_at is null and is_test;
    end if;
    insert into sos_events (owner_id, is_test) values (v_uid, p_test) returning id into v_id;
  end if;
  if p_lat is not null and p_lng is not null then
    insert into sos_locs (event_id, lat, lng, acc) values (v_id, p_lat, p_lng, p_acc);
    update sos_events set lat = p_lat, lng = p_lng, acc = p_acc, loc_at = now() where id = v_id;
  end if;
  if p_battery is not null then update sos_events set battery = greatest(0, least(100, p_battery)) where id = v_id; end if;
  return jsonb_build_object('ok', true, 'event', v_id, 'guardians', v_n, 'test', p_test);
end $$;

create or replace function public.sos_loc(p_event uuid, p_lat double precision, p_lng double precision,
                                          p_acc double precision default null, p_battery int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from sos_events where id = p_event and owner_id = auth.uid() and ended_at is null) then
    return jsonb_build_object('ok', false, 'error', 'not_open');
  end if;
  if p_lat is not null and p_lng is not null then
    insert into sos_locs (event_id, lat, lng, acc) values (p_event, p_lat, p_lng, p_acc);
    update sos_events set lat = p_lat, lng = p_lng, acc = p_acc, loc_at = now() where id = p_event;
  end if;
  if p_battery is not null then update sos_events set battery = greatest(0, least(100, p_battery)) where id = p_event; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.sos_ack(p_event uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); e sos_events;
begin
  select * into e from sos_events where id = p_event;
  if e.id is null or _sos_can_see(p_event, v_uid) is distinct from 'guardian' then return jsonb_build_object('ok', false, 'error', 'not_guardian'); end if;
  insert into sos_acks (event_id, guardian_id) values (p_event, v_uid) on conflict do nothing;
  if e.is_test then
    update sos_links set test_ok_at = now() where owner_id = e.owner_id and guardian_id = v_uid;
  end if;
  return jsonb_build_object('ok', true, 'test', e.is_test);
end $$;

create or replace function public.sos_end(p_event uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_who text := _sos_can_see(p_event, auth.uid());
begin
  if v_who is null then return jsonb_build_object('ok', false, 'error', 'not_mine'); end if;
  update sos_events set ended_at = now(), ended_by = auth.uid(), end_reason = coalesce(left(p_reason, 40), v_who)
   where id = p_event and ended_at is null;
  return jsonb_build_object('ok', true);
end $$;

-- ⑥ 보호자 화면 · 이용자 화면이 함께 보는 긴급 한 건 ---------------------------------
create or replace function public.sos_view(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_who text; e sos_events; v_name text;
begin
  v_who := _sos_can_see(p_event, v_uid);
  if v_who is null then return jsonb_build_object('ok', false, 'error', 'not_mine'); end if;
  select * into e from sos_events where id = p_event;
  if v_who = 'guardian' then select owner_name into v_name from sos_links where owner_id = e.owner_id and guardian_id = v_uid; end if;
  return jsonb_build_object('ok', true, 'me', v_who, 'name', v_name,
    'id', e.id, 'test', e.is_test, 'started_at', e.started_at, 'ended_at', e.ended_at, 'end_reason', e.end_reason,
    'lat', e.lat, 'lng', e.lng, 'acc', e.acc, 'loc_at', e.loc_at, 'battery', e.battery,
    'acked', exists (select 1 from sos_acks a where a.event_id = e.id and a.guardian_id = v_uid),
    'acks', coalesce((select jsonb_agg(jsonb_build_object('name', l.guardian_name, 'at', a.at) order by a.at)
                        from sos_acks a join sos_links l on l.owner_id = e.owner_id and l.guardian_id = a.guardian_id
                       where a.event_id = e.id), '[]'::jsonb),
    'guardians', (select count(*) from sos_links where owner_id = e.owner_id),
    'track', coalesce((select jsonb_agg(jsonb_build_object('at', t.at, 'lat', t.lat, 'lng', t.lng, 'acc', t.acc) order by t.at)
                         from (select * from sos_locs where event_id = e.id order by at desc limit 60) t), '[]'::jsonb));
end $$;

-- ⑦ 알림 보낼 기기 (sos-alert 함수가 부른 사람의 로그인으로 부릅니다) ------------------
--    kind: sos(이용자 → 보호자 모두) · ack · end (누구든 → 나머지 모두)
--    label: 받는 사람 화면에 쓸 이름 (보호자에게는 그가 부르는 이용자 이름, 이용자에게는 움직인 보호자 이름)
--    caps : 새 앱(긴급 벨을 직접 울리는 판)이면 'sos' — sos_mark_device 로 앱이 적어 둡니다
alter table public.devices add column if not exists sos_caps text;

create or replace function public.sos_mark_device(p_row uuid, p_caps text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update devices set sos_caps = nullif(left(p_caps, 20), '') where id = p_row and account_id = auth.uid();
  return jsonb_build_object('ok', found);
end $$;

drop function if exists public.sos_push_targets(uuid, text);
create or replace function public.sos_push_targets(p_event uuid, p_kind text)
returns table (push_token text, platform text, role text, label text, caps text) language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_who text; e sos_events; v_actor text;
begin
  v_who := _sos_can_see(p_event, v_uid);
  if v_who is null then return; end if;
  select * into e from sos_events where id = p_event;
  if p_kind = 'sos' then
    if v_who <> 'owner' or e.ended_at is not null then return; end if;
    update sos_events set alerts = alerts + 1, last_alert_at = now() where id = p_event;
    insert into sos_provide_log (event_id, owner_id, guardian_id, kind)
      select p_event, e.owner_id, l.guardian_id, case when e.is_test then 'test' else 'sos' end from sos_links l where l.owner_id = e.owner_id;
    return query select d.push_token, d.platform::text, 'guardian'::text, l.owner_name, d.sos_caps
      from sos_links l join devices d on d.account_id = l.guardian_id
     where l.owner_id = e.owner_id and d.push_token is not null
       and not exists (select 1 from sos_acks a where a.event_id = p_event and a.guardian_id = l.guardian_id and e.alerts >= 1);
  elsif p_kind in ('ack', 'end') then
    if v_who = 'guardian' then select guardian_name into v_actor from sos_links where owner_id = e.owner_id and guardian_id = v_uid; end if;
    return query
      select d.push_token, d.platform::text, 'owner'::text, coalesce(v_actor, '보호자'), d.sos_caps
        from devices d where d.account_id = e.owner_id and e.owner_id <> v_uid and d.push_token is not null
      union all
      select d.push_token, d.platform::text, 'guardian'::text, l.owner_name, d.sos_caps
        from sos_links l join devices d on d.account_id = l.guardian_id
       where l.owner_id = e.owner_id and l.guardian_id <> v_uid and d.push_token is not null;
  end if;
end $$;

-- ⑧ 이용권 늘리기 (결제 함수 · 관리자) -----------------------------------------------
create or replace function public.sos_extend_for_user(p_user uuid, p_months int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_until timestamptz;
begin
  if p_months is null or p_months <= 0 then raise exception 'bad months'; end if;
  insert into sos_subs (user_id, until) values (p_user, now() + make_interval(months => p_months))
  on conflict (user_id) do update set until = greatest(sos_subs.until, now()) + make_interval(months => p_months), updated_at = now()
  returning until into v_until;
  return v_until;
end $$;

create or replace function public.admin_sos_grant(p_user uuid, p_months int)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not_admin'; end if;
  return jsonb_build_object('ok', true, 'until', sos_extend_for_user(p_user, p_months));
end $$;

-- ⑨ 권한 --------------------------------------------------------------------------
do $$ declare f text; begin
  foreach f in array array[
    'sos_state()', 'sos_consent(text)', 'sos_consent_withdraw()', 'sos_invite(text)', 'sos_invite_cancel(text)', 'sos_invite_peek(text)', 'sos_accept(text, text)',
    'sos_unlink(uuid)', 'sos_rename(uuid, text)',
    'sos_start(boolean, double precision, double precision, double precision, int)',
    'sos_loc(uuid, double precision, double precision, double precision, int)',
    'sos_ack(uuid)', 'sos_end(uuid, text)', 'sos_view(uuid)', 'sos_push_targets(uuid, text)', 'sos_mark_device(uuid, text)', 'admin_sos_grant(uuid, int)'] loop
    execute 'revoke execute on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
  foreach f in array array['_sos_sub_until(uuid)', '_sos_can_see(uuid, uuid)', '_sos_tidy()', 'sos_extend_for_user(uuid, int)'] loop
    execute 'revoke execute on function public.' || f || ' from public, anon, authenticated';
    execute 'grant execute on function public.' || f || ' to service_role';
  end loop;
end $$;

select 'sos ok' as result,
       (select price_1m || '원 / ' || price_12m || '원' from sos_settings) as prices,
       (select min_guardians || '~' || max_guardians || '명' from sos_settings) as guardians;

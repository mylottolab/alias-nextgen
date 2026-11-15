-- =====================================================================
-- 📱 무소식 알림 — 「휴대폰을 쓴 때」도 소식으로 치기 (안드로이드 · 부름 서버 · 2026-11-15)
--   12_care.sql · 13_care_cron.sql 다음에 한 번 실행합니다.
--
--   어떻게
--     · 이용자가 무소식 칸에서 「휴대폰 사용도 소식으로 치기」를 켜면 care_usage_key() 가
--       이 휴대폰만의 열쇠를 하나 만들어 줍니다(서버에는 열쇠의 지문만 남깁니다).
--     · 앱(안드로이드)은 한 시간쯤마다 「마지막으로 휴대폰을 쓴 시각」 하나만 care_usage_ping 으로 보냅니다.
--       어떤 앱을 썼는지 · 얼마나 썼는지는 보내지 않고 저장하지도 않습니다.
--     · 그 시각이 「괜찮으세요?」를 물은 뒤라면 저절로 풀리고, 보호자에게 이미 알렸으면
--       다음 10분 시계 때 「다시 쓰셨어요」 알림이 갑니다(care_due 의 nosign_ok).
-- =====================================================================

alter table public.care_settings add column if not exists usage_key_hash text;
alter table public.care_settings add column if not exists usage_seen_at  timestamptz;
alter table public.care_events   add column if not exists ok_pending boolean not null default false;
create unique index if not exists care_settings_usage_key_idx on public.care_settings (usage_key_hash) where usage_key_hash is not null;

-- 열쇠 만들기 (켤 때) · 지우기 (끌 때 p_off = true)
create or replace function public.care_usage_key(p_off boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_key text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if coalesce(p_off, false) then
    update care_settings set usage_key_hash = null, usage_seen_at = null where owner_id = v_uid;
    return jsonb_build_object('ok', true, 'off', true);
  end if;
  v_key := encode(gen_random_bytes(24), 'hex');
  insert into care_settings (owner_id, usage_key_hash) values (v_uid, md5('cu:' || v_key))
  on conflict (owner_id) do update set usage_key_hash = excluded.usage_key_hash, usage_seen_at = null, updated_at = now();
  return jsonb_build_object('ok', true, 'key', v_key);
end $$;

-- 앱이 한 시간쯤마다 부릅니다 (로그인 없이 · 열쇠로만)
create or replace function public.care_usage_ping(p_key text, p_last timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s care_settings; v_last timestamptz; v_ev uuid; v_alerted boolean;
begin
  if p_key is null or length(p_key) <> 48 then return jsonb_build_object('ok', false, 'error', 'key'); end if;
  select * into s from care_settings where usage_key_hash = md5('cu:' || p_key);
  if s.owner_id is null then return jsonb_build_object('ok', false, 'error', 'key'); end if;   -- 앱은 이 답을 받으면 멈춥니다
  if s.usage_seen_at is not null and s.usage_seen_at > now() - interval '5 minutes' then return jsonb_build_object('ok', true, 'skip', true); end if;
  update care_settings set usage_seen_at = now() where owner_id = s.owner_id;
  if not s.nosign_on or p_last is null then return jsonb_build_object('ok', true, 'on', s.nosign_on); end if;
  v_last := least(p_last, now());
  if v_last < now() - interval '3 days' then return jsonb_build_object('ok', true, 'old', true); end if;
  insert into care_signals (owner_id, last_at, last_kind) values (s.owner_id, v_last, 'usage')
  on conflict (owner_id) do update set last_at = greatest(care_signals.last_at, excluded.last_at),
    last_kind = case when excluded.last_at > care_signals.last_at then 'usage' else care_signals.last_kind end;
  -- 「괜찮으세요?」를 물은 뒤에 휴대폰을 썼으면 풀기
  select id, stage = 'alerted' into v_ev, v_alerted from care_events
   where owner_id = s.owner_id and kind = 'nosign' and stage in ('asked', 'alerted') and v_last > coalesce(asked_at, created_at)
   order by created_at desc limit 1;
  if v_ev is not null then
    update care_events set stage = 'resolved', resolved_at = now(), resolved_how = 'usage', ok_pending = coalesce(v_alerted, false) where id = v_ev;
  end if;
  return jsonb_build_object('ok', true, 'on', true, 'resolved', v_ev is not null);
end $$;

-- 10분 시계 — 12_care.sql 의 것에 「다시 쓰셨어요(nosign_ok)」를 더했습니다
create or replace function public.care_due()
returns table (event_id uuid, owner_id uuid, action text, hours int) language plpgsql security definer set search_path = public as $$
declare v_hour int := extract(hour from (now() at time zone 'Asia/Seoul'));
begin
  perform _care_tidy();
  -- 휴대폰 사용으로 풀린 것 → 이미 알린 보호자에게 「다시 쓰셨어요」
  return query
    with ok as (
      update care_events e set ok_pending = false
       where e.ok_pending and e.stage = 'resolved'
      returning e.id, e.owner_id, e.hours)
    select ok.id, ok.owner_id, 'nosign_ok'::text, ok.hours from ok;
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
   where e.id = p_event and p_action in ('alert', 'nosign_ok') and d.push_token is not null;
$$;

-- 무소식 칸에 「휴대폰 사용으로 확인 중」을 보이려고 care_state 에 usage_on 을 더합니다
create or replace function public.care_usage_on()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select usage_key_hash is not null from care_settings where owner_id = auth.uid()), false);
$$;

revoke execute on function public.care_usage_key(boolean) from public, anon;
grant  execute on function public.care_usage_key(boolean) to authenticated;
revoke execute on function public.care_usage_on() from public, anon;
grant  execute on function public.care_usage_on() to authenticated;
revoke execute on function public.care_usage_ping(text, timestamptz) from public;
grant  execute on function public.care_usage_ping(text, timestamptz) to anon, authenticated;
revoke execute on function public.care_due() from public, anon, authenticated;
grant  execute on function public.care_due() to service_role;
revoke execute on function public.care_cron_targets(uuid, text) from public, anon, authenticated;
grant  execute on function public.care_cron_targets(uuid, text) to service_role;

select 'care usage ok' as result,
       (select count(*) from care_settings where usage_key_hash is not null) as usage_phones;

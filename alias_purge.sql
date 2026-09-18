-- =====================================================================
-- Alias Next-Gen — 저장물 정리와 미리 알리기
-- 2026-09-19
--
-- ⚠ Alias Next-Gen 프로젝트(azredlrnvsssfjytaotb)에서 한 문장씩 돌리세요.
--
-- 왜 필요한가
--   지금은 purge_on 이 지나도 **아무도 안 지웁니다.** 파일이 계속
--   쌓이고, 원가는 매달 나갑니다. 영원히요.
--
-- 🔴 말없이 지우면 안 됩니다
--   손님이 잃은 줄도 모릅니다. **7일 전과 3일 전에 알리고**, 그때
--   내려받을 수 있게 해야 합니다. 그래야 90일이 야박하지 않습니다.
--
-- ⚠ 지우는 일은 되돌릴 수 없습니다. 그래서 **찾기와 지우기를 갈라**
--   두었습니다. 눈으로 먼저 보고 나서 지우게요.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────
-- ① 알림 보낼 것 찾기
--
-- 7일 전과 3일 전, **딱 두 번만** 알립니다.
-- ⚠ 날마다 알리면 성가셔서 무시하게 됩니다. 그러면 정작 필요한 때에도
--   안 봅니다.
-- ⚠ 이미 보낸 것은 warned_7 · warned_3 에 적어두고 다시 안 보냅니다.
-- ─────────────────────────────────────────────────────────────────
create or replace function records_to_warn()
returns table (
  record_id  uuid,
  link_id    uuid,
  account_id uuid,
  days_left  integer,
  stage      smallint          -- 7 또는 3
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.link_id, ls.account_id,
         greatest(0, extract(day from (r.purge_on - now()))::integer),
         case when not r.warned_7 and r.purge_on <= now() + interval '7 days'
                                  and r.purge_on >  now() + interval '3 days'
              then 7::smallint
              else 3::smallint end
  from call_records r
  join link_sides ls on ls.link_id = r.link_id
  where r.purge_on > now()
    and (
      (not r.warned_7 and r.purge_on <= now() + interval '7 days')
      or
      (not r.warned_3 and r.purge_on <= now() + interval '3 days')
    );
$$;

revoke all on function records_to_warn() from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────
-- ② 알렸다고 적어두기
-- ─────────────────────────────────────────────────────────────────
create or replace function mark_warned(p_ids uuid[], p_stage smallint)
returns integer
language sql
security definer
set search_path = public
as $$
  with up as (
    update call_records
       set warned_7 = case when p_stage = 7 then true else warned_7 end,
           warned_3 = case when p_stage = 3 then true else warned_3 end
     where id = any(p_ids)
    returning 1
  )
  select count(*)::integer from up;
$$;

revoke all on function mark_warned(uuid[], smallint) from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────
-- ③ 실제로 지우기 — 표에서만
--
-- ⚠ 파일은 여기서 못 지웁니다. SQL 은 저장소를 못 건드립니다.
--   그래서 **지울 파일 목록을 돌려주고**, Edge Function 이 그걸 받아
--   서랍에서 지웁니다.
--
-- ⚠ 표를 먼저 지우면 파일 경로를 잃어버려 **아무도 모르는 파일**이
--   서랍에 영원히 남습니다. 그래서 목록을 먼저 돌려줍니다.
-- ─────────────────────────────────────────────────────────────────
create or replace function purge_records()
returns table (id uuid, path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  delete from call_records r
   where r.purge_on < now()
  returning r.id, r.path;
end;
$$;

revoke all on function purge_records() from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────
-- ④ 이용권이 끝나고 오래된 갤러리도 치웁니다
--
-- 27차 2-4 의 규칙입니다 — 이용권이 끝나고 3개월 뒤.
-- ⚠ 이것도 목록을 돌려줍니다. 파일은 Edge Function 이 지웁니다.
-- ─────────────────────────────────────────────────────────────────
create or replace function purge_gallery()
returns table (id uuid, path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  delete from gallery_items g
   where g.account_id in (
     select s.account_id from subscriptions s
     where s.plan_until is not null
       and s.plan_until + s.purge_after < now()
   )
  returning g.id, g.path;
end;
$$;

revoke all on function purge_gallery() from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────
-- ⑤ 열쇠를 금고에 넣습니다  ⚠ 딱 한 번만 하세요
--
-- 🔴 왜 금고인가
--   예약(cron)에 열쇠를 그대로 적으면 **SQL 에 열쇠가 남습니다.**
--   나중에 그 SQL 을 누구에게 보내거나 어딘가에 올리면 열쇠가 샙니다.
--   금고에 넣어두면 쓸 때만 꺼내 쓰고, 예약에는 "금고에서 꺼내라" 는
--   말만 남습니다.
--
-- ⚠ 아래 '여기에_service_role_key' 자리에 실제 열쇠를 넣으세요.
--   Supabase → Settings → API → service_role key
-- ⚠ 이 문장을 돌린 **뒤에는 이 SQL 을 저장하지 마세요.** 창을 닫으면
--   됩니다. 열쇠는 이미 금고에 들어갔습니다.
-- ─────────────────────────────────────────────────────────────────
-- select vault.create_secret('여기에_service_role_key', 'sweep_key');

-- 잘 들어갔는지 (이름만 봅니다. 값은 안 봅니다)
-- select name, created_at from vault.secrets where name = 'sweep_key';


-- ─────────────────────────────────────────────────────────────────
-- ⑥ 날마다 한 번 — 한국 새벽 4시  ⚠ 딱 한 번만 하세요
--
-- 🔴 한 번 걸어두면 서버가 날마다 알아서 돕니다.
--   손님이 다시 손댈 일이 없습니다.
--
-- ⚠ 시각은 UTC 입니다. 한국 새벽 4시 = UTC 전날 19시.
-- ⚠ 새벽에 도는 이유 — 손님이 적을 때 하는 게 낫고, 알림도 아침에
--   보시게 됩니다. 한밤중에 알림이 울리면 안 됩니다.
-- ─────────────────────────────────────────────────────────────────
-- select cron.schedule(
--   'alias-daily-sweep',
--   '0 19 * * *',
--   $$
--   select net.http_post(
--     url := 'https://azredlrnvsssfjytaotb.supabase.co/functions/v1/alias-sweep',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (
--         select decrypted_secret from vault.decrypted_secrets
--         where name = 'sweep_key'
--       )
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );


-- ─────────────────────────────────────────────────────────────────
-- ⑦ 예약 살펴보기
-- ─────────────────────────────────────────────────────────────────
-- 걸려 있는가
-- select jobid, jobname, schedule, active from cron.job;

-- 돌아간 기록 (최근 열 번)
-- select jobid, status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 10;

-- 멈추기
-- select cron.unschedule('alias-daily-sweep');


-- ─────────────────────────────────────────────────────────────────
-- ⑧ 손으로 먼저 확인하기  ⚠ 예약을 걸기 전에 꼭 해보세요
-- ─────────────────────────────────────────────────────────────────
-- select * from records_to_warn();     -- 알릴 것
-- select * from records_to_purge();    -- 지울 때가 된 것 (지우지는 않습니다)

-- 시험하려고 날짜를 당기기 (가장 최근 녹음 하나)
-- update call_records set purge_on = now() + interval '2 days',
--        warned_7 = false, warned_3 = false
--  where id = (select id from call_records order by created_at desc limit 1);

-- 되돌리기
-- update call_records
--    set purge_on = created_at + make_interval(days => keep_days);

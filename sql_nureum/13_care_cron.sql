-- =====================================================================
-- 🛡 무소식 알림 시계 — 10분마다 care-alert 함수를 부릅니다 (부름 서버 · 2026-11-15)
--   12_care.sql 과 care-alert 함수를 먼저 올린 뒤 돌립니다.
--
--   ⚠ 돌리기 전에 아래 「여기에-비밀값」을 바꾸세요.
--      Edge Functions → Secrets 에 넣은 CARE_CRON_SECRET 과 똑같은 글자여야 합니다.
--      (아무 긴 글자 — 예: 영문 · 숫자 섞어 30자. 이 글자는 채팅에 보내지 마세요.)
--   ⚠ 다시 돌려도 안전합니다(같은 이름의 시계를 지우고 새로 만듭니다).
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'care-nosign';
end $$;

select cron.schedule(
  'care-nosign',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url     := 'https://azredlrnvsssfjytaotb.supabase.co/functions/v1/care-alert',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-care-secret', '여기에-비밀값'),
    body    := '{"cron": true}'::jsonb
  );
  $job$
);

select 'care cron ok' as result, jobid, schedule from cron.job where jobname = 'care-nosign';

-- 잘 도는지 보기 (몇 분 뒤):
--   select status_code, left(content::text, 120) from net._http_response order by id desc limit 5;
--   200 · {"ok":true,"jobs":0,"sent":0} 이면 정상입니다. 403 이면 비밀값이 서로 다릅니다.

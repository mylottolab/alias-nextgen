-- =====================================================================
-- 무료 체험 7일 (부름 서버: 와파 · 부름 · 누름 · 바로너) — 2026-11-28
--   · 이 SQL 을 Run 한 순간 이후에 가입한 분부터 체험 7일, 그 전에 가입한 분은 원래대로 14일.
--   · 체험 기한을 계산하던 함수 6개와 관리 화면 보기 1개의 "가입일 + 14일" 을 이 규칙으로 바꿉니다.
--     (my_plan · extend_plan_for_user · reward_add_months · admin_grant_plan · admin_find_user · admin_member_report · _admin_plan_src)
--   · 다시 돌려도 안전합니다(바꾸는 시점은 처음 Run 한 때로 고정). 맨 아래 'trial7 ok' 가 나오면 끝.
-- =====================================================================
create table if not exists public.weave_settings (k text primary key, v text not null, at timestamptz not null default now());
alter table public.weave_settings enable row level security;
revoke all on public.weave_settings from anon, authenticated;
insert into public.weave_settings(k, v) values ('trial7_from', now()::text) on conflict (k) do nothing;

create or replace function public.burum_trial_end(p_joined timestamptz) returns timestamptz
language sql stable security definer set search_path = public as $$
  select p_joined + case when p_joined < coalesce((select v::timestamptz from weave_settings where k = 'trial7_from'), '-infinity'::timestamptz)
                         then interval '14 days' else interval '7 days' end;
$$;
grant execute on function public.burum_trial_end(timestamptz) to authenticated;

do $$
declare f text; d text; d2 text; n int;
begin
  foreach f in array array['my_plan()', 'extend_plan_for_user(uuid,integer)', 'reward_add_months(uuid,integer)',
                           'admin_grant_plan(uuid,integer,text)', 'admin_find_user(text)', 'admin_member_report()'] loop
    if to_regprocedure('public.' || f) is null then raise notice 'skip (없음) %', f; continue; end if;
    d := pg_get_functiondef(('public.' || f)::regprocedure);
    d2 := regexp_replace(d, '(\m[a-z_]+\.)?(created_at|v_joined)\s*\+\s*interval\s*''14 days''', 'public.burum_trial_end(\1\2)', 'g');
    n := (length(d) - length(replace(d, '''14 days''', ''))) / length('''14 days''');
    if d2 = d then raise notice 'no change %', f; continue; end if;
    execute d2;
    raise notice 'changed % (% place)', f, n;
  end loop;
end $$;

-- 관리 화면용 보기
create or replace view public._admin_plan_src as
  select s.account_id as uid, 'subscriptions'::text as src,
         jsonb_build_object('plan_until', s.plan_until,
                            'trial_until', coalesce(s.trial_until, public.burum_trial_end(u.created_at))) as j
    from public.subscriptions s join auth.users u on u.id = s.account_id;
revoke all on public._admin_plan_src from public, anon, authenticated;

select 'trial7 ok' as result,
       (select v from public.weave_settings where k = 'trial7_from') as trial7_from,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ('my_plan', 'extend_plan_for_user', 'reward_add_months', 'admin_grant_plan', 'admin_find_user', 'admin_member_report')
           and pg_get_functiondef(p.oid) like '%burum_trial_end%') as functions_changed,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prokind = 'f' and pg_get_functiondef(p.oid) ~ '(created_at|v_joined)\s*\+\s*interval\s*''14 days''') as left_14days;

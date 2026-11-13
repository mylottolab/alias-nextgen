-- =====================================================================
-- 종합관리자 · 가입자 현황 / 이용권 구매 현황 (부름 · 누름 · 바로너 서버) — 2026-11-13
--   admin_member_report()             : 가입자 한 명씩 (가입일 · 앱 · 닉네임 · 산 이용권 · 금액 · 유효기간)
--   admin_purchase_report(from, to)   : 결제 한 건씩 (결제일 · 앱 · 닉네임 · 상품 · 결제 방법 · 금액 · 유효기간)
--   관리자(is_admin)만 부를 수 있습니다. 아무것도 바꾸지 않고 읽기만 합니다.
--
--   ⚠ Supabase(부름 프로젝트) → SQL Editor 에 통째로 붙여 Run. 다시 돌려도 안전합니다.
--   ⚠ 부름 이용권 기한(plan_until)이 들어 있는 표를 스스로 찾아 연결합니다(맨 아래 결과에 표 이름이 나옵니다).
-- =====================================================================

-- ① 부름 이용권 기한이 있는 표를 찾아 '_admin_plan_src' 로 이어 둡니다 -----------------------------
do $do$
declare t text; k text;
begin
  select c.table_name into t
    from information_schema.columns c
   where c.table_schema = 'public' and c.column_name = 'plan_until' and c.table_name not like 'nureum%'
     and exists (select 1 from information_schema.columns d where d.table_schema = 'public' and d.table_name = c.table_name
                  and d.column_name in ('account_id', 'user_id', 'id'))
     and exists (select 1 from information_schema.tables x where x.table_schema = 'public' and x.table_name = c.table_name and x.table_type = 'BASE TABLE')
   order by (c.table_name in ('accounts', 'account_settings', 'profiles', 'account_plans')) desc, c.table_name
   limit 1;
  if t is not null then
    select column_name into k from information_schema.columns
     where table_schema = 'public' and table_name = t and column_name in ('account_id', 'user_id', 'id')
     order by array_position(array['account_id', 'user_id', 'id'], column_name::text) limit 1;
    execute format('create or replace view public._admin_plan_src as select %I::uuid as uid, %L::text as src, to_jsonb(x) as j from public.%I x', k, t, t);
  else
    execute 'create or replace view public._admin_plan_src as select null::uuid as uid, null::text as src, null::jsonb as j where false';
  end if;
end $do$;
revoke all on public._admin_plan_src from public, anon, authenticated;

create or replace function public.admin_member_report()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare v jsonb;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not_admin'; end if;
  select coalesce(jsonb_agg(x order by joined desc), '[]'::jsonb) into v from (
    select u.created_at as joined, jsonb_build_object(
      'id', u.id,
      'joined', u.created_at,
      'app', coalesce(nullif(u.raw_user_meta_data->>'app', ''), 'burum?'),
      'nick', coalesce(ps.j->>'nickname', ps.j->>'display_name',
                       (select pe.display_name from personas pe where pe.account_id = u.id order by pe.is_default desc, pe.created_at limit 1)),
      'login', u.email,
      'anon', coalesce((to_jsonb(u)->>'is_anonymous')::boolean, false),
      'last_in', u.last_sign_in_at,
      'plan_until', ps.j->>'plan_until',
      'trial_until', ps.j->>'trial_until',
      'nureum_until', (select max(l.plan_until) from nureum_lines l where l.owner_id = u.id and l.ended_at is null),
      'nureum_lines', (select count(*) from nureum_lines l where l.owner_id = u.id and l.ended_at is null and l.plan_until > now()),
      'pay_n', coalesce(pp.n, 0), 'pay_krw', coalesce(pp.krw, 0), 'pay_other', pp.other, 'products', pp.products,
      'refund_n', coalesce(pp.rn, 0)
    ) as x
    from auth.users u
    left join lateral (select s.j from _admin_plan_src s where s.uid = u.id limit 1) ps on true
    left join lateral (
      select count(*) filter (where q.status = 'completed') as n,
             sum(q.amount_minor_units) filter (where q.status = 'completed' and trim(q.currency_code) = 'KRW') as krw,
             nullif(string_agg(distinct case when q.status = 'completed' and trim(q.currency_code) <> 'KRW'
                      then (q.amount_minor_units / 100.0)::text || ' ' || trim(q.currency_code) end, ', '), '') as other,
             count(*) filter (where q.status = 'refunded') as rn,
             jsonb_agg(distinct coalesce(to_jsonb(q)->>'google_product_id', q.purpose::text)) filter (where q.status = 'completed') as products
        from payments q where q.user_id = u.id and q.status in ('completed', 'refunded')
    ) pp on true
  ) s;
  return v;
end $$;

create or replace function public.admin_purchase_report(p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare v jsonb;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not_admin'; end if;
  select coalesce(jsonb_agg(x order by at desc), '[]'::jsonb) into v from (
    select coalesce(q.completed_at, q.created_at) as at, jsonb_build_object(
      'id', to_jsonb(q)->>'id',
      'at', coalesce(q.completed_at, q.created_at),
      'user_id', q.user_id,
      'nick', coalesce(ps.j->>'nickname', ps.j->>'display_name',
                       (select pe.display_name from personas pe where pe.account_id = q.user_id order by pe.is_default desc, pe.created_at limit 1)),
      'login', u.email,
      'joined', u.created_at,
      'user_app', u.raw_user_meta_data->>'app',
      'product', coalesce(to_jsonb(q)->>'google_product_id', q.purpose::text),
      'purpose', q.purpose,
      'months', to_jsonb(q)->>'plan_months',
      'kind', (select o.kind from nureum_orders o where o.oid = q.external_payment_id),
      'method', q.method,
      'amount', q.amount_minor_units,
      'currency', trim(q.currency_code),
      'status', q.status,
      'until', case q.purpose::text
                 when 'plan'    then ps.j->>'plan_until'
                 when 'nureum'  then coalesce((select l.plan_until::text from nureum_orders o join nureum_lines l on l.id = o.line_id where o.oid = q.external_payment_id),
                                              (select max(l.plan_until)::text from nureum_lines l where l.owner_id = q.user_id and l.ended_at is null))
                 when 'storage' then (select to_jsonb(sp)->>'expires_at' from storage_packs sp where to_jsonb(sp)->>'external_payment_id' = q.external_payment_id limit 1)
               end
    ) as x
    from payments q
    left join auth.users u on u.id = q.user_id
    left join lateral (select s.j from _admin_plan_src s where s.uid = q.user_id limit 1) ps on true
   where q.status in ('completed', 'refunded')
     and (p_from is null or (coalesce(q.completed_at, q.created_at) at time zone 'Asia/Seoul')::date >= p_from)
     and (p_to   is null or (coalesce(q.completed_at, q.created_at) at time zone 'Asia/Seoul')::date <= p_to)
   limit 20000
  ) s;
  return v;
end $$;

revoke execute on function public.admin_member_report() from public, anon;
grant  execute on function public.admin_member_report() to authenticated;
revoke execute on function public.admin_purchase_report(date, date) from public, anon;
grant  execute on function public.admin_purchase_report(date, date) to authenticated;

-- 확인: 아래 한 줄이 보이면 끝 (plan_table 에 부름 이용권 기한이 들어 있는 표 이름이 나옵니다)
select 'admin members ok' as result,
       (select src from _admin_plan_src limit 1) as plan_table,
       (select count(*) from auth.users) as members,
       (select count(*) from payments where status = 'completed') as paid;

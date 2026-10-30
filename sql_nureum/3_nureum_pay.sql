-- =====================================================================
-- 누름 결제 준비 (2026-10-30) — 부름 Supabase SQL Editor 에 붙여 넣고 Run. 여러 번 돌려도 괜찮습니다.
--   · 앱 결제(구글 · 애플)를 누르기 직전에 "어느 라인을 사는지" 를 적어 둡니다.
--     결제 영수증이 늦게(앱을 다시 켤 때) 와도 서버가 그 라인을 찾아 넣을 수 있게.
--   · 결제 기록(payments)의 종류(purpose)에 'nureum' 을 더합니다(정해진 값만 받게 되어 있으면).
-- =====================================================================
create table if not exists public.nureum_intents (
  account_id uuid primary key references auth.users(id) on delete cascade,
  line_id uuid not null references public.nureum_lines(id) on delete cascade,
  sku text,
  created_at timestamptz not null default now()
);
alter table public.nureum_intents enable row level security;
revoke all on public.nureum_intents from anon, authenticated;
grant all on public.nureum_intents to service_role;

create or replace function public.nureum_buy_intent(p_line uuid, p_sku text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from nureum_lines where id = p_line and owner_id = auth.uid() and ended_at is null) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  insert into nureum_intents(account_id, line_id, sku, created_at) values (auth.uid(), p_line, p_sku, now())
  on conflict (account_id) do update set line_id = excluded.line_id, sku = excluded.sku, created_at = now();
  return json_build_object('ok', true);
end $$;
grant execute on function public.nureum_buy_intent(uuid, text) to authenticated;

-- payments.purpose 에 정해진 값 목록(check)이 있으면 'nureum' 을 더합니다
do $$
declare c record; d text;
begin
  for c in select conname, pg_get_constraintdef(oid) as def from pg_constraint
            where conrelid = 'public.payments'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%purpose%' loop
    if c.def not ilike '%nureum%' and c.def ilike '%ARRAY[%' then
      d := regexp_replace(c.def, 'ARRAY\[', 'ARRAY[''nureum''::text, ');
      execute format('alter table public.payments drop constraint %I', c.conname);
      execute format('alter table public.payments add constraint %I %s', c.conname, d);
      raise notice 'payments.% 에 nureum 을 더했습니다', c.conname;
    end if;
  end loop;
end $$;

select 'nureum pay ok' as result;

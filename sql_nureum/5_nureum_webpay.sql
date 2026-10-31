-- =====================================================================
-- 누름 웹 결제(이니시스 · 페이팔) 준비 (2026-10-31) — 부름 Supabase SQL Editor 에 붙여 넣고 Run. 여러 번 돌려도 괜찮습니다.
--   · nureum_orders : 웹 결제 주문(어느 라인 · 무엇을 · 몇 장). 결제가 확인되면 nureum_apply 로 넣습니다.
--   · 페이팔 달러 값(설정 표에서 바꿀 수 있음): 1개월권 1.29 · 12개월권 12.99 · 용량 추가 0.89 (USD)
-- =====================================================================
alter table public.nureum_settings add column if not exists usd_1m numeric(8,2) not null default 1.29;
alter table public.nureum_settings add column if not exists usd_12m numeric(8,2) not null default 12.99;
alter table public.nureum_settings add column if not exists usd_extra numeric(8,2) not null default 0.89;

create table if not exists public.nureum_orders (
  oid text primary key,                       -- 이니시스 주문번호(ALNG_NU_…) 또는 페이팔 주문번호
  line_id uuid not null references public.nureum_lines(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('1m','12m','voice','video','storage')),
  qty int not null default 1 check (qty between 1 and 10),
  amount_krw int,
  amount_usd numeric(10,2),
  method text not null check (method in ('inicis','paypal')),
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.nureum_orders enable row level security;
revoke all on public.nureum_orders from anon, authenticated;
grant all on public.nureum_orders to service_role;

select 'nureum webpay ok' as result, (select usd_1m from nureum_settings) as usd_1m;

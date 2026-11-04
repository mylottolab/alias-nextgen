-- 🔴 2026-11-05 누름 · 바로너 1개월권 1,650원 → 1,700원 (애플 가격 단계에 1,650원이 없음)
-- 화면 · 웹 카드 결제 금액이 모두 이 값을 읽습니다. 12개월권(16,500원)은 그대로.
update public.nureum_settings set price_1m = 1700 where id = 1;
select price_1m, price_12m, extra_price from public.nureum_settings where id = 1;

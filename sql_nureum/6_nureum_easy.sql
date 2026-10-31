-- =====================================================================
-- 누름 6 — 가입 없이 바로 시작 (2026-11-01)
--   ① 코드 정보(nureum_code_info)를 로그인 전에도 볼 수 있게 (초대한 사람 이름만 보여 줌)
--   ② 라인을 만든 분이 상대를 부르는 이름('엄마')을 받는 쪽 기본 이름으로 돌려줌 → 'as'
--      그래서 받는 분은 아무것도 적지 않고 [연결하기] 한 번이면 됩니다.
--   ⚠ Supabase 대시보드에서 "익명 로그인(Allow anonymous sign-ins)"을 켜야 합니다.
--   ⚠ 이 파일은 몇 번 다시 돌려도 됩니다.
-- =====================================================================

create or replace function public.nureum_code_info(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare l nureum_lines; i invites; v_as text;
begin
  select * into l from nureum_lines where lower(invite_code) = lower(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')) limit 1;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if l.link_id is not null or l.ended_at is not null then return json_build_object('ok', false, 'error', 'used'); end if;
  select * into i from invites where id = l.invite_id;
  if i.revoked_at is not null or (i.expires_at is not null and i.expires_at < now()) then
    return json_build_object('ok', false, 'error', 'expired'); end if;
  if auth.uid() is not null and l.owner_id = auth.uid() then return json_build_object('ok', false, 'error', 'self'); end if;
  select name into v_as from nureum_sides where line_id = l.id and account_id = l.owner_id limit 1;
  return json_build_object('ok', true, 'code', l.invite_code,
    'from', (select display_name from personas where id = i.issuer_persona_id),
    'as', v_as);
end $$;

-- 로그인 전(anon)에도 "○○님이 연결하자고 해요" 를 보여 주려고 엽니다. 코드를 모르면 아무것도 못 봅니다.
grant execute on function public.nureum_code_info(text) to anon, authenticated;

select 'nureum easy ok' as result;

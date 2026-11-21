-- =====================================================================
-- 부름 — 3자 통화 (2026-11-21) · 부름 Supabase 에서 Run (와파 07 · 08 · 09 다음 — 같은 프로젝트)
--
--   통화 중 [➕] → 내 연락처에서 한 사람 → 세 사람만의 방(links.kind='group', room_mode='wafa3')으로 옮김
--   · 통화 중이던 상대는 화면이 알아서 따라옴(wafa_three_way_room — 와파와 같은 함수)
--   · 새 사람에게는 진짜 전화벨(나 ↔ 그 사람 1:1 대화방의 전화 한 통, 표 = 'w3' + 방 번호)
--   · 와파 요금(구독 · 사용량)과는 상관없습니다
--   ⚠ 새 표 없음. 다시 돌려도 안전합니다. 맨 아래 'burum threeway ok'
-- =====================================================================

create or replace function public.burum_three_way(p_link uuid, p_target_link uuid, p_kind text default 'voice')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_me uuid := auth.uid(); my_s link_sides; peer_s link_sides; my_t link_sides; tgt_s link_sides;
        v_room uuid; v_call uuid; v_tok text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if coalesce(p_kind, '') not in ('voice', 'video') then p_kind := 'voice'; end if;

  /* 지금 통화 중인 1:1 사이 */
  select s.* into my_s from link_sides s join links l on l.id = s.link_id
   where s.link_id = p_link and s.account_id = v_me and l.status = 'active' and coalesce(l.kind, 'pair') = 'pair';
  if my_s.id is null then return jsonb_build_object('ok', false, 'error', 'not_pair'); end if;
  select * into peer_s from link_sides where link_id = p_link and account_id <> v_me limit 1;
  if peer_s.id is null then return jsonb_build_object('ok', false, 'error', 'not_pair'); end if;

  /* 부를 사람 — 내 다른 1:1 연락처 */
  select s.* into my_t from link_sides s join links l on l.id = s.link_id
   where s.link_id = p_target_link and s.account_id = v_me and l.status = 'active' and coalesce(l.kind, 'pair') = 'pair';
  if my_t.id is null then return jsonb_build_object('ok', false, 'error', 'not_pair'); end if;
  select * into tgt_s from link_sides where link_id = p_target_link and account_id <> v_me limit 1;
  if tgt_s.id is null then return jsonb_build_object('ok', false, 'error', 'not_pair'); end if;
  if tgt_s.account_id = peer_s.account_id then return jsonb_build_object('ok', false, 'error', 'already'); end if;
  if exists (select 1 from nick_blocks where account_id = tgt_s.account_id and blocked_id = v_me) then
    return jsonb_build_object('ok', false, 'error', 'not_pair'); end if;

  /* 세 사람 방 — 각자 그 사이에서 쓰던 별칭 그대로 */
  insert into links (kind, room_name, max_people, status, room_mode)
  values ('group', '3자 통화', 4, 'active', 'wafa3') returning id into v_room;
  insert into link_sides (link_id, account_id, persona_id) values
    (v_room, v_me, my_s.persona_id),
    (v_room, peer_s.account_id, peer_s.persona_id),
    (v_room, tgt_s.account_id, tgt_s.persona_id);

  v_tok := 'w3' || replace(v_room::text, '-', '');
  insert into calls (link_id, caller_side_id, session_token, call_type, is_group)
  values (p_target_link, my_t.id, v_tok, p_kind, false) returning id into v_call;

  return jsonb_build_object('ok', true, 'room', v_room,
                            'ring', jsonb_build_object('link', p_target_link, 'call', v_call, 'token', v_tok));
end $$;

grant execute on function public.burum_three_way(uuid, uuid, text) to authenticated;

select 'burum threeway ok' as result;

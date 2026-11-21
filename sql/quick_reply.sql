-- =====================================================================
-- 부름 · 와파 · 누름 · 바로너 — 알림에서 바로 답장 (2026-11-22) · 부름 Supabase SQL Editor 에서 Run
--
--   다른 화면을 보고 있을 때 메시지 알림이 위에 뜨고, 그 자리에서 [읽음] [답장].
--   · devices.caps        새 앱(안드로이드)이 「알림 답장 됨(qr1)」 을 적어 둠 → 그 폰에만 새 모양 알림
--   · qr_targets()        alias-temp-push 가 부름 — 받는 기기마다 그 사람의 대화 자리(side) · 잠긴 방 여부
--   · quick_reply()       alias-quick-reply 가 부름 — 알림에서 쓴 답장 저장 · 읽음 표시
--   두 함수는 temp_push_key()(이미 있는 비밀값)를 아는 서버 함수만 부를 수 있습니다.
--   ⚠ msg_notify_peer(메시지 알림 트리거)는 손대지 않습니다.
--   새 칸 하나(devices.caps), 새 표 없음. 다시 돌려도 안전합니다. 맨 아래 'quick reply ok'
-- =====================================================================
alter table public.devices add column if not exists caps text;

create or replace function public.set_device_caps(p_token text, p_caps text)
returns boolean language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update devices set caps = left(coalesce(p_caps, ''), 40) where push_token = p_token and account_id = auth.uid();
  return found;
end $$;
revoke all on function public.set_device_caps(text, text) from public, anon;
grant execute on function public.set_device_caps(text, text) to authenticated;

create or replace function public.qr_targets(p_key text, p_link uuid, p_tokens text[])
returns table(token text, side_id uuid, caps text, can_reply boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_key is null or p_key <> temp_push_key() then return; end if;
  return query
    select d.push_token::text, s.id, coalesce(d.caps, '')::text,
           (coalesce(l.e2ee_on, false) = false and coalesce(l.status, '') = 'active')
      from devices d
      join link_sides s on s.account_id = d.account_id and s.link_id = p_link
      join links l on l.id = p_link
     where d.push_token = any(p_tokens);
end $$;
revoke all on function public.qr_targets(text, uuid, text[]) from public, authenticated;
grant execute on function public.qr_targets(text, uuid, text[]) to anon;

create or replace function public.quick_reply(p_key text, p_side uuid, p_link uuid, p_action text, p_text text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s link_sides; l links; m messages; t text := btrim(coalesce(p_text, ''));
begin
  if p_key is null or p_key <> temp_push_key() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  select * into s from link_sides where id = p_side and link_id = p_link;
  if s.id is null then return jsonb_build_object('ok', false, 'error', 'not_your_link'); end if;
  select * into l from links where id = p_link;
  if l.id is null or coalesce(l.status, '') <> 'active' then return jsonb_build_object('ok', false, 'error', 'link_closed'); end if;
  if p_action = 'read' then
    update link_sides set last_read_at = now() where id = s.id;
    return jsonb_build_object('ok', true, 'read', true);
  end if;
  if p_action <> 'reply' then return jsonb_build_object('ok', false, 'error', 'bad_action'); end if;
  if coalesce(l.e2ee_on, false) then return jsonb_build_object('ok', false, 'error', 'locked_room'); end if;
  if t = '' then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  if length(t) > 2000 then t := left(t, 2000); end if;
  insert into messages (link_id, sender_side_id, message_type, content, sent_at)
  values (p_link, s.id, 'text', t, now()) returning * into m;
  update links set last_activity_at = now() where id = p_link;
  update link_sides set last_read_at = now() where id = s.id;
  return jsonb_build_object('ok', true, 'message', jsonb_build_object('id', m.id, 'link_id', m.link_id, 'sender_side_id', m.sender_side_id,
           'message_type', 'text', 'content', m.content, 'sent_at', m.sent_at, 'created_at', m.created_at));
end $$;
revoke all on function public.quick_reply(text, uuid, uuid, text, text) from public, authenticated;
grant execute on function public.quick_reply(text, uuid, uuid, text, text) to anon;

select 'quick reply ok' as result;

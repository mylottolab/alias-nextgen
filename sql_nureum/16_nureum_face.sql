-- =====================================================================
-- 🙂 16_nureum_face.sql — 바로너 · 누름 "상대에게 보낼 내 사진" (2026-11-23) · 부름 서버(Supabase "부름")
--   · 각자 자기 사진 하나를 "상대에게 보내기"로 골라 둘 수 있어요(선택 · 안 보내도 됨).
--   · 상대가 그 핫라인에 자기 아이콘 사진을 따로 안 넣었을 때만, 상대 휴대폰 아이콘에 이 사진이 들어갑니다.
--     (상대가 사진을 넣으면 상대 것이 먼저. 상대가 "보낸 사진 안 쓰기"를 고르면 안 씀 — 화면에서)
--   · 기존 사진(photo: 내가 내 휴대폰에 보려고 넣은 상대 사진)은 그대로입니다.
--   · 여러 번 돌려도 괜찮습니다.
-- =====================================================================
alter table public.nureum_sides add column if not exists face text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'nureum_sides_face_size') then
    alter table public.nureum_sides add constraint nureum_sides_face_size
      check (face is null or (char_length(face) <= 120000 and face like 'data:image/%'));
  end if;
end $$;

-- 내 사진을 상대에게 보내기(넣기 · 바꾸기) / null 이면 보내지 않기
create or replace function public.nureum_set_face(p_line uuid, p_face text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return json_build_object('ok', false, 'error', 'login'); end if;
  if p_face is not null and (char_length(p_face) > 120000 or p_face not like 'data:image/%') then
    return json_build_object('ok', false, 'error', 'photo');
  end if;
  update nureum_sides set face = p_face where line_id = p_line and account_id = auth.uid();
  return json_build_object('ok', found);
end $$;

-- 내 핫라인들에서 상대가 보내 준 사진 · 내가 보낸 사진
--   { "peer": { 라인id: 사진 }, "mine": { 라인id: true } }
create or replace function public.nureum_faces()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'peer', coalesce((select json_object_agg(s.line_id, os.face)
               from nureum_sides s
               join nureum_lines l on l.id = s.line_id and l.ended_at is null
               join nureum_sides os on os.line_id = s.line_id and os.account_id <> s.account_id
              where s.account_id = auth.uid() and os.face is not null), '{}'::json),
    'mine', coalesce((select json_object_agg(s.line_id, true)
               from nureum_sides s join nureum_lines l on l.id = s.line_id and l.ended_at is null
              where s.account_id = auth.uid() and s.face is not null), '{}'::json))
$$;

revoke execute on function public.nureum_set_face(uuid, text) from public, anon;
revoke execute on function public.nureum_faces() from public, anon;
grant execute on function public.nureum_set_face(uuid, text) to authenticated;
grant execute on function public.nureum_faces() to authenticated;

select proname from pg_proc where proname in ('nureum_set_face', 'nureum_faces') order by 1;

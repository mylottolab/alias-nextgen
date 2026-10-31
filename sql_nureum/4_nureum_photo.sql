-- =====================================================================
-- 누름 — 라인 사진 (2026-10-31) · 부름 Supabase SQL Editor 에 붙여 넣고 Run. 여러 번 돌려도 괜찮습니다.
--   두 사람이 각자 자기 휴대폰에서 상대 사진을 고릅니다(이름 · 색처럼 내 쪽에만 저장).
--   바탕화면 아이콘 · 라인 화면 위쪽 그림에 그 사진이 나옵니다. 사진은 작게 줄인 것(약 30KB 이하)만 받습니다.
-- =====================================================================
alter table public.nureum_sides add column if not exists photo text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'nureum_sides_photo_size') then
    alter table public.nureum_sides add constraint nureum_sides_photo_size
      check (photo is null or (char_length(photo) <= 120000 and photo like 'data:image/%'));
  end if;
end $$;

create or replace function public.nureum_set_photo(p_line uuid, p_photo text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if p_photo is not null and (char_length(p_photo) > 120000 or p_photo not like 'data:image/%') then
    return json_build_object('ok', false, 'error', 'photo');
  end if;
  update nureum_sides set photo = p_photo where line_id = p_line and account_id = auth.uid();
  return json_build_object('ok', found);
end $$;
grant execute on function public.nureum_set_photo(uuid, text) to authenticated;

-- ③ 내 라인들 (바탕화면 아이콘 · 목록용)
create or replace function public.nureum_my_lines()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at), '[]'::json) from (
    select l.id, l.link_id, l.created_at, l.paired_at, l.plan_until,
           (l.owner_id = auth.uid()) as is_owner,
           (l.plan_until is not null and l.plan_until > now()) as active,
           ms.name, ms.color, ms.glyph, ms.auto_answer, ms.photo,
           (select os.name from nureum_sides os where os.line_id = l.id and os.account_id <> auth.uid() limit 1) as peer_name_for_me,
           (select p.display_name from link_sides ls join personas p on p.id = ls.persona_id
             where ls.link_id = l.link_id and ls.account_id <> auth.uid() limit 1) as peer_alias,
           (select ls.id from link_sides ls where ls.link_id = l.link_id and ls.account_id = auth.uid() limit 1) as my_side_id
      from nureum_lines l join nureum_sides ms on ms.line_id = l.id and ms.account_id = auth.uid()
     where l.ended_at is null) x
$$;

-- ④ 라인 하나 (라인 화면 · 요금 화면)
create or replace function public.nureum_line(p_line uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid(); l nureum_lines; ms nureum_sides; s nureum_settings; i invites;
begin
  select * into l from nureum_lines where id = p_line;
  select * into ms from nureum_sides where line_id = p_line and account_id = v_me;
  if l.id is null or ms.line_id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  select * into s from nureum_settings where id = 1;
  select * into i from invites where id = l.invite_id;
  return json_build_object('ok', true,
    'id', l.id, 'link_id', l.link_id, 'is_owner', l.owner_id = v_me,
    'ended', l.ended_at is not null, 'paired', l.link_id is not null,
    'plan_until', l.plan_until, 'active', l.plan_until is not null and l.plan_until > now(),
    'name', ms.name, 'color', ms.color, 'glyph', ms.glyph, 'auto_answer', ms.auto_answer, 'photo', ms.photo,
    'code', case when l.owner_id = v_me and l.link_id is null then l.invite_code end,
    'code_expires_at', case when l.owner_id = v_me and l.link_id is null then i.expires_at end,
    'usage', nureum__usage(p_line),
    'prices', json_build_object('m1', s.price_1m, 'm12', s.price_12m, 'extra', s.extra_price,
       'extra_voice_min', s.extra_voice_min, 'extra_video_min', s.extra_video_min, 'extra_storage_mb', s.extra_storage_mb));
end $$;


select 'nureum photo ok' as result;

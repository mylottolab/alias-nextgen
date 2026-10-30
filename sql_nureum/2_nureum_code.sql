-- 누름 고침 (2026-10-30) — 짝 맺기 코드를 띄어 쓰거나 대문자로 넣어도 찾게 합니다.
-- 부름 Supabase SQL Editor 에 붙여 넣고 Run. 여러 번 돌려도 괜찮습니다.

-- 받는 쪽: 이 코드가 누름 라인인가 (짝 맺기 화면이 문구를 고르려고 묻습니다)
create or replace function public.nureum_code_info(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare l nureum_lines; i invites;
begin
  select * into l from nureum_lines where lower(invite_code) = lower(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')) limit 1;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if l.link_id is not null or l.ended_at is not null then return json_build_object('ok', false, 'error', 'used'); end if;
  select * into i from invites where id = l.invite_id;
  if i.revoked_at is not null or (i.expires_at is not null and i.expires_at < now()) then
    return json_build_object('ok', false, 'error', 'expired'); end if;
  if l.owner_id = auth.uid() then return json_build_object('ok', false, 'error', 'self'); end if;
  return json_build_object('ok', true, 'code', l.invite_code, 'from', (select display_name from personas where id = i.issuer_persona_id));
end $$;

-- ② 받는 쪽: 부름 accept_invite 로 이어진 뒤, 그 연결을 누름 라인에 붙이고 내 이름 · 색을 정합니다
create or replace function public.nureum_attach(p_code text, p_name text, p_color text, p_glyph text)
returns json language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); l nureum_lines; v_link uuid;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'login'); end if;
  select * into l from nureum_lines where lower(invite_code) = lower(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')) for update;
  if l.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if l.owner_id = v_me then return json_build_object('ok', false, 'error', 'self'); end if;
  if l.link_id is not null then
    if exists (select 1 from nureum_sides where line_id = l.id and account_id = v_me) then
      return json_build_object('ok', true, 'line_id', l.id, 'link_id', l.link_id); end if;
    return json_build_object('ok', false, 'error', 'used');
  end if;
  select k.id into v_link from links k
    join link_sides s on s.link_id = k.id and s.account_id = v_me
   where k.via_invite_id = l.invite_id
   order by k.created_at desc limit 1;
  if v_link is null then return json_build_object('ok', false, 'error', 'not_linked'); end if;
  update nureum_lines set link_id = v_link, paired_at = now() where id = l.id;
  insert into nureum_sides(line_id, account_id, name, color, glyph)
  values (l.id, v_me, coalesce(nullif(trim(p_name), ''), '누름'), coalesce(nullif(p_color, ''), '#2B59C3'), nullif(trim(coalesce(p_glyph, '')), ''))
  on conflict (line_id, account_id) do nothing;
  return json_build_object('ok', true, 'line_id', l.id, 'link_id', v_link);
end $$;

select 'nureum code ok' as result;

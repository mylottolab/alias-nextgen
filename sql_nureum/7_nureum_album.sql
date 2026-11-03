-- =====================================================================
-- 누름 · 바로너 — "우리 둘 앨범" (2026-11-03)
--   핫라인(라인)마다 앨범이 하나씩. 그 라인의 두 사람만 보고, 둘 다 사진을 넣을 수 있습니다.
--   · 그림은 잠긴 보관함(nureum-album)에 "라인번호/…" 로 둡니다. 두 사람 말고는 주소를 알아도 못 엽니다.
--   · 용량은 그 라인의 보관 용량(기본 1GB + 추가 · 당겨 쓰기) 안에서 씁니다. 따로 돈을 받지 않습니다.
--   · 넣은 사람만 그 사진을 지우거나 설명을 고칠 수 있습니다.
--   · 라인을 끝내면(끊기) 앨범도 함께 사라집니다.
--
--   ⚠ 부름 Supabase → SQL Editor 에 통째로 붙여 Run 합니다. 다시 돌려도 안전합니다.
-- =====================================================================

create table if not exists public.nureum_album (
  id          uuid primary key default gen_random_uuid(),
  line_id     uuid not null references public.nureum_lines(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  path        text not null,
  thumb       text not null,
  bytes       bigint not null default 0,
  w           integer, h integer,
  caption     text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists nureum_album_line_idx on public.nureum_album(line_id, created_at desc);
alter table public.nureum_album enable row level security;
revoke all on public.nureum_album from anon, authenticated;
grant all on public.nureum_album to service_role;

-- 이 라인의 두 사람인가(끝난 라인은 아님) ------------------------------------------------
create or replace function public.nureum_album_member(p_line uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from nureum_sides s join nureum_lines l on l.id = s.line_id
                  where s.line_id = p_line and s.account_id = auth.uid() and l.ended_at is null and l.link_id is not null)
$$;

-- 보관 용량(MB) — 라인 화면과 같은 계산(nureum__usage) ------------------------------------
create or replace function public.nureum_album_cap_mb(p_line uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((nureum__usage(p_line)->>'storage_max_mb')::int, 1024)
$$;

-- 앨범 보기 -----------------------------------------------------------------------
create or replace function public.nureum_album_list(p_line uuid, p_before timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not nureum_album_member(p_line) then return jsonb_build_object('ok', false, 'error', 'not_member'); end if;
  return jsonb_build_object('ok', true,
    'used_mb', round(coalesce((select sum(bytes) from nureum_album where line_id = p_line), 0) / 1048576.0, 1),
    'max_mb', nureum_album_cap_mb(p_line),
    'count', (select count(*) from nureum_album where line_id = p_line),
    'photos', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'path', a.path, 'thumb', a.thumb, 'w', a.w, 'h', a.h,
                         'caption', a.caption, 'mine', a.user_id = auth.uid(), 'at', a.created_at) order by a.created_at desc)
                        from (select * from nureum_album where line_id = p_line and (p_before is null or created_at < p_before)
                               order by created_at desc limit 60) a), '[]'::jsonb));
end $$;

-- 넣기 (그림은 화면이 먼저 잠긴 보관함에 올리고, 여기서 확인하고 적습니다) --------------------
create or replace function public.nureum_album_add(p_line uuid, p_path text, p_thumb text, p_bytes bigint, p_w integer, p_h integer, p_caption text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_used bigint;
begin
  if not nureum_album_member(p_line) then return jsonb_build_object('ok', false, 'error', 'not_member'); end if;
  if split_part(coalesce(p_path, ''), '/', 1) <> p_line::text or split_part(coalesce(p_thumb, ''), '/', 1) <> p_line::text then
    return jsonb_build_object('ok', false, 'error', 'bad_path');
  end if;
  select coalesce(sum(bytes), 0) into v_used from nureum_album where line_id = p_line;
  if v_used + greatest(coalesce(p_bytes, 0), 0) > nureum_album_cap_mb(p_line)::bigint * 1048576 then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;
  insert into nureum_album (line_id, user_id, path, thumb, bytes, w, h, caption)
  values (p_line, auth.uid(), p_path, p_thumb, greatest(coalesce(p_bytes, 0), 0), p_w, p_h, left(coalesce(p_caption, ''), 200))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.nureum_album_caption(p_id uuid, p_caption text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update nureum_album set caption = left(coalesce(p_caption, ''), 200) where id = p_id and user_id = auth.uid();
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.nureum_album_delete(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v record;
begin
  delete from nureum_album where id = p_id and user_id = auth.uid() returning path, thumb into v;
  if v.path is null then return jsonb_build_object('ok', false, 'error', 'not_mine'); end if;
  return jsonb_build_object('ok', true, 'path', v.path, 'thumb', v.thumb);
end $$;

-- 잠긴 보관함: 그 라인의 두 사람만 보고 · 넣고, 넣은 사람만 지움 -------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nureum-album', 'nureum-album', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png'];
drop policy if exists nureum_album_read on storage.objects;
create policy nureum_album_read on storage.objects for select to authenticated
  using (bucket_id = 'nureum-album' and public.nureum_album_member(((storage.foldername(name))[1])::uuid));
drop policy if exists nureum_album_write on storage.objects;
create policy nureum_album_write on storage.objects for insert to authenticated
  with check (bucket_id = 'nureum-album' and public.nureum_album_member(((storage.foldername(name))[1])::uuid));
drop policy if exists nureum_album_del on storage.objects;
create policy nureum_album_del on storage.objects for delete to authenticated
  using (bucket_id = 'nureum-album' and owner = auth.uid());

-- 🔴 내 프로필 사진첩(별칭 갤러리)을 이 라인 상대에게 보일지 — 라인마다 따로 켜고 끕니다 ----------
--   별칭 하나를 여러 라인에서 같이 쓰므로, 연인에게만 보이고 다른 라인 상대에게는 숨길 수 있게 합니다.
alter table public.nureum_sides add column if not exists show_gallery boolean not null default true;

create or replace function public.nureum_set_gallery_open(p_line uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update nureum_sides set show_gallery = coalesce(p_on, true) where line_id = p_line and account_id = auth.uid();
  return jsonb_build_object('ok', found);
end $$;

-- 상대의 사진첩 — 상대가 이 라인에 보이기로 했을 때만 별칭 번호를 알려 줍니다
create or replace function public.nureum_peer_gallery(p_line uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l nureum_lines; v_peer uuid; v_open boolean; v_persona uuid; v_name text; v_mine boolean;
begin
  if not nureum_album_member(p_line) then return jsonb_build_object('ok', false, 'error', 'not_member'); end if;
  select * into l from nureum_lines where id = p_line;
  select account_id, show_gallery into v_peer, v_open from nureum_sides where line_id = p_line and account_id <> auth.uid() limit 1;
  select show_gallery into v_mine from nureum_sides where line_id = p_line and account_id = auth.uid();
  if v_peer is null then return jsonb_build_object('ok', true, 'open', false, 'my_open', coalesce(v_mine, true)); end if;
  select ls.persona_id, p.display_name into v_persona, v_name
    from link_sides ls left join personas p on p.id = ls.persona_id
   where ls.link_id = l.link_id and ls.account_id = v_peer limit 1;
  return jsonb_build_object('ok', true, 'open', coalesce(v_open, true), 'my_open', coalesce(v_mine, true),
    'persona_id', case when coalesce(v_open, true) then v_persona end, 'name', case when coalesce(v_open, true) then v_name end);
end $$;
revoke execute on function public.nureum_set_gallery_open(uuid, boolean) from public, anon;
revoke execute on function public.nureum_peer_gallery(uuid) from public, anon;
grant execute on function public.nureum_set_gallery_open(uuid, boolean) to authenticated;
grant execute on function public.nureum_peer_gallery(uuid) to authenticated;

-- 누가 부를 수 있나 ---------------------------------------------------------------
revoke execute on function public.nureum_album_cap_mb(uuid) from public, anon, authenticated;
revoke execute on function public.nureum_album_member(uuid) from public, anon;
grant execute on function public.nureum_album_member(uuid) to authenticated;   -- 보관함 지킴이가 씁니다
revoke execute on function public.nureum_album_list(uuid, timestamptz) from public, anon;
revoke execute on function public.nureum_album_add(uuid, text, text, bigint, integer, integer, text) from public, anon;
revoke execute on function public.nureum_album_caption(uuid, text) from public, anon;
revoke execute on function public.nureum_album_delete(uuid) from public, anon;
grant execute on function public.nureum_album_list(uuid, timestamptz) to authenticated;
grant execute on function public.nureum_album_add(uuid, text, text, bigint, integer, integer, text) to authenticated;
grant execute on function public.nureum_album_caption(uuid, text) to authenticated;
grant execute on function public.nureum_album_delete(uuid) to authenticated;

select 'nureum album ok' as result, (select count(*) from nureum_album) as photos;

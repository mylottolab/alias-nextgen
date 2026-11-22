-- =====================================================================
-- 누름 · 바로너 — 🎬 인사 영상 (2026-11-23)
--   라인(핫라인)마다 두 사람이 각자 "상대 화면에 나올 짧은 영상"을 하나씩 올립니다.
--   상대가 바탕화면 아이콘(위젯)을 눌러 내 화면을 열면, 맨 위에 내 인사 영상이 나옵니다.
--   · 영상은 잠긴 보관함(nureum-greet)에 "라인번호/올린사람-시각.확장자" 로 둡니다. 두 사람 말고는 못 엽니다.
--   · 한 사람당 라인마다 하나(새로 올리면 바뀜). 30MB · 30초 안쪽(초는 화면이 검사).
--   · 라인을 끊으면 기록도 함께 사라집니다.
--   ⚠ 부름 Supabase → SQL Editor 에 통째로 붙여 Run. 다시 돌려도 안전합니다. (7_nureum_album.sql 을 먼저 돌린 서버여야 합니다)
-- =====================================================================

create table if not exists public.nureum_greet (
  line_id    uuid not null references public.nureum_lines(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  path       text not null,
  mime       text not null default 'video/mp4',
  bytes      bigint not null default 0,
  secs       numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (line_id, user_id)
);
alter table public.nureum_greet enable row level security;
revoke all on public.nureum_greet from anon, authenticated;
grant all on public.nureum_greet to service_role;

-- 내 것 · 상대 것 ----------------------------------------------------------------------
create or replace function public.nureum_greet_get(p_line uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); m nureum_greet; p nureum_greet;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if not public.nureum_album_member(p_line) then return jsonb_build_object('ok', false, 'error', 'not_member'); end if;
  select * into m from nureum_greet where line_id = p_line and user_id = me;
  select * into p from nureum_greet where line_id = p_line and user_id <> me order by updated_at desc limit 1;
  return jsonb_build_object('ok', true,
    'mine', case when m.path is null then null else jsonb_build_object('path', m.path, 'mime', m.mime, 'secs', m.secs, 'at', m.updated_at) end,
    'peer', case when p.path is null then null else jsonb_build_object('path', p.path, 'mime', p.mime, 'secs', p.secs, 'at', p.updated_at) end);
end $$;

-- 올리기(바꾸기) — 예전 파일 주소를 돌려줘 화면이 지웁니다 ----------------------------------
create or replace function public.nureum_greet_set(p_line uuid, p_path text, p_mime text, p_bytes bigint, p_secs numeric)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); old text;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if not public.nureum_album_member(p_line) then return jsonb_build_object('ok', false, 'error', 'not_member'); end if;
  if p_path is null or p_path not like (p_line::text || '/' || me::text || '-%') then return jsonb_build_object('ok', false, 'error', 'bad_path'); end if;
  if coalesce(p_bytes, 0) > 31457280 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  if coalesce(p_secs, 0) > 31 then return jsonb_build_object('ok', false, 'error', 'too_long'); end if;
  select path into old from nureum_greet where line_id = p_line and user_id = me;
  insert into nureum_greet(line_id, user_id, path, mime, bytes, secs, updated_at)
  values (p_line, me, p_path, coalesce(p_mime, 'video/mp4'), coalesce(p_bytes, 0), coalesce(p_secs, 0), now())
  on conflict (line_id, user_id) do update set path = excluded.path, mime = excluded.mime, bytes = excluded.bytes, secs = excluded.secs, updated_at = now();
  return jsonb_build_object('ok', true, 'old', case when old is distinct from p_path then old end);
end $$;

-- 빼기 ------------------------------------------------------------------------------
create or replace function public.nureum_greet_clear(p_line uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); old text;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  delete from nureum_greet where line_id = p_line and user_id = me returning path into old;
  return jsonb_build_object('ok', true, 'old', old);
end $$;

revoke all on function public.nureum_greet_get(uuid), public.nureum_greet_set(uuid, text, text, bigint, numeric), public.nureum_greet_clear(uuid) from public, anon;
grant execute on function public.nureum_greet_get(uuid), public.nureum_greet_set(uuid, text, text, bigint, numeric), public.nureum_greet_clear(uuid) to authenticated;

-- 잠긴 보관함: 그 라인의 두 사람만 보고 · 넣고, 넣은 사람만 지움 ------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nureum-greet', 'nureum-greet', false, 31457280, array['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'])
on conflict (id) do update set public = false, file_size_limit = 31457280, allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'];
drop policy if exists nureum_greet_read on storage.objects;
create policy nureum_greet_read on storage.objects for select to authenticated
  using (bucket_id = 'nureum-greet' and public.nureum_album_member(((storage.foldername(name))[1])::uuid));
drop policy if exists nureum_greet_write on storage.objects;
create policy nureum_greet_write on storage.objects for insert to authenticated
  with check (bucket_id = 'nureum-greet' and public.nureum_album_member(((storage.foldername(name))[1])::uuid)
              and name like ((storage.foldername(name))[1] || '/' || auth.uid()::text || '-%'));
drop policy if exists nureum_greet_del on storage.objects;
create policy nureum_greet_del on storage.objects for delete to authenticated
  using (bucket_id = 'nureum-greet' and owner = auth.uid());

-- 확인: 아래가 3줄 나오면 됩니다
select proname from pg_proc where proname like 'nureum_greet_%' order by 1;

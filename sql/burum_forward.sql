-- =====================================================================
-- 부름 — 착신전환 (2026-11-21) · 부름 Supabase 에서 Run
--
--   「부름번호로 건 전화」만 넘깁니다. (서로 수락한 별칭 사이의 전화는 넘기지 않음 — 모르는 사람끼리 이어지지 않게)
--     · always   항상 — 내 부름번호를 다이얼로 누른 전화를 다른 부름번호로 바로
--     · noanswer 안 받을 때 — 부름번호로 이어진 사이에서 40초 안 받거나 거절하면 다른 부름번호로 이어서
--   · 넘긴 번호가 「모두 받기」가 아니고 아직 모르는 사이면, 전화 대신 연결 요청이 갑니다(부름번호 다이얼과 같음)
--   · 한 번만 넘김(넘긴 번호가 또 넘겨 두어도 거기서 멈춤). 문자는 넘기지 않음
--   새 표 burum_forward — 화면은 아래 함수로만 씁니다(표를 직접 못 읽고 못 씀)
--   다시 돌려도 안전합니다. 맨 아래 'burum forward ok'
-- =====================================================================

create table if not exists public.burum_forward (
  account_id uuid primary key references auth.users(id) on delete cascade,
  mode       text not null default 'off' check (mode in ('off', 'always', 'noanswer')),
  fwd_number text,
  updated_at timestamptz not null default now()
);
alter table public.burum_forward enable row level security;
revoke all on table public.burum_forward from anon, authenticated;
grant all on table public.burum_forward to service_role;

/* 설정 — 내 부름번호가 있어야 함. 넘길 곳은 남의 부름번호 */
create or replace function public.bn_set_forward(p_mode text, p_number text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); n text := regexp_replace(coalesce(p_number, ''), '[^0-9]', '', 'g'); b burum_numbers;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if coalesce(p_mode, '') not in ('off', 'always', 'noanswer') then return jsonb_build_object('ok', false, 'error', 'bad_mode'); end if;
  if p_mode = 'off' then
    insert into burum_forward(account_id, mode) values (me, 'off')
      on conflict (account_id) do update set mode = 'off', updated_at = now();
    return jsonb_build_object('ok', true, 'mode', 'off');
  end if;
  if not exists (select 1 from burum_numbers where account_id = me and status = 'active') then
    return jsonb_build_object('ok', false, 'error', 'no_number'); end if;
  select * into b from burum_numbers where number = n and status = 'active';
  if b.number is null then return jsonb_build_object('ok', false, 'error', 'none'); end if;
  if b.account_id = me then return jsonb_build_object('ok', false, 'error', 'self'); end if;
  insert into burum_forward(account_id, mode, fwd_number) values (me, p_mode, n)
    on conflict (account_id) do update set mode = excluded.mode, fwd_number = excluded.fwd_number, updated_at = now();
  return jsonb_build_object('ok', true, 'mode', p_mode, 'number', n);
end $$;

create or replace function public.bn_get_forward() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('mode', mode, 'number', fwd_number) from burum_forward where account_id = auth.uid()),
                  jsonb_build_object('mode', 'off', 'number', null))
$$;

/* 다이얼에서 「음성 · 영상」 으로 걸 때 — bn_dial 대신 이것을 부름. 「항상」 이면 넘긴 번호로 */
create or replace function public.bn_dial_call(p_number text, p_persona uuid default null, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); n text := regexp_replace(coalesce(p_number, ''), '[^0-9]', '', 'g');
        b burum_numbers; f burum_forward; t burum_numbers; r jsonb;
begin
  select * into b from burum_numbers where number = n and status = 'active';
  if b.number is not null and b.account_id <> me then
    select * into f from burum_forward where account_id = b.account_id and mode = 'always' and fwd_number is not null;
    if f.account_id is not null then
      select * into t from burum_numbers where number = f.fwd_number and status = 'active';
      if t.number is not null and t.account_id <> me and t.account_id <> b.account_id then
        r := bn_dial(t.number, p_persona, p_note);
        if coalesce((r->>'ok')::boolean, false) then r := r || jsonb_build_object('fwd_to', t.number, 'fwd_from', n); end if;
        return r;
      end if;
    end if;
  end if;
  return bn_dial(p_number, p_persona, p_note);
end $$;

/* 통화 화면 — 안 받음 · 거절 뒤. 이 사이가 「부름번호로 이어진 사이」 이고, 상대가 「안 받을 때」 로 넘겨 두었으면 */
create or replace function public.bn_forward_noanswer(p_link uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); o link_sides; f burum_forward; t burum_numbers; r jsonb;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  select os.* into o from link_sides ms join link_sides os on os.link_id = ms.link_id and os.account_id <> ms.account_id
   where ms.link_id = p_link and ms.account_id = me limit 1;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'none'); end if;
  /* 부름번호로 이어진 사이: 상대 쪽 별칭이 상대 부름번호의 별칭이거나, 부름번호 초대로 생긴 방 */
  if not exists (select 1 from burum_numbers where account_id = o.account_id and persona_id = o.persona_id and status = 'active')
     and not exists (select 1 from links l join invites i on i.id = l.via_invite_id where l.id = p_link and i.memo like '부름번호%') then
    return jsonb_build_object('ok', false, 'error', 'none'); end if;
  select * into f from burum_forward where account_id = o.account_id and mode = 'noanswer' and fwd_number is not null;
  if f.account_id is null then return jsonb_build_object('ok', false, 'error', 'none'); end if;
  select * into t from burum_numbers where number = f.fwd_number and status = 'active';
  if t.number is null or t.account_id in (me, o.account_id) then return jsonb_build_object('ok', false, 'error', 'none'); end if;
  /* 넘긴 번호가 「모두 받기」 가 아니고 모르는 사이면 — 몰래 연결 요청이 가지 않게 여기서 멈춤(음성사서함으로) */
  if t.mode <> 'all' and not exists (select 1 from link_sides a join link_sides c on c.link_id = a.link_id
                                      join links l on l.id = a.link_id and l.status = 'active'
                                     where a.account_id = me and c.account_id = t.account_id) then
    return jsonb_build_object('ok', false, 'error', 'none'); end if;
  r := bn_dial(t.number, null, null);
  if coalesce((r->>'ok')::boolean, false) and r->>'state' = 'linked' then
    return jsonb_build_object('ok', true, 'link_id', r->>'link_id', 'fwd_to', t.number);
  end if;
  return jsonb_build_object('ok', false, 'error', coalesce(r->>'state', r->>'error', 'none'));
end $$;

grant execute on function public.bn_set_forward(text, text), public.bn_get_forward(),
  public.bn_dial_call(text, uuid, text), public.bn_forward_noanswer(uuid) to authenticated;

select 'burum forward ok' as result;

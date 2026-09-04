// =====================================================================
// Alias Next-Gen — alias-message-send  (Edge Function)
// 2026-09-04 신설. 링크 하나에 메시지를 보냅니다.
//
// Aliascall 의 aliascall_hotline_message 를 이어받되 많이 줄였습니다.
//   빠진 것 — 개설자/참가자 구분, 익명 memberAnonId, 승인, tier, 만료
//   새 앱은 양쪽 다 로그인한 대등한 사이라 그 절반이 필요 없습니다.
//
// 🔴 방송 전에 구독을 기다립니다.
//   Aliascall 주석에 "2026-08-21에 겪었던 버그의 교훈"이라 적혀 있던 자리입니다.
//   구독이 끝나기 전에 send 하면 메시지가 조용히 사라집니다.
//
// ⚠ 지금은 글자만 받습니다. 파일은 4-2, 예약 발송은 4-3에서 붙입니다.
//   칸(media_path·scheduled_for)은 이미 표에 있으니 여기만 늘리면 됩니다.
//
// 배포:  Verify JWT 는 켜둔 채로 둡니다(로그인한 사람만 씁니다).
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

/* ── 열쇠 ────────────────────────────────────────────────────────────
   ⚠ 2026-09-04 — service_role 을 쓰지 않습니다.
     처음엔 service_role 로 짰는데 "permission denied for table link_sides" 가
     났습니다. SUPABASE_SERVICE_ROLE_KEY 자리에 anon 급 열쇠가 들어 있었고,
     anon 에는 표 권한을 하나도 안 줬기 때문입니다.

     열쇠를 찾아 고치는 대신 구조를 바꿨습니다. 손님의 토큰을 그대로 물려주면
     이 함수가 authenticated 로 돌고, 이미 만들어 둔 RLS 정책이 그대로 일합니다.
     함수가 실수해도 남의 대화를 못 봅니다. 이쪽이 더 안전합니다.

   ⚠ 3단계에서 푸시를 붙일 때는 "상대의 기기"를 읽어야 해서 그때는
     service_role 이 필요합니다. 그때 열쇠 문제를 제대로 풀면 됩니다.
------------------------------------------------------------------- */
const ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
  '';

/* 손님 자격으로 표를 다루는 클라이언트 */
function asUser(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  return createClient(SUPABASE_URL, ANON_KEY || auth.replace('Bearer ', ''), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/* 누구인지 — JWT 안의 sub 를 직접 읽습니다.
   Verify JWT 가 켜져 있어 게이트웨이가 이미 서명을 검사한 뒤라 안전합니다. */
function whoAmI(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  try {
    const payload = auth.replace('Bearer ', '').split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json.sub || null;
  } catch (_e) {
    return null;
  }
}

// ── 방송 ──────────────────────────────────────────────────────────
// 구독이 끝난 뒤에 보냅니다. 안 그러면 유실됩니다.
// deno-lint-ignore no-explicit-any
async function broadcast(db: any, linkId: string, payload: Record<string, unknown>) {
  await new Promise<void>((resolve) => {
    const channel = db.channel('link-' + linkId);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { db.removeChannel(channel); } catch (_e) { /* 이미 닫힘 */ }
      resolve();
    };
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'new-message', payload })
          .then(finish).catch(finish);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        finish();
      }
    });
    setTimeout(finish, 3000);   // 방송이 안 되더라도 저장은 이미 끝났습니다
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const { linkId, text } = await req.json();
    if (!linkId) return json({ error: 'link_required' }, 400);
    if (!text || !String(text).trim()) return json({ error: 'empty' }, 400);
    if (String(text).length > 4000) return json({ error: 'too_long' }, 400);

    const uid = whoAmI(req);
    if (!uid) return json({ error: 'not_logged_in' }, 401);

    const db = asUser(req);   // 손님 자격 — RLS가 알아서 막아줍니다

    // ── 내가 이 링크의 한쪽인지 ──
    // ⚠ service_role 은 RLS를 지나칩니다. 그래서 여기서 직접 확인해야 합니다.
    //   빠뜨리면 링크 번호만 알면 아무 대화에나 글을 넣을 수 있게 됩니다.
    // ⚠ link_sides 는 이제 "내 줄"만 읽힙니다(블록 19).
    //   상대 줄까지 읽으면 account_id 가 새어 나가 두 링크를 견줄 수 있게 됩니다.
    const { data: sides, error: sidesErr } = await db
      .from('link_sides')
      .select('id, link_id')
      .eq('link_id', linkId);
    if (sidesErr) return json({ error: 'read_failed', detail: sidesErr.message }, 500);

    const side = (sides || [])[0];
    if (!side) return json({ error: 'not_your_link' }, 403);

    const { data: link, error: linkErr } = await db
      .from('links').select('id, status').eq('id', linkId).maybeSingle();
    if (linkErr) return json({ error: 'read_failed', detail: linkErr.message }, 500);
    if (!link) return json({ error: 'link_not_found' }, 404);
    if (link.status !== 'active') return json({ error: 'link_closed' }, 410);

    // ── 저장 ──
    const nowIso = new Date().toISOString();
    const { data: msg, error: msgErr } = await db
      .from('messages')
      .insert({
        link_id: linkId,
        sender_side_id: side.id,
        message_type: 'text',
        content: String(text),
        sent_at: nowIso,       // 지금 보내는 것이라 바로 채웁니다(예약은 4-3)
      })
      .select('id, created_at, sent_at')
      .single();
    if (msgErr) return json({ error: 'save_failed', detail: msgErr.message }, 500);

    // 목록 정렬이 이 값을 봅니다.
    await db.from('links').update({ last_activity_at: nowIso }).eq('id', linkId);

    // ── 저장 즉시 방송 ──
    await broadcast(db, linkId, {
      id: msg.id,
      link_id: linkId,
      sender_side_id: side.id,
      message_type: 'text',
      content: String(text),
      sent_at: msg.sent_at,
      created_at: msg.created_at,
    });

    // ⚠ 3단계에서 여기에 푸시가 붙습니다.
    //    상대가 꺼져 있으면 devices 를 찾아 FCM/APNs 로 깨웁니다.
    // ⚠ 8단계 AI 부재중 비서도 이 자리입니다.

    return json({ ok: true, messageId: msg.id, sentAt: msg.sent_at });

  } catch (err) {
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});

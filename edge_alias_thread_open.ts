// =====================================================================
// Alias Next-Gen — alias-thread-open  (Edge Function)
// 2026-09-04 신설. 대화 화면에 들어갈 때 한 번에 필요한 것을 다 줍니다.
//
// 돌려주는 것
//   link      상태 · 연결 시각
//   me        내 쪽 (side id · 내가 보여주는 별칭 · 내가 부른 이름)
//   peer      상대 쪽 (상대가 쓰는 별칭 · 마지막으로 읽은 때)
//   messages  메시지 이력 (오래된 것부터)
//
// ⚠ 상대의 peer_label 은 절대 안 돌려줍니다. 그건 상대 혼자 보는 메모입니다.
//   인수인계서 2절 — "김철수 의뢰인 같은 메모가 손님에게 보이면 사고입니다."
//
// ⚠ 아직 안 나간 예약 메시지(sent_at is null)는 보낸 사람에게만 보입니다.
//
// 열 때 내 읽음 표시를 함께 갱신합니다. 화면이 따로 부를 필요가 없습니다.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const { linkId, markRead } = await req.json();
    if (!linkId) return json({ error: 'link_required' }, 400);

    const uid = whoAmI(req);
    if (!uid) return json({ error: 'not_logged_in' }, 401);

    const db = asUser(req);   // 손님 자격 — RLS가 알아서 막아줍니다

    // ⚠ 상대 정보는 link_view() 를 거칩니다. 표를 직접 읽으면 상대의
    //   account_id 가 딸려와서, 두 링크를 견줘보고 같은 사람인지 알아낼 수
    //   있게 됩니다. 이 제품의 핵심 약속이 깨지는 자리입니다(블록 19).
    const { data: viewRows, error: viewErr } = await db.rpc('link_view', { p_link_id: linkId });
    if (viewErr) return json({ error: 'read_failed', detail: viewErr.message }, 500);

    const v = (viewRows || [])[0];
    if (!v) return json({ error: 'not_your_link' }, 403);

    // 메시지 — 아직 안 나간 예약은 보낸 사람에게만
    const { data: rawMessages } = await db
      .from('messages')
      .select('id, sender_side_id, message_type, content, media_path, duration_ms, scheduled_for, sent_at, created_at')
      .eq('link_id', linkId)
      .order('created_at', { ascending: true })
      .limit(500);

    const messages = (rawMessages || []).filter(
      (m) => m.sent_at !== null || m.sender_side_id === v.my_side_id,
    );

    // 내 읽음 표시 갱신 — 화면이 따로 부를 필요가 없게 여기서 합니다
    if (markRead !== false) {
      await db.from('link_sides')
        .update({ last_read_at: new Date().toISOString() })
        .eq('id', v.my_side_id);
    }

    return json({
      ok: true,
      link: {
        id: v.link_id, status: v.status, createdAt: v.linked_at,
        preset: v.preset,
        // 방마다 다른 모양. 비어 있으면 화면이 내 기본을 씁니다(블록 21).
        themeMode: v.theme_mode, themeColor: v.theme_color,
        bubbleStyle: v.bubble_style, scene: v.scene,
        features: v.features,
      },
      me: {
        sideId: v.my_side_id,
        // 열기 전의 읽은 시각. 화면이 "여기부터 새 메시지" 선을 그리는 데 씁니다.
        lastReadAt: v.my_last_read_at,
        myFace: v.my_face,        // 내가 상대에게 보여주는 별칭
        peerLabel: v.peer_label,  // 내가 상대를 부르는 이름 (나만 봄)
        muted: v.muted,
        pinned: v.pinned,
      },
      peer: v.peer_side_id ? {
        sideId: v.peer_side_id,
        display: v.peer_display,          // 상대가 나에게 보여주는 별칭
        lastReadAt: v.peer_last_read_at,  // 읽음 표시를 그리는 데 씁니다
      } : null,
      messages,
    });

  } catch (err) {
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});

// =====================================================================
// Alias Next-Gen — alias-push-call Edge Function
// 2026-09-08 · FCM 3단계
//
// 하는 일은 하나입니다.
//   전화를 건 사람이 이 함수를 부르면, 상대 폰으로 알림을 쏩니다.
//   그러면 상대가 앱을 안 보고 있어도 잠금화면에 전화가 뜹니다.
//
// 순서
//   ① 부른 사람이 누구인지 확인한다 (로그인 토큰)
//   ② peer_push_tokens() 로 "이어져 있는 상대의 기기 번호" 를 받는다
//   ③ 구글에게 잠깐 쓸 출입증을 받는다
//   ④ 기기마다 알림을 쏜다
//
// 🔴 service_role 열쇠를 쓰지 않습니다.
//   peer_public_key 와 같은 방식으로, 부른 사람의 로그인 토큰 그대로
//   함수를 부릅니다. 그 함수 안에서 "정말 이어진 사이인가" 를 검사하므로,
//   남의 링크 번호를 넣어도 아무것도 안 나옵니다.
//
// ⚠ 죽은 기기 번호는 조용히 지웁니다. 앱을 지웠다 깔면 번호가 바뀌는데,
//   옛 번호를 그냥 두면 매번 헛되이 쏘게 됩니다.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

/* ── 구글 출입증 ─────────────────────────────────────────────────
   구글에 알림을 보내려면 한 시간짜리 출입증이 필요합니다.
   서비스 계정 열쇠로 서명한 쪽지를 내밀면 구글이 내어줍니다.
   ⚠ 매번 받으면 느립니다. 받아두고 55분 동안 다시 씁니다.
------------------------------------------------------------------ */
let cachedToken: string | null = null;
let cachedUntil = 0;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8', raw.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  );
}

async function getGoogleToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedUntil) return cachedToken;

  const enc = new TextEncoder();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned =
    b64url(enc.encode(JSON.stringify(header))) + '.' +
    b64url(enc.encode(JSON.stringify(claim)));

  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned));
  const jwt = unsigned + '.' + b64url(new Uint8Array(sig));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const out = await res.json();
  if (!out.access_token) {
    throw new Error('구글 출입증을 못 받았습니다: ' + JSON.stringify(out));
  }
  cachedToken = out.access_token;
  cachedUntil = now + 3300;   // 55분
  return cachedToken!;
}

/* ── 알림 한 대 쏘기 ───────────────────────────────────────────── */
async function sendOne(projectId: string, accessToken: string, token: string, payload: any) {
  const res = await fetch(
    'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: Object.assign({ token: token }, payload) }),
    },
  );
  const out = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, out: out };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: CORS });
  }

  try {
    /* ── ① 부른 사람 확인 ── */
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'not_logged_in' }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const linkId = body.linkId;
    if (!linkId) {
      return new Response(JSON.stringify({ error: 'linkId 가 필요합니다.' }), { status: 400, headers: CORS });
    }

    /* 부른 사람의 토큰 그대로 씁니다. 그래야 함수 안의 auth.uid() 가 그 사람이 됩니다. */
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });

    /* ── ② 상대 기기 번호 ── */
    const tk = await sb.rpc('peer_push_tokens', { p_link_id: linkId });
    if (tk.error) throw tk.error;

    const rows = (tk.data || []).filter((r: any) => r.push_token);
    if (!rows.length) {
      // 상대가 앱을 안 깔았거나 알림을 껐습니다. 잘못이 아닙니다.
      return new Response(JSON.stringify({ ok: true, sent: 0, note: 'no_devices' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    /* ── ③ 구글 출입증 ── */
    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 설정되지 않았습니다.');
    const sa = JSON.parse(raw);
    const accessToken = await getGoogleToken(sa);

    /* ── ④ 쏘기 ──
       ⚠ data 안의 값은 모두 글자여야 합니다. 숫자를 넣으면 구글이 거절합니다.
       ⚠ priority high 여야 잠금화면에서 폰이 깨어납니다. normal 이면
         배터리 절약 때문에 한참 뒤에 오거나 아예 안 옵니다. */
    const isCall = !!body.callId;

    /* 🔴 2026-09-09 신설 — 알림 거두기
       A 가 끊었을 때 부릅니다. 알림은 한 번 보내면 스스로 안 사라지므로,
       같은 표(tag) 로 조용한 알림을 덮어씌워 "부재중 전화" 로 바꿉니다.
       ⚠ 완전히 지우는 방법은 없습니다. 앱이 잠들어 있으면 지우라는 말을
         실행할 주체가 없기 때문입니다. 그래서 "덮어쓰기" 로 합니다. */
    const cancel = !!body.cancel;

    const title = body.title || (cancel
      ? '부재중 전화'
      : (isCall ? '전화가 왔습니다' : '새 메시지'));
    const bodyText = body.body || (cancel
      ? '전화가 끊어졌습니다'
      : (body.who ? body.who : 'Alias'));

    const payload = {
      notification: { title: title, body: bodyText },
      data: {
        kind: cancel ? 'missed' : (isCall ? 'call' : 'message'),
        link_id: String(linkId),
        call_id: String(body.callId || ''),
        session_token: cancel ? '' : String(body.sessionToken || ''),
        call_type: String(body.callType || 'voice'),
      },
      android: {
        /* 거둘 때는 조용히. 소리도 진동도 안 냅니다. */
        priority: cancel ? 'NORMAL' : 'HIGH',
        notification: {
          sound: cancel ? '' : 'default',
          channel_id: cancel ? 'silent' : (isCall ? 'calls' : 'messages'),
          /* 표가 같아야 앞의 알림을 덮어씁니다. 이게 핵심입니다. */
          tag: isCall ? ('call-' + String(body.callId || linkId)) : ('msg-' + String(linkId)),
          notification_priority: cancel ? 'PRIORITY_LOW' : 'PRIORITY_MAX',
        },
      },
    };

    const results: any[] = [];
    let sent = 0;
    const dead: string[] = [];

    for (const r of rows) {
      const out = await sendOne(sa.project_id, accessToken, r.push_token, payload);
      if (out.ok) {
        sent++;
      } else {
        /* 죽은 번호는 표에서 지워둡니다. 앱을 지웠다 깔면 번호가 바뀝니다. */
        const code = out.out && out.out.error && out.out.error.status;
        if (code === 'NOT_FOUND' || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') {
          dead.push(r.push_token);
        }
      }
      results.push({ ok: out.ok, status: out.status, err: out.ok ? null : out.out });
    }

    if (dead.length) {
      /* ⚠ 여기는 부른 사람의 권한으로는 못 지웁니다(남의 줄이라서).
         지우지 못해도 알림 자체는 나갔으니 조용히 넘어갑니다.
         쌓이면 나중에 sweep 으로 정리합니다. */
      console.log('[push] 죽은 번호 ' + dead.length + '개');
    }

    return new Response(JSON.stringify({ ok: true, sent: sent, tried: rows.length, results: results }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    // ⚠ 오류를 뭉뚱그리면 원인을 못 찾습니다. 그대로 보여줍니다.
    console.error('[alias-push-call] 오류:', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

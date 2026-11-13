// =====================================================================
// 안심 긴급 — sos-alert Edge Function (부름 서버 · 2026-11-14)
//   이용자가 긴급 버튼을 누르면 → 연결된 보호자 휴대폰을 모두 울립니다.
//   보호자가 「확인」·「끝」을 누르면 → 이용자와 나머지 보호자에게 알립니다.
//
//   부르는 법 (앱 화면이 부릅니다)
//     POST /functions/v1/sos-alert   { eventId, kind: 'sos' | 'ack' | 'end' }
//     로그인 토큰 그대로 → sos_push_targets() 가 "정말 그 긴급의 이용자 · 보호자인가" 를 검사합니다.
//
//   안드로이드
//     · 새 앱(긴급 벨을 직접 울리는 판, devices.sos_caps = 'sos') → data 만 보내 앱이 전체 화면 경보를 띄웁니다.
//     · 옛 앱 → 보통 알림(소리 · 진동 · 높은 우선순위)으로 보냅니다. 누르면 긴급 화면이 열립니다.
//   아이폰
//     · 보통 알림(소리 · 「시간 민감」). 애플이 「긴급 알림(Critical Alerts)」을 허가해 주면
//       Secrets 에 SOS_IOS_CRITICAL = 1 을 넣으세요 → 무음 · 방해금지에서도 울립니다.
//   비밀값: FIREBASE_SERVICE_ACCOUNT (alias-push-call 과 같은 것 — 이미 들어 있음)
//   ⚠ 보호자 전화번호는 쓰지 않습니다(서버에 없음). 앱 계정의 기기 번호로만 보냅니다.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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
    /* 🔴 2026-09-15 — 열쇠가 잘못됐을 때 여기서 걸립니다.
       구글이 준 이유를 그대로 남깁니다. */
    console.error('[push] 🔴 구글 출입증 실패:', JSON.stringify(out));
    throw new Error('구글 출입증을 못 받았습니다: ' + JSON.stringify(out));
  }
  console.log('[push] 구글 출입증 받았습니다');
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

  /* 🔴 2026-09-15 — 답을 반드시 남깁니다.
     기기 번호는 앞 12자만 남깁니다. 통째로 남기면 로그가 지저분하고,
     그 자체가 남의 폰을 가리키는 값이라 굳이 다 적을 필요가 없습니다. */
  const head = String(token).slice(0, 12) + '…';
  if (res.ok) {
    console.log('[push] ✓ 보냈습니다 (' + head + ')');
  } else {
    console.error('[push] 🔴 거절당했습니다 (' + head + ') 코드 ' + res.status +
      ' — ' + JSON.stringify(out).slice(0, 400));
  }
  return { ok: res.ok, status: res.status, out: out };
}

function isVoipToken(r: any): boolean {
  const t = String(r && r.push_token || '');
  return /^[0-9a-f]{64,200}$/i.test(t) || (r && r.platform === 'ios_voip');
}

function texts(kind: string, role: string, label: string, test: boolean) {
  const who = label || '가족';
  if (kind === 'sos') {
    return test
      ? { title: '🔔 [시험] ' + who + '님의 안심 긴급 시험 신호', body: '눌러서 「확인했어요」를 눌러 주세요. 실제 긴급이 아닙니다.' }
      : { title: '🆘 ' + who + '님이 긴급 도움을 요청했습니다', body: '지금 눌러서 위치를 확인하세요. 위급하면 119에 먼저 신고하세요.' };
  }
  if (kind === 'ack') {
    return role === 'owner'
      ? { title: '✅ ' + who + '님이 확인했습니다', body: '보호자가 긴급 신호를 확인했습니다.' }
      : { title: '✅ ' + who + '님 긴급 — 다른 보호자가 확인했습니다', body: '눌러서 상황을 함께 보세요.' };
  }
  return { title: '긴급 상황이 끝났습니다', body: (role === 'owner' ? '보호자가 긴급을 끝냈습니다.' : who + '님 긴급이 끝났습니다.') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'not_logged_in' }, 401);
    const body = await req.json().catch(() => ({}));
    const eventId = String(body.eventId || '');
    const kind = ['sos', 'ack', 'end'].includes(body.kind) ? body.kind : '';
    if (!/^[0-9a-f-]{36}$/i.test(eventId) || !kind) return json({ error: 'bad_request' }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const v = await sb.rpc('sos_view', { p_event: eventId });
    if (v.error || !v.data || !v.data.ok) return json({ error: 'not_mine' }, 403);
    const test = !!v.data.test;

    const tk = await sb.rpc('sos_push_targets', { p_event: eventId, p_kind: kind });
    if (tk.error) { console.error('[sos] 🔴 대상 읽기 실패', JSON.stringify(tk.error)); return json({ error: 'targets' }, 500); }
    const rows = (tk.data || []).filter((r: any) => r.push_token && !isVoipToken(r));
    console.log('[sos] ' + kind + (test ? '(시험)' : '') + ' → 기기 ' + rows.length + '대');
    if (!rows.length) return json({ ok: true, sent: 0, note: 'no_devices' });

    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 없습니다');
    const sa = JSON.parse(raw);
    const accessToken = await getGoogleToken(sa);
    const critical = Deno.env.get('SOS_IOS_CRITICAL') === '1' && kind === 'sos' && !test;

    let sent = 0;
    const results: any[] = [];
    for (const r of rows) {
      const t = texts(kind, r.role, r.label, test);
      const data: Record<string, string> = {
        kind: 'sos_' + kind, event_id: eventId, test: test ? '1' : '0',
        who: String(r.label || ''), title: t.title, body: t.body,
      };
      const loud = kind === 'sos';
      const isAndroid = String(r.platform || '').indexOf('ios') !== 0;
      let payload: any;
      if (isAndroid && r.caps === 'sos') {
        /* 새 앱: data 만 → 앱(자바)이 긴급 벨 · 전체 화면을 직접 띄웁니다 */
        payload = { data, android: { priority: 'HIGH', ttl: '600s' } };
      } else {
        payload = {
          notification: { title: t.title, body: t.body },
          data,
          android: {
            priority: 'HIGH', ttl: '600s',
            notification: { channel_id: loud ? 'sos' : 'messages', sound: 'default', tag: 'sos-' + eventId + '-' + kind,
                            notification_priority: loud ? 'PRIORITY_MAX' : 'PRIORITY_HIGH', default_vibrate_timings: true,
                            visibility: 'PUBLIC' },
          },
          apns: {
            headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
            payload: { aps: {
              sound: critical ? { critical: 1, name: 'default', volume: 1.0 } : 'default',
              'interruption-level': critical ? 'critical' : (loud ? 'time-sensitive' : 'active'),
              'thread-id': 'sos-' + eventId,
            } },
          },
        };
      }
      const o = await sendOne(sa.project_id, accessToken, r.push_token, payload);
      if (o.ok) sent++;
      results.push({ ok: o.ok, status: o.status });
    }
    console.log('[sos] 끝: ' + sent + '/' + rows.length);
    return json({ ok: true, sent, tried: rows.length });
  } catch (err) {
    console.error('[sos-alert] 🔴', err);
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});

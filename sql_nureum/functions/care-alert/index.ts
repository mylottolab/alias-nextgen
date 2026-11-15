// =====================================================================
// 🛡 안심 더하기 — care-alert Edge Function (부름 서버 · 2026-11-15)
//   「가족 확인」 · 「무소식 알림」 알림을 보냅니다. 안심 긴급(sos-alert)과 같은 기기 번호 · 비밀값을 씁니다.
//
//   두 가지로 불립니다
//   ① 앱이 부를 때 (이용자 · 보호자 로그인 토큰)
//        POST /functions/v1/care-alert  { eventId, kind: 'verify' | 'ack' | 'nosign_ok' }
//        → care_push_targets() 가 「정말 그 건의 이용자 · 보호자인가」를 검사합니다.
//   ② 10분마다 시계가 부를 때 (13_care_cron.sql 의 pg_cron)
//        POST /functions/v1/care-alert  { cron: true }   머리글 x-care-secret: <CARE_CRON_SECRET>
//        → care_due() 로 할 일을 받아 「괜찮으세요?」(이용자) · 「무소식 알림」(보호자)을 보냅니다.
//
//   ⚠ 이 함수는 Verify JWT 를 끄고 배포합니다(시계는 로그인 토큰이 없어서).
//      그래도 ①은 로그인 토큰이 없거나 틀리면 아무것도 못 합니다(서버 함수가 auth.uid 로 검사).
//      ②는 비밀값 CARE_CRON_SECRET 이 맞아야만 움직입니다.
//   비밀값: FIREBASE_SERVICE_ACCOUNT (이미 있음) · CARE_CRON_SECRET (새로 — 아무 긴 글자)
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

const REASON: Record<string, string> = {
  '기관 사칭 전화': '「검찰 · 경찰 · 금감원」이라는 전화를 받았대요',
  '송금 · 앱 설치 요구': '돈을 보내라 · 앱을 깔라는 요구를 받았대요',
  '가족 사칭 연락': '가족이라며 급히 돈을 달라는 연락을 받았대요',
  '이상한 전화 · 문자': '이상한 전화나 문자를 받았대요',
};

function texts(kind: string, role: string, label: string, ev: any) {
  const parts = String(label || '').split('|');
  const who = parts[0] || '가족';
  if (kind === 'verify') {
    return { title: '📞 ' + who + '님이 확인을 부탁했어요', body: (REASON[ev.reason] || '확인을 부탁했어요') + '. 지금 직접 전화해 주세요. 돈을 보내지 말라고 해 주세요.' };
  }
  if (kind === 'ack') {
    if (role === 'owner') return { title: '✅ ' + who + '님이 곧 전화합니다', body: '그 전화는 끊고 기다려 주세요. 돈을 보내거나 앱을 깔지 마세요.' };
    return { title: '✅ ' + who + '님 확인 요청 — ' + (parts[1] || '다른 보호자') + '님이 전화하기로 했어요', body: '눌러서 함께 보세요.' };
  }
  if (kind === 'ask') {
    return { title: '🌙 괜찮으세요?', body: '휴대폰이 ' + (ev.hours || 12) + '시간 동안 조용했어요. 이 알림을 눌러 주시면 보호자에게 알리지 않아요.' };
  }
  if (kind === 'alert') {
    return { title: '🌙 ' + who + '님 휴대폰이 ' + (ev.hours || 12) + '시간 넘게 조용해요', body: '안부 전화를 한번 드려 보세요. 휴대폰이 꺼졌거나 배터리가 다 됐을 수도 있어요. 위급 신호가 아닌 자동 안부 알림입니다.' };
  }
  return { title: '✅ ' + who + '님이 휴대폰을 다시 쓰셨어요', body: '무소식 알림이 풀렸습니다.' };
}

async function sendAll(rows: any[], kind: string, eventId: string, ev: any) {
  rows = rows.filter((r: any) => r.push_token && !isVoipToken(r));
  if (!rows.length) return 0;
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 없습니다');
  const sa = JSON.parse(raw);
  const accessToken = await getGoogleToken(sa);
  const loud = kind === 'verify' || kind === 'alert';
  let sent = 0;
  for (const r of rows) {
    const t = texts(kind, r.role, r.label, ev);
    const data: Record<string, string> = { kind: 'care_' + kind, event_id: eventId, title: t.title, body: t.body };
    const o = await sendOne(sa.project_id, accessToken, r.push_token, {
      notification: { title: t.title, body: t.body },
      data,
      android: { priority: 'HIGH', ttl: '3600s', notification: { channel_id: 'messages', sound: 'default', tag: 'care-' + eventId + '-' + kind,
                 notification_priority: loud ? 'PRIORITY_MAX' : 'PRIORITY_HIGH', default_vibrate_timings: true, visibility: 'PUBLIC' } },
      apns: { headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
              payload: { aps: { sound: 'default', 'interruption-level': loud ? 'time-sensitive' : 'active', 'thread-id': 'care-' + eventId } } },
    });
    if (o.ok) sent++;
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const body = await req.json().catch(() => ({}));

    /* ② 시계 모드 */
    if (body.cron) {
      const secret = Deno.env.get('CARE_CRON_SECRET') || '';
      if (!secret || req.headers.get('x-care-secret') !== secret) return json({ error: 'forbidden' }, 403);
      const admin = createClient(SUPABASE_URL, SERVICE);
      const due = await admin.rpc('care_due');
      if (due.error) { console.error('[care] 🔴 care_due', JSON.stringify(due.error)); return json({ error: 'due' }, 500); }
      let sent = 0;
      for (const d of (due.data || [])) {
        const tk = await admin.rpc('care_cron_targets', { p_event: d.event_id, p_action: d.action });
        if (tk.error) { console.error('[care] 🔴 targets', JSON.stringify(tk.error)); continue; }
        sent += await sendAll(tk.data || [], d.action, d.event_id, { hours: d.hours });
      }
      console.log('[care] 시계: 할 일 ' + (due.data || []).length + '건 · 알림 ' + sent + '대');
      return json({ ok: true, jobs: (due.data || []).length, sent });
    }

    /* ① 앱 모드 */
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'not_logged_in' }, 401);
    const eventId = String(body.eventId || '');
    const kind = ['verify', 'ack', 'nosign_ok'].includes(body.kind) ? body.kind : '';
    if (!/^[0-9a-f-]{36}$/i.test(eventId) || !kind) return json({ error: 'bad_request' }, 400);
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const v = await sb.rpc('care_view', { p_event: eventId });
    if (v.error || !v.data || !v.data.ok) return json({ error: 'not_mine' }, 403);
    const tk = await sb.rpc('care_push_targets', { p_event: eventId, p_kind: kind });
    if (tk.error) { console.error('[care] 🔴 대상 읽기 실패', JSON.stringify(tk.error)); return json({ error: 'targets' }, 500); }
    const sent = await sendAll(tk.data || [], kind, eventId, v.data);
    console.log('[care] ' + kind + ' → ' + sent + '대');
    return json({ ok: true, sent, tried: (tk.data || []).length });
  } catch (err) {
    console.error('[care-alert] 🔴', err);
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});

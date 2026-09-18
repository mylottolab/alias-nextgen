// =====================================================================
// Alias Next-Gen — alias-sweep
// 2026-09-19
//
// 날마다 한 번(새벽 4시) pg_cron 이 부릅니다.
//
// 하는 일 셋
//   ① 곧 지워질 녹음을 손님께 알립니다 (7일 전 · 3일 전)
//   ② 기한이 지난 녹음을 지웁니다 (표 + 서랍)
//   ③ 이용권이 끝나고 오래된 갤러리를 지웁니다
//
// 🔴 왜 알리고 지우나
//   말없이 지우면 **손님이 잃은 줄도 모릅니다.** 미리 알리고 내려받을
//   기회를 드려야 90일이 야박하지 않습니다.
//
// ⚠ 지우는 일은 되돌릴 수 없습니다. 그래서 **표를 지우면서 파일 경로를
//   돌려받아** 그것만 서랍에서 지웁니다. 표를 먼저 지워버리면 경로를
//   잃어 아무도 모르는 파일이 서랍에 영원히 남습니다.
//
// ⚠ 이 함수는 손님이 부르는 것이 아닙니다. Verify JWT 를 켜두고,
//   pg_cron 이 service_role 열쇠로 부릅니다.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const FUNCTIONS_BASE = Deno.env.get('SUPABASE_URL')!
  .replace('.supabase.co', '.supabase.co/functions/v1');

/* 한 사람에게 알림 하나를 보냅니다.
   ⚠ 이미 있는 푸시 함수를 쓰지 않습니다. 그건 "이어진 상대에게" 보내는
     것이고, 이건 **본인에게** 보내는 것이라 길이 다릅니다. */
async function notifyOne(accountId: string, title: string, body: string) {
  try {
    const dev = await supabase.from('devices')
      .select('push_token').eq('account_id', accountId)
      .not('push_token', 'is', null);
    const tokens = (dev.data || []).map((d: any) => d.push_token).filter(Boolean);
    if (!tokens.length) return 0;

    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) { console.error('[sweep] FIREBASE_SERVICE_ACCOUNT 가 없습니다'); return 0; }
    const sa = JSON.parse(raw);
    const token = await googleToken(sa);

    let sent = 0;
    for (const t of tokens) {
      const res = await fetch(
        'https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send',
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token: t,
              notification: { title, body },
              data: { kind: 'expiring' },       // 누르면 통화기록으로
              android: { priority: 'NORMAL', notification: { channel_id: 'messages' } },
            },
          }),
        },
      );
      if (res.ok) sent++;
      else console.warn('[sweep] 알림 거절:', res.status, (await res.text()).slice(0, 160));
    }
    return sent;
  } catch (e) {
    console.error('[sweep] 알림 실패:', e);
    return 0;
  }
}

/* 구글 출입증 — alias-push-call 과 같은 방식입니다. */
let cachedToken: string | null = null;
let cachedUntil = 0;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedUntil) return cachedToken;

  const enc = new TextEncoder();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  };
  const unsigned = b64url(enc.encode(JSON.stringify(header))) + '.' +
                   b64url(enc.encode(JSON.stringify(claim)));

  const body = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', raw.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
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
  if (!out.access_token) throw new Error('구글 출입증 실패: ' + JSON.stringify(out));
  cachedToken = out.access_token;
  cachedUntil = now + 3300;
  return cachedToken!;
}

Deno.serve(async (_req) => {
  const report: any = { warned: 0, recordsPurged: 0, galleryPurged: 0, errors: [] };

  /* ── ① 곧 지워질 것을 알립니다 ───────────────────────────── */
  try {
    const w = await supabase.rpc('records_to_warn');
    if (w.error) throw w.error;

    /* 한 사람에게 여러 건이면 **한 번만** 알립니다.
       ⚠ 건마다 알리면 알림이 쏟아져 오히려 안 봅니다. */
    const byUser: Record<string, { ids: string[]; min: number; stage: number }> = {};
    for (const r of (w.data || [])) {
      const u = r.account_id;
      if (!byUser[u]) byUser[u] = { ids: [], min: 999, stage: r.stage };
      byUser[u].ids.push(r.record_id);
      if (r.days_left < byUser[u].min) byUser[u].min = r.days_left;
      if (r.stage < byUser[u].stage) byUser[u].stage = r.stage;
    }

    for (const uid of Object.keys(byUser)) {
      const g = byUser[uid];
      const n = g.ids.length;
      const title = '녹음이 곧 지워집니다';
      const body = n > 1
        ? `녹음 ${n}건이 ${g.min}일 뒤 지워집니다. 필요하시면 폰에 받아두세요.`
        : `녹음이 ${g.min}일 뒤 지워집니다. 필요하시면 폰에 받아두세요.`;
      const sent = await notifyOne(uid, title, body);
      if (sent) {
        report.warned += n;
        await supabase.rpc('mark_warned', { p_ids: g.ids, p_stage: g.stage });
      }
    }
  } catch (e) {
    console.error('[sweep] 알리기 실패:', e);
    report.errors.push('warn: ' + String((e as Error).message ?? e));
  }

  /* ── ② 기한이 지난 녹음을 지웁니다 ───────────────────────── */
  try {
    const p = await supabase.rpc('purge_records');
    if (p.error) throw p.error;
    const rows = p.data || [];
    if (rows.length) {
      const paths = rows.map((r: any) => r.path).filter(Boolean);
      /* ⚠ 서랍에서 지우다 실패해도 표는 이미 지워졌습니다.
         그러면 아무도 모르는 파일이 남습니다. 로그를 크게 남깁니다. */
      const del = await supabase.storage.from('alias-records').remove(paths);
      if (del.error) {
        console.error('[sweep] 🔴 파일을 못 지웠습니다. 서랍에 남습니다:',
          paths.join(', '), del.error.message);
        report.errors.push('files: ' + del.error.message);
      }
      report.recordsPurged = rows.length;
    }
  } catch (e) {
    console.error('[sweep] 녹음 지우기 실패:', e);
    report.errors.push('records: ' + String((e as Error).message ?? e));
  }

  /* ── ③ 이용권이 끝나고 오래된 갤러리 ─────────────────────── */
  try {
    const g = await supabase.rpc('purge_gallery');
    if (g.error) throw g.error;
    const rows = g.data || [];
    if (rows.length) {
      const paths = rows.map((r: any) => r.path).filter(Boolean);
      const del = await supabase.storage.from('alias-gallery').remove(paths);
      if (del.error) {
        console.error('[sweep] 🔴 갤러리 파일을 못 지웠습니다:', del.error.message);
        report.errors.push('gallery files: ' + del.error.message);
      }
      report.galleryPurged = rows.length;
    }
  } catch (e) {
    console.error('[sweep] 갤러리 지우기 실패:', e);
    report.errors.push('gallery: ' + String((e as Error).message ?? e));
  }

  console.log('[sweep] 끝:', JSON.stringify(report));
  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json' },
  });
});

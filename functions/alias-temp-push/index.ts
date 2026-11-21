/* =====================================================================
   부름 — alias-temp-push
   2026-09-30 신설 · 1회용 임시연락처

   하는 일은 하나입니다.
     받는 분(계정 없음)이 임시 대화에 문자를 보내면, DB(temp_notify_owner)가
     주인의 기기 번호를 모아 이 함수를 부릅니다. 이 함수는 그 번호로 알림을 쏩니다.

   🔴 이 함수는 DB 를 읽지 않습니다. 기기 번호는 DB 가 넘겨줍니다.
     그래서 service_role 열쇠가 필요 없습니다(alias-message-send 의 열쇠 문제를 피함).
   🔴 아무나 부르지 못하게 x-temp-key 를 확인합니다.
     DB 의 temp_push_key() 와 Secrets 의 TEMP_PUSH_KEY 가 똑같아야 합니다.
   ⚠ Verify JWT 를 **끕니다**. DB 가 로그인 토큰 없이 부르기 때문입니다(부름 함정 138).
   ⚠ FCM 을 쏘는 방식은 alias-push-call 과 같습니다(FIREBASE_SERVICE_ACCOUNT · messages 채널).

   🔴 2026-10-01 — 일반 메시지 알림도 이 함수가 보냅니다(kind: 'message').
     DB 트리거(msg_notify_peer)가 받는 쪽 기기 번호 · 제목 · 내용을 다 만들어 넘깁니다.
     같은 대화의 알림은 tag 로 하나로 겹쳐, 알림창이 대화마다 한 줄만 남습니다.

   🔴 2026-11-22 — 알림에서 바로 [읽음] [답장]
     메시지 알림마다 qr_targets() 로 받는 사람의 대화 자리를 알아내 1회용 답장 열쇠(7일)를 만듭니다.
     · 새 안드로이드 앱(devices.caps 에 qr1) → data 만 보내고, 앱이 위에 뜨는 알림 + [읽음] [답장] 을 직접 만듭니다
     · 아이폰 → 같은 알림에 category 'QR' 과 열쇠를 실어 보냅니다(새 앱이 [답장] 칸을 붙임, 옛 앱은 그냥 무시)
     · 옛 안드로이드 앱 · 잠긴 방 · qr_targets 가 없으면 → 예전과 똑같이 보냅니다
     답장은 alias-quick-reply 가 받습니다. 비밀값은 새로 없습니다(TEMP_PUSH_KEY 로 서명).
   ===================================================================== */

function b64urlStr(s: string): string { return b64url(new TextEncoder().encode(s)); }
async function qrToken(side: string, link: string, key: string): Promise<string> {
  const body = b64urlStr(side + '|' + link + '|' + String(Math.floor(Date.now() / 1000) + 7 * 86400));
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('qr1|' + body)));
  return body + '.' + b64url(sig);
}
async function qrTargets(linkId: string, tokens: string[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
    const r = await fetch(url + '/rest/v1/rpc/qr_targets', { method: 'POST',
      headers: { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: Deno.env.get('TEMP_PUSH_KEY') || '', p_link: linkId, p_tokens: tokens }) });
    if (!r.ok) { console.warn('[msg-push] qr_targets 없음(' + r.status + ') — 예전 알림으로'); return out; }
    for (const x of (await r.json()) || []) out[x.token] = x;
  } catch (e) { console.warn('[msg-push] qr_targets 실패 — 예전 알림으로', String(e)); }
  return out;
}

let cachedToken: string | null = null;
let cachedUntil = 0;

function b64url(bytes: Uint8Array): string {
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedUntil) return cachedToken;
  const enc = new TextEncoder();
  const claim = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
                  aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const unsigned = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))) + '.' + b64url(enc.encode(JSON.stringify(claim)));
  const body = sa.private_key.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', raw.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + b64url(new Uint8Array(sig)) }),
  });
  const out = await res.json();
  if (!out.access_token) { console.error('[temp-push] 🔴 구글 출입증 실패:', JSON.stringify(out)); throw new Error('google_token'); }
  cachedToken = out.access_token; cachedUntil = now + 3300;
  return cachedToken!;
}

function keyOk(req: Request): boolean {
  const want = Deno.env.get('TEMP_PUSH_KEY') || '';
  const got = req.headers.get('x-temp-key') || '';
  if (!want) { console.error('[temp-push] 🔴 TEMP_PUSH_KEY 비밀값이 없습니다'); return false; }
  let diff = want.length ^ got.length;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ (got.charCodeAt(i) || 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (!keyOk(req)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 401 });
  try {
    const b = await req.json();
    const tokens: string[] = Array.isArray(b.tokens)
      ? b.tokens.filter((t: string) => t && !/^[0-9a-f]{64,200}$/i.test(String(t))).slice(0, 30)   // 🔴 2026-10-10 아이폰 전화용 번호는 빼기
      : [];
    if (!tokens.length) return new Response(JSON.stringify({ ok: true, sent: 0 }));

    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 가 없습니다');
    const sa = JSON.parse(raw);
    const at = await googleToken(sa);

    /* 알림 문구 — 이름표는 주인만 보는 것이라 주인 폰에는 보여줘도 됩니다.
       ⚠ data 안의 값은 모두 글자여야 합니다(숫자면 구글이 거절). */
    /* 🔴 2026-10-07 닉네임 연결 요청 — 누르면 받은 요청 화면 */
    if (b.kind === 'request') {
      const rp = {
        notification: { title: String(b.title || '연결 요청').slice(0, 40), body: String(b.preview || '').slice(0, 120) },
        data: { kind: 'request', url: 'alias_requests.html' },
        android: { priority: 'HIGH', notification: { sound: 'default', channel_id: 'messages',
                   tag: 'nick-request', notification_priority: 'PRIORITY_HIGH' } },
        apns: { headers: { 'apns-priority': '10', 'apns-push-type': 'alert' }, payload: { aps: { alert: { title: String(b.title || '연결 요청').slice(0, 40), body: String(b.preview || '').slice(0, 120) }, sound: 'default', 'thread-id': 'nick-request' } } },   // 🔴 2026-10-10 아이폰 — 소리
      };
      let rs = 0;
      for (const t of tokens) {
        const r = await fetch('https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send', {
          method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: Object.assign({ token: t }, rp) }),
        });
        if (r.ok) rs++; else console.error('[req-push] 🔴 거절 ' + r.status + ' — ' + (await r.text()).slice(0, 200));
      }
      return new Response(JSON.stringify({ ok: true, sent: rs }), { headers: { 'Content-Type': 'application/json' } });
    }

    /* 🔴 2026-10-01 일반 메시지 */
    if (b.kind === 'message') {
      const linkId = String(b.linkId || '');
      const title = String(b.title || '부름').slice(0, 40), preview = String(b.preview || '새 메시지가 왔습니다').slice(0, 120);
      const url = 'alias_chat.html?link=' + linkId + (b.bridged ? '&bridged=1' : '');
      const mp = {
        notification: { title: title, body: preview },
        data: { kind: 'message', link_id: linkId, url: url },   // 🔴 bridged — 연결 안내 띠
        android: { priority: 'HIGH', notification: { sound: 'default', channel_id: 'messages',
                   tag: 'link-' + linkId, notification_priority: 'PRIORITY_HIGH' } },
        apns: { headers: { 'apns-priority': '10', 'apns-push-type': 'alert' }, payload: { aps: { alert: { title: title, body: preview }, sound: 'default', 'thread-id': 'link-' + linkId } } },   // 🔴 2026-10-10 아이폰 — 소리 · 대화별로 묶기
      };
      const TG = await qrTargets(linkId, tokens);
      const QR_URL = (Deno.env.get('SUPABASE_URL') || '') + '/functions/v1/alias-quick-reply';
      const KEY = Deno.env.get('TEMP_PUSH_KEY') || '';
      let ms = 0;
      for (const t of tokens) {
        const g = TG[t];
        let m: any = mp;
        if (g && g.side_id && g.can_reply && KEY) {
          const qr = await qrToken(String(g.side_id), linkId, KEY);
          if (String(g.caps || '').indexOf('qr1') >= 0) {
            // 새 안드로이드 앱 — data 만. 앱이 위에 뜨는 알림 + [읽음] [답장] 을 만듭니다
            m = { data: { kind: 'message', link_id: linkId, url: url, title: title, body: preview, qr: qr, qr_url: QR_URL },
                  android: { priority: 'HIGH' } };
          } else {
            // 아이폰(새 앱이면 [답장] 칸이 붙음) · 옛 안드로이드는 그대로 보임
            m = JSON.parse(JSON.stringify(mp));
            m.data.qr = qr; m.data.qr_url = QR_URL;
            m.apns.payload.aps.category = 'QR';
          }
        }
        const r = await fetch('https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send', {
          method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: Object.assign({ token: t }, m) }),
        });
        const head = String(t).slice(0, 12) + '…';
        if (r.ok) { ms++; console.log('[msg-push] ✓ 보냈습니다 (' + head + (m === mp ? '' : ' · 답장 가능') + ')'); }
        else console.error('[msg-push] 🔴 거절 (' + head + ') ' + r.status + ' — ' + (await r.text()).slice(0, 200));
      }
      console.log('[msg-push] 끝: ' + ms + '/' + tokens.length + ' (받은 번호 ' + (Array.isArray(b.tokens) ? b.tokens.length : 0) + '개)');
      return new Response(JSON.stringify({ ok: true, sent: ms }), { headers: { 'Content-Type': 'application/json' } });
    }

    const label = String(b.label || '').slice(0, 30);
    const payload = {
      notification: { title: label ? ('임시연락처 · ' + label) : '임시연락처', body: String(b.preview || '새 메시지가 왔습니다') },
      data: { kind: 'temp', card_id: String(b.cardId || ''), thread_id: String(b.threadId || ''),
              url: 'burum_temp.html?thread=' + String(b.threadId || '') },
      android: { priority: 'NORMAL', notification: { sound: 'default', channel_id: 'messages',
                 tag: 'temp-' + String(b.threadId || ''), notification_priority: 'PRIORITY_DEFAULT' } },
      apns: { headers: { 'apns-priority': '10', 'apns-push-type': 'alert' }, payload: { aps: { alert: { title: label ? ('임시연락처 · ' + label) : '임시연락처', body: String(b.preview || '새 메시지가 왔습니다') }, sound: 'default', 'thread-id': 'temp-' + String(b.threadId || '') } } },   // 🔴 2026-10-10 아이폰 — 소리
    };

    let sent = 0;
    for (const t of tokens) {
      const r = await fetch('https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send', {
        method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: Object.assign({ token: t }, payload) }),
      });
      const head = String(t).slice(0, 12) + '…';
      if (r.ok) { sent++; console.log('[temp-push] ✓ 보냈습니다 (' + head + ')'); }
      else console.error('[temp-push] 🔴 거절 (' + head + ') ' + r.status + ' — ' + (await r.text()).slice(0, 300));
    }
    console.log('[temp-push] 끝: ' + sent + '/' + tokens.length);
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[temp-push] 🔴 오류:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500 });
  }
});

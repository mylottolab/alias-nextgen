/* =====================================================================
   부름 — alias-plan-google-verify
   2026-09-24 · 2026-09-28 추가 용량 상품

   무엇을 하나
     안드로이드 앱에서 Google Play 로 결제가 끝나면, 앱이 영수증(구매 토큰)을
     이 함수로 보냅니다. 이 함수가 **구글에 직접 물어보고** 진짜일 때만
     이용권을 늘리거나 추가 용량을 드립니다.

   🔴 왜 서버가 물어봐야 하나
     앱이 "결제했어요" 라고 보낸 말을 그대로 믿으면, 누군가 가짜 신호를
     만들어 **공짜로 이용권을 받을 수 있습니다.** 앱은 손님 폰에 있어서
     뜯어볼 수 있기 때문입니다. 이니시스·PayPal 때와 같은 원칙입니다.

   순서
     ① 로그인한 사람인지 확인한다 (Authorization 헤더)
     ② 구글에 구매 토큰을 물어본다
     ③ 결제가 끝난 것이 맞는지 본다 (purchaseState = 0)
     ④ 이미 쓴 영수증인지 본다
     ⑤ 이용권을 늘리거나 추가 용량 묶음을 넣는다
     ⑥ 구글에 "잘 받았다" 고 알린다 (acknowledge)

   ⚠ ⑥을 빼면 구글이 **사흘 뒤 자동으로 환불**합니다. 앱이 물건을 못 준
     것으로 보기 때문입니다. 꼭 해야 합니다.

   🔴 2026-09-28 — 추가 용량 (burum_storage_1gb_3m)
     1GB · 3개월 · 2,000원. 구글 결제창에서 **수량을 골라** 한 번에 여러 개
     살 수 있습니다(Play Console 에서 "수량 여러 개" 를 켜둡니다).
     🔴 몇 개를 샀는지는 **구글 답(quantity)** 으로만 셉니다. 앱이 보내는
       숫자는 믿지 않습니다. 1개 값으로 5GB 를 받아가는 일을 막습니다.
     산 것은 storage_packs 에 **묶음 하나**로 들어갑니다(수량만큼 GB,
     산 날부터 3개월). 같은 영수증은 한 번만 들어갑니다(external_payment_id).

   ⚠ 이 함수는 Verify JWT 를 **켜 둡니다.** 손님이 로그인한 채로 부릅니다.

   ⚠ 필요한 비밀값
       GOOGLE_PLAY_SERVICE_ACCOUNT   구글 클라우드에서 받은 서비스 계정 JSON
       (FIREBASE_SERVICE_ACCOUNT 와 **다른 것**입니다. 헷갈리지 마세요.)
   ===================================================================== */

/* 🔴 2026-10-30 — 누름(Nureum) 라인 이용권 · 용량 추가를 더했습니다(handleNureum).
   상품 번호: nureum_line_1m · nureum_line_12m · nureum_voice_300 · nureum_video_100 · nureum_storage_1gb
   어느 라인을 샀는지는 ① 앱이 보낸 lineId, 없으면 ② 결제 직전에 적어 둔 nureum_intents 로 찾습니다.
   돈이 오간 만큼은 DB 의 nureum_apply 가 넣고, 같은 영수증은 두 번 넣지 않습니다. */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PACKAGE = 'com.weaveapp.alias';

/* 상품 번호 → 개월수. 화면(AL.STORE_SKUS)과 **같아야** 합니다. */
const SKU_MONTHS: Record<string, number> = {
  /* ⚠ 2026-09-27 — 지운 상품 번호는 다시 못 씁니다. 3개월만 _a 입니다.
     옛 번호도 남겨둡니다. 앞서 결제하신 분의 영수증이 아직 올 수 있습니다. */
  burum_plan_3m_a: 3,
  burum_plan_3m: 3,
  burum_plan_6m: 6,
  burum_plan_12m: 12,
};

/* 🔴 2026-09-28 — 추가 용량. 화면(AL.STORE_STORAGE_SKU)과 **같아야** 합니다. */
const STORAGE_SKU = 'burum_storage_1gb_3m';
const STORAGE_MONTHS = 3;
const STORAGE_PRICE_KRW = 2000;   // 1GB 한 개 값

/* 🔴 2026-10-18 — 부름번호 상품. 화면(alias_number.html)과 Play Console · App Store Connect 와 **같아야** 합니다.
   모두 소모성(한 번 사면 끝) 상품입니다. 값은 원(KRW). */
const NUMBER_SKUS: Record<string, { kind: string; krw: number }> = {
  burum_number_silver:   { kind: 'silver',   krw: 11000 },    // 🔴 2026-10-23 가격 변경
  burum_number_gold:     { kind: 'gold',     krw: 55000 },
  burum_number_platinum: { kind: 'platinum', krw: 110000 },  // 화면 이름 "프리미엄"
  burum_number_extra:    { kind: 'extra',    krw: 3300 },
  burum_number_change:   { kind: 'change',   krw: 3300 },
  burum_number_keep:     { kind: 'keep',     krw: 1100 },   // 1년 더 잡아 두기
  burum_number_transfer: { kind: 'transfer', krw: 5500 },   // 🔴 2026-10-19 명의 이전 수수료(받는 분이 결제)
};
/* 🔴 2026-10-30 — 누름 상품. 화면(nureum_plan.html) · Play Console · App Store Connect 와 **같아야** 합니다.
   모두 소모성 상품(여러 번 살 수 있음, 구글은 "수량 여러 개" 켜기). 값은 원(KRW, 부가세 포함). */
const NUREUM_SKUS: Record<string, { kind: string; krw: number }> = {
  nureum_line_1m:     { kind: '1m',      krw: 1650 },
  nureum_line_12m:    { kind: '12m',     krw: 16500 },
  nureum_voice_300:   { kind: 'voice',   krw: 1100 },
  nureum_video_100:   { kind: 'video',   krw: 1100 },
  nureum_storage_1gb: { kind: 'storage', krw: 1100 },
};

/* 🔴 2026-10-11 — 애플 결제를 기록할 때 쓰는 이름(payments.method · storage_packs.source) */
const APPLE_METHOD = 'app_store';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/* ── 구글 출입증 ─────────────────────────────────────────────────────
   alias-push-call 과 같은 방식입니다. 서비스 계정으로 JWT 를 만들어
   구글에 내밀고 출입증(access token)을 받아옵니다.
   ⚠ 한 시간짜리라 받아두고 다시 씁니다. 매번 받으면 느립니다.
-------------------------------------------------------------------- */
let cachedToken: string | null = null;
let cachedUntil = 0;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedUntil) return cachedToken;

  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT');
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT 비밀값이 없습니다');
  const sa = JSON.parse(raw);

  const enc = new TextEncoder();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  };
  const unsigned = b64url(enc.encode(JSON.stringify(header))) + '.' +
                   b64url(enc.encode(JSON.stringify(claim)));

  const body = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', der.buffer,
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

function bad(msg: string, status = 400) {
  console.error('[google-verify]', msg);
  return new Response(JSON.stringify({ ok: false, error: msg }),
    { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function okJson(o: unknown) {
  return new Response(JSON.stringify(o),
    { headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/* 🔴 2026-09-27 — 취소·환불된 영수증
   구글이 "취소됐다"(purchaseState 1) 고 하거나 "이제 없는 영수증"(410) 이라 하면
   아무것도 드리지 않고, 화면에 **영수증만 치우라고**(consume: true) 알립니다.
   ⚠ 안 치우면 구글이 "이미 보유한 아이템" 으로 여겨 그 상품을 영영 다시 못 삽니다.
     (2026-09-27 — 결제 뒤 화면이 확인에 실패했고, 콘솔에서 환불했더니
      "이미 보유하고 있는 아이템입니다" 로 막혔습니다) */
function cancelledReply(productId: string, why: string) {
  console.log('[google-verify] 취소·환불된 영수증 — 정리만 합니다:', productId, why);
  return okJson({ ok: false, consume: true, canceled: true,
                  error: '취소되었거나 환불된 결제입니다' });
}

/* 구글에 영수증을 물어봅니다. 이용권·추가 용량 모두 같은 길입니다. */
async function askGoogle(productId: string, purchaseToken: string) {
  const token = await googleToken();
  const url = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'
    + PACKAGE + '/purchases/products/' + encodeURIComponent(productId)
    + '/tokens/' + encodeURIComponent(purchaseToken);
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const info = await res.json();
  return { res, info, url, token };
}

/* =====================================================================
   🔴 2026-10-11 아이폰 — 애플 결제 확인
   아이폰 앱은 영수증을 'apple:<거래번호>' 모양으로 보냅니다(안드로이드와 같은 길).
   서버가 **애플에 직접**(App Store Server API) 그 거래를 물어보고 진짜일 때만 드립니다.
     · 앱 번호(bundleId) · 상품 번호(productId)가 맞아야 합니다
     · 산 사람(appAccountToken)이 지금 로그인한 사람과 같아야 합니다(남의 거래번호로 받아가기 방지)
     · 환불된 거래(revocationDate)면 정리만 합니다
   비밀값: APPLE_IAP_KEY_ID · APPLE_IAP_ISSUER_ID · APPLE_IAP_KEY_P8 (App Store Connect → 통합 → 앱 내 구입 키)
   ===================================================================== */
function isApple(purchaseToken: string) { return String(purchaseToken || '').startsWith('apple:'); }

let appleJwtCache: string | null = null;
let appleJwtAt = 0;
async function appleJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (appleJwtCache && now - appleJwtAt < 15 * 60) return appleJwtCache;
  const p8 = Deno.env.get('APPLE_IAP_KEY_P8') || '';
  const kid = (Deno.env.get('APPLE_IAP_KEY_ID') || '').replace(/[^A-Za-z0-9]/g, '');
  const iss = (Deno.env.get('APPLE_IAP_ISSUER_ID') || '').replace(/[^A-Za-z0-9-]/g, '');
  if (!p8 || !kid || !iss) throw new Error('APPLE_IAP_KEY_P8 · APPLE_IAP_KEY_ID · APPLE_IAP_ISSUER_ID 비밀값이 없습니다');
  const b64 = p8.replace(/-----[A-Z ]+-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', raw.buffer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = new TextEncoder();
  const unsigned = b64url(enc.encode(JSON.stringify({ alg: 'ES256', kid: kid, typ: 'JWT' }))) + '.' +
    b64url(enc.encode(JSON.stringify({ iss: iss, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1', bid: PACKAGE })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  appleJwtCache = unsigned + '.' + b64url(new Uint8Array(sig));
  appleJwtAt = now;
  return appleJwtCache;
}

function jwsPayload(jws: string): any {
  const part = String(jws || '').split('.')[1] || '';
  const b = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0))));
}

/* askGoogle 과 같은 모양({ res, info, url, token })으로 돌려줍니다 */
async function askApple(productId: string, purchaseToken: string, userId: string) {
  const id = purchaseToken.slice(6).replace(/[^0-9]/g, '');
  const jwt = await appleJwt();
  let res: Response | null = null;
  let env = 'Production';
  // 정식 → 시험(TestFlight · 샌드박스) 순서로 묻습니다
  for (const host of ['https://api.storekit.itunes.apple.com', 'https://api.storekit-sandbox.itunes.apple.com']) {
    res = await fetch(host + '/inApps/v1/transactions/' + id, { headers: { Authorization: 'Bearer ' + jwt } });
    if (res.ok) break;   // 출시 전 앱은 정식 창구가 401/404 를 줍니다 → 시험 창구로 다시 묻습니다
    console.log('[apple-verify] 정식 창구 답', res.status, '→ 시험 창구로 다시 묻습니다');
    env = 'Sandbox';
  }
  const fail = (status: number, msg: string) =>
    ({ res: { ok: false, status } as any, info: { error: msg }, url: '', token: '' });
  if (!res || !res.ok) {
    const t = res ? (await res.text()).slice(0, 300) : '';
    console.error('[apple-verify] 🔴 애플이 답하지 않았습니다', res && res.status, t);
    return fail(res ? res.status : 500, '애플 확인 실패 ' + (res ? res.status : '') + ' ' + t);
  }
  const body = await res.json();
  const tx = jwsPayload(body.signedTransactionInfo);
  if (tx.bundleId !== PACKAGE) return fail(400, '다른 앱의 결제입니다');
  if (String(tx.productId).replace(/_nr[0-9]*$/, '') !== productId) return fail(400, '상품 번호가 다릅니다');   // 애플 비갱신 상품은 끝에 _nr
  if (!tx.appAccountToken || String(tx.appAccountToken).toLowerCase() !== String(userId).toLowerCase()) {
    return fail(403, '다른 계정으로 산 결제입니다');
  }
  console.log('[apple-verify] 애플 확인(' + env + '):', tx.productId, tx.transactionId);
  return {
    res: { ok: true, status: 200 } as any,
    info: { purchaseState: tx.revocationDate ? 1 : 0, quantity: tx.quantity || 1, acknowledgementState: 1, apple: tx },
    url: '', token: '',
  };
}

async function askStore(productId: string, purchaseToken: string, userId: string) {
  return isApple(purchaseToken) ? await askApple(productId, purchaseToken, userId) : await askGoogle(productId, purchaseToken);
}

/* 🔴 구글에 "잘 받았다" 고 알립니다. 빼면 사흘 뒤 자동 환불됩니다. */
async function acknowledge(info: any, url: string, token: string) {
  if (info.acknowledgementState) return;   // 애플 결제는 여기서 끝(애플은 앱이 finish 로 정리)
  const ackRes = await fetch(url + ':acknowledge', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!ackRes.ok) {
    console.error('[google-verify] 🔴 잘 받았다고 알리기 실패 — 사흘 뒤 환불될 수 있습니다:',
      (await ackRes.text()).slice(0, 300));
  }
}

/* ── 🔴 2026-09-28 추가 용량 ──────────────────────────────────────── */
async function handleStorage(userId: string, productId: string,
                             purchaseToken: string, orderId: string | null) {
  /* ④ 먼저 — 이미 넣은 영수증인가 */
  const { data: had } = await supabase.from('storage_packs')
    .select('gb, expires_at').eq('external_payment_id', purchaseToken).maybeSingle();
  if (had) {
    console.log('[google-verify] 이미 넣은 추가 용량입니다:', purchaseToken.slice(0, 20));
    return okJson({ ok: true, already: true, storageGb: had.gb, until: had.expires_at });
  }

  /* ② ③ 구글에 묻고, 결제가 끝났는지 봅니다 */
  const { res, info, url, token } = await askStore(productId, purchaseToken, userId);
  if (res.status === 410) return cancelledReply(productId, '410');
  if (!res.ok) {
    return bad('구글이 영수증을 확인해 주지 않았습니다: ' + JSON.stringify(info).slice(0, 300));
  }
  if (info.purchaseState === 1) return cancelledReply(productId, 'state 1');
  if (info.purchaseState !== 0) {
    return bad('아직 결제가 끝나지 않았습니다 (상태 ' + info.purchaseState + ')');
  }

  /* 🔴 수량은 구글 답으로만 셉니다. 없으면 1개입니다. */
  let qty = Number(info.quantity);
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  qty = Math.min(Math.floor(qty), 50);

  const until = new Date();
  until.setMonth(until.getMonth() + STORAGE_MONTHS);

  /* ⑤ 묶음 하나로 넣습니다 */
  const { error: packErr } = await supabase.from('storage_packs').insert({
    account_id: userId,
    gb: qty,
    expires_at: until.toISOString(),
    source: isApple(purchaseToken) ? APPLE_METHOD : 'google_play',
    external_payment_id: purchaseToken,
    amount_krw: STORAGE_PRICE_KRW * qty,
  });
  if (packErr) {
    /* 같은 영수증이 거의 동시에 두 번 오면 두 번째는 여기서 막힙니다. 괜찮습니다. */
    if (String(packErr.code) === '23505') {
      return okJson({ ok: true, already: true, storageGb: qty, until: until.toISOString() });
    }
    /* ⚠ 돈은 받았는데 용량을 못 드린 상태 — 가장 나쁜 경우입니다.
       acknowledge 를 하지 않고 돌려보냅니다. 앱이 다음에 다시 보내옵니다. */
    console.error('[google-verify] 🔴 추가 용량을 못 넣었습니다 — 돈은 받았습니다:',
      userId, purchaseToken.slice(0, 20), JSON.stringify(packErr));
    return bad('추가 용량을 넣지 못했습니다. 잠시 뒤 앱을 다시 열어주세요.', 500);
  }

  /* 결제 기록 — 못 남겨도 용량은 드립니다. 돈은 이미 받았으니까요. */
  const { error: payErr } = await supabase.from('payments').insert({
    user_id: userId,
    method: isApple(purchaseToken) ? APPLE_METHOD : 'google_play',
    external_payment_id: purchaseToken,
    amount_minor_units: STORAGE_PRICE_KRW * qty,
    currency_code: 'KRW',
    status: 'completed',
    purpose: 'storage',
    completed_at: new Date().toISOString(),
  });
  if (payErr) {
    console.error('[google-verify] payments 저장 실패 — 용량은 드렸습니다:',
      orderId, payErr.message);
  }

  /* ⑥ 🔴 잘 받았다고 알립니다 */
  await acknowledge(info, url, token);

  console.log('[google-verify] ✓ 추가 용량 ' + qty + 'GB 를 드렸습니다:', userId);
  return okJson({ ok: true, storageGb: qty, until: until.toISOString() });
}

/* ── 🔴 2026-10-18 부름번호 (좋은 번호 · 번호 하나 더 · 번호 바꾸기) ───────────────
   영수증이 진짜일 때만 DB 의 bn_grant 를 부릅니다. bn_grant 는 같은 영수증을 두 번 넣지 않고,
   손님이 잡아 둔 번호가 있으면 바로 붙이고, 없으면 "쓸 수 있는 번호 1개"(크레딧)로 남깁니다.
   그래서 돈을 받고 번호를 못 드리는 일은 없습니다. */
async function handleNumber(userId: string, productId: string,
                            purchaseToken: string, orderId: string | null) {
  const item = NUMBER_SKUS[productId];

  /* 이미 넣은 영수증이면 그 결과만 돌려줍니다(앱이 같은 영수증을 다시 보내올 수 있음) */
  const { data: had } = await supabase.from('burum_number_credits')
    .select('used_number, account_id').eq('external_payment_id', purchaseToken).maybeSingle();
  if (had) {
    if (had.account_id !== userId) return bad('다른 계정의 영수증입니다', 403);
    return okJson({ ok: true, already: true, kind: item.kind, number: had.used_number || null });
  }

  const { res, info, url, token } = await askStore(productId, purchaseToken, userId);
  if (res.status === 410) return cancelledReply(productId, '410');
  if (!res.ok) return bad('스토어가 영수증을 확인해 주지 않았습니다: ' + JSON.stringify(info).slice(0, 300));
  if (info.purchaseState === 1) return cancelledReply(productId, 'state 1');
  if (info.purchaseState !== 0) return bad('아직 결제가 끝나지 않았습니다 (상태 ' + info.purchaseState + ')');

  /* 구글은 한 번에 여러 개를 살 수 있습니다 — 산 개수만큼 넣습니다(첫 개만 잡아 둔 번호에 붙고, 나머지는 크레딧) */
  let qty = Number(info.quantity);
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  qty = Math.min(Math.floor(qty), 10);
  let g: any = null, gErr: any = null;
  for (let i = 0; i < qty; i++) {
    const r = await supabase.rpc('bn_grant', {
      p_account: userId, p_kind: item.kind, p_token: i === 0 ? purchaseToken : purchaseToken + '#' + i,
    });
    if (r.error || !r.data || !r.data.ok) { gErr = r.error || r.data; break; }
    if (i === 0) g = r.data;
  }
  if (gErr || !g || !g.ok) {
    /* ⚠ 돈은 받았는데 못 넣음 — acknowledge 하지 않고 돌려보냅니다. 앱이 다음에 다시 보내옵니다. */
    console.error('[google-verify] 🔴 부름번호를 못 넣었습니다 — 돈은 받았습니다:', userId, productId, JSON.stringify(gErr || g));
    return bad('번호를 넣지 못했습니다. 잠시 뒤 앱을 다시 열어주세요.', 500);
  }

  const { error: payErr } = await supabase.from('payments').insert({
    user_id: userId,
    method: isApple(purchaseToken) ? APPLE_METHOD : 'google_play',
    external_payment_id: purchaseToken,
    amount_minor_units: item.krw * qty,
    currency_code: 'KRW',
    status: 'completed',
    purpose: 'number',
    completed_at: new Date().toISOString(),
  });
  if (payErr) console.error('[google-verify] payments 저장 실패 — 번호는 드렸습니다:', orderId, payErr.message);

  await acknowledge(info, url, token);
  console.log('[google-verify] ✓ 부름번호 상품:', productId, userId, g.number || '(크레딧)');
  return okJson({ ok: true, kind: item.kind, number: g.number || null, shown: g.shown || null, credit: !!g.credit });
}

/* ── 🔴 2026-10-30 누름 라인 이용권 · 용량 추가 ─────────────────────── */
async function handleNureum(userId: string, productId: string, purchaseToken: string,
                            orderId: string | null, lineIdIn: string | null) {
  const item = NUREUM_SKUS[productId];

  /* 이미 넣은 영수증이면 그 결과만 돌려줍니다 */
  const { data: had } = await supabase.from('nureum_purchases')
    .select('line_id, buyer_id').eq('order_id', purchaseToken).maybeSingle();
  if (had) {
    if (had.buyer_id && had.buyer_id !== userId) return bad('다른 계정의 영수증입니다', 403);
    return okJson({ ok: true, already: true, nureum: true, line_id: had.line_id });
  }

  /* 어느 라인인가 — 앱이 보낸 것, 없으면 결제 직전에 적어 둔 것 */
  let lineId = lineIdIn;
  if (!lineId) {
    const { data: it } = await supabase.from('nureum_intents').select('line_id').eq('account_id', userId).maybeSingle();
    lineId = it?.line_id || null;
  }
  if (!lineId) return bad('어느 라인을 샀는지 찾지 못했습니다. 라인 화면에서 다시 열어 주세요.');
  const { data: line } = await supabase.from('nureum_lines').select('id, owner_id').eq('id', lineId).maybeSingle();
  if (!line || line.owner_id !== userId) return bad('이 라인의 이용권은 만든 분만 살 수 있습니다', 403);

  const { res, info, url, token } = await askStore(productId, purchaseToken, userId);
  if (res.status === 410) return cancelledReply(productId, '410');
  if (!res.ok) return bad('스토어가 영수증을 확인해 주지 않았습니다: ' + JSON.stringify(info).slice(0, 300));
  if (info.purchaseState === 1) return cancelledReply(productId, 'state 1');
  if (info.purchaseState !== 0) return bad('아직 결제가 끝나지 않았습니다 (상태 ' + info.purchaseState + ')');

  /* 🔴 수량은 스토어 답으로만 셉니다 */
  let qty = Number(info.quantity);
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  qty = Math.min(Math.floor(qty), 20);

  const { data: ap, error: apErr } = await supabase.rpc('nureum_apply', {
    p_line: lineId, p_kind: item.kind, p_qty: qty, p_amount: item.krw * qty,
    p_order: purchaseToken, p_store: isApple(purchaseToken) ? 'apple' : 'google', p_buyer: userId,
  });
  if (apErr || !ap || !ap.ok) {
    /* ⚠ 돈은 받았는데 못 넣음 — acknowledge 하지 않고 돌려보냅니다. 앱이 다음에 다시 보내옵니다. */
    console.error('[google-verify] 🔴 누름 이용권을 못 넣었습니다 — 돈은 받았습니다:', userId, productId, JSON.stringify(apErr || ap));
    return bad('이용권을 넣지 못했습니다. 잠시 뒤 앱을 다시 열어주세요.', 500);
  }

  const { error: payErr } = await supabase.from('payments').insert({
    user_id: userId,
    method: isApple(purchaseToken) ? APPLE_METHOD : 'google_play',
    external_payment_id: purchaseToken,
    amount_minor_units: item.krw * qty,
    currency_code: 'KRW',
    status: 'completed',
    purpose: 'nureum',
    completed_at: new Date().toISOString(),
  });
  if (payErr) console.error('[google-verify] payments 저장 실패 — 누름 이용권은 드렸습니다:', orderId, payErr.message);

  await acknowledge(info, url, token);
  console.log('[google-verify] ✓ 누름:', productId, 'x' + qty, lineId, userId);
  return okJson({ ok: true, nureum: true, line_id: lineId, kind: item.kind, qty, until: ap.plan_until || null });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    /* ── ① 누구인가 ───────────────────────────────────────────── */
    const auth = req.headers.get('Authorization') || '';
    const jwt = auth.replace('Bearer ', '');
    if (!jwt) return bad('로그인이 필요합니다', 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return bad('로그인이 필요합니다', 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { productId, orderId } = body;
    let purchaseToken: string = body.purchaseToken;
    /* 🔴 2026-10-18 — 애플 영수증 번호를 한 모양으로 맞춥니다. 숫자 뒤에 글자를 붙여 보내
       같은 결제를 "다른 영수증" 처럼 여러 번 쓰는 일을 막습니다(이용권 · 용량 · 번호 모두). */
    if (isApple(purchaseToken)) purchaseToken = 'apple:' + String(purchaseToken).slice(6).replace(/[^0-9]/g, '');
    if (!productId || !purchaseToken) return bad('영수증이 없습니다');

    /* 🔴 2026-10-30 — 누름 */
    if (NUREUM_SKUS[productId]) {
      const lid = typeof body.lineId === 'string' && /^[0-9a-f-]{36}$/.test(body.lineId) ? body.lineId : null;
      return await handleNureum(userId, productId, purchaseToken, orderId || null, lid);
    }

    /* 🔴 2026-09-28 — 추가 용량은 따로 갑니다 */
    if (NUMBER_SKUS[productId]) {
      return await handleNumber(userId, productId, purchaseToken, orderId || null);
    }

    if (productId === STORAGE_SKU) {
      return await handleStorage(userId, productId, purchaseToken, orderId || null);
    }

    const months = SKU_MONTHS[productId];
    if (!months) return bad('모르는 상품입니다: ' + productId);

    /* ── ④ 먼저 — 이미 쓴 영수증인가 ───────────────────────────
       ⚠ 구글에 묻기 전에 봅니다. 같은 영수증으로 두 번 늘리면 안 됩니다.
         앱이 실수로 두 번 보내는 일이 흔합니다. */
    const { data: dup } = await supabase.from('payments')
      .select('id, status').eq('external_payment_id', purchaseToken).maybeSingle();
    if (dup && dup.status === 'completed') {
      console.log('[google-verify] 이미 처리한 영수증입니다:', purchaseToken.slice(0, 20));
      return okJson({ ok: true, already: true });
    }

    /* ── ② 구글에 물어봅니다 ───────────────────────────────────── */
    const { res, info, url, token } = await askStore(productId, purchaseToken, userId);
    if (res.status === 410) return cancelledReply(productId, '410');
    if (!res.ok) {
      return bad('구글이 영수증을 확인해 주지 않았습니다: ' + JSON.stringify(info).slice(0, 300));
    }
    if (info.purchaseState === 1) return cancelledReply(productId, 'state 1');

    /* ── ③ 결제가 끝난 것이 맞는가 ──────────────────────────────
       purchaseState  0 결제 완료 · 1 취소 · 2 보류
       ⚠ 보류(2)는 편의점 결제처럼 나중에 확정되는 것입니다.
         그때는 이용권을 주지 않고, 확정되면 앱이 다시 보내옵니다. */
    if (info.purchaseState !== 0) {
      return bad('아직 결제가 끝나지 않았습니다 (상태 ' + info.purchaseState + ')');
    }

    /* ── ⑤ 이용권을 늘립니다 ───────────────────────────────────── */
    const amountKrw =
      months === 3 ? 5500 : months === 6 ? 9500 : 16000;

    if (dup) {
      await supabase.from('payments').update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', dup.id);
    } else {
      const { error: insErr } = await supabase.from('payments').insert({
        user_id: userId,
        method: isApple(purchaseToken) ? APPLE_METHOD : 'google_play',
        external_payment_id: purchaseToken,
        amount_minor_units: amountKrw,     // 원화는 그대로 (소수점이 없습니다)
        currency_code: 'KRW',
        status: 'completed',
        purpose: 'plan',
        plan_tier: 'standard',
        plan_months: months,
        completed_at: new Date().toISOString(),
      });
      if (insErr) {
        /* ⚠ 기록을 못 남겨도 이용권은 드립니다. 돈은 이미 받았으니까요.
           로그를 크게 남깁니다. */
        console.error('[google-verify] 🔴 payments 저장 실패 — 이용권은 드립니다:',
          orderId, insErr.message);
      }
    }

    const { error: extErr } = await supabase.rpc('extend_plan_for_user', {
      p_user_id: userId,
      p_months: months,
    });
    if (extErr) {
      /* ⚠ 돈은 빠졌는데 기한이 안 늘어난 상태 — 가장 나쁜 경우입니다. */
      console.error('[google-verify] 🔴 이용권 연장 실패 — 돈은 받았습니다:',
        userId, purchaseToken.slice(0, 20), JSON.stringify(extErr));
      return bad('이용권을 늘리지 못했습니다. 고객센터로 문의해 주세요.', 500);
    }

    /* ── ⑥ 구글에 "잘 받았다" 고 알립니다 ─────────────────────── */
    await acknowledge(info, url, token);

    console.log('[google-verify] ✓ 이용권 ' + months + '개월을 드렸습니다:', userId);
    return okJson({ ok: true, months });

  } catch (err) {
    return bad(String((err as Error).message ?? err), 500);
  }
});

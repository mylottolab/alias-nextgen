// =====================================================================
// 부름 — nureum-web-pay  (2026-10-31)
//   누름 웹(브라우저) 결제 — 이니시스 카드 · 페이팔
//   부름 이용권의 alias-plan-inicis-prepare · alias-plan-paypal-create/capture 를 본떴습니다.
//
//   body.action
//     'inicis_prepare'  { lineId, kind, qty, buyername, buyertel }  → 이니시스 창에 넘길 값
//     'paypal_create'   { lineId, kind, qty }                        → { id }
//     'paypal_capture'  { orderID }                                  → { ok, until }
//   kind: '1m' | '12m' | 'voice' | 'video' | 'storage'   qty: 1~10
//
//   ⚠ 값은 화면이 보낸 것을 믿지 않습니다. 서버가 nureum_settings 에서 직접 읽습니다.
//   ⚠ 라인을 만든 사람(개설자)만 살 수 있습니다.
//   ⚠ Verify JWT 켜 둡니다(로그인한 손님이 부릅니다).
//   비밀값(부름 이용권과 같은 것): INICIS_MID · INICIS_PRO_HASHKEY · PAYPAL_CLIENT_ID · PAYPAL_CLIENT_SECRET · PAYPAL_MODE · SITE_BASE_URL
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = Deno.env.get('SITE_BASE_URL') || 'https://burum.kr';
const FN = Deno.env.get('SUPABASE_URL')!.replace('.supabase.co', '.supabase.co/functions/v1');
const PAYPAL_MODE = Deno.env.get('PAYPAL_MODE') || 'sandbox';
const PAYPAL_API = PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const KINDS = ['1m', '12m', 'voice', 'video', 'storage'];
const NAMES: Record<string, string> = {
  '1m': '누름 라인 1개월권', '12m': '누름 라인 12개월권',
  voice: '누름 음성통화 +300분', video: '누름 영상통화 +100분', storage: '누름 저장 공간 +1GB',
};
const NAMES_EN: Record<string, string> = {
  '1m': 'Nureum line 1 month', '12m': 'Nureum line 12 months',
  voice: 'Nureum +300 voice min', video: 'Nureum +100 video min', storage: 'Nureum +1GB storage',
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function bad(msg: string, status = 400) { console.error('[nureum-web-pay]', msg); return json({ ok: false, error: msg }, status); }

async function sha512Base64(str: string) {
  const buf = new Uint8Array(await crypto.subtle.digest('SHA-512', new TextEncoder().encode(str)));
  let b = ''; for (let i = 0; i < buf.length; i++) b += String.fromCharCode(buf[i]);
  return btoa(b);
}

async function price(kind: string, qty: number) {
  const { data: s, error } = await supabase.from('nureum_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !s) throw new Error('요금 설정을 못 읽었습니다');
  const krw = kind === '1m' ? s.price_1m : kind === '12m' ? s.price_12m : s.extra_price;
  const usd = Number(kind === '1m' ? s.usd_1m : kind === '12m' ? s.usd_12m : s.usd_extra);
  return { krw: krw * qty, usd: Math.round(usd * qty * 100) / 100 };
}

async function checkLine(userId: string, lineId: string) {
  if (!/^[0-9a-f-]{36}$/.test(String(lineId || ''))) return '라인 정보가 없습니다';
  const { data: l } = await supabase.from('nureum_lines').select('id, owner_id, ended_at').eq('id', lineId).maybeSingle();
  if (!l) return '라인을 찾지 못했습니다';
  if (l.owner_id !== userId) return '이 라인의 이용권은 만든 분만 살 수 있습니다';
  if (l.ended_at) return '끊긴 라인입니다';
  return null;
}

async function paypalToken() {
  const auth = btoa(`${Deno.env.get('PAYPAL_CLIENT_ID')}:${Deno.env.get('PAYPAL_CLIENT_SECRET')}`);
  const r = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const d = await r.json();
  if (!r.ok) throw new Error('PayPal 인증 실패: ' + (d.error_description || d.error || ''));
  return d.access_token as string;
}

/* 결제가 확인된 주문을 라인에 넣습니다(같은 주문은 한 번만 — nureum_apply 가 order_id 로 막음) */
async function applyOrder(o: any, store: string) {
  const { data: ap, error } = await supabase.rpc('nureum_apply', {
    p_line: o.line_id, p_kind: o.kind, p_qty: o.qty, p_amount: o.amount_krw || 0,
    p_order: o.oid, p_store: store, p_buyer: o.buyer_id,
  });
  if (error || !ap || !ap.ok) {
    console.error('[nureum-web-pay] 🔴 누름 이용권을 못 넣었습니다 — 돈은 받았습니다:', o.oid, JSON.stringify(error || ap));
    return null;
  }
  await supabase.from('nureum_orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('oid', o.oid);
  await supabase.from('payments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('external_payment_id', o.oid);
  return ap;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u } = await supabase.auth.getUser(jwt);
    const userId = u?.user?.id;
    if (!userId) return bad('로그인이 필요합니다', 401);

    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'inicis_prepare' || action === 'paypal_create') {
      const kind = String(body.kind || '');
      const qty = Math.floor(Number(body.qty || 1));
      if (!KINDS.includes(kind)) return bad('모르는 상품입니다');
      if (!(qty >= 1 && qty <= 10)) return bad('수량은 1~10장입니다');
      const why = await checkLine(userId, body.lineId);
      if (why) return bad(why, 403);
      const p = await price(kind, qty);
      const goods = NAMES[kind] + (qty > 1 ? ' ×' + qty : '');

      if (action === 'inicis_prepare') {
        const buyername = String(body.buyername || '').trim();
        if (!buyername) return bad('구매자 이름이 없습니다');
        const ts = Date.now().toString();
        const oid = `ALNG_NU_${kind}_${qty}_${ts}`;
        const amt = String(p.krw);
        const chkfake = await sha512Base64(`${amt}${oid}${ts}${Deno.env.get('INICIS_PRO_HASHKEY')}`);
        const { error: e1 } = await supabase.from('nureum_orders').insert({
          oid, line_id: body.lineId, buyer_id: userId, kind, qty, amount_krw: p.krw, method: 'inicis' });
        if (e1) return bad('결제 준비 중 오류: ' + e1.message, 500);
        await supabase.from('payments').insert({
          user_id: userId, method: 'inicis_card', external_payment_id: oid, amount_minor_units: p.krw,
          currency_code: 'KRW', status: 'pending', purpose: 'nureum' });
        return json({
          ok: true, mid: Deno.env.get('INICIS_MID'), oid, amt, goodname: goods, buyername,
          buyertel: String(body.buyertel || ''), buyeremail: '', timestamp: ts, chkfake,
          nextUrl: `${FN}/nureum-inicis-return`, notiUrl: `${FN}/nureum-inicis-return`,
          closeUrl: `${SITE}/nureum_plan.html?line=${body.lineId}`,
        });
      }

      // paypal_create
      const token = await paypalToken();
      const r = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{
          amount: { currency_code: 'USD', value: p.usd.toFixed(2) },
          description: NAMES_EN[kind] + (qty > 1 ? ' x' + qty : ''), custom_id: `NU_${kind}_${qty}`,
        }] }),
      });
      const d = await r.json();
      if (!r.ok) { console.error('[nureum-web-pay] paypal create', JSON.stringify(d)); return bad('결제 주문을 만들지 못했습니다', 500); }
      const { error: e2 } = await supabase.from('nureum_orders').insert({
        oid: d.id, line_id: body.lineId, buyer_id: userId, kind, qty, amount_krw: p.krw, amount_usd: p.usd, method: 'paypal' });
      if (e2) return bad('결제 준비 중 오류: ' + e2.message, 500);
      await supabase.from('payments').insert({
        user_id: userId, method: 'paypal', external_payment_id: d.id, amount_minor_units: Math.round(p.usd * 100),
        currency_code: 'USD', status: 'pending', purpose: 'nureum' });
      return json({ ok: true, id: d.id });
    }

    if (action === 'paypal_capture') {
      const orderID = String(body.orderID || '');
      const { data: o } = await supabase.from('nureum_orders').select('*').eq('oid', orderID).maybeSingle();
      if (!o || o.buyer_id !== userId) return bad('주문 정보를 찾을 수 없습니다');
      if (o.status === 'completed') return json({ ok: true, already: true });
      const token = await paypalToken();
      const r = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      const d = await r.json();
      const already = r.status === 422 && d?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED';
      if (!already && (!r.ok || d.status !== 'COMPLETED')) {
        await supabase.from('nureum_orders').update({ status: 'failed' }).eq('oid', orderID);
        await supabase.from('payments').update({ status: 'failed' }).eq('external_payment_id', orderID);
        return bad('결제 승인에 실패했습니다');
      }
      const ap = await applyOrder(o, 'paypal');
      if (!ap) return bad('이용권을 넣지 못했습니다. 고객센터로 알려 주세요.', 500);
      return json({ ok: true, until: ap.plan_until || null });
    }

    return bad('모르는 요청입니다');
  } catch (e) {
    return bad(String((e as Error).message ?? e), 500);
  }
});

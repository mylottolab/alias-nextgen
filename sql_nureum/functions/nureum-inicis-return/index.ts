// =====================================================================
// 부름 — nureum-inicis-return  (2026-10-31)
//   이니시스가 누름 웹 결제 인증 결과를 보내오는 착지점(alias-plan-inicis-return 을 본뜸).
//   ① 인증 결과 → ② nureum_orders 에서 주문 찾기 → ③ 이니시스 승인(여기서 돈이 빠짐)
//   → ④ nureum_apply 로 라인에 넣기 → ⑤ 누름 이용 현황 화면으로
//   ⚠ 같은 주문이 두 번 와도 한 번만 넣습니다(이니시스는 NEXT · NOTI 로 두 번 보낼 수 있음).
//   ⚠ Verify JWT 를 **꺼 둡니다**(이니시스가 부르므로 로그인 정보가 없습니다).
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = Deno.env.get('SITE_BASE_URL') || 'https://burum.kr';

function go(line: string | null, q: string) {
  const path = line ? `nureum_plan.html?line=${line}&${q}` : `nureum.html?${q}`;
  return new Response(null, { status: 302, headers: { Location: `${SITE}/${path}` } });
}

async function approve(idc: string, mid: string, tid: string, amt: string) {
  const r = await fetch(`https://${idc}paypro.inicis.com/payment/v1/rest/payAppl.ini`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: [`P_MID=${encodeURIComponent(mid)}`, `P_AUTH_TID=${encodeURIComponent(tid)}`,
           `P_AMT=${encodeURIComponent(amt)}`, 'P_CHARSET=UTF-8'].join('&'),
  });
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(await r.text()).entries()) out[k] = v;
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return go(null, 'pay=fail');
  let line: string | null = null;
  try {
    const f = await req.formData();
    const st = f.get('P_STATUS') as string, msg = (f.get('P_RMESG') as string) || '결제실패';
    const oid = f.get('P_OID') as string, mid = f.get('P_MID') as string;
    const tid = f.get('P_AUTH_TID') as string, amt = f.get('P_AMT') as string;
    const idc = (f.get('P_IDCNAME') as string) || '';
    if (!oid || !oid.startsWith('ALNG_NU_')) return go(null, 'pay=fail');

    const { data: o } = await supabase.from('nureum_orders').select('*').eq('oid', oid).maybeSingle();
    if (!o) return go(null, 'pay=fail');
    line = o.line_id;
    if (st !== '00') return go(line, 'pay=fail&msg=' + encodeURIComponent(msg));
    if (o.status === 'completed') return go(line, 'pay=ok');
    if (String(o.amount_krw) !== String(amt)) {
      console.error('[nureum-inicis-return] 🔴 금액이 다릅니다', oid, o.amount_krw, amt);
      return go(line, 'pay=fail&msg=' + encodeURIComponent('금액이 맞지 않습니다'));
    }

    const ap = await approve(idc, mid, tid, amt);
    if (ap.P_STATUS !== '00') {
      await supabase.from('nureum_orders').update({ status: 'failed' }).eq('oid', oid);
      await supabase.from('payments').update({ status: 'failed' }).eq('external_payment_id', oid);
      return go(line, 'pay=fail&msg=' + encodeURIComponent(ap.P_RMESG || '승인실패'));
    }

    const { data: r, error } = await supabase.rpc('nureum_apply', {
      p_line: o.line_id, p_kind: o.kind, p_qty: o.qty, p_amount: o.amount_krw,
      p_order: oid, p_store: 'inicis', p_buyer: o.buyer_id,
    });
    if (error || !r || !r.ok) {
      console.error('[nureum-inicis-return] 🔴 누름 이용권을 못 넣었습니다 — 돈은 받았습니다:', oid, JSON.stringify(error || r));
    }
    await supabase.from('nureum_orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('oid', oid);
    await supabase.from('payments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('external_payment_id', oid);
    return go(line, 'pay=ok');
  } catch (e) {
    console.error('[nureum-inicis-return] 오류', e);
    return go(line, 'pay=fail');
  }
});

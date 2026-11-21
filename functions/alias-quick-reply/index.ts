/* =====================================================================
   부름 · 와파 — alias-quick-reply   (2026-11-22)
   알림에서 바로 [답장] · [읽음]

   폰(안드로이드 알림 · 아이폰 알림)이 알림에 실려 온 1회용 열쇠(t)와 답장 글을 보내면
     ① 열쇠가 진짜인지(서명) · 기한이 안 지났는지 확인
     ② quick_reply() 로 저장(또는 읽음 표시) — 그 사람의 대화 자리로만
     ③ 대화 화면을 보고 있는 상대에게 바로 보이게 방송(new-message)
   열쇠는 alias-temp-push 가 받는 사람 · 그 대화 하나에만 만들어 줍니다(7일).
   ⚠ Verify JWT 를 **끕니다**(폰이 로그인 토큰 없이 부름). 대신 열쇠 서명을 확인합니다.
   ⚠ 비밀값은 새로 없습니다 — TEMP_PUSH_KEY(이미 있음)로 서명을 확인합니다.
   ===================================================================== */
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

function b64urlDec(s: string): string { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return atob(s); }
function b64url(bytes: Uint8Array): string { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function sign(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('qr1|' + data))));
}
function same(a: string, b: string) { let d = a.length ^ b.length; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0); return d === 0; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const KEY = Deno.env.get('TEMP_PUSH_KEY') || '';
    if (!KEY) return json({ error: 'server_key_missing' }, 500);
    const b = await req.json().catch(() => ({}));
    const t = String(b.t || ''), action = b.action === 'read' ? 'read' : 'reply';
    const [body, sig] = t.split('.');
    if (!body || !sig || !same(await sign(body, KEY), sig)) return json({ error: 'bad_token' }, 403);
    const [side, link, exp] = b64urlDec(body).split('|');
    if (!side || !link || !(Number(exp) > Date.now() / 1000)) return json({ error: 'expired' }, 410);
    const text = String(b.text || '').trim();
    if (action === 'reply' && !text) return json({ error: 'empty' }, 400);

    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/quick_reply', {
      method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: KEY, p_side: side, p_link: link, p_action: action, p_text: text }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out || !out.ok) { console.error('[qr] 🔴', r.status, JSON.stringify(out).slice(0, 200)); return json({ error: (out && (out.error || out.message)) || 'save_failed' }, 400); }

    if (action === 'reply' && out.message) {
      // 대화 화면을 열어 둔 사람에게 바로 보이게 — alias-message-send 와 같은 방송(link-<id> · new-message)
      try {
        await fetch(SUPABASE_URL + '/realtime/v1/api/broadcast', {
          method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ topic: 'link-' + link, event: 'new-message', payload: out.message }] }),
        });
      } catch (_e) { /* 저장은 이미 끝났습니다 */ }
    }
    console.log('[qr] ✓ ' + action + ' link=' + link.slice(0, 8));
    return json({ ok: true });
  } catch (e) {
    console.error('[qr] 🔴', e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

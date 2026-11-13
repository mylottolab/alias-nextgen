/* =====================================================================
   안심 긴급 (SOS) — 부름 · 누름 · 바로너 공통 (2026-11-14)
   sos.html 이 씁니다. 필요한 것: alias_config.js · supabase · alias_common.js · alias_qr.js · nureum.js

   무엇을 하나
     · 이용자: 긴급 버튼 → 5초 세기(취소 가능) → 서버에 긴급 시작 → 보호자 휴대폰 모두 울림
               위치는 2분마다 30분 동안 새로 보냄 · 아무도 확인 안 하면 5분마다 다시 울림
               신호가 없으면 이 휴대폰에 담아 두었다가 신호가 잡히면 곧바로 보냄
               (선택) 이 휴대폰 문자창을 보호자 번호 · 위치가 채워진 채로 띄움 — 번호는 이 휴대폰에만 저장
     · 보호자: 알림 → 긴급 화면(지도 · 배터리 · 「확인했어요」 · 119)
   ⚠ 보호자 전화번호를 서버로 보내지 않습니다. 문자용 번호는 localStorage 에만 둡니다.
   ===================================================================== */
window.SOS = window.SOS || {};
(function(S){
  'use strict';
  var KEY_SMS = 'sos_sms_numbers', KEY_SMS_ON = 'sos_sms_on', KEY_PENDING = 'sos_pending', KEY_EVENT = 'sos_event';
  S.APP = /baronu/.test(location.hostname) ? 'baronu' : 'burum';
  S.APPNAME = S.APP === 'baronu' ? '바로너' : '부름';
  S.SKU = S.APP === 'baronu' ? { m1: 'baronu_sos_1m', m12: 'baronu_sos_12m' } : { m1: 'sos_1m', m12: 'sos_12m' };
  S.ERR = {
    login: '먼저 앱을 시작해 주세요.', consent: '먼저 위치정보 제공에 동의해 주세요.', full: '보호자는 3명까지 연결할 수 있어요.',
    too_many_invites: '보내 놓은 초대가 많아요. 쓰지 않는 초대를 지워 주세요.', no_invite: '초대 코드를 찾지 못했어요. 코드를 다시 확인해 주세요.',
    used: '이미 쓴 초대 코드예요. 새 초대를 받아 주세요.', expired: '초대 기간(3일)이 지났어요. 새 초대를 받아 주세요.',
    self: '본인이 만든 초대예요. 보호자 휴대폰에서 열어 주세요.', already: '이미 보호자로 연결되어 있어요.',
    no_guardian: '연결된 보호자가 없어요. 먼저 보호자를 초대해 주세요.', no_sub: '「안심 긴급」 이용권이 없거나 끝났어요.',
    not_mine: '볼 수 없는 긴급이에요.', not_guardian: '보호자만 누를 수 있어요.', not_open: '이미 끝난 긴급이에요.',
  };
  S.err = function(c){ return S.ERR[c] || ('잠시 문제가 있었습니다 (' + (c || '?') + ')'); };
  S.esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  S.isIOS = function(){ return /iPhone|iPad|iPod/.test(navigator.userAgent || ''); };
  S.isAndroid = function(){ return /Android/.test(navigator.userAgent || ''); };
  S.isApp = function(){ try { return !!(AL.isNativeApp && AL.isNativeApp()); } catch (e) { return false; } };
  S.ago = function(iso){
    if (!iso) return '';
    var s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + '초 전'; if (s < 3600) return Math.floor(s / 60) + '분 전'; if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    return Math.floor(s / 86400) + '일 전';
  };
  S.date = function(iso){ if (!iso) return ''; var d = new Date(iso); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; };
  S.store = {
    get: function(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function(k, v){ try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ── 서버 ───────────────────────────────────────────────────── */
  S.rpc = function(fn, args){ return (window.NU && NU.rpc) ? NU.rpc(fn, args) : AL.sb.rpc(fn, args || {}).then(function(r){ if (r.error) throw r.error; return r.data; }); };
  S.alert = async function(eventId, kind){
    try { return await AL.callFn('sos-alert', { eventId: eventId, kind: kind || 'sos' }); }
    catch (e) { console.warn('[sos] 알림 보내기 실패', e); return { ok: false, error: String(e.message || e) }; }
  };
  S.online = function(){ return navigator.onLine !== false; };
  S.netErr = function(e){ var m = String((e && (e.message || e.details)) || e || ''); return /Failed to fetch|NetworkError|Load failed|network|인터넷 연결/i.test(m); };

  /* ── 위치 · 배터리 ─────────────────────────────────────────────── */
  S.where = function(timeoutMs){
    return new Promise(function(res){
      if (!navigator.geolocation) return res(null);
      var done = false, best = null;
      var finish = function(){ if (done) return; done = true; try { navigator.geolocation.clearWatch(w); } catch (e) {} res(best); };
      var take = function(p){ if (!p || !p.coords) return; if (!best || p.coords.accuracy < best.acc) best = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }; if (best.acc <= 30) finish(); };
      var w = null;
      try { w = navigator.geolocation.watchPosition(take, function(){ }, { enableHighAccuracy: true, maximumAge: 15000, timeout: timeoutMs || 12000 }); } catch (e) {}
      try { navigator.geolocation.getCurrentPosition(take, function(){ }, { enableHighAccuracy: false, maximumAge: 300000, timeout: 4000 }); } catch (e) {}
      setTimeout(finish, timeoutMs || 12000);
    });
  };
  S.battery = async function(){ try { if (navigator.getBattery) { var b = await navigator.getBattery(); return Math.round(b.level * 100); } } catch (e) {} return null; };
  S.mapLinks = function(lat, lng, name){
    var n = encodeURIComponent(name || '위치');
    return { kakao: 'https://map.kakao.com/link/map/' + n + ',' + lat + ',' + lng, kakaoTo: 'https://map.kakao.com/link/to/' + n + ',' + lat + ',' + lng,
             google: 'https://maps.google.com/?q=' + lat + ',' + lng, naver: 'https://map.naver.com/p/search/' + lat + ',' + lng };
  };
  S.mapEmbed = function(lat, lng){
    var d = 0.004;
    return 'https://www.openstreetmap.org/export/embed.html?bbox=' + (lng - d) + ',' + (lat - d) + ',' + (lng + d) + ',' + (lat + d) + '&layer=mapnik&marker=' + lat + ',' + lng;
  };

  /* ── 이 휴대폰 문자 (선택) — 번호는 이 휴대폰에만 ─────────────────────── */
  S.smsNumbers = function(){ return S.store.get(KEY_SMS, []).filter(function(x){ return x && x.phone; }).slice(0, 3); };
  S.setSmsNumbers = function(a){ S.store.set(KEY_SMS, (a || []).slice(0, 3)); };
  S.smsOn = function(){ return !!S.store.get(KEY_SMS_ON, false) && S.smsNumbers().length > 0; };
  S.setSmsOn = function(on){ S.store.set(KEY_SMS_ON, !!on); };
  S.cleanPhone = function(p){ return String(p || '').replace(/[^0-9+]/g, '').slice(0, 15); };
  S.smsText = function(loc){
    var t = '[긴급] ' + S.APPNAME + ' 안심 긴급 — 도움이 필요합니다.';
    if (loc) t += '\n위치: ' + S.mapLinks(loc.lat, loc.lng, '긴급').kakao + (loc.acc ? ' (오차 약 ' + loc.acc + 'm)' : '');
    else t += '\n(위치를 잡지 못했습니다)';
    return t + '\n' + new Date().toLocaleString('ko-KR');
  };
  S.smsUrl = function(numbers, body){
    var nums = numbers.map(S.cleanPhone).filter(Boolean);
    if (S.isIOS()) return 'sms:/open?addresses=' + nums.join(',') + '&body=' + encodeURIComponent(body);
    return 'sms:' + nums.join(';') + '?body=' + encodeURIComponent(body);
  };
  S.openSms = function(loc){ var n = S.smsNumbers().map(function(x){ return x.phone; }); if (!n.length) return false; location.href = S.smsUrl(n, S.smsText(loc)); return true; };
  S.call119 = function(){ location.href = 'tel:119'; };
  S.sms119 = function(loc){ location.href = S.smsUrl(['119'], S.smsText(loc).replace('[긴급] ', '[119 문자신고] ')); };

  /* ── 신호가 없을 때: 담아 두었다가 다시 ─────────────────────────────── */
  S.pending = function(){ return S.store.get(KEY_PENDING, null); };
  S.setPending = function(p){ S.store.set(KEY_PENDING, p); };

  /* 긴급 시작 (진짜 · 시험). 성공하면 { ok, event } — 실패(망)이면 담아 둡니다 */
  S.start = async function(test, loc){
    var bat = await S.battery();
    try {
      var r = await S.rpc('sos_start', { p_test: !!test, p_lat: loc ? loc.lat : null, p_lng: loc ? loc.lng : null, p_acc: loc ? loc.acc : null, p_battery: bat });
      if (!r || !r.ok) return { ok: false, error: r && r.error };
      if (!test) S.store.set(KEY_EVENT, { id: r.event, at: Date.now() });
      S.setPending(null);
      var a = await S.alert(r.event, 'sos');
      return { ok: true, event: r.event, guardians: r.guardians, sent: a && a.sent, alertOk: !!(a && a.ok) };
    } catch (e) {
      if (!test) S.setPending({ at: Date.now(), loc: loc || null, bat: bat });
      return { ok: false, offline: true, error: String(e.message || e) };
    }
  };
  /* 담아 둔 긴급이 있으면 지금 보냅니다 (화면이 켜질 때 · 망이 돌아올 때) */
  S.flush = async function(){
    var p = S.pending(); if (!p) return null;
    if (Date.now() - p.at > 6 * 3600e3) { S.setPending(null); return null; }   // 6시간 지난 것은 버립니다
    var r = await S.start(false, p.loc);
    return r;
  };
  window.addEventListener('online', function(){ S.flush().then(function(r){ if (r && r.ok && S.onFlushed) S.onFlushed(r); }); });

  /* ── 위치 따라가기 · 다시 울리기 (화면이 켜져 있는 동안) ────────────────── */
  S.follow = function(eventId, onTick){
    var t0 = Date.now(), lastAlert = Date.now(), rounds = 1, stop = false;
    async function tick(){
      if (stop) return;
      var loc = await S.where(10000), bat = await S.battery();
      try { if (loc || bat != null) await S.rpc('sos_loc', { p_event: eventId, p_lat: loc ? loc.lat : null, p_lng: loc ? loc.lng : null, p_acc: loc ? loc.acc : null, p_battery: bat }); } catch (e) {}
      var v = null; try { v = await S.rpc('sos_view', { p_event: eventId }); } catch (e) {}
      if (v && v.ok && v.ended_at) { stop = true; if (onTick) onTick(v, loc); return; }
      if (v && v.ok && !(v.acks || []).length && Date.now() - lastAlert > 5 * 60e3 && rounds < 7) { lastAlert = Date.now(); rounds++; S.alert(eventId, 'sos'); }
      if (onTick) onTick(v, loc);
    }
    tick();
    var iv = setInterval(function(){ if (stop || Date.now() - t0 > 30 * 60e3) { clearInterval(iv); return; } tick(); }, 2 * 60e3);
    var iv2 = setInterval(async function(){   // 확인했는지는 자주 봅니다(위치는 2분마다)
      if (stop) { clearInterval(iv2); return; }
      try { var v = await S.rpc('sos_view', { p_event: eventId }); if (onTick) onTick(v, null); if (v && v.ended_at) stop = true; } catch (e) {}
    }, 15000);
    return function(){ stop = true; clearInterval(iv); clearInterval(iv2); };
  };

  /* ── 새 앱이면 「긴급 벨을 직접 울리는 기기」라고 서버에 적어 둡니다 ─────────── */
  S.markDevice = async function(){
    try {
      var caps = (window.AliasNative && typeof AliasNative.sosAlarm === 'function') ? 'sos' : '';
      var row = localStorage.getItem(AL.DEVICE_ID_KEY || 'alias_device_row_id');
      if (row && caps) await S.rpc('sos_mark_device', { p_row: row.replace(/"/g, ''), p_caps: caps });
    } catch (e) {}
  };

  /* ── 바탕화면 긴급 아이콘 ─────────────────────────────────────────── */
  S.canPinNative = function(){ return !!(window.AliasNative && typeof AliasNative.pinSos === 'function'); };
  S.pinNative = function(){ try { return AliasNative.pinSos(JSON.stringify({ app: S.APP })) !== false; } catch (e) { return false; } };
  S.iosWidget = function(){ try { return !!(window.webkit && webkit.messageHandlers && webkit.messageHandlers.nureumWidget); } catch (e) { return false; } };

  /* ── 결제 (앱: 구글 · 애플 / 웹: 카드) ─────────────────────────────── */
  S.STORE = function(){ return !!(window.AliasNative && typeof AliasNative.storeBuy === 'function'); };
  S.buy = async function(which, done){
    if (window.NU && NU.isAnon && NU.isAnon(await NU.session())) {
      var ok = await NU.protect('이용권은 계정에 담겨요. 휴대폰을 바꾸거나 앱을 지워도 이용권이 남도록, 결제 전에 아이디 · 비밀번호를 만들어 주세요(30초).');
      if (!ok) return;
      NU.closeSheet();
    }
    if (S.STORE()) {
      AL.onStoreDone = done;
      AliasNative.storeBuy(S.SKU[which]);
      return 'store';
    }
    return 'web';
  };
})(window.SOS);

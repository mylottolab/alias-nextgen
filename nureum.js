/* =====================================================================
   누름 (Nureum) 공용 — 2026-10-30
   누름은 부름 안에 따로 사는 1:1 직통 앱입니다.
     라인 하나 = 부름 1:1 연결(link) 하나 + 누름 표(nureum_lines) 한 줄
   통화 · 대화는 부름 화면(alias_call.html · alias_chat.html)을 그대로 씁니다.
   서버 함수는 1_nureum.sql 에 있습니다(nureum_*).
   ===================================================================== */
window.NU = window.NU || {};

NU.COLORS = ['#E4572E', '#2B59C3', '#1F8A5B', '#7A4DD8', '#D93A7A', '#B07A00', '#0E8C9C', '#3B3F4A'];

NU.ERR = {
  login: '로그인이 필요합니다.',
  persona: '부름 별칭을 먼저 하나 만들어 주세요.',
  name: '이름을 1~20자로 적어 주세요.',
  too_many_waiting: '짝을 기다리는 라인이 5개 있습니다. 먼저 짝을 맺거나 지워 주세요.',
  not_found: '그 코드를 찾지 못했습니다. 코드를 다시 확인해 주세요.',
  used: '이미 짝을 맺은 코드입니다. 새 코드를 받아 주세요.',
  expired: '코드 시간이 지났습니다(10분). 보내신 분께 새 코드를 받아 주세요.',
  self: '내가 만든 코드입니다. 상대 휴대폰에서 넣어 주세요.',
  not_linked: '연결이 아직 안 됐습니다. 잠시 뒤 다시 눌러 주세요.',
  paired: '이미 짝을 맺은 라인입니다.',
  not_enough: '남은 기간이 한 달보다 길 때만 당겨 쓸 수 있습니다.',
  admin: '관리자만 할 수 있습니다.',
};
NU.errText = function(code){ return NU.ERR[code] || ('잠시 문제가 있었습니다 (' + (code || '?') + ')'); };

NU.esc = function(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
NU.glyph = function(line){
  var g = (line && line.glyph) || '';
  if (g) return g;
  var n = (line && line.name) || '';
  return n ? Array.from(n)[0] : '누';
};
NU.won = function(n){ return Number(n || 0).toLocaleString('ko-KR') + '원'; };
NU.fmtDate = function(iso){
  if (!iso) return '';
  var d = new Date(iso);
  return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
};
NU.q = function(k){ return new URLSearchParams(location.search).get(k); };

NU.rpc = async function(fn, args){
  var r = await AL.sb.rpc(fn, args || {});
  if (r.error) throw r.error;
  return r.data;
};

/* 아이콘 그림 (바탕화면 바로가기 · 탭 아이콘에 씁니다) */
NU.iconDataUrl = function(glyph, color, size){
  size = size || 192;
  var c = document.createElement('canvas'); c.width = c.height = size;
  var x = c.getContext('2d');
  var r = size * 0.22;
  x.fillStyle = color || '#E4572E';
  x.beginPath();
  x.moveTo(r, 0); x.arcTo(size, 0, size, size, r); x.arcTo(size, size, 0, size, r);
  x.arcTo(0, size, 0, 0, r); x.arcTo(0, 0, size, 0, r); x.closePath(); x.fill();
  x.fillStyle = '#FFFFFF';
  x.font = '900 ' + Math.round(size * 0.5) + 'px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(glyph || '누', size / 2, size * 0.54);
  return c.toDataURL('image/png');
};

/* 이 화면의 이름 · 아이콘을 라인에 맞춥니다.
   그러면 휴대폰 브라우저의 "홈 화면에 추가" 가 그 사람 이름 · 그림으로 아이콘을 만듭니다. */
NU.setPageIcon = function(line){
  var url = NU.iconDataUrl(NU.glyph(line), line.color, 192);
  document.title = line.name;
  ['icon', 'apple-touch-icon'].forEach(function(rel){
    var l = document.querySelector('link[rel="' + rel + '"]');
    if (!l) { l = document.createElement('link'); l.rel = rel; document.head.appendChild(l); }
    l.href = url;
  });
  var m = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!m) { m = document.createElement('meta'); m.name = 'apple-mobile-web-app-title'; document.head.appendChild(m); }
  m.content = line.name;
};

NU.isApp = function(){ try { return !!(AL.isNativeApp && AL.isNativeApp()); } catch (e) { return false; } };
NU.platform = function(){
  var ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'pc';
};

/* 바탕화면에 이 라인 아이콘 추가
   ① 안드로이드 앱: AliasNative.pinShortcut (앱 3단계에서 붙임) → 휴대폰이 "홈 화면에 추가" 창을 띄움
   ② 그 밖: 브라우저 메뉴로 추가하는 법을 그림 없이 짧게 안내 */
NU.pin = function(line){
  var url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'nureum_line.html?line=' + line.id;
  if (window.AliasNative && typeof AliasNative.pinShortcut === 'function') {
    try {
      AliasNative.pinShortcut(JSON.stringify({
        id: 'nureum_' + line.id, name: line.name, url: url,
        icon: NU.iconDataUrl(NU.glyph(line), line.color, 192).split(',')[1],
      }));
      return;
    } catch (e) { console.warn('[nureum] pinShortcut', e); }
  }
  var p = NU.platform(), how;
  if (NU.isApp() && p === 'ios') {
    how = '<b>아이폰</b>은 앱이 아이콘을 따로 만들 수 없어 <b>위젯</b>으로 놓습니다.<br>바탕화면 빈 곳을 꾹 → 왼쪽 위 [편집] → [위젯 추가] → 부름 → 누름 위젯.<br><span style="color:var(--nu-sub)">(누름 위젯은 아이폰 앱 다음 판에 들어갑니다)</span>';
  } else if (NU.isApp()) {
    how = '이 앱 판에는 아직 아이콘 만들기가 없습니다. 다음 판에서 [추가] 한 번으로 됩니다.<br>지금은 휴대폰 <b>크롬</b>에서 이 화면을 열어 메뉴(⋮) → <b>홈 화면에 추가</b>를 누르시면 됩니다.';
  } else if (p === 'ios') {
    how = '사파리 아래 <b>공유</b> 단추(□↑) → <b>홈 화면에 추가</b> → [추가].<br>이름이 "' + NU.esc(line.name) + '" 으로 들어갑니다.';
  } else if (p === 'android') {
    how = '크롬 오른쪽 위 <b>⋮</b> → <b>홈 화면에 추가</b> → [추가].<br>이름이 "' + NU.esc(line.name) + '" 으로 들어갑니다.';
  } else {
    how = '휴대폰에서 이 라인 화면을 열고 브라우저 메뉴의 <b>홈 화면에 추가</b>를 누르세요.';
  }
  NU.sheet('<h2>바탕화면에 "' + NU.esc(line.name) + '" 아이콘 놓기</h2>' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><img alt="" src="' + NU.iconDataUrl(NU.glyph(line), line.color, 128) + '" style="width:56px;height:56px;border-radius:16px">' +
    '<b style="font-size:17px">' + NU.esc(line.name) + '</b></div>' +
    '<p class="nu-sub" style="color:var(--nu-ink)">' + how + '</p>' +
    '<button class="nu-btn ghost" data-close style="margin-top:14px">알겠어요</button>');
};

/* 아래에서 올라오는 판 */
NU.sheet = function(html){
  NU.closeSheet();
  var bg = document.createElement('div'); bg.className = 'nu-sheet-bg'; bg.id = 'nuSheetBg';
  var sh = document.createElement('div'); sh.className = 'nu-sheet'; sh.id = 'nuSheet';
  sh.setAttribute('role', 'dialog');
  sh.innerHTML = '<div class="grip"></div>' + html;
  bg.onclick = NU.closeSheet;
  document.body.appendChild(bg); document.body.appendChild(sh);
  sh.querySelectorAll('[data-close]').forEach(function(b){ b.onclick = NU.closeSheet; });
  return sh;
};
NU.closeSheet = function(){
  ['nuSheetBg', 'nuSheet'].forEach(function(id){ var e = document.getElementById(id); if (e) e.remove(); });
};

NU.showErr = function(id, msg){ var e = document.getElementById(id); if (!e) return; e.textContent = msg; e.classList.toggle('on', !!msg); };

/* 색 고르개 */
NU.colorPicker = function(box, value, onChange){
  box.innerHTML = '';
  NU.COLORS.forEach(function(c){
    var b = document.createElement('button');
    b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', '색 ' + c);
    b.setAttribute('aria-pressed', String(c === value));
    b.onclick = function(){
      box.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true'); onChange(c);
    };
    box.appendChild(b);
  });
};

/* 누름 화면 공통 시작: 로그인 확인 */
NU.boot = async function(){
  if (typeof AL === 'undefined' || !AL.sb) {
    document.body.innerHTML = '<div style="padding:24px;line-height:1.7">화면을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</div>';
    return null;
  }
  return await AL.requireLogin();
};

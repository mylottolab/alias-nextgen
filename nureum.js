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

/* 🔴 2026-10-30 — 휴대폰 망이 잠깐 끊겨 "Failed to fetch" 가 나면 두 번 더 해 봅니다(손님 제보) */
NU.netErr = function(e){ var m = String((e && (e.message || e.details)) || e || ''); return /Failed to fetch|NetworkError|Load failed|network/i.test(m); };
NU.rpc = async function(fn, args){
  var last;
  for (var i = 0; i < 3; i++) {
    try {
      var r = await AL.sb.rpc(fn, args || {});
      if (r.error) { if (NU.netErr(r.error) && i < 2) { last = r.error; await new Promise(function(res){ setTimeout(res, 800 * (i + 1)); }); continue; } throw r.error; }
      return r.data;
    } catch (e) {
      last = e;
      if (!NU.netErr(e) || i === 2) break;
      await new Promise(function(res){ setTimeout(res, 800 * (i + 1)); });
    }
  }
  if (NU.netErr(last)) throw new Error('인터넷 연결이 잠깐 끊겼어요. 와이파이나 데이터를 확인하고 다시 눌러 주세요.');
  throw last;
};

/* 아이콘 그림 (바탕화면 바로가기 · 탭 아이콘에 씁니다) */
/* 🔴 2026-10-31 — 사진이 있으면 사진으로(img: 미리 읽어 둔 그림). 없으면 색 + 글자 */
NU.iconDataUrl = function(glyph, color, size, img, square){
  size = size || 192;
  var c = document.createElement('canvas'); c.width = c.height = size;
  var x = c.getContext('2d');
  var r = square ? 0 : size * 0.32;   // 🔴 v28 — 삼성 아이콘처럼 더 둥글게 (아이폰 위젯용은 네모: 위젯이 직접 둥글게 자릅니다)
  x.fillStyle = color || '#E4572E';
  x.beginPath();
  x.moveTo(r, 0); x.arcTo(size, 0, size, size, r); x.arcTo(size, size, 0, size, r);
  x.arcTo(0, size, 0, 0, r); x.arcTo(0, 0, size, 0, r); x.closePath(); x.fill();
  if (img && img.naturalWidth) {
    x.save(); x.clip();
    var iw = img.naturalWidth, ih = img.naturalHeight, k = Math.max(size / iw, size / ih);
    x.drawImage(img, (size - iw * k) / 2, (size - ih * k) / 2, iw * k, ih * k);
    x.restore();
    return c.toDataURL('image/png');
  }
  x.fillStyle = '#FFFFFF';
  x.font = '900 ' + Math.round(size * 0.5) + 'px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(glyph || '누', size / 2, size * 0.54);
  return c.toDataURL('image/png');
};

/* 🔴 2026-10-31 — 라인 사진을 미리 읽어 둡니다(아이콘 그리기 전에) */
NU.loadPhoto = function(line){
  return new Promise(function(res){
    if (!line || !line.photo) { res(null); return; }
    if (line._img) { res(line._img); return; }
    var im = new Image();
    im.onload = function(){ line._img = im; res(im); };
    im.onerror = function(){ res(null); };
    im.src = line.photo;
  });
};
NU.icon = async function(line, size, square){
  var im = await NU.loadPhoto(line);
  return NU.iconDataUrl(NU.glyph(line), line.color, size || 192, im, square);
};
/* 화면에 그릴 아이콘 칸(사진이면 사진, 아니면 글자) */
NU.icoHtml = function(line, extraStyle){
  var st = 'background:' + NU.esc(line.color || '#E4572E') + ';' + (extraStyle || '');
  if (line.photo) return '<span class="nu-ico" style="' + st + ';background-image:url(' + NU.esc(line.photo) + ');background-size:cover;background-position:center" aria-label="' + NU.esc(line.name) + '"></span>';
  return '<span class="nu-ico" style="' + st + '">' + NU.esc(NU.glyph(line)) + '</span>';
};
/* 휴대폰 사진첩에서 사진 하나 고르기 → 가운데를 네모로 잘라 256 크기 JPEG(약 20~40KB) */
NU.pickPhoto = function(){
  return new Promise(function(res){
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.style.display = 'none'; document.body.appendChild(inp);
    inp.onchange = function(){
      var f = inp.files && inp.files[0]; inp.remove();
      if (!f) { res(null); return; }
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function(){
        var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
        var x = c.getContext('2d'), iw = im.naturalWidth, ih = im.naturalHeight, k = Math.max(S / iw, S / ih);
        x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, S, S);
        x.drawImage(im, (S - iw * k) / 2, (S - ih * k) / 2, iw * k, ih * k);
        URL.revokeObjectURL(url);
        var q = 0.85, out = c.toDataURL('image/jpeg', q);
        while (out.length > 110000 && q > 0.4) { q -= 0.15; out = c.toDataURL('image/jpeg', q); }
        res(out);
      };
      im.onerror = function(){ URL.revokeObjectURL(url); res(null); };
      im.src = url;
    };
    inp.click();
  });
};

/* 이 화면의 이름 · 아이콘을 라인에 맞춥니다.
   그러면 휴대폰 브라우저의 "홈 화면에 추가" 가 그 사람 이름 · 그림으로 아이콘을 만듭니다. */
NU.setPageIcon = async function(line){
  var url = await NU.icon(line, 192);
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

/* 🔴 2026-10-31 — 아이폰 앱 1.7 부터 바탕화면 "누름 위젯"이 있습니다(AliasNative.nureumWidget).
   그 전 판 아이폰 앱에는 [바탕화면에 놓기]를 숨깁니다(애플 심사: 안 되는 단추를 두지 않기) */
NU.iosWidget = function(){
  try { return NU.isApp() && NU.platform() === 'ios' && !!(window.AliasNative && AliasNative.nureumWidget && typeof AliasNative.nureumSync === 'function'); }
  catch (e) { return false; }
};
NU.widgetV = function(){ try { return Number((window.AliasNative && AliasNative.nureumWidgetV) || (NU.iosWidget() ? 1 : 0)); } catch (e) { return 0; } };
NU.canPin = function(){ return !(NU.isApp() && NU.platform() === 'ios') || NU.iosWidget(); };

/* 🔴 2026-10-31 — 아이폰 위젯에 내 라인 목록(이름 · 그림)을 넣어 둡니다.
   위젯은 인터넷을 쓰지 않고 이 목록만 봅니다. 라인 화면 · 첫 화면을 열 때마다 새로 넣습니다. */
NU._syncT = null;
NU.syncWidget = function(lines){
  if (!NU.iosWidget()) return Promise.resolve(false);
  return new Promise(function(res){
    clearTimeout(NU._syncT);
    NU._syncT = setTimeout(async function(){
      try {
        if (!lines) lines = await NU.rpc('nureum_my_lines');
        var items = [];
        for (var i = 0; i < lines.length && items.length < 40; i++) {
          var l = lines[i];
          if (!l || !l.id || l.link_id === null || l.ended) continue;   // 짝 맺은 라인만
          var ic = await NU.icon(l, 256, true);
          items.push({ id: l.id, name: l.name, color: l.color || '', icon: ic.split(',')[1] });
        }
        AliasNative.nureumSync(items);
        res(true);
      } catch (e) { console.warn('[nureum] syncWidget', e); res(false); }
    }, 300);
  });
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
NU.pin = async function(line){
  var iconUrl = await NU.icon(line, 192);
  var url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'nureum_line.html?line=' + line.id;
  if (window.AliasNative && typeof AliasNative.pinShortcut === 'function') {
    try {
      var ok = AliasNative.pinShortcut(JSON.stringify({
        id: 'nureum_' + line.id, name: line.name, url: 'https://burum.kr/nureum_line.html?line=' + line.id,
        icon: iconUrl.split(',')[1],
      }));
      if (ok !== false) {
        /* 🔴 v27 앱 — 위젯으로 놓았는지, 바로가기로 놓았는지(부름 표시 붙음) 알려 줍니다 */
        var kind = '';
        try { if (typeof AliasNative.lastPinKind === 'function') kind = String(AliasNative.lastPinKind() || ''); } catch (e) {}
        NU.sheet('<h2>휴대폰이 묻는 창에서 [추가]를 눌러 주세요</h2>' +
          (kind ? '<p class="nu-sub" style="margin:0 0 6px">' + (kind.indexOf('widget') === 0 ? '방식: 위젯(부름 표시 없음)' : '방식: 바로가기 · ' + NU.esc(kind)) + '</p>' : '') +
          '<p class="nu-sub" style="color:var(--nu-ink)">바탕화면에 <b>' + NU.esc(line.name) + '</b> 아이콘이 생깁니다. 다음부터는 그 아이콘만 누르시면 이 화면이 바로 열려요.</p>' +
          '<p class="nu-sub">창이 안 뜨면 바탕화면 빈 곳을 꾹 → 설정 → "홈 화면 레이아웃 잠금" 이 꺼져 있는지 봐 주세요.</p>' +
          '<button class="nu-btn ghost" data-close>알겠어요</button>');
        return;
      }
    } catch (e) { console.warn('[nureum] pinShortcut', e); }
  }
  /* 🔴 2026-10-31 — 아이폰 앱 1.7: 위젯 목록을 넣고, 위젯 놓는 법을 알려 드립니다 */
  if (NU.iosWidget()) {
    await NU.syncWidget();
    NU.sheet('<h2>바탕화면에 "' + NU.esc(line.name) + '" 위젯 놓기</h2>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><img alt="" src="' + iconUrl + '" style="width:56px;height:56px;border-radius:16px">' +
      '<b style="font-size:17px">' + NU.esc(line.name) + '</b></div>' +
      '<ol class="nu-sub" style="color:var(--nu-ink);padding-left:20px;margin:0;line-height:1.7">' +
      '<li>바탕화면 빈 곳을 <b>꾹</b> 누르세요(아이콘이 흔들릴 때까지).</li>' +
      '<li>왼쪽 위 <b>[편집]</b> → <b>[위젯 추가]</b>.</li>' +
      '<li>검색 칸에 <b>부름</b> → <b>누름</b> → 아래 <b>[위젯 추가]</b>.</li>' +
      '<li>놓인 위젯을 <b>꾹</b> → <b>[위젯 편집]</b> → 사람에서 <b>' + NU.esc(line.name) + '</b> 고르기.</li>' +
      '</ol>' +
      '<p class="nu-sub" style="margin-top:10px">사람마다 위젯을 하나씩 놓을 수 있어요. 다음부터는 위젯만 누르시면 이 화면이 바로 열립니다.</p>' +
      (NU.widgetV() >= 2 ? '<p class="nu-sub" style="margin-top:6px;color:var(--nu-ink)"><b>더 있어요</b><br>' +
        '· [위젯 편집] → <b>모양</b>: 기본 · 액자 · 색 바탕 · 전화 단추<br>' +
        '· 위젯 고를 때 옆으로 넘기면 <b>여러 사람</b>(한 판에 2~4명)<br>' +
        '· <b>잠금 화면</b>: 잠금 화면 꾹 → [사용자화] → 잠금 화면 → 시계 아래 칸 → 부름<br>' +
        '· <b>제어 센터</b>: 오른쪽 위에서 쓸어내리기 → 왼쪽 위 [+] → [제어 항목 추가] → 부름 → 누름 걸기<br>' +
        '· <b>잠금 화면 아래 단추</b>(손전등 · 카메라 자리): 잠금 화면 꾹 → [사용자화] → 잠금 화면 → 아래 단추 ⊖ → ⊕ → 부름 → 누름 걸기. 휴대폰을 켜자마자 꾹!<br>' +
        '· <b>옆면 동작 버튼</b>(아이폰 15 Pro 이상): 설정 → 동작 버튼 → 옆으로 넘겨 [제어] → 부름 → 누름 걸기. 옆 단추 하나로 바로 연결!</p>' : '') +
      '<button class="nu-btn ghost" data-close style="margin-top:12px">알겠어요</button>');
    return;
  }
  var p = NU.platform(), how;
  if (NU.isApp() && p === 'ios') {
    how = '<b>아이폰</b>은 앱이 아이콘을 따로 만들 수 없어 <b>위젯</b>으로 놓습니다.<br>바탕화면 빈 곳을 꾹 → 왼쪽 위 [편집] → [위젯 추가] → 부름 → 누름 위젯.<br><span style="color:var(--nu-sub)">(누름 위젯은 아이폰 앱 다음 판에 들어갑니다)</span>';
  } else if (NU.isApp()) {
    how = '부름 앱을 <b>최신 판으로 업데이트</b>하시면 [추가] 한 번으로 아이콘이 생깁니다.<br>(플레이스토어 → 부름 → 업데이트)';
  } else if (p === 'ios') {
    how = '사파리 아래 <b>공유</b> 단추(□↑) → <b>홈 화면에 추가</b> → [추가].<br>이름이 "' + NU.esc(line.name) + '" 으로 들어갑니다.';
  } else if (p === 'android') {
    var sam = /SamsungBrowser/i.test(navigator.userAgent);
    how = sam
      ? '<b>삼성 인터넷</b>: 아래쪽 메뉴(≡) → <b>현재 페이지 추가</b> → <b>홈 화면</b> → [추가].'
      : '<b>크롬</b>: 메뉴 <b>⋮</b>(위쪽 또는 아래쪽) → <b>홈 화면에 추가</b> → [추가].<br>' +
        '메뉴에 안 보이면 <b>전송, 저장 및 공유</b>(또는 <b>공유</b>)를 눌러 그 안에서 <b>홈 화면에 추가</b>를 찾으세요.';
    how += '<br>이름이 "' + NU.esc(line.name) + '" 으로 들어갑니다.';
  } else {
    how = '휴대폰에서 이 라인 화면을 열고 브라우저 메뉴의 <b>홈 화면에 추가</b>를 누르세요.';
  }
  NU.sheet('<h2>바탕화면에 "' + NU.esc(line.name) + '" 아이콘 놓기</h2>' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><img alt="" src="' + iconUrl + '" style="width:56px;height:56px;border-radius:16px">' +
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

/* 🔴 2026-10-30 — 로그인 안 된 분(부름 가입 전)도 누름 화면이 그대로 남아 있게.
   첫 화면 · 짝 맺기 화면은 튕기지 않고 "시작하기" 안내를 보여 줍니다.
   ⚠ 앱이 막 깨어날 때는 로그인 정보가 늦게 나오므로 2초 동안 몇 번 더 물어봅니다. */
NU.session = async function(){
  if (typeof AL === 'undefined' || !AL.sb) return null;
  for (var i = 0; i < 9; i++) {
    try { var r = await AL.sb.auth.getSession(); if (r.data && r.data.session) return r.data.session.user; } catch (e) {}
    await new Promise(function(res){ setTimeout(res, 250); });
  }
  return null;
};
NU.loginUrl = function(signup){
  var here = location.pathname.split('/').pop() + location.search;
  return 'alias_auth.html?next=' + encodeURIComponent(here);
};
/* 로그인 전 안내 판 — box 안을 채웁니다 */
NU.welcome = function(box, lead){
  /* 🔴 2026-11-01 — 가입 없이 바로 시작이 첫째. 부름 계정이 있는 분은 로그인 */
  box.innerHTML =
    '<div class="nu-card" style="border-color:#E4572E;gap:12px">' +
      '<b style="font-size:19px">' + (lead || '한 사람과만, 누르면 바로') + '</b>' +
      '<span class="nu-sub" style="margin:0;color:var(--nu-ink)">누름은 정해진 한 사람과만 쓰는 직통 연결입니다. 라인마다 바탕화면 아이콘이 생기고, 누르면 그 사람에게 바로 전화 · 영상 · 사진 · 문자를 보낼 수 있어요. 서로 전화번호는 보이지 않습니다.</span>' +
      '<span class="nu-sub" style="margin:0"><b>가입 없이</b> 바로 시작할 수 있어요. 아이디는 나중에 만들어도 됩니다.</span>' +
    '</div>' +
    '<button class="nu-btn" type="button" id="nuAnonGo">가입 없이 바로 시작</button>' +
    '<a class="nu-btn line" href="nureum_join.html">받은 코드 · QR로 바로 연결</a>' +
    '<a class="nu-btn ghost" href="' + NU.loginUrl(false) + '">부름 계정이 있어요 · 로그인</a>' +
    '<div id="nuAnonErr" class="nu-err" role="alert"></div>';
  box.querySelector('#nuAnonGo').onclick = async function(){
    this.disabled = true;
    try { await NU.startAnon(); location.reload(); }
    catch (e) { this.disabled = false; NU.showErr('nuAnonErr', NU.anonErrText(e)); }
  };
};

/* =====================================================================
   🔴 2026-11-01 — 가입 없이 시작 (익명 계정)
   · 이 휴대폰에서만 쓰는 계정이 바로 생깁니다(Supabase 익명 로그인).
   · 나중에 [계정 지키기]로 아이디 · 비밀번호를 붙이면 같은 계정 그대로 부름 계정이 됩니다.
   · 이용권을 살 때는 꼭 계정을 지키게 합니다(휴대폰을 바꾸면 사라지니까).
   ===================================================================== */
NU.isAnon = function(user){ return !!(user && (user.is_anonymous || (!user.email && !user.phone))); };
NU.startAnon = async function(){
  var r = await AL.sb.auth.signInAnonymously({ options: { data: { app: 'nureum' } } });   // 🔴 2026-11-09 앱별 가입 통계
  if (r.error) throw r.error;
  try { localStorage.setItem('burum_first_screen', 'nureum'); } catch (e) {}
  return r.data && r.data.user;
};
NU.anonErrText = function(e){
  var m = String((e && e.message) || e || '');
  if (/anonymous.*disabled|Anonymous sign-ins are disabled/i.test(m)) return '지금은 가입 없이 시작을 쓸 수 없어요. [로그인]으로 들어와 주세요. (관리자: 익명 로그인 켜기)';
  if (NU.netErr(e)) return '인터넷 연결이 잠깐 끊겼어요. 다시 눌러 주세요.';
  return '시작하지 못했어요: ' + m;
};
/* 로그인 안 됐으면 익명으로 시작하고, 됐으면 그대로 */
NU.quickSession = async function(){
  try { var r = await AL.sb.auth.getSession(); return (r.data && r.data.session) ? r.data.session.user : null; } catch (e) { return null; }
};
NU.ensureUser = async function(){
  var u = await NU.quickSession();   // 화면을 연 지 한참 뒤라 바로 물어봐도 됩니다
  if (u) return u;
  return await NU.startAnon();
};

/* [계정 지키기] — 아이디 · 비밀번호를 붙입니다. 같은 계정 그대로(라인 · 이용권 그대로).
   끝나면 true, 닫으면 false */
NU.protect = function(reason){
  return new Promise(function(res){
    var done = false;
    var sh = NU.sheet('<h2>계정 지키기</h2>' +
      '<p class="nu-sub" style="color:var(--nu-ink)">' + (reason || '지금은 이 휴대폰에서만 쓰는 계정이에요. 아이디 · 비밀번호를 만들어 두면 휴대폰을 바꿔도 라인 · 이용권이 그대로 남아요.') + '</p>' +
      '<label class="nu-lbl" for="pkNick">아이디 (닉네임)</label><input class="nu-in" id="pkNick" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="20">' +
      '<label class="nu-lbl" for="pkPw" style="margin-top:10px">비밀번호 (8자 이상)</label><input class="nu-in" id="pkPw" type="password" autocomplete="new-password">' +
      '<div id="pkErr" class="nu-err" role="alert"></div>' +
      '<button class="nu-btn" id="pkGo" type="button" style="margin-top:12px">계정 지키기</button>' +
      '<button class="nu-btn ghost" data-close type="button" style="margin-top:8px">나중에</button>');
    sh.querySelector('[data-close]').addEventListener('click', function(){ if (!done) res(false); });
    sh.querySelector('#pkGo').onclick = async function(){
      var btn = this; NU.showErr('pkErr', '');
      var nc = AL.checkNick(sh.querySelector('#pkNick').value);
      if (!nc.ok) { NU.showErr('pkErr', nc.msg); return; }
      var pw = sh.querySelector('#pkPw').value;
      if (pw.length < 8) { NU.showErr('pkErr', '비밀번호는 8자 이상으로 해 주세요.'); return; }
      btn.disabled = true;
      try {
        var r1 = await AL.sb.auth.updateUser({ email: AL.nicknameToEmail(nc.nick) });
        if (r1.error) {
          var m = String(r1.error.message || '').toLowerCase();
          if (/already|registered|exists/.test(m)) throw new Error('이미 있는 아이디예요. 다른 아이디로 해 주세요.');
          throw r1.error;
        }
        var r2 = await AL.sb.auth.updateUser({ password: pw });
        if (r2.error) throw r2.error;
        /* 복구 코드(가입할 때와 같은 방식). 해시만 저장 */
        var code = AL.makeRecoveryCode(), hash = await AL.hashRecoveryCode(code);
        var uid = (await AL.sb.auth.getSession()).data.session.user.id;
        await AL.sb.from('recovery_codes').insert({ account_id: uid, code_hash: hash });
        done = true;
        NU.sheet('<h2>계정을 지켰어요</h2>' +
          '<p class="nu-sub" style="color:var(--nu-ink)">이제 아이디 <b>' + NU.esc(nc.nick) + '</b> 로 어느 휴대폰에서든 들어올 수 있어요.</p>' +
          '<p class="nu-sub">비밀번호를 잊었을 때 쓰는 <b>복구 코드</b>입니다. 사진을 찍거나 적어 두세요. 다시 보여 드리지 않아요.</p>' +
          '<div class="nu-code" style="font-size:20px;letter-spacing:2px;margin:8px 0">' + NU.esc(code) + '</div>' +
          '<button class="nu-btn ghost" data-close type="button">적어 뒀어요</button>');
        res(true);
      } catch (e) {
        btn.disabled = false;
        NU.showErr('pkErr', NU.netErr(e) ? '인터넷 연결이 잠깐 끊겼어요. 다시 눌러 주세요.' : (e.message || String(e)));
      }
    };
  });
};

/* 🔴 2026-11-01 — 짝이 맺어지면 바로 바탕화면 아이콘을 권합니다.
   안드로이드 앱: 곧바로 휴대폰 "추가" 창을 띄웁니다(단추 찾을 필요 없음).
   그 밖: 큰 단추 하나짜리 판을 띄웁니다. */
NU.offerPin = function(line){
  if (!line || !NU.canPin()) return;
  var key = 'nureum_pin_offered_' + line.id;
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) {}
  if (NU.isApp() && NU.platform() === 'android' && window.AliasNative && typeof AliasNative.pinShortcut === 'function') {
    setTimeout(function(){ NU.pin(line); }, 700);
    return;
  }
  setTimeout(function(){
    var sh = NU.sheet('<h2>바탕화면에 "' + NU.esc(line.name) + '" 아이콘을 놓을까요?</h2>' +
      '<p class="nu-sub" style="color:var(--nu-ink)">놓아 두면 다음부터는 앱을 찾을 필요 없이 아이콘만 누르시면 됩니다.</p>' +
      '<button class="nu-btn" id="opGo" type="button">네, 놓을게요</button>' +
      '<button class="nu-btn ghost" data-close type="button" style="margin-top:8px">나중에</button>');
    sh.querySelector('#opGo').onclick = function(){ NU.closeSheet(); NU.pin(line); };
  }, 500);
};

/* 🔴 2026-10-31 — "이 사람에게 보일 내 별칭" 고르개.
   별칭마다 이름 · 얼굴 사진 · 갤러리가 따로라, 사람(용도)마다 다른 모습을 보여 줄 수 있습니다.
   기본 별칭이 먼저 골라져 있습니다. 고른 별칭은 NU._alias 에 둡니다. */
NU.aliasPicker = function(box, aliases){
  NU._alias = aliases[0] || null;
  if (!aliases.length) { box.innerHTML = ''; return; }
  function paint(){
    box.innerHTML = '<span class="nu-lbl">이 사람에게 보일 내 별칭 <span style="font-weight:500;color:var(--nu-sub)">(이름 · 갤러리가 이걸로 보여요)</span></span>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' + aliases.map(function(a, i){
        var on = NU._alias && NU._alias.id === a.id;
        return '<button type="button" data-i="' + i + '" aria-pressed="' + on + '" style="min-height:44px;padding:0 14px;border-radius:14px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;' +
          'border:2px solid ' + (on ? 'var(--nu-main)' : 'var(--nu-line)') + ';background:' + (on ? 'rgba(228,87,46,.08)' : 'var(--nu-bg)') + ';color:var(--nu-ink)">' +
          NU.esc(a.display_name) + (a.is_default ? ' <span style="font-weight:500;font-size:12px;color:var(--nu-sub)">기본</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<p class="nu-sub" style="margin:6px 0 0">별칭 · 갤러리는 부름 <b>[나]</b> 화면에서 더 만들고 꾸밀 수 있어요.</p>';
    box.querySelectorAll('[data-i]').forEach(function(b){ b.onclick = function(){ NU._alias = aliases[+b.dataset.i]; paint(); }; });
  }
  paint();
};

/* 누름 화면 공통 시작: 로그인 확인 */
NU.boot = async function(){
  if (typeof AL === 'undefined' || !AL.sb) {
    document.body.innerHTML = '<div style="padding:24px;line-height:1.7">화면을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</div>';
    return null;
  }
  /* 🔴 2026-11-01 — 로그인 안 됐으면 가입 화면으로 보내지 않고, 이 자리에서 [가입 없이 바로 시작] */
  var u = await NU.session();
  if (u) return u;
  NU.showWelcome();
  return null;
};
NU.showWelcome = function(lead){
  var host = document.querySelector('.nu');
  if (!host) return;
  Array.prototype.forEach.call(host.children, function(e){ if (!e.classList.contains('nu-top')) e.classList.add('nu-hidden'); });
  var w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:12px';
  host.appendChild(w); NU.welcome(w, lead);
};

/* 🔴 2026-11-01 — 누름 [나] 판: 계정 지키기 · 첫 화면 · 별칭 · 부름 · 로그아웃 */
NU.meSheet = async function(){
  var u = await NU.session();
  var anon = NU.isAnon(u);
  var nick = '';
  try { nick = decodeURIComponent(String((u && u.email) || '').split('@')[0]); } catch (e) {}
  var first = ''; try { first = localStorage.getItem('burum_first_screen') || ''; } catch (e) {}
  var sh = NU.sheet('<h2>나</h2>' +
    (anon
      ? '<div class="nu-note" style="margin-bottom:10px"><b>이 휴대폰에서만 쓰는 계정</b>이에요. 휴대폰을 바꾸거나 앱을 지우면 라인이 사라질 수 있어요.</div>' +
        '<button class="nu-btn" id="mProtect" type="button">계정 지키기 (아이디 만들기)</button>'
      : '<p class="nu-sub" style="margin:0 0 10px">로그인: <b>' + NU.esc(nick || '부름 계정') + '</b></p>') +
    '<button class="nu-btn ghost" id="mFirst" type="button" style="margin-top:8px">' + (first === 'nureum' ? '앱을 열면: 누름 화면 ✓ (부름으로 바꾸기)' : '앱을 열면 누름 화면부터 보기') + '</button>' +
    '<a class="nu-btn ghost" href="alias_me.html" style="margin-top:8px">내 별칭 · 사진 · 갤러리</a>' +
    '<a class="nu-btn ghost" href="alias_contacts.html" style="margin-top:8px">부름 메신저 열기</a>' +
    '<button class="nu-btn ghost" id="mOut" type="button" style="margin-top:8px">로그아웃</button>' +
    '<button class="nu-btn ghost" data-close type="button" style="margin-top:8px">닫기</button>');
  var bp = sh.querySelector('#mProtect');
  if (bp) bp.onclick = function(){ NU.protect(); };
  sh.querySelector('#mFirst').onclick = function(){
    try { localStorage.setItem('burum_first_screen', first === 'nureum' ? 'contacts' : 'nureum'); } catch (e) {}
    NU.meSheet();
  };
  sh.querySelector('#mOut').onclick = async function(){
    if (anon) {
      if (!confirm('가입 없이 쓰는 계정은 로그아웃하면 다시 들어올 수 없어요. 라인도 다시 맺어야 해요.\n\n그래도 로그아웃할까요? (먼저 [계정 지키기]를 권해요)')) return;
    } else if (!confirm('로그아웃할까요?')) return;
    await AL.sb.auth.signOut(); location.href = 'nureum.html';
  };
};

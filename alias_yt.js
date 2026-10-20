/* =====================================================================
   🔴🔴 2026-10-20 — 대화창 위 유튜브 고정 (부름)

   어떻게 쓰나
     · 대화에 유튜브 링크가 오가면 말풍선 아래 [📺 위에 띄우기]
     · 누르면 [📺 나만 보기] (내 폰에서만) / [👥 같이 보기] (방 모두의 대화창 위에)
     · 영상 칸: ⏸/▶ (내 화면만) · ➖/➕ 크기 · ↗ 유튜브 앱에서 열기 · ✕ 내 화면에서 치우기
                · ⬇ 모두에게서 내리기 (1:1 은 두 사람 모두 · 단체방은 띄운 사람 · 방장)
     · 치운 뒤에는 위에 "📺 영상 다시 보기" 띠가 남습니다. 새 영상이 걸리면 다시 나타납니다.

   지키는 것 (유튜브 규칙)
     · 공식 영상 창(임베드)으로만 틉니다 — 영상 · 광고 그대로
     · 치우면 소리도 멈춥니다(영상 없이 소리만 틀지 않음)
   🔒 잠긴 방(종단 암호화)에서는 서버에 어떤 영상인지 남지 않게 "나만 보기" 만 됩니다.

   서버: 12_youtube_pin.sql (yt_pin_get · yt_pin_set · yt_pin_clear)
   화면: alias_chat.html 이 AL.yt.init / AL.yt.listen / AL.yt.btn 을 부릅니다.
   ===================================================================== */
window.AL = window.AL || {};
(function(){
  var S = { linkId: null, sideId: null, name: '', locked: false, chan: null,
            shared: null,   // { video, mine, can_clear }
            local: null,    // 나만 보기 video id
            showing: null,  // 지금 칸에 걸린 video id
            big: false, paused: false };
  var en = function(){ return AL.lang === 'en'; };
  var L = function(k, e){ return en() ? e : k; };

  /* 영상이면 11자리 번호, 재생목록(앨범)이면 'L:목록번호' — 🔴 2026-10-20 재생목록도 됩니다 */
  AL.ytId = function(text){
    if (!text) return null;
    var m = String(text).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^ ]*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    var l = String(text).match(/youtube\.com\/(?:playlist|watch)\?(?:[^ ]*&)?list=([A-Za-z0-9_-]{10,64})/);
    return l ? 'L:' + l[1] : null;
  };
  AL.ytEmbed = function(v){
    return v.indexOf('L:') === 0
      ? 'https://www.youtube.com/embed/videoseries?list=' + v.slice(2) + '&enablejsapi=1&playsinline=1&rel=0'
      : 'https://www.youtube.com/embed/' + v + '?enablejsapi=1&playsinline=1&rel=0&modestbranding=1';
  };
  AL.ytWatch = function(v){ return v.indexOf('L:') === 0 ? 'https://www.youtube.com/playlist?list=' + v.slice(2) : 'https://www.youtube.com/watch?v=' + v; };

  function css(){
    if (document.getElementById('ytCss')) return;
    var st = document.createElement('style'); st.id = 'ytCss';
    st.textContent =
      '#ytBox{flex:0 0 auto;margin:6px 10px 4px;border-radius:14px;overflow:hidden;background:#000;border:1px solid rgba(128,128,128,.35)}' +
      '#ytBox .yf{position:relative;width:100%;height:150px;background:#000}' +
      '#ytBox.big .yf{height:auto;aspect-ratio:16/9;max-height:46vh}' +
      '#ytBox iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
      '#ytBox .yc{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:7px 8px;background:rgba(20,26,36,.96);color:#EEF2F7}' +
      '#ytBox .yc button{margin:0;padding:6px 10px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;' +
        'background:rgba(255,255,255,.08);color:#EEF2F7;border:1px solid rgba(255,255,255,.18)}' +
      '#ytBox .yc button.bad{background:rgba(255,120,120,.12);color:#FFB4B4;border-color:rgba(255,120,120,.4)}' +
      '#ytBox .yc .yl{font-size:11.5px;opacity:.75;margin-right:auto}' +
      '#ytStrip{flex:0 0 auto;margin:6px 10px 2px;padding:8px 12px;border-radius:12px;cursor:pointer;font-size:13.5px;font-weight:700;' +
        'background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.4);display:none}' +
      '.ytpin{display:inline-block;margin:8px 0 0;padding:7px 12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;' +
        'background:rgba(255,60,60,.14);color:inherit;border:1px solid rgba(255,80,80,.45)}' +
      '#ytNote{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:9000;padding:9px 14px;border-radius:12px;' +
        'background:rgba(20,26,36,.95);color:#fff;font-size:13.5px;max-width:86vw;text-align:center;display:none}' +
      '#ytBox .yhold{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;' +
        'background:#000 center/cover no-repeat;color:#fff;text-align:center;padding:10px}' +
      '#ytBox .yhold b{background:#FF4D4D;padding:9px 16px;border-radius:999px;font-size:14px}' +
      '#ytBox .yhold small{background:rgba(0,0,0,.65);padding:4px 9px;border-radius:8px;font-size:12px}' +
      '#ytBox .ydata{display:flex;gap:8px;align-items:center;padding:7px 10px;background:#2A2410;color:#FFE7A3;font-size:12px;line-height:1.45}' +
      '#ytBox .ydata button{margin:0 0 0 auto;flex:0 0 auto;padding:5px 9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.1);color:#FFE7A3;border:1px solid rgba(255,231,163,.4)}';
    document.head.appendChild(st);
  }
  function note(t){
    var n = document.getElementById('ytNote');
    if (!n) { n = document.createElement('div'); n.id = 'ytNote'; document.body.appendChild(n); }
    n.textContent = t; n.style.display = 'block';
    clearTimeout(note._t); note._t = setTimeout(function(){ n.style.display = 'none'; }, 3200);
  }
  function hideKey(){ return 'yt_hide_' + S.linkId; }
  function hiddenVid(){ try { return localStorage.getItem(hideKey()); } catch (e) { return null; } }
  function setHidden(v){ try { if (v) localStorage.setItem(hideKey(), v); else localStorage.removeItem(hideKey()); } catch (e) {} }

  /* 🔴 2026-10-20 데이터 아끼기
     · 남이 띄운 영상을 모바일 데이터에서 저절로 틀지 않습니다(눌러야 재생 · 누르기 전엔 데이터 0).
       - 휴대폰이 모바일 데이터라고 알려 줄 때(안드로이드 등), 또는
       - "나" → 데이터 아끼기 → "사진·파일은 와이파이에서만" 을 켠 분이 와이파이인지 모를 때(아이폰 등)
     · 영상 칸을 처음 볼 때 "영상은 휴대폰 데이터를 씁니다" 를 [알겠어요] 누를 때까지 알려 줍니다. */
  function dataHold(){
    var w = AL.onWifi ? AL.onWifi() : null;
    if (w === false) return true;
    return !!(AL.dataPrefs && AL.dataPrefs.media_wifi_only && w !== true);
  }
  function dataSeen(){ try { return localStorage.getItem('yt_data_ok_v1') === '1'; } catch (e) { return true; } }
  var DATA_LINE = function(){ return L('📶 영상은 휴대폰 데이터를 씁니다 — 노래 한 곡(4분)에 약 20~30MB, [크게]는 더 씁니다. 와이파이에서 보시길 권해요. 부름 저장 공간은 쓰지 않습니다.',
    '📶 Videos use mobile data — about 20–30MB per 4-minute song, more when enlarged. Wi-Fi is recommended. Burum storage is not used.'); };

  function host(){
    var top = document.querySelector('.chat-top');
    var box = document.getElementById('ytBox'), strip = document.getElementById('ytStrip');
    if (!strip) {
      strip = document.createElement('div'); strip.id = 'ytStrip';
      strip.onclick = function(){ setHidden(null); paint(); };
      if (top && top.parentNode) top.parentNode.insertBefore(strip, top.nextSibling); else document.body.prepend(strip);
    }
    if (!box) {
      box = document.createElement('div'); box.id = 'ytBox'; box.style.display = 'none';
      if (top && top.parentNode) top.parentNode.insertBefore(box, strip.nextSibling); else document.body.prepend(box);
    }
    return { box: box, strip: strip };
  }

  function cmd(func){
    var f = document.querySelector('#ytBox iframe');
    try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*'); } catch (e) {}
  }

  /* 무엇을 띄울지 정하고 그립니다 — 나만 보기가 있으면 그것, 아니면 같이 보기(치우지 않았으면) */
  function paint(){
    css();
    var h = host();
    var vid = S.local || (S.shared && S.shared.video && hiddenVid() !== S.shared.video ? S.shared.video : null);
    var hiddenShared = !S.local && S.shared && S.shared.video && hiddenVid() === S.shared.video;
    h.strip.style.display = hiddenShared ? 'block' : 'none';
    h.strip.textContent = L('📺 같이 보기 영상이 걸려 있어요 · 눌러서 다시 보기', '📺 A shared video is pinned · tap to show');
    if (!vid) { h.box.style.display = 'none'; h.box.innerHTML = ''; S.showing = null; return; }

    /* 내가 고른 영상이 아니고 데이터를 아껴야 하면 → 영상 창을 열지 않고(데이터 0) 그림 + [▶ 눌러서 재생] */
    if (S.showing !== vid && S.okVid !== vid && dataHold()) {
      S.showing = vid; S.held = true; S.autoplay = false;
      var th = vid.indexOf('L:') === 0 ? '' : "background-image:url('https://i.ytimg.com/vi/" + vid + "/mqdefault.jpg')";
      h.box.innerHTML = '<div class="yf"><div class="yhold" style="' + th + '"><b>▶ ' + L('눌러서 재생', 'Tap to play') + '</b>' +
        '<small>📶 ' + L('모바일 데이터일 수 있어 저절로 틀지 않았어요', 'Not auto-played to save mobile data') + '</small></div></div><div class="yc"></div>';
      h.box.querySelector('.yhold').onclick = function(){ S.okVid = vid; S.held = false; S.autoplay = true; S.showing = null; paint(); };
    }
    if (S.showing !== vid) {
      S.showing = vid; S.held = false; S.paused = false; S.cur = 0;
      /* 아이폰 1.4: 소리 있는 자동 재생이 막혀 있어 → 소리 끈 채 자동 재생 + [🔊 소리 켜기] 한 번 (1.5 는 그냥 재생) */
      var iosMute = S.autoplay && /iPhone|iPad|iPod/.test(navigator.userAgent || '') && !(window.AliasNative && window.AliasNative.audioV2);
      var src = AL.ytEmbed(vid) + (S.autoplay ? '&autoplay=1' : '') + (iosMute ? '&mute=1' : '');
      S.autoplay = false; S.muted = iosMute;
      h.box.innerHTML = '<div class="yf"><iframe src="' + src + '" title="YouTube" ' +
        'allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div><div class="yc"></div>';
      /* 재생 위치를 받아 두려고 유튜브 창에 "알려 달라" 고 말해 둡니다 */
      var fr = h.box.querySelector('iframe');
      fr.addEventListener('load', function(){
        try { fr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'ytpin' }), '*'); } catch (e) {}
        if (S.seekTo != null) { var t = S.seekTo; S.seekTo = null; setTimeout(function(){ seek(t); }, 900); }
      });
    }
    h.box.classList.toggle('big', S.big);
    h.box.style.display = 'block';

    var isLocal = !!S.local;
    var canClear = !isLocal && S.shared && S.shared.can_clear;
    var ctl = h.box.querySelector('.yc');
    var od = h.box.querySelector('.ydata'); if (od) od.remove();
    if (!dataSeen()) {
      var dn = document.createElement('div'); dn.className = 'ydata';
      dn.innerHTML = '<span>' + AL.esc(DATA_LINE()) + '</span><button type="button">' + L('알겠어요', 'Got it') + '</button>';
      dn.querySelector('button').onclick = function(){ try { localStorage.setItem('yt_data_ok_v1', '1'); } catch (e) {} dn.remove(); };
      h.box.appendChild(dn);
    }
    ctl.innerHTML =
      '<span class="yl">' + (isLocal ? L('📺 나만 보기', '📺 Only me') : L('👥 같이 보기', '👥 Shared')) +
        (TITLES[vid] ? ' · ' + AL.esc(TITLES[vid].title).slice(0, 40) : '') + '</span>' +
      (S.muted ? '<button data-y="unmute" style="background:#FF4D4D;border-color:#FF4D4D;color:#fff">🔊 ' + L('소리 켜기', 'Sound on') + '</button>' : '') +
      (S.held ? '' : '<button data-y="pp">' + (S.paused ? L('▶ 재생', '▶ Play') : L('Ⅱ 멈춤', 'Ⅱ Pause')) + '</button>') +
      (!isLocal && !S.held ? '<button data-y="sync">🔄 ' + L('같이 맞추기', 'Sync all') + '</button>' : '') +
      '<button data-y="size">' + (S.big ? L('작게', 'Smaller') : L('크게', 'Bigger')) + '</button>' +
      '<button data-y="app">↗ ' + L('유튜브', 'YouTube') + '</button>' +
      '<button data-y="hide">✕ ' + (isLocal ? L('닫기', 'Close') : L('내 화면에서 치우기', 'Hide for me')) + '</button>' +
      (canClear ? '<button class="bad" data-y="clear">⬇ ' + L('모두에게서 내리기', 'Remove for all') + '</button>' : '');
    ctl.onclick = function(e){
      var b = e.target.closest('button'); if (!b) return;
      var a = b.dataset.y;
      if (a === 'pp') { S.paused = !S.paused; cmd(S.paused ? 'pauseVideo' : 'playVideo'); paint(); }
      if (a === 'size') { S.big = !S.big; paint(); }
      if (a === 'unmute') { cmd('unMute'); cmd('playVideo'); S.muted = false; S.paused = false; paint(); }
      if (a === 'sync') {
        bc({ action: 'sync', video: vid, time: S.cur || 0, at: Date.now(), by: S.sideId, name: S.name });
        if (S.paused) { S.paused = false; cmd('playVideo'); paint(); }
        note(L('🔄 모두의 화면을 지금 위치로 맞췄습니다', '🔄 Synced everyone to this point'));
      }
      if (a === 'app') { cmd('pauseVideo'); S.paused = true; paint(); window.open(AL.ytWatch(vid), '_blank'); }
      if (a === 'hide') {
        if (isLocal) { S.local = null; }
        else setHidden(vid);
        paint();
      }
      if (a === 'clear') clearAll();
    };
  }

  function seek(t){
    var f = document.querySelector('#ytBox iframe');
    try {
      f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.max(0, t), true] }), '*');
      f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    } catch (e) {}
    S.paused = false;
  }
  window.addEventListener('message', function(e){
    try { if (!/(^|\.)youtube\.com$/.test(new URL(e.origin).hostname)) return; } catch (x) { return; }
    try {
      var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (d && d.event === 'infoDelivery' && d.info && typeof d.info.currentTime === 'number') S.cur = d.info.currentTime;
    } catch (x) {}
  });

  async function fetchShared(){
    if (!S.linkId) return;
    try {
      var r = await AL.sb.rpc('yt_pin_get', { p_link: S.linkId });
      var d = (r && r.data) || {};
      var before = S.shared && S.shared.video;
      S.shared = d.video ? d : null;
      if (S.shared && before !== S.shared.video && hiddenVid() && hiddenVid() !== S.shared.video) setHidden(null);  // 새 영상 → 다시 보이기
    } catch (e) { /* 표가 없으면(SQL 전) 조용히 */ }
    paint();
  }

  function bc(payload){
    try { if (S.chan) S.chan.send({ type: 'broadcast', event: 'yt', payload: payload }); } catch (e) {}
  }

  async function shareIt(vid){
    var r = await AL.sb.rpc('yt_pin_set', { p_link: S.linkId, p_video: vid });
    var d = (r && r.data) || {};
    if (r.error || !d.ok) { note(L('같이 띄우지 못했습니다. 잠시 뒤 다시 해 주세요.', 'Could not share. Please try again.')); return; }
    S.local = null; setHidden(null); addRecent(vid);
    S.autoplay = true; S.showing = null; S.okVid = vid;
    await fetchShared();
    bc({ action: 'set', video: vid, by: S.sideId, name: S.name });
    note(L('👥 같이 보기로 띄웠습니다', '👥 Shared with everyone'));
  }

  async function clearAll(){
    if (!confirm(L('이 방 모두의 화면에서 영상을 내릴까요?', 'Remove this video for everyone in the chat?'))) return;
    var r = await AL.sb.rpc('yt_pin_clear', { p_link: S.linkId });
    var d = (r && r.data) || {};
    if (r.error || !d.ok) { note(L('띄운 분이나 방장만 모두에게서 내릴 수 있습니다. 내 화면에서 치우기를 써 주세요.', 'Only the sharer or the room owner can remove it for everyone.')); return; }
    S.shared = null; setHidden(null); paint();
    bc({ action: 'clear', by: S.sideId, name: S.name });
  }

  /* ── 🔴 2026-10-20 최근 띄운 영상 · 추천 영상 · 제목 ── */
  var TITLES = {};   // video_id → {title, artist}
  function recentKey(){ return 'yt_recent_v1'; }
  function recent(){ try { return JSON.parse(localStorage.getItem(recentKey()) || '[]'); } catch (e) { return []; } }
  function addRecent(vid){
    try {
      var r = recent().filter(function(x){ return x.v !== vid; });
      var t = TITLES[vid] || {};
      r.unshift({ v: vid, t: t.title || '', a: t.artist || '', at: Date.now() });
      localStorage.setItem(recentKey(), JSON.stringify(r.slice(0, 15)));
    } catch (e) {}
  }
  var LIST = null;
  async function loadList(){
    if (LIST) return LIST;
    try { var r = await AL.sb.rpc('yt_list_public'); LIST = (r && r.data) || []; } catch (e) { LIST = []; }
    LIST.forEach(function(x){ TITLES[x.video_id] = { title: x.title, artist: x.artist }; });
    return LIST;
  }
  function thumb(v){ return v.indexOf('L:') === 0 ? 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 54"><rect width="96" height="54" fill="#300"/><text x="48" y="34" font-size="18" text-anchor="middle" fill="#fff">▶☰</text></svg>') : 'https://i.ytimg.com/vi/' + v + '/mqdefault.jpg'; }

  /* [📺 영상] — 링크 붙여넣기 · 최근 · 추천 */
  AL.ytPicker = async function(){
    var old = document.getElementById('ytPick'); if (old) old.remove();
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sh = document.createElement('div'); sh.className = 'pk'; sh.id = 'ytPick';
    sh.style.maxHeight = '86vh'; sh.style.overflow = 'auto';
    function close(){ bg.remove(); sh.remove(); }
    bg.onclick = close;
    var row = function(v, t, a){
      return '<button type="button" class="ytrow" data-v="' + v + '" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left;margin:6px 0 0;padding:7px;border-radius:12px;' +
        'background:rgba(255,255,255,.05);color:inherit;border:1px solid rgba(128,128,128,.3);cursor:pointer">' +
        '<img src="' + thumb(v) + '" alt="" loading="lazy" style="width:96px;height:54px;object-fit:cover;border-radius:8px;flex:0 0 auto;background:#111">' +
        '<span style="min-width:0;flex:1"><b style="display:block;font-size:14px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' +
        AL.esc(t || L('(제목 없음)', '(no title)')) + '</b><small style="opacity:.7">' + AL.esc(a || '') + '</small></span></button>';
    };
    sh.innerHTML = '<div class="grip"></div><p class="pk-title">📺 ' + L('영상 띄우기', 'Pin a video') + '</p>' +
      '<div style="display:flex;gap:6px;margin:4px 0 4px"><input id="ytUrl" type="url" placeholder="' + L('유튜브 링크를 붙여 넣으세요', 'Paste a YouTube link') + '" ' +
        'style="flex:1;min-width:0;padding:11px 12px;border-radius:11px;font-size:14.5px;background:rgba(255,255,255,.06);color:inherit;border:1px solid rgba(128,128,128,.4)">' +
        '<button type="button" id="ytPaste" style="margin:0;padding:0 12px;border-radius:11px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.08);color:inherit;border:1px solid rgba(128,128,128,.4)">📋</button>' +
        '<button type="button" id="ytGo" style="margin:0;padding:0 14px;border-radius:11px;font-weight:800;cursor:pointer;background:#FF4D4D;color:#fff;border:none">' + L('띄우기', 'Pin') + '</button></div>' +
      '<div id="ytErr" style="font-size:12.5px;color:#FFB4B4;min-height:16px"></div>' +
      '<div style="font-size:12px;opacity:.72;line-height:1.45;margin:0 0 4px">' + AL.esc(DATA_LINE()) + '</div>' +
      '<div id="ytRecent"></div><div id="ytCats" style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 2px"></div><div id="ytItems"></div>';
    document.body.appendChild(bg); document.body.appendChild(sh);

    var go = function(){
      var v = AL.ytId(sh.querySelector('#ytUrl').value);
      if (!v) { sh.querySelector('#ytErr').textContent = L('영상 주소가 아닙니다. 유튜브 앱 [공유] → [링크 복사] 로 복사해 주세요.', 'Not a video link.'); return; }
      close(); AL.ytChoose(v);
    };
    sh.querySelector('#ytGo').onclick = go;
    sh.querySelector('#ytUrl').addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); });
    sh.querySelector('#ytPaste').onclick = async function(){
      try { var t = await navigator.clipboard.readText(); if (t) { sh.querySelector('#ytUrl').value = t.trim(); if (AL.ytId(t)) go(); } }
      catch (e) { sh.querySelector('#ytErr').textContent = L('입력칸을 꾹 눌러 [붙여넣기] 해 주세요.', 'Long-press the box and paste.'); sh.querySelector('#ytUrl').focus(); }
    };
    sh.addEventListener('click', function(e){
      var b = e.target.closest('.ytrow'); if (!b) return;
      close(); AL.ytChoose(b.dataset.v);
    });

    var rc = recent();
    if (rc.length) sh.querySelector('#ytRecent').innerHTML = '<div style="font-size:13px;font-weight:800;opacity:.8;margin:8px 0 0">🕘 ' + L('최근 띄운 영상', 'Recent') + '</div>' +
      rc.slice(0, 5).map(function(x){ var t = TITLES[x.v] || {}; return row(x.v, x.t || t.title, x.a || t.artist); }).join('');

    var list = await loadList();
    if (!list.length) return;
    var cats = [], seen = {};
    list.forEach(function(x){ if (!seen[x.cat]) { seen[x.cat] = 1; cats.push({ k: x.cat, n: x.cat_name }); } });
    var cur = cats[0].k;
    var paintCat = function(){
      sh.querySelector('#ytCats').innerHTML = '<div style="width:100%;font-size:13px;font-weight:800;opacity:.8">⭐ ' + L('추천 영상', 'Picks') + '</div>' +
        cats.map(function(c){ return '<button type="button" data-c="' + c.k + '" style="margin:0;padding:7px 11px;border-radius:999px;font-size:12.5px;font-weight:700;cursor:pointer;' +
          (c.k === cur ? 'background:#FF4D4D;color:#fff;border:1px solid #FF4D4D' : 'background:rgba(255,255,255,.06);color:inherit;border:1px solid rgba(128,128,128,.35)') + '">' + AL.esc(c.n) + '</button>'; }).join('');
      sh.querySelector('#ytItems').innerHTML = list.filter(function(x){ return x.cat === cur; }).map(function(x){ return row(x.video_id, x.title, x.artist); }).join('');
    };
    sh.querySelector('#ytCats').onclick = function(e){ var b = e.target.closest('[data-c]'); if (!b) return; cur = b.dataset.c; paintCat(); };
    paintCat();
  };

  /* 말풍선 [📺 위에 띄우기] → 나만 / 같이 */
  AL.ytChoose = function(vid){
    var old = document.getElementById('ytAsk'); if (old) old.remove();
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sh = document.createElement('div'); sh.className = 'pk'; sh.id = 'ytAsk';
    function close(){ bg.remove(); sh.remove(); }
    bg.onclick = close;
    var opt = function(t, d, fn){
      var b = document.createElement('button'); b.className = 'pk-opt'; b.type = 'button';
      b.innerHTML = '<b>' + t + '</b>' + (d ? '<br><small style="opacity:.75;font-weight:500">' + d + '</small>' : '');
      b.style.cssText = 'display:block;width:100%;text-align:left;margin:6px 0 0;padding:13px 14px;border-radius:12px';
      b.onclick = function(){ close(); fn(); };
      sh.appendChild(b);
    };
    sh.innerHTML = '<div class="grip"></div><p class="pk-title">' + L('대화창 위에 영상 띄우기', 'Pin video above the chat') + '</p>';
    opt('📺 ' + L('나만 보기', 'Only me'), L('내 대화창 위에만 띄웁니다. 상대는 모릅니다.', 'Only on my screen.'), function(){
      S.local = vid; S.okVid = vid; addRecent(vid); paint(); note(L('📺 나만 보기로 띄웠습니다', '📺 Showing only to you'));
    });
    if (!S.locked) {
      opt('👥 ' + L('같이 보기', 'Share with everyone'), L('방에 있는 모두의 대화창 위에 띄웁니다. 각자 멈추거나 치울 수 있어요.', 'Pinned for everyone in this chat. Each person can pause or hide it.'), function(){ shareIt(vid); });
    } else {
      var p = document.createElement('p'); p.className = 'pk-note';
      p.textContent = L('🔒 잠긴 방에서는 어떤 영상인지 서버에 남지 않도록 "나만 보기" 만 됩니다.', '🔒 In a locked chat only "Only me" is available.');
      sh.appendChild(p);
    }
    var c = document.createElement('button'); c.className = 'pk-opt'; c.type = 'button'; c.textContent = L('취소', 'Cancel');
    c.style.cssText = 'display:block;width:100%;margin:10px 0 0;padding:12px;border-radius:12px;opacity:.85';
    c.onclick = close; sh.appendChild(c);
    document.body.appendChild(bg); document.body.appendChild(sh);
  };

  /* 말풍선에 붙일 단추 */
  AL.yt = {
    btn: function(text){
      var v = AL.ytId(text);
      return v ? '<br><button type="button" class="ytpin" data-ytv="' + v + '">📺 ' + (v.indexOf('L:') === 0 ? L('재생목록 위에 띄우기', 'Pin playlist') : L('위에 띄우기', 'Pin above chat')) + '</button>' : '';
    },
    init: function(o){
      S.linkId = o.linkId; S.sideId = o.sideId; S.name = o.name || ''; S.locked = !!o.locked;
      css(); fetchShared(); loadList().then(function(){ if (S.showing) paint(); });
      if (!AL.yt._timer) AL.yt._timer = setInterval(fetchShared, 30000);
    },
    setLocked: function(v){ S.locked = !!v; },
    listen: function(ch){
      S.chan = ch;
      ch.on('broadcast', { event: 'yt' }, function(e){
        var p = e.payload || {};
        if (p.by === S.sideId) return;
        if (p.action === 'set') { setHidden(null); S.local = null; S.autoplay = true; S.showing = null; }   // 같이 보기 → 모두 바로 열고 재생
        if (p.action === 'sync') {
          var lag = Math.max(0, (Date.now() - (p.at || Date.now())) / 1000);
          if (S.showing === p.video && S.held) { S.seekTo = (p.time || 0) + lag + 1.5; return; }
          if (S.showing === p.video) { seek((p.time || 0) + lag); paint(); }
          else { setHidden(null); S.local = null; S.autoplay = true; S.seekTo = (p.time || 0) + lag + 1.5; S.showing = null; paint(); }
          note((p.name ? p.name + L('님이', '') : L('상대가', 'Someone')) + L(' 재생 위치를 맞췄습니다', ' synced the video'));
          return;
        }
        fetchShared();
        if (p.action === 'set') note((p.name ? p.name + L('님이', '') : L('상대가', 'Someone')) + L(' 영상을 같이 보기로 띄웠습니다', ' pinned a video'));
        if (p.action === 'clear') note((p.name ? p.name + L('님이', '') : L('상대가', 'Someone')) + L(' 영상을 내렸습니다', ' removed the video'));
      });
    },
    sync: fetchShared,
    openPicker: function(){ AL.ytPicker(); }
  };

  /* 말풍선 안 단추 — 말풍선 메뉴가 뜨지 않게 먼저 잡습니다 */
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('.ytpin');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    AL.ytChoose(b.dataset.ytv);
  }, true);
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') fetchShared(); });
})();

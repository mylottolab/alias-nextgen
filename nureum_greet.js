/* =====================================================================
   🎬 인사 영상 (2026-11-23) — 누름 · 바로너 라인 화면(nureum_line.html)
   · 두 사람이 각자 "상대 화면에 나올 짧은 영상"(20초 · 20MB 안쪽, 소리 포함)을 하나씩 올립니다.
   · 상대가 바탕화면 아이콘(위젯)을 눌러 내 화면을 열면 맨 위에 그 영상이 나옵니다.
   · 보는 사람이 고릅니다(이 휴대폰에만 기억): 🔊 소리 켜기/끄기(처음엔 끔) · 언제 보여 줄지(매번 · 하루 한 번 · 안 보기)
   · 아이폰은 소리 있는 자동 재생을 막을 때가 있어, 막히면 소리 없이 틀고 「🔊 눌러서 소리 듣기」 를 띄웁니다.
   · 서버: sql 15_nureum_greet.sql (표 nureum_greet · 잠긴 보관함 nureum-greet). 아직 안 돌린 서버면 조용히 아무것도 안 보입니다.
   ===================================================================== */
(function(){
  'use strict';
  var BUCKET = 'nureum-greet', MAX_S = 20, MAX_B = 20 * 1024 * 1024;
  var EN = !!(window.BN && BN.en);
  var T = function(ko, en){ return EN ? en : ko; };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); };
  function prefKey(line){ return 'nureum_greet_' + line; }
  function pref(line){ try { var o = JSON.parse(localStorage.getItem(prefKey(line)) || '{}'); return { sound: !!o.sound, when: o.when || 'always', seen: o.seen || '' }; } catch (e) { return { sound: false, when: 'always', seen: '' }; } }
  function savePref(line, p){ try { localStorage.setItem(prefKey(line), JSON.stringify(p)); } catch (e) {} }
  function today(){ var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  if (!document.getElementById('ngCss')) {
    var st = document.createElement('style'); st.id = 'ngCss';
    st.textContent =
      '.ng-card{position:relative;border-radius:26px;overflow:hidden;background:#000;box-shadow:0 10px 26px rgba(0,0,0,.25)}' +
      '.ng-card video{display:block;width:100%;max-height:34vh;object-fit:cover;background:#000}' +
      '.ng-snd{position:absolute;right:12px;bottom:12px;border:none;border-radius:999px;padding:10px 14px;font:inherit;font-size:15px;font-weight:900;background:rgba(0,0,0,.62);color:#fff;cursor:pointer}' +
      '.ng-snd.on{background:rgba(255,255,255,.9);color:#17132B}' +
      '.ng-x{position:absolute;right:10px;top:10px;width:40px;height:40px;border:none;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:18px;cursor:pointer}' +
      '.ng-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border:none;background:rgba(0,0,0,.35);color:#fff;font:inherit;font-size:20px;font-weight:900;cursor:pointer;gap:10px}' +
      '.ng-tag{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:13px;font-weight:800}' +
      '.ng-mini{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border:none;border-radius:18px;background:var(--nu-soft);color:var(--nu-ink);font:inherit;font-size:16px;font-weight:800;cursor:pointer;width:100%}' +
      '.ng-opts{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.ng-opts button{flex:1;min-width:0;height:46px;border-radius:14px;border:2px solid var(--nu-line);background:var(--nu-card);color:var(--nu-ink);font:inherit;font-size:15px;font-weight:800;cursor:pointer}' +
      '.ng-opts button.on{border-color:var(--nu-main,#4A2BE0);background:var(--nu-soft)}';
    document.head.appendChild(st);
  }

  async function signed(path){
    try { var r = await AL.sb.storage.from(BUCKET).createSignedUrl(path, 3600); return r && r.data && r.data.signedUrl; } catch (e) { return null; }
  }
  async function info(line){
    try { var r = await AL.sb.rpc('nureum_greet_get', { p_line: line }); return (r && !r.error && r.data && r.data.ok) ? r.data : null; } catch (e) { return null; }
  }

  /* ── 라인 화면 맨 위에 상대의 인사 영상 ── */
  var box = null;
  async function mount(L){
    if (!L || !L.id) return;
    flush(L.id);   // 처음 만들 때 맡겨 둔 내 영상이 있으면 이제 올립니다
    var d = await info(L.id);
    if (box) { box.remove(); box = null; }
    if (!d || !d.peer) return;
    var p = pref(L.id);
    if (p.when === 'off') return;
    var url = await signed(d.peer.path); if (!url) return;
    box = document.createElement('div');
    var anchor = document.getElementById('bCall');
    anchor.parentNode.insertBefore(box, anchor);
    var full = p.when === 'always' || p.seen !== today();
    if (!full) {   // 하루 한 번: 오늘 이미 봤으면 작은 단추만
      box.innerHTML = '<button class="ng-mini" type="button">🎬 ' + esc(T(L.name + '님의 인사 영상 다시 보기', 'Replay ' + L.name + '’s greeting')) + '</button>';
      box.firstChild.onclick = function(){ show(true); };
      return;
    }
    show(false);
    function show(byTap){
      box.innerHTML = '<div class="ng-card"><video playsinline webkit-playsinline preload="auto"></video>' +
        '<span class="ng-tag">🎬 ' + esc(T(L.name + '님의 인사', 'Greeting from ' + L.name)) + '</span>' +
        '<button class="ng-x" type="button" aria-label="' + esc(T('닫기', 'Close')) + '">✕</button>' +
        '<button class="ng-snd" type="button"></button></div>';
      var v = box.querySelector('video'), snd = box.querySelector('.ng-snd');
      v.src = url;
      function paintSnd(){ snd.textContent = v.muted ? T('🔇 소리 꺼짐 · 눌러서 켜기', '🔇 Sound off · tap to turn on') : T('🔊 소리 켜짐', '🔊 Sound on'); snd.classList.toggle('on', !v.muted); }
      snd.onclick = function(){ v.muted = !v.muted; var q = pref(L.id); q.sound = !v.muted; savePref(L.id, q); if (!v.muted) { try { v.currentTime = 0; } catch (e) {} } v.play().catch(function(){}); paintSnd(); };
      box.querySelector('.ng-x').onclick = function(){ try { v.pause(); } catch (e) {} box.innerHTML = '<button class="ng-mini" type="button">🎬 ' + esc(T('인사 영상 다시 보기', 'Replay greeting')) + '</button>'; box.firstChild.onclick = function(){ show(true); }; };
      v.addEventListener('ended', function(){
        var pl = document.createElement('button'); pl.className = 'ng-play'; pl.type = 'button'; pl.innerHTML = '↻ ' + esc(T('다시 보기', 'Play again'));
        pl.onclick = function(){ pl.remove(); try { v.currentTime = 0; } catch (e) {} v.play().catch(function(){}); };
        box.querySelector('.ng-card').appendChild(pl);
      });
      var wantSound = pref(L.id).sound;
      v.muted = !wantSound;
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function(){
        /* 소리 있는 자동 재생이 막힘(주로 아이폰) → 소리 없이 틀고, 소리는 눌러서 */
        v.muted = true; paintSnd();
        v.play().catch(function(){
          var pl = document.createElement('button'); pl.className = 'ng-play'; pl.type = 'button'; pl.innerHTML = '▶ ' + esc(T('인사 영상 보기', 'Play greeting'));
          pl.onclick = function(){ pl.remove(); v.muted = !pref(L.id).sound; v.play().catch(function(){}); paintSnd(); };
          box.querySelector('.ng-card').appendChild(pl);
        });
      });
      paintSnd();
      var q = pref(L.id); q.seen = today(); savePref(L.id, q);
    }
  }

  function readVideo(file){
    return new Promise(function(res){
      var u = URL.createObjectURL(file), v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
      var done = false; function fin(s){ if (done) return; done = true; URL.revokeObjectURL(u); res(s); }
      v.onloadedmetadata = function(){ fin(isFinite(v.duration) ? v.duration : 0); };
      v.onerror = function(){ fin(-1); };
      setTimeout(function(){ fin(0); }, 8000);
      v.src = u;
    });
  }

  /* ── 전체 메뉴 → 🎬 인사 영상: 내가 상대에게 보여 줄 영상 올리기 · 보는 방법 고르기 ── */
  async function edit(L){
    var d = await info(L.id);
    if (!d) { NU.sheet('<h2>' + esc(T('인사 영상', 'Greeting video')) + '</h2><p class="nu-sub">' + esc(T('지금은 쓸 수 없어요. 잠시 뒤 다시 열어 주세요.', 'Not available right now. Please try again shortly.')) + '</p><button class="nu-btn ghost" data-close>' + esc(T('닫기', 'Close')) + '</button>'); return; }
    var p = pref(L.id);
    var mineUrl = d.mine ? await signed(d.mine.path) : null;
    var sh = NU.sheet('<h2>🎬 ' + esc(T('인사 영상', 'Greeting video')) + '</h2>' +
      '<p class="nu-sub" style="color:var(--nu-ink)">' + esc(T(L.name + '님이 바탕화면 아이콘을 눌러 나를 열면, 맨 위에 내 영상이 나와요. 20초 안쪽, 소리도 함께 나옵니다. 짧게, 화질은 「보통」으로 찍어 주세요.',
        'When ' + L.name + ' opens you from the home-screen icon, your video shows at the top. Up to 20 seconds, with sound. Keep it short and record at normal quality.')) + '</p>' +
      (mineUrl ? '<video src="' + esc(mineUrl) + '" controls playsinline style="width:100%;max-height:34vh;border-radius:16px;background:#000;margin:4px 0 10px"></video>' : '') +
      '<button class="nu-btn" id="ngPick" type="button">' + esc(mineUrl ? T('🎬 다른 영상으로 바꾸기', '🎬 Choose another video') : T('🎬 영상 고르기 · 찍기', '🎬 Choose or record a video')) + '</button>' +
      (mineUrl ? '<button class="nu-btn ghost" id="ngDel" type="button" style="margin-top:8px">' + esc(T('내 영상 빼기', 'Remove my video')) + '</button>' : '') +
      '<div id="ngErr" class="nu-err" role="alert"></div>' +
      '<h3 style="margin:18px 0 4px;font-size:16px">' + esc(T(L.name + '님 영상을 내 화면에서', L.name + '’s video on my screen')) + (d.peer ? '' : ' <span class="nu-sub" style="font-weight:600">' + esc(T('(아직 안 올림)', '(not added yet)')) + '</span>') + '</h3>' +
      '<div class="ng-opts" id="ngWhen">' +
        '<button type="button" data-w="always">' + esc(T('매번', 'Every time')) + '</button>' +
        '<button type="button" data-w="daily">' + esc(T('하루 한 번', 'Once a day')) + '</button>' +
        '<button type="button" data-w="off">' + esc(T('안 보기', 'Off')) + '</button></div>' +
      '<div class="ng-opts" id="ngSound">' +
        '<button type="button" data-s="0">' + esc(T('🔇 소리 없이', '🔇 Muted')) + '</button>' +
        '<button type="button" data-s="1">' + esc(T('🔊 소리 켜고', '🔊 With sound')) + '</button></div>' +
      '<p class="nu-sub" style="margin:0 0 10px;font-size:13px">' + esc(T('아이폰은 소리 자동 재생을 막을 때가 있어요. 그때는 영상 위 [🔊]를 한 번 눌러 주세요.', 'iPhone may block autoplay with sound. If so, tap [🔊] on the video once.')) + '</p>' +
      '<button class="nu-btn ghost" data-close type="button">' + esc(T('닫기', 'Close')) + '</button>');
    function paintOpts(){
      sh.querySelectorAll('#ngWhen [data-w]').forEach(function(b){ b.classList.toggle('on', b.dataset.w === p.when); });
      sh.querySelectorAll('#ngSound [data-s]').forEach(function(b){ b.classList.toggle('on', (b.dataset.s === '1') === p.sound); });
    }
    paintOpts();
    sh.querySelector('#ngWhen').onclick = function(e){ var b = e.target.closest('[data-w]'); if (!b) return; p.when = b.dataset.w; if (p.when !== 'daily') p.seen = ''; savePref(L.id, p); paintOpts(); mount(L); };
    sh.querySelector('#ngSound').onclick = function(e){ var b = e.target.closest('[data-s]'); if (!b) return; p.sound = b.dataset.s === '1'; savePref(L.id, p); paintOpts(); };
    var del = sh.querySelector('#ngDel');
    if (del) del.onclick = async function(){
      del.disabled = true;
      try { var r = await AL.sb.rpc('nureum_greet_clear', { p_line: L.id }); if (r.data && r.data.old) await AL.sb.storage.from(BUCKET).remove([r.data.old]); } catch (e) {}
      NU.closeSheet(); edit(L);
    };
    sh.querySelector('#ngPick').onclick = function(){
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*';
      inp.onchange = async function(){
        var f = inp.files && inp.files[0]; if (!f) return;
        var btn = sh.querySelector('#ngPick'), err = function(m){ NU.showErr('ngErr', m); btn.disabled = false; btn.textContent = T('🎬 영상 고르기 · 찍기', '🎬 Choose or record a video'); };
        NU.showErr('ngErr', '');
        if (f.size > MAX_B) return err(T('영상이 너무 커요(20MB까지). 더 짧게, 화질 「보통」으로 찍어 주세요.', 'The video is too large (max 20MB). Record a shorter one at normal quality.'));
        var secs = await readVideo(f);
        if (secs < 0) return err(T('이 영상은 열 수 없어요. 다른 영상으로 해 주세요.', 'This video can’t be opened. Please try another.'));
        if (secs > MAX_S + 0.5) return err(T('영상이 ' + Math.round(secs) + '초예요. 20초 안쪽으로 해 주세요.', 'The video is ' + Math.round(secs) + ' s. Please keep it within 20 s.'));
        btn.disabled = true; btn.textContent = T('올리는 중…', 'Uploading…');
        try {
          await upload(L.id, f, secs);
          NU.closeSheet();
          NU.sheet('<h2>' + esc(T('인사 영상을 올렸어요', 'Greeting video added')) + '</h2><p class="nu-sub" style="color:var(--nu-ink)">' +
            esc(T(L.name + '님이 바탕화면 아이콘으로 나를 열면 이 영상이 나와요.', 'It will play when ' + L.name + ' opens you from the home-screen icon.')) + '</p><button class="nu-btn ghost" data-close>' + esc(T('알겠어요', 'Got it')) + '</button>');
        } catch (e) {
          var m = String((e && (e.message || e.error)) || e);
          err(/mime|type/i.test(m) ? T('이 영상 형식은 올릴 수 없어요(mp4 · mov).', 'This video format isn’t supported (mp4 · mov).')
            : /not_member/.test(m) ? T('짝을 맺은 라인에서만 올릴 수 있어요.', 'Only for paired lines.')
            : T('올리지 못했어요. 인터넷을 확인하고 다시 해 주세요.', 'Upload failed. Check your connection and try again.'));
        }
      };
      inp.click();
    };
  }


  /* ── 🔴 2026-11-23 — 처음 핫라인 만들 때(이름 넣는 화면) 같이 고른 영상 ──
     check: 길이 · 크기 검사 / upload: 바로 올리기(짝이 맺어진 라인) /
     stash: 짝이 아직이면 이 휴대폰에 잠시 맡겨 두었다가(flush) 짝이 맺어지면 저절로 올립니다 */
  async function check(f){
    if (!f) return { err: '' };
    if (f.size > MAX_B) return { err: T('영상이 너무 커요(20MB까지). 더 짧게, 화질 「보통」으로 찍어 주세요.', 'The video is too large (max 20MB). Record a shorter one at normal quality.') };
    var secs = await readVideo(f);
    if (secs < 0) return { err: T('이 영상은 열 수 없어요. 다른 영상으로 해 주세요.', 'This video can’t be opened. Please try another.') };
    if (secs > MAX_S + 0.5) return { err: T('영상이 ' + Math.round(secs) + '초예요. 20초 안쪽으로 해 주세요.', 'The video is ' + Math.round(secs) + ' s. Please keep it within 20 s.') };
    return { secs: secs };
  }
  async function upload(lineId, f, secs){
    var me = (await AL.sb.auth.getSession()).data.session.user.id;
    var ext = (/quicktime/.test(f.type) ? 'mov' : /webm/.test(f.type) ? 'webm' : /3gpp/.test(f.type) ? '3gp' : 'mp4');
    var path = lineId + '/' + me + '-' + Date.now() + '.' + ext;
    var up = await AL.sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || 'video/mp4', upsert: false });
    if (up.error) throw up.error;
    var r = await AL.sb.rpc('nureum_greet_set', { p_line: lineId, p_path: path, p_mime: f.type || 'video/mp4', p_bytes: f.size, p_secs: Math.round(secs * 10) / 10 });
    if (r.error || !r.data || !r.data.ok) { try { await AL.sb.storage.from(BUCKET).remove([path]); } catch (e) {} throw new Error((r.data && r.data.error) || (r.error && r.error.message) || 'save'); }
    if (r.data.old) { try { await AL.sb.storage.from(BUCKET).remove([r.data.old]); } catch (e) {} }
    return true;
  }
  function db(){ return new Promise(function(res, rej){ try { var q = indexedDB.open('nureum_greet', 1); q.onupgradeneeded = function(){ q.result.createObjectStore('p'); }; q.onsuccess = function(){ res(q.result); }; q.onerror = function(){ rej(q.error); }; } catch (e) { rej(e); } }); }
  async function stash(lineId, f, secs){
    try { var d = await db(); await new Promise(function(res, rej){ var t = d.transaction('p', 'readwrite'); t.objectStore('p').put({ blob: f, type: f.type, secs: secs }, lineId); t.oncomplete = res; t.onerror = function(){ rej(t.error); }; }); return true; } catch (e) { return false; }
  }
  var flushing = {};
  async function flush(lineId){
    if (!lineId || flushing[lineId] || !window.indexedDB) return false;
    flushing[lineId] = 1;
    try {
      var d = await db();
      var it = await new Promise(function(res){ var g = d.transaction('p').objectStore('p').get(lineId); g.onsuccess = function(){ res(g.result); }; g.onerror = function(){ res(null); }; });
      if (!it || !it.blob) return false;
      var f = it.blob; if (!f.type && it.type) f = new Blob([f], { type: it.type });
      try { await upload(lineId, f, it.secs || 0); }
      catch (e) { if (!/too_big|too_long|bad_path|mime|type/i.test(String(e && (e.message || e.error)))) return false; /* 짝 아직 · 인터넷 끊김: 다음에 다시 */ }
      d.transaction('p', 'readwrite').objectStore('p').delete(lineId);   // 올렸거나(또는 고칠 수 없는 오류) → 지움
      return true;
    } catch (e) { return false; } finally { delete flushing[lineId]; }
  }

  /* ── 🔴 2026-11-23 — 이름 넣는 화면에 붙이는 "사진 · 인사 영상 (선택)" 칸 ──
     el: 넣을 곳 / who(): 지금 적힌 상대 이름 / onPhoto(dataUrl|null): 미리 보기 아이콘 바꾸기
     돌려줌: { photo, video, secs } — 만들기(연결하기)가 끝난 뒤 apply(lineId, paired) 로 저장 */
  function picker(el, who, onPhoto){
    var st = { photo: null, video: null, secs: 0 };
    el.innerHTML =
      '<div class="nu-card" style="gap:10px">' +
        '<b style="font-size:16px">' + esc(T('📷 사진 · 🎬 인사 영상', '📷 Photo · 🎬 Greeting video')) + ' <span class="nu-sub" style="font-weight:600;margin:0">' + esc(T('(선택 · 나중에 설정에서도 넣을 수 있어요)', '(optional · you can add them later in settings)')) + '</span></b>' +
        '<div style="display:flex;gap:10px;align-items:center"><button class="nu-btn line" type="button" data-k="ph" style="flex:1;min-height:52px">' + esc(T('📷 아이콘 사진 넣기', '📷 Add icon photo')) + '</button>' +
          '<button class="nu-btn ghost" type="button" data-k="phx" style="width:auto;padding:0 14px;min-height:52px" hidden>' + esc(T('빼기', 'Remove')) + '</button></div>' +
        '<p class="nu-sub" data-k="phs" style="margin:0"></p>' +
        '<div style="display:flex;gap:10px;align-items:center"><button class="nu-btn line" type="button" data-k="vd" style="flex:1;min-height:52px">' + esc(T('🎬 인사 영상 넣기 (20초)', '🎬 Add greeting video (20s)')) + '</button>' +
          '<button class="nu-btn ghost" type="button" data-k="vdx" style="width:auto;padding:0 14px;min-height:52px" hidden>' + esc(T('빼기', 'Remove')) + '</button></div>' +
        '<p class="nu-sub" data-k="vds" style="margin:0"></p>' +
        '<div class="nu-err" data-k="err" role="alert"></div>' +
      '</div>';
    var q = function(k){ return el.querySelector('[data-k="' + k + '"]'); };
    function paint(){
      var n = (who && who()) || T('상대', 'them');
      q('phs').textContent = st.photo ? T('✅ 사진을 골랐어요. 내 휴대폰의 ' + n + ' 아이콘에 이 사진이 보여요.', '✅ Photo chosen. It shows on the ' + n + ' icon on my phone.')
        : T('내 휴대폰 바탕화면의 ' + n + ' 아이콘에 보일 사진이에요.', 'Shown on the ' + n + ' icon on my home screen.');
      q('vds').textContent = st.video ? T('✅ ' + Math.round(st.secs) + '초 영상을 골랐어요. ' + n + '님이 나를 열면 맨 위에 나와요.', '✅ ' + Math.round(st.secs) + ' s video chosen. It plays when ' + n + ' opens you.')
        : T(n + '님 화면 맨 위에 나올 내 영상이에요. 짧게, 화질 「보통」으로 찍어 주세요.', 'My video shown at the top of ' + n + '’s screen. Keep it short, normal quality.');
      q('phx').hidden = !st.photo; q('vdx').hidden = !st.video;
    }
    q('ph').onclick = async function(){ var p = await NU.pickPhoto(); if (p) { st.photo = p; if (onPhoto) onPhoto(p); paint(); } };
    q('phx').onclick = function(){ st.photo = null; if (onPhoto) onPhoto(null); paint(); };
    q('vdx').onclick = function(){ st.video = null; st.secs = 0; paint(); };
    q('vd').onclick = function(){
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*';
      inp.onchange = async function(){
        var f = inp.files && inp.files[0]; if (!f) return; q('err').textContent = '';
        var c = await check(f); if (c.err) { q('err').textContent = c.err; return; }
        st.video = f; st.secs = c.secs; paint();
      };
      inp.click();
    };
    paint();
    st.repaint = paint;
    /* 만들기 · 연결이 끝난 뒤: 사진은 바로 저장, 영상은 짝이 맺어졌으면 바로 · 아니면 맡겨 두기 */
    st.apply = async function(lineId, paired){
      var out = { photo: true, video: true };
      if (st.photo) { try { var r = await NU.rpc('nureum_set_photo', { p_line: lineId, p_photo: st.photo }); out.photo = !!(r && r.ok); } catch (e) { out.photo = false; } }
      if (st.video) {
        if (paired) { try { await upload(lineId, st.video, st.secs); } catch (e) { out.video = await stash(lineId, st.video, st.secs); } }
        else out.video = await stash(lineId, st.video, st.secs);
      }
      return out;
    };
    return st;
  }
  window.NUG = { mount: mount, edit: edit, picker: picker, check: check, upload: upload, stash: stash, flush: flush };
})();

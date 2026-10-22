/* =====================================================================
   Alias Next-Gen — 같이 듣기 (회사가 고른 곡만)
   2026-09-20

   🔴🔴 이 파일은 alias_room.js 의 AL.openMusic 을 **덮어씁니다.**
     alias_chat.html 에서 alias_room.js **다음에** 불러야 합니다.
     순서가 뒤바뀌면 옛 것이 이깁니다.

   왜 따로 냈나
     alias_room.js 는 기념일·오늘의질문·자리비움까지 들어 있는 큰
     파일입니다. 통째로 다시 쓰다 다른 곳을 건드리면 그게 더 위험합니다.
     같이 듣기만 떼어내 여기서 새로 만듭니다.

   무엇이 잘못돼 있었나
     alias_room.js 의 주석에는 "음원을 우리가 담지 않습니다" 라고
     적혀 있었는데 **실제로는 올리기가 들어가 있었습니다.**
     말과 코드가 어긋나 있어서, 아무 음원이나 올라갈 수 있었습니다.

   왜 막나 (회사 결정 2026-09-17 · 갤러리 배경음과 같은 판단)
     불법 음원을 걸러낼 방법이 없습니다. 유튜브조차 못 합니다.
     플랫폼이 그 자리를 만들어주면 **회사가 책임**을 집니다.

   그래서 이제
     ① 회사가 고른 곡 중에서 고릅니다 (gallery_music 표)
     ② 유튜브 주소는 그대로 둡니다 — 영상과 광고가 보이니
        저작권자에게 수익이 갑니다
     ③ 예전에 올린 곡은 그대로 두되, **새로 올릴 수는 없습니다**

   ⚠ 곡을 더하는 일은 SQL 한 줄입니다. 앱을 안 고쳐도 늘어납니다.
       insert into gallery_music (title, artist, path, mood, license)
       values ('봄날 아침', 'Kevin MacLeod', 'spring.mp3', 'bright', 'CC BY 4.0');
   ===================================================================== */

window.AL = window.AL || {};

/* 🔴 2026-09-20 — 갈래 단추 모양.
   ⚠ 공용 CSS 에 없는 것이라 여기서 한 번만 넣습니다. 여러 번 열어도
     한 번만 붙습니다. */
(function(){
  if (document.getElementById('aliasMoodCss')) return;
  var st = document.createElement('style');
  st.id = 'aliasMoodCss';
  st.textContent =
    '.mood{display:flex;align-items:center;gap:10px;width:100%;cursor:pointer;' +
      'margin:6px 0 0;padding:14px 15px;border-radius:13px;text-align:left;' +
      'font-size:15.5px;font-weight:700;' +
      'background:rgba(255,255,255,.06);color:inherit;' +
      'border:1px solid rgba(255,255,255,.13)}' +
    '.mood.on{background:rgba(143,227,176,.15);color:#8FE3B0;' +
      'border-color:rgba(143,227,176,.45)}' +
    '.mood .mn{flex:1;min-width:0}' +
    '.mood .mc{flex:0 0 auto;font-size:12.5px;font-weight:600;opacity:.6}' +
    '.mood .ma{flex:0 0 auto;font-size:13px;opacity:.6;width:14px;' +
      'text-align:center}';
  document.head.appendChild(st);
})();

AL.openMusic = function(linkId, sideId){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

    /* 🔴 2026-09-20 — 열어둔 갈래. null 이면 다 접힌 상태입니다.
       ⚠ draw() 를 다시 불러도 이 값은 남습니다. 곡을 바꿀 때마다
         갈래가 도로 접히면 답답합니다. */
    var openMood = null;

    var done = false;
    function close(){
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      bg.remove(); sheet.remove();
      resolve(true);
    }
    function onKey(e){ if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', close);

    function title(text){
      var p = document.createElement('p'); p.className = 'pk-title';
      p.textContent = text; sheet.appendChild(p); return p;
    }
    function note(text){
      var p = document.createElement('p'); p.className = 'pk-note';
      p.textContent = text; sheet.appendChild(p); return p;
    }
    function err(text){
      var d = document.createElement('div'); d.className = 'pk-err';
      d.textContent = text; sheet.appendChild(d); return d;
    }
    function tbtn(icon, cls, label, onClick){
      var b = document.createElement('button');
      b.className = 'tb ' + cls;
      b.textContent = icon;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', onClick);
      return b;
    }

    /* 하나만 납니다. 셋이 동시에 나면 시끄럽습니다. */
    async function playOnly(patch){
      var base = {
        shared_music_id: null, track_id: null, music_youtube_id: null,
        music_playing: true, music_set_by: sideId,
        music_updated_at: new Date().toISOString(),
      };
      await AL.sb.from('links').update(Object.assign(base, patch)).eq('id', linkId);
      /* 🔴 2026-10-22 — 고르면 창을 닫고, 대화창 위 작은 줄(같이 듣기 줄)에서 들으며 대화합니다 */
      if (AL.muBar) { AL.muBar.changed('set'); close(); return; }
      draw();
    }

    async function stopAll(){
      await AL.sb.from('links').update({
        shared_music_id: null, track_id: null, music_youtube_id: null,
        music_playing: false, music_updated_at: new Date().toISOString(),
      }).eq('id', linkId);
      if (AL.muBar) AL.muBar.changed('stop');
      draw();
    }

    async function draw(){
      sheet.innerHTML = '<div class="grip"></div>';
      title(AL.t('muTitle'));
      note(AL.t('muNote'));

      var link = await AL.sb.from('links')
        .select('music_youtube_id, track_id, shared_music_id, music_set_by')
        .eq('id', linkId).maybeSingle();
      var vid      = link.data ? link.data.music_youtube_id : null;
      var nowId    = link.data ? link.data.track_id : null;
      var sharedId = link.data ? link.data.shared_music_id : null;
      var setBy    = link.data ? link.data.music_set_by : null;

      /* 🔴 2026-09-20 — 누가 틀었는지.
         ⚠ 곡이 갑자기 바뀌는데 이유를 모르면 고장인 줄 압니다.
           "○○님이 틀었습니다" 한 줄이면 납득이 됩니다. */
      var who = '';
      if (setBy) {
        if (setBy === sideId) who = AL.t('muSetByMe');
        else {
          try {
            var pp = await AL.peerPersona(linkId);
            who = AL.t('muSetBy', { who: (pp && pp.display_name) || '상대' });
          } catch (e) { who = AL.t('muSetBy', { who: '상대' }); }
        }
      }

      /* 회사가 고른 곡 목록 — 갤러리 배경음과 같은 표를 씁니다. */
      var songs = [];
      try { songs = await AL.loadMusicList(); } catch (e) {}

      /* 예전에 올린 곡 (새로 올릴 수는 없습니다) */
      var tr = await AL.sb.from('tracks')
        .select('id, title, media_path, media_bytes, ord, created_at')
        .eq('link_id', linkId).order('ord').order('created_at');
      var tracks = tr.data || [];

      // ── 지금 트는 것 ────────────────────────────────────────────
      var sg = sharedId
        ? songs.filter(function(x){ return x.id === sharedId; })[0] : null;
      var now = tracks.filter(function(t){ return t.id === nowId; })[0];

      if (sg && AL.muBar) {
        /* 🔴 2026-10-22 — 소리는 대화창 위 같이 듣기 줄에서 납니다(창을 닫아도 계속) */
        note(AL.t('muPlaying') + ' · ' + sg.title + (sg.artist ? ' · ' + sg.artist : ''));
        if (who) note(who);
        note(AL.lang === 'en' ? 'It keeps playing above the chat when you close this.' : '이 창을 닫아도 대화창 위 ♫ 줄에서 계속 나옵니다. 들으면서 대화하세요.');
        var stB = document.createElement('button');
        stB.className = 'pk-opt'; stB.style.marginTop = '12px';
        stB.textContent = AL.t('muStop');
        stB.addEventListener('click', stopAll);
        sheet.appendChild(stB);
        var cl = document.createElement('button');
        cl.className = 'pk-opt'; cl.style.marginTop = '8px';
        cl.textContent = AL.lang === 'en' ? 'Close and chat' : '닫고 대화하기';
        cl.addEventListener('click', close);
        sheet.appendChild(cl);

      } else if (sg) {
        note(AL.t('muPlaying') + ' · ' + sg.title + (sg.artist ? ' · ' + sg.artist : ''));
        if (who) note(who);
        var au0 = document.createElement('audio');
        au0.controls = true; au0.autoplay = true; au0.loop = true;
        au0.style.width = '100%';
        /* ⚠ 배경음 서랍은 공개라 주소가 고정입니다. 받아올 필요가 없습니다. */
        au0.src = AL.musicUrl(sg.path) || '';
        sheet.appendChild(au0);

        var st0 = document.createElement('button');
        st0.className = 'pk-opt'; st0.style.marginTop = '12px';
        st0.textContent = AL.t('muStop');
        st0.addEventListener('click', stopAll);
        sheet.appendChild(st0);

      } else if (now) {
        note(AL.t('muPlaying') + ' · ' + now.title);
        if (who) note(who);
        var au = document.createElement('audio');
        au.controls = true; au.autoplay = true; au.style.width = '100%';
        try { au.src = await AL.mediaUrl(now.media_path); } catch (e) {}
        au.addEventListener('ended', async function(){
          var i = tracks.findIndex(function(t){ return t.id === now.id; });
          var next = tracks[i + 1];
          if (next) await playOnly({ track_id: next.id });
          else await stopAll();
        });
        sheet.appendChild(au);

      } else if (vid) {
        if (who) note(who);
        var pl = document.createElement('div'); pl.className = 'player';
        var fr = document.createElement('iframe');
        fr.src = 'https://www.youtube.com/embed/' + vid;
        fr.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
        fr.allowFullscreen = true;
        pl.appendChild(fr); sheet.appendChild(pl);

        var st = document.createElement('button');
        st.className = 'pk-opt'; st.style.marginTop = '12px';
        st.textContent = AL.t('muStop');
        st.addEventListener('click', stopAll);
        sheet.appendChild(st);

      } else {
        note(AL.t('muNone'));
      }

      // ── 회사가 고른 곡 ──────────────────────────────────────────
      var sep0 = document.createElement('div'); sep0.className = 'pk-sep';
      sheet.appendChild(sep0);

      title(AL.t('muPick2'));
      note(AL.t('muPickNote'));
      /* 🔴 2026-09-20 — 나중 것이 이긴다는 규칙을 **고르기 전에** 알립니다.
         ⚠ 곡이 바뀌고 나서 알리면 늦습니다. */
      var rule = note(AL.t('muRule'));
      rule.style.color = '#F2C94C';

      if (!songs.length) {
        note(AL.t('muNoSongs'));
      } else {
        /* 🔴🔴 2026-09-20 — **갈래를 먼저** 보여주고, 누르면 그 안의 곡이
           나옵니다.

           ⚠ 곡이 수십 개가 되면 죽 늘어놓은 목록에서는 못 고릅니다.
             손님은 "지금 기분에 맞는 것" 을 찾지, 곡 이름을 찾지
             않습니다. **갈래가 먼저 보여야** 합니다.

           ⚠ 한 번 고르면 그 갈래가 열린 채로 남습니다. 듣다가 다른
             곡으로 바꾸실 때 다시 찾아 들어가지 않으시게요. */
        var groups = AL.groupMusic(songs);

        /* 지금 트는 곡이 있으면 그 갈래를 열어둡니다. */
        if (openMood === null && sharedId) {
          groups.forEach(function(g){
            if (g.songs.some(function(s){ return s.id === sharedId; })) {
              openMood = g.key;
            }
          });
        }

        groups.forEach(function(g){
          var on = (openMood === g.key);

          var head = document.createElement('button');
          head.className = 'mood' + (on ? ' on' : '');
          head.innerHTML =
            '<span class="mn">' + AL.esc(g.label) + '</span>' +
            '<span class="mc">' + g.songs.length + '</span>' +
            '<span class="ma">' + (on ? '▾' : '▸') + '</span>';
          head.addEventListener('click', function(){
            openMood = on ? null : g.key;    // 한 번 더 누르면 접힙니다
            draw();
          });
          sheet.appendChild(head);

          if (!on) return;

          g.songs.forEach(function(s){
            var row = document.createElement('div');
            row.className = 'trk' + (s.id === sharedId ? ' now' : '');
            row.style.marginLeft = '10px';

            var tn = document.createElement('span'); tn.className = 'tn';
            var b = document.createElement('b'); b.textContent = s.title; tn.appendChild(b);
            var sub = document.createElement('span');
            sub.textContent = s.artist || ''; tn.appendChild(sub);
            row.appendChild(tn);

            row.appendChild(tbtn('▶', 'play', AL.t('muPlayThis'), function(){
              /* ⚠ 회사 곡은 tracks 에 안 담습니다. 공개 서랍에 있고 모두가
                 나눠 쓰니, 방마다 복사할 이유가 없습니다.
                 links 에 어느 곡인지만 적어둡니다. */
              playOnly({ shared_music_id: s.id });
            }));
            sheet.appendChild(row);
          });
        });
      }

      // ── 예전에 올린 곡 ──────────────────────────────────────────
      // ⚠ 지우지는 않습니다. 쓰시던 분이 놀랍니다.
      //   다만 **새로 올릴 수는 없습니다.**
      if (tracks.length) {
        var sep1 = document.createElement('div'); sep1.className = 'pk-sep';
        sheet.appendChild(sep1);

        title(AL.t('muList'));
        note(AL.t('muOldNote'));

        tracks.forEach(function(t, i){
          var row = document.createElement('div');
          row.className = 'trk' + (t.id === nowId ? ' now' : '');

          var tn = document.createElement('span'); tn.className = 'tn';
          var b = document.createElement('b'); b.textContent = t.title; tn.appendChild(b);
          var sz = document.createElement('span');
          sz.textContent = AL.fmtBytes(t.media_bytes); tn.appendChild(sz);
          row.appendChild(tn);

          row.appendChild(tbtn('▶', 'play', AL.t('muPlayThis'), function(){
            playOnly({ track_id: t.id });
          }));

          row.appendChild(tbtn('✕', '', AL.t('muRemove'), async function(){
            await AL.sb.from('tracks').delete().eq('id', t.id);
            try { await AL.deleteMedia(t.media_path); } catch (e) {}
            if (t.id === nowId) await stopAll();
            else draw();
          }));

          sheet.appendChild(row);
        });
      }

      // ── 유튜브 ─────────────────────────────────────────────────
      // ⚠ 그대로 둡니다. 영상과 광고가 보이니 저작권자에게 수익이 갑니다.
      var sep2 = document.createElement('div'); sep2.className = 'pk-sep';
      sheet.appendChild(sep2);
      title(AL.t('muYoutube'));
      note(AL.t('muYtNote'));

      var form = document.createElement('div'); form.className = 'pk-form';
      var inp = document.createElement('input');
      inp.type = 'url'; inp.placeholder = AL.t('muPlace');
      form.appendChild(inp);

      var go = document.createElement('button');
      go.className = 'pk-go'; go.textContent = AL.t('muSet');
      go.addEventListener('click', function(){
        var id = AL.youtubeId(inp.value);
        if (!id) { err(AL.t('muBad')); return; }
        go.disabled = true;
        playOnly({ music_youtube_id: id });
      });
      form.appendChild(go);
      sheet.appendChild(form);
    }

    draw();
  });
};


/* =====================================================================
   🔴🔴 2026-10-22 — 같이 듣기 줄 (대화창 위 · 들으면서 대화)
   · 곡 창을 닫아도 소리가 계속 납니다. 대화창 위에 작은 줄 하나만 남습니다.
     ♫ 곡 이름 · 누가 틀었는지 · [Ⅱ 잠깐 멈춤] (내 폰만) · [바꾸기] · [끄기] (둘 다)
   · 한쪽이 틀면 상대 대화창에도 바로 나옵니다(실시간 알림 'mu' + 30초마다 확인).
   · 같은 자리: 튼 시각(music_updated_at)부터 흐른 시간만큼 넘겨서 시작합니다.
   · 회사 곡(shared_music_id)만 이 줄에서 틉니다. 예전에 올린 곡 · 유튜브는 곡 창에서.
   ===================================================================== */
(function(){
  var S = { linkId: null, sideId: null, chan: null, cur: null, at: null, by: null, paused: false, songs: null, au: null };
  var en = function(){ return AL.lang === 'en'; };
  function css(){
    if (document.getElementById('muBarCss')) return;
    var st = document.createElement('style'); st.id = 'muBarCss';
    st.textContent =
      '#muBar{flex:0 0 auto;display:none;align-items:center;gap:8px;margin:6px 10px 2px;padding:8px 10px;border-radius:12px;' +
        'background:rgba(143,227,176,.13);border:1px solid rgba(143,227,176,.45)}' +
      '#muBar .mt{flex:1;min-width:0;font-size:13px;line-height:1.35}' +
      '#muBar .mt b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#muBar .mt small{display:block;font-size:11.5px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#muBar button{margin:0;flex:0 0 auto;padding:7px 10px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;' +
        'background:rgba(255,255,255,.08);color:inherit;border:1px solid rgba(128,128,128,.35)}' +
      'html[data-mode="light"] #muBar button{background:rgba(0,0,0,.04)}';
    document.head.appendChild(st);
  }
  function bar(){
    var b = document.getElementById('muBar');
    if (b) return b;
    b = document.createElement('div'); b.id = 'muBar';
    var top = document.querySelector('.chat-top');
    var after = document.getElementById('ytBox') || document.getElementById('ytStrip') || top;
    if (after && after.parentNode) after.parentNode.insertBefore(b, after.nextSibling); else document.body.prepend(b);
    b.addEventListener('click', function(e){
      var t = e.target.closest('button'); if (!t) return;
      var a = t.dataset.a;
      if (a === 'pp') { S.paused = !S.paused; if (S.au) { if (S.paused) S.au.pause(); else { seekNow(); S.au.play().catch(function(){}); } } paint(); }
      if (a === 'change') AL.openMusic(S.linkId, S.sideId).then(refresh);
      if (a === 'off') stopBoth();
    });
    return b;
  }
  function audio(){
    if (S.au) return S.au;
    S.au = document.createElement('audio'); S.au.loop = true; S.au.preload = 'auto';
    S.au.addEventListener('loadedmetadata', seekNow);
    document.body.appendChild(S.au);
    return S.au;
  }
  /* 튼 시각부터 흐른 만큼 — 두 사람이 같은 자리를 듣습니다 */
  function seekNow(){
    var au = S.au; if (!au || !S.at || !isFinite(au.duration) || !au.duration) return;
    var el = Math.max(0, (Date.now() - Date.parse(S.at)) / 1000);
    var want = el % au.duration;
    if (Math.abs(au.currentTime - want) > 2) { try { au.currentTime = want; } catch (e) {} }
  }
  async function songsList(){
    if (S.songs) return S.songs;
    try { S.songs = await AL.loadMusicList(); } catch (e) { S.songs = []; }
    return S.songs;
  }
  async function stopBoth(){
    try {
      await AL.sb.from('links').update({ shared_music_id: null, track_id: null, music_youtube_id: null,
        music_playing: false, music_updated_at: new Date().toISOString() }).eq('id', S.linkId);
    } catch (e) {}
    changed('stop');
  }
  function bc(action){ try { if (S.chan) S.chan.send({ type: 'broadcast', event: 'mu', payload: { action: action, by: S.sideId } }); } catch (e) {} }
  async function refresh(){
    if (!S.linkId) return;
    var r = null;
    try { r = await AL.sb.from('links').select('shared_music_id, music_updated_at, music_set_by').eq('id', S.linkId).maybeSingle(); } catch (e) {}
    var d = (r && r.data) || {};
    var changedSong = d.shared_music_id !== S.cur || d.music_updated_at !== S.at;
    S.by = d.music_set_by || null;
    if (!d.shared_music_id) {
      S.cur = null; S.at = null;
      if (S.au) { S.au.pause(); S.au.removeAttribute('src'); S.au.load(); }
      paint(); return;
    }
    if (changedSong) {
      S.cur = d.shared_music_id; S.at = d.music_updated_at; S.paused = false;
      var list = await songsList();
      var sg = list.filter(function(x){ return x.id === S.cur; })[0];
      S.song = sg || null;
      if (sg) {
        var au = audio();
        au.src = AL.musicUrl(sg.path) || '';
        au.play().catch(function(){ S.paused = true; paint(); });   /* 폰이 막으면 [▶ 듣기] 를 누르게 */
      }
    }
    paint();
  }
  async function paint(){
    css();
    var b = bar();
    if (!S.cur || !S.song) { b.style.display = 'none'; return; }
    var who = '';
    if (S.by === S.sideId) who = en() ? 'You started it' : '내가 틀었어요';
    else if (S.by) who = en() ? 'Your contact started it' : '상대가 틀었어요';
    b.innerHTML = '<span style="font-size:18px">♫</span><span class="mt"><b>' + AL.esc(S.song.title) + '</b><small>' +
      AL.esc((S.song.artist ? S.song.artist + ' · ' : '') + who) + '</small></span>' +
      '<button type="button" data-a="pp">' + (S.paused ? (en() ? '▶ Play' : '▶ 듣기') : (en() ? 'Ⅱ Pause' : 'Ⅱ 멈춤')) + '</button>' +
      '<button type="button" data-a="change">' + (en() ? 'Change' : '바꾸기') + '</button>' +
      '<button type="button" data-a="off">' + (en() ? 'Off' : '끄기') + '</button>';
    b.style.display = 'flex';
  }
  function changed(action){ bc(action); refresh(); }
  AL.muBar = {
    init: function(o){
      S.linkId = o.linkId; S.sideId = o.sideId; refresh();
      if (!AL.muBar._t) AL.muBar._t = setInterval(refresh, 30000);
    },
    listen: function(ch){
      S.chan = ch;
      ch.on('broadcast', { event: 'mu' }, function(e){ var p = e.payload || {}; if (p.by === S.sideId) return; refresh(); });
    },
    changed: changed,
    refresh: refresh,
  };
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') { refresh(); if (S.au && !S.paused) seekNow(); } });
})();

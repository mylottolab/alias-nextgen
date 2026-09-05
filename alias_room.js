/* =====================================================================
   Alias Next-Gen — 기념일 · 오늘의 질문 · 같이 듣기 · 자리비움
   2026-09-05

   Aliascall 의 hotline_goals · 오늘의 질문 · 같이 듣기 · 자리비움을
   1:1 관계에 맞게 다시 그린 것입니다.

   ⚠ 함정 ⑲ — 고치면 부르는 화면의 ?v= 도 함께 올리세요.
     지금 부르는 화면: alias_chat.html
   ===================================================================== */

window.AL = window.AL || {};

/* ── 기념일 ──────────────────────────────────────────────────────────
   D-DAY   앞으로 남은 날
   D+DAY   지나온 날
   같은 표에 담고 날짜가 앞이냐 뒤냐로 갈라 그립니다.
------------------------------------------------------------------- */
AL.dayDiff = function(dateStr){
  var a = new Date(dateStr + 'T00:00:00');
  var b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
};

AL.goalLabel = function(dateStr){
  var d = AL.dayDiff(dateStr);
  if (d === 0) return AL.t('glToday');
  if (d > 0)  return AL.t('glDminus', { n: d });
  return AL.t('glDplus', { n: -d + 1 });     // 만난 날이 1일째
};

AL.loadGoals = async function(linkId){
  var res = await AL.sb.from('goals')
    .select('id, title, goal_date, emoji')
    .eq('link_id', linkId).order('goal_date', { ascending: true });
  if (res.error) throw res.error;
  return res.data || [];
};

AL.openGoals = function(linkId, sideId){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

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

    async function draw(){
      var rows = [];
      try { rows = await AL.loadGoals(linkId); } catch (e) { console.error(e); }

      sheet.innerHTML = '';
      var grip = document.createElement('div'); grip.className = 'grip';
      sheet.appendChild(grip);

      var h = document.createElement('p'); h.className = 'pk-title';
      h.textContent = AL.t('glTitle'); sheet.appendChild(h);
      var n = document.createElement('p'); n.className = 'pk-note';
      n.textContent = AL.t('glShared'); sheet.appendChild(n);

      if (!rows.length) {
        var e0 = document.createElement('p'); e0.className = 'pk-note';
        e0.textContent = AL.t('glNone'); sheet.appendChild(e0);
      }

      rows.forEach(function(g){
        var row = document.createElement('div'); row.className = 'goal-row';
        var gi = document.createElement('span'); gi.className = 'gi';
        gi.textContent = g.emoji || '🎉'; row.appendChild(gi);

        var gm = document.createElement('span'); gm.className = 'gm';
        var b = document.createElement('b'); b.textContent = g.title; gm.appendChild(b);
        var sp = document.createElement('span'); sp.textContent = g.goal_date; gm.appendChild(sp);
        row.appendChild(gm);

        var gn = document.createElement('span'); gn.className = 'gn';
        gn.textContent = AL.goalLabel(g.goal_date); row.appendChild(gn);

        var del = document.createElement('button');
        del.textContent = AL.t('glDelete');
        del.addEventListener('click', async function(){
          await AL.sb.from('goals').delete().eq('id', g.id);
          draw();
        });
        row.appendChild(del);
        sheet.appendChild(row);
      });

      var sep = document.createElement('div'); sep.className = 'pk-sep';
      sheet.appendChild(sep);

      var form = document.createElement('div'); form.className = 'pk-form';
      var l1 = document.createElement('p'); l1.className = 'pk-note';
      l1.style.margin = '0 0 6px'; l1.textContent = AL.t('glName');
      form.appendChild(l1);
      var t = document.createElement('input');
      t.type = 'text'; t.maxLength = 40; form.appendChild(t);

      var l2 = document.createElement('p'); l2.className = 'pk-note';
      l2.style.margin = '12px 0 6px'; l2.textContent = AL.t('glDate');
      form.appendChild(l2);
      var d = document.createElement('input');
      d.type = 'date'; form.appendChild(d);

      var go = document.createElement('button');
      go.className = 'pk-go'; go.textContent = AL.t('glSave');
      go.addEventListener('click', async function(){
        if (!t.value.trim() || !d.value) return;
        go.disabled = true;
        try {
          var r = await AL.sb.from('goals').insert({
            link_id: linkId, made_by: sideId,
            title: t.value.trim(), goal_date: d.value,
          });
          if (r.error) throw r.error;
          draw();
        } catch (e) {
          console.error(e);
          var err = document.createElement('div'); err.className = 'pk-err';
          err.textContent = e.message || String(e);
          form.appendChild(err);
          go.disabled = false;
        }
      });
      form.appendChild(go);
      sheet.appendChild(form);
    }
    draw();
  });
};


/* ── 오늘의 질문 ─────────────────────────────────────────────────────
   ⚠ 내가 답해야 상대 답이 보입니다. 먼저 보고 맞추면 재미가 없습니다.
   ⚠ 질문은 날짜와 링크로 정해집니다. 그래야 양쪽이 같은 질문을 봅니다.
------------------------------------------------------------------- */
AL.todayQuestionId = function(linkId, count){
  // 날짜 + 링크로 숫자를 만들어 나머지를 씁니다. 서버가 필요 없습니다.
  var d = new Date();
  var key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  var h = key;
  for (var i = 0; i < linkId.length; i++) h = (h * 31 + linkId.charCodeAt(i)) % 1000003;
  return (h % count) + 1;
};

AL.openQuestion = function(linkId, sideId){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

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

    async function draw(){
      sheet.innerHTML = '<div class="grip"></div>';

      var qs = await AL.sb.from('daily_questions').select('id, q_kr, q_en').order('id');
      var list = (qs.data || []);
      if (!list.length) { close(); return; }

      var qid = AL.todayQuestionId(linkId, list.length);
      var q = list.filter(function(x){ return x.id === qid; })[0] || list[0];

      var today = new Date();
      var ymd = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0');

      var ans = await AL.sb.from('question_answers')
        .select('side_id, answer').eq('link_id', linkId).eq('on_date', ymd);
      var rows = ans.data || [];
      var mine = rows.filter(function(r){ return r.side_id === sideId; })[0];
      var theirs = rows.filter(function(r){ return r.side_id !== sideId; })[0];

      var box = document.createElement('div'); box.className = 'qbox';
      var qq = document.createElement('div'); qq.className = 'qq';
      qq.textContent = AL.lang === 'kr' ? q.q_kr : q.q_en;
      box.appendChild(qq);

      if (!mine) {
        var ta = document.createElement('textarea');
        ta.placeholder = AL.t('qPlace'); ta.maxLength = 500;
        box.appendChild(ta);
        var go = document.createElement('button');
        go.className = 'pk-go'; go.style.marginTop = '12px';
        go.textContent = AL.t('qSend');
        go.addEventListener('click', async function(){
          if (!ta.value.trim()) return;
          go.disabled = true;
          var r = await AL.sb.from('question_answers').insert({
            link_id: linkId, side_id: sideId, question_id: q.id,
            on_date: ymd, answer: ta.value.trim(),
          });
          if (r.error) { console.error(r.error); go.disabled = false; return; }
          draw();
        });
        box.appendChild(go);
      } else {
        var m = document.createElement('div'); m.className = 'qans';
        var mb = document.createElement('b'); mb.textContent = AL.t('qMine'); m.appendChild(mb);
        var mp = document.createElement('p'); mp.textContent = mine.answer; m.appendChild(mp);
        box.appendChild(m);

        if (theirs) {
          var t2 = document.createElement('div'); t2.className = 'qans';
          var tb = document.createElement('b'); tb.textContent = AL.t('qTheirs'); t2.appendChild(tb);
          var tp = document.createElement('p'); tp.textContent = theirs.answer; t2.appendChild(tp);
          box.appendChild(t2);
        } else {
          var w = document.createElement('div'); w.className = 'qhide';
          w.textContent = AL.t('qWaiting'); box.appendChild(w);
        }
      }
      sheet.appendChild(box);
    }
    draw();
  });
};


/* ── 같이 듣기 ───────────────────────────────────────────────────────
   ⚠ 음원을 우리가 담지 않습니다. 유튜브 주소만 담습니다.
     음원을 담으면 저작권 문제가 생기고 비용도 큽니다.
------------------------------------------------------------------- */
AL.youtubeId = function(url){
  var m = String(url || '').match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

AL.MUSIC_TOTAL_MAX = 100 * 1024 * 1024;   // 방 하나에 100MB — 음원 대여섯 곡

AL.openMusic = function(linkId, sideId){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

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

    async function draw(){
      sheet.innerHTML = '<div class="grip"></div>';
      title(AL.t('muTitle'));
      note(AL.t('muNote'));

      var link = await AL.sb.from('links')
        .select('music_youtube_id, track_id').eq('id', linkId).maybeSingle();
      var vid = link.data ? link.data.music_youtube_id : null;
      var nowId = link.data ? link.data.track_id : null;

      var tr = await AL.sb.from('tracks')
        .select('id, title, media_path, media_bytes, ord, created_at')
        .eq('link_id', linkId).order('ord').order('created_at');
      var tracks = tr.data || [];

      // ── 지금 트는 것 ────────────────────────────────────────────
      var now = tracks.filter(function(t){ return t.id === nowId; })[0];
      if (now) {
        note(AL.t('muPlaying') + ' · ' + now.title);
        var au = document.createElement('audio');
        au.controls = true; au.autoplay = true; au.style.width = '100%';
        try { au.src = await AL.mediaUrl(now.media_path); } catch (e) {}
        // 끝나면 다음 곡으로 넘어갑니다.
        au.addEventListener('ended', async function(){
          var i = tracks.findIndex(function(t){ return t.id === now.id; });
          var next = tracks[i + 1];
          await AL.sb.from('links').update({
            track_id: next ? next.id : null,
            music_playing: !!next,
            music_updated_at: new Date().toISOString(),
          }).eq('id', linkId);
          draw();
        });
        sheet.appendChild(au);
      } else if (vid) {
        var pl = document.createElement('div'); pl.className = 'player';
        var fr = document.createElement('iframe');
        fr.src = 'https://www.youtube.com/embed/' + vid;
        fr.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
        fr.allowFullscreen = true;
        pl.appendChild(fr); sheet.appendChild(pl);
        var st = document.createElement('button');
        st.className = 'pk-opt'; st.style.marginTop = '12px';
        st.textContent = AL.t('muStop');
        st.addEventListener('click', async function(){
          await AL.sb.from('links').update({
            music_youtube_id: null, music_playing: false,
            music_updated_at: new Date().toISOString(),
          }).eq('id', linkId);
          draw();
        });
        sheet.appendChild(st);
      } else {
        note(AL.t('muNone'));
      }

      var sep0 = document.createElement('div'); sep0.className = 'pk-sep';
      sheet.appendChild(sep0);

      // ── 재생목록 ────────────────────────────────────────────────
      title(AL.t('muList'));

      var used = tracks.reduce(function(a, t){ return a + (t.media_bytes || 0); }, 0);
      var box = document.createElement('div'); box.className = 'usage';
      var lab = document.createElement('span');
      lab.textContent = AL.t('muUsed', {
        n: tracks.length, used: AL.fmtBytes(used),
        max: AL.fmtBytes(AL.MUSIC_TOTAL_MAX),
      });
      box.appendChild(lab);
      var bar = document.createElement('span'); bar.className = 'bar';
      var fill = document.createElement('i');
      var pct = Math.min(100, Math.round(used / AL.MUSIC_TOTAL_MAX * 100));
      fill.style.width = pct + '%';
      if (pct >= 75) fill.className = 'hot';
      bar.appendChild(fill); box.appendChild(bar);
      sheet.appendChild(box);

      if (!tracks.length) note(AL.t('muListNone'));

      tracks.forEach(function(t, i){
        var row = document.createElement('div');
        row.className = 'trk' + (t.id === nowId ? ' now' : '');

        var tn = document.createElement('span'); tn.className = 'tn';
        var b = document.createElement('b'); b.textContent = t.title; tn.appendChild(b);
        var sz = document.createElement('span');
        sz.textContent = AL.fmtBytes(t.media_bytes); tn.appendChild(sz);
        row.appendChild(tn);

        row.appendChild(tbtn('▶', 'play', AL.t('muPlayThis'), async function(){
          await AL.sb.from('links').update({
            track_id: t.id, music_youtube_id: null, music_playing: true,
            music_set_by: sideId, music_updated_at: new Date().toISOString(),
          }).eq('id', linkId);
          draw();
        }));

        if (i > 0) row.appendChild(tbtn('↑', '', AL.t('muUp'), function(){ move(tracks, i, -1); }));
        if (i < tracks.length - 1) row.appendChild(tbtn('↓', '', AL.t('muDown'), function(){ move(tracks, i, 1); }));

        row.appendChild(tbtn('✕', '', AL.t('muRemove'), async function(){
          await AL.sb.from('tracks').delete().eq('id', t.id);
          try { await AL.deleteMedia(t.media_path); } catch (e) {}
          if (t.id === nowId) {
            await AL.sb.from('links').update({ track_id: null, music_playing: false }).eq('id', linkId);
          }
          draw();
        }));

        sheet.appendChild(row);
      });

      // ── 올리기 ─────────────────────────────────────────────────
      var sep1 = document.createElement('div'); sep1.className = 'pk-sep';
      sheet.appendChild(sep1);

      title(AL.t('muUpload'));
      // ⚠ 비용을 미리 알립니다. 모르고 쌓이면 나중에 곤란합니다.
      note(AL.t('muCostNote'));
      note(AL.t('muOwnNote', { max: AL.fmtBytes(AL.MUSIC_MAX_BYTES) }));

      var pick = document.createElement('input');
      pick.type = 'file'; pick.accept = 'audio/*'; pick.multiple = true;
      pick.style.display = 'none';
      sheet.appendChild(pick);

      var pb = document.createElement('button');
      pb.className = 'pk-opt';
      pb.textContent = AL.t('muPick');
      pb.addEventListener('click', function(){ pick.click(); });
      sheet.appendChild(pb);

      pick.addEventListener('change', async function(){
        var files = Array.prototype.slice.call(this.files || []);
        this.value = '';
        if (!files.length) return;

        pb.disabled = true;
        var room = AL.MUSIC_TOTAL_MAX - used;
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (f.size > AL.MUSIC_MAX_BYTES) {
            err(AL.t('mdTooBig', { max: AL.fmtBytes(AL.MUSIC_MAX_BYTES) }));
            break;
          }
          if (f.size > room) {
            err(AL.t('muFull', { max: AL.fmtBytes(AL.MUSIC_TOTAL_MAX) }));
            break;
          }
          pb.textContent = AL.t('mdUploading') +
            (files.length > 1 ? ' (' + (i + 1) + '/' + files.length + ')' : '');
          try {
            var media = await AL.uploadMedia(linkId, sideId, f);
            var r = await AL.sb.from('tracks').insert({
              link_id: linkId, added_by: sideId,
              title: f.name.replace(/\.[^.]+$/, ''),
              media_path: media.path, media_bytes: media.bytes,
              ord: tracks.length + i,
            });
            if (r.error) throw r.error;
            room -= f.size;
          } catch (e) {
            console.error(e);
            err(AL.t('mdFailed', { msg: e.message || String(e) }));
            break;
          }
        }
        draw();
      });

      // ── 유튜브 ─────────────────────────────────────────────────
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
      go.addEventListener('click', async function(){
        var id = AL.youtubeId(inp.value);
        if (!id) { err(AL.t('muBad')); return; }
        go.disabled = true;
        // ⚠ 유튜브와 올린 음원은 서로를 밀어냅니다. 둘이 동시에 나면 시끄럽습니다.
        await AL.sb.from('links').update({
          music_youtube_id: id, track_id: null, music_playing: true,
          music_set_by: sideId, music_updated_at: new Date().toISOString(),
        }).eq('id', linkId);
        draw();
      });
      form.appendChild(go);
      sheet.appendChild(form);
    }

    function tbtn(icon, cls, label, onClick){
      var b = document.createElement('button');
      b.className = 'tb ' + cls;
      b.textContent = icon;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', onClick);
      return b;
    }

    /* 순서 바꾸기 — 두 곡의 ord 를 맞바꿉니다. */
    async function move(tracks, i, dir){
      var a = tracks[i], b = tracks[i + dir];
      if (!a || !b) return;
      await AL.sb.from('tracks').update({ ord: i + dir }).eq('id', a.id);
      await AL.sb.from('tracks').update({ ord: i }).eq('id', b.id);
      draw();
    }

    draw();
  });
};


/* ── 자리비움 ────────────────────────────────────────────────────────
   ⚠ 켜는 순간 away_since 를 새로 찍습니다. 그래야 자동응답이 다시 한 번 나갑니다.
     안 찍으면 예전에 한 번 보낸 뒤로 영영 안 나갑니다.
------------------------------------------------------------------- */
AL.openAway = function(sideId, current){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

    var done = false;
    function close(v){
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      bg.remove(); sheet.remove();
      resolve(v);
    }
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    sheet.innerHTML = '<div class="grip"></div>';
    var h = document.createElement('p'); h.className = 'pk-title';
    h.textContent = AL.t('awTitle'); sheet.appendChild(h);
    var n = document.createElement('p'); n.className = 'pk-note';
    n.textContent = AL.t('awNote'); sheet.appendChild(n);

    var form = document.createElement('div'); form.className = 'pk-form';
    var ta = document.createElement('textarea');
    ta.className = 'rp-detail';
    ta.placeholder = AL.t('awPlace');
    ta.value = (current && current.message) || '';
    ta.maxLength = 200;
    form.appendChild(ta);

    var go = document.createElement('button');
    go.className = 'pk-go'; go.style.marginTop = '12px';
    go.textContent = AL.t(current && current.on ? 'awOff' : 'awOn');
    go.addEventListener('click', async function(){
      go.disabled = true;
      var turningOn = !(current && current.on);
      var patch = turningOn
        ? { away_on: true,
            away_message: ta.value.trim() || AL.t('awPlace'),
            away_since: new Date().toISOString() }
        : { away_on: false };
      var r = await AL.sb.from('link_sides').update(patch).eq('id', sideId).select('id');
      if (r.error || !r.data || !r.data.length) {
        var err = document.createElement('div'); err.className = 'pk-err';
        err.textContent = (r.error && r.error.message) || AL.t('errNoRows');
        form.appendChild(err);
        go.disabled = false;
        return;
      }
      close({ on: turningOn, message: patch.away_message || null });
    });
    form.appendChild(go);
    sheet.appendChild(form);
  });
};

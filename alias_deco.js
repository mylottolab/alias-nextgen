/* =====================================================================
   🔴🔴 2026-10-21 — 배경 사진 꾸미기 (부름 갤러리)

   어떻게 쓰나
     갤러리 꾸미기 → 배경 사진 → [🎨 배경 사진 꾸미기]
     · 😀 이모티콘   눌러서 사진 위에 붙이기
     · 가 글씨       글을 써서 붙이기 (색 · 테두리)
     · ✨ 무늬       테두리 · 하트 · 별 · 꽃 · 물방울을 사진 전체에
     · 붙인 것을 손가락으로 끌어 옮기고, 두 손가락으로 키우기 · 돌리기
       (한 손가락만 쓸 때는 아래 [크게] [작게] [돌리기] 단추)
     · [저장] 하면 꾸민 그림이 새 배경 사진이 됩니다

   AL.decoEditor(imageUrl) → Promise<Blob | null>   (취소하면 null)
   ===================================================================== */
window.AL = window.AL || {};
(function(){
  var en = function(){ return AL.lang === 'en'; };
  var L = function(k, e){ return en() ? e : k; };

  var EMOJI = ['❤️','💕','💖','😍','🥰','😊','😂','🤣','😎','🥳','👍','👏','🙏','💪','🎉','🎂','🎁','🌸','🌷','🌹','🌻','🍀','🌈','☀️','🌙','⭐','✨','🔥','💯','🎵','☕','🍰','🐶','🐱','🐰','🐻','🦋','🍓','🍎','🏖️','⛰️','🚗','✈️','💌','🏠','🎈','👑','💎'];
  var COLORS = ['#FFFFFF', '#191919', '#FFE45C', '#FF6B8A', '#7CC8FF', '#8FE3B0', '#C59BFF', '#FF9F43'];
  var PATTERNS = [
    ['frame',   L('🖼️ 흰 테두리', '🖼️ White frame')],
    ['gold',    L('🟨 금색 테두리', '🟨 Gold frame')],
    ['hearts',  L('💕 하트 흩뿌리기', '💕 Hearts')],
    ['stars',   L('✨ 별 흩뿌리기', '✨ Stars')],
    ['flowers', L('🌸 꽃 둘레', '🌸 Flower border')],
    ['dots',    L('🫧 물방울 점', '🫧 Bubbles')],
    ['film',    L('🎞️ 필름', '🎞️ Film')],
  ];

  function css(){
    if (document.getElementById('dcCss')) return;
    var s = document.createElement('style'); s.id = 'dcCss';
    s.textContent =
      '#dcWrap{position:fixed;inset:0;z-index:9500;background:#0B0F14;color:#EEF2F7;display:flex;flex-direction:column;' +
        'padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);font-family:inherit}' +
      '#dcTop{display:flex;align-items:center;gap:8px;padding:10px 12px}' +
      '#dcTop b{flex:1;font-size:16px}' +
      '#dcTop button,#dcBar button,#dcSheet button{margin:0;cursor:pointer;border-radius:999px;font-weight:800;font-size:13.5px;' +
        'padding:9px 14px;background:rgba(255,255,255,.1);color:#EEF2F7;border:1px solid rgba(255,255,255,.22)}' +
      '#dcTop .go{background:#8FE3B0;color:#0E1621;border-color:#8FE3B0}' +
      '#dcStage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px;touch-action:none}' +
      '#dcCv{max-width:100%;max-height:100%;border-radius:10px;touch-action:none;background:#111}' +
      '#dcBar{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:8px 10px}' +
      '#dcBar .sel{display:none}#dcBar.has .sel{display:inline-block}' +
      '#dcBar .bad{color:#FFB4B4;border-color:rgba(255,120,120,.5)}' +
      '#dcSheet{display:none;max-height:42vh;overflow:auto;padding:10px 12px 14px;background:#151C25;border-top:1px solid rgba(255,255,255,.12)}' +
      '#dcSheet.on{display:block}' +
      '#dcSheet .em{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}' +
      '#dcSheet .em button{font-size:24px;padding:6px 0;background:transparent;border:0;border-radius:10px}' +
      '#dcSheet input{width:100%;box-sizing:border-box;padding:12px;border-radius:11px;font-size:16px;margin:0 0 8px;' +
        'background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.25)}' +
      '#dcSheet .cl{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}' +
      '#dcSheet .cl button{width:34px;height:34px;padding:0;border-radius:50%}' +
      '#dcSheet .cl button.on{outline:3px solid #8FE3B0;outline-offset:2px}' +
      '#dcSheet .pt{display:flex;gap:8px;flex-wrap:wrap}' +
      '#dcSheet .pt button.on{background:#8FE3B0;color:#0E1621;border-color:#8FE3B0}' +
      '#dcSheet .hint{font-size:12.5px;opacity:.7;margin:8px 2px 0;line-height:1.6}';
    document.head.appendChild(s);
  }

  /* 같은 무늬가 열 때마다 같은 자리에 오도록 — 간단한 난수 */
  function rnd(seed){ var x = seed || 1; return function(){ x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

  function drawPattern(ctx, W, H, k, seed){
    var r = rnd(seed), m = Math.min(W, H);
    ctx.save();
    if (k === 'frame') {
      var b = m * 0.035; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = b;
      ctx.strokeRect(b / 2, b / 2, W - b, H - b);
    } else if (k === 'gold') {
      var g = m * 0.018; ctx.strokeStyle = '#E8C15A'; ctx.lineWidth = g;
      ctx.strokeRect(g * 1.5, g * 1.5, W - g * 3, H - g * 3);
      ctx.lineWidth = g / 2.5; ctx.strokeRect(g * 3.6, g * 3.6, W - g * 7.2, H - g * 7.2);
    } else if (k === 'hearts' || k === 'stars') {
      var ch = k === 'hearts' ? ['❤️', '💕', '💗'] : ['✨', '⭐', '🌟'];
      for (var i = 0; i < 26; i++) {
        var s = m * (0.03 + r() * 0.05);
        ctx.globalAlpha = 0.55 + r() * 0.45;
        ctx.font = s + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ch[i % ch.length], r() * W, r() * H);
      }
    } else if (k === 'flowers') {
      var fs = m * 0.07, step = fs * 1.05, f = ['🌸', '🌼', '🌷'];
      ctx.font = fs + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var n = 0;
      for (var x = fs / 2; x < W; x += step) { ctx.fillText(f[n++ % 3], x, fs / 2); ctx.fillText(f[n++ % 3], x, H - fs / 2); }
      for (var y = fs * 1.5; y < H - fs; y += step) { ctx.fillText(f[n++ % 3], fs / 2, y); ctx.fillText(f[n++ % 3], W - fs / 2, y); }
    } else if (k === 'dots') {
      for (var j = 0; j < 40; j++) {
        var rr = m * (0.01 + r() * 0.04);
        ctx.globalAlpha = 0.18 + r() * 0.3; ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(r() * W, r() * H, rr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, rr / 8); ctx.stroke();
      }
    } else if (k === 'film') {
      var bh = m * 0.075; ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
      ctx.fillStyle = '#F2F2F2'; var hw = bh * 0.45, hh = bh * 0.42;
      for (var hx = hw * 0.6; hx < W; hx += hw * 2) {
        ctx.fillRect(hx, (bh - hh) / 2, hw, hh); ctx.fillRect(hx, H - bh + (bh - hh) / 2, hw, hh);
      }
    }
    ctx.restore();
  }

  function itemFont(it, W){ var px = Math.max(8, it.size * W); return (it.type === 'text' ? '800 ' : '') + px + 'px ' + (it.type === 'text' ? 'system-ui, sans-serif' : 'sans-serif'); }

  function drawItem(ctx, it, W, H, selected){
    ctx.save();
    ctx.translate(it.x * W, it.y * H); ctx.rotate(it.rot || 0);
    ctx.font = itemFont(it, W); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var lines = String(it.s).split('\n');
    var lh = it.size * W * 1.15, top = -(lines.length - 1) * lh / 2;
    lines.forEach(function(ln, i){
      if (it.type === 'text') {
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, it.size * W * 0.16);
        ctx.strokeStyle = (it.color === '#191919') ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.75)';
        ctx.strokeText(ln, 0, top + i * lh);
        ctx.fillStyle = it.color || '#FFFFFF';
      }
      ctx.fillText(ln, 0, top + i * lh);
    });
    if (selected) {
      var bb = box(ctx, it, W);
      ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = '#8FE3B0';
      ctx.strokeRect(-bb.w / 2 - 8, -bb.h / 2 - 8, bb.w + 16, bb.h + 16);
    }
    ctx.restore();
  }
  function box(ctx, it, W){
    ctx.save(); ctx.font = itemFont(it, W);
    var lines = String(it.s).split('\n'), w = 0;
    lines.forEach(function(ln){ w = Math.max(w, ctx.measureText(ln).width); });
    ctx.restore();
    return { w: w, h: lines.length * it.size * W * 1.15 };
  }

  AL.decoEditor = function(imageUrl){
    return new Promise(async function(resolve){
      css();
      /* ⚠ 다른 곳(저장소)의 사진을 캔버스에 그리면 저장이 막힙니다 → 파일로 받아서 그립니다 */
      var img;
      try {
        var blob = await (await fetch(imageUrl)).blob();
        img = await createImageBitmap(blob);
      } catch (e) {
        alert(L('사진을 불러오지 못했습니다. 잠시 뒤 다시 해 주세요.', 'Could not load the photo. Please try again.'));
        resolve(null); return;
      }
      var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      var W = Math.round(img.width * scale), H = Math.round(img.height * scale);

      var items = [], pats = {}, sel = -1, txtColor = '#FFFFFF', seedBase = Date.now() % 100000 + 7;

      var wrap = document.createElement('div'); wrap.id = 'dcWrap';
      wrap.innerHTML =
        '<div id="dcTop"><button type="button" id="dcNo">' + L('취소', 'Cancel') + '</button><b>🎨 ' + L('배경 사진 꾸미기', 'Decorate background') + '</b>' +
          '<button type="button" class="go" id="dcGo">' + L('저장', 'Save') + '</button></div>' +
        '<div id="dcStage"><canvas id="dcCv"></canvas></div>' +
        '<div id="dcBar">' +
          '<button type="button" data-a="emoji">😀 ' + L('이모티콘', 'Emoji') + '</button>' +
          '<button type="button" data-a="text">가 ' + L('글씨', 'Text') + '</button>' +
          '<button type="button" data-a="pat">✨ ' + L('무늬', 'Patterns') + '</button>' +
          '<button type="button" class="sel" data-a="big">＋ ' + L('크게', 'Bigger') + '</button>' +
          '<button type="button" class="sel" data-a="small">－ ' + L('작게', 'Smaller') + '</button>' +
          '<button type="button" class="sel" data-a="rot">↻ ' + L('돌리기', 'Rotate') + '</button>' +
          '<button type="button" class="sel bad" data-a="del">🗑 ' + L('지우기', 'Delete') + '</button>' +
        '</div>' +
        '<div id="dcSheet"></div>';
      document.body.appendChild(wrap);
      var cv = wrap.querySelector('#dcCv'), ctx = cv.getContext('2d'), sheet = wrap.querySelector('#dcSheet'), bar = wrap.querySelector('#dcBar');
      cv.width = W; cv.height = H;

      function draw(forSave){
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        PATTERNS.forEach(function(p, i){ if (pats[p[0]]) drawPattern(ctx, W, H, p[0], seedBase + i * 101); });
        items.forEach(function(it, i){ drawItem(ctx, it, W, H, !forSave && i === sel); });
        bar.classList.toggle('has', sel >= 0);
      }
      function add(it){ items.push(it); sel = items.length - 1; draw(); }

      function openSheet(kind){
        if (sheet.dataset.k === kind && sheet.classList.contains('on')) { sheet.classList.remove('on'); sheet.dataset.k = ''; return; }
        sheet.dataset.k = kind; sheet.classList.add('on');
        if (kind === 'emoji') {
          sheet.innerHTML = '<div class="em">' + EMOJI.map(function(e){ return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join('') + '</div>' +
            '<div class="hint">' + L('누르면 사진 가운데에 붙습니다. 끌어서 옮기고, 두 손가락으로 키우거나 돌리세요.', 'Tap to add. Drag to move; pinch to resize or rotate.') + '</div>';
          sheet.onclick = function(e){ var b = e.target.closest('[data-e]'); if (!b) return;
            add({ type: 'emoji', s: b.dataset.e, x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4, size: 0.14, rot: 0 }); };
        } else if (kind === 'text') {
          sheet.innerHTML = '<input type="text" id="dcTx" maxlength="40" placeholder="' + L('새길 글씨 (예: 우리 가족 💕)', 'Your text') + '">' +
            '<div class="cl">' + COLORS.map(function(c){ return '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (c === txtColor ? ' class="on"' : '') + '></button>'; }).join('') + '</div>' +
            '<button type="button" id="dcTxGo" style="width:100%;background:#8FE3B0;color:#0E1621;border-color:#8FE3B0">' + L('붙이기', 'Add') + '</button>';
          var tx = sheet.querySelector('#dcTx'); setTimeout(function(){ tx.focus(); }, 50);
          sheet.onclick = function(e){
            var c = e.target.closest('[data-c]');
            if (c) { txtColor = c.dataset.c; sheet.querySelectorAll('[data-c]').forEach(function(x){ x.classList.toggle('on', x === c); });
              if (sel >= 0 && items[sel].type === 'text') { items[sel].color = txtColor; draw(); } return; }
            if (e.target.id === 'dcTxGo') {
              var v = tx.value.trim(); if (!v) { tx.focus(); return; }
              add({ type: 'text', s: v, x: 0.5, y: 0.5, size: 0.075, rot: 0, color: txtColor });
              tx.value = ''; sheet.classList.remove('on'); sheet.dataset.k = '';
            }
          };
        } else if (kind === 'pat') {
          var paint = function(){
            sheet.innerHTML = '<div class="pt">' + PATTERNS.map(function(p){ return '<button type="button" data-p="' + p[0] + '"' + (pats[p[0]] ? ' class="on"' : '') + '>' + p[1] + '</button>'; }).join('') + '</div>' +
              '<div class="hint">' + L('여러 개를 함께 고를 수 있습니다. 다시 누르면 빠집니다.', 'Pick several. Tap again to remove.') + '</div>';
          };
          paint();
          sheet.onclick = function(e){ var b = e.target.closest('[data-p]'); if (!b) return; pats[b.dataset.p] = !pats[b.dataset.p]; paint(); draw(); };
        }
      }

      bar.addEventListener('click', function(e){
        var b = e.target.closest('[data-a]'); if (!b) return;
        var a = b.dataset.a, it = items[sel];
        if (a === 'emoji' || a === 'text' || a === 'pat') return openSheet(a);
        if (!it) return;
        if (a === 'big') it.size = Math.min(0.9, it.size * 1.2);
        if (a === 'small') it.size = Math.max(0.02, it.size / 1.2);
        if (a === 'rot') it.rot = (it.rot || 0) + Math.PI / 12;
        if (a === 'del') { items.splice(sel, 1); sel = -1; }
        draw();
      });

      /* ── 끌기 · 두 손가락으로 키우기/돌리기 ── */
      var pts = {}, start = null;
      function pos(e){ var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
      function hit(p){
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i], bb = box(ctx, it, W);
          var dx = (p.x - it.x) * W, dy = (p.y - it.y) * H, c = Math.cos(-(it.rot || 0)), s = Math.sin(-(it.rot || 0));
          var lx = dx * c - dy * s, ly = dx * s + dy * c;
          if (Math.abs(lx) <= bb.w / 2 + 14 && Math.abs(ly) <= bb.h / 2 + 14) return i;
        }
        return -1;
      }
      function snap(){
        var ids = Object.keys(pts), it = items[sel]; if (!it) { start = null; return; }
        if (ids.length >= 2) {
          var a = pts[ids[0]], b = pts[ids[1]];
          start = { two: true, d: Math.hypot((a.x - b.x) * W, (a.y - b.y) * H), ang: Math.atan2((b.y - a.y) * H, (b.x - a.x) * W), size: it.size, rot: it.rot || 0 };
        } else if (ids.length === 1) {
          var p = pts[ids[0]]; start = { two: false, px: p.x, py: p.y, x: it.x, y: it.y };
        }
      }
      cv.addEventListener('pointerdown', function(e){
        cv.setPointerCapture(e.pointerId); pts[e.pointerId] = pos(e);
        if (Object.keys(pts).length === 1) { sel = hit(pts[e.pointerId]); draw(); }
        snap();
      });
      cv.addEventListener('pointermove', function(e){
        if (!pts[e.pointerId]) return; pts[e.pointerId] = pos(e);
        var it = items[sel]; if (!it || !start) return;
        var ids = Object.keys(pts);
        if (start.two && ids.length >= 2) {
          var a = pts[ids[0]], b = pts[ids[1]];
          var d = Math.hypot((a.x - b.x) * W, (a.y - b.y) * H), ang = Math.atan2((b.y - a.y) * H, (b.x - a.x) * W);
          it.size = Math.max(0.02, Math.min(0.9, start.size * d / (start.d || 1)));
          it.rot = start.rot + (ang - start.ang);
        } else if (!start.two) {
          var p = pts[ids[0]];
          it.x = Math.max(0, Math.min(1, start.x + p.x - start.px));
          it.y = Math.max(0, Math.min(1, start.y + p.y - start.py));
        }
        draw();
      });
      function up(e){ delete pts[e.pointerId]; snap(); }
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

      function close(v){ wrap.remove(); resolve(v); }
      wrap.querySelector('#dcNo').onclick = function(){
        if ((items.length || Object.keys(pats).some(function(k){ return pats[k]; })) &&
            !confirm(L('꾸민 것을 저장하지 않고 닫을까요?', 'Close without saving?'))) return;
        close(null);
      };
      wrap.querySelector('#dcGo').onclick = function(){
        sel = -1; draw(true);
        cv.toBlob(function(b){
          if (!b) { alert(L('저장하지 못했습니다.', 'Could not save.')); return; }
          close(new File([b], 'cover_deco.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.88);
      };
      draw();
    });
  };
})();

/* =====================================================================
   Alias Next-Gen — 사진 · 영상 · 문서
   2026-09-05

   Aliascall 의 aliascall_image_compress.js 와 aliascall_zoom_lightbox.js 를
   옮겨온 것입니다. 바꾼 곳은 이렇습니다.
     · 언어를 AL.t() 로 통일 (Aliascall 은 자기 사전을 따로 갖고 있었습니다)
     · 색을 테마 변수로 (밝은 테마에서도 보이게)
     · 올리기·임시주소 발급을 여기서 함께 다룹니다

   ⚠ 함정 ⑲ — 이 파일을 고치면 부르는 화면의 ?v= 도 함께 올리세요.
     지금 부르는 화면: alias_chat.html
   ===================================================================== */

window.AL = window.AL || {};

/* ── 얼마까지 받나 ────────────────────────────────────────────────── */
AL.MEDIA_MAX_BYTES = 50 * 1024 * 1024;   // 50MB — 버킷 설정과 같아야 합니다
AL.MEDIA_BUCKET = 'alias-media';

AL.mediaKind = function(file){
  var t = (file.type || '').toLowerCase();
  if (t.indexOf('image/') === 0) return 'photo';
  if (t.indexOf('video/') === 0) return 'video';
  if (t.indexOf('audio/') === 0) return 'audio';
  return 'file';
};

AL.fmtBytes = function(n){
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
};

/* ── 올리기 전 압축 ──────────────────────────────────────────────────
   카톡과 비슷하게 긴 변을 1600px 로 줄이고 JPEG 85% 로 다시 씁니다.
   화면에서는 차이가 거의 안 느껴지는데 용량은 훨씬 작아집니다.

   ⚠ GIF 는 움직임이 깨지므로 건너뜁니다.
   ⚠ 무슨 이유로든 실패하면 원본을 그대로 돌려줍니다.
     압축이 안 됐다고 사진 전송 자체가 막히면 안 됩니다.
------------------------------------------------------------------- */
AL.compressImage = function(file, maxDim, quality){
  maxDim = maxDim || 1600;
  quality = quality || 0.85;
  return new Promise(function(resolve){
    var t = (file.type || '').toLowerCase();
    if (t.indexOf('image/') !== 0 || t === 'image/gif') { resolve(file); return; }

    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function(){
      URL.revokeObjectURL(url);
      var w = img.width, h = img.height;
      if (w <= maxDim && h <= maxDim) {
        // 이미 충분히 작으면 다시 안 씁니다(화질 손실을 아낍니다).
        resolve(Object.assign(file, { _w: w, _h: h }));
        return;
      }
      if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
      else { w = Math.round(w * maxDim / h); h = maxDim; }

      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(function(blob){
        if (!blob) { resolve(file); return; }
        var name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        var out = new File([blob], name, { type: 'image/jpeg' });
        out._w = w; out._h = h;
        resolve(out);
      }, 'image/jpeg', quality);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};

/* 사진의 크기를 미리 재둡니다. 안 재두면 사진이 뜰 때 화면이 튑니다. */
AL.measureImage = function(file){
  return new Promise(function(resolve){
    if ((file.type || '').indexOf('image/') !== 0) { resolve({}); return; }
    if (file._w) { resolve({ w: file._w, h: file._h }); return; }
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function(){ URL.revokeObjectURL(url); resolve({ w: img.width, h: img.height }); };
    img.onerror = function(){ URL.revokeObjectURL(url); resolve({}); };
    img.src = url;
  });
};

/* ── 올리기 ──────────────────────────────────────────────────────────
   경로가 곧 권한입니다: {link_id}/{side_id}/{언제}_{무작위}.{확장자}
   맨 앞 칸이 링크 번호라 정책이 "내 링크의 폴더인가"만 보면 됩니다(블록 23).
------------------------------------------------------------------- */
AL.uploadMedia = async function(linkId, sideId, file, onProgress){
  var kind = AL.mediaKind(file);

  var use = file;
  if (kind === 'photo') {
    if (onProgress) onProgress('compress');
    use = await AL.compressImage(file);
  }
  if (use.size > AL.MEDIA_MAX_BYTES) {
    throw new Error(AL.t('mdTooBig', { max: AL.fmtBytes(AL.MEDIA_MAX_BYTES) }));
  }

  var dim = await AL.measureImage(use);
  var ext = (use.name.match(/\.([a-zA-Z0-9]+)$/) || [, 'bin'])[1].toLowerCase();
  var rand = Math.random().toString(36).slice(2, 10);
  var path = linkId + '/' + sideId + '/' + Date.now() + '_' + rand + '.' + ext;

  if (onProgress) onProgress('upload');
  var res = await AL.sb.storage.from(AL.MEDIA_BUCKET)
    .upload(path, use, { contentType: use.type || 'application/octet-stream', upsert: false });
  if (res.error) throw res.error;

  return {
    kind: kind,
    path: path,
    name: file.name,            // 손님에게는 원래 이름을 보여줍니다
    mime: use.type || null,
    bytes: use.size,
    w: dim.w || null,
    h: dim.h || null,
  };
};

/* ── 임시 주소 ───────────────────────────────────────────────────────
   버킷이 비공개라 볼 때마다 시한부 주소를 받아야 합니다.
   같은 파일을 여러 번 받지 않게 잠깐 기억해 둡니다.
------------------------------------------------------------------- */
AL._signed = {};

AL.mediaUrl = async function(path){
  var now = Date.now();
  var hit = AL._signed[path];
  if (hit && hit.until > now) return hit.url;

  var res = await AL.sb.storage.from(AL.MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (res.error) throw res.error;
  AL._signed[path] = { url: res.data.signedUrl, until: now + 50 * 60 * 1000 };
  return res.data.signedUrl;
};

AL.deleteMedia = async function(path){
  try { await AL.sb.storage.from(AL.MEDIA_BUCKET).remove([path]); } catch (e) {}
};


/* =====================================================================
   사진 크게 보기 — 핀치줌 · 넘겨보기 · 내려받기
   Aliascall 의 aliascall_zoom_lightbox.js 를 옮긴 것입니다.
     모바일  두 손가락 확대 · 두 번 눌러 확대/축소 · 확대 상태에서 끌어 옮기기
     PC      마우스 휠로 확대/축소
   ===================================================================== */

AL.openViewer = function(items, startIndex){
  var idx = Math.min(Math.max(startIndex || 0, 0), items.length - 1);

  var bg = document.createElement('div');
  bg.className = 'vw-bg';
  document.body.appendChild(bg);

  function close(){
    document.removeEventListener('keydown', onKey);
    bg.remove();
  }
  function onKey(e){
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && idx > 0) { idx--; draw(); }
    else if (e.key === 'ArrowRight' && idx < items.length - 1) { idx++; draw(); }
  }
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', function(e){ if (e.target === bg) close(); });

  function draw(){
    bg.innerHTML = '';

    var bar = document.createElement('div');
    bar.className = 'vw-bar';
    var cnt = document.createElement('span');
    cnt.className = 'vw-count';
    cnt.textContent = (idx + 1) + ' / ' + items.length;
    bar.appendChild(cnt);

    var dl = document.createElement('a');
    dl.className = 'vw-btn';
    dl.href = items[idx].url;
    dl.download = items[idx].name || ('photo_' + (idx + 1) + '.jpg');
    dl.setAttribute('aria-label', AL.t('mdDownload'));
    dl.textContent = '⤓';
    bar.appendChild(dl);

    var x = document.createElement('button');
    x.className = 'vw-btn';
    x.setAttribute('aria-label', AL.t('close'));
    x.textContent = '✕';
    x.addEventListener('click', close);
    bar.appendChild(x);
    bg.appendChild(bar);

    var port = document.createElement('div');
    port.className = 'vw-port';
    var img = document.createElement('img');
    img.className = 'vw-img';
    img.src = items[idx].url;
    img.draggable = false;
    port.appendChild(img);
    bg.appendChild(port);

    var hint = document.createElement('div');
    hint.className = 'vw-hint';
    hint.textContent = AL.t('mdZoomHint');
    bg.appendChild(hint);

    if (items.length > 1) {
      [['prev', '‹', idx === 0], ['next', '›', idx === items.length - 1]].forEach(function(o){
        var b = document.createElement('button');
        b.className = 'vw-nav vw-' + o[0];
        b.textContent = o[1];
        b.disabled = o[2];
        b.addEventListener('click', function(e){
          e.stopPropagation();
          idx += (o[0] === 'prev' ? -1 : 1);
          draw();
        });
        bg.appendChild(b);
      });
    }

    wireZoom(port, img);
  }

  function wireZoom(port, img){
    var scale = 1, tx = 0, ty = 0, lastTap = 0, touch = null;

    function apply(){
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
      img.classList.toggle('zoomed', scale > 1);
    }
    function clamp(){
      if (scale < 1) scale = 1;
      if (scale > 4) scale = 4;
      if (scale === 1) { tx = 0; ty = 0; }
    }
    function toggle(cx, cy){
      var r = port.getBoundingClientRect();
      if (scale === 1) {
        scale = 2.5;
        tx = -(cx - r.left - r.width / 2) * (scale - 1);
        ty = -(cy - r.top - r.height / 2) * (scale - 1);
      } else { scale = 1; tx = 0; ty = 0; }
      clamp(); apply();
    }

    img.addEventListener('dblclick', function(e){ e.stopPropagation(); toggle(e.clientX, e.clientY); });
    img.addEventListener('click', function(e){
      e.stopPropagation();
      var now = Date.now();
      if (now - lastTap < 300) toggle(e.clientX, e.clientY);
      lastTap = now;
    });

    port.addEventListener('touchstart', function(e){
      if (e.touches.length === 2) {
        var a = e.touches[0], b = e.touches[1];
        touch = { mode: 'pinch',
                  d0: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
                  s0: scale };
      } else if (e.touches.length === 1 && scale > 1) {
        touch = { mode: 'pan', x0: e.touches[0].clientX - tx, y0: e.touches[0].clientY - ty };
      }
    }, { passive: true });

    port.addEventListener('touchmove', function(e){
      if (!touch) return;
      if (touch.mode === 'pinch' && e.touches.length === 2) {
        var a = e.touches[0], b = e.touches[1];
        scale = touch.s0 * (Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) / touch.d0);
        clamp(); apply(); e.preventDefault();
      } else if (touch.mode === 'pan' && e.touches.length === 1) {
        tx = e.touches[0].clientX - touch.x0;
        ty = e.touches[0].clientY - touch.y0;
        apply(); e.preventDefault();
      }
    }, { passive: false });

    port.addEventListener('touchend', function(){ touch = null; clamp(); apply(); });

    port.addEventListener('wheel', function(e){
      e.preventDefault();
      scale += (e.deltaY < 0 ? 0.25 : -0.25);
      clamp(); apply();
    }, { passive: false });

    apply();
  }

  draw();
};

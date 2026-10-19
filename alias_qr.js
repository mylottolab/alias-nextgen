/* =====================================================================
   Alias Next-Gen — QR 만들기 · 읽기
   2026-09-05

   🔴 왜 필요한가
     "번호 없는 전화" 인데 첫 초대를 카톡·문자로 보내야 한다면
     결국 번호를 노출하는 셈입니다. 제품의 근본 모순입니다.

     완전히 풀 수는 없습니다. 세상의 모든 초대 기반 서비스가 같은 자리에
     서 있습니다(SimpleX 도 마찬가지입니다).
     다만 마주 보고 있을 때만이라도 아무것도 안 새게 할 수는 있습니다.
     QR 은 그 답입니다. 어디로도 아무것도 안 보냅니다.

   ⚠ 처음엔 QR 을 직접 그리려 했는데, 만들어놓고 표준 디코더로 읽어보니
     하나도 안 읽혔습니다. 마스킹과 자료 배치가 까다로운 물건입니다.
     검증된 라이브러리를 씁니다.

   ⚠ 라이브러리는 브라우저 안에서 계산만 합니다. 초대 코드가 밖으로
     나가지 않습니다. (그림을 만들어주는 웹 API 를 쓰면 그건 샙니다)

   ⚠ 함정 ⑲ — 고치면 부르는 화면의 ?v= 도 함께 올리세요.
     지금 부르는 화면: alias_invite.html · alias_join.html
   ===================================================================== */

window.AL = window.AL || {};

/* ── QR 만들기 ───────────────────────────────────────────────────────
   qrcode-generator 라이브러리를 씁니다. alias_qrlib.js 에 담겨 있습니다.

   🔴 CDN 을 안 씁니다. 저장소에 직접 뒀습니다.
     처음엔 qrcode 라는 패키지의 CDN 주소를 적었는데 404 였고(그 패키지는
     브라우저용 묶음 파일을 안 냅니다), 주소를 고친 뒤에도 CDN 을 못 받는
     일이 있었습니다. 우리 저장소에 두면 그럴 일이 없습니다.

   ⚠ 만든 결과를 표준 디코더로 읽어 검증했습니다.
     QR 은 손으로 짜면 안 읽히는 것이 나옵니다(실제로 그랬습니다).
------------------------------------------------------------------- */
AL.qrReady = function(){
  // ⚠ 라이브러리가 window 에 붙었는지, 아니면 전역에만 있는지 둘 다 봅니다.
  return typeof window.qrcode === 'function' ||
         (typeof qrcode !== 'undefined' && typeof qrcode === 'function');
};

AL.qrLib = function(){
  return (typeof window.qrcode === 'function') ? window.qrcode : qrcode;
};

/* 격자를 SVG 로 그립니다. 그림 파일도, 바깥 요청도 없습니다.
   ⚠ 라이브러리는 브라우저 안에서 계산만 합니다. 초대 코드가 안 나갑니다. */
AL.drawQr = function(box, text, px){
  return new Promise(function(resolve, reject){
    if (!AL.qrReady()) { reject(new Error('qr_lib_missing')); return; }

    var qr = AL.qrLib()(0, 'M');         // 0 = 크기 자동
    qr.addData(text);
    qr.make();

    var n = qr.getModuleCount();
    var quiet = 4, total = n + quiet * 2;
    var parts = [];
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (qr.isDark(y, x)) {
          parts.push('M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z');
        }
      }
    }

    var size = px || 240;
    box.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" ' +
      'width="' + size + '" height="' + size + '" shape-rendering="crispEdges" role="img">' +
      '<rect width="' + total + '" height="' + total + '" fill="#FFFFFF"/>' +
      '<path d="' + parts.join('') + '" fill="#000000"/></svg>';

    resolve(box.firstChild);
  });
};


/* ── QR 읽기 ─────────────────────────────────────────────────────────
   ⚠ 안드로이드 크롬은 BarcodeDetector(내장)를 씁니다.
   🔴 2026-10-14 — 아이폰(사파리 · 부름 앱)에는 BarcodeDetector 가 없습니다.
     그때는 jsQR(MIT, 작은 QR 해독기)를 처음 누를 때 한 번만 불러와서
     카메라 화면을 0.25초마다 한 장씩 읽습니다. 카메라만 되면 어디서나 됩니다.
------------------------------------------------------------------- */
AL.JSQR_URL = 'alias_jsqr.js';   // 우리 사이트에 같이 둡니다(외부 CDN 이 막혀도 되게)

AL.canScanQr = function(){
  return typeof window.BarcodeDetector !== 'undefined' ||
         !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

AL.loadJsQr = function(){
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (AL._jsqrP) return AL._jsqrP;
  AL._jsqrP = new Promise(function(resolve, reject){
    var s = document.createElement('script');
    s.src = AL.JSQR_URL; s.async = true;
    s.onload = function(){ window.jsQR ? resolve(window.jsQR) : reject(new Error('jsQR')); };
    s.onerror = function(){ AL._jsqrP = null; reject(new Error('jsQR load')); };
    document.head.appendChild(s);
  });
  return AL._jsqrP;
};

AL.openScanner = function(){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

    var stream = null, timer = null, done = false;

    function close(v){
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach(function(t){ try { t.stop(); } catch (e) {} });
      document.removeEventListener('keydown', onKey);
      bg.remove(); sheet.remove();
      resolve(v || null);
    }
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    sheet.innerHTML = '<div class="grip"></div>';
    var h = document.createElement('p'); h.className = 'pk-title';
    h.textContent = AL.t('qrTitle'); sheet.appendChild(h);

    if (!AL.canScanQr()) {
      var n0 = document.createElement('p'); n0.className = 'pk-note';
      n0.textContent = AL.t('qrNoSupport'); sheet.appendChild(n0);
      return;
    }

    var wrap = document.createElement('div'); wrap.className = 'qr-cam';
    var v = document.createElement('video');
    v.autoplay = true; v.playsInline = true; v.muted = true;
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');   // 아이폰: 전체화면으로 튀지 않게
    wrap.appendChild(v);
    sheet.appendChild(wrap);

    // 닫기 단추 (아이폰은 바깥을 눌러 닫는 걸 잘 모릅니다)
    /* 🔴 2026-10-19 — 받은 QR 사진으로 읽기 */
    var ph = document.createElement('button'); ph.type = 'button'; ph.className = 'pk-go';
    ph.style.cssText = 'width:100%;margin-top:10px';
    ph.textContent = AL.lang === 'en' ? '🖼️ Read from a photo / screenshot' : '🖼️ 받은 QR 사진에서 읽기';
    ph.addEventListener('click', async function(){
      var got = await AL.pickQrImage();
      if (got) { close(got); return; }
      var n2 = document.createElement('p'); n2.className = 'pk-err';
      n2.textContent = AL.lang === 'en' ? 'Could not find a QR code in that picture.' : '그 사진에서 QR 을 찾지 못했습니다. QR 이 크게 보이는 사진으로 다시 골라 주세요.';
      sheet.insertBefore(n2, ph);
    });
    sheet.appendChild(ph);

    var cx = document.createElement('button'); cx.type = 'button'; cx.className = 'pk-go';
    cx.style.cssText = 'width:100%;margin-top:10px;background:transparent;border:1px solid var(--line,rgba(128,128,128,.4));color:inherit';
    cx.textContent = AL.lang === 'en' ? 'Close' : '닫기';
    cx.addEventListener('click', function(){ close(null); });
    sheet.appendChild(cx);

    function fail(e){
      console.error('[qr]', e);
      if (done) return;
      var n1 = document.createElement('p'); n1.className = 'pk-err';
      n1.textContent = AL.t('qrCamera'); sheet.insertBefore(n1, cx);
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async function(st){
        if (done) { st.getTracks().forEach(function(t){ t.stop(); }); return; }
        stream = st;
        v.srcObject = st;
        try { await v.play(); } catch (e) {}

        // ① 내장 해독기 (안드로이드 크롬)
        if (typeof window.BarcodeDetector !== 'undefined') {
          var det = new BarcodeDetector({ formats: ['qr_code'] });
          timer = setInterval(async function(){
            try {
              var found = await det.detect(v);
              if (found && found.length) close(found[0].rawValue);
            } catch (e) { /* 한 번 실패해도 계속 봅니다 */ }
          }, 400);
          return;
        }

        // ② 아이폰: jsQR 로 한 장씩
        var jsQR;
        try { jsQR = await AL.loadJsQr(); } catch (e) { fail(e); return; }
        if (done) return;
        var cv = document.createElement('canvas');
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        timer = setInterval(function(){
          try {
            var w = v.videoWidth, hh = v.videoHeight;
            if (!w || !hh) return;
            var scale = Math.min(1, 720 / Math.max(w, hh));   // 너무 크면 줄여서 빨리
            cv.width = Math.round(w * scale); cv.height = Math.round(hh * scale);
            ctx.drawImage(v, 0, 0, cv.width, cv.height);
            var img = ctx.getImageData(0, 0, cv.width, cv.height);
            var r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
            if (r && r.data) close(r.data);
          } catch (e) { /* 다음 장에서 다시 */ }
        }, 250);
      })
      .catch(fail);
  });
};

/* ── 🔴 2026-10-19 사진(파일)에서 QR 읽기 ─────────────────────────────
   왜  QR 을 카톡 · 문자 · 사진으로 받으면, 내 폰 화면을 내 폰 카메라로 찍을 수가 없습니다.
   어떻게  사진첩에서 그 그림을 고르면 폰 안에서 바로 읽습니다(밖으로 아무것도 안 나감).
       크기를 몇 가지로 바꿔 가며, 흑백이 뒤집힌 것까지 읽어 봅니다(캡처 · 축소된 그림 대비).
   돌려주는 값: 읽은 글자(주소 또는 코드) · 못 읽으면 null */
AL.pickQrImage = function(){
  return new Promise(function(resolve){
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(inp);
    var settled = false;
    function done(v){ if (settled) return; settled = true; try { inp.remove(); } catch (e) {} resolve(v); }
    inp.addEventListener('change', async function(){
      var f = inp.files && inp.files[0];
      if (!f) { done(null); return; }
      try { done(await AL.readQrFromFile(f)); } catch (e) { console.warn('[qr] 사진 읽기 실패', e); done(null); }
    });
    inp.click();
  });
};

AL.readQrFromFile = function(file){
  return new Promise(function(resolve){
    var url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = async function(){
      try {
        // ① 내장 해독기
        if (typeof window.BarcodeDetector !== 'undefined') {
          try {
            var det = new BarcodeDetector({ formats: ['qr_code'] });
            var f = await det.detect(im);
            if (f && f.length) { URL.revokeObjectURL(url); resolve(f[0].rawValue); return; }
          } catch (e) { /* 아래 jsQR 로 */ }
        }
        // ② jsQR — 크기를 바꿔 가며
        var jsQR = await AL.loadJsQr();
        var cv = document.createElement('canvas');
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        var W = im.naturalWidth || im.width, H = im.naturalHeight || im.height;
        var sizes = [1600, 1000, 700, 2400, 450];
        for (var i = 0; i < sizes.length; i++) {
          var sc = Math.min(1, sizes[i] / Math.max(W, H));
          if (sizes[i] > Math.max(W, H) && i > 0) continue;
          cv.width = Math.max(1, Math.round(W * sc)); cv.height = Math.max(1, Math.round(H * sc));
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);   // 투명 PNG 대비
          ctx.drawImage(im, 0, 0, cv.width, cv.height);
          var d = ctx.getImageData(0, 0, cv.width, cv.height);
          var r = jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' });
          if (r && r.data) { URL.revokeObjectURL(url); resolve(r.data); return; }
        }
      } catch (e) { console.warn('[qr]', e); }
      URL.revokeObjectURL(url); resolve(null);
    };
    im.onerror = function(){ URL.revokeObjectURL(url); resolve(null); };
    im.src = url;
  });
};

/* 초대 주소에서 코드만 뽑습니다. QR 에 주소를 담았을 수도, 코드만 담았을 수도. */
AL.codeFromScan = function(raw){
  if (!raw) return null;
  var m = String(raw).match(/[?&]c=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  var t = String(raw).trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(t) ? t : null;
};

/* =====================================================================
   Alias Next-Gen — 이모지 · 음성메시지 · 신고
   2026-09-05

   Aliascall 의 aliascall_emoji.js 와 aliascall_report.js 를 옮겨온 것입니다.
   바꾼 곳
     · 언어를 AL.t() 로 통일 (Aliascall 은 자기 사전을 따로 갖고 있었습니다)
     · 색을 테마 변수로 (밝은 테마에서도 보이게)
     · 신고를 Edge Function 이 아니라 reports 표에 바로 넣습니다

   ⚠ 함정 ⑲ — 고치면 부르는 화면의 ?v= 도 함께 올리세요.
     지금 부르는 화면: alias_chat.html
   ===================================================================== */

window.AL = window.AL || {};

/* =====================================================================
   이모지
   고를 때는 움직이는 그림으로 보여주고, 실제로는 평범한 글자가 들어갑니다.
   그래서 저장·암호화 방식을 하나도 안 바꿔도 됩니다.
   ⚠ 그림은 구글 Noto Animated Emoji (무료, CC BY 4.0 — 출처를 패널에 적습니다)
   ===================================================================== */

AL.EMOJI = [
  { key:'emPopular', icon:'⭐', chars:['😂','❤️','🤣','👍','😭','🙏','😘','🥰','😍','😊','🎉','😁','💕','🥺','😅','🔥','🤔','😢','🙄','💔','😎','👏','😉','🙂','💯','✨','😱','💪','🥳','😴','😡','🤗','👌','✌️','🙌','😆','😋','🌸','🎂','☕','🍕','💤','😳','😷','👀','💛','💙','🐶','🐱','💐'] },
  { key:'emFaces', icon:'😀', chars:['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😔','😢','😭','😤','😠','😡','🤯','😱','😨','😰','😓','🤗','🤭','🤫','🤥','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😲','😳','🥺','😬','🤤','😈','👿','💀','☠️','👻','👽','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'] },
  { key:'emHands', icon:'👋', chars:['👍','👎','👏','🙌','🙏','💪','🤝','✌️','🤞','👌','🤟','🤘','👊','✊','👋','🤙','👈','👉','👆','👇','☝️','✋','🖐️','🖖','👀','👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵','👮','🕵️','👷','💂','🤴','👸','🤵','👰','🤰','🤱'] },
  { key:'emHearts', icon:'❤️', chars:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','💯','💢','💥','💫','💦','💨','🕳️','💬','🗨️','🗯️','💭','💤'] },
  { key:'emAnimals', icon:'🐶', chars:['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐢','🐍','🦎','🐙','🦑','🦀','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐆','🦓','🦍','🐘','🦛','🦒','🐫','🦘','🐕','🐈','🐓','🦃','🦚','🦜','🐇','🐿️'] },
  { key:'emNature', icon:'🌸', chars:['🌸','💐','🌷','🌹','🌻','🌼','🌱','🌲','🌳','🌴','🌵','🌾','🍀','🍁','🍂','🍃','🌿','☘️','🌊','🔥','💧','☀️','🌤️','⛅','🌥️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','🌪️','🌈','☔','⚡','🌙','⭐','🌟','✨','☄️','🌍','🌎','🌏'] },
  { key:'emFood', icon:'🍔', chars:['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🥗','🍿','🧂','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🍤','🍙','🍚','🍘','🍥','🥟','🍡','🍧','🍨','🍦','🥧','🍰','🎂','🧁','🍮','🍭','🍬','🍫','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🍵','🧃','🥤','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🍾'] },
  { key:'emActivity', icon:'⚽', chars:['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','⛳','🏹','🎣','🥊','🥋','🎽','🛹','🛼','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤾','🏄','🏊','🤽','🚣','🧗','🚴','🚵','🏆','🥇','🥈','🥉','🎖️','🏅','🎗️','🎫','🎟️','🎪','🤹','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','🧩','🚗','🚕','🚙','🚌','🚓','🚑','🚒','🚚','🚲','🛵','🏍️','✈️','🚀','🛸','🚁','⛵','🚤','🛳️','⚓','🏝️','🏔️','🗽','🗼','🏰','🎡','🎢','🎠'] },
  { key:'emObjects', icon:'💡', chars:['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','📷','📸','📹','🎥','📺','📻','⏰','⏱️','⏲️','🕰️','⌚','📚','📖','📕','📗','📘','📙','📔','📓','📒','📝','✏️','🖊️','🖋️','🖌️','📌','📍','✂️','🔒','🔓','🔑','🗝️','🔨','🛠️','🔧','⚙️','⛏️','⚗️','🧪','🔬','🔭','📡','💊','💉','🩹','🚪','🪑','🛏️','🛋️','🚿','🛁','🧴','🧼','🧻','🎁','🎈','🎀','🎊','🎉','🎄','🎃','🧧','💌','📩','📮','📦','📫','🕐','💰','💵','💳','💎','⚖️','🔔','🔕','📢','📣','📯','🚩','🏳️','🏴','🏁','🚦','⛔','🔞','📵','🚭','♻️','✅','❌','❓','❗','⚠️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪'] },
];

/* 글자 → 구글이 쓰는 코드 */
AL.EMOJI_CODE = {};
AL.EMOJI.forEach(function(cat){
  cat.chars.forEach(function(ch){
    if (AL.EMOJI_CODE[ch]) return;
    var cps = Array.from(ch).filter(function(c){
      return c.codePointAt(0) !== 0xFE0F && c.codePointAt(0) !== 0x200D;
    });
    AL.EMOJI_CODE[ch] = cps.map(function(c){ return c.codePointAt(0).toString(16); }).join('_');
  });
});
/* 긴 것부터 맞춰봐야 합니다. 변형선택자가 붙은 것이 있어서요. */
AL.EMOJI_KEYS = Object.keys(AL.EMOJI_CODE).sort(function(a, b){ return b.length - a.length; });

AL.emojiGif = function(ch){
  var code = AL.EMOJI_CODE[ch];
  return code ? 'https://fonts.gstatic.com/s/e/notoemoji/latest/' + code + '/512.gif' : null;
};

/* 메시지가 이모지 1~3개뿐이면 큰 그림으로 보여줍니다(카톡 이모티콘처럼).
   아니면 null 을 돌려주고, 화면은 보통 글자로 그립니다. */
AL.emojiOnly = function(text){
  if (!text) return null;
  var rest = text.trim();
  var found = [];
  while (rest.length > 0 && found.length <= 3) {
    var hit = null;
    for (var i = 0; i < AL.EMOJI_KEYS.length; i++) {
      if (rest.indexOf(AL.EMOJI_KEYS[i]) === 0) { hit = AL.EMOJI_KEYS[i]; break; }
    }
    if (!hit) return null;
    found.push({ char: hit, url: AL.emojiGif(hit) });
    rest = rest.slice(hit.length);
  }
  if (rest.length > 0 || !found.length || found.length > 3) return null;
  return found;
};

/* 고르는 패널을 그립니다. 고르면 onPick(글자) 를 부릅니다. */
AL.paintEmojiPanel = function(box, onPick){
  var at = 0;

  function grid(){
    var g = box.querySelector('.em-grid');
    g.innerHTML = AL.EMOJI[at].chars.map(function(ch){
      return '<button type="button" class="em-btn" data-ch="' + AL.esc(ch) + '">' +
             '<img src="' + AL.esc(AL.emojiGif(ch)) + '" alt="' + AL.esc(ch) + '" loading="lazy"></button>';
    }).join('');
    g.querySelectorAll('.em-btn').forEach(function(b){
      var img = b.querySelector('img');
      // 그림이 없는 이모지는 글자로 대신합니다.
      img.addEventListener('error', function(){ b.textContent = b.getAttribute('data-ch'); }, { once: true });
      b.addEventListener('click', function(){ onPick(b.getAttribute('data-ch')); });
    });
  }

  box.innerHTML =
    '<div class="em-tabs">' +
      AL.EMOJI.map(function(c, i){
        var label = AL.t(c.key);
        return '<button type="button" class="em-tab' + (i === 0 ? ' on' : '') +
               '" data-i="' + i + '" title="' + AL.esc(label) + '" aria-label="' + AL.esc(label) + '">' +
               c.icon + '</button>';
      }).join('') +
    '</div><div class="em-grid"></div>' +
    '<div class="em-credit">' + AL.esc(AL.t('emCredit')) + '</div>';

  box.querySelectorAll('.em-tab').forEach(function(t){
    t.addEventListener('click', function(){
      box.querySelectorAll('.em-tab').forEach(function(x){ x.classList.remove('on'); });
      t.classList.add('on');
      at = Number(t.getAttribute('data-i'));
      grid();
    });
  });
  grid();
};


/* =====================================================================
   음성메시지
   브라우저가 직접 녹음합니다. 서버가 필요 없습니다.
   ⚠ 마이크 권한을 손님이 허락해야 합니다. 거절하면 그냥 안 됩니다.
   ===================================================================== */

AL.recorder = null;

AL.startRecording = async function(onTick){
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    throw new Error(AL.t('vcNoSupport'));
  }
  var stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // 브라우저마다 낼 수 있는 형식이 다릅니다. 되는 것을 고릅니다.
  var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  var mime = types.filter(function(t){ return MediaRecorder.isTypeSupported(t); })[0] || '';

  var rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  var chunks = [];
  var t0 = Date.now();
  rec.ondataavailable = function(e){ if (e.data && e.data.size) chunks.push(e.data); };
  rec.start();

  var timer = setInterval(function(){ if (onTick) onTick(Date.now() - t0); }, 200);

  AL.recorder = {
    stop: function(){
      return new Promise(function(resolve){
        clearInterval(timer);
        rec.onstop = function(){
          stream.getTracks().forEach(function(t){ t.stop(); });
          var blob = new Blob(chunks, { type: mime || 'audio/webm' });
          var ext = (mime.indexOf('mp4') >= 0) ? 'm4a' : (mime.indexOf('ogg') >= 0 ? 'ogg' : 'webm');
          var file = new File([blob], 'voice_' + Date.now() + '.' + ext,
                              { type: blob.type || 'audio/webm' });
          AL.recorder = null;
          resolve({ file: file, durationMs: Date.now() - t0 });
        };
        rec.stop();
      });
    },
    cancel: function(){
      clearInterval(timer);
      try { rec.stop(); } catch (e) {}
      stream.getTracks().forEach(function(t){ t.stop(); });
      AL.recorder = null;
    },
  };
  return AL.recorder;
};

AL.fmtDuration = function(ms){
  var s = Math.round((ms || 0) / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};


/* =====================================================================
   신고
   ⚠ 사유는 영문 코드로 저장합니다. 화면 문구만 번역합니다.
     Aliascall 과 같은 코드라 나중에 관리자 화면을 합칠 수 있습니다.
   ⚠ 신고당한 사람에게는 아무 표시도 남지 않습니다.
   ===================================================================== */

AL.REPORT_REASONS = ['sexual', 'violence', 'abuse', 'spam', 'fraud', 'privacy', 'other'];

AL.openReport = function(opts){
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
      resolve(v || null);
    }
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    var picked = null;

    function draw(){
      sheet.innerHTML = '';
      var grip = document.createElement('div'); grip.className = 'grip';
      sheet.appendChild(grip);

      var h = document.createElement('p'); h.className = 'pk-title';
      h.textContent = AL.t('rpTitle'); sheet.appendChild(h);
      var note = document.createElement('p'); note.className = 'pk-note';
      note.textContent = AL.t('rpNote'); sheet.appendChild(note);

      AL.REPORT_REASONS.forEach(function(code){
        var b = document.createElement('button');
        b.className = 'pk-opt' + (picked === code ? ' cur' : '');
        b.textContent = AL.t('rp_' + code);
        b.addEventListener('click', function(){ picked = code; draw(); });
        sheet.appendChild(b);
      });

      var ta = document.createElement('textarea');
      ta.className = 'rp-detail';
      ta.placeholder = AL.t('rpDetail');
      ta.maxLength = 1000;
      ta.value = sheet._detail || '';
      ta.addEventListener('input', function(){ sheet._detail = ta.value; });
      sheet.appendChild(ta);

      var go = document.createElement('button');
      go.className = 'pk-go'; go.style.width = '100%';
      go.textContent = AL.t('rpSend');
      go.disabled = !picked;
      go.addEventListener('click', async function(){
        go.disabled = true;
        try {
          var res = await AL.sb.from('reports').insert({
            reporter_side_id: opts.sideId,
            link_id: opts.linkId,
            message_id: opts.messageId || null,
            reason: picked,
            detail: (sheet._detail || '').trim() || null,
          });
          if (res.error) throw res.error;
          close({ ok: true });
        } catch (e) {
          console.error('[report]', e);
          var err = document.createElement('div');
          err.className = 'pk-err';
          err.textContent = AL.t('rpFailed', { msg: e.message || String(e) });
          sheet.appendChild(err);
          go.disabled = false;
        }
      });
      sheet.appendChild(go);
    }
    draw();
  });
};

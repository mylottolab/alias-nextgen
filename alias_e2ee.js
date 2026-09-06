/* =====================================================================
   Alias Next-Gen — 종단간 암호화
   2026-09-06

   Aliascall 의 aliascall_e2ee.js 에서 AES-GCM 부분을 그대로 가져왔습니다.
   바꾼 것은 "열쇠를 어디서 얻느냐" 하나입니다. 그게 전부 다릅니다.

   🔴 Aliascall 은 URL 의 # 뒤에 열쇠를 담았습니다.
      방 주소를 그때그때 주고받는 구조라 맞았습니다.
      새 앱은 관계가 평생 갑니다. 주소를 잃으면 지난 대화를 영영 못 읽습니다.

   🔴 그래서 이렇게 바꿨습니다 (블록 33)
      ① 계정마다 열쇠쌍을 만듭니다
         공개 열쇠는 서버에 그대로, 비밀 열쇠는 복구 코드로 잠가서 둡니다
      ② 링크마다 대화 열쇠를 하나 만듭니다
      ③ 그 대화 열쇠를 양쪽 공개 열쇠로 각각 잠가서 둡니다
      ④ 읽을 때: 복구 코드 → 내 비밀 열쇠 → 대화 열쇠 → 대화

      기기를 바꿔도 복구 코드만 있으면 되살아납니다.
      복구 코드를 잃으면 영영 못 읽습니다. 가입 화면에서 그렇게 약속했습니다.

   ⚠ 서버는 잠긴 것만 갖습니다. 열쇠 자체는 어디에도 안 보냅니다.
   ⚠ 밖에서 가져오는 라이브러리가 없습니다. 브라우저 내장 WebCrypto 만 씁니다.

   ⚠ 함정 ⑲ — 고치면 부르는 화면의 ?v= 도 함께 올리세요.
   ===================================================================== */

window.AL = window.AL || {};

/* ── 글자와 바이트 사이 ──────────────────────────────────────────── */
function b64(bytes){
  var s = '';
  new Uint8Array(bytes).forEach(function(b){ s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64(str){
  var t = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  var bin = atob(t);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

AL.b64 = b64;
AL.unb64 = unb64;


/* =====================================================================
   AES-GCM — 실제로 잠그고 여는 부분
   Aliascall 것 그대로입니다. 잘 돌던 것을 바꿀 이유가 없습니다.
   ===================================================================== */

AL.encText = async function(key, text){
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text));
  var out = new Uint8Array(12 + buf.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(buf), 12);
  return b64(out);
};

AL.decText = async function(key, blob){
  var all = unb64(blob);
  var buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: all.slice(0, 12) }, key, all.slice(12));
  return new TextDecoder().decode(buf);
};

AL.encBytes = async function(key, arrayBuffer){
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, arrayBuffer);
  var out = new Uint8Array(12 + buf.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(buf), 12);
  return out;
};

AL.decBytes = async function(key, bytes){
  var all = new Uint8Array(bytes);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: all.slice(0, 12) }, key, all.slice(12));
};


/* =====================================================================
   복구 코드에서 열쇠 뽑기

   ⚠ 복구 코드를 그대로 열쇠로 쓰면 안 됩니다. 짧고 규칙이 있어서
     맞혀보기가 쉽습니다. PBKDF2 로 늘려서 씁니다.
   ⚠ 반복 횟수를 높게 잡습니다. 폰에서 1초쯤 걸리는데,
     로그인할 때 한 번만 하는 일이라 견딜 만합니다.
   ===================================================================== */

AL.KDF_ROUNDS = 250000;

AL.keyFromRecovery = async function(recoveryCode, saltB64){
  var base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(String(recoveryCode).trim().toUpperCase()),
    'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: unb64(saltB64), iterations: AL.KDF_ROUNDS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};


/* =====================================================================
   계정 열쇠쌍

   ⚠ X25519 를 씁니다. 두 사람이 각자 열쇠쌍을 갖고 있으면
     서로의 공개 열쇠만으로 같은 비밀을 만들 수 있습니다.
   ⚠ 브라우저가 X25519 를 아직 안 받아주면 P-256 으로 갑니다.
     둘 다 안전합니다. 어느 것을 썼는지 algo 칸에 적어둡니다.
   ===================================================================== */

AL.ecdhAlgo = async function(){
  // 어느 곡선을 쓸 수 있는지 한 번만 알아봅니다.
  if (AL._curve) return AL._curve;
  try {
    await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveKey']);
    AL._curve = { name: 'X25519', tag: 'x25519-aesgcm-v1' };
  } catch (e) {
    AL._curve = { name: 'ECDH', namedCurve: 'P-256', tag: 'p256-aesgcm-v1' };
  }
  return AL._curve;
};

AL.makeAccountKeys = async function(recoveryCode){
  var curve = await AL.ecdhAlgo();
  var algo = (curve.name === 'X25519')
    ? { name: 'X25519' }
    : { name: 'ECDH', namedCurve: 'P-256' };

  var pair = await crypto.subtle.generateKey(algo, true, ['deriveKey', 'deriveBits']);
  var pub = await crypto.subtle.exportKey('raw', pair.publicKey);
  var sec = await crypto.subtle.exportKey('pkcs8', pair.privateKey);

  // 비밀 열쇠를 복구 코드로 잠급니다. 서버는 못 엽니다.
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var wrapKey = await AL.keyFromRecovery(recoveryCode, b64(salt));
  var wrapped = await AL.encBytes(wrapKey, sec);

  return {
    publicKey: b64(pub),
    secretWrapped: b64(wrapped),
    wrapSalt: b64(salt),
    algo: curve.tag,
  };
};

/* 복구 코드로 내 비밀 열쇠를 되살립니다. */
AL.openMySecret = async function(row, recoveryCode){
  var wrapKey = await AL.keyFromRecovery(recoveryCode, row.wrap_salt);
  var raw = await AL.decBytes(wrapKey, unb64(row.secret_wrapped));
  var algo = (row.algo && row.algo.indexOf('x25519') === 0)
    ? { name: 'X25519' }
    : { name: 'ECDH', namedCurve: 'P-256' };
  return crypto.subtle.importKey('pkcs8', raw, algo, false, ['deriveKey', 'deriveBits']);
};


/* =====================================================================
   대화 열쇠

   링크마다 하나입니다. 그 열쇠를 양쪽 공개 열쇠로 각각 잠가서 둡니다.
   ⚠ 같은 열쇠인데 잠근 방식만 다릅니다. 그래야 둘 다 열 수 있습니다.
   ===================================================================== */

AL.makeLinkKey = async function(){
  var key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  var raw = await crypto.subtle.exportKey('raw', key);
  return { key: key, raw: new Uint8Array(raw) };
};

/* 내 비밀 열쇠와 상대 공개 열쇠로 "우리 둘만의 자물쇠" 를 만듭니다. */
AL.sharedLock = async function(mySecret, peerPubB64, algoTag){
  var algo = (algoTag && algoTag.indexOf('x25519') === 0)
    ? { name: 'X25519' }
    : { name: 'ECDH', namedCurve: 'P-256' };
  var peerPub = await crypto.subtle.importKey('raw', unb64(peerPubB64), algo, false, []);
  var deriveAlgo = (algo.name === 'X25519')
    ? { name: 'X25519', public: peerPub }
    : { name: 'ECDH', public: peerPub };
  return crypto.subtle.deriveKey(
    deriveAlgo, mySecret, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};

AL.importLinkKey = async function(raw){
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};


/* =====================================================================
   기억해 두기

   ⚠ 복구 코드를 매번 물어보면 못 씁니다. 한 번 열면 그 자리에 담아둡니다.
   ⚠ 기기에 저장하지 않습니다. 탭을 닫으면 사라집니다.
     저장하면 폰을 잃었을 때 남이 열 수 있습니다.
   ===================================================================== */

AL._mySecret = null;      // 이번 판에서만 삽니다
AL._linkKeys = {};        // link_id → CryptoKey

AL.hasSecret = function(){ return !!AL._mySecret; };

AL.unlockWithRecovery = async function(recoveryCode){
  var res = await AL.sb.from('account_keys')
    .select('public_key, secret_wrapped, wrap_salt, algo').maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) throw new Error('no_keys');
  AL._mySecret = await AL.openMySecret(res.data, recoveryCode);
  AL._myPub = res.data.public_key;
  AL._myAlgo = res.data.algo;
  AL._linkKeys = {};
  return true;
};

AL.lockUp = function(){
  AL._mySecret = null;
  AL._linkKeys = {};
};

/* 이 방의 대화 열쇠를 가져옵니다. 없으면 만들어 사람 수만큼 담습니다.

   🔴 1:1 이든 넷이든 같은 구조입니다.
     대화 열쇠는 하나. 그것을 각자의 공개 열쇠로 따로따로 잠가서 담습니다.
     그래서 사람이 늘어도 열쇠 관리가 복잡해지지 않습니다.

   ⚠ 셋이면 자물쇠가 셋(A↔B, A↔C, B↔C)이 아니라
     대화 열쇠 하나에 잠긴 사본이 셋입니다. 훨씬 간단합니다. */
AL.linkKey = async function(linkId, mySideId){
  if (AL._linkKeys[linkId]) return AL._linkKeys[linkId];
  if (!AL._mySecret) throw new Error('locked');

  // 내 몫이 이미 있나
  var mine = await AL.sb.from('link_keys')
    .select('key_wrapped, sender_pub, algo').eq('link_id', linkId).maybeSingle();
  if (mine.error) throw mine.error;

  if (mine.data) {
    var lock = await AL.sharedLock(AL._mySecret, mine.data.sender_pub, mine.data.algo);
    var raw = await AL.decBytes(lock, unb64(mine.data.key_wrapped));
    var key = await AL.importLinkKey(raw);
    AL._linkKeys[linkId] = key;
    return key;
  }

  // 없으면 만듭니다. 방에 있는 모두의 공개 열쇠가 있어야 합니다.
  var pk = await AL.sb.rpc('peer_public_key', { p_link_id: linkId });
  if (pk.error) throw pk.error;
  var peers = pk.data || [];
  if (!peers.length) throw new Error('peer_no_key');
  // 한 사람이라도 열쇠가 없으면 못 만듭니다.
  var missing = peers.filter(function(p){ return !p.public_key; });
  if (missing.length) throw new Error('peer_no_key');

  var made = await AL.makeLinkKey();

  // 내 몫 — 나중에 내가 열 수 있어야 합니다.
  // ⚠ 나 자신과의 자물쇠는 만들 수 없어서, 아무 상대나 하나 골라
  //   그 사람과의 자물쇠로 내 몫도 잠급니다. 그 자물쇠는 나도 만들 수 있습니다.
  var anchor = peers[0];
  var myLock = await AL.sharedLock(AL._mySecret, anchor.public_key, anchor.algo);
  var rows = [{
    link_id: linkId, side_id: mySideId,
    key_wrapped: b64(await AL.encBytes(myLock, made.raw)),
    sender_pub: anchor.public_key, algo: anchor.algo,
  }];

  // 각자의 몫 — 그 사람과 나 사이의 자물쇠로 잠급니다.
  for (var i = 0; i < peers.length; i++) {
    var lockN = await AL.sharedLock(AL._mySecret, peers[i].public_key, peers[i].algo);
    rows.push({
      link_id: linkId, side_id: peers[i].peer_side_id,
      key_wrapped: b64(await AL.encBytes(lockN, made.raw)),
      sender_pub: AL._myPub, algo: AL._myAlgo,
    });
  }

  var ins = await AL.sb.from('link_keys').insert(rows);
  if (ins.error && ins.error.code !== '23505') throw ins.error;   // 이미 있으면 넘어갑니다

  AL._linkKeys[linkId] = made.key;
  return made.key;
};


/* =====================================================================
   화면에서 부르는 것들
   ===================================================================== */

/* 내 계정에 열쇠가 있나 */
AL.hasAccountKeys = async function(){
  try {
    var res = await AL.sb.from('account_keys').select('public_key').maybeSingle();
    return !!(res.data && res.data.public_key);
  } catch (e) { return false; }
};

/* 복구 코드를 물어보는 창.
   ⚠ 열쇠가 없으면 만들고, 있으면 엽니다. 손님은 그 차이를 몰라도 됩니다. */
AL.askRecovery = function(opts){
  opts = opts || {};
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
    function onKey(e){ if (e.key === 'Escape') close(false); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(false); });

    sheet.innerHTML = '<div class="grip"></div>';
    var h = document.createElement('p'); h.className = 'pk-title';
    h.textContent = AL.t(opts.setup ? 'ecSetup' : 'ecUnlock');
    sheet.appendChild(h);

    var n = document.createElement('p'); n.className = 'pk-note';
    n.textContent = AL.t(opts.setup ? 'ecSetupD' : 'ecNeedCode');
    sheet.appendChild(n);

    var form = document.createElement('div'); form.className = 'pk-form';
    var lab = document.createElement('p'); lab.className = 'pk-note';
    lab.style.margin = '0 0 6px';
    lab.textContent = AL.t('ecAskCode');
    form.appendChild(lab);

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    inp.style.fontFamily = 'ui-monospace, monospace';
    form.appendChild(inp);

    var hint = document.createElement('p'); hint.className = 'pk-note';
    hint.style.marginTop = '6px';
    hint.textContent = AL.t('ecCodeHint');
    form.appendChild(hint);

    var go = document.createElement('button');
    go.className = 'pk-go';
    go.textContent = AL.t(opts.setup ? 'ecSetup' : 'ecUnlock');
    go.addEventListener('click', run);
    form.appendChild(go);
    sheet.appendChild(form);

    inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') run(); });
    setTimeout(function(){ inp.focus(); }, 60);

    async function run(){
      var code = inp.value.trim();
      if (!code) return;
      go.disabled = true;
      go.textContent = AL.t('ecWorking');
      try {
        if (opts.setup) {
          var made = await AL.makeAccountKeys(code);
          var sess = await AL.sb.auth.getSession();
          var res = await AL.sb.from('account_keys').upsert({
            account_id: sess.data.session.user.id,
            public_key: made.publicKey,
            secret_wrapped: made.secretWrapped,
            wrap_salt: made.wrapSalt,
            algo: made.algo,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'account_id' });
          if (res.error) throw res.error;
        }
        await AL.unlockWithRecovery(code);
        close(true);
      } catch (e) {
        console.warn('[e2ee]', e);
        var err = document.createElement('div'); err.className = 'pk-err';
        err.textContent = (e && e.message === 'no_keys')
          ? AL.t('ecSetupD') : AL.t('ecWrong');
        form.appendChild(err);
        go.disabled = false;
        go.textContent = AL.t(opts.setup ? 'ecSetup' : 'ecUnlock');
      }
    }
  });
};

/* 열쇠가 준비되게 합니다. 없으면 만들고, 잠겨 있으면 물어봅니다. */
AL.ensureUnlocked = async function(){
  if (AL.hasSecret()) return true;
  var has = await AL.hasAccountKeys();
  return AL.askRecovery({ setup: !has });
};


/* =====================================================================
   방을 어떻게 쓸까 — 모인 사람들이 정합니다
   2026-09-06

   🔴 규칙
     ① 방에 들어오면 한 번 물어봅니다: 그냥 쓸까, 잠그고 쓸까
     ② 잠그기로 했으면 각자 자기 복구 코드를 넣습니다
        별도의 방 코드는 없습니다. 그러면 그 코드를 전할 길이 또 필요합니다
     ③ 안 넣은 사람은 거부한 것으로 보고 못 들어옵니다
        나중에 넣으면 그때부터 들어옵니다

   ⚠ 통화는 어느 쪽이든 안전합니다. 서버를 안 거치니까요.
     잠그기는 "대화 기록" 이야기입니다. 화면에 그 점을 적어둡니다.
   ===================================================================== */

/* 이 방을 어떻게 쓸지 고릅니다. 아직 안 정한 방에서만 부릅니다. */
AL.askRoomMode = function(linkId){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

    var done = false;
    function close(v){
      if (done) return;
      done = true;
      bg.remove(); sheet.remove();
      resolve(v);
    }
    // ⚠ 닫기를 막습니다. 정하지 않으면 대화를 시작할 수 없습니다.
    //   다만 화면 밖을 눌러도 안 닫히면 갇힌 느낌이라, 그냥 쓰기로 봅니다.
    bg.addEventListener('click', function(){ pick('open'); });

    sheet.innerHTML = '<div class="grip"></div>';
    var h = document.createElement('p'); h.className = 'pk-title';
    h.textContent = AL.t('rmAsk'); sheet.appendChild(h);
    var n = document.createElement('p'); n.className = 'pk-note';
    n.textContent = AL.t('rmAskNote'); sheet.appendChild(n);

    [['open', 'rmOpen', 'rmOpenD'], ['lock', 'rmLock', 'rmLockD']].forEach(function(o){
      var card = document.createElement('div');
      card.className = 'roomchoice' + (o[0] === 'lock' ? ' lock' : '');
      var b = document.createElement('b'); b.textContent = AL.t(o[1]); card.appendChild(b);
      var d = document.createElement('span'); d.textContent = AL.t(o[2]); card.appendChild(d);
      card.addEventListener('click', function(){ pick(o[0]); });
      sheet.appendChild(card);
    });

    // 통화는 어느 쪽이든 안전하다는 것을 밝힙니다.
    var safe = document.createElement('p'); safe.className = 'pk-note';
    safe.style.marginTop = '4px';
    safe.textContent = AL.t('rmCallSafe');
    sheet.appendChild(safe);

    async function pick(mode){
      try {
        var r = await AL.sb.from('links').update({ room_mode: mode })
          .eq('id', linkId).select('id');
        if (r.error) throw r.error;
        close(mode);
      } catch (e) {
        console.error('[room]', e);
        close(null);
      }
    }
  });
};

/* 잠그기로 한 방 — 누가 넣었고 누가 안 넣었는지 보여줍니다. */
AL.showRoomConsent = function(linkId, mySideId){
  return new Promise(function(resolve){
    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

    var done = false;
    function close(v){
      if (done) return;
      done = true;
      bg.remove(); sheet.remove();
      resolve(v);
    }
    bg.addEventListener('click', function(){ close(false); });

    async function draw(){
      sheet.innerHTML = '<div class="grip"></div>';
      var h = document.createElement('p'); h.className = 'pk-title';
      h.textContent = AL.t('rmLock'); sheet.appendChild(h);
      var n = document.createElement('p'); n.className = 'pk-note';
      n.textContent = AL.t('rmBlockedD'); sheet.appendChild(n);

      var res = await AL.sb.rpc('room_members', { p_link_id: linkId });
      var rows = res.data || [];
      var meRow = rows.filter(function(r){ return r.is_me; })[0];

      rows.forEach(function(r){
        var row = document.createElement('div');
        row.className = 'memberrow' +
          (r.agreed === true ? ' ok' : (r.agreed === false ? ' no' : ''));

        var av = document.createElement('span'); av.className = 'mav';
        av.textContent = AL.initial(r.display_name); row.appendChild(av);

        var nm = document.createElement('span'); nm.className = 'mn';
        nm.textContent = r.is_me ? AL.t('rmMe') : (r.display_name || '');
        row.appendChild(nm);

        var st = document.createElement('span'); st.className = 'ms';
        st.textContent = r.agreed === true ? AL.t('rmAgreed')
                       : (r.agreed === false ? AL.t('rmDeclined') : AL.t('rmWaiting'));
        row.appendChild(st);
        sheet.appendChild(row);
      });

      // 내가 아직 안 넣었으면 넣게 합니다.
      if (!meRow || meRow.agreed !== true) {
        var go = document.createElement('button');
        go.className = 'pk-go'; go.style.width = '100%'; go.style.marginTop = '14px';
        go.textContent = AL.t('rmMyTurn');
        go.addEventListener('click', async function(){
          if (!await AL.ensureUnlocked()) return;
          try {
            await AL.sb.from('link_sides')
              .update({ e2ee_agreed: true, agreed_at: new Date().toISOString() })
              .eq('id', mySideId);
            // 모두 넣었으면 서버가 방을 잠급니다.
            var sealed = await AL.sb.rpc('seal_room', { p_link_id: linkId });
            if (sealed.data) { close(true); return; }
            draw();
          } catch (e) {
            console.error('[room]', e);
          }
        });
        sheet.appendChild(go);

        var no = document.createElement('button');
        no.className = 'pk-opt'; no.style.marginTop = '8px';
        no.textContent = AL.t('rmDecline');
        no.addEventListener('click', async function(){
          // ⚠ 거부해도 나중에 넣을 수 있습니다. 영영 막는 것이 아닙니다.
          await AL.sb.from('link_sides').update({ e2ee_agreed: false }).eq('id', mySideId);
          close(false);
        });
        sheet.appendChild(no);
      } else {
        var w = document.createElement('p'); w.className = 'pk-note';
        w.style.marginTop = '12px';
        w.textContent = AL.t('rmWaiting');
        sheet.appendChild(w);
      }
    }
    draw();
  });
};

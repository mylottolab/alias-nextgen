/* =====================================================================
   Alias Next-Gen — 통화 (WebRTC)
   2026-09-05
   2026-09-10  🔴 "끊습니다" 인사가 폰을 못 떠나던 문제 고침 (endCall)
   2026-09-10  🔴 상대가 소리 없이 사라졌을 때 12초 뒤 끊기 (onconnectionstatechange)
   2026-09-10  🔴 두 번 끊기 막기 · 전화 건 발자국 남기기
   2026-09-11  🔴 받는 쪽이 끊어도 벨끄기 알림을 보냄 (cancelPush)
   2026-09-11  🔴 이미 받은 전화는 watchIncoming 이 다시 안 띄움
   2026-09-11  🔴 웹에서 남은 전화 알림을 직접 지움 (벨이 안 멎던 문제)
   2026-09-11  🔴 중계(TURN)가 없으면 콘솔에 크게 알림
   2026-09-11  🔴 소리가 오가는 양을 재서 화면에 보여줌 (bytes)
   2026-09-11  🔴 붙는 과정을 화면에 단계별로 보여줌 (ice-state)
   2026-09-11  🔴 찾은 길을 줄 세워 보내고, 상대가 들어오면 다시 보냄
                  (중계가 붙어 길이 14개로 늘면서 드러난 문제)

   Aliascall 의 aliascall_connect.html 에서 옮겨왔습니다.
   그쪽이 이미 겪고 고쳐놓은 것들을 그대로 가져옵니다.

   🔴 옮기면서 고친 것
     ① TURN 자격증명을 서버에서 받아옵니다.
        Aliascall 은 화면 파일에 아이디·비밀번호를 그대로 적어뒀습니다.
        페이지 소스만 열면 누구나 보이고, TURN 은 트래픽 과금이라 돈이 나갑니다.
     ② 방 대신 링크를 씁니다. registration_id → link_id.
     ③ 익명 참가자 개념이 없습니다. 양쪽 다 로그인한 대등한 사이입니다.

   🔴 그대로 가져온 것 — 어렵게 얻은 교훈들
     · ICE 후보 큐잉
       setRemoteDescription 보다 후보가 먼저 오면 조용히 버려집니다.
       Aliascall 이 이걸로 하루를 썼습니다. 담아뒀다가 나중에 넣습니다.
     · 구독이 끝난 뒤 보내기
       붙기 전에 보내면 유실됩니다.
     · offer 를 몇 번 다시 보내기
       상대가 늦게 들어오면 첫 offer 를 놓칩니다.

   ⚠ 함정 ⑲ — 고치면 부르는 화면의 ?v= 도 함께 올리세요.
     지금 부르는 화면: alias_chat.html · alias_call.html
   ===================================================================== */

window.AL = window.AL || {};

AL.call = {
  pc: null,
  local: null,
  remote: null,
  channel: null,
  token: null,
  callId: null,
  linkId: null,
  mySideId: null,
  type: 'voice',
  outgoing: true,
  answered: false,
  answeredAt: null,
  sdpDone: false,      // offer/answer 교환이 끝났나
  pending: [],        // 아직 못 넣은 ICE 후보
  resendTimer: null,
  noAnswerTimer: null,
  dropTimer: null,     // 🔴 2026-09-10: 상대가 소리 없이 사라졌을 때
  statsTimer: null,    // 🔴 2026-09-11: 소리가 실제로 오가는지 재는 시계
  myCands: null,       // 🔴 2026-09-11: 내가 찾은 길. 상대가 들어오면 다시 보냅니다
  bytesSeen: 0,        // 🔴 2026-09-11: 지금까지 주고받은 양
  onState: null,      // 화면이 상태를 받아보는 통로
};

/* ── 서버에서 STUN/TURN 을 받아옵니다 ────────────────────────────────
   ⚠ 화면 파일에는 아무 열쇠도 없습니다. 매번 새로 받습니다.
------------------------------------------------------------------- */
AL.getIceServers = async function(){
  try {
    var out = await AL.callFn('alias-ice', {});

    /* 🔴🔴 2026-09-11 — 중계(TURN)가 들어 있는지 큰 소리로 알립니다.

       2026-09-11 에 A(SKT 5G) ↔ B(U+ 5G) 통화가 안 됐습니다.
       원인은 TURN 서버를 안 붙인 것이었는데, 아무 오류도 안 났습니다.
       와이파이가 낀 통화는 멀쩡했기 때문에 몇 시간을 헤맸습니다.

       STUN 만으로도 **쉬운 조합에서는 통화가 됩니다.** 그래서 고장난 줄을
       모릅니다. 앞으로는 콘솔만 보면 알 수 있게 합니다. */
    AL.call.turnReady = (out.turn !== false);
    if (out.turn === false) {
      console.error('[call] 🔴 중계(TURN)가 없습니다! ' +
        '통신사가 다른 이동통신끼리는 통화가 안 됩니다. ' +
        'alias-ice 함수의 로그와 Supabase Secrets 를 보세요.');
    } else {
      console.log('[call] 중계(TURN) 준비됨');
    }

    return out.iceServers || [];
  } catch (e) {
    console.error('[call] 🔴 ICE 를 못 받았습니다. STUN 만으로 해봅니다. ' +
      '이 상태면 이동통신끼리 통화가 안 됩니다.', e);
    AL.call.turnReady = false;
    AL.call.iceError = String((e && e.message) || e).slice(0, 60);
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }
};

function say(state, extra){
  if (AL.call.onState) AL.call.onState(state, extra || {});
}

/* ── 신호를 주고받는 채널 ────────────────────────────────────────────
   대화방 채널과 따로 씁니다. 통화는 오갈 것이 많아 섞으면 시끄럽습니다.
------------------------------------------------------------------- */
async function openSignal(token, onMsg){
  await AL.syncRealtimeAuth();
  var ch = AL.sb.channel('call-' + token, { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'sig' }, function(e){ onMsg(e.payload || {}); });

  // ⚠ 구독이 끝나기를 기다립니다. 먼저 보내면 유실됩니다.
  await new Promise(function(resolve){
    var settled = false;
    var done = function(){ if (!settled) { settled = true; resolve(); } };
    ch.subscribe(function(status){
      if (status === 'SUBSCRIBED') done();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') done();
    });
    setTimeout(done, 4000);
  });
  return ch;
}

/* =====================================================================
   🔴🔴 2026-09-11 신설 — 찾은 길(ICE)을 천천히, 그리고 다시 보냅니다

   두 가지 문제를 같이 풉니다.

   ① 상대가 아직 안 들어와 있는데 보냈습니다
      거는 쪽은 걸자마자 길을 찾아 보냅니다. 그런데 받는 쪽은 "받기" 를
      눌러야 신호 채널에 들어옵니다. 그 전에 보낸 것은 아무도 못 받고
      사라집니다. 방송이라 기록이 안 남습니다.
      → 찾은 길을 모아뒀다가, 상대가 들어오면 다시 보냅니다.

   ② 한꺼번에 너무 빨리 보냈습니다
      Supabase 실시간 채널은 **초당 열 개**까지만 받습니다.
      중계가 붙으면서 길이 열네 개로 늘었는데, 전부 한 번에 던지니
      뒤엣것이 조용히 버려졌습니다. 오류도 안 납니다.
      → 0.13초 간격으로 줄 세워 보냅니다.

   둘 다 **중계(TURN)가 붙은 뒤에야 드러나는** 문제입니다.
   전에는 길이 두세 개뿐이라 우연히 타이밍이 맞았습니다.
   ===================================================================== */
var iceQueue = [];
var iceTimer = null;

function sendIce(cand){
  iceQueue.push(cand);
  if (iceTimer) return;
  iceTimer = setInterval(function(){
    if (!iceQueue.length) { clearInterval(iceTimer); iceTimer = null; return; }
    if (!AL.call.channel) return;      // 채널이 잠깐 없으면 기다립니다
    send('ice', { candidate: iceQueue.shift() });
  }, 130);
}

function stopIceQueue(){
  if (iceTimer) { clearInterval(iceTimer); iceTimer = null; }
  iceQueue = [];
}

/* 상대가 신호 채널에 들어왔을 때, 그동안 찾아둔 길을 전부 다시 보냅니다. */
function resendMyCands(){
  var list = AL.call.myCands || [];
  if (!list.length) return;
  console.log('[ice] 찾아둔 길 ' + list.length + '개를 다시 보냅니다');
  list.forEach(function(c){ sendIce(c); });
}

function send(kind, data){
  if (!AL.call.channel) return;
  AL.call.channel.send({ type: 'broadcast', event: 'sig',
                         payload: Object.assign({ kind: kind }, data) });
}

/* ── 연결 만들기 ─────────────────────────────────────────────────── */
async function buildPeer(iceServers){
  var pc = new RTCPeerConnection({ iceServers: iceServers });

  pc.onicecandidate = function(e){
    if (e.candidate) {
      /* 🔴 2026-09-11 — 모아두고(나중에 다시 보내려고) 줄 세워 보냅니다 */
      AL.call.myCands = AL.call.myCands || [];
      AL.call.myCands.push(e.candidate);
      sendIce(e.candidate);
      /* 🔴 2026-09-11 — 어떤 길을 찾았는지 세어둡니다.
         relay 가 하나도 없으면 중계를 못 쓰고 있다는 뜻입니다. */
      var t = e.candidate.type || (e.candidate.candidate || '').split(' ')[7] || '?';
      AL.call.found = AL.call.found || {};
      AL.call.found[t] = (AL.call.found[t] || 0) + 1;
      if (t === 'relay') AL.call.sawRelay = true;
    } else {
      var f = AL.call.found || {};
      console.log('[ice] 길 찾기 끝:', JSON.stringify(f));
      if (!AL.call.sawRelay) {
        console.error('[ice] 🔴 중계 길을 하나도 못 찾았습니다.');
      }
      /* 🔴🔴 2026-09-11 — 화면에 그대로 보여줍니다.
         USB 를 안 꽂아도 폰만 보면 알 수 있어야 합니다.
           집 1 · 밖 1 · 중계 2   ← 중계가 0 이면 그게 원인입니다 */
      say('ice-found', {
        turn: AL.call.turnReady !== false,
        err: AL.call.iceError || '',
        host: f.host || 0,
        srflx: f.srflx || 0,
        relay: f.relay || 0,
      });
    }
  };

  /* 🔴🔴 2026-09-11 신설 — 붙는 과정을 화면에 보여줍니다.
     전에는 "전화 거는 중" 한 줄뿐이라 어디서 막혔는지 알 수가 없었습니다. */
  pc.oniceconnectionstatechange = function(){
    var s = pc.iceConnectionState;
    console.log('[ice] 상태:', s);
    say('ice-state', { state: s });
  };

  pc.ontrack = function(e){
    AL.call.remote = e.streams[0];
    say('remote-stream', { stream: e.streams[0] });
  };

  pc.onconnectionstatechange = function(){
    var s = pc.connectionState;
    console.log('[call] 연결 상태:', s);
    if (s === 'connected') {
      if (AL.call.dropTimer) { clearTimeout(AL.call.dropTimer); AL.call.dropTimer = null; }
      startStats();          // 🔴 2026-09-11 — 소리가 오가는지 재기 시작
      say('connected');
    }
    else if (s === 'failed') say('failed');
    else if (s === 'disconnected') {
      say('disconnected');
      /* 🔴 2026-09-10 신설 — 상대가 소리 없이 사라진 경우
         상대의 "끊습니다" 인사가 못 왔을 때, 예전에는 이 화면이 영영
         "통화 중" 인 채로 남았습니다. 마이크도 열린 채였습니다.
         12초를 기다려보고 안 돌아오면 끝난 것으로 봅니다.
         (잠깐 끊겼다 붙는 경우가 있어서 곧바로 끊지는 않습니다) */
      if (AL.call.dropTimer) clearTimeout(AL.call.dropTimer);
      AL.call.dropTimer = setTimeout(function(){
        if (AL.call.pc && AL.call.pc.connectionState !== 'connected') {
          console.warn('[call] 상대가 사라졌습니다. 끊습니다.');
          AL.endCall('completed');
        }
      }, 12000);
    }
  };

  return pc;
}

/* 담아둔 ICE 후보를 이제 넣습니다.
   ⚠ setRemoteDescription 보다 먼저 온 것들입니다. 그냥 넣으면 버려집니다. */
async function drainPending(){
  var list = AL.call.pending;
  AL.call.pending = [];
  for (var i = 0; i < list.length; i++) {
    try { await AL.call.pc.addIceCandidate(list[i]); }
    catch (e) { console.warn('[call] 후보 넣기 실패', e); }
  }
}

async function addIce(candidate){
  if (!AL.call.pc) return;
  // 아직 상대 설명이 안 들어왔으면 담아둡니다.
  if (!AL.call.pc.remoteDescription || !AL.call.pc.remoteDescription.type) {
    AL.call.pending.push(candidate);
    return;
  }
  try { await AL.call.pc.addIceCandidate(candidate); }
  catch (e) { console.warn('[call] 후보 넣기 실패', e); }
}

/* ── 걸기 ────────────────────────────────────────────────────────── */
AL.startCall = async function(opts){
  /* 🔴 2026-09-10 신설 — "누가 전화를 걸었나" 를 콘솔에 남깁니다.
     유령 전화를 쫓을 때 이 세 줄이면 범인이 나옵니다.
     chrome://inspect 의 Console 에서 ▶ 표시를 찾으세요. */
  console.log('[call] ▶ 전화를 겁니다');
  console.log('[call]   이 화면 주소 :', location.href);
  console.log('[call]   앞 화면      :', document.referrer || '(없음)');
  try { console.trace('[call]   누가 불렀나'); } catch (e) {}

  AL._ending = false;

  // 🔴 앞 통화의 찌꺼기를 먼저 치웁니다.
  //   안 치우면 두 번째 통화가 첫 통화 위에 올라타서, 화면은 "통화 중"인데
  //   소리가 안 옵니다. 옛 채널·옛 PeerConnection 이 살아 있기 때문입니다.
  cleanup();
  await new Promise(function(r){ setTimeout(r, 250); });   // 채널이 닫힐 짬

  var linkId = opts.linkId, sideId = opts.sideId;
  var type = opts.type || 'voice';

  AL.call.linkId = linkId;
  AL.call.mySideId = sideId;
  AL.call.type = type;
  AL.call.outgoing = true;
  AL.call.answered = false;
  AL.call.answeredAt = null;
  AL.call.sdpDone = false;
  AL.call.pending = [];
  AL.call.onState = opts.onState || null;

  say('preparing');

  // 1) 마이크·카메라
  try {
    // ⚠ 에코 제거를 켜야 합니다. 안 켜면 두 기기가 가까울 때 하울링이 납니다.
    //   자동 이득 조절과 잡음 억제도 함께 켭니다. 음질이 눈에 띄게 나아집니다.
    AL.call.local = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === 'video',
    });
  } catch (e) {
    say('no-media', { error: e });
    throw e;
  }
  say('local-stream', { stream: AL.call.local });

  // 2) 통화 줄을 만듭니다. 받는 쪽이 이걸 보고 벨을 울립니다.
  var token = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  AL.call.token = token;

  var ins = await AL.sb.from('calls').insert({
    link_id: linkId, caller_side_id: sideId,
    session_token: token, call_type: type,
    mode: opts.mode || 'normal',
  }).select('id').single();
  if (ins.error) { say('failed', { error: ins.error }); throw ins.error; }
  AL.call.callId = ins.data.id;

  /* 🔴 2026-09-08 신설 (FCM 3단계) — 상대 폰을 깨웁니다.
     여기까지 오면 통화 줄이 만들어졌습니다. 상대가 앱을 보고 있으면
     watchIncoming 이 알아서 벨을 울리지만, 앱을 껐거나 폰이 잠겨 있으면
     아무 일도 안 일어납니다. 그래서 알림을 한 번 쏩니다.

     ⚠ 기다리지 않습니다. 알림이 늦거나 실패해도 통화는 그대로 진행돼야
       합니다. 상대가 앱을 보고 있으면 알림 없이도 벨이 울립니다.
     ⚠ 실패해도 조용히 넘어갑니다. 상대가 앱을 안 깔았거나 알림을 껐을
       수 있는데, 그건 잘못이 아닙니다. */
  try {
    AL.callFn('alias-push-call', {
      linkId: linkId,
      callId: AL.call.callId,
      sessionToken: token,
      callType: type,
      /* 🔴 2026-09-10: 잠금화면에 "누가 거는지" 를 띄우려면 이름이 필요합니다.
         ⚠ 상대가 나를 부르는 이름이 아니라, 내가 이 관계에서 쓰는 별칭입니다.
           상대 화면에는 그 별칭이 보여야 맞습니다. */
      who: (opts.myFace || ''),
    }).then(function(r){
      console.log('[push] 알림 ' + (r && r.sent) + '대에 보냈습니다');
    }).catch(function(e){
      console.warn('[push] 알림을 못 보냈습니다 — 통화는 그대로 진행합니다', e);
    });
  } catch (e) {
    console.warn('[push] 알림 보내기 실패', e);
  }

  // 3) 신호 채널
  var ice = await AL.getIceServers();
  AL.call.channel = await openSignal(token, handleSignal);
  AL.call.pc = await buildPeer(ice);
  AL.call.local.getTracks().forEach(function(t){
    AL.call.pc.addTrack(t, AL.call.local);
  });

  // 4) offer
  var offer = await AL.call.pc.createOffer();
  await AL.call.pc.setLocalDescription(offer);
  send('offer', { sdp: offer });
  say('ringing');

  // 🔴 offer 다시 보내기를 언제 멈추느냐가 핵심입니다.
  //   전에는 "answered" 를 받으면 멈췄습니다. 그런데 받는 쪽은 채널에 붙자마자
  //   answered 를 보내는데, 그때는 아직 offer 를 못 받은 상태일 수 있습니다.
  //   그러면 거는 쪽이 멈춰버려서 offer 가 영영 안 갑니다.
  //   첫 통화는 타이밍이 맞아 넘어가고, 두 번째부터 조용해집니다.
  //   → 이제 answer(SDP) 를 실제로 받을 때까지 계속 보냅니다.
  AL.call.offerSdp = offer;
  AL.call.resendTimer = setInterval(function(){
    if (AL.call.sdpDone) { clearInterval(AL.call.resendTimer); AL.call.resendTimer = null; return; }
    console.log('[call] offer 다시 보냄');
    send('offer', { sdp: AL.call.offerSdp });
  }, 1500);

  // 40초 안 받으면 부재중
  AL.call.noAnswerTimer = setTimeout(function(){
    if (!AL.call.answered) AL.endCall('no_answer');
  }, 40000);
};

/* ── 받기 ────────────────────────────────────────────────────────── */
AL.answerCall = async function(opts){
  AL._ending = false;
  AL.clearCallNotices();   // 🔴 2026-09-11 — 받았으니 내 폰의 벨을 끕니다
  cleanup();
  await new Promise(function(r){ setTimeout(r, 250); });

  AL.call.linkId = opts.linkId;
  AL.call.mySideId = opts.sideId;
  AL.call.callId = opts.callId;
  AL.call.token = opts.token;
  AL.call.type = opts.type || 'voice';
  AL.call.outgoing = false;
  AL.call.answered = true;
  AL.call.answeredAt = Date.now();   // 🔴 2026-09-10: 통화시간을 폰이 직접 셉니다
  AL.call.pending = [];
  AL.call.onState = opts.onState || null;

  say('preparing');

  try {
    AL.call.local = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: AL.call.type === 'video',
    });
  } catch (e) {
    say('no-media', { error: e });
    throw e;
  }
  say('local-stream', { stream: AL.call.local });

  var ice = await AL.getIceServers();
  AL.call.channel = await openSignal(opts.token, handleSignal);
  AL.call.pc = await buildPeer(ice);
  AL.call.local.getTracks().forEach(function(t){
    AL.call.pc.addTrack(t, AL.call.local);
  });

  await AL.sb.from('calls')
    .update({ answered_at: new Date().toISOString() }).eq('id', opts.callId);

  // 붙었다고 알립니다. 거는 쪽이 이걸 보고 offer 를 바로 보냅니다.
  // ⚠ 이것만으로 offer 다시 보내기를 멈추게 하면 안 됩니다.
  //   아직 offer 를 못 받았을 수 있습니다.
  send('ready', {});
  send('answered', {});
  say('answering');

  // 2초 안에 offer 가 안 오면 조릅니다.
  setTimeout(function(){
    if (AL.call.pc && !(AL.call.pc.remoteDescription && AL.call.pc.remoteDescription.type)) {
      console.log('[call] offer 가 안 와서 조릅니다');
      send('need-offer', {});
    }
  }, 2000);
};

/* ── 신호 처리 ───────────────────────────────────────────────────── */
async function handleSignal(m){
  if (!m || !m.kind) return;

  if (m.kind === 'offer') {
    if (!AL.call.pc) return;
    // 이미 처리했으면 넘어갑니다. offer 는 여러 번 옵니다.
    if (AL.call.pc.remoteDescription && AL.call.pc.remoteDescription.type) return;
    await AL.call.pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
    await drainPending();
    var ans = await AL.call.pc.createAnswer();
    await AL.call.pc.setLocalDescription(ans);
    send('answer', { sdp: ans });

  } else if (m.kind === 'answer') {
    if (!AL.call.pc) return;
    if (AL.call.pc.remoteDescription && AL.call.pc.remoteDescription.type) return;
    await AL.call.pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
    await drainPending();
    // 🔴 이제서야 offer 다시 보내기를 멈춥니다.
    AL.call.sdpDone = true;
    if (AL.call.resendTimer) { clearInterval(AL.call.resendTimer); AL.call.resendTimer = null; }
    console.log('[call] answer 받음. 교환 끝');

  } else if (m.kind === 'ready' || m.kind === 'need-offer') {
    /* 🔴🔴 2026-09-11 — 상대가 신호 채널에 막 들어왔습니다.
       이때 offer 뿐 아니라 **그동안 찾아둔 길도 전부 다시 보내야** 합니다.
       안 그러면 상대는 내 주소를 하나도 모른 채 "길 맞춰보는 중" 에서
       영영 멈춥니다. */
    if (AL.call.outgoing && AL.call.offerSdp) {
      /* 지금 시점의 설명을 보냅니다. 처음 만든 것보다 길 정보가 더 들어 있습니다. */
      var sdpNow = AL.call.offerSdp;
      try {
        if (AL.call.pc && AL.call.pc.localDescription) sdpNow = AL.call.pc.localDescription;
      } catch (e) {}
      console.log('[call] 상대가 들어왔습니다. offer 를 다시 보냅니다');
      send('offer', { sdp: sdpNow });
    }
    resendMyCands();
  } else if (m.kind === 'ice') {
    await addIce(m.candidate);

  } else if (m.kind === 'answered') {
    // 사람이 받았다는 뜻입니다. 부재중 시계만 멈춥니다.
    // ⚠ offer 다시 보내기는 여기서 멈추면 안 됩니다. 위 주석 참고.
    AL.call.answered = true;
    AL.call.answeredAt = Date.now();   // 🔴 2026-09-10
    if (AL.call.noAnswerTimer) { clearTimeout(AL.call.noAnswerTimer); AL.call.noAnswerTimer = null; }
    say('answering');

  } else if (m.kind === 'bye') {
    say('peer-hangup', { reason: m.reason || 'completed' });
    cleanup();

  } else if (m.kind === 'decline') {
    say('declined');
    cleanup();
  }
}

/* 🔴🔴 2026-09-11 신설 — 이 폰에 남아 있는 전화 알림을 웹에서 직접 지웁니다.

   왜 필요한가
     전화 알림 채널은 USAGE_NOTIFICATION_RINGTONE 으로 만들었습니다.
     그래야 알림음이 아니라 진짜 전화벨로 울립니다. 그런데 전화벨은
     **알림이 떠 있는 내내 반복**됩니다. 손을 대야 멎습니다.

     통화가 웹 화면에서 끝나도 자바는 그걸 모릅니다. 그래서 지울 사람이
     없어 벨이 계속 울렸습니다.

   이제 통화가 끝나거나, 이미 끝난 전화로 들어왔을 때 여기서 지웁니다.
   Capacitor 의 알림 창구를 그대로 씁니다 — 새 플러그인이 필요 없습니다.

   ⚠ 브라우저에서는 아무 일도 안 합니다(창구가 없습니다). 그래도 됩니다.
   ⚠ 안 읽은 메시지 알림도 같이 지워집니다. 통화가 끝난 순간이면
     손님이 앱을 보고 있다는 뜻이라 괜찮습니다. */
AL.clearCallNotices = function(){
  try {
    var P = window.Capacitor && window.Capacitor.Plugins &&
            window.Capacitor.Plugins.PushNotifications;
    if (!P || !P.removeAllDeliveredNotifications) return;
    P.removeAllDeliveredNotifications();
    console.log('[push] 이 폰에 남은 알림을 지웠습니다');
  } catch (e) { /* 못 지워도 통화에는 지장 없습니다 */ }
};

/* 🔴 2026-09-10 신설 — 상대 폰의 벨을 끄는 알림
   화면을 떠나도 끝까지 가야 하므로 keepalive 로 던집니다.
   AL.callFn 은 보통 fetch 라 화면이 바뀌면 취소됩니다. */
function cancelPush(callId, linkId, outgoing, reason){
  /* 🔴🔴 2026-09-11 고침 — 받는 쪽도 보내야 합니다.
     전에는 outgoing(거는 쪽)일 때만 보냈습니다. 그래서
       A 가 끊으면 → 이 알림이 나가 B 의 벨이 꺼짐        (조용)
       B 가 끊으면 → 아무도 안 보냄 → 벨이 그대로 남음     (다시 울림)
     이 비대칭이 "B 가 끊을 때만" 나던 증상의 원인이었습니다.
     이제 누가 끊든 보냅니다. */
  if (!callId || !linkId) return;
  try {
    fetch(AL.SUPABASE_URL + '/functions/v1/alias-push-call', {
      method: 'POST',
      keepalive: true,
      headers: {
        'apikey': AL.SUPABASE_ANON,
        'Authorization': 'Bearer ' + (AL._lastToken || AL.SUPABASE_ANON),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkId: linkId, callId: callId, cancel: true, reason: reason,
      }),
    }).catch(function(){ /* 못 거둬도 통화 종료는 됩니다 */ });
  } catch (e) {}
}

/* ── 끊기 ────────────────────────────────────────────────────────── */
AL._ending = false;

AL.endCall = async function(reason){
  reason = reason || 'completed';

  /* 🔴 2026-09-10 신설 — 두 번 끊는 것을 막습니다.
     끊기 단추 · pagehide · 12초 시계가 한꺼번에 부를 수 있습니다.
     그러면 기록이 두 번 덮어써지고 인사도 두 번 나갑니다. */
  if (AL._ending) { console.log('[call] 이미 끊는 중입니다'); return; }
  AL._ending = true;
  setTimeout(function(){ AL._ending = false; }, 3000);

  /* 🔴🔴 2026-09-10 고침 — "끊습니다" 인사가 폰을 못 떠나던 문제
     전에는 인사를 보내자마자 아래 cleanup() 이 신호 채널을 닫아버렸습니다.
     채널 보내기는 바로 나가는 게 아니라 잠깐 줄을 섭니다. 폰이 빠르면
     통과하고, 느리면 줄을 선 채로 채널이 닫혀 인사가 사라졌습니다.
     그러면 상대는 끊긴 줄 모르고 "통화 중" 인 채로 남습니다.
     → 채널을 여기서 따로 붙들었다가, 인사가 나갈 짬을 준 뒤 닫습니다. */
  var farewell = AL.call.channel;
  if (farewell) send(reason === 'declined' ? 'decline' : 'bye', { reason: reason });
  AL.call.channel = null;          // cleanup 이 곧바로 못 닫게 빼둡니다
  if (farewell) {
    setTimeout(function(){
      try { AL.sb.removeChannel(farewell); } catch (e) {}
    }, 900);
  }

  /* 🔴 2026-09-10 고침 — 상대 폰의 벨을 끄는 알림을 "맨 먼저" 보냅니다.
     전에는 기록을 저장한 뒤에 보냈는데, 그 사이 화면이 바뀌면서
     브라우저가 요청을 취소해 버렸습니다. 그래서 상대 벨이 40초를
     채우는 일이 생겼습니다. 통신이 빠르면 통과하고 느리면 잘려서
     될 때도 있고 안 될 때도 있었습니다.

     ⚠ keepalive 를 씁니다. 화면을 떠나도 요청이 끝까지 갑니다.
       alias_gcall.js 의 leaveQuietly 와 같은 방식입니다.
     ⚠ 값을 먼저 붙들어 둡니다. cleanup 이 돌면 callId 가 비워집니다. */
  cancelPush(AL.call.callId, AL.call.linkId, AL.call.outgoing, reason);
  AL.clearCallNotices();   // 🔴 2026-09-11 — 내 폰에 남은 전화 알림도 지웁니다

  /* 🔴 2026-09-10 고침 — 받는 쪽이 끊어도 기록이 안 남던 문제

     전에는 서버에 두 번 다녀왔습니다.
       ① answered_at 을 읽어오고  ② ended_at 을 적는다
     그런데 끊으면 1.6초 뒤 화면이 바뀝니다. 그 사이에 요청이
     잘리면 ended_at 이 안 적힙니다. 그러면 그 통화가 서버에
     계속 살아 있어서, incoming_call() 이 3초마다 다시 집어옵니다.
     "끊었는데 또 울린다" 가 이것이었습니다.

     이제 한 번만, keepalive 로 보냅니다. 화면을 떠나도 끝까지 갑니다.
     통화시간은 서버에 묻지 않고 폰이 직접 셉니다(answeredAt).
     ⚠ alias_gcall.js 의 leaveQuietly 와 같은 방식입니다. */
  if (AL.call.callId) {
    var doneId = AL.call.callId;
    var secs = AL.call.answeredAt
      ? Math.max(0, Math.round((Date.now() - AL.call.answeredAt) / 1000))
      : 0;

    var why = reason;
    if (!AL.call.answeredAt && (reason === 'completed' || reason === 'canceled')) {
      /* 아무도 안 받은 전화는 "통화 0:00" 이 아니라 부재중입니다. */
      why = 'no_answer';
    } else if (AL.call.answeredAt && reason === 'no_answer') {
      why = 'completed';
    }

    try {
      fetch(AL.SUPABASE_URL + '/rest/v1/calls?id=eq.' + encodeURIComponent(doneId), {
        method: 'PATCH',
        keepalive: true,
        headers: {
          'apikey': AL.SUPABASE_ANON,
          'Authorization': 'Bearer ' + (AL._lastToken || AL.SUPABASE_ANON),
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          ended_reason: why,
          duration_seconds: secs,
        }),
      }).catch(function(e){ console.warn('[call] 기록 저장 실패', e); });
    } catch (e) { console.warn('[call] 기록 저장 실패', e); }
  }

  say('ended', { reason: reason });
  cleanup();
};

AL.declineCall = async function(callId){
  try {
    await AL.sb.from('calls').update({
      ended_at: new Date().toISOString(), ended_reason: 'declined',
    }).eq('id', callId);
  } catch (e) { /* 기록이 안 남아도 거절은 된 것입니다 */ }
};

/* =====================================================================
   🔴🔴 2026-09-11 신설 — 소리가 실제로 오가는지 재서 화면에 보여줍니다

   왜 필요한가
     화면에 "이번 통화 ○○KB" 를 보여줄 자리는 예전부터 있었는데,
     그 값을 보내주는 코드가 **없었습니다.** 만들다 만 기능이었습니다.

     그래서 통화가 안 될 때 "소리가 오가고는 있는가" 를 귀로만 판단해야
     했습니다. 그런데 echoCancellation 이 메아리를 지워버려서 두 폰을
     나란히 놓고 시험해도 아무 소리가 안 납니다. 2026-09-11 에 이것 때문에
     한참 헤맸습니다.

   이제 이렇게 보입니다
     0:07
     이번 통화 42KB      ← 숫자가 올라가면 소리가 실제로 오가는 중

   ⚠ 2초마다 잽니다. 통화에 부담이 없는 수준입니다.
   ===================================================================== */
function startStats(){
  if (AL.call.statsTimer) return;

  AL.call.statsTimer = setInterval(async function(){
    if (!AL.call.pc) { stopStats(); return; }
    try {
      var stats = await AL.call.pc.getStats();
      var total = 0;
      var pair = null;

      stats.forEach(function(r){
        if (r.type === 'inbound-rtp' && r.bytesReceived) total += r.bytesReceived;
        if (r.type === 'outbound-rtp' && r.bytesSent) total += r.bytesSent;
        if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) pair = r;
      });

      AL.call.bytesSeen = total;
      say('bytes', { bytes: total });

      /* 어떤 길로 붙었는지 한 번만 남깁니다. 나중에 원인을 찾을 때 씁니다. */
      if (pair && !AL.call.pairLogged) {
        AL.call.pairLogged = true;
        try {
          var lo = stats.get(pair.localCandidateId);
          var re = stats.get(pair.remoteCandidateId);
          console.log('[ice] 붙은 길:',
            (lo && lo.candidateType) || '?', '→', (re && re.candidateType) || '?',
            ((lo && lo.candidateType) === 'relay' || (re && re.candidateType) === 'relay')
              ? '(중계를 탔습니다)' : '(직접 붙었습니다)');
        } catch (e) {}
      }
    } catch (e) { /* 못 재도 통화에는 지장 없습니다 */ }
  }, 2000);
}

function stopStats(){
  if (AL.call.statsTimer) { clearInterval(AL.call.statsTimer); AL.call.statsTimer = null; }
}

function cleanup(){
  stopStats();
  stopIceQueue();
  AL.call.myCands = null;
  AL.call.bytesSeen = 0;
  AL.call.sawRelay = false;
  AL.call.pairLogged = false;
  AL.call.found = null;
  AL.call.iceError = '';
  if (AL.call.resendTimer) { clearInterval(AL.call.resendTimer); AL.call.resendTimer = null; }
  if (AL.call.noAnswerTimer) { clearTimeout(AL.call.noAnswerTimer); AL.call.noAnswerTimer = null; }
  if (AL.call.dropTimer) { clearTimeout(AL.call.dropTimer); AL.call.dropTimer = null; }
  if (AL.call.local) {
    AL.call.local.getTracks().forEach(function(t){ try { t.stop(); } catch (e) {} });
    AL.call.local = null;
  }
  if (AL.call.pc) {
    // 보내던 것부터 끊고 닫습니다. 그냥 close 만 하면 마이크가 살아 있을 수 있습니다.
    try { AL.call.pc.getSenders().forEach(function(sn){
      if (sn.track) { try { sn.track.stop(); } catch (e) {} }
    }); } catch (e) {}
    try { AL.call.pc.onicecandidate = null; AL.call.pc.ontrack = null;
          AL.call.pc.onconnectionstatechange = null; } catch (e) {}
    try { AL.call.pc.close(); } catch (e) {}
    AL.call.pc = null;
  }
  if (AL.call.channel) { try { AL.sb.removeChannel(AL.call.channel); } catch (e) {} AL.call.channel = null; }
  AL.call.remote = null;
  AL.call.token = null;
  AL.call.callId = null;
  AL.call.answered = false;
  AL.call.answeredAt = null;
  AL.call.sdpDone = false;
  AL.call.offerSdp = null;
  AL.call.onState = null;
  AL.call.pending = [];
}

AL.callCleanup = cleanup;

/* ── 소리 끄기 · 스피커 ──────────────────────────────────────────── */
AL.toggleMute = function(){
  if (!AL.call.local) return false;
  var on = false;
  AL.call.local.getAudioTracks().forEach(function(t){ t.enabled = !t.enabled; on = !t.enabled; });
  return on;   // true 면 음소거
};

/* ── 걸려온 전화 살피기 ──────────────────────────────────────────────
   앱이 켜져 있을 때만 됩니다. 잠금화면 수신은 3단계(FCM)의 일입니다.
------------------------------------------------------------------- */
/* 이미 본 통화는 다시 안 띄웁니다.
   ⚠ 화면을 옮겨도 기억이 남아야 합니다. 안 그러면 뒤로 갈 때마다
     같은 전화가 또 뜹니다. localStorage 에 담습니다. */
AL.SEEN_KEY = 'alias_seen_calls_v1';

AL.seenCall = function(id){
  try {
    var raw = localStorage.getItem(AL.SEEN_KEY);
    var list = raw ? JSON.parse(raw) : [];
    return list.indexOf(id) >= 0;
  } catch (e) { return false; }
};

AL.markSeenCall = function(id){
  try {
    var raw = localStorage.getItem(AL.SEEN_KEY);
    var list = raw ? JSON.parse(raw) : [];
    list.push(id);
    if (list.length > 50) list = list.slice(-50);
    localStorage.setItem(AL.SEEN_KEY, JSON.stringify(list));
  } catch (e) {}
};

AL.watchIncoming = function(onCall){
  var timer = setInterval(async function(){
    if (document.visibilityState !== 'visible') return;
    if (AL.call.pc) return;                    // 이미 통화 중
    try {
      var res = await AL.sb.rpc('incoming_call');
      var r = (res.data || [])[0];
      if (!r) return;
      /* 🔴 2026-09-11 — 이미 받은 전화는 다시 안 띄웁니다.
         받는 도중에 기록이 늦게 적히면 여기가 집어갈 수 있습니다. */
      if (r.answered_at) { AL.markSeenCall(r.call_id); return; }
      if (!AL.seenCall(r.call_id)) { AL.markSeenCall(r.call_id); onCall(r); }
    } catch (e) { /* 조용히 넘어갑니다 */ }
  }, 3000);
  return { stop: function(){ clearInterval(timer); } };
};

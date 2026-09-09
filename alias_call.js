/* =====================================================================
   Alias Next-Gen — 통화 (WebRTC)
   2026-09-05

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
  sdpDone: false,      // offer/answer 교환이 끝났나
  pending: [],        // 아직 못 넣은 ICE 후보
  resendTimer: null,
  noAnswerTimer: null,
  onState: null,      // 화면이 상태를 받아보는 통로
};

/* ── 서버에서 STUN/TURN 을 받아옵니다 ────────────────────────────────
   ⚠ 화면 파일에는 아무 열쇠도 없습니다. 매번 새로 받습니다.
------------------------------------------------------------------- */
AL.getIceServers = async function(){
  try {
    var out = await AL.callFn('alias-ice', {});
    return out.iceServers || [];
  } catch (e) {
    console.warn('[call] ICE 를 못 받았습니다. STUN 만으로 해봅니다.', e);
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

function send(kind, data){
  if (!AL.call.channel) return;
  AL.call.channel.send({ type: 'broadcast', event: 'sig',
                         payload: Object.assign({ kind: kind }, data) });
}

/* ── 연결 만들기 ─────────────────────────────────────────────────── */
async function buildPeer(iceServers){
  var pc = new RTCPeerConnection({ iceServers: iceServers });

  pc.onicecandidate = function(e){
    if (e.candidate) send('ice', { candidate: e.candidate });
  };

  pc.ontrack = function(e){
    AL.call.remote = e.streams[0];
    say('remote-stream', { stream: e.streams[0] });
  };

  pc.onconnectionstatechange = function(){
    var s = pc.connectionState;
    if (s === 'connected') say('connected');
    else if (s === 'failed') say('failed');
    else if (s === 'disconnected') say('disconnected');
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
  cleanup();
  await new Promise(function(r){ setTimeout(r, 250); });

  AL.call.linkId = opts.linkId;
  AL.call.mySideId = opts.sideId;
  AL.call.callId = opts.callId;
  AL.call.token = opts.token;
  AL.call.type = opts.type || 'voice';
  AL.call.outgoing = false;
  AL.call.answered = true;
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
    // 받는 쪽이 붙었거나 offer 를 조릅니다. 바로 보냅니다.
    if (AL.call.outgoing && AL.call.offerSdp) {
      console.log('[call] 요청 받고 offer 보냄');
      send('offer', { sdp: AL.call.offerSdp });
    }

  } else if (m.kind === 'ice') {
    await addIce(m.candidate);

  } else if (m.kind === 'answered') {
    // 사람이 받았다는 뜻입니다. 부재중 시계만 멈춥니다.
    // ⚠ offer 다시 보내기는 여기서 멈추면 안 됩니다. 위 주석 참고.
    AL.call.answered = true;
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

/* 🔴 2026-09-10 신설 — 상대 폰의 벨을 끄는 알림
   화면을 떠나도 끝까지 가야 하므로 keepalive 로 던집니다.
   AL.callFn 은 보통 fetch 라 화면이 바뀌면 취소됩니다. */
function cancelPush(callId, linkId, outgoing, reason){
  if (!callId || !linkId || !outgoing) return;
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
AL.endCall = async function(reason){
  reason = reason || 'completed';
  if (AL.call.channel) send(reason === 'declined' ? 'decline' : 'bye', { reason: reason });

  /* 🔴 2026-09-10 고침 — 상대 폰의 벨을 끄는 알림을 "맨 먼저" 보냅니다.
     전에는 기록을 저장한 뒤에 보냈는데, 그 사이 화면이 바뀌면서
     브라우저가 요청을 취소해 버렸습니다. 그래서 상대 벨이 40초를
     채우는 일이 생겼습니다. 통신이 빠르면 통과하고 느리면 잘려서
     될 때도 있고 안 될 때도 있었습니다.

     ⚠ keepalive 를 씁니다. 화면을 떠나도 요청이 끝까지 갑니다.
       alias_gcall.js 의 leaveQuietly 와 같은 방식입니다.
     ⚠ 값을 먼저 붙들어 둡니다. cleanup 이 돌면 callId 가 비워집니다. */
  cancelPush(AL.call.callId, AL.call.linkId, AL.call.outgoing, reason);

  if (AL.call.callId) {
    try {
      var start = AL.call.answeredAt || null;
      var patch = {
        ended_at: new Date().toISOString(),
        ended_reason: reason,
      };
      // 이어졌던 통화만 시간을 잽니다.
      var got = await AL.sb.from('calls')
        .select('answered_at').eq('id', AL.call.callId).maybeSingle();
      if (got.data && got.data.answered_at) {
        patch.duration_seconds =
          Math.max(0, Math.round((Date.now() - Date.parse(got.data.answered_at)) / 1000));
        patch.ended_reason = (reason === 'no_answer') ? 'completed' : reason;
      } else {
        /* 🔴 2026-09-09 신설 — 안 받은 전화가 "통화 0:00" 으로 남던 문제
           A 가 끊으면 받았는지 안 받았는지 상관없이 'completed' 로 적혔습니다.
           그래서 통화기록에 "통화 0:00" 이 남았습니다.
           answered_at 이 비어 있으면 아무도 안 받은 것이니 부재중입니다. */
        if (reason === 'completed' || reason === 'canceled') {
          patch.ended_reason = 'no_answer';
        }
        patch.duration_seconds = 0;
      }
      await AL.sb.from('calls').update(patch).eq('id', AL.call.callId);
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

function cleanup(){
  if (AL.call.resendTimer) { clearInterval(AL.call.resendTimer); AL.call.resendTimer = null; }
  if (AL.call.noAnswerTimer) { clearTimeout(AL.call.noAnswerTimer); AL.call.noAnswerTimer = null; }
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
      if (r && !AL.seenCall(r.call_id)) { AL.markSeenCall(r.call_id); onCall(r); }
    } catch (e) { /* 조용히 넘어갑니다 */ }
  }, 3000);
  return { stop: function(){ clearInterval(timer); } };
};

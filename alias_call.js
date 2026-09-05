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
  var linkId = opts.linkId, sideId = opts.sideId;
  var type = opts.type || 'voice';

  AL.call.linkId = linkId;
  AL.call.mySideId = sideId;
  AL.call.type = type;
  AL.call.outgoing = true;
  AL.call.answered = false;
  AL.call.pending = [];
  AL.call.onState = opts.onState || null;

  say('preparing');

  // 1) 마이크·카메라
  try {
    AL.call.local = await navigator.mediaDevices.getUserMedia({
      audio: true, video: type === 'video',
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

  // ⚠ 상대가 늦게 들어오면 첫 offer 를 놓칩니다. 몇 번 더 보냅니다.
  AL.call.resendTimer = setInterval(function(){
    if (AL.call.answered) { clearInterval(AL.call.resendTimer); return; }
    send('offer', { sdp: offer });
  }, 3000);

  // 40초 안 받으면 부재중
  AL.call.noAnswerTimer = setTimeout(function(){
    if (!AL.call.answered) AL.endCall('no_answer');
  }, 40000);
};

/* ── 받기 ────────────────────────────────────────────────────────── */
AL.answerCall = async function(opts){
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
      audio: true, video: AL.call.type === 'video',
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

  // 받았다고 알립니다. 거는 쪽이 offer 다시 보내기를 멈춥니다.
  send('answered', {});
  say('answering');
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

  } else if (m.kind === 'ice') {
    await addIce(m.candidate);

  } else if (m.kind === 'answered') {
    AL.call.answered = true;
    if (AL.call.resendTimer) { clearInterval(AL.call.resendTimer); AL.call.resendTimer = null; }
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

/* ── 끊기 ────────────────────────────────────────────────────────── */
AL.endCall = async function(reason){
  reason = reason || 'completed';
  if (AL.call.channel) send(reason === 'declined' ? 'decline' : 'bye', { reason: reason });

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
    AL.call.local.getTracks().forEach(function(t){ t.stop(); });
    AL.call.local = null;
  }
  if (AL.call.pc) { try { AL.call.pc.close(); } catch (e) {} AL.call.pc = null; }
  if (AL.call.channel) { try { AL.sb.removeChannel(AL.call.channel); } catch (e) {} AL.call.channel = null; }
  AL.call.remote = null;
  AL.call.token = null;
  AL.call.callId = null;
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
AL.watchIncoming = function(onCall){
  var seen = {};
  var timer = setInterval(async function(){
    if (document.visibilityState !== 'visible') return;
    if (AL.call.pc) return;                    // 이미 통화 중
    try {
      var res = await AL.sb.rpc('incoming_call');
      var r = (res.data || [])[0];
      if (r && !seen[r.call_id]) { seen[r.call_id] = 1; onCall(r); }
    } catch (e) { /* 조용히 넘어갑니다 */ }
  }, 3000);
  return { stop: function(){ clearInterval(timer); } };
};

/* =====================================================================
   Alias Next-Gen — 여럿이 하는 통화 (메시)
   2026-09-07

   🔴 어떻게 잇는가
     서버를 안 거치고 서로 직접 이어집니다. 사람마다 연결을 하나씩 만듭니다.
       3명   각자 2개
       4명   각자 3개
     내 목소리를 사람 수만큼 따로 올려보냅니다.
     그래서 4명까지입니다. 다섯이 넘으면 폰이 못 버팁니다.

   🔴 왜 이 방식인가
     · 서버를 안 거치니 회사 비용이 0 입니다
     · WebRTC 가 원래 암호화되어 있어 서버도 못 듣습니다
     SFU(서버가 나눠주는 방식)를 쓰면 둘 다 잃습니다.
     "네 명이 통화하는데 서버도 못 듣는다" — 이걸 하는 곳이 없습니다.

   🔴 누가 offer 를 보내는가 — 여기가 핵심입니다
     둘이 서로에게 동시에 offer 를 보내면 충돌합니다(glare).
     그래서 규칙을 하나 둡니다.
       side_id 가 작은 쪽이 offer 를 보낸다
     양쪽이 같은 규칙을 보고 판단하므로 절대 안 겹칩니다.

   ⚠ 1:1 통화(alias_call.js)와 따로 둡니다.
     한 파일에 섞으면 어느 쪽이 도는지 알기 어렵습니다.

   ⚠ 함정 ⑲ — 고치면 부르는 화면의 ?v= 도 함께 올리세요.
   ===================================================================== */

window.AL = window.AL || {};

AL.gcall = {
  callId: null,
  token: null,
  linkId: null,
  mySideId: null,
  type: 'voice',
  local: null,
  channel: null,
  peers: {},          // side_id → { pc, stream, pending: [] }
  names: {},          // side_id → 이름
  onChange: null,     // 화면이 상태를 받아보는 통로
  poll: null,
  bytes: 0,
  byteTimer: null,
};

function say(){
  if (AL.gcall.onChange) AL.gcall.onChange(AL.gcall);
}

/* 신호를 주고받는 채널. 통화 하나에 하나입니다. */
async function openChannel(token, onMsg){
  await AL.syncRealtimeAuth();
  var ch = AL.sb.channel('gcall-' + token, { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'sig' }, function(e){ onMsg(e.payload || {}); });

  // ⚠ 구독이 끝나기를 기다립니다. 먼저 보내면 유실됩니다.
  await new Promise(function(resolve){
    var settled = false;
    var done = function(){ if (!settled) { settled = true; resolve(); } };
    ch.subscribe(function(st){
      if (st === 'SUBSCRIBED') done();
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') done();
    });
    setTimeout(done, 4000);
  });
  return ch;
}

/* 특정 사람에게만 보냅니다. to 를 보고 나머지는 무시합니다. */
function sendTo(to, kind, data){
  if (!AL.gcall.channel) return;
  AL.gcall.channel.send({
    type: 'broadcast', event: 'sig',
    payload: Object.assign({ kind: kind, from: AL.gcall.mySideId, to: to }, data),
  });
}

/* 🔴 누가 offer 를 보내는가.
   side_id 가 작은 쪽이 보냅니다. 양쪽이 같은 규칙을 보므로 절대 안 겹칩니다. */
function iOffer(peerSideId){
  return String(AL.gcall.mySideId) < String(peerSideId);
}

/* 한 사람과의 연결을 만듭니다. */
async function makePeer(peerSideId, iceServers){
  if (AL.gcall.peers[peerSideId]) return AL.gcall.peers[peerSideId];

  var pc = new RTCPeerConnection({ iceServers: iceServers });
  var slot = { pc: pc, stream: null, pending: [] };
  AL.gcall.peers[peerSideId] = slot;

  // 내 소리를 이 연결에도 실어 보냅니다.
  if (AL.gcall.local) {
    AL.gcall.local.getTracks().forEach(function(t){
      pc.addTrack(t, AL.gcall.local);
    });
  }

  pc.onicecandidate = function(e){
    if (e.candidate) sendTo(peerSideId, 'ice', { candidate: e.candidate });
  };

  pc.ontrack = function(e){
    slot.stream = e.streams[0];
    say();
  };

  pc.onconnectionstatechange = function(){
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      dropPeer(peerSideId);
    }
    say();
  };

  return slot;
}

function dropPeer(sideId){
  var slot = AL.gcall.peers[sideId];
  if (!slot) return;
  try {
    slot.pc.onicecandidate = null;
    slot.pc.ontrack = null;
    slot.pc.onconnectionstatechange = null;
    slot.pc.close();
  } catch (e) {}
  delete AL.gcall.peers[sideId];
  say();
}

/* 이 사람과 잇습니다. 내가 offer 를 낼 차례면 냅니다. */
async function connectTo(peerSideId, iceServers){
  var slot = await makePeer(peerSideId, iceServers);
  if (!iOffer(peerSideId)) {
    // 상대가 걸어올 차례입니다. 내가 왔다고만 알립니다.
    sendTo(peerSideId, 'here', {});
    return;
  }
  var offer = await slot.pc.createOffer();
  if (AL.dataPrefs && AL.dataPrefs.low_bitrate) offer.sdp = lowerRate(offer.sdp);
  await slot.pc.setLocalDescription(offer);
  sendTo(peerSideId, 'offer', { sdp: offer });
}

function lowerRate(sdp){
  try {
    return sdp.replace(/a=fmtp:(\d+) ([^\r\n]*)/g, function(m, pt, params){
      if (params.indexOf('maxaveragebitrate') >= 0) return m;
      return 'a=fmtp:' + pt + ' ' + params + ';maxaveragebitrate=16000;maxplaybackrate=16000';
    });
  } catch (e) { return sdp; }
}

/* 담아둔 ICE 후보를 넣습니다.
   ⚠ setRemoteDescription 보다 먼저 온 것은 그냥 넣으면 버려집니다. */
async function drain(slot){
  var list = slot.pending;
  slot.pending = [];
  for (var i = 0; i < list.length; i++) {
    try { await slot.pc.addIceCandidate(list[i]); } catch (e) {}
  }
}

async function handle(m, iceServers){
  if (!m || !m.kind || !m.from) return;
  if (m.to && m.to !== AL.gcall.mySideId) return;   // 나에게 온 것만

  var from = m.from;

  if (m.kind === 'here') {
    // 새로 들어온 사람. 내가 offer 를 낼 차례면 냅니다.
    if (iOffer(from)) await connectTo(from, iceServers);
    else await makePeer(from, iceServers);

  } else if (m.kind === 'offer') {
    var slot = await makePeer(from, iceServers);
    if (slot.pc.remoteDescription && slot.pc.remoteDescription.type) return;
    await slot.pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
    await drain(slot);
    var ans = await slot.pc.createAnswer();
    await slot.pc.setLocalDescription(ans);
    sendTo(from, 'answer', { sdp: ans });

  } else if (m.kind === 'answer') {
    var s2 = AL.gcall.peers[from];
    if (!s2) return;
    if (s2.pc.remoteDescription && s2.pc.remoteDescription.type) return;
    await s2.pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
    await drain(s2);

  } else if (m.kind === 'ice') {
    var s3 = AL.gcall.peers[from];
    if (!s3) return;
    if (!s3.pc.remoteDescription || !s3.pc.remoteDescription.type) {
      s3.pending.push(m.candidate);
      return;
    }
    try { await s3.pc.addIceCandidate(m.candidate); } catch (e) {}

  } else if (m.kind === 'bye') {
    dropPeer(from);
  }
}


/* ── 통화에 들어가기 ─────────────────────────────────────────────────
   도는 통화가 있으면 거기 들어가고, 없으면 새로 시작합니다.
   1:1 처럼 "걸고 받는" 것이 아니라 "방에 들어가는" 것입니다.
------------------------------------------------------------------- */
AL.joinGroupCall = async function(opts){
  AL.gcall.linkId = opts.linkId;
  AL.gcall.mySideId = opts.sideId;
  AL.gcall.type = opts.type || 'voice';
  AL.gcall.onChange = opts.onChange || null;
  AL.gcall.peers = {};
  AL.gcall.bytes = 0;

  console.log('[gcall] 1. 마이크 여는 중');
  // 마이크
  try {
    AL.gcall.local = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,      // ⚠ 안 켜면 하울링이 납니다
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: AL.gcall.type === 'video',
    });
  } catch (e) {
    throw new Error('no_media');
  }
  say();

  // 통화 자리를 잡습니다
  var res = await AL.sb.rpc('join_call', {
    p_link_id: opts.linkId, p_type: AL.gcall.type,
  });
  // ⚠ 오류를 그대로 올려보냅니다. 뭉뚱그리면 원인을 못 찾습니다.
  if (res.error) {
    console.error('[gcall] join_call 실패', res.error);
    throw new Error(res.error.message || res.error.code || 'join_call');
  }
  var row = (res.data || [])[0];
  if (!row) throw new Error('join_call 이 빈 결과를 줬습니다');
  console.log('[gcall] 2. 통화 자리', row.call_id, row.is_new ? '(새로 시작)' : '(들어감)');

  AL.gcall.callId = row.call_id;
  AL.gcall.token = row.session_token;

  /* 🔴 2026-09-09 신설 — 방 사람들에게 알립니다.
     ⚠ 내가 통화를 새로 시작했을 때만 보냅니다(row.is_new).
       나중에 들어오는 사람마다 보내면 알림이 쏟아집니다.
     ⚠ 1:1 처럼 전화벨을 울리지 않습니다. 여럿이 하는 통화는
       "받는 사람" 이 정해져 있지 않아, 아무도 안 끊으면 벨이
       영영 울립니다. 그래서 조용한 알림 한 번으로 알리고 맙니다.
     ⚠ 기다리지 않습니다. 알림이 실패해도 통화는 그대로 시작됩니다. */
  if (row.is_new) {
    try {
      AL.callFn('alias-push-call', {
        linkId: opts.linkId,
        group: true,
        callType: AL.gcall.type,
      }).catch(function(){ /* 못 보내도 통화는 됩니다 */ });
    } catch (e) {}
  }

  console.log('[gcall] 3. ICE 받는 중');
  var ice = await AL.getIceServers();
  console.log('[gcall] 4. ICE 받음', (ice || []).length + '개');

  console.log('[gcall] 5. 채널 붙는 중');
  AL.gcall.channel = await openChannel(row.session_token, function(m){
    handle(m, ice).catch(function(e){ console.warn('[gcall]', e); });
  });

  console.log('[gcall] 6. 채널 붙음');

  // 이미 있는 사람들과 각각 잇습니다.
  await refreshPeople(ice);
  console.log('[gcall] 7. 사람들과 이음');

  // 내가 왔다고 모두에게 알립니다.
  sendTo(null, 'here', {});

  // 누가 들고 나는지 살핍니다.
  AL.gcall.poll = setInterval(function(){
    refreshPeople(ice).catch(function(){});
  }, 4000);

  startBytes();
  say();
  console.log('[gcall] 8. 끝. 준비됐습니다');
  return row;
};

/* 지금 통화에 있는 사람들을 확인하고, 새로 온 사람과 잇습니다. */
async function refreshPeople(ice){
  var res = await AL.sb.rpc('call_people', { p_call_id: AL.gcall.callId });
  var rows = res.data || [];
  var live = {};

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    AL.gcall.names[r.side_id] = r.display_name || '';
    if (r.is_me) continue;
    live[r.side_id] = 1;
    if (!AL.gcall.peers[r.side_id]) {
      await connectTo(r.side_id, ice);
    }
  }

  // 나간 사람은 정리합니다.
  Object.keys(AL.gcall.peers).forEach(function(sid){
    if (!live[sid]) dropPeer(sid);
  });
  say();
}

/* 이번 통화가 쓴 데이터. 사람 수만큼 늘어납니다. */
function startBytes(){
  if (AL.gcall.byteTimer) clearInterval(AL.gcall.byteTimer);
  AL.gcall.byteTimer = setInterval(async function(){
    var total = 0;
    var ids = Object.keys(AL.gcall.peers);
    for (var i = 0; i < ids.length; i++) {
      try {
        var stats = await AL.gcall.peers[ids[i]].pc.getStats();
        stats.forEach(function(r){
          if (r.type === 'transport') total += (r.bytesSent || 0) + (r.bytesReceived || 0);
        });
      } catch (e) {}
    }
    if (total > 0) { AL.gcall.bytes = total; say(); }
  }, 3000);
}

/* ── 통화에서 나가기 ─────────────────────────────────────────────── */
AL.leaveGroupCall = async function(){
  sendTo(null, 'bye', {});

  if (AL.gcall.callId) {
    try {
      await AL.sb.rpc('leave_call', { p_call_id: AL.gcall.callId });
      // 내가 쓴 데이터를 남깁니다.
      if (AL.gcall.bytes) {
        await AL.sb.from('calls')
          .update({ data_bytes: AL.gcall.bytes }).eq('id', AL.gcall.callId);
      }
    } catch (e) { console.warn('[gcall] 기록 저장 실패', e); }
  }
  AL.gcallCleanup();
};

AL.gcallCleanup = function(){
  if (AL.gcall.poll) { clearInterval(AL.gcall.poll); AL.gcall.poll = null; }
  if (AL.gcall.byteTimer) { clearInterval(AL.gcall.byteTimer); AL.gcall.byteTimer = null; }
  Object.keys(AL.gcall.peers).forEach(dropPeer);
  if (AL.gcall.local) {
    AL.gcall.local.getTracks().forEach(function(t){ try { t.stop(); } catch (e) {} });
    AL.gcall.local = null;
  }
  if (AL.gcall.channel) {
    try { AL.sb.removeChannel(AL.gcall.channel); } catch (e) {}
    AL.gcall.channel = null;
  }
  AL.gcall.callId = null;
  AL.gcall.token = null;
  AL.gcall.bytes = 0;
  AL.gcall.onChange = null;
};

/* 소리 끄기 */
AL.gcallMute = function(){
  if (!AL.gcall.local) return false;
  var muted = false;
  AL.gcall.local.getAudioTracks().forEach(function(t){
    t.enabled = !t.enabled;
    muted = !t.enabled;
  });
  return muted;
};

/* 이 방에 도는 통화가 있나 — 대화 화면이 씁니다. */
AL.liveCall = async function(linkId){
  try {
    var res = await AL.sb.rpc('live_call', { p_link_id: linkId });
    return (res.data || [])[0] || null;
  } catch (e) { return null; }
};

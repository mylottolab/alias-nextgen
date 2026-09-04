/* =====================================================================
   Alias Next-Gen — 공용
   2026-09-03

   ⚠ 함정 ⑧ — 화면마다 supabase-js 클라이언트를 새로 만들지 마세요.
     여기서 한 번만 만듭니다. 화면에서는 AL.sb 를 쓰세요.

   ⚠ 함정 ⑲ — 이 파일을 고치면 이걸 부르는 화면들의 ?v= 도 함께 올려야 합니다.
     Ctrl+Shift+R 로도 안 바뀝니다. 지금 부르는 화면:
       alias_auth.html · alias_contacts.html · alias_link.html
       alias_calls.html · alias_me.html
       alias_invite.html · alias_join.html
     일곱 장입니다. 하나라도 빠뜨리면 그 화면만 옛 파일을 씁니다.
   ===================================================================== */

window.AL = window.AL || {};

/* ── 접속 ─────────────────────────────────────────────────────────
   ⚠ 함정 ㉑ — sb_publishable 말고 eyJ 로 시작하는 legacy anon 열쇠입니다.
------------------------------------------------------------------ */
AL.SUPABASE_URL  = 'https://azredlrnvsssfjytaotb.supabase.co';
AL.SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6cmVkbHJudnNzc2ZqeXRhb3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MDg1MjgsImV4cCI6MjEwMzk4NDUyOH0.2gTxzr54vRSZzFnyhLSd1Imv3OnwRBQs925CYeXdonI';  // eyJ 로 시작하는 열쇠

/* ⚠ 열쇠를 안 넣으면 Supabase 가 헤더에 실을 때 터집니다. 한글이 섞이면
     "String contains non ISO-8859-1 code point" 라는 엉뚱한 말이 나와서
     원인을 찾기 어렵습니다. 여기서 미리 잡아 사람 말로 알려줍니다. */
AL.keyProblem = null;
if (!AL.SUPABASE_ANON || AL.SUPABASE_ANON.indexOf('PASTE_') === 0) {
  AL.keyProblem = 'alias_common.js 의 AL.SUPABASE_ANON 이 비어 있습니다.\nSupabase → Settings → API Keys 에서 anon 열쇠를 넣으세요.';
} else if (!/^[\x20-\x7E]+$/.test(AL.SUPABASE_ANON)) {
  AL.keyProblem = 'alias_common.js 의 AL.SUPABASE_ANON 에 영문·숫자가 아닌 글자가 있습니다.\neyJ 로 시작하는 열쇠인지 확인하세요.';
}

AL.sb = window.supabase.createClient(
  AL.SUPABASE_URL,
  AL.keyProblem ? 'placeholder' : AL.SUPABASE_ANON
);


/* ── 문구 ─────────────────────────────────────────────────────────
   ⚠ 함정 ⑱ — 한쪽 사전에만 넣으면 undefined 가 되어 빈 글자가 됩니다.
     t() 는 문구가 없으면 [[열쇠이름]] 을 그대로 보여줍니다.
     화면에 대괄호가 보이면 여기에 빠진 것입니다.
------------------------------------------------------------------ */
AL.STR = {
  /* 공통 */
  appName:    { kr:'Alias', en:'Alias' },
  copy:       { kr:'복사', en:'Copy' },
  copied:     { kr:'복사했습니다', en:'Copied' },
  signOut:    { kr:'로그아웃', en:'Sign out' },
  errGeneric: { kr:'문제가 생겼습니다: {msg}', en:'Something went wrong: {msg}' },
  errNoRows:  { kr:'저장이 반영되지 않았습니다. 권한 문제일 수 있습니다.',
                en:'Nothing was saved. This may be a permissions problem.' },

  /* 하단 탭 */
  navContacts: { kr:'연락처', en:'Contacts' },
  navCalls:    { kr:'통화기록', en:'Calls' },
  navMe:       { kr:'나', en:'You' },

  /* 더하기 시트 */
  addInvite:   { kr:'초대 보내기', en:'Send an invite' },
  addInviteSub:{ kr:'코드를 만들어 상대에게 건넵니다', en:'Create a code and hand it over' },
  addJoin:     { kr:'초대 받기', en:'Accept an invite' },
  addJoinSub:  { kr:'받은 코드를 넣습니다', en:'Enter a code you received' },

  /* 통화기록 */
  callsTitle:  { kr:'통화기록', en:'Calls' },
  callsEmpty:  { kr:'아직 통화가 없습니다.\n통화 기능은 다음 단계에서 붙습니다.',
                 en:'No calls yet.\nCalling arrives in the next step.' },
  /* 나 */
  meTitle:     { kr:'나', en:'You' },
  meAliases:   { kr:'내 별칭', en:'Your aliases' },
  meAccount:   { kr:'계정', en:'Account' },
  meAccountId: { kr:'계정 번호', en:'Account ID' },

  /* 대화 */
  chatPlace:   { kr:'메시지 입력', en:'Message' },
  chatMyFace:  { kr:'나는 {face}', en:'You are {face}' },
  chatEmpty:   { kr:'첫 메시지를 보내보세요.', en:'Send the first message.' },
  chatRead:    { kr:'읽음', en:'Read' },
  chatTyping:  { kr:'입력 중…', en:'Typing…' },
  chatToday:   { kr:'오늘', en:'Today' },
  chatYesterday:{ kr:'어제', en:'Yesterday' },
  chatDeleted: { kr:'삭제된 메시지', en:'Message deleted' },
  chatClosed:  { kr:'끊긴 연결입니다. 메시지를 보낼 수 없습니다.',
                 en:'This connection was ended. You cannot send messages.' },
  chatFailed:  { kr:'보내지 못했습니다: {msg}', en:'Could not send: {msg}' },
  chatCallSoon:{ kr:'통화는 다음 단계에서 붙습니다.', en:'Calling comes in the next step.' },

  /* 관계 상세 */
  dtlBack:     { kr:'연락처로', en:'Back to contacts' },
  dtlNotFound: { kr:'그런 연결이 없습니다.', en:'No such connection.' },
  dtlCall:     { kr:'통화', en:'Call' },
  dtlMessage:  { kr:'메시지', en:'Message' },
  dtlSoon:     { kr:'다음 단계에서 붙습니다.', en:'Coming in the next step.' },
  dtlPeerAlias:{ kr:'상대가 쓰는 이름', en:'The name they use' },
  dtlMyFace:   { kr:'내가 보여주는 별칭', en:'The alias they see' },
  dtlLinkedAt: { kr:'연결한 때', en:'Connected' },
  dtlMemo:     { kr:'초대 메모', en:'Invite note' },
  dtlChange:   { kr:'바꾸기', en:'Change' },
  dtlPinOn:    { kr:'위로 올리기', en:'Pin to top' },
  dtlPinOff:   { kr:'내리기', en:'Unpin' },
  dtlMuteOn:   { kr:'알림 끄기', en:'Mute' },
  dtlMuteOff:  { kr:'알림 켜기', en:'Unmute' },
  dtlNotify:   { kr:'알림', en:'Notifications' },
  dtlCut:      { kr:'이 연결 끊기', en:'Disconnect' },
  dtlCutAsk:   { kr:'연결을 끊으면 서로 연락할 수 없게 됩니다.\n다시 이으려면 초대를 새로 주고받아야 합니다.\n끊을까요?',
                 en:'Disconnecting means neither of you can reach the other.\nReconnecting needs a new invite.\nDisconnect?' },
  dtlFaceDone: { kr:'바꿨습니다. 상대 화면에도 반영됩니다.',
                 en:'Changed. Their screen is updated too.' },
  dtlFaceAsk:  { kr:'바꾸면 상대 화면에서 내 이름이 바로 바뀝니다.\n어떤 별칭으로 바꿀까요?',
                 en:'Their screen updates immediately.\nWhich alias should they see?' },

  /* 로그인 (alias_auth.html) */
  tagline:   { kr:'번호가 없는 전화입니다.\n초대를 받은 사람만 연결됩니다.',
               en:'A phone without numbers.\nOnly people you invite can reach you.' },
  nickLabel: { kr:'닉네임', en:'Nickname' },
  nickHint:  { kr:'2~20자. 영문 소문자, 숫자, 한글, - _ 만 씁니다.\n상대에게는 보이지 않습니다.',
               en:'2-20 characters. Lowercase letters, numbers, Korean, - and _ only.\nNobody else sees this.' },
  pwLabel:   { kr:'비밀번호', en:'Password' },
  pwHint:    { kr:'8자 이상', en:'At least 8 characters' },
  goBtn:     { kr:'시작하기', en:'Continue' },
  firstTime: { kr:'처음 쓰는 닉네임이면 계정이 새로 만들어집니다.',
               en:'A new nickname creates a new account.' },
  madeTitle: { kr:'계정이 만들어졌습니다', en:'Your account is ready' },
  madeSub:   { kr:'아래 복구 코드를 지금 적어두세요.\n이 화면을 벗어나면 다시 볼 수 없습니다.',
               en:'Write down the recovery code below.\nYou cannot see it again after leaving this screen.' },
  codeCap:   { kr:'복구 코드', en:'Recovery code' },
  warn1:     { kr:'비밀번호를 잊으면 이 코드로만 되찾을 수 있습니다.',
               en:'This code is the only way to recover a forgotten password.' },
  warn2:     { kr:'저희는 이 코드를 다시 보여드릴 수 없습니다.',
               en:'We cannot show you this code again.' },
  warn3:     { kr:'이 코드를 잃으면 연락처가 모두 사라집니다.',
               en:'If you lose it, all your contacts are gone.' },
  ackText:   { kr:'적어뒀습니다. 다시 볼 수 없다는 것을 이해합니다.',
               en:'I wrote it down. I understand it cannot be shown again.' },
  contBtn:   { kr:'계속', en:'Continue' },
  errNickShort:{ kr:'닉네임은 2자 이상이어야 합니다.', en:'Nickname must be at least 2 characters.' },
  errNickLong: { kr:'닉네임은 20자를 넘을 수 없습니다.', en:'Nickname cannot exceed 20 characters.' },
  errNickChar: { kr:'쓸 수 없는 글자가 있습니다: {bad}\n영문 소문자, 숫자, 한글, - _ 만 씁니다.',
                 en:'These characters cannot be used: {bad}\nOnly lowercase letters, numbers, Korean, - and _.' },
  errPwShort:  { kr:'비밀번호는 8자 이상이어야 합니다.', en:'Password must be at least 8 characters.' },
  errWrongPw:  { kr:'이미 쓰이는 닉네임인데 비밀번호가 맞지 않습니다.',
                 en:'That nickname is taken and the password does not match.' },
  errNoSession:{ kr:'계정은 만들어졌는데 로그인이 안 됐습니다.\nAuthentication → Email → Confirm email 이 꺼져 있는지 확인하세요.',
                 en:'The account was created but sign-in did not complete.\nCheck that Confirm email is turned off.' },
  errSaveCode: { kr:'복구 코드를 저장하지 못했습니다. 계속하지 마시고 알려주세요.',
                 en:'Could not save the recovery code. Please stop and report this.' },

  /* 별칭 (alias_me.html) */
  aliasIntro:   { kr:'상대마다 다른 별칭을 보여줄 수 있습니다.\n거래처에는 하나, 소개팅에는 다른 하나.',
                  en:'You can show a different alias to each person.\nOne for work, another for someone new.' },
  aliasEmpty:   { kr:'아직 별칭이 없습니다.\n하나 만들어야 초대를 보낼 수 있습니다.',
                  en:'No aliases yet.\nYou need one before you can send an invite.' },
  aliasNew:     { kr:'별칭 만들기', en:'Create alias' },
  aliasNameLbl: { kr:'상대에게 보일 이름', en:'Name others will see' },
  aliasNameHint:{ kr:'1~20자. 아무 글자나 됩니다.', en:'1-20 characters. Any characters.' },
  aliasDefault: { kr:'기본 별칭', en:'Default' },
  aliasMakeDef: { kr:'기본으로 지정', en:'Make default' },
  pkTitle:     { kr:'별칭 고르기', en:'Choose an alias' },
  pkNew:       { kr:'+ 새 별칭 만들기', en:'+ Create a new alias' },
  pkNewLabel:  { kr:'상대에게 보일 이름', en:'Name they will see' },
  pkNewGo:     { kr:'만들고 고르기', en:'Create and use' },
  pkCurrent:   { kr:'지금 쓰는 것', en:'in use' },
  aliasUseForInvite:{ kr:'이 별칭으로 초대 만들기', en:'Invite someone as this' },
  aliasCreated: { kr:'별칭을 만들었습니다.', en:'Alias created.' },
  errAliasName: { kr:'이름을 1~20자로 넣어주세요.', en:'Enter a name of 1-20 characters.' },
  errAliasDup:  { kr:'같은 이름의 별칭이 이미 있습니다.', en:'You already have an alias with that name.' },

  /* 초대 보내기 (alias_invite.html) */
  invTitle:    { kr:'초대 보내기', en:'Send invite' },
  invIntro:    { kr:'초대를 받은 사람만 나에게 연락할 수 있습니다.\n번호를 알려주는 것과 다릅니다. 이 초대 하나로 한 사람만 이어집니다.',
                 en:'Only someone with an invite can reach you.\nUnlike a phone number, one invite connects one person.' },
  invFaceLbl:  { kr:'어떤 별칭으로 만날까요', en:'Which alias will they see' },
  invMemoLbl:  { kr:'내 메모 (상대는 못 봅니다)', en:'Your note (they cannot see this)' },
  invMemoHint: { kr:'"전시회에서 만난 사람" 처럼 적어두면\n나중에 연락처에서 알아보기 쉽습니다.',
                 en:'Something like "met at the expo" makes it easier\nto recognise them in your contacts later.' },
  invUsesLbl:  { kr:'몇 명까지 쓸 수 있나요', en:'How many people can use it' },
  invUses1:    { kr:'한 사람 (기본)', en:'One person (default)' },
  invUses10:   { kr:'열 사람까지', en:'Up to ten' },
  invUses50:   { kr:'쉰 사람까지 (명함용)', en:'Up to fifty (for business cards)' },
  invExpLbl:   { kr:'언제까지 쓸 수 있나요', en:'How long is it valid' },
  invExp1d:    { kr:'하루', en:'One day' },
  invExp7d:    { kr:'일주일', en:'One week' },
  invExp30d:   { kr:'한 달', en:'One month' },
  invExpNever: { kr:'기한 없음', en:'No expiry' },
  invMake:     { kr:'초대 만들기', en:'Create invite' },
  invWillSee:  { kr:'이 초대를 쓰면 상대는 나를 "{face}" 로 봅니다.',
                 en:'Whoever uses this invite will see you as "{face}".' },
  invMadeTtl:  { kr:'초대를 만들었습니다', en:'Invite created' },
  invCodeCap:  { kr:'초대 코드', en:'Invite code' },
  invLinkCap:  { kr:'또는 이 주소를 보내세요', en:'Or send this link' },
  invCopyLink: { kr:'주소 복사', en:'Copy link' },
  invMineTtl:  { kr:'내가 만든 초대', en:'Invites you made' },
  invMineNone: { kr:'아직 만든 초대가 없습니다.', en:'You have not made any invites yet.' },
  invUsedOf:   { kr:'{used} / {max} 명이 씀', en:'{used} of {max} used' },
  invExpiredAt:{ kr:'{when} 까지', en:'until {when}' },
  invNoExpiry: { kr:'기한 없음', en:'no expiry' },
  invRevoke:   { kr:'취소', en:'Revoke' },
  invRevoked:  { kr:'취소됨', en:'Revoked' },
  invRevokeAsk:{ kr:'이 초대를 취소하면 아직 안 쓴 사람은 연결할 수 없습니다. 취소할까요?',
                 en:'Revoking means anyone who has not used it yet cannot connect. Revoke?' },
  errNoAlias:  { kr:'별칭을 먼저 하나 만들어주세요.', en:'Create an alias first.' },

  /* 초대 받기 (alias_join.html) */
  joinTitle:  { kr:'초대 받기', en:'Accept invite' },
  joinIntro:  { kr:'받으신 초대 코드를 넣어주세요.', en:'Enter the invite code you received.' },
  joinCodeLbl:{ kr:'초대 코드', en:'Invite code' },
  joinFaceLbl:{ kr:'상대에게 보여줄 내 별칭', en:'The alias they will see' },
  joinLabelLbl:{ kr:'이 사람을 뭐라고 부를까요 (나만 봅니다)',
                 en:'What will you call them (only you see this)' },
  joinLabelHint:{ kr:'비워두셔도 됩니다. 나중에 바꿀 수 있습니다.',
                  en:'You can leave this blank and change it later.' },
  joinBtn:    { kr:'연결하기', en:'Connect' },
  joinOkTtl:  { kr:'연결됐습니다', en:'Connected' },
  joinOkSub:  { kr:'이제 연락처에서 보입니다.', en:'They now appear in your contacts.' },
  joinGoList: { kr:'연락처 보기', en:'View contacts' },
  errJoinCode:    { kr:'초대 코드를 넣어주세요.', en:'Enter the invite code.' },
  errNotFound:    { kr:'그런 초대가 없습니다. 코드를 다시 확인해주세요.',
                    en:'No such invite. Please check the code.' },
  errRevoked:     { kr:'취소된 초대입니다.', en:'This invite was revoked.' },
  errExpired:     { kr:'기한이 지난 초대입니다.', en:'This invite has expired.' },
  errUsedUp:      { kr:'이미 다 쓰인 초대입니다.', en:'This invite has been fully used.' },
  errAlreadyUsed: { kr:'이 초대로는 이미 연결되어 있습니다.\n연락처에서 확인해보세요.',
                    en:'You are already connected through this invite.\nCheck your contacts.' },
  errOwnInvite:   { kr:'자기가 만든 초대는 쓸 수 없습니다.', en:'You cannot use your own invite.' },
  errBadPersona:  { kr:'별칭을 고르지 않았습니다.', en:'No alias selected.' },
  errNotLoggedIn: { kr:'로그인이 필요합니다.', en:'You need to sign in.' },

  /* 연락처 (alias_contacts.html) */
  cntTitle:   { kr:'연락처', en:'Contacts' },
  cntEmpty:   { kr:'아직 연결된 사람이 없습니다.\n초대를 보내거나 받아보세요.',
                en:'Nobody is connected yet.\nSend or accept an invite.' },
  cntUnnamed: { kr:'(이름 없음)', en:'(no name)' },
  cntRenameAsk:{ kr:'이 사람을 뭐라고 부를까요?', en:'What will you call them?' },
  cntSearch:   { kr:'이름으로 찾기', en:'Search by name' },
  cntGroup:    { kr:'별칭별', en:'By alias' },
  cntNoMatch:  { kr:'찾는 이름이 없습니다.', en:'No matching name.' },
  cntCount:    { kr:'{n}명', en:'{n}' },
  cntOpenDetail:{ kr:'관계 상세', en:'Relationship details' },
  cntSamePeer:{ kr:'같은 상대와 여러 번 이어졌습니다. 연결한 시각으로 구별하세요.',
                en:'You are connected to the same person more than once. Tell them apart by the time.' },
  cntCapMine: { kr:'내가 붙인 이름 · 나만 봅니다', en:'Your name for them · only you see this' },
  cntCapTheir:{ kr:'상대가 쓰는 별칭', en:'The alias they use' },
  cntLegend:  { kr:'이름이 셋인 이유\n· 큰 글씨 — 내가 상대를 부르는 이름. 상대는 못 봅니다.\n· 상대 별칭 — 상대가 나에게 보여주는 이름.\n· 내 별칭 — 내가 상대에게 보여주는 이름.',
                en:'Why three names\n· Large — what you call them. They never see it.\n· Their alias — the name they show you.\n· Your alias — the name they see for you.' },
  cntLegendOpen:{ kr:'이름이 왜 셋인가요?', en:'Why three names?' },
};

AL.lang = (navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'kr' : 'en';

AL.t = function(key, vars){
  var row = AL.STR[key];
  if (!row || !row[AL.lang]) return '[[' + key + ']]';
  var s = row[AL.lang];
  if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
};

AL.paintText = function(root){
  (root || document).querySelectorAll('[data-t]').forEach(function(el){
    el.textContent = AL.t(el.getAttribute('data-t'));
  });
};


/* ── 로그인 ──────────────────────────────────────────────────────── */

/* 닉네임 → 가짜 이메일.
   ⚠ Aliascall과 다릅니다. Aliascall은 못 쓰는 글자를 조용히 지웁니다.
     그러면 "김철수"와 "김.철.수"가 같은 계정이 됩니다. 여기서는 거부합니다. */
AL.NICK_OK = /^[a-z0-9가-힣_-]+$/;

AL.checkNick = function(raw){
  var n = (raw || '').trim().toLowerCase();
  if (n.length < 2)  return { ok:false, msg:AL.t('errNickShort') };
  if (n.length > 20) return { ok:false, msg:AL.t('errNickLong') };
  if (!AL.NICK_OK.test(n)) {
    var seen = {}, bad = [];
    n.split('').forEach(function(c){
      if (!AL.NICK_OK.test(c) && !seen[c]) { seen[c] = 1; bad.push(c); }
    });
    return { ok:false, msg:AL.t('errNickChar', { bad: bad.join(' ') }) };
  }
  return { ok:true, nick:n };
};

AL.nicknameToEmail = function(nick){
  return encodeURIComponent(nick) + '@u.alias.internal';
};

/* 로그인했는지 확인. 안 했으면 로그인 화면으로 보냅니다. */
AL.requireLogin = async function(){
  if (AL.keyProblem) { alert(AL.keyProblem); return null; }
  var res = await AL.sb.auth.getSession();
  if (!res.data.session) {
    location.href = 'alias_auth.html';
    return null;
  }
  return res.data.session.user;
};

AL.signOut = async function(){
  await AL.sb.auth.signOut();
  location.href = 'alias_auth.html';
};


/* ── 복구 코드 ────────────────────────────────────────────────────
   헷갈리는 글자(0 O 1 I L)를 뺀 31글자에서 16자. 31^16 ≈ 2^79.
------------------------------------------------------------------ */
AL.CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

AL.makeRecoveryCode = function(){
  var buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  var out = '';
  for (var i = 0; i < 16; i++) {
    out += AL.CODE_ALPHABET[buf[i] % AL.CODE_ALPHABET.length];
    if (i % 4 === 3 && i !== 15) out += '-';
  }
  return out;
};

AL.hashRecoveryCode = async function(code){
  var flat = code.replace(/-/g, '').toUpperCase();
  var bytes = new TextEncoder().encode('alias-recovery-v1:' + flat);
  var digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(function(b){ return b.toString(16).padStart(2, '0'); }).join('');
};


/* ── 별칭 ────────────────────────────────────────────────────────── */
/* 별칭 하나 만들기. 첫 별칭은 자동으로 기본이 됩니다.
   ⚠ 나 화면과 고르개 두 곳에서 씁니다. 규칙이 갈리면 안 되니 여기 한 번만 둡니다. */
AL.createAlias = async function(name, existing){
  var n = (name || '').trim();
  if (n.length < 1 || n.length > 20) throw new Error(AL.t('errAliasName'));
  var have = existing || await AL.loadAliases();
  if (have.some(function(a){ return a.display_name === n; })) throw new Error(AL.t('errAliasDup'));

  var sess = await AL.sb.auth.getSession();
  var uid = sess.data.session ? sess.data.session.user.id : null;
  if (!uid) throw new Error(AL.t('errNotLoggedIn'));

  var res = await AL.sb.from('personas')
    .insert({ account_id: uid, display_name: n, is_default: have.length === 0 })
    .select('id, display_name, is_default').single();
  if (res.error) throw res.error;
  return res.data;
};

AL.loadAliases = async function(){
  var res = await AL.sb.from('personas')
    .select('id, display_name, is_default, created_at')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (res.error) throw res.error;
  return res.data || [];
};


/* ── 잔손 ────────────────────────────────────────────────────────── */
AL.esc = function(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};

AL.fmtDate = function(iso){
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString(AL.lang === 'kr' ? 'ko-KR' : 'en-US',
    { year:'numeric', month:'numeric', day:'numeric' });
};

/* 연결 시각은 초까지 보여줘야 합니다. 같은 사람과 여러 번 이어지면
   날짜만으로는 세 줄이 똑같아 보입니다. */
AL.fmtDateTime = function(iso){
  if (!iso) return '';
  var d = new Date(iso);
  var p = function(n){ return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + ' ' +
         p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
};

/* 목록에 쓰는 짧은 시각. 오늘이면 시:분, 어제면 "어제", 그 앞은 날짜. */
AL.fmtShort = function(iso){
  if (!iso) return '';
  var d = new Date(iso), now = new Date();
  var p = function(n){ return String(n).padStart(2,'0'); };
  var sameDay = function(a,b){
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  };
  if (sameDay(d, now)) return p(d.getHours()) + ':' + p(d.getMinutes());
  var y = new Date(now); y.setDate(y.getDate()-1);
  if (sameDay(d, y)) return AL.lang === 'kr' ? '어제' : 'Yesterday';
  return (d.getMonth()+1) + '/' + d.getDate();
};

/* 얼굴 동그라미에 넣을 첫 글자 */
AL.initial = function(name){
  return (name || '?').trim().charAt(0) || '?';
};

AL.copyText = async function(text, btn){
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      var was = btn.textContent;
      btn.textContent = AL.t('copied');
      setTimeout(function(){ btn.textContent = was; }, 1600);
    }
    return true;
  } catch (e) { return false; }
};

/* ── 공용 별칭 고르개 ────────────────────────────────────────────────
   어디서나 같은 모양으로 뜹니다. 목록에 없으면 그 자리에서 만들 수 있어
   화면을 떠날 일이 없습니다.

   쓰는 법:
     var picked = await AL.pickAlias({ currentId, currentName, note });
     if (!picked) return;            // 닫음
     picked.id / picked.display_name

   ⚠ 관계 상세 · 초대 보내기 · 초대 받기 · (나중에) 통화 화면이 다 이걸 씁니다.
     여기를 고치면 그 전부가 같이 바뀝니다.
------------------------------------------------------------------- */
AL.pickAlias = function(opts){
  opts = opts || {};
  return new Promise(function(resolve){
    var bg = document.createElement('div');
    bg.className = 'pk-bg';
    var sheet = document.createElement('div');
    sheet.className = 'pk';
    document.body.appendChild(bg);
    document.body.appendChild(sheet);

    var aliases = [];
    var done = false;

    function close(val){
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      bg.remove(); sheet.remove();
      resolve(val || null);
    }
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    function paintList(){
      sheet.innerHTML = '';
      var grip = document.createElement('div'); grip.className = 'grip';
      sheet.appendChild(grip);

      var h = document.createElement('p'); h.className = 'pk-title';
      h.textContent = AL.t('pkTitle'); sheet.appendChild(h);

      if (opts.note) {
        var n = document.createElement('p'); n.className = 'pk-note';
        n.textContent = opts.note; sheet.appendChild(n);
      }

      aliases.forEach(function(a){
        var cur = (opts.currentId && a.id === opts.currentId) ||
                  (!opts.currentId && opts.currentName && a.display_name === opts.currentName);
        var b = document.createElement('button');
        b.className = 'pk-opt' + (cur ? ' cur' : '');
        var nameSpan = document.createElement('span');
        nameSpan.textContent = a.display_name;
        b.appendChild(nameSpan);
        if (cur) {
          var tick = document.createElement('span');
          tick.className = 'pk-tick';
          tick.textContent = AL.t('pkCurrent');
          b.appendChild(tick);
        }
        b.addEventListener('click', function(){ close(a); });
        sheet.appendChild(b);
      });

      var sep = document.createElement('div'); sep.className = 'pk-sep';
      sheet.appendChild(sep);

      var mk = document.createElement('button');
      mk.className = 'pk-new';
      mk.textContent = AL.t('pkNew');
      mk.addEventListener('click', paintForm);
      sheet.appendChild(mk);
    }

    function paintForm(){
      sheet.innerHTML = '';
      var grip = document.createElement('div'); grip.className = 'grip';
      sheet.appendChild(grip);

      var box = document.createElement('div'); box.className = 'pk-form';
      var lab = document.createElement('p'); lab.className = 'pk-title';
      lab.textContent = AL.t('pkNewLabel'); box.appendChild(lab);

      var inp = document.createElement('input');
      inp.type = 'text'; inp.maxLength = 20; inp.autocomplete = 'off';
      box.appendChild(inp);

      var hint = document.createElement('p'); hint.className = 'hint';
      hint.textContent = AL.t('aliasNameHint'); box.appendChild(hint);

      var go = document.createElement('button');
      go.className = 'pk-go'; go.textContent = AL.t('pkNewGo');
      box.appendChild(go);

      var err = null;
      function fail(msg){
        if (!err) { err = document.createElement('div'); err.className = 'pk-err'; box.appendChild(err); }
        err.textContent = msg;
      }
      async function submit(){
        go.disabled = true;
        try {
          var made = await AL.createAlias(inp.value, aliases);
          close(made);
        } catch (e) {
          console.error(e);
          fail(e.message || String(e));
          go.disabled = false;
        }
      }
      go.addEventListener('click', submit);
      inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') submit(); });

      sheet.appendChild(box);
      inp.focus();
    }

    AL.loadAliases().then(function(list){
      aliases = list;
      if (!aliases.length) paintForm();   // 하나도 없으면 바로 만들기부터
      else paintList();
    }).catch(function(e){
      console.error(e);
      close(null);
    });
  });
};

/* 날짜 구분선에 쓰는 표기 */
AL.fmtDaySep = function(iso){
  var d = new Date(iso), now = new Date();
  var same = function(a,b){
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  };
  if (same(d, now)) return AL.t('chatToday');
  var y = new Date(now); y.setDate(y.getDate()-1);
  if (same(d, y)) return AL.t('chatYesterday');
  return d.toLocaleDateString(AL.lang === 'kr' ? 'ko-KR' : 'en-US',
    { year:'numeric', month:'long', day:'numeric', weekday:'short' });
};

/* 말풍선 옆 시각 */
AL.fmtClock = function(iso){
  var d = new Date(iso), p = function(n){ return String(n).padStart(2,'0'); };
  return p(d.getHours()) + ':' + p(d.getMinutes());
};

AL.sameDay = function(a, b){
  var x = new Date(a), y = new Date(b);
  return x.getFullYear()===y.getFullYear() && x.getMonth()===y.getMonth() && x.getDate()===y.getDate();
};

/* Edge Function 부르기 — 토큰을 실어 보냅니다.
   ⚠ 함정 ⑤ · ⑥ — 함수끼리 부를 때도 Authorization 이 필요하고, 토큰은 한 시간쯤이면
     만료됩니다. getSession() 이 알아서 갱신해 주므로 매번 새로 읽습니다. */
AL.callFn = async function(name, body){
  var sess = await AL.sb.auth.getSession();
  var token = sess.data.session ? sess.data.session.access_token : null;
  if (!token) throw new Error(AL.t('errNotLoggedIn'));
  var res = await fetch(AL.SUPABASE_URL + '/functions/v1/' + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'apikey': AL.SUPABASE_ANON,
    },
    body: JSON.stringify(body || {}),
  });
  var out = await res.json().catch(function(){ return {}; });
  if (!res.ok || out.error) {
    // 서버가 함께 보낸 단서를 그대로 보여줍니다. 안 그러면 화면에
    // "not_your_link" 한 마디만 남아서 원인을 못 찾습니다.
    var extra = [];
    ['detail','sidesFound','uidHead','sideHeads'].forEach(function(k){
      if (out[k] !== undefined) extra.push(k + '=' + JSON.stringify(out[k]));
    });
    throw new Error((out.error || ('HTTP ' + res.status)) +
                    (extra.length ? ' (' + extra.join(' · ') + ')' : ''));
  }
  return out;
};

/* 초대 주소. 화면 파일들이 같은 폴더에 있다고 봅니다. */
AL.inviteUrl = function(code){
  var base = location.href.replace(/[^/]*$/, '');
  return base + 'alias_join.html?c=' + encodeURIComponent(code);
};

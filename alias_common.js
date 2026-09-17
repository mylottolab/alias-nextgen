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
   🔴 열쇠는 alias_config.js 에 있습니다. 여기에는 없습니다.
      이 파일을 새로 받으셔도 alias_config.js 는 그대로 두시면 됩니다.
      전에는 여기 있어서, 파일을 바꿀 때마다 열쇠를 다시 넣어야 했습니다.
      그 과정에서 열쇠가 두 줄로 나뉘어 화면이 통째로 비는 일이 세 번 있었습니다.

   ⚠ alias_config.js 가 alias_common.js 보다 먼저 실려야 합니다.
------------------------------------------------------------------ */
if (!window.AL || !AL.SUPABASE_URL) {
  document.addEventListener('DOMContentLoaded', function(){
    document.body.innerHTML =
      '<div style="padding:26px;font-family:system-ui,sans-serif;line-height:1.8;' +
      'color:#DDE5F0;background:#0E1621;min-height:100vh">' +
      '<b style="font-size:17px">alias_config.js 를 못 읽었습니다.</b><br><br>' +
      '이 파일이 alias_common.js 보다 먼저 실려야 합니다.<br>' +
      '저장소에 alias_config.js 가 있는지 확인하세요.</div>';
  });
}

/* 열쇠가 제대로 들어갔는지 봅니다.
   ⚠ 한글이 섞이면 Supabase 가 헤더에 실을 때
     "String contains non ISO-8859-1 code point" 라는 엉뚱한 말이 나옵니다. */
AL.keyProblem = null;
if (!AL.SUPABASE_ANON || AL.SUPABASE_ANON.indexOf('PASTE_') === 0) {
  AL.keyProblem = 'alias_config.js 의 AL.SUPABASE_ANON 이 비어 있습니다.\nSupabase → Settings → API Keys 에서 anon 열쇠를 넣으세요.';
} else if (!/^[\x20-\x7E]+$/.test(AL.SUPABASE_ANON)) {
  AL.keyProblem = 'alias_config.js 의 AL.SUPABASE_ANON 에 영문·숫자가 아닌 글자가 있습니다.\neyJ 로 시작하는 열쇠인지 확인하세요.';
}

AL.sb = window.supabase.createClient(
  AL.SUPABASE_URL || 'https://placeholder.supabase.co',
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
  save:       { kr:'저장', en:'Save' },
  close:      { kr:'닫기', en:'Close' },
  copy:       { kr:'복사', en:'Copy' },
  copied:     { kr:'복사했습니다', en:'Copied' },
  signOut:    { kr:'로그아웃', en:'Sign out' },
  errGeneric: { kr:'문제가 생겼습니다: {msg}', en:'Something went wrong: {msg}' },
  errNoRows:  { kr:'저장이 반영되지 않았습니다. 권한 문제일 수 있습니다.',
                en:'Nothing was saved. This may be a permissions problem.' },

  /* 어디서나 돌아가는 길 */
  goHome:     { kr:'연락처', en:'Contacts' },
  goMe:       { kr:'나', en:'You' },
  /* 🔴 2026-09-16 — 로그아웃하면 이 폰으로 전화를 못 받습니다.

     기기 번호는 계정이 아니라 **폰에 붙습니다**(함정 96). 폰 하나는
     한 계정의 전화만 받습니다. 다른 계정으로 로그인하면 그 계정으로
     넘어가고, 옛 계정은 못 받게 됩니다.

     ⚠ 이걸 안 알리면 손님은 **전화가 안 오는 줄도 모릅니다.**
       상대는 계속 걸고, 손님은 왜 연락이 없나 싶습니다.
       기능을 막는 게 아니라 알려드리는 것입니다. */
  outAsk:     { kr:'로그아웃 하시겠습니까?\n\n⚠ 로그아웃하면 이 폰으로 전화를 받을 수 없습니다. 다시 로그인하시면 그대로 받습니다.\n\n다시 들어오시려면 닉네임과 비밀번호가 필요합니다.',
                en:'Sign out?\nYou will need your nickname and password to return.' },

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

  /* 언어 */
  lgTitle:     { kr:'언어', en:'Language' },
  lgAuto:      { kr:'기기 설정', en:'System' },
  lgKr:        { kr:'한국어', en:'Korean' },
  lgEn:        { kr:'English', en:'English' },
  lgNote:      { kr:'폰과 PC에서 같은 언어로 보입니다.', en:'Applies on every device you sign in to.' },

  /* 화면 제목 · 손이 닿는 곳 이름 */
  ttAuth:      { kr:'Alias', en:'Alias' },
  ttContacts:  { kr:'연락처 — Alias', en:'Contacts — Alias' },
  ttCalls:     { kr:'통화기록 — Alias', en:'Calls — Alias' },
  ttMe:        { kr:'나 — Alias', en:'You — Alias' },
  ttChat:      { kr:'대화 — Alias', en:'Chat — Alias' },
  ttLink:      { kr:'관계 — Alias', en:'Relationship — Alias' },
  ttInvite:    { kr:'초대 보내기 — Alias', en:'Send invite — Alias' },
  ttJoin:      { kr:'초대 받기 — Alias', en:'Accept invite — Alias' },
  ariaBack:    { kr:'뒤로', en:'Back' },
  ariaCall:    { kr:'통화', en:'Call' },
  ariaSend:    { kr:'보내기', en:'Send' },
  ariaAdd:     { kr:'연락처 늘리기', en:'Add a contact' },
  ariaMore:    { kr:'더보기', en:'More' },

  /* 모양 */
  thTitle:     { kr:'모양', en:'Appearance' },
  thMode:      { kr:'밝기', en:'Brightness' },
  thDark:      { kr:'야간', en:'Dark' },
  thLight:     { kr:'주간', en:'Light' },
  thAuto:      { kr:'기기 설정', en:'System' },
  thColor:     { kr:'색', en:'Colour' },
  thMidnight:  { kr:'밤바다', en:'Midnight' },
  thPaper:     { kr:'종이', en:'Paper' },
  thForest:    { kr:'숲', en:'Forest' },
  thDusk:      { kr:'노을', en:'Dusk' },
  thInk:       { kr:'먹', en:'Ink' },
  thPitch:     { kr:'칠흑', en:'Pitch' },
  thAbyss:     { kr:'심해', en:'Abyss' },
  thMidnite:   { kr:'자정', en:'Midnight' },
  thCharcoal:  { kr:'숯', en:'Charcoal' },
  thBluegrey:  { kr:'청회', en:'Bluegrey' },
  thSage:      { kr:'풀빛', en:'Sage' },
  thSand:      { kr:'모래', en:'Sand' },
  thClay:      { kr:'황토', en:'Clay' },
  thBluegrey2: { kr:'진한 청회', en:'Deep bluegrey' },
  thSage2:     { kr:'진한 풀빛', en:'Deep sage' },
  thBubble:    { kr:'말풍선', en:'Bubbles' },
  thRound:     { kr:'둥근', en:'Round' },
  thSquare:    { kr:'각진', en:'Square' },
  thTail:      { kr:'꼬리', en:'Tailed' },
  thOutline:   { kr:'테두리만', en:'Outline' },
  thScene:     { kr:'배경', en:'Scene' },
  thNone:      { kr:'없음', en:'None' },
  thSnow:      { kr:'눈', en:'Snow' },
  thRain:      { kr:'비', en:'Rain' },
  thPetals:    { kr:'벚꽃', en:'Petals' },
  thStars:     { kr:'별', en:'Stars' },
  thSceneNote: { kr:'움직이는 배경은 배터리를 조금 더 씁니다.',
                 en:'Moving scenes use a little more battery.' },
  thSample1:   { kr:'이렇게 보입니다', en:'This is how it looks' },
  thSample2:   { kr:'네, 좋네요', en:'Nice' },
  thThisChat:  { kr:'이 대화방 모양', en:'This conversation' },
  thFollowMine:{ kr:'내 기본 따르기', en:'Use my default' },
  thPickHere:  { kr:'이 방만 다르게', en:'Set for this one' },
  thUsingMine: { kr:'내 기본을 따릅니다', en:'Following your default' },
  thPerChatNote:{ kr:'거래처 방은 차분하게, 가까운 사이는 화사하게.\n비워두면 내 기본을 따릅니다.',
                  en:'Calm for work, warm for close friends.\nLeave blank to follow your default.' },
  thSaved:     { kr:'바꿨습니다.', en:'Saved.' },

  /* 여럿이 모이는 방 */
  grNew:      { kr:'여럿이 모이는 방', en:'Group room' },
  grNewD:     { kr:'네 명까지 함께 이야기하고 통화합니다.',
                en:'Up to four people can talk and call together.' },
  grMake:     { kr:'방 만들기', en:'Create room' },
  grName:     { kr:'방 이름', en:'Room name' },
  grNamePh:   { kr:'예: 골프모임', en:'e.g. Golf crew' },
  grMyFace:   { kr:'이 방에서 쓸 내 별칭', en:'Your alias in this room' },
  grInvite:   { kr:'사람 부르기', en:'Invite people' },
  grInviteD:  { kr:'부를 사람마다 초대를 하나씩 만드세요.\n한 장에 한 사람입니다.',
                en:'Make one invite for each person.\nOne invite, one person.' },
  grAdd:      { kr:'이 방에 부르기', en:'Invite to this room' },
  grAddMore:  { kr:'다음 사람 부르기', en:'Invite the next person' },
  grNth:      { kr:'{n}번째 초대', en:'Invite {n}' },
  grOneEach:  { kr:'한 장에 한 사람입니다.\n다음 분을 부르시려면 아래 단추를 다시 누르세요.',
                en:'One invite, one person.\nPress the button again for the next person.' },
  grPending:  { kr:'아직 안 쓴 초대 {n}장', en:'{n} invites not used yet' },
  grRoomLeft: { kr:'{n}명 더 부를 수 있습니다', en:'You can invite {n} more' },
  grPromote:  { kr:'여럿이 쓰는 방으로 바꾸기', en:'Turn into a group room' },
  grPromoteD: { kr:'이 대화에 사람을 더 부를 수 있게 됩니다.\n지금까지의 대화는 그대로 남습니다.',
                en:'You will be able to invite more people.\nPast messages stay as they are.' },
  grLockedNo: { kr:'잠긴 대화는 여럿이 쓰는 방으로 바꿀 수 없습니다.\n새 사람이 지난 대화를 읽을 수 없기 때문입니다.\n새 방을 만들어주세요.',
                en:'A locked conversation cannot become a group room.\nNew members could not read past messages.\nPlease create a new room instead.' },
  grLeave:    { kr:'방에서 나가기', en:'Leave room' },
  grLeaveAsk: { kr:'이 방에서 나가시겠습니까?\n나가면 대화가 보이지 않습니다.',
                en:'Leave this room?\nYou will no longer see the messages.' },
  grFull:     { kr:'이 방은 네 명까지입니다.', en:'This room holds up to four.' },
  grPeople:   { kr:'{n}명', en:'{n} people' },
  grRoom:     { kr:'방', en:'Room' },
  grGoRoom:   { kr:'방으로 들어가기', en:'Go to the room' },
  grJoinRoom: { kr:'이 방에 들어가기', en:'Join this room' },
  grJoinAs:   { kr:'이 방에서 쓸 내 별칭', en:'Your alias in this room' },
  grNoName:   { kr:'이름 없는 방', en:'Untitled room' },
  grJoined:   { kr:'{who} 님이 들어왔습니다.', en:'{who} joined.' },
  grLeft:     { kr:'{who} 님이 나갔습니다.', en:'{who} left.' },

  /* 방을 어떻게 쓸까 — 모인 사람들이 정합니다 */
  rmAsk:      { kr:'이 방을 어떻게 쓸까요?', en:'How will you use this room?' },
  rmAskNote:  { kr:'한 번 정하면 바꾸기 어렵습니다.\n함께 계신 분들과 정하세요.',
                en:'Hard to change later.\nDecide together with everyone here.' },
  rmOpen:     { kr:'그냥 쓰기', en:'Use it openly' },
  rmOpenD:    { kr:'빠르고 편합니다. 검색도 잘 됩니다.\n대화가 저희 서버에 남습니다.',
                en:'Fast and easy, search works well.\nMessages are stored on our server.' },
  rmLock:     { kr:'잠그고 쓰기', en:'Lock it' },
  rmLockD:    { kr:'각자 복구 코드를 넣어야 합니다.\n저희 서버도 읽을 수 없게 됩니다.',
                en:'Everyone enters their recovery code.\nEven our server cannot read it.' },
  rmCallSafe: { kr:'통화는 어느 쪽이든 안전합니다.\n서버를 거치지 않고 서로 직접 이어집니다.',
                en:'Calls are safe either way.\nThey connect directly, never through our server.' },
  rmWaiting:  { kr:'기다리는 중', en:'Waiting' },
  rmAgreed:   { kr:'넣었습니다', en:'Entered' },
  rmDeclined: { kr:'안 넣었습니다', en:'Declined' },
  rmMe:       { kr:'나', en:'You' },
  rmMyTurn:   { kr:'내 복구 코드 넣기', en:'Enter my recovery code' },
  rmSealed:   { kr:'잠겼습니다. 이제 대화하실 수 있습니다.',
                en:'Locked. You can start talking now.' },
  rmBlocked:  { kr:'이 방은 잠그기로 했습니다.\n복구 코드를 넣으셔야 들어오실 수 있습니다.',
                en:'This room is locked.\nEnter your recovery code to join.' },
  rmBlockedD: { kr:'넣지 않으시면 대화가 보이지 않습니다.\n나중에 넣으셔도 됩니다.',
                en:'Without it you will not see the messages.\nYou can do this later.' },
  rmDecline:  { kr:'안 넣겠습니다', en:'Not now' },
  rmMembers:  { kr:'{n}명', en:'{n} people' },
  rmRoomName: { kr:'방 이름', en:'Room name' },
  rmFull:     { kr:'이 방은 4명까지입니다.', en:'This room holds up to 4 people.' },
  rmWhyFour:  { kr:'통화를 서버 없이 서로 직접 잇기 때문입니다.\n다섯 명이 되면 기기가 못 버팁니다.',
                en:'Calls connect directly without a server.\nFive or more is too much for phones.' },

  /* 암호화 */
  ecTitle:    { kr:'대화 잠그기', en:'Encryption' },
  ecNote:     { kr:'잠그면 서버도 못 읽습니다.\n복구 코드가 있어야 열립니다.',
                en:'Once locked, even our server cannot read it.\nOnly your recovery code opens it.' },
  ecOn:       { kr:'잠김', en:'Locked' },
  ecOff:      { kr:'안 잠김', en:'Not locked' },
  ecTurnOn:   { kr:'이 대화 잠그기', en:'Lock this conversation' },
  ecSetup:    { kr:'열쇠 만들기', en:'Set up your key' },
  ecSetupD:   { kr:'복구 코드로 열쇠를 만듭니다.\n기기를 바꿔도 복구 코드만 있으면 지난 대화를 읽을 수 있습니다.',
                en:'Your recovery code makes the key.\nWith it you can read past messages on any device.' },
  ecAskCode:  { kr:'복구 코드', en:'Recovery code' },
  ecCodeHint: { kr:'가입할 때 받으신 그 코드입니다.', en:'The code you saved when you signed up.' },
  ecUnlock:   { kr:'열기', en:'Unlock' },
  ecLocked:   { kr:'잠긴 대화입니다', en:'This conversation is locked' },
  ecNeedCode: { kr:'복구 코드를 넣으시면 읽을 수 있습니다.',
                en:'Enter your recovery code to read it.' },
  ecWrong:    { kr:'복구 코드가 맞지 않습니다.', en:'That recovery code does not match.' },
  ecReady:    { kr:'열었습니다.', en:'Unlocked.' },
  ecPeerNoKey:{ kr:'상대가 아직 열쇠를 만들지 않았습니다.\n상대가 한 번 들어와야 잠글 수 있습니다.',
                en:'They have not set up a key yet.\nThey need to open the app once first.' },
  ecCantRead: { kr:'잠긴 메시지', en:'Locked message' },
  ecMadeKey:  { kr:'열쇠를 만들었습니다.', en:'Your key is ready.' },
  ecKeyNote:  { kr:'⚠ 복구 코드를 잃으면 잠긴 대화를 영영 못 읽습니다.',
                en:'⚠ If you lose your recovery code, locked messages are gone for good.' },
  ecWorking:  { kr:'열쇠를 만드는 중…', en:'Making your key…' },

  /* 데이터 — 아는 게 안심입니다 */
  dtTitle:    { kr:'데이터', en:'Data' },
  dtNote:     { kr:'이 앱은 통신사 음성통화가 아니라 데이터를 씁니다.\n음성은 1분에 약 0.5MB, 영상은 약 15MB 입니다.',
                en:'This app uses mobile data, not carrier voice minutes.\nVoice is about 0.5MB a minute; video about 15MB.' },
  dtUsed30:   { kr:'최근 30일', en:'Last 30 days' },
  dtCalls:    { kr:'통화 {n}건 · {dur}', en:'{n} calls · {dur}' },
  dtMedia:    { kr:'사진·파일 {n}건', en:'{n} photos and files' },
  dtTotal:    { kr:'모두 {size}', en:'{size} total' },
  dtNone:     { kr:'아직 쓴 것이 없습니다.', en:'Nothing used yet.' },
  dtSave:     { kr:'데이터 아끼기', en:'Save data' },
  dtVideoWifi:{ kr:'영상통화는 와이파이에서만', en:'Video calls on Wi-Fi only' },
  dtVideoWifiD:{ kr:'영상은 음성의 30배를 씁니다. 1시간에 약 900MB.',
                 en:'Video uses 30x more than voice — about 900MB an hour.' },
  dtLowRate:  { kr:'음질 낮추기', en:'Lower call quality' },
  dtLowRateD: { kr:'데이터를 절반으로 줄입니다. 통화는 조금 거칠어집니다.',
                en:'Halves the data. Calls sound a little rougher.' },
  dtMediaWifi:{ kr:'사진·파일은 와이파이에서만', en:'Photos and files on Wi-Fi only' },
  dtMediaWifiD:{ kr:'큰 파일을 이동통신으로 올리지 않습니다.',
                 en:'Large files will not upload over mobile data.' },
  dtWarn:     { kr:'많이 쓰면 알려주기', en:'Warn me at' },
  dtWarnD:    { kr:'최근 30일 사용량이 이만큼을 넘으면 알려드립니다.',
                en:'Tells you when the last 30 days go over this.' },
  dtWarnOff:  { kr:'안 알림', en:'Off' },
  dtOverWarn: { kr:'최근 30일 데이터를 {used} 썼습니다.\n와이파이를 쓰시거나 설정에서 아끼기를 켜보세요.',
                en:'You have used {used} in the last 30 days.\nTry Wi-Fi, or turn on data saving in settings.' },
  dtNoWifi:   { kr:'지금 와이파이가 아닙니다.\n설정에서 "영상통화는 와이파이에서만" 을 끄시면 걸 수 있습니다.',
                en:'You are not on Wi-Fi right now.\nTurn off "Video calls on Wi-Fi only" in settings to continue.' },
  dtNoWifiMedia:{ kr:'지금 와이파이가 아닙니다.\n설정에서 "사진·파일은 와이파이에서만" 을 끄시면 보낼 수 있습니다.',
                  en:'You are not on Wi-Fi right now.\nTurn off "Photos and files on Wi-Fi only" to continue.' },
  dtThisCall: { kr:'이번 통화 {size}', en:'{size} this call' },

  /* 알림 */
  prefTitle:   { kr:'알림', en:'Notifications' },
  prefSound:   { kr:'소리', en:'Sound' },
  prefVibrate: { kr:'진동', en:'Vibration' },
  prefOn:      { kr:'켬', en:'On' },
  prefOff:     { kr:'끔', en:'Off' },
  prefNote:    { kr:'다른 화면을 보고 있을 때 새 메시지를 알려줍니다.\n소리는 화면을 한 번 누른 뒤부터 납니다(브라우저 규칙).',
                 en:'Alerts you to new messages while you are on another screen.\nSound starts working after your first tap (browser rule).' },
  newHere:     { kr:'여기부터 새 메시지', en:'New messages' },

  /* 파일 */
  mdAttach:    { kr:'파일 붙이기', en:'Attach' },
  mdPhoto:     { kr:'사진 · 영상', en:'Photo or video' },
  mdFile:      { kr:'문서', en:'Document' },
  mdCompress:  { kr:'사진 줄이는 중…', en:'Shrinking photo…' },
  mdUploading: { kr:'올리는 중…', en:'Uploading…' },
  mdTooBig:    { kr:'파일이 너무 큽니다. {max} 까지 보낼 수 있습니다.',
                 en:'That file is too large. The limit is {max}.' },
  mdFailed:    { kr:'파일을 올리지 못했습니다: {msg}', en:'Upload failed: {msg}' },
  mdDownload:  { kr:'내려받기', en:'Download' },
  mdZoomHint:  { kr:'두 번 누르거나 손가락 두 개로 확대해보세요',
                 en:'Double-tap or pinch to zoom' },
  mdOpenFile:  { kr:'열기', en:'Open' },
  mdVideo:     { kr:'영상', en:'Video' },
  mdGone:      { kr:'파일을 찾을 수 없습니다', en:'File not found' },

  /* 여럿이 하는 통화 */
  gcTitle:    { kr:'함께 통화', en:'Group call' },
  gcJoin:     { kr:'통화에 들어가기', en:'Join the call' },
  gcStart:    { kr:'함께 통화 걸기', en:'Start a group call' },
  gcLive:     { kr:'지금 {n}명이 통화 중', en:'{n} on a call now' },
  gcConnecting:{ kr:'잇는 중…', en:'Connecting…' },
  gcAlone:    { kr:'아직 혼자입니다. 기다리는 중…', en:'Just you so far. Waiting…' },
  gcInCall:   { kr:'통화 중 · {n}명', en:'On a call · {n}' },
  gcLeave:    { kr:'나가기', en:'Leave' },
  gcNoMedia:  { kr:'마이크를 쓸 수 없습니다. 브라우저 설정을 확인해주세요.',
                en:'Microphone unavailable. Check your browser settings.' },
  gcMeshNote: { kr:'서로 직접 이어집니다. 서버를 거치지 않습니다.\n네 명까지 함께할 수 있습니다.',
                en:'You connect directly to each other, never through our server.\nUp to four people.' },
  gcDataNote: { kr:'사람이 늘수록 데이터를 더 씁니다.\n네 명이면 음성 기준 1분에 약 1.5MB 입니다.',
                en:'More people means more data.\nWith four, voice uses about 1.5MB a minute.' },
  gcWaiting:  { kr:'잇는 중', en:'Connecting' },
  gcOn:       { kr:'이어짐', en:'Connected' },
  gcLeft:     { kr:'나감', en:'Left' },

  /* 통화 */
  clVoice:    { kr:'음성통화', en:'Voice call' },
  clVideo:    { kr:'영상통화', en:'Video call' },
  clCalling:  { kr:'전화 거는 중…', en:'Calling…' },
  clRinging:  { kr:'전화가 왔습니다', en:'Incoming call' },
  clConnected:{ kr:'통화 중', en:'Connected' },
  clEnded:    { kr:'통화가 끝났습니다', en:'Call ended' },
  /* 🔴 2026-09-12 고침 — 거절과 부재중은 다른 일입니다.

     한국어 글씨가 "상대가 받지 않았습니다" 로 돼 있었습니다. 영어는
     "They declined" 인데 한국어만 뭉뚱그려져 있었습니다.

     손님에게 이 둘은 아주 다릅니다.
       부재중 — 상대가 못 봤습니다. 다시 걸어볼 만합니다.
       거절   — 상대가 지금은 안 받겠다고 했습니다. 다시 걸면 실례입니다. */
  clDeclined: { kr:'상대가 거절했습니다', en:'They declined' },
  clNoAnswer: { kr:'받지 않았습니다', en:'No answer' },
  clRejected: { kr:'거절함', en:'Declined' },
  clFailed:   { kr:'연결하지 못했습니다', en:'Could not connect' },
  clNoMedia:  { kr:'마이크를 쓸 수 없습니다. 브라우저 설정을 확인해주세요.',
                en:'Microphone unavailable. Check your browser settings.' },
  clIAm:      { kr:'나는 지금 {face}입니다', en:'You are {face}' },
  clAnswerAs: { kr:'{face}(으)로 받습니다', en:'Answering as {face}' },
  clAnswer:   { kr:'받기', en:'Answer' },
  clDecline:  { kr:'거절', en:'Decline' },

  /* 🔴 2026-09-12 신설 — 영상통화

     이 제품은 "내가 누구인지 안 밝히고 만나는" 앱입니다. 그런데 얼굴은
     세상에서 가장 확실한 신분증입니다. 그래서 영상은 **늘 한 번 더 묻고,
     카메라를 안 켜고도 받을 수 있게** 합니다. */
  clVideoCall:  { kr:'📹 영상으로 걸기', en:'📹 Video call' },
  clVoiceCall:  { kr:'☏ 전화 걸기', en:'☏ Voice call' },
  clVideoIn:    { kr:'영상통화가 왔습니다', en:'Incoming video call' },
  clAnsVideo:   { kr:'영상으로 받기', en:'Answer with video' },
  clAnsAudio:   { kr:'카메라 끄고 받기', en:'Answer without camera' },
  clFaceWarn:   { kr:'받으면 내 얼굴이 상대에게 보입니다',
                  en:'They will see your camera if you answer' },
  clNoCamNote:  { kr:'카메라를 켜지 않고 받았습니다. 상대 얼굴만 보입니다.',
                  en:'Answered without camera. You can see them only.' },
  clCamOff:     { kr:'카메라 끄기', en:'Turn camera off' },
  clCamOn:      { kr:'카메라 켜기', en:'Turn camera on' },
  clCamFlip:    { kr:'앞뒤 전환', en:'Flip camera' },
  clSendingVid: { kr:'내 카메라가 나가는 중입니다', en:'Your camera is on' },
  clHangup:   { kr:'끊기', en:'End' },
  clMute:     { kr:'음소거', en:'Mute' },
  clUnmute:   { kr:'음소거 해제', en:'Unmute' },
  clMode:     { kr:'통화 방식', en:'Call mode' },
  clNormal:   { kr:'일반통화', en:'Normal' },
  clSecret:   { kr:'비밀통화', en:'Private' },
  clSecretD:  { kr:'서버도 못 듣습니다. 통역은 안 됩니다.',
                en:'Even the server cannot hear. No translation.' },
  clTranslate:{ kr:'통역통화', en:'Translated' },
  clTranslateD:{ kr:'서버가 듣고 자막을 붙입니다. 곧 붙습니다.',
                 en:'The server listens and adds subtitles. Coming soon.' },
  clNormalD:  { kr:'저장하지 않습니다.', en:'Nothing is stored.' },
  clHistory:  { kr:'통화기록', en:'Calls' },
  clLogOut:   { kr:'통화 {dur}', en:'Call {dur}' },
  clLogIn:    { kr:'통화 {dur}', en:'Call {dur}' },
  clLogMissed:{ kr:'부재중 전화', en:'Missed call' },
  clLogDeclined:{ kr:'받지 않음', en:'Declined' },
  clLogFailed:{ kr:'연결 실패', en:'Call failed' },
  clLogAs:    { kr:'{face}(으)로', en:'as {face}' },
  clCallBack: { kr:'다시 걸기', en:'Call back' },
  clTapSound: { kr:'눌러서 소리 켜기', en:'Tap to enable sound' },
  clOut:      { kr:'걸음', en:'Outgoing' },
  clIn:       { kr:'받음', en:'Incoming' },
  clMissed:   { kr:'부재중', en:'Missed' },
  clDur:      { kr:'{n}', en:'{n}' },
  clByFace:   { kr:'별칭별로 묶기', en:'Group by alias' },
  clSoonNote: { kr:'통화는 앱이 켜져 있을 때만 받을 수 있습니다.\n잠금화면 수신은 앱으로 만들 때 붙습니다.',
                en:'Calls only ring while the app is open.\nLock-screen ringing comes with the native app.' },

  /* 메뉴판 — 이 관계에서 무엇을 쓸지 */
  mnTitle:    { kr:'이 대화방에서 쓸 것', en:'Features here' },
  mnNote:     { kr:'관계마다 쓰는 것이 다릅니다.\n거래처 방에 기념일이 뜨면 어색하니까요.\n끈 기능은 화면에서 사라질 뿐, 지난 기록은 남습니다.',
                en:'Different relationships need different things.\nMilestones look odd in a work chat.\nTurning one off only hides it; past records stay.' },
  mnPreset:   { kr:'한 번에 고르기', en:'Quick set' },
  mnPersonal: { kr:'가까운 사이', en:'Personal' },
  mnWork:     { kr:'업무', en:'Work' },
  mnPro:      { kr:'전문 상담', en:'Professional' },
  mnCustom:   { kr:'직접 고름', en:'Custom' },
  mnEach:     { kr:'하나씩 고르기', en:'Choose one by one' },
  mnOn:       { kr:'켬', en:'On' },
  mnOff:      { kr:'끔', en:'Off' },

  /* 기능 이름과 설명 — 많으면 아는 게 문제입니다. 설명이 강점이 됩니다. */
  fnGoals:      { kr:'기념일', en:'Milestones' },
  fnGoalsD:     { kr:'D-DAY · D+DAY 를 함께 셉니다. 결혼식까지, 만난 지 며칠.',
                  en:'Count down or count up together — days until, days since.' },
  fnQuestion:   { kr:'오늘의 질문', en:'Question of the day' },
  fnQuestionD:  { kr:'하루에 하나씩 같은 질문을 받습니다. 내가 답해야 상대 답이 보입니다.',
                  en:'One shared question a day. You must answer to see theirs.' },
  fnMusic:      { kr:'같이 듣기', en:'Listen together' },
  fnMusicD:     { kr:'유튜브 주소를 넣으면 양쪽이 같은 것을 봅니다.',
                  en:'Paste a YouTube link and both of you watch the same thing.' },
  fnAway:       { kr:'자리비움', en:'Away' },
  fnAwayD:      { kr:'자리를 비운 동안 상대가 말을 걸면 안내가 한 번 나갑니다.',
                  en:'While away, they get your note once when they message you.' },
  fnExpiry:     { kr:'사라지는 메시지', en:'Disappearing messages' },
  fnExpiryD:    { kr:'정한 시간이 지나면 양쪽에서 사라집니다. 매 건마다 표시됩니다.',
                  en:'Gone from both sides after a set time. Marked on every one.' },
  fnPreview:    { kr:'링크 미리보기', en:'Link previews' },
  fnPreviewD:   { kr:'주소를 보내면 제목과 그림이 함께 보입니다.',
                  en:'Links show a title and picture.' },
  fnVoice:      { kr:'음성메시지', en:'Voice messages' },
  fnVoiceD:     { kr:'눌러서 녹음하고 바로 보냅니다.', en:'Record and send in one go.' },
  fnEmoji:      { kr:'이모지', en:'Emoji' },
  fnEmojiD:     { kr:'하나만 보내면 큰 스티커로 보입니다.',
                  en:'Send just one and it becomes a big sticker.' },
  fnSearch:     { kr:'대화 검색', en:'Search' },
  fnSearchD:    { kr:'주고받은 말을 찾습니다. 즐겨찾기만 모아 볼 수도 있습니다.',
                  en:'Find what you said. Or see only what you saved.' },

  /* 목표 · 오늘의 질문 · 같이 듣기 · 자리비움 */
  glTitle:    { kr:'기념일', en:'Milestones' },
  glNone:     { kr:'아직 기념일이 없습니다.', en:'No milestones yet.' },
  glAdd:      { kr:'기념일 더하기', en:'Add a milestone' },
  glName:     { kr:'무슨 날인가요', en:'What is it' },
  glDate:     { kr:'날짜', en:'Date' },
  glSave:     { kr:'담기', en:'Add' },
  glDelete:   { kr:'지우기', en:'Remove' },
  glDminus:   { kr:'{n}일 남음', en:'{n} days to go' },
  glDplus:    { kr:'{n}일째', en:'day {n}' },
  glToday:    { kr:'오늘입니다', en:'Today' },
  glShared:   { kr:'양쪽이 함께 봅니다.', en:'Both of you see this.' },

  qTitle:     { kr:'오늘의 질문', en:'Question of the day' },
  qPlace:     { kr:'내 답', en:'Your answer' },
  qSend:      { kr:'답하기', en:'Answer' },
  qWaiting:   { kr:'상대가 아직 답하지 않았습니다.', en:'They have not answered yet.' },
  qHidden:    { kr:'내가 답해야 상대 답이 보입니다.',
                en:'Answer first to see theirs.' },
  qMine:      { kr:'내 답', en:'Yours' },
  qTheirs:    { kr:'상대 답', en:'Theirs' },
  qDone:      { kr:'오늘은 답했습니다.', en:'Answered for today.' },

  muTitle:    { kr:'같이 듣기', en:'Listen together' },
  muPlace:    { kr:'유튜브 주소', en:'YouTube link' },
  muSet:      { kr:'틀기', en:'Play' },
  muStop:     { kr:'멈추기', en:'Stop' },
  muNone:     { kr:'지금 트는 것이 없습니다.', en:'Nothing playing.' },
  muBad:      { kr:'유튜브 주소가 아닌 것 같습니다.', en:'That does not look like a YouTube link.' },
  muNote:     { kr:'한쪽이 틀면 양쪽이 같은 자리에서 듣습니다.',
                en:'When one of you plays it, both hear it from the same spot.' },
  muUpload:   { kr:'음원 올리기', en:'Upload audio' },
  muList:     { kr:'재생목록', en:'Playlist' },
  muListNone: { kr:'담은 곡이 없습니다.', en:'No tracks yet.' },
  muUsed:     { kr:'{n}곡 · {used} / {max}', en:'{n} tracks · {used} / {max}' },
  muCostNote: { kr:'음원은 자리를 많이 차지합니다.\n5분짜리 한 곡이 5MB 안팎이고, 쌓이면 비용이 됩니다.\n필요 없어진 곡은 지워주세요.',
                en:'Audio takes a lot of space.\nA five-minute track is around 5MB, and it adds up.\nPlease remove tracks you no longer need.' },
  muFull:     { kr:'이 대화방의 음원 자리가 찼습니다.\n{max} 까지 담을 수 있습니다. 곡을 지우고 다시 해보세요.',
                en:'This conversation is out of audio space.\nThe limit is {max}. Remove a track and try again.' },
  muUp:       { kr:'위로', en:'Up' },
  muDown:     { kr:'아래로', en:'Down' },
  muPlayThis: { kr:'틀기', en:'Play' },
  muRemove:   { kr:'빼기', en:'Remove' },
  muNext:     { kr:'다음 곡', en:'Next' },
  muYoutube:  { kr:'유튜브', en:'YouTube' },
  muYtNote:   { kr:'유튜브는 재생목록 주소를 그대로 넣으셔도 됩니다.',
                en:'You can paste a YouTube playlist link as-is.' },
  muPick:     { kr:'파일 고르기', en:'Choose a file' },
  muOwnNote:  { kr:'직접 녹음하거나 연주한 것만 올려주세요.\n남의 음원은 올리시면 안 됩니다.\n{max} 까지 · 이 대화방에서만 들립니다.',
                en:'Please upload only what you recorded or made yourself.\nDo not upload music you do not own.\nUp to {max} · heard only in this conversation.' },
  muOr:       { kr:'또는', en:'or' },
  muPlaying:  { kr:'지금 트는 것', en:'Now playing' },

  awTitle:    { kr:'자리비움', en:'Away' },
  awOn:       { kr:'자리비움 켜기', en:'Set away' },
  awOff:      { kr:'자리비움 끄기', en:'Turn off' },
  awMsg:      { kr:'남길 말', en:'Away message' },
  awPlace:    { kr:'지금 자리에 없습니다. 나중에 답하겠습니다.',
                en:'I am away right now. I will get back to you.' },
  awNote:     { kr:'자리를 비운 동안 상대가 말을 걸면 이 말이 한 번 나갑니다.',
                en:'If they message you while away, this is sent once.' },
  awNow:      { kr:'자리비움 중', en:'Away' },
  sysAway:    { kr:'[자리비움] {msg}', en:'[Away] {msg}' },

  /* 자동삭제 */
  exTitle:    { kr:'사라지는 메시지', en:'Disappearing messages' },
  exMsgOnce:  { kr:'이 메시지만', en:'Just this message' },
  exOff:      { kr:'안 사라짐', en:'Off' },
  ex5m:       { kr:'5분 뒤', en:'After 5 minutes' },
  ex1h:       { kr:'1시간 뒤', en:'After 1 hour' },
  ex1d:       { kr:'1일 뒤', en:'After 1 day' },
  ex7d:       { kr:'7일 뒤', en:'After 7 days' },
  ex30d:      { kr:'30일 뒤', en:'After 30 days' },
  exRoom:     { kr:'이 대화방 전체', en:'This whole conversation' },
  exRoomNote: { kr:'정한 시간이 지난 메시지가 양쪽에서 사라집니다.\n바꾸면 상대에게도 알려집니다. 몰래 바꿀 수 없습니다.',
                en:'Messages older than this disappear for both of you.\nChanging it tells the other person. You cannot do it quietly.' },
  exWillGo:   { kr:'{when} 사라짐', en:'gone {when}' },
  exBadge:    { kr:'{label} 사라짐', en:'gone {label}' },
  exOnNow:    { kr:'사라지는 메시지 켜짐 · {label}', en:'Disappearing on · {label}' },
  exSetTimer: { kr:'사라지는 시간', en:'Disappear after' },

  /* 알림줄 — 대화 흐름에 남는 말 */
  sysAutoDelOn:  { kr:'{who} 님이 이 대화방을 {label} 자동삭제로 바꿨습니다.',
                   en:'{who} set this conversation to auto-delete {label}.' },
  sysAutoDelOff: { kr:'{who} 님이 자동삭제를 껐습니다.',
                   en:'{who} turned auto-delete off.' },
  sysYou:        { kr:'나', en:'You' },

  /* 링크 미리보기 */
  lpOpen:     { kr:'열기', en:'Open' },

  /* 메모함 */
  kpTitle:    { kr:'내 메모함', en:'Your notes' },
  kpNote:     { kr:'나만 봅니다. 상대는 모릅니다.', en:'Only you can see this. Nobody else.' },
  kpEmpty:    { kr:'아직 저장한 것이 없습니다.', en:'Nothing saved yet.' },
  kpSave:     { kr:'메모함에 담기', en:'Save to notes' },
  kpSaved:    { kr:'메모함에 담았습니다.', en:'Saved to your notes.' },
  kpDelete:   { kr:'메모함에서 빼기', en:'Remove' },
  kpPlace:    { kr:'메모 적기', en:'Write a note' },
  kpAdd:      { kr:'담기', en:'Add' },

  /* 이모지 */
  emPopular:  { kr:'인기', en:'Popular' },
  emFaces:    { kr:'표정', en:'Faces' },
  emHands:    { kr:'손·사람', en:'People' },
  emHearts:   { kr:'마음', en:'Hearts' },
  emAnimals:  { kr:'동물', en:'Animals' },
  emNature:   { kr:'자연', en:'Nature' },
  emFood:     { kr:'음식', en:'Food' },
  emActivity: { kr:'활동', en:'Activity' },
  emObjects:  { kr:'사물', en:'Objects' },
  emCredit:   { kr:'이모지: Google Noto Emoji · CC BY 4.0',
                en:'Emoji: Google Noto Emoji · CC BY 4.0' },

  /* 음성메시지 */
  vcRecord:   { kr:'음성메시지', en:'Voice message' },
  vcRecording:{ kr:'녹음 중', en:'Recording' },
  vcStop:     { kr:'보내기', en:'Send' },
  vcCancel:   { kr:'버리기', en:'Discard' },
  vcNoSupport:{ kr:'이 브라우저에서는 녹음을 지원하지 않습니다.',
                en:'This browser cannot record audio.' },
  vcDenied:   { kr:'마이크를 쓸 수 없습니다. 브라우저 설정을 확인해주세요.',
                en:'Microphone unavailable. Check your browser settings.' },

  /* 답장 · 수정 · 삭제 */
  msgReply:   { kr:'답장', en:'Reply' },
  msgEdit:    { kr:'수정', en:'Edit' },
  msgDelete:  { kr:'삭제', en:'Delete' },
  msgCopy:    { kr:'복사', en:'Copy' },
  msgStar:    { kr:'즐겨찾기', en:'Save' },
  msgUnstar:  { kr:'즐겨찾기 해제', en:'Unsave' },
  msgReport:  { kr:'신고', en:'Report' },
  msgEdited:  { kr:'수정됨', en:'edited' },
  msgDelAsk:  { kr:'이 메시지를 지울까요?\n상대 화면에서도 사라집니다.',
                en:'Delete this message?\nIt disappears on their screen too.' },
  msgEditAsk: { kr:'고칠 내용', en:'New text' },
  msgReplyTo: { kr:'답장 중', en:'Replying to' },
  msgGone:    { kr:'삭제된 메시지', en:'Message deleted' },

  /* 검색 · 즐겨찾기 */
  fdTitle:    { kr:'대화 검색', en:'Search this conversation' },
  fdPlace:    { kr:'찾을 말', en:'Search' },
  fdNone:     { kr:'찾는 말이 없습니다.', en:'Nothing found.' },
  fdCount:    { kr:'{n}개', en:'{n} found' },
  fdStars:    { kr:'즐겨찾기', en:'Saved' },
  fdStarNone: { kr:'즐겨찾기한 메시지가 없습니다.', en:'Nothing saved yet.' },

  /* 신고 */
  rpTitle:    { kr:'신고하기', en:'Report' },
  rpNote:     { kr:'확인 후 조치하겠습니다.\n신고했다는 사실은 상대에게 알려지지 않습니다.',
                en:'We will review and act.\nThe other person is not told about this report.' },
  rpDetail:   { kr:'어떤 점이 문제였는지 적어주세요 (선택)',
                en:'Tell us what the problem was (optional)' },
  rpSend:     { kr:'신고 접수', en:'Submit report' },
  rpDone:     { kr:'신고가 접수되었습니다.', en:'Your report has been received.' },
  rpFailed:   { kr:'신고하지 못했습니다: {msg}', en:'Could not report: {msg}' },
  rp_sexual:   { kr:'음란물 · 성적인 콘텐츠', en:'Sexual or explicit content' },
  rp_violence: { kr:'폭력 · 위협', en:'Violence or threats' },
  rp_abuse:    { kr:'욕설 · 괴롭힘', en:'Abusive language or harassment' },
  rp_spam:     { kr:'스팸 · 광고', en:'Spam or advertising' },
  rp_fraud:    { kr:'사기 · 금전 요구', en:'Fraud or requests for money' },
  rp_privacy:  { kr:'개인정보 노출', en:'Exposure of personal information' },
  rp_other:    { kr:'기타', en:'Other' },

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
  chatRetry:   { kr:'다시', en:'Retry' },
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

  /* 초대를 받고 처음 들어온 사람에게 */
  invLanding:  { kr:'누군가 당신을 초대했습니다', en:'Someone invited you' },
  invWhat:     { kr:'Alias 는 전화번호 없이 이어지는 전화입니다.\n초대를 받은 사람만 연락할 수 있습니다.\n번호도, 주소록도 필요 없습니다.',
                 en:'Alias is a phone that works without phone numbers.\nOnly people you invite can reach you.\nNo number, no address book.' },
  invKeep:     { kr:'가입하시면 이 초대가 바로 이어집니다.',
                 en:'Sign up and this invite connects right away.' },
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
  qrShow:      { kr:'QR 보여주기', en:'Show QR' },
  qrScan:      { kr:'QR 찍기', en:'Scan QR' },
  qrTitle:     { kr:'마주 보고 찍으세요', en:'Point the camera at it' },
  qrNote:      { kr:'가장 안전한 방법입니다.\n아무 곳에도 아무것도 남지 않습니다.',
                 en:'This is the safest way.\nNothing is sent anywhere.' },
  qrCamera:    { kr:'카메라를 쓸 수 없습니다. 브라우저 설정을 확인해주세요.',
                 en:'Camera unavailable. Check your browser settings.' },
  qrNoSupport: { kr:'이 브라우저는 QR 읽기를 지원하지 않습니다.\n코드를 손으로 넣어주세요.',
                 en:'This browser cannot read QR codes.\nPlease type the code instead.' },
  qrFound:     { kr:'코드를 읽었습니다.', en:'Code found.' },
  qrOrCode:    { kr:'또는 코드를 손으로 넣기', en:'Or type the code' },
  qrFailed:    { kr:'QR 을 못 그렸습니다. 아래 코드나 주소를 쓰세요.',
                 en:'Could not draw the QR. Use the code or link below.' },
  invShareWhy: { kr:'초대를 어떻게 전할까요',
                 en:'How will you pass this along' },
  invShareNote:{ kr:'마주 보고 계시면 QR 이 가장 안전합니다.\n멀리 계시면 코드나 주소를 보내야 하는데,\n그때는 쓰시던 다른 수단을 한 번 거치게 됩니다.',
                 en:'If you are face to face, QR is safest.\nIf not, you will need to send the code or link,\nwhich means using another app just once.' },
  invShareSys: { kr:'다른 앱으로 보내기', en:'Share' },
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

  /* 🔴 2026-09-12 신설 — 별표 · 단축번호 · 정렬 */
  cntSort:      { kr:'정렬', en:'Sort' },
  cntSortRecent:{ kr:'최근 순', en:'Recent' },
  cntSortName:  { kr:'이름 순', en:'Name' },
  cntSortStar:  { kr:'별표 먼저', en:'Starred first' },
  cntSortSpeed: { kr:'단축번호 순', en:'Speed dial' },
  cntStarOn:    { kr:'★ 별표 켜기', en:'★ Add star' },
  cntStarOff:   { kr:'☆ 별표 끄기', en:'☆ Remove star' },
  cntSpeedSet:  { kr:'단축번호 정하기', en:'Set speed dial' },
  cntSpeedNone: { kr:'단축번호 없음', en:'No speed dial' },
  cntSpeedAsk:  { kr:'몇 번으로 할까요?', en:'Which number?' },
  cntSpeedTaken:{ kr:'{n}번은 "{who}" 가 쓰고 있습니다. 바꿀까요?',
                  en:'"{who}" already uses {n}. Replace?' },
  cntCallNow:   { kr:'☏ 전화 걸기', en:'☏ Call' },
  cntMsgNow:    { kr:'💬 메시지 보내기', en:'💬 Message' },
  cntMoveUp:    { kr:'▲ 한 칸 위로', en:'▲ Move up' },
  cntMoveDown:  { kr:'▼ 한 칸 아래로', en:'▼ Move down' },

  /* 🔴 2026-09-13 신설 — 별칭 사진 */
  faceChange:   { kr:'사진 바꾸기', en:'Change photo' },
  faceAdd:      { kr:'사진 넣기', en:'Add photo' },
  faceRemove:   { kr:'사진 지우기', en:'Remove photo' },
  faceTooBig:   { kr:'사진이 너무 큽니다. 2MB 아래로 줄여 주세요.',
                  en:'Photo too large. Please keep it under 2MB.' },
  faceWarnTtl:  { kr:'⚠ 사진을 올리기 전에', en:'⚠ Before you upload' },
  faceWarn1:    { kr:'얼굴 사진은 세상에서 가장 확실한 신분증입니다.',
                  en:'A face photo is the strongest form of ID there is.' },
  faceWarn2:    { kr:'다른 별칭에 같은 얼굴을 쓰면 두 관계가 같은 사람임이 드러납니다.',
                  en:'Using the same face on two aliases reveals they are one person.' },
  faceWarn3:    { kr:'한 번 보여준 사진은 상대가 내려받아 둘 수 있습니다.',
                  en:'Once seen, the other person may have saved it.' },
  faceWarn4:    { kr:'나중에 지워도 상대의 폰에 남은 것은 되돌릴 수 없습니다.',
                  en:'Deleting later cannot undo what is already on their phone.' },
  faceWarnAlt:  { kr:'얼굴 대신 그림·풍경·사물을 쓰셔도 충분히 구별됩니다.',
                  en:'A drawing, landscape or object works just as well.' },
  faceWarnNo:   { kr:'그만두기', en:'Cancel' },
  faceWarnYes:  { kr:'알고 있습니다', en:'I understand' },
  faceConfirm:  { kr:'이 사진을 "{face}" 의 얼굴로 씁니다.',
                  en:'This becomes the face of "{face}".' },
  faceAudience: { kr:'이 별칭으로 이어진 {n}명이 보게 됩니다.',
                  en:'{n} people linked through this alias will see it.' },
  faceAudience0:{ kr:'아직 이 별칭으로 이어진 사람은 없습니다.',
                  en:'Nobody is linked through this alias yet.' },
  faceRetry:    { kr:'다시 고르기', en:'Pick another' },
  faceGo:       { kr:'올리기', en:'Upload' },
  faceDone:     { kr:'사진을 바꿨습니다.', en:'Photo updated.' },
  faceGone:     { kr:'사진을 지웠습니다.', en:'Photo removed.' },
  faceNow:      { kr:'지금 이 사진을 쓰고 있습니다.', en:'This is the current photo.' },
  faceSwap:     { kr:'교체하기', en:'Replace' },
  faceDelBtn:   { kr:'삭제하기', en:'Delete' },
  faceCancel:   { kr:'취소하기', en:'Cancel' },

  /* 🔴 2026-09-14 신설 — 이용권 */
  plTrialLeft:  { kr:'무료 체험 {n}일 남았습니다', en:'{n} days left in your trial' },
  plBonus:      { kr:'지금 구매하면 1개월 더', en:'Buy now and get 1 extra month' },
  plOver:       { kr:'이용권이 끝났습니다 · 받기만 됩니다',
                  en:'Your plan has ended · you can still receive' },
  plBuy:        { kr:'구매', en:'Buy' },
  plNeedTtl:    { kr:'이용권이 필요합니다', en:'A plan is required' },
  plNeed1:      { kr:'보내기와 걸기는 이용권이 있어야 합니다. 받기와 읽기는 그대로 됩니다.',
                  en:'Sending and calling need a plan. Receiving and reading still work.' },
  /* 🔴 2026-09-17 — 값 개편. 갤러리와 녹음·녹화가 들어왔습니다.
     ⚠ 값을 고치면 여기와 alias_pricing_plans 표 **둘 다** 고쳐야 합니다.
       화면은 표에서 읽지만 이 안내문만은 글씨로 박혀 있습니다. */
  plNeed2:      { kr:'3개월 5,500원 · 6개월 9,500원 · 12개월 16,000원',
                  en:'3 months ₩5,500 · 6 months ₩9,500 · 12 months ₩16,000' },

  /* 🔴 2026-09-14 — 구매 화면 */
  plBuyTitle:   { kr:'이용권', en:'Plan' },
  plBuySub:     { kr:'별칭도 이어진 사람도 제한이 없습니다.\n받기와 읽기는 이용권 없이도 늘 됩니다.',
                  en:'Unlimited aliases and contacts.\nReceiving and reading always work.' },
  plBonusBig:   { kr:'🎁 체험 기간에 구매하시면 1개월을 더 드립니다. 처음 한 번만 드리는 혜택입니다.',
                  en:'🎁 Buy during your trial and get 1 extra month. First purchase only.' },
  plPlusOne:    { kr:'+1개월', en:'+1 month' },
  plMonths:     { kr:'{n}개월', en:'{n} months' },
  plUseFor:     { kr:'{n}개월 동안 쓰실 수 있습니다', en:'You get {n} months' },
  plPayWay:     { kr:'결제 방법', en:'Payment' },
  plPayCard:    { kr:'신용카드 · 계좌이체 (이니시스)', en:'Card · Bank transfer' },
  plPayNow:     { kr:'결제하기', en:'Pay now' },
  plBuyerTtl:   { kr:'구매자 정보', en:'Buyer details' },
  plBuyerName:  { kr:'이름', en:'Name' },
  plBuyerTel:   { kr:'연락처 (없으면 비워두세요)', en:'Phone (optional)' },
  plPrivacy:    { kr:'결제사가 요구하는 정보입니다. Alias 는 저장하지 않으며, 상대에게도 보이지 않습니다.',
                  en:'Required by the payment provider. Alias does not store it, and nobody you talk to can see it.' },
  plNoPaypal:   { kr:'PayPal 을 불러오지 못했습니다. 카드 결제를 이용해 주세요.',
                  en:'Could not load PayPal. Please use card payment.' },
  plNeedName:   { kr:'이름을 적어주세요.', en:'Please enter your name.' },
  plPickFirst:  { kr:'먼저 기간을 골라주세요.', en:'Please choose a period first.' },
  plIniSdk:     { kr:'결제 모듈을 불러오지 못했습니다. 잠시 뒤 다시 해주세요.',
                  en:'Could not load the payment module. Please try again shortly.' },
  plFailed:     { kr:'결제를 마치지 못했습니다.', en:'Payment could not be completed.' },
  /* 🔴 2026-09-17 — 저장 정리 규칙을 반드시 알립니다.
     ⚠ 말없이 지우면 손님이 잃은 줄도 모릅니다. 사는 자리에서 미리
       적어두어야 나중에 지울 수 있습니다. 약관에도 넣으세요. */
  plNote:       { kr:'· 기간이 끝나도 받기와 읽기는 그대로 됩니다.\n· 남은 기간이 있으면 이어서 더해집니다.\n· 자동으로 다시 결제되지 않습니다.\n· 저장 공간 3GB. 다 차면 지우신 만큼 다시 쓸 수 있습니다.\n· 기간이 끝나고 3개월이 지나면 저장하신 사진·영상이 지워집니다. 미리 알려드립니다.',
                  en:'· Receiving and reading keep working after it ends.\n· Remaining time is added on.\n· It does not renew automatically.\n· 3GB of storage. Free up space by deleting.\n· Stored photos and videos are removed 3 months after your plan ends. We will remind you first.' },

  /* 결제 결과 */
  plResultTitle:{ kr:'결제 결과', en:'Payment' },
  plOkTtl:      { kr:'결제가 끝났습니다', en:'Payment complete' },
  plOkSub:      { kr:'이제 보내기와 걸기가 됩니다.', en:'You can send and call again.' },
  plUntil:      { kr:'{when} 까지 쓰실 수 있습니다', en:'Valid until {when}' },
  plFailTtl:    { kr:'결제를 마치지 못했습니다', en:'Payment did not complete' },
  plFailSub:    { kr:'돈이 빠져나가지 않았습니다. 다시 해보셔도 됩니다.',
                  en:'You were not charged. You can try again.' },
  plSlow:       { kr:'결제는 됐는데 이용권 처리가 늦어지고 있습니다. 잠시 뒤 앱을 다시 열어보세요. 그래도 안 되면 주문번호와 함께 알려주세요.',
                  en:'Payment went through but the plan is taking a moment. Reopen the app shortly. If it still does not work, contact us with the order number.' },
  plGoHome:     { kr:'연락처로 가기', en:'Go to contacts' },
  plTryAgain:   { kr:'다시 해보기', en:'Try again' },
  plOrderNo:    { kr:'주문번호 {id}', en:'Order {id}' },

  /* 🔴 2026-09-15 신설 — 처음 오신 분께 보여드리는 첫 화면

     ⚠ "메신저" 라는 말을 안 씁니다. 그 말을 쓰는 순간 카카오톡과
       비교됩니다. **"번호를 안 줘도 되는 방법"** 으로 세웁니다.
     ⚠ 기능(암호화·통화)을 먼저 말하지 않습니다. **손님이 겪은 불편**부터
       말해야 읽힙니다.
     ⚠ "보이스피싱을 막습니다" 는 쓰지 않습니다. 못 막는 경우가 있고,
       그렇게 광고했다 피해가 나면 책임 문제가 됩니다.
       대신 "모르는 사람은 걸 수 없습니다" 라는 사실만 적습니다. */
  hlTitle:   { kr:'전화번호 없이 만납니다',
               en:'Meet without a phone number' },
  hlLead1:   { kr:'중고거래 한 번에 번호를 주면 평생 남습니다.',
               en:'Sell one thing online and your number is out there forever.' },
  hlLead2:   { kr:'연애가 끝나도, 퇴사를 해도, 번호는 그대로입니다.',
               en:'Break up, quit your job — the number stays.' },
  hlLead3:   { kr:'Alias 는 번호 대신 끊을 수 있는 이름을 줍니다.',
               en:'Alias gives you a name you can cut off instead.' },

  hlF1T:     { kr:'상대마다 다른 내가 됩니다', en:'A different you for each person' },
  hlF1B:     { kr:'거래처에는 하나, 동창들에게는 다른 하나. 얼굴 사진도 따로 둡니다. 서로는 같은 사람인 줄 모릅니다.',
               en:'One for clients, another for old friends — each with its own photo. They never know it is the same person.' },
  hlF2T:     { kr:'끊으면 정말 끊깁니다', en:'Cut it and it is gone' },
  hlF2B:     { kr:'관계를 끊으면 그 사람은 나에게 닿을 방법이 없어집니다. 차단이 아니라 소멸입니다.',
               en:'End a link and they have no way to reach you. Not blocked — gone.' },
  hlF3T:     { kr:'모르는 사람은 걸 수 없습니다', en:'Strangers cannot call you' },
  hlF3B:     { kr:'초대로 이어지지 않은 사람은 연락할 길이 아예 없습니다. 스팸도 사칭 전화도 들어올 문이 없습니다.',
               en:'Without an invite there is no way in. No spam, no impersonation calls.' },
  hlF4T:     { kr:'대화는 우리 둘만 봅니다', en:'Only the two of you can read it' },
  hlF4B:     { kr:'종단간 암호화. 회사도 못 읽습니다. 공짜입니다.',
               en:'End-to-end encrypted. We cannot read it either. Free, always.' },

  hlCall:    { kr:'전화도 영상통화도 됩니다. 영상통화는 카메라를 켜지 않고 받을 수도 있습니다.',
               en:'Voice and video calls included — and you can answer a video call without turning your camera on.' },
  hlPrice:   { kr:'14일 무료 체험 · 이후 월 1,300원대',
               en:'14-day free trial · about $1.3 a month after' },
  hlStart:   { kr:'시작하기', en:'Get started' },
  hlAgain:   { kr:'소개 다시 보기', en:'About Alias' },

  /* 🔴 2026-09-15 신설 — 초대장 인쇄 */
  prBtn:     { kr:'🖨 인쇄 · PDF 로 받기', en:'🖨 Print / Save as PDF' },
  prTitle:   { kr:'초대장 인쇄', en:'Print invitation' },
  prPick:    { kr:'어떻게 뽑을까요?', en:'Choose a layout' },
  prBig:     { kr:'A4 한 장 가득', en:'Full A4 page' },
  prBigD:    { kr:'가게 문·게시판에 붙이기', en:'For a door or notice board' },
  prSize:    { kr:'{s} · {n}장', en:'{s} · {n} per page' },
  prDCard:   { kr:'명함 크기 · 폰 뒤에 넣거나 건네주기',
               en:'Business-card size · keep in your case or hand over' },
  prDSq:     { kr:'정사각 · 물건이나 게시판에 붙이기',
               en:'Square · stick on an item or board' },
  prAlias:   { kr:'어느 별칭으로 뽑을까요?', en:'Which alias?' },
  prNoInvite:{ kr:'이 별칭으로 만든 초대가 없습니다. 먼저 하나 만드세요.',
               en:'No invite for this alias yet. Create one first.' },
  prRow:     { kr:'인쇄', en:'Print' },
  prPrev:    { kr:'미리보기', en:'Preview' },
  prPvTip:   { kr:'A4 한 장에 이렇게 찍힙니다. 점선을 따라 자르세요.',
               en:'This is one A4 page. Cut along the dotted lines.' },
  prPdfTip:  { kr:'인쇄 창에서 "PDF 로 저장" 을 고르시면 파일로 받습니다.',
               en:'Choose "Save as PDF" in the print dialog to get a file.' },
  prBack:    { kr:'← 크기 다시 고르기', en:'← Change size' },
  prDoIt:    { kr:'🖨 인쇄 · PDF 저장', en:'🖨 Print / Save PDF' },
  invDead:   { kr:'다 쓴 초대', en:'Used up' },
  invExpired:{ kr:'기간이 지났습니다', en:'Expired' },
  prDoneTtl: { kr:'인쇄 창을 닫았습니다', en:'Print dialog closed' },
  prDone1:   { kr:'"PDF 로 저장" 을 고르셨다면 폰의 **다운로드** 폴더에 들어 있습니다.',
               en:'If you chose "Save as PDF", the file is in your Downloads folder.' },
  prDone2:   { kr:'프린터로 뽑으셨다면 그대로 끝났습니다.',
               en:'If you sent it to a printer, you are done.' },
  prShare:   { kr:'초대 링크 공유하기', en:'Share invite link' },
  qrPrint:   { kr:'QR 인쇄', en:'Print QR' },

  /* 🔴 2026-09-18 신설 — 갤러리 */
  glTitle:    { kr:'갤러리', en:'Gallery' },
  glMine:     { kr:'내 갤러리', en:'My gallery' },
  /* 🔴 2026-09-18 고침 — 같은 글씨를 두 자리에 썼다가 손님이
     헷갈렸습니다. 위는 오가는 단추, 아래는 저장하는 단추입니다.
     하는 일이 다르면 글씨도 달라야 합니다. */
  glEdit:     { kr:'꾸미기', en:'Edit' },
  glDone:     { kr:'그만두기', en:'Cancel' },
  glSave:     { kr:'저장하기', en:'Save' },
  glEmpty:    { kr:'아직 아무것도 없습니다.', en:'Nothing here yet.' },
  glEmptyMine:{ kr:'사진이나 영상을 올려 이 별칭의 공간을 꾸며보세요.',
                en:'Add photos or videos to make this alias your own.' },
  glHeadline: { kr:'대문글', en:'Headline' },
  glHeadPh:   { kr:'한 줄로 남기고 싶은 말', en:'A line you want to leave' },
  glAdd:      { kr:'＋ 사진·영상 넣기', en:'＋ Add photo or video' },
  glMusic:    { kr:'배경음', en:'Background music' },
  glMusicNo:  { kr:'없음', en:'None' },
  glYoutube:  { kr:'유튜브 영상', en:'YouTube video' },
  glYtPh:     { kr:'유튜브 주소를 붙여넣으세요', en:'Paste a YouTube link' },
  glYtBad:    { kr:'유튜브 주소가 아닙니다.', en:'That is not a YouTube link.' },
  glOpen:     { kr:'이어진 분들에게 보이기', en:'Visible to people linked here' },
  glClosed:   { kr:'지금은 닫아두었습니다', en:'Closed for now' },
  glDel:      { kr:'지우기', en:'Delete' },
  glDelAsk:   { kr:'이것을 지울까요? 되돌릴 수 없습니다.',
                en:'Delete this? It cannot be undone.' },
  glUsed:     { kr:'{used} / {cap} 썼습니다', en:'{used} of {cap} used' },
  glFull:     { kr:'저장 공간이 찼습니다. ({used} / {cap})\n지우신 만큼 다시 쓸 수 있습니다.',
                en:'Storage is full. ({used} / {cap})\nDelete something to free up space.' },
  glUploading:{ kr:'올리는 중…', en:'Uploading…' },
  glSquashing:{ kr:'줄이는 중…', en:'Compressing…' },
  glSaved:    { kr:'저장했습니다.', en:'Saved.' },
  glNoSee:    { kr:'이 갤러리를 볼 수 없습니다.', en:'You cannot see this gallery.' },
  glWhoSees:  { kr:'이 별칭으로 이어진 분들만 봅니다.',
                en:'Only people linked through this alias can see it.' },
  glPlay:     { kr:'♪ 소리 켜기', en:'♪ Play music' },
  glStop:     { kr:'♪ 소리 끄기', en:'♪ Stop music' },
  glVisit:    { kr:'갤러리 보기', en:'See gallery' },
  glNone:     { kr:'이 분은 아직 갤러리를 만들지 않았습니다.',
                en:'This person has not set up a gallery yet.' },

  /* 🔴 2026-09-17 — 연락처에 최근 대화 보이기 */
  pvTitle:   { kr:'연락처에 최근 대화 보이기', en:'Show recent messages in contacts' },
  pvNote:    { kr:'끄면 이름만 보입니다. 옆 사람이 볼 수 있는 곳에서는 꺼두세요.',
               en:'When off, only names are shown. Keep it off where others can see your screen.' },
  pvOn:      { kr:'보이기', en:'Show' },
  pvOff:     { kr:'숨기기', en:'Hide' },
  pvLocked:  { kr:'🔒 잠긴 대화', en:'🔒 Encrypted' },
  pvMine:    { kr:'나: ', en:'You: ' },
  pvPhoto:   { kr:'📷 사진', en:'📷 Photo' },
  pvVideo:   { kr:'🎬 영상', en:'🎬 Video' },
  pvAudio:   { kr:'🎤 음성', en:'🎤 Voice' },
  pvFile:    { kr:'📎 파일', en:'📎 File' },
  pvHideOne: { kr:'이 사이만 가리기', en:'Hide for this contact' },
  pvShowOne: { kr:'이 사이도 보이기', en:'Show for this contact' },

  /* 🔴 2026-09-15 — 종이로 뿌릴 때의 경고 */
  prPaperWarn:{ kr:'⚠ 종이는 사진 찍혀 퍼질 수 있습니다. 만료 날짜를 짧게 잡고, 쓰임 횟수는 나눠줄 장수만큼만 두세요.',
               en:'⚠ Paper can be photographed and passed around. Set a short expiry and only as many uses as sheets you hand out.' },

  /* 앱 안에서는 인쇄가 안 됩니다 */
  prNoApp:   { kr:'앱에서는 인쇄가 안 됩니다', en:'Printing does not work inside the app' },
  prNoApp1:  { kr:'안드로이드 앱 화면은 인쇄 기능을 갖고 있지 않습니다. 브라우저나 PC 에서 열면 인쇄와 PDF 저장이 됩니다.',
               en:'The app view has no print support. Open it in a browser or on a PC to print or save a PDF.' },
  prNoApp2:  { kr:'아래 주소를 눌러 복사한 뒤, 삼성 인터넷이나 크롬에서 열어주세요.',
               en:'Copy the link below and open it in Samsung Internet or Chrome.' },
  prCopyUrl: { kr:'주소 복사하기', en:'Copy link' },

  /* 🔴 2026-09-15 — 전화를 받을 수 없는 상태 알림 */
  pshNone:   { kr:'이 폰은 지금 전화를 받을 수 없습니다',
               en:'This phone cannot receive calls right now' },
  pshFix:    { kr:'고치기', en:'Fix' },
  pshTrying: { kr:'하는 중…', en:'Working…' },
  pshOk:     { kr:'됐습니다. 이제 전화를 받을 수 있습니다.',
               en:'Done. You can receive calls now.' },
  pshSlow:   { kr:'조금 더 걸릴 수 있습니다. 잠시 뒤 화면을 새로 열어보세요.',
               en:'It may take a moment. Reopen this screen shortly.' },
  pshDenied: { kr:'알림이 꺼져 있습니다.\n설정 → 애플리케이션 → Alias → 알림 을 켜주세요.',
               en:'Notifications are off.\nSettings → Apps → Alias → Notifications.' },
  pshWhy:    { kr:'전화를 받을 준비가 안 됐습니다. 이유는 이렇습니다.',
               en:'Could not get ready to receive calls. Reason:' },

  /* 🔴 2026-09-16 — 계정을 바꿨을 때 */
  pshTook:   { kr:'이제 이 폰은 "{who}" 의 전화를 받습니다.\n한 폰은 한 계정의 전화만 받습니다.',
               en:'This phone now receives calls for "{who}".\nOne phone receives for one account.' },
  prGo:      { kr:'인쇄하기', en:'Print' },
  prHint:    { kr:'인쇄 창에서 "PDF 로 저장" 을 고르시면 파일로 받으실 수 있습니다.',
               en:'Choose "Save as PDF" in the print dialog to get a file.' },
  prOnce:    { kr:'⚠ 이 초대는 한 사람만 쓸 수 있습니다. 여럿에게 나눠주시려면 쓰임 횟수를 늘려 새로 만드세요.',
               en:'⚠ This invite is single-use. Make a new one with more uses to hand out.' },
  prFace:    { kr:'이 초대로 이어지면 상대는 저를 "{face}" 로 봅니다',
               en:'They will see me as "{face}"' },
  prScan:    { kr:'찍으면 앱이 없어도 열립니다', en:'Scan — works even without the app' },
  prNoTel:   { kr:'전화번호를 주고받지 않습니다', en:'No phone numbers exchanged' },
  prCodeCap: { kr:'초대 코드', en:'Invite code' },
  faceDelAsk:   { kr:'"{face}" 의 사진을 지웁니다.\n지우면 색 얼굴표로 돌아갑니다.',
                  en:'Remove the photo of "{face}". It will return to the colour mark.' },
  faceNote:     { kr:'이 사진은 이 별칭으로 이어진 분들이 봅니다.',
                  en:'People linked through this alias can see this photo.' },

  /* 🔴 2026-09-12 신설 — 부름 화면 (alias_phone.html)
     ⚠ 이름은 아직 정하는 중입니다. 여기 한 줄만 고치면 화면 제목이 바뀝니다.
       후보: 부름 · 드보크 · 여보세요 · 손짓 */
  phTitle:    { kr:'부름', en:'Dial' },
  phSearch:   { kr:'이름으로 찾기', en:'Search by name' },
  phEmptySlot:{ kr:'비어 있음', en:'empty' },
  phPickWho:  { kr:'{n}번으로 누구를 넣을까요?', en:'Who goes in {n}?' },
  phEditOn:   { kr:'번호 바꾸기', en:'Edit numbers' },
  phEditOff:  { kr:'다 됐습니다', en:'Done' },
  phEditHint: { kr:'칸을 눌러 사람을 넣거나 비웁니다. 지금은 전화가 걸리지 않습니다.',
                en:'Tap a slot to set or clear it. Calls are paused while editing.' },
  phClear:    { kr:'이 번호 비우기', en:'Clear this number' },
  phNoPair:   { kr:'1:1 로 이어진 사람이 없습니다.', en:'No one-to-one contacts yet.' },
  phEmpty:    { kr:'아직 이어진 사람이 없습니다.', en:'Nobody is connected yet.' },
  phNoMatch:  { kr:'찾는 이름이 없습니다.', en:'No matching name.' },
  phGoContacts:{ kr:'연락처로', en:'Contacts' },
  phRoomOnly: { kr:'방은 대화만 됩니다', en:'Rooms are chat only' },
  ariaCall:   { kr:'전화 걸기', en:'Call' },
  ariaMsg:    { kr:'메시지 보내기', en:'Message' },
};

/* ── 언어 ───────────────────────────────────────────────────────────
   저장해둔 것이 있으면 그것을, 없으면 기기 설정을 따릅니다.
   ⚠ 서버를 기다리면 화면이 잠깐 다른 언어로 번쩍입니다.
     그래서 기기에도 한 벌 남겨두고 그것으로 먼저 그립니다.
------------------------------------------------------------------ */
AL.LANG_KEY = 'alias_lang_v1';

AL.deviceLang = function(){
  return (navigator.language || 'ko').toLowerCase().indexOf('ko') === 0 ? 'kr' : 'en';
};

AL.resolveLang = function(pref){
  if (pref === 'kr' || pref === 'en') return pref;
  return AL.deviceLang();
};

AL.langPref = (function(){
  try { return localStorage.getItem(AL.LANG_KEY) || 'auto'; } catch (e) { return 'auto'; }
})();

AL.lang = AL.resolveLang(AL.langPref);

AL.setLang = async function(pref){
  AL.langPref = pref;
  AL.lang = AL.resolveLang(pref);
  try { localStorage.setItem(AL.LANG_KEY, pref); } catch (e) {}
  document.documentElement.setAttribute('lang', AL.lang === 'kr' ? 'ko' : 'en');
  AL.paintText();

  var sess = await AL.sb.auth.getSession();
  var uid = sess.data.session ? sess.data.session.user.id : null;
  if (!uid) return;
  var res = await AL.sb.from('account_settings')
    .upsert({ account_id: uid, lang: pref, updated_at: new Date().toISOString() },
            { onConflict: 'account_id' });
  if (res.error) throw res.error;
};

AL.t = function(key, vars){
  var row = AL.STR[key];
  if (!row || !row[AL.lang]) return '[[' + key + ']]';
  var s = row[AL.lang];
  if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
};

AL.paintText = function(root){
  var scope = root || document;
  scope.querySelectorAll('[data-t]').forEach(function(el){
    el.textContent = AL.t(el.getAttribute('data-t'));
  });
  // 눈에 안 보이는 글자들 — 화면 읽어주는 기능이 이것을 읽습니다.
  scope.querySelectorAll('[data-t-aria]').forEach(function(el){
    el.setAttribute('aria-label', AL.t(el.getAttribute('data-t-aria')));
  });
  scope.querySelectorAll('[data-t-ph]').forEach(function(el){
    el.placeholder = AL.t(el.getAttribute('data-t-ph'));
  });
  if (!root) {
    var t = document.body.getAttribute('data-t-title');
    if (t) document.title = AL.t(t);
    document.documentElement.setAttribute('lang', AL.lang === 'kr' ? 'ko' : 'en');
  }
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

  /* 🔴🔴 2026-09-11 신설 — 앱이 "차갑게" 시작할 때 튕기던 문제

     앱이 죽었다 깨어나면 로그인 정보를 저장소에서 꺼내오는 데 잠깐
     걸립니다. 그 찰나에 물어보면 "로그인 안 됨" 으로 나옵니다.
     그러면 로그인 화면으로 갔다가, 거기서 로그인이 확인되어
     연락처 화면으로 보내집니다.

     증상 — 알림을 눌렀는데 통화화면이 번쩍하고 연락처로 돌아감.
            손님은 전화를 통째로 놓칩니다.

     → 없다고 곧바로 포기하지 않고 2초 동안 여덟 번 더 물어봅니다.
       진짜 로그아웃 상태면 2초 뒤에 그대로 로그인 화면으로 갑니다. */
  if (!res.data.session) {
    for (var i = 0; i < 8; i++) {
      await new Promise(function(r){ setTimeout(r, 250); });
      res = await AL.sb.auth.getSession();
      if (res.data.session) {
        console.log('[auth] 로그인 정보를 늦게 찾았습니다 (' + ((i + 1) * 250) + 'ms)');
        break;
      }
    }
  }

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
    .select('id, display_name, is_default, avatar_url').single();
  if (res.error) throw res.error;
  return res.data;
};

AL.loadAliases = async function(){
  var res = await AL.sb.from('personas')
    /* 🔴 2026-09-13 — avatar_url 을 같이 가져옵니다.
       이게 빠져 있어서 "나" 화면 목록에만 사진이 안 나왔습니다.
       연락처는 따로 읽어(AL.myFaceMap) 잘 나왔고요. */
    .select('id, display_name, is_default, created_at, avatar_url')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (res.error) throw res.error;
  return res.data || [];
};


/* ── 잔손 ────────────────────────────────────────────────────────── */
/* 크기를 사람 말로.
   ⚠ media.js 가 아니라 여기 둡니다. 통화·설정 화면도 씁니다. */
AL.fmtBytes = function(n){
  n = Number(n) || 0;
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

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
/* 🔴🔴 2026-09-12 신설 — 월일 시분까지 다 보여줍니다.

   왜 필요한가
     연락처에서 같은 상대와 여러 번 이어지면 "연결한 시각으로 구별하세요"
     라고 안내하면서, 정작 날짜는 "어제" 라고만 적었습니다.
     같은 사람 셋이 다 "어제" 면 누구라도 못 고릅니다.
     안내문이 요구하는 정보를 화면이 안 주고 있었습니다.

   fmtShort 는 대화 목록처럼 "언제쯤인지" 만 알면 되는 곳에 그대로 씁니다.
   여기는 **구별해야 하는 곳**이라 다릅니다.

     오늘이면      20:33
     올해면        9/11 20:33
     지난해면      2025. 9/11 20:33
*/
AL.fmtWhen = function(iso){
  if (!iso) return '';
  var d = new Date(iso), now = new Date();
  var p = function(n){ return String(n).padStart(2,'0'); };
  var hm = p(d.getHours()) + ':' + p(d.getMinutes());
  var md = (d.getMonth()+1) + '/' + d.getDate();

  var sameDay = d.getFullYear()===now.getFullYear() &&
                d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  if (sameDay) return hm;

  if (d.getFullYear() !== now.getFullYear()) {
    return d.getFullYear() + '. ' + md + ' ' + hm;
  }
  return md + ' ' + hm;
};

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

/* =====================================================================
   🔴🔴 2026-09-13 신설 — 별칭마다 다른 얼굴표

   왜 필요한가
     이 앱의 핵심은 **관계마다 다른 내가 된다**는 것입니다.
     그런데 지금은 별칭이 글자 하나로만 구별됩니다.
     "개인용" 은 개, "업무용" 은 업. 머리로는 알아도 눈에는 안 들어옵니다.

     색과 모양이 갈리면 **설명 없이도** 이 앱이 무엇인지 전해집니다.
     연락처를 열었을 때 색이 나뉘어 있으면 "아, 나를 여러 개로 쓰는구나"
     가 한눈에 보입니다.

   왜 사진이 아니라 색·모양이 먼저인가
     ① 손님이 아무것도 안 해도 바로 됩니다
     ② **얼굴 사진은 가장 확실한 신분증**입니다. 업무용과 개인용에 같은
        얼굴을 넣으면 두 관계가 같은 사람임이 드러나, 별칭을 나눈 의미가
        사라집니다. 사진은 "알고 고르는" 선택으로 두는 게 맞습니다.

   어떻게 정하나
     이름에서 숫자를 뽑아 색 12가지 · 모양 4가지 중에 고릅니다.
     같은 이름이면 **언제 어느 폰에서 봐도 같은 얼굴표**가 나옵니다.
     서버에 아무것도 저장하지 않습니다.

   ⚠ 나중에 personas.avatar_url 에 사진이 들어오면 그것이 우선입니다.
     이 얼굴표는 사진이 없을 때의 기본값입니다.
   ===================================================================== */

/* 이름 → 늘 같은 숫자. 짧고 빠르면 충분합니다. */
AL._faceHash = function(name){
  var s = String(name || '?'), h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

/* 색 열둘 · 모양 넷 = 마흔여덟 가지.
   ⚠ 어두운 테마와 밝은 테마 양쪽에서 읽혀야 해서
     바탕은 옅게, 글씨는 진하게 같은 색조로 씁니다. */
AL.FACE_HUES = [4, 28, 45, 72, 100, 145, 170, 195, 220, 260, 290, 325];
AL.FACE_SHAPES = [
  '50%',                    // 동그라미
  '30%',                    // 둥근 네모
  '50% 14% 50% 14%',        // 잎사귀
  '14% 50% 14% 50%',        // 반대 잎사귀
];

AL.faceStyle = function(name){
  var h = AL._faceHash(name);
  var hue = AL.FACE_HUES[h % AL.FACE_HUES.length];
  var shape = AL.FACE_SHAPES[(h >> 4) % AL.FACE_SHAPES.length];
  return {
    hue: hue,
    bg: 'hsla(' + hue + ',62%,52%,.22)',
    fg: 'hsl(' + hue + ',72%,68%)',
    line: 'hsla(' + hue + ',62%,58%,.45)',
    radius: shape,
  };
};

/* HTML 문자열을 만들 때 쓰는 style="..." 조각입니다. */
AL.faceAttr = function(name){
  var f = AL.faceStyle(name);
  return ' style="background:' + f.bg + ';color:' + f.fg +
         ';border:1px solid ' + f.line + ';border-radius:' + f.radius + '"';
};

/* =====================================================================
   🔴🔴 2026-09-13 신설 — 별칭 사진 (프로필)

   ⚠ 사진은 **별칭마다 따로**입니다. 계정에 하나가 아닙니다.
     personas 표의 줄마다 avatar_url 칸이 따로 있습니다.
       개인용 → 강아지 사진   (어머니가 봅니다)
       업무용 → 넥타이 사진   (거래처가 봅니다)
     같은 나인데 상대마다 다른 사진 — 이 제품의 핵심이 눈에 보이는 자리입니다.

   ⚠ 서랍(버킷)이 비공개입니다. 그래서 볼 때마다 시한부 주소를 받아야
     합니다. 같은 사진을 자꾸 받지 않게 50분 동안 기억해 둡니다.

   ⚠ 정책이 "나와 이어진 사람의 것만" 으로 막고 있습니다.
     관계를 끊으면 상대는 더 이상 못 봅니다.
     다만 **이미 본 사진을 폰에 저장해뒀다면 어쩔 수 없습니다.**
     그래서 올리기 전에 반드시 경고합니다.
   ===================================================================== */
AL.FACE_BUCKET = 'alias-faces';
AL._faceUrls = {};

/* 사진 주소를 받아옵니다. 없으면 null 을 돌려줍니다(그러면 색 얼굴표를 씁니다). */
AL.faceUrl = async function(path){
  if (!path) return null;
  var now = Date.now();
  var hit = AL._faceUrls[path];
  if (hit && hit.until > now) return hit.url;   // url 이 null 이면 "없음" 을 기억한 것
  try {
    var res = await AL.sb.storage.from(AL.FACE_BUCKET).createSignedUrl(path, 3600);
    if (res.error) throw res.error;
    AL._faceUrls[path] = { url: res.data.signedUrl, until: now + 50 * 60 * 1000 };
    return res.data.signedUrl;
  } catch (e) {
    /* 🔴 2026-09-16 — 이유를 그대로 남깁니다.
       "이어진 사람의 얼굴만 봅니다" 정책에 막히면 여기로 옵니다.
       그때는 관계가 끊겼거나(status='closed') 정책이 잘못된 것입니다. */
    var msg = (e && e.message) || String(e);
    console.warn('[face] 사진 주소를 못 받았습니다: ' + path + ' — ' + msg);

    /* 🔴🔴 2026-09-17 — 파일이 없으면 **더 묻지 않습니다.**

       무슨 일이 났나
         DB(personas.avatar_url)에는 경로가 적혀 있는데 서랍에는 파일이
         없었습니다. 경로 형식을 바꾸면서 옛 파일이 사라진 것입니다.
         화면은 그것도 모르고 **줄을 그릴 때마다 서버에 물었습니다.**
           StorageApiError: Object not found

       ⚠ 없는 파일을 열 줄마다 매번 물으면 헛걸음이 쌓입니다.
         연락처에 스무 명이면 스무 번입니다.

       → 없다고 답한 경로는 잠시 기억해 두고 다시 안 묻습니다.
       ⚠ 지우지는 않습니다. 잠깐 서버가 흔들린 것일 수도 있으니까요.
         화면을 새로 열면 다시 물어봅니다. */
    if (String(msg).indexOf('not found') >= 0 ||
        String(msg).indexOf('Not Found') >= 0) {
      AL._faceUrls[path] = { url: null, until: now + 10 * 60 * 1000 };
    }
    return null;
  }
};

/* 목록에 있는 사진 주소를 한꺼번에 받아 화면에 붙입니다.
   ⚠ 요소에 data-face="경로" 를 달아두면 여기서 찾아 칠합니다.
     글자를 먼저 그려두고 사진은 오는 대로 덮어씁니다. 그래야 화면이
     비어 보이지 않습니다. */
AL.paintFaces = async function(root){
  var els = (root || document).querySelectorAll('[data-face]');
  var fail = 0;
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var path = el.getAttribute('data-face');
    if (!path) continue;
    var url = await AL.faceUrl(path);
    if (!url) { fail++; continue; }
    el.style.backgroundImage = 'url("' + url + '")';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.textContent = '';                  // 글자를 지웁니다
  }
  /* 🔴 2026-09-16 — 못 가져온 게 있으면 남깁니다.
     사진이 안 보이는데 아무 말도 없으면 "사진이 없는 건지 못 가져온
     건지" 알 수가 없습니다(함정 76). */
  if (fail) console.warn('[face] 사진 ' + fail + '장을 못 가져왔습니다');
};

/* 사진을 올립니다.
   경로는 {내 계정번호}/{별칭번호}_{올린시각}.jpg 입니다.
   맨 앞 칸이 내 것인지만 보면 되므로 정책이 간단해집니다.

   🔴🔴 2026-09-13 — 왜 파일 이름에 시각을 붙이나

     처음에는 {별칭번호}.jpg 로 **늘 같은 자리에 덮어썼습니다.**
     그랬더니 **교체가 안 됐습니다.** 파일은 바뀌었는데 화면은 옛 사진이
     그대로 나왔습니다.

     주소가 같으면 폰도 서버도 "아까 받은 그 사진" 이라며 새로 안
     가져옵니다. 그림·소리 같은 것은 원래 그렇게 아껴 씁니다.

     → 올릴 때마다 이름을 다르게 합니다. 주소가 달라지니 반드시 새로
       받아옵니다. 대신 **옛 파일은 손으로 지워야** 합니다. 안 그러면
       서랍에 쓰레기가 쌓입니다.

   ⚠ 옛것을 먼저 지우면 안 됩니다. 올리다 실패하면 사진이 통째로
     사라집니다. **새것을 올리고 기록을 바꾼 뒤에** 옛것을 지웁니다. */
AL.uploadFace = async function(personaId, file, oldPath){
  var sess = await AL.sb.auth.getSession();
  var uid = sess.data.session && sess.data.session.user.id;
  if (!uid) throw new Error(AL.t('errNotLoggedIn'));

  var small = await AL.compressImage(file, 480, 0.85);   // 동그라미 크기면 충분합니다
  if (small.size > 2 * 1024 * 1024) throw new Error(AL.t('faceTooBig'));

  var path = uid + '/' + personaId + '_' + Date.now() + '.jpg';

  var up = await AL.sb.storage.from(AL.FACE_BUCKET)
    .upload(path, small, { contentType: 'image/jpeg', upsert: false });
  if (up.error) throw up.error;

  var res = await AL.sb.from('personas')
    .update({ avatar_url: path }).eq('id', personaId).select('id');
  if (res.error) throw res.error;
  if (!res.data || !res.data.length) throw new Error(AL.t('errNoRows'));

  /* 여기까지 왔으면 새 사진이 자리를 잡았습니다. 이제 옛것을 치웁니다. */
  if (oldPath && oldPath !== path) {
    try { await AL.sb.storage.from(AL.FACE_BUCKET).remove([oldPath]); }
    catch (e) { console.warn('[face] 옛 사진을 못 지웠습니다', e); }
    delete AL._faceUrls[oldPath];
  }

  AL._faceMap = null;            // 이름→사진 표를 다시 읽게 합니다
  return path;
};

AL.removeFace = async function(personaId, path){
  try {
    if (path) await AL.sb.storage.from(AL.FACE_BUCKET).remove([path]);
  } catch (e) { /* 파일이 없어도 칸은 비웁니다 */ }
  var res = await AL.sb.from('personas')
    .update({ avatar_url: null }).eq('id', personaId).select('id');
  if (res.error) throw res.error;
  if (path) delete AL._faceUrls[path];
  AL._faceMap = null;
};

/* =====================================================================
   🔴🔴 2026-09-14 신설 — 이용권 (구독)

   손님이 지금 쓸 수 있는지 묻고, 안 되면 알려줍니다.

     받기 · 읽기 · 끊기 · 차단     늘 됩니다   ← 돈과 상관없습니다
     보내기 · 걸기 · 초대 · 별칭   이용권 필요

   ⚠ 왜 받기는 늘 되게 두나
     휴대폰 요금을 안 내면 발신은 막히지만 수신은 됩니다. 그래야 상대가
     계속 말을 걸고, 손님은 답을 못 해 아쉬워집니다. 관계가 살아 있으니
     돌아올 자리도 남습니다. 끊어버리면 그 사람이 초대한 상대까지 같이
     사라집니다.

   ⚠ 끊기와 차단은 절대 막지 마세요
     이 앱이 파는 것이 "끊을 수 있는 연결" 입니다. 돈으로 그걸 막으면
     약속을 어기는 것입니다. 안전에 관한 것도 마찬가지입니다.
   ===================================================================== */
AL._plan = null;

AL.myPlan = async function(force){
  if (AL._plan && !force) return AL._plan;
  try {
    var res = await AL.sb.rpc('my_plan');
    if (res.error) throw res.error;
    AL._plan = (res.data || [])[0] ||
               { state: 'expired', active: false, bonus_ready: false };
  } catch (e) {
    /* ⚠ 못 읽으면 **쓸 수 있는 쪽**으로 둡니다.
       서버가 잠깐 흔들렸다고 손님이 갑자기 말을 못 하게 되면 안 됩니다.
       돈 몇 푼보다 신뢰가 큽니다. 진짜 막는 것은 나중에 서버가 합니다. */
    console.warn('[plan] 이용권을 못 읽었습니다 — 일단 쓸 수 있게 둡니다', e);
    AL._plan = { state: 'unknown', active: true, bonus_ready: false };
  }
  return AL._plan;
};

AL.planDaysLeft = function(p){
  if (!p || !p.until) return 0;
  var ms = new Date(p.until).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
};

/* 쓸 수 있으면 true. 아니면 안내를 띄우고 false. */
AL.requirePlan = async function(){
  var p = await AL.myPlan();
  if (p.active !== false) return true;
  AL.needPlan();
  return false;
};

/* ── 화면 위 띠 ──────────────────────────────────────────────────
   ⚠ 이용권이 멀쩡하면 아무것도 안 보입니다. 평소에 화면을 차지하면 안 됩니다.
   ⚠ 체험 중에는 **"지금 사면 1개월 더"** 를 계속 알립니다.
     이게 손님이 만드신 장치의 핵심입니다. 체험이 끝난 뒤에 알리면 늦습니다. */
AL._planCss = function(){
  if (document.getElementById('planCss')) return;
  var st = document.createElement('style');
  st.id = 'planCss';
  st.textContent =
    '#planBar{display:flex;align-items:center;gap:10px;margin:0 0 12px;' +
      'padding:11px 14px;border-radius:12px;font-size:13.5px;line-height:1.5;' +
      'font-weight:600;word-break:keep-all}' +
    '#planBar.trial{background:rgba(143,227,176,.14);color:#8FE3B0;' +
      'border:1px solid rgba(143,227,176,.35)}' +
    '#planBar.over{background:rgba(242,201,76,.15);color:#F2C94C;' +
      'border:1px solid rgba(242,201,76,.4)}' +
    '#planBar span{flex:1}' +
    '#planBar a{flex:0 0 auto;padding:8px 14px;border-radius:999px;' +
      'text-decoration:none;font-weight:700;font-size:13px;' +
      'background:rgba(255,255,255,.14);color:inherit;' +
      'border:1px solid currentColor}' +
    '#planBg{display:none;position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.6)}' +
    '#planBox{display:none;position:fixed;z-index:91;left:50%;top:50%;' +
      'transform:translate(-50%,-50%);width:min(400px,88vw);padding:22px;' +
      'border-radius:18px;background:#1B2430;color:#DDE5F0;' +
      'border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 44px rgba(0,0,0,.6)}' +
    '#planBox h3{margin:0 0 12px;font-size:18px;font-weight:800}' +
    '#planBox p{margin:0 0 10px;font-size:14.5px;line-height:1.75}' +
    '#planBox .ok{margin:14px 0 18px;padding:11px 14px;border-radius:11px;' +
      'font-size:13.5px;line-height:1.65;background:rgba(143,227,176,.14);color:#8FE3B0}' +
    '#planBox .fb{display:flex;gap:10px}' +
    '#planBox .fb button,#planBox .fb a{flex:1;margin:0;padding:14px 0;' +
      'border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;' +
      'text-align:center;text-decoration:none;' +
      'background:rgba(255,255,255,.08);color:#DDE5F0;' +
      'border:1px solid rgba(255,255,255,.18)}' +
    '#planBox .fb a{background:rgba(143,227,176,.22);color:#8FE3B0;' +
      'border-color:rgba(143,227,176,.45)}';
  document.head.appendChild(st);
};

/* =====================================================================
   🔴🔴 2026-09-15 신설 — "이 폰은 전화를 받을 수 있는가"

   무슨 일이 났나
     B 폰이 기기 번호를 안 올려서 전화가 안 왔습니다. 그런데 화면에는
     아무 표시도 없었습니다. 콘솔에만 남아서 USB 를 꽂아야 알 수 있었죠.

   ⚠ 손님은 더 심합니다. 전화를 못 받는 줄도 모르고 지냅니다.
     상대는 계속 걸고, 손님은 왜 연락이 없나 싶습니다.
     **못 받는 상태라면 반드시 알려야 합니다.**

   무엇을 보는가
     내 계정에 push_token 이 있는 기기 줄이 하나라도 있는가.
     없으면 띠를 띄우고 [다시 시도] 를 줍니다.

   ⚠ 브라우저에서는 아무것도 안 합니다. PC 로 쓰는 분에게는
     원래 푸시가 없습니다.
   ===================================================================== */
AL.pushReady = async function(){
  if (!AL.isNativeApp()) return true;          // 브라우저는 볼 것 없습니다
  try {
    var sess = await AL.sb.auth.getSession();
    if (!sess.data.session) return true;
    var uid = sess.data.session.user.id;
    var res = await AL.sb.from('devices')
      .select('id').eq('account_id', uid).not('push_token', 'is', null).limit(1);
    if (res.error) throw res.error;
    return !!(res.data && res.data.length);
  } catch (e) {
    console.warn('[push] 기기 줄을 못 읽었습니다', e);
    return true;   // 모르면 조용히 둡니다. 헛경고가 더 나쁩니다.
  }
};

AL.showPushBar = async function(){
  if (await AL.pushReady()) {
    var old = document.getElementById('pushBar');
    if (old) old.remove();
    return;
  }
  AL._planCss();
  var host = document.querySelector('.wrap') || document.body;
  var old2 = document.getElementById('pushBar');
  if (old2) old2.remove();

  var bar = document.createElement('div');
  bar.id = 'pushBar';
  bar.className = 'over';
  bar.innerHTML = '<span>' + AL.esc(AL.t('pshNone')) + '</span>' +
    '<a href="#" id="pshFix">' + AL.esc(AL.t('pshFix')) + '</a>';
  bar.style.cssText =
    'display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:11px 14px;' +
    'border-radius:12px;font-size:13.5px;line-height:1.5;font-weight:600;' +
    'word-break:keep-all;background:rgba(255,120,120,.15);color:#FFB4B4;' +
    'border:1px solid rgba(255,120,120,.4)';
  var span = bar.querySelector('span'); span.style.flex = '1';
  var a = bar.querySelector('a');
  a.style.cssText = 'flex:0 0 auto;padding:8px 14px;border-radius:999px;' +
    'text-decoration:none;font-weight:700;font-size:13px;' +
    'background:rgba(255,255,255,.14);color:inherit;border:1px solid currentColor';

  host.insertBefore(bar, host.firstChild);

  a.addEventListener('click', async function(e){
    e.preventDefault();
    a.textContent = AL.t('pshTrying');
    AL._pushErr = '';

    /* 🔴 2026-09-15 — 옛 기억을 지우고 새로 받습니다.
       지워진 줄을 가리키는 옛 id 가 남아 있으면 그 줄을 고치려다
       아무 일도 안 일어납니다. */
    try { localStorage.removeItem(AL.DEVICE_ID_KEY); } catch (e2) {}

    var ok = await AL.registerPush();

    /* 번호가 오는 데 잠깐 걸립니다. 넉넉히 기다렸다 다시 봅니다. */
    setTimeout(async function(){
      if (await AL.pushReady()) {
        bar.remove();
        alert(AL.t('pshOk'));
        return;
      }
      a.textContent = AL.t('pshFix');
      /* ⚠ 이유가 있으면 그대로 보여줍니다. "조금 더 걸립니다" 만
         되풀이하면 손님도 저도 영영 원인을 모릅니다(함정 76). */
      if (AL._pushErr) {
        alert(AL.t('pshWhy') + '\n\n' + AL._pushErr);
      } else {
        alert(AL.t(ok ? 'pshSlow' : 'pshDenied'));
      }
    }, 4000);
  });
};

AL.showPlanBar = async function(){
  var p = await AL.myPlan();
  if (p.state === 'paid' || p.state === 'unknown') return;

  AL._planCss();
  var host = document.querySelector('.wrap') || document.body;
  var old = document.getElementById('planBar');
  if (old) old.remove();

  var bar = document.createElement('div');
  bar.id = 'planBar';
  var msg;
  if (p.state === 'trial') {
    bar.className = 'trial';
    var d = AL.planDaysLeft(p);
    msg = AL.t('plTrialLeft', { n: d });
    if (p.bonus_ready) msg += ' · ' + AL.t('plBonus');
  } else {
    bar.className = 'over';
    msg = AL.t('plOver');
  }
  bar.innerHTML = '<span>' + AL.esc(msg) + '</span>' +
    '<a href="alias_buy.html">' + AL.esc(AL.t('plBuy')) + '</a>';
  host.insertBefore(bar, host.firstChild);
};

AL.needPlan = function(){
  AL._planCss();
  if (!document.getElementById('planBg')) {
    var bg = document.createElement('div'); bg.id = 'planBg';
    var box = document.createElement('div'); box.id = 'planBox';
    document.body.appendChild(bg); document.body.appendChild(box);
    bg.addEventListener('click', function(){
      bg.style.display = 'none'; box.style.display = 'none';
    });
  }
  var bg2 = document.getElementById('planBg');
  var box2 = document.getElementById('planBox');
  box2.innerHTML =
    '<h3>' + AL.esc(AL.t('plNeedTtl')) + '</h3>' +
    '<p>' + AL.esc(AL.t('plNeed1')) + '</p>' +
    '<div class="ok">' + AL.esc(AL.t('plNeed2')) + '</div>' +
    '<div class="fb">' +
      '<button id="planNo">' + AL.esc(AL.t('close')) + '</button>' +
      '<a href="alias_buy.html">' + AL.esc(AL.t('plBuy')) + '</a>' +
    '</div>';
  bg2.style.display = 'block';
  box2.style.display = 'block';
  document.getElementById('planNo').addEventListener('click', function(){
    bg2.style.display = 'none'; box2.style.display = 'none';
  });
};

/* =====================================================================
   🔴🔴 2026-09-17 신설 — 연락처의 최근 대화 한 줄

   ⚠ 기본은 꺼져 있습니다. 이 앱은 번호를 감추려고 쓰는 앱이라,
     목록에 대화가 드러나면 옆 사람이 읽습니다.
     손님이 "나" 화면에서 켜야 보입니다.

   ⚠ 암호화된 관계는 내용을 못 가져옵니다. 서버가 못 읽으니까요.
     그런 줄은 "🔒 잠긴 대화" 로 그립니다.
   ===================================================================== */
AL.previewOn = async function(){
  try {
    var res = await AL.sb.from('account_settings').select('show_preview').maybeSingle();
    return !!(res.data && res.data.show_preview);
  } catch (e) { return false; }
};

AL.setPreview = async function(on){
  var sess = await AL.sb.auth.getSession();
  if (!sess.data.session) return false;
  var uid = sess.data.session.user.id;
  /* 줄이 없을 수도 있어 넣기와 고치기를 함께 합니다. */
  var res = await AL.sb.from('account_settings')
    .upsert({ account_id: uid, show_preview: !!on }, { onConflict: 'account_id' })
    .select('show_preview');
  if (res.error) { console.warn('[preview] 저장 실패', res.error); return false; }
  return true;
};

/* link_id → 한 줄. 한 번에 받아옵니다. */
AL.loadPreviews = async function(){
  try {
    var res = await AL.sb.rpc('my_last_messages');
    if (res.error) throw res.error;
    var map = {};
    (res.data || []).forEach(function(m){ map[m.link_id] = m; });
    return map;
  } catch (e) {
    console.warn('[preview] 최근 대화를 못 읽었습니다', e);
    return {};
  }
};

/* 한 줄을 사람이 읽을 글로 바꿉니다.
   ⚠ 사진·영상은 내용이 없으므로 종류로 적습니다.
   ⚠ 내가 보낸 것이면 앞에 "나: " 를 붙입니다. 누가 한 말인지 알아야
     쓸모가 있습니다. */
AL.previewText = function(m, mySideId){
  if (!m) return '';
  if (m.is_locked) return AL.t('pvLocked');

  var body = '';
  var t = m.message_type || 'text';
  if (t === 'photo') body = AL.t('pvPhoto');
  else if (t === 'video') body = AL.t('pvVideo');
  else if (t === 'audio') body = AL.t('pvAudio');
  else if (t === 'file') body = m.media_name || AL.t('pvFile');
  else body = (m.content || '').replace(/\s+/g, ' ').trim();

  if (!body) return '';
  var mine = (mySideId && m.sender_side_id === mySideId);
  return (mine ? AL.t('pvMine') : '') + body;
};

/* =====================================================================
   🔴🔴 2026-09-18 신설 — 갤러리

   무엇인가
     별칭마다 하나씩 있는 "내 공간" 입니다.
     대문글 · 사진·영상 · 배경음 · 유튜브를 담습니다.

   ⚠ 왜 별칭마다인가
     거래처에 보이는 나와 동창에게 보이는 나가 달라야 합니다.
     계정에 하나만 두면 이 앱의 약속이 깨집니다.

   ⚠ 누가 보나
     **그 별칭으로 이어진 사람만** 봅니다. 정책이 막습니다.
     거래처는 "업무용" 갤러리만 보고 "개인용" 은 있는 줄도 모릅니다.
   ===================================================================== */
AL.GALLERY_BUCKET = 'alias-gallery';
AL.MUSIC_BUCKET = 'alias-music';

/* 갤러리 한 채를 읽어옵니다. 없으면 빈 것을 돌려줍니다. */
AL.loadGallery = async function(personaId){
  var out = { headline: '', music_id: null, youtube_id: null,
              is_open: true, items: [] };
  try {
    var g = await AL.sb.from('galleries')
      .select('headline, music_id, youtube_id, is_open')
      .eq('persona_id', personaId).maybeSingle();
    if (g.data) Object.assign(out, g.data);

    var it = await AL.sb.from('gallery_items')
      .select('id, kind, path, caption, bytes, w, h, sort')
      .eq('persona_id', personaId)
      .order('sort').order('created_at');
    out.items = it.data || [];
  } catch (e) {
    console.warn('[gallery] 못 읽었습니다', e);
  }
  return out;
};

/* 갤러리 설정을 저장합니다. 줄이 없으면 만듭니다. */
AL.saveGallery = async function(personaId, patch){
  var sess = await AL.sb.auth.getSession();
  if (!sess.data.session) return '로그인이 풀렸습니다';
  var row = Object.assign({
    persona_id: personaId,
    account_id: sess.data.session.user.id,
    updated_at: new Date().toISOString(),
  }, patch);
  var res = await AL.sb.from('galleries')
    .upsert(row, { onConflict: 'persona_id' }).select('persona_id');
  if (res.error) {
    /* 🔴 2026-09-18 — 이유를 그대로 올려보냅니다.
       권한인지 칸 이름인지 화면에서 알 수 있어야 합니다. */
    console.error('[gallery] 저장 실패', res.error);
    return '저장 실패: ' + (res.error.message || res.error.code || '알 수 없음');
  }
  if (!res.data || !res.data.length) {
    /* ⚠ 정책이 막으면 오류 없이 0줄이 바뀝니다(함정 ⑦). */
    return '저장 실패: 아무 줄도 바뀌지 않았습니다 (정책 확인 필요)';
  }
  return true;
};

/* 사진·영상 올리기.
   경로는 {계정}/{별칭번호}/{시각}_{무작위}.{확장자} 입니다.
   ⚠ 두 번째 칸이 별칭 번호라, 서랍 정책이 "그 별칭과 이어졌는가" 를
     바로 볼 수 있습니다. 경로가 곧 권한입니다. */
AL.uploadGalleryItem = async function(personaId, file, onStep){
  var sess = await AL.sb.auth.getSession();
  if (!sess.data.session) throw new Error(AL.t('errNotLoggedIn'));
  var uid = sess.data.session.user.id;

  var kind = (file.type || '').indexOf('video/') === 0 ? 'video' : 'photo';
  var use = file;
  if (kind === 'photo') {
    if (onStep) onStep('compress');
    use = await AL.compressImage(file, 1600, 0.85);
  }

  /* ⚠ 저장 한도를 먼저 봅니다. 올리고 나서 막으면 헛수고입니다. */
  var used = await AL.storageUsed();
  var cap = await AL.storageCap();
  if (cap && used + use.size > cap) {
    throw new Error(AL.t('glFull', {
      used: AL.fmtBytes(used), cap: AL.fmtBytes(cap),
    }));
  }

  var dim = await AL.measureImage(use);
  var ext = (use.name.match(/\.([a-zA-Z0-9]+)$/) || [, 'bin'])[1].toLowerCase();
  var path = uid + '/' + personaId + '/' + Date.now() + '_' +
             Math.random().toString(36).slice(2, 8) + '.' + ext;

  if (onStep) onStep('upload');
  var up = await AL.sb.storage.from(AL.GALLERY_BUCKET)
    .upload(path, use, { contentType: use.type || 'application/octet-stream' });
  if (up.error) throw up.error;

  var ins = await AL.sb.from('gallery_items').insert({
    persona_id: personaId, account_id: uid,
    kind: kind, path: path, bytes: use.size,
    w: dim.w || null, h: dim.h || null,
    sort: Date.now() % 100000,
  }).select('id').single();
  if (ins.error) {
    /* ⚠ 표에 못 넣었으면 올린 파일도 치웁니다. 안 그러면 아무도
       모르는 파일이 서랍에 쌓입니다. */
    try { await AL.sb.storage.from(AL.GALLERY_BUCKET).remove([path]); } catch (e) {}
    throw ins.error;
  }
  return ins.data.id;
};

AL.deleteGalleryItem = async function(id, path){
  try { await AL.sb.storage.from(AL.GALLERY_BUCKET).remove([path]); } catch (e) {}
  var res = await AL.sb.from('gallery_items').delete().eq('id', id);
  if (res.error) throw res.error;
};

/* 갤러리 사진의 시한부 주소. 얼굴 사진과 같은 방식입니다. */
AL._galUrls = {};
AL.galleryUrl = async function(path){
  if (!path) return null;
  var now = Date.now();
  var hit = AL._galUrls[path];
  if (hit && hit.until > now) return hit.url;
  try {
    var res = await AL.sb.storage.from(AL.GALLERY_BUCKET).createSignedUrl(path, 3600);
    if (res.error) throw res.error;
    AL._galUrls[path] = { url: res.data.signedUrl, until: now + 50 * 60 * 1000 };
    return res.data.signedUrl;
  } catch (e) {
    console.warn('[gallery] 주소를 못 받았습니다: ' + path + ' — ' +
      ((e && e.message) || String(e)));
    AL._galUrls[path] = { url: null, until: now + 10 * 60 * 1000 };
    return null;
  }
};

/* 배경음은 공개 서랍이라 주소가 고정입니다. 받아올 필요가 없습니다. */
AL.musicUrl = function(path){
  if (!path) return null;
  var res = AL.sb.storage.from(AL.MUSIC_BUCKET).getPublicUrl(path);
  return res && res.data ? res.data.publicUrl : null;
};

AL.loadMusicList = async function(){
  try {
    var res = await AL.sb.from('gallery_music')
      .select('id, title, artist, path, mood, seconds')
      .eq('is_active', true).order('sort').order('title');
    return res.data || [];
  } catch (e) { return []; }
};

/* ── 저장 한도 ──────────────────────────────────────────────────
   ⚠ 이용권에 3GB 가 붙어 있습니다. 다 차면 더 못 올립니다.
     "오래된 것부터 자동 삭제" 는 안 합니다. 손님이 놀랍니다. */
AL.storageUsed = async function(){
  try {
    var res = await AL.sb.rpc('my_storage_used');
    return Number(res.data || 0);
  } catch (e) { return 0; }
};

AL._cap = null;
AL.storageCap = async function(){
  if (AL._cap !== null) return AL._cap;
  try {
    var res = await AL.sb.from('alias_pricing_plans')
      .select('storage_gb').eq('tier', 'standard').limit(1).maybeSingle();
    AL._cap = res.data ? Number(res.data.storage_gb) * 1024 * 1024 * 1024 : 0;
  } catch (e) { AL._cap = 0; }
  return AL._cap;
};

/* 이 관계에서 상대가 쓰는 별칭. 갤러리로 가려면 필요합니다.
   ⚠ link_sides 정책이 남의 줄을 막고 있어 화면에서는 못 읽습니다.
     서버 함수가 "내가 그 링크에 있는가" 를 보고 알려줍니다. */
AL.peerPersona = async function(linkId){
  try {
    var res = await AL.sb.rpc('peer_persona', { p_link_id: linkId });
    var row = (res.data || [])[0];
    return row || null;
  } catch (e) {
    console.warn('[gallery] 상대 별칭을 못 찾았습니다', e);
    return null;
  }
};

/* 유튜브 주소에서 영상 번호만 떼어냅니다.
   ⚠ 주소 전체를 저장하면 안 됩니다. 여러 모양이 있고, 추적용 꼬리표가
     붙어 오기도 합니다. 번호만 남깁니다. */
AL.youtubeId = function(url){
  if (!url) return null;
  var s = String(url).trim();
  if (/^[\w-]{11}$/.test(s)) return s;          // 번호를 바로 넣은 경우
  var m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
};

/* 내 별칭 이름 → 사진 경로 표를 만듭니다.

   ⚠ my_contacts() 는 **내 별칭의 사진을 안 실어 보냅니다.**
     (상대 사진만 보냅니다.) 함수를 고치면 반환 모양이 바뀌어 다른 화면까지
     영향을 받으므로, 별칭 목록을 따로 읽어 이름으로 짝을 맞춥니다.
     별칭 이름은 계정 안에서 겹치지 않게 막혀 있어 이 방법이 통합니다.
   ⚠ 별칭은 보통 두세 개라 값이 싸고, 한 번 읽어 기억해 둡니다. */
AL._faceMap = null;

AL.myFaceMap = async function(force){
  if (AL._faceMap && !force) return AL._faceMap;
  try {
    var res = await AL.sb.from('personas').select('display_name, avatar_url');
    var map = {};
    (res.data || []).forEach(function(a){
      if (a.avatar_url) map[a.display_name] = a.avatar_url;
    });
    AL._faceMap = map;
    return map;
  } catch (e) {
    console.warn('[face] 별칭 사진을 못 읽었습니다', e);
    return AL._faceMap || {};
  }
};

/* 이 별칭으로 이어진 사람이 몇 명인가.
   올리기 전에 "몇 명이 보게 되는지" 를 알려주려고 셉니다.
   숫자로 보이면 무게가 달라집니다. */
AL.faceAudience = async function(personaId){
  try {
    var res = await AL.sb.from('link_sides')
      .select('link_id').eq('persona_id', personaId);
    return (res.data || []).length;
  } catch (e) { return 0; }
};

/* 이미 만들어진 요소에 칠할 때 씁니다. */
AL.paintFace = function(el, name){
  if (!el) return;
  var f = AL.faceStyle(name);
  el.style.background = f.bg;
  el.style.color = f.fg;
  el.style.border = '1px solid ' + f.line;
  el.style.borderRadius = f.radius;
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

/* ── 메뉴판 ─────────────────────────────────────────────────────────
   관계마다 쓰는 기능이 다릅니다. 업무용 방에 기념일이 뜨면 어색합니다.

   ⚠ 끄는 것은 화면에서 감추는 것뿐입니다. 지난 기록은 지워지지 않습니다.
     기념일을 껐다가 다시 켜면 그대로 있습니다.

   ⚠ features 가 비어 있으면 preset 이 정한 기본을 씁니다.
     그래야 "아무것도 안 정한 방" 도 자연스럽게 동작합니다.
------------------------------------------------------------------ */
AL.FEATURES = [
  ['goals',   'fnGoals',    'fnGoalsD'],
  ['question','fnQuestion', 'fnQuestionD'],
  ['music',   'fnMusic',    'fnMusicD'],
  ['away',    'fnAway',     'fnAwayD'],
  ['expiry',  'fnExpiry',   'fnExpiryD'],
  ['preview', 'fnPreview',  'fnPreviewD'],
  ['voice',   'fnVoice',    'fnVoiceD'],
  ['emoji',   'fnEmoji',    'fnEmojiD'],
  ['search',  'fnSearch',   'fnSearchD'],
];

AL.PRESETS = {
  personal: { goals:1, question:1, music:1, away:1, expiry:1, preview:1, voice:1, emoji:1, search:1 },
  work:     { goals:0, question:0, music:0, away:1, expiry:1, preview:1, voice:1, emoji:1, search:1 },
  pro:      { goals:0, question:0, music:0, away:1, expiry:0, preview:1, voice:0, emoji:0, search:1 },
};

/* 이 방에서 그 기능을 쓰나. features 가 비었으면 preset 을 따릅니다. */
AL.featureOn = function(link, key){
  var f = link && link.features;
  if (f && Object.prototype.hasOwnProperty.call(f, key)) return !!f[key];
  var p = AL.PRESETS[(link && link.preset) || 'personal'] || AL.PRESETS.personal;
  return !!p[key];
};

AL.openMenu = function(sideId, link){
  return new Promise(function(resolve){
    var preset = (link && link.preset) || 'personal';
    var feats = Object.assign({}, (link && link.features) || {});

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
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    function isOn(key){
      if (Object.prototype.hasOwnProperty.call(feats, key)) return !!feats[key];
      var p = AL.PRESETS[preset] || AL.PRESETS.personal;
      return !!p[key];
    }

    function draw(){
      sheet.innerHTML = '<div class="grip"></div>';
      var h = document.createElement('p'); h.className = 'pk-title';
      h.textContent = AL.t('mnTitle'); sheet.appendChild(h);
      var n = document.createElement('p'); n.className = 'pk-note';
      n.textContent = AL.t('mnNote'); sheet.appendChild(n);

      var pl = document.createElement('p'); pl.className = 'pk-note';
      pl.style.margin = '0 0 7px'; pl.textContent = AL.t('mnPreset');
      sheet.appendChild(pl);

      var row = document.createElement('div');
      row.className = 'swatches'; row.style.marginBottom = '18px';
      [['personal','mnPersonal'], ['work','mnWork'], ['pro','mnPro']].forEach(function(o){
        var b = document.createElement('button');
        b.className = 'sw' + (preset === o[0] && !Object.keys(feats).length ? ' on' : '');
        b.textContent = AL.t(o[1]);
        b.addEventListener('click', function(){
          preset = o[0];
          feats = {};                 // 한 번에 고르면 하나씩 정한 것은 지웁니다
          draw();
        });
        row.appendChild(b);
      });
      sheet.appendChild(row);

      var el = document.createElement('p'); el.className = 'pk-note';
      el.style.margin = '0 0 7px'; el.textContent = AL.t('mnEach');
      sheet.appendChild(el);

      AL.FEATURES.forEach(function(f){
        var on = isOn(f[0]);
        var item = document.createElement('div');
        item.className = 'fn-row' + (on ? ' on' : '');

        var mid = document.createElement('div'); mid.className = 'fn-mid';
        var b = document.createElement('b'); b.textContent = AL.t(f[1]); mid.appendChild(b);
        var d = document.createElement('span'); d.textContent = AL.t(f[2]); mid.appendChild(d);
        item.appendChild(mid);

        var tg = document.createElement('button');
        tg.className = 'fn-tg' + (on ? ' on' : '');
        tg.textContent = AL.t(on ? 'mnOn' : 'mnOff');
        tg.addEventListener('click', function(){
          feats[f[0]] = !on;
          draw();
        });
        item.appendChild(tg);
        sheet.appendChild(item);
      });

      var go = document.createElement('button');
      go.className = 'pk-go'; go.style.width = '100%'; go.style.marginTop = '16px';
      go.textContent = AL.t('save');
      go.addEventListener('click', async function(){
        go.disabled = true;
        try {
          // preset 은 방에, 하나씩 고른 것은 내 쪽에 담습니다.
          // 그래야 상대가 자기 취향대로 또 끌 수 있습니다.
          var a = await AL.sb.from('links').update({ preset: preset })
            .eq('id', (link && link.id)).select('id');
          if (a.error) throw a.error;
          var b2 = await AL.sb.from('link_sides')
            .update({ features: Object.keys(feats).length ? feats : null })
            .eq('id', sideId).select('id');
          if (b2.error) throw b2.error;
          close({ preset: preset, features: Object.keys(feats).length ? feats : null });
        } catch (e) {
          console.error(e);
          var err = document.createElement('div'); err.className = 'pk-err';
          err.textContent = e.message || String(e);
          sheet.appendChild(err);
          go.disabled = false;
        }
      });
      sheet.appendChild(go);
    }
    draw();
  });
};

/* ── 간단한 고르개 ──────────────────────────────────────────────────
   두세 가지 중에 하나 고를 때 씁니다.
     var v = await AL.pickOne([{key,label,note}, ...]);
     null 이면 닫은 것입니다.
------------------------------------------------------------------ */
AL.pickOne = function(items, title){
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
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    sheet.innerHTML = '<div class="grip"></div>';
    if (title) {
      var h = document.createElement('p'); h.className = 'pk-title';
      h.textContent = title; sheet.appendChild(h);
    }
    items.forEach(function(it){
      var card = document.createElement('div');
      card.className = 'roomchoice';
      var b = document.createElement('b'); b.textContent = it.label; card.appendChild(b);
      if (it.note) {
        var d = document.createElement('span'); d.textContent = it.note; card.appendChild(d);
      }
      card.addEventListener('click', function(){ close(it.key); });
      sheet.appendChild(card);
    });
  });
};

/* ── 사라지는 시간 고르개 ───────────────────────────────────────────
   메시지 하나에도, 대화방 전체에도 씁니다.
     var h = await AL.pickExpiry(현재값, '방인가');
     null      닫음
     0         안 사라짐
     숫자      그만큼 지나면 사라짐 (시간 단위, 메시지는 분 단위)
------------------------------------------------------------------ */
AL.EXPIRY_MSG  = [[0,'exOff'], [5/60,'ex5m'], [1,'ex1h'], [24,'ex1d'], [24*7,'ex7d']];
AL.EXPIRY_ROOM = [[0,'exOff'], [24,'ex1d'], [24*7,'ex7d'], [24*30,'ex30d']];

AL.expiryLabel = function(hours){
  var all = AL.EXPIRY_MSG.concat(AL.EXPIRY_ROOM);
  for (var i = 0; i < all.length; i++) {
    if (Math.abs(all[i][0] - hours) < 0.001) return AL.t(all[i][1]);
  }
  return String(hours) + 'h';
};

AL.pickExpiry = function(current, forRoom){
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
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    sheet.innerHTML = '<div class="grip"></div>';
    var h = document.createElement('p'); h.className = 'pk-title';
    h.textContent = AL.t(forRoom ? 'exRoom' : 'exMsgOnce');
    sheet.appendChild(h);

    if (forRoom) {
      var n = document.createElement('p'); n.className = 'pk-note';
      n.textContent = AL.t('exRoomNote');
      sheet.appendChild(n);
    }

    (forRoom ? AL.EXPIRY_ROOM : AL.EXPIRY_MSG).forEach(function(o){
      var b = document.createElement('button');
      b.className = 'pk-opt' + (Math.abs((current || 0) - o[0]) < 0.001 ? ' cur' : '');
      b.textContent = AL.t(o[1]);
      b.addEventListener('click', function(){ close(o[0]); });
      sheet.appendChild(b);
    });
  });
};

/* 알림줄 문구 — DB에는 열쇠만 담고 화면이 말로 바꿉니다.
   그래야 언어를 바꿔도 지난 알림줄까지 같이 바뀝니다. */
AL.systemText = function(raw){
  var v;
  try { v = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return raw; }
  if (!v || !v.k) return String(raw || '');
  var who = v.mine ? AL.t('sysYou') : (v.who || '');
  if (v.k === 'sysAutoDelOn')
    return AL.t('sysAutoDelOn', { who: who, label: AL.expiryLabel(v.hours) });
  if (v.k === 'sysAutoDelOff')
    return AL.t('sysAutoDelOff', { who: who });
  return AL.t(v.k, v);
};

/* 글 속의 첫 주소 하나 */
AL.firstUrl = function(text){
  if (!text) return null;
  var m = String(text).match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0] : null;
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

/* ── 🔴 실시간 채널에 새 토큰 물려주기 ─────────────────────────────
   함정 ⑥ — 토큰은 한 시간쯤이면 만료됩니다.
   보내기(callFn)는 매번 getSession() 으로 새 토큰을 읽어서 괜찮은데,
   실시간 채널은 처음 붙을 때의 토큰을 그대로 쥐고 있습니다.
   만료되면 조용히 끊기고 다시 안 붙습니다.

   실제로 여섯 시간짜리 대화에서 양쪽 다 상대 메시지를 못 받았습니다.
   자기가 보낸 것만 보여서 겉으로는 멀쩡해 보입니다.
------------------------------------------------------------------ */
AL._lastToken = null;

AL.sb.auth.onAuthStateChange(function(_event, session){
  if (session && session.access_token) {
    AL._lastToken = session.access_token;
    try { AL.sb.realtime.setAuth(session.access_token); } catch (e) {}
  }
});

/* 지금 토큰을 실시간에 한 번 물려줍니다(첫 진입용) */
AL.syncRealtimeAuth = async function(){
  try {
    var sess = await AL.sb.auth.getSession();
    if (sess.data.session) {
      // ⚠ 창을 닫을 때는 getSession 을 기다릴 수 없습니다. 미리 담아둡니다.
      AL._lastToken = sess.data.session.access_token;
      AL.sb.realtime.setAuth(sess.data.session.access_token);
    }
  } catch (e) {}
};

/* ── 알림 설정 ──────────────────────────────────────────────────────
   소리·진동을 켜고 끕니다. 이 기기에만 저장됩니다.
------------------------------------------------------------------ */
AL.PREF_KEY = 'alias_prefs_v1';

AL.prefs = function(){
  try {
    var raw = localStorage.getItem(AL.PREF_KEY);
    var p = raw ? JSON.parse(raw) : {};
    return { sound: p.sound !== false, vibrate: p.vibrate !== false };
  } catch (e) { return { sound: true, vibrate: true }; }
};

AL.setPref = function(key, on){
  var p = AL.prefs();
  p[key] = !!on;
  try { localStorage.setItem(AL.PREF_KEY, JSON.stringify(p)); } catch (e) {}
  return p;
};

/* 딩동. 소리 파일 없이 브라우저가 직접 냅니다.
   ⚠ 브라우저 규칙상 손님이 화면을 한 번 누르기 전에는 소리가 안 납니다.
     막을 방법이 없어 설정 화면에 그렇게 적어뒀습니다. */
AL.ding = function(){
  if (!AL.prefs().sound) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    var ctx = new Ctx();
    var t0 = ctx.currentTime;
    [880, 1244].forEach(function(freq, i){
      var at = t0 + i * 0.13;
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(at); osc.stop(at + 0.35);
    });
    setTimeout(function(){ try { ctx.close(); } catch (e) {} }, 900);
  } catch (e) { /* 소리가 안 나도 대화에는 지장 없습니다 */ }
};

/* 진동. ⚠ iOS 사파리는 지원하지 않습니다. */
AL.buzz = function(){
  if (!AL.prefs().vibrate) return;
  try { if (navigator.vibrate) navigator.vibrate([55, 45, 55]); } catch (e) {}
};

AL.alertNew = function(){ AL.ding(); AL.buzz(); };

/* ── 전화벨 ──────────────────────────────────────────────────────────
   받을 때까지 계속 울립니다. 한 번만 울리면 놓칩니다.
   ⚠ 소리 설정을 꺼둔 사람에게는 진동만 갑니다.
------------------------------------------------------------------ */
AL._ringTimer = null;

/* ── 통화연결음 ──────────────────────────────────────────────────────
   거는 쪽에도 소리가 나야 합니다. 아무 소리 없이 기다리면 답답하고,
   걸리고 있는 건지 멈춘 건지 알 수가 없습니다.

   ⚠ 받는 쪽 벨(딩동)과 달라야 합니다. 실제 전화기의 통화연결음은
     낮고 길게 울립니다. 한국 기준으로 1초 울리고 2초 쉽니다.
   ⚠ 소리 설정을 꺼두셨으면 안 납니다.
------------------------------------------------------------------ */
AL._dialTimer = null;
AL._dialCtx = null;

AL.startDialTone = function(){
  AL.stopDialTone();
  if (!AL.prefs().sound) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    AL._dialCtx = new Ctx();

    var beep = function(){
      if (!AL._dialCtx) return;
      var ctx = AL._dialCtx;
      var t0 = ctx.currentTime;
      // 낮은 두 음을 겹칩니다. 전화기 소리에 가깝습니다.
      [440, 480].forEach(function(freq){
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.04);
        gain.gain.setValueAtTime(0.07, t0 + 0.95);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + 1.05);
      });
    };

    beep();
    AL._dialTimer = setInterval(beep, 3000);   // 1초 울리고 2초 쉼
  } catch (e) { /* 소리가 안 나도 통화에는 지장 없습니다 */ }
};

AL.stopDialTone = function(){
  if (AL._dialTimer) { clearInterval(AL._dialTimer); AL._dialTimer = null; }
  if (AL._dialCtx) { try { AL._dialCtx.close(); } catch (e) {} AL._dialCtx = null; }
};

/* 🔴🔴 2026-09-10 고침 두 가지

   ① 45초 시계에 손잡이를 안 달았습니다.
      전에는 setTimeout 을 그냥 던져두어서, 45초 안에 다음 전화가 오면
      "앞 전화의 45초" 가 뒤늦게 터져 **새 전화의 벨을 꺼버렸습니다.**
      이제 손잡이를 붙들고 stopRinging 에서 같이 끕니다.

   ② 앱에서는 소리를 두 번 냅니다 (함정 3-2 의 정체).
      앱에서는 안드로이드가 알림 채널의 **진짜 벨소리**를 먼저 울립니다.
      그런데 통화화면이 열리면 여기서 **알림음(딩동)** 을 또 2.4초마다
      냅니다. 손님 귀에는 "크게 서너 번 울리다 모기소리로 작아진다" 로
      들립니다. 폰이 앱을 재우는 게 아니었습니다.
      → 앱에서는 quiet 로 불러서 진동만 하게 합니다.
        브라우저에서는 알림 채널이 없으니 그대로 소리를 냅니다. */
AL._ringStop = null;
AL._ringCtx = null;

/* 🔴🔴 2026-09-12 신설 — 진짜 전화벨

   왜 필요한가
     전에는 걸려온 전화에 AL.alertNew()(딩동)를 썼습니다. 그건 메시지
     알림음이라 짧고 작습니다. 손님이 "모기소리" 라고 하셨습니다.

     2026-09-12 에 USE_FULL_SCREEN_INTENT 권한을 넣자, 전화가 오면
     통화화면이 **즉시** 열리게 됐습니다. 그때 안드로이드 알림이
     지워지면서 알림 채널의 벨도 같이 멎습니다(함정 65).
     그러면 소리를 낼 사람이 화면밖에 없습니다.

   그래서 여기서 제대로 된 벨을 만듭니다.
     440Hz + 480Hz 를 겹쳐 "따르릉" 두 번, 그리고 쉼.
     예전 전화기 벨소리가 이 두 음입니다.

   ⚠ 소리 상자(AudioContext)를 하나만 만들어 계속 씁니다.
     울릴 때마다 새로 만들면 폰이 버거워합니다.
   ⚠ 소리가 막히면(자동재생 정책) 진동이라도 납니다. */
AL.ringTone = function(){
  if (!AL.prefs().sound) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!AL._ringCtx) AL._ringCtx = new Ctx();
    var ctx = AL._ringCtx;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }

    var t0 = ctx.currentTime;
    [0, 0.55].forEach(function(off){          // 따르릉 두 번
      var at = t0 + off;
      [440, 480].forEach(function(f){
        var osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.30, at + 0.03);
        g.gain.setValueAtTime(0.30, at + 0.38);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.46);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(at); osc.stop(at + 0.5);
      });
    });
  } catch (e) { /* 소리가 안 나도 진동은 납니다 */ }
};

/* 🔴 2026-09-11 고침 두 가지

   ① 45초 시계에 손잡이를 안 달았습니다.
      전에는 setTimeout 을 그냥 던져두어서, 45초 안에 다음 전화가 오면
      "앞 전화의 45초" 가 뒤늦게 터져 새 전화의 벨을 꺼버렸습니다.

   ② 2026-09-12 — quiet 는 이제 거의 안 씁니다.
      통화화면이 열릴 때 안드로이드 알림을 바로 지우므로 소리가 겹치지
      않습니다. 그래서 화면이 마음껏 울려도 됩니다(함정 59 해소). */
AL.startRinging = function(opts){
  AL.stopRinging();
  var quiet = !!(opts && opts.quiet);

  var beat = function(){
    if (!quiet) AL.ringTone();
    try { if (navigator.vibrate) navigator.vibrate([500, 220, 500]); } catch (e) {}
  };

  beat();
  AL._ringTimer = setInterval(beat, 2400);
  // 안 받으면 45초 뒤 저절로 멎습니다. 영영 울리면 곤란합니다.
  AL._ringStop = setTimeout(AL.stopRinging, 45000);
};

AL.stopRinging = function(){
  if (AL._ringTimer) { clearInterval(AL._ringTimer); AL._ringTimer = null; }
  if (AL._ringStop) { clearTimeout(AL._ringStop); AL._ringStop = null; }
  if (AL._ringCtx) { try { AL._ringCtx.close(); } catch (e) {} AL._ringCtx = null; }
  try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {}
};

/* ── 새 메시지 엿듣기 ───────────────────────────────────────────────
   messages 표의 변화를 직접 듣습니다(블록 20). 채널 하나로 모든 링크를
   덮습니다. RLS가 걸러주므로 내 링크의 것만 옵니다.

   ⚠ 대화창의 broadcast 와는 별개입니다. 그쪽은 그 방 안에서만 씁니다.
   ⚠ 3단계에서 진짜 푸시가 붙으면 이 자리는 "앱이 켜져 있을 때"용으로 남습니다.
------------------------------------------------------------------ */
AL.watchMessages = function(onInsert){
  var ch = null;
  var tries = 0;

  function connect(){
    if (ch) { try { AL.sb.removeChannel(ch); } catch (e) {} }
    ch = AL.sb.channel('my-messages-' + Date.now())
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          function(e){ if (e && e.new) onInsert(e.new); })
      .subscribe(function(status){
        if (status === 'SUBSCRIBED') { tries = 0; return; }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // 끊기면 다시 붙습니다. 점점 뜸하게 시도해서 서버를 두드리지 않습니다.
          tries++;
          setTimeout(connect, Math.min(30000, 2000 * tries));
        }
      });
  }

  AL.syncRealtimeAuth().then(connect);

  // 다른 탭에 갔다 오면 그 사이 끊겼을 수 있어 한 번 더 붙입니다.
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') AL.syncRealtimeAuth().then(connect);
  });

  return { stop: function(){ if (ch) { try { AL.sb.removeChannel(ch); } catch (e) {} } } };
};

/* ── 모양(테마) ─────────────────────────────────────────────────────
   <html> 에 표를 붙이면 alias_theme.css 가 알아서 색을 갈아끼웁니다.

   ⚠ 계정에 저장합니다. 폰과 PC에서 같은 모양이 나와야 하니까요.
     (소리·진동은 기기마다 다른 게 맞아서 localStorage 에 둡니다)
   ⚠ 서버 응답을 기다리면 화면이 잠깐 기본색으로 번쩍입니다.
     그래서 기기에도 한 벌 남겨두고, 그것으로 먼저 칠합니다.
------------------------------------------------------------------ */
AL.THEME_KEY = 'alias_theme_v1';
AL.THEME_DEFAULT = { mode:'dark', color:'midnight', bubble:'round', scene:'none' };

AL.readThemeCache = function(){
  try {
    var raw = localStorage.getItem(AL.THEME_KEY);
    return raw ? Object.assign({}, AL.THEME_DEFAULT, JSON.parse(raw)) : Object.assign({}, AL.THEME_DEFAULT);
  } catch (e) { return Object.assign({}, AL.THEME_DEFAULT); }
};

/* 표를 붙입니다. mode 가 auto 면 기기 설정을 따릅니다. */
AL.applyTheme = function(t){
  t = Object.assign({}, AL.THEME_DEFAULT, t || {});
  var mode = t.mode;
  if (mode === 'auto') {
    mode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
      ? 'light' : 'dark';
  }
  var el = document.documentElement;
  el.setAttribute('data-mode', mode);
  el.setAttribute('data-color', t.color);
  el.setAttribute('data-bubble', t.bubble);
  AL.paintScene(t.scene);
  return t;
};

/* 계절 그림 — 떨어지는 것만으로는 밋밋합니다.
   ⚠ 그림 파일을 안 씁니다. 도형으로 그려서 테마 색을 따르게 합니다.
     파일을 받아오면 느리고, 색이 테마와 안 맞습니다. */
AL.SCENE_PROPS = {
  snow: [
    /* 눈사람 */
    { w: 70, h: 96, x: 8, svg:
      '<circle cx="35" cy="70" r="24" fill="currentColor"/>' +
      '<circle cx="35" cy="38" r="17" fill="currentColor"/>' +
      '<circle cx="35" cy="16" r="12" fill="currentColor"/>' +
      '<rect x="20" y="4" width="30" height="4" fill="currentColor"/>' +
      '<rect x="26" y="-6" width="18" height="12" fill="currentColor"/>' +
      '<path d="M18 36 L2 24 M52 36 L68 24" stroke="currentColor" stroke-width="3" fill="none"/>' },
    /* 썰매 */
    { w: 84, h: 44, x: 74, svg:
      '<path d="M6 34 h64 a8 8 0 0 1 8 8 h-8 M6 34 v-6 h58 v6" fill="none" stroke="currentColor" stroke-width="3"/>' +
      '<path d="M2 40 h74" stroke="currentColor" stroke-width="3"/>' +
      '<path d="M16 34 v6 M40 34 v6 M62 34 v6" stroke="currentColor" stroke-width="2"/>' },
    /* 침엽수 */
    { w: 56, h: 92, x: 88, svg:
      '<path d="M28 2 L46 34 H10 Z M28 24 L52 60 H4 Z M28 46 L58 84 H-2 Z" fill="currentColor"/>' +
      '<rect x="24" y="82" width="8" height="10" fill="currentColor"/>' },
  ],
  rain: [
    /* 우산 */
    { w: 78, h: 92, x: 10, svg:
      '<path d="M4 40 a35 35 0 0 1 70 0 Z" fill="currentColor"/>' +
      '<path d="M39 40 v40 a10 10 0 0 0 20 0" fill="none" stroke="currentColor" stroke-width="4"/>' },
    /* 웅덩이 */
    { w: 120, h: 18, x: 62, svg:
      '<ellipse cx="60" cy="12" rx="58" ry="7" fill="currentColor"/>' },
    /* 장화 */
    { w: 44, h: 52, x: 88, svg:
      '<path d="M10 2 h18 v30 h12 a6 6 0 0 1 6 6 v10 H10 Z" fill="currentColor"/>' },
  ],
  petals: [
    /* 벚나무 가지 */
    { w: 150, h: 78, x: 0, svg:
      '<path d="M0 6 q40 12 66 34 M22 12 q12 20 8 34 M52 26 q22 4 34 22 M86 44 q20 2 34 16" ' +
        'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="30" cy="46" r="6" fill="currentColor"/>' +
      '<circle cx="62" cy="36" r="5" fill="currentColor"/>' +
      '<circle cx="94" cy="56" r="6" fill="currentColor"/>' +
      '<circle cx="120" cy="62" r="4" fill="currentColor"/>' },
    /* 꽃잎 무더기 */
    { w: 100, h: 16, x: 70, svg:
      '<ellipse cx="20" cy="10" rx="18" ry="5" fill="currentColor"/>' +
      '<ellipse cx="56" cy="12" rx="22" ry="4" fill="currentColor"/>' +
      '<ellipse cx="86" cy="9" rx="13" ry="5" fill="currentColor"/>' },
  ],
  stars: [
    /* 능선 */
    { w: 260, h: 84, x: 0, svg:
      '<path d="M0 84 L46 26 L78 56 L120 8 L168 60 L206 32 L260 84 Z" fill="currentColor"/>' },
    /* 달 */
    { w: 58, h: 58, x: 78, y: 'top', svg:
      '<path d="M40 4 a26 26 0 1 0 14 46 a20 20 0 1 1 -14 -46 Z" fill="currentColor"/>' },
  ],
};

/* 눈·비·벚꽃·별. 조각을 뿌리고 그림을 놓습니다. CSS 가 움직입니다. */
AL.paintScene = function(kind){
  var old = document.querySelector('.scene');
  if (old) old.remove();
  if (!kind || kind === 'none') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var counts = { snow:34, rain:46, petals:20, stars:60 };
  var n = counts[kind] || 0;
  if (!n) return;

  var box = document.createElement('div');
  box.className = 'scene ' + kind;

  var html = '';
  for (var i = 0; i < n; i++) {
    var left = Math.random() * 100;
    if (kind === 'stars') {
      html += '<i style="left:' + left.toFixed(2) + '%;top:' + (Math.random()*55).toFixed(2) +
              '%;animation-duration:' + (1.6 + Math.random()*2.6).toFixed(2) +
              's;animation-delay:' + (Math.random()*3).toFixed(2) + 's"></i>';
    } else {
      var dur = kind === 'rain' ? (0.7 + Math.random()*0.7) : (7 + Math.random()*9);
      html += '<i style="left:' + left.toFixed(2) + '%;animation-duration:' + dur.toFixed(2) +
              's;animation-delay:-' + (Math.random()*dur).toFixed(2) +
              's;transform:scale(' + (0.6 + Math.random()*0.8).toFixed(2) + ')"></i>';
    }
  }

  // 바닥에 쌓인 것
  if (kind === 'snow' || kind === 'rain' || kind === 'petals') {
    html += '<div class="ground"></div>';
  }

  // 계절 그림
  (AL.SCENE_PROPS[kind] || []).forEach(function(p){
    var pos = (p.y === 'top')
      ? 'top:6%;right:' + (100 - p.x - 12) + '%;bottom:auto'
      : 'left:' + p.x + '%';
    html += '<span class="prop" style="' + pos + '">' +
      '<svg width="' + p.w + '" height="' + p.h + '" viewBox="0 0 ' + p.w + ' ' + p.h + '" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + p.svg + '</svg></span>';
  });

  box.innerHTML = html;
  document.body.appendChild(box);
};

/* 화면이 뜨자마자 부릅니다. 서버를 안 기다립니다. */
AL.bootTheme = function(){
  return AL.applyTheme(AL.readThemeCache());
};

/* 서버에서 읽어와 다시 칠합니다. */
AL.loadTheme = async function(){
  try {
    var res = await AL.sb.from('account_settings')
      .select('theme_mode, theme_color, bubble_style, scene, lang').maybeSingle();
    if (res.error || !res.data) return AL.readThemeCache();

    // 언어도 함께 맞춥니다. 다른 기기에서 바꿨을 수 있습니다.
    if (res.data.lang && res.data.lang !== AL.langPref) {
      AL.langPref = res.data.lang;
      AL.lang = AL.resolveLang(res.data.lang);
      try { localStorage.setItem(AL.LANG_KEY, res.data.lang); } catch (e) {}
      AL.paintText();
    }
    var t = {
      mode: res.data.theme_mode, color: res.data.theme_color,
      bubble: res.data.bubble_style, scene: res.data.scene,
    };
    try { localStorage.setItem(AL.THEME_KEY, JSON.stringify(t)); } catch (e) {}
    return AL.applyTheme(t);
  } catch (e) { return AL.readThemeCache(); }
};

AL.saveTheme = async function(t){
  AL.applyTheme(t);
  try { localStorage.setItem(AL.THEME_KEY, JSON.stringify(t)); } catch (e) {}
  var sess = await AL.sb.auth.getSession();
  var uid = sess.data.session ? sess.data.session.user.id : null;
  if (!uid) return;
  var res = await AL.sb.from('account_settings').upsert({
    account_id: uid,
    theme_mode: t.mode, theme_color: t.color,
    bubble_style: t.bubble, scene: t.scene,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'account_id' });
  if (res.error) throw res.error;
};

/* 대화방이 자기 것을 갖고 있으면 그것으로 덮어씁니다. 비어 있으면 계정 기본. */
AL.applyLinkTheme = function(v){
  var base = AL.readThemeCache();
  AL.applyTheme({
    mode:   v.theme_mode   || base.mode,
    color:  v.theme_color  || base.color,
    bubble: v.bubble_style || base.bubble,
    scene:  v.scene        || base.scene,
  });
};

/* ── 방별 모양 고르개 ───────────────────────────────────────────────
   나 화면의 것과 같은 모양인데, 맨 위에 "내 기본 따르기"가 하나 더 있습니다.

     var picked = await AL.pickLinkTheme(current);
     picked === null            닫음
     picked === 'reset'         내 기본을 따르기로 함
     picked === {mode,color,…}  이 방만 이렇게

   ⚠ 고르는 즉시 화면이 바뀝니다. 미리보기를 따로 안 봐도 됩니다.
------------------------------------------------------------------ */
AL.THEME_OPTS = {
  mode:   [['dark','thDark'], ['light','thLight'], ['auto','thAuto']],
  color:  [['midnight','thMidnight'], ['paper','thPaper'], ['forest','thForest'],
           ['dusk','thDusk'], ['ink','thInk'],
           ['pitch','thPitch'], ['abyss','thAbyss'],
           ['midnite','thMidnite'], ['charcoal','thCharcoal'],
           ['bluegrey','thBluegrey'], ['sage','thSage'],
           ['sand','thSand'], ['clay','thClay'],
           ['bluegrey2','thBluegrey2'], ['sage2','thSage2']],
  bubble: [['round','thRound'], ['square','thSquare'], ['tail','thTail'], ['outline','thOutline']],
  scene:  [['none','thNone'], ['snow','thSnow'], ['rain','thRain'],
           ['petals','thPetals'], ['stars','thStars']],
};

AL.pickLinkTheme = function(current){
  return new Promise(function(resolve){
    var base = AL.readThemeCache();
    var cur = {
      mode:   (current && current.mode)   || base.mode,
      color:  (current && current.color)  || base.color,
      bubble: (current && current.bubble) || base.bubble,
      scene:  (current && current.scene)  || base.scene,
    };
    var custom = !!(current && (current.mode || current.color || current.bubble || current.scene));

    var bg = document.createElement('div'); bg.className = 'pk-bg';
    var sheet = document.createElement('div'); sheet.className = 'pk';
    document.body.appendChild(bg); document.body.appendChild(sheet);

    var done = false;
    function close(val){
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      bg.remove(); sheet.remove();
      // 닫기만 했으면 원래대로 되돌립니다.
      if (val === null) AL.applyLinkTheme(current ? {
        theme_mode: current.mode, theme_color: current.color,
        bubble_style: current.bubble, scene: current.scene,
      } : {});
      resolve(val);
    }
    function onKey(e){ if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function(){ close(null); });

    function draw(){
      sheet.innerHTML = '';
      var grip = document.createElement('div'); grip.className = 'grip';
      sheet.appendChild(grip);

      var h = document.createElement('p'); h.className = 'pk-title';
      h.textContent = AL.t('thThisChat'); sheet.appendChild(h);
      var note = document.createElement('p'); note.className = 'pk-note';
      note.textContent = AL.t('thPerChatNote'); sheet.appendChild(note);

      var reset = document.createElement('button');
      reset.className = 'pk-opt' + (custom ? '' : ' cur');
      reset.textContent = AL.t('thFollowMine');
      reset.addEventListener('click', function(){ close('reset'); });
      sheet.appendChild(reset);

      var sep = document.createElement('div'); sep.className = 'pk-sep';
      sheet.appendChild(sep);

      Object.keys(AL.THEME_OPTS).forEach(function(kind){
        var lab = document.createElement('p');
        lab.className = 'pk-note';
        lab.style.margin = '0 0 7px';
        lab.textContent = AL.t({ mode:'thMode', color:'thColor',
                                 bubble:'thBubble', scene:'thScene' }[kind]);
        sheet.appendChild(lab);

        var row = document.createElement('div');
        row.className = 'swatches';
        row.style.marginBottom = '16px';
        AL.THEME_OPTS[kind].forEach(function(o){
          var b = document.createElement('button');
          b.className = 'sw sw-' + o[0] + (cur[kind] === o[0] ? ' on' : '');
          if (kind === 'color') {
            var d = document.createElement('span'); d.className = 'dot'; b.appendChild(d);
          }
          b.appendChild(document.createTextNode(AL.t(o[1])));
          b.addEventListener('click', function(){
            cur[kind] = o[0];
            custom = true;
            AL.applyTheme(cur);     // 고르는 즉시 보입니다
            draw();
          });
          row.appendChild(b);
        });
        sheet.appendChild(row);
      });

      var go = document.createElement('button');
      go.className = 'pk-go';
      go.style.width = '100%';
      go.textContent = AL.t('save') || '저장';
      go.addEventListener('click', function(){ close(cur); });
      sheet.appendChild(go);
    }

    AL.applyTheme(cur);
    draw();
  });
};

/* ── 데이터 아끼기 ──────────────────────────────────────────────────
   ⚠ 손님이 모르고 쓰다가 요금을 보면 그때 앱을 지웁니다.
     얼마나 썼는지 보여주고, 아낄 방법을 고를 수 있어야 합니다.

   ⚠ 브라우저는 "와이파이인가" 를 정확히 알려주지 않습니다.
     navigator.connection 이 있는 기기에서만 압니다(안드로이드 크롬 등).
     모르면 막지 않습니다. 잘못 막는 것보다 낫습니다.
------------------------------------------------------------------ */
AL.DATA_DEFAULT = {
  video_wifi_only: true, low_bitrate: false,
  media_wifi_only: false, warn_mb: 500,
};

AL.dataPrefs = Object.assign({}, AL.DATA_DEFAULT);

AL.loadDataPrefs = async function(){
  try {
    var res = await AL.sb.from('account_settings')
      .select('video_wifi_only, low_bitrate, media_wifi_only, warn_mb').maybeSingle();
    if (res.data) AL.dataPrefs = Object.assign({}, AL.DATA_DEFAULT, res.data);
  } catch (e) {}
  return AL.dataPrefs;
};

AL.saveDataPref = async function(key, val){
  AL.dataPrefs[key] = val;
  var sess = await AL.sb.auth.getSession();
  var uid = sess.data.session ? sess.data.session.user.id : null;
  if (!uid) return;
  var patch = { account_id: uid, updated_at: new Date().toISOString() };
  patch[key] = val;
  var res = await AL.sb.from('account_settings').upsert(patch, { onConflict: 'account_id' });
  if (res.error) throw res.error;
};

/* 지금 와이파이인가. 모르면 null 을 돌려줍니다(막지 않습니다). */
AL.onWifi = function(){
  var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c || !c.type) return null;
  return c.type === 'wifi' || c.type === 'ethernet';
};

/* 이번 달 쓴 양 */
AL.dataUsage = async function(days){
  try {
    var res = await AL.sb.rpc('my_data_usage', { p_days: days || 30 });
    return (res.data || [])[0] || null;
  } catch (e) { return null; }
};

/* ── 앱 전체 알림 ───────────────────────────────────────────────────
   어느 화면에 있든 새 메시지가 오면 소리·진동이 납니다.
   화면마다 따로 붙이면 화면을 하나 더 만들 때마다 잊습니다. 여기 한 번만 둡니다.

   쓰는 법 — 화면에서 AL.startAlerts() 한 줄이면 됩니다.
     연락처·대화처럼 자기가 직접 처리하는 화면은 onMessage 를 넘겨 가로챕니다.

   ⚠ 브라우저를 떠나면(다른 앱을 쓰면) 이건 못 돕니다.
     그건 웹푸시(2단계)와 FCM(3단계)의 일입니다.
------------------------------------------------------------------ */
AL._alertWatcher = null;
AL._mySideIds = [];
AL._lastSeenTotal = null;

/* 많이 썼으면 한 번 알려줍니다.
   ⚠ 하루에 한 번만. 볼 때마다 뜨면 성가십니다. */
AL.checkDataWarn = async function(){
  try {
    await AL.loadDataPrefs();
    if (!AL.dataPrefs.warn_mb) return;
    var key = 'alias_data_warned';
    var today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key) === today) return;

    var u = await AL.dataUsage(30);
    if (!u) return;
    var mb = Number(u.total_bytes || 0) / 1024 / 1024;
    if (mb < AL.dataPrefs.warn_mb) return;

    localStorage.setItem(key, today);
    alert(AL.t('dtOverWarn', { used: AL.fmtBytes(u.total_bytes) }));
  } catch (e) {}
};

AL.startAlerts = function(opts){
  opts = opts || {};
  if (AL._alertWatcher) return;   // 한 화면에 두 번 붙지 않게

  AL.checkDataWarn();

  /* ⚠ 2026-09-08: 앱에서 열렸으면 기기 번호를 등록합니다.
     startAlerts 는 거의 모든 화면이 부르므로 여기 붙이면 빠짐이 없습니다.
     브라우저에서는 registerPush 가 스스로 아무 일도 안 하고 돌아옵니다.
     한 번만 하면 되므로 자물쇠를 하나 둡니다. */
  if (!AL._pushTried) {
    AL._pushTried = true;
    AL.registerPush().catch(function(){});
  }

  // 내 side id 를 알아둬야 "내가 보낸 것"을 걸러낼 수 있습니다.
  AL.sb.rpc('my_contacts').then(function(res){
    var rows = (res && res.data) || [];
    AL._mySideIds = rows.map(function(r){ return r.my_side_id; });
    AL._lastSeenTotal = rows.reduce(function(a, r){ return a + (r.unread || 0); }, 0);
  }).catch(function(){});

  AL._alertWatcher = AL.watchMessages(function(m){
    if (AL._mySideIds.indexOf(m.sender_side_id) >= 0) return;   // 내가 보낸 것
    if (opts.onMessage && opts.onMessage(m) === true) return;    // 화면이 직접 처리함
    AL.alertNew();
  });

  // ⚠ 실시간이 끊겨도 알아채게, 개수를 견주는 길을 하나 더 둡니다.
  //   함정 ㉚ — 실시간만 믿으면 조용히 못 받는 시간이 생깁니다.
  if (opts.poll !== false) {
    setInterval(function(){
      if (document.visibilityState !== 'visible') return;
      AL.sb.rpc('my_contacts').then(function(res){
        var rows = (res && res.data) || [];
        AL._mySideIds = rows.map(function(r){ return r.my_side_id; });
        var total = rows.reduce(function(a, r){ return a + (r.unread || 0); }, 0);
        if (AL._lastSeenTotal !== null && total > AL._lastSeenTotal) {
          if (!opts.onCount || opts.onCount(total) !== true) AL.alertNew();
        }
        AL._lastSeenTotal = total;
        if (opts.onPoll) opts.onPoll(rows);
      }).catch(function(){});
    }, opts.pollMs || 20000);
  }
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


/* =====================================================================
   기기 등록 (FCM) — 2026-09-08 신설
   3단계: 안드로이드 잠금화면에서 전화를 받기 위한 준비입니다.

   하는 일은 하나입니다.
     앱에서 열렸으면 → Firebase 에 기기 번호를 달라고 해서 devices 표에 담습니다.
     브라우저에서 열렸으면 → 아무것도 안 하고 조용히 넘어갑니다.

   ⚠ 브라우저에서도 절대 오류가 나면 안 됩니다. PC 로 쓰는 분이 있습니다.
     그래서 모든 단계를 try 로 감싸고, 실패해도 화면은 그대로 돕니다.

   ⚠ 안드로이드 13부터는 알림도 마이크처럼 허락을 받아야 합니다.
     안 받으면 아무 소리 없이 푸시가 안 옵니다. 그래서 먼저 물어봅니다.
------------------------------------------------------------------ */

/* 지금 앱 안인가, 브라우저인가 */
AL.isNativeApp = function(){
  try {
    return !!(window.Capacitor &&
              typeof window.Capacitor.isNativePlatform === 'function' &&
              window.Capacitor.isNativePlatform());
  } catch (e) { return false; }
};

AL.pushPlatform = function(){
  try {
    var p = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform();
    return p || 'web';
  } catch (e) { return 'web'; }
};

/* 같은 기기를 두 번 담지 않게, 이 기기가 쓰는 devices 줄의 id 를 적어둡니다. */
AL.DEVICE_ID_KEY = 'alias_device_row_id';

/* Firebase 가 준 기기 번호를 devices 표에 담습니다.
   ⚠ 기기 번호는 앱을 지웠다 깔거나 한참 안 쓰면 바뀝니다.
     그래서 켤 때마다 저장합니다. 같은 줄을 고쳐 쓰므로 쌓이지 않습니다. */
/* 🔴 2026-09-15 — 마지막 실패 이유를 적어둡니다.
   콘솔에만 남기면 USB 를 꽂아야 알 수 있습니다. 화면에 보여주려면
   어딘가에 남겨야 합니다(함정 76·89). */
AL._pushErr = '';

AL.savePushToken = async function(token, platform){
  if (!token) { AL._pushErr = '기기 번호가 비어 있습니다'; return false; }
  try {
    var sess = await AL.sb.auth.getSession();
    if (!sess.data.session) return false;

    /* 🔴🔴 2026-09-15 — claim_device() 하나로 끝냅니다.

       왜 서버 함수로 옮겼나
         기기 번호는 **계정이 아니라 폰에 붙습니다.** 폰 하나로 계정을
         바꾸면, 그 번호는 옛 계정 줄에 물려 있습니다. 새 계정으로
         같은 번호를 넣으려 하면 표가 거절합니다.

           duplicate key value violates unique constraint
           "devices_push_token_uq"

         그러면 **새 계정은 영영 전화를 못 받습니다.** 조용히요.
         2026-09-15 에 실제로 났습니다.

         남의 줄을 고치는 일이라 손님 권한으로는 못 합니다. 정책이
         "내 줄만" 으로 막고 있고, 그게 맞습니다. 그래서 서버 함수가
         대신 합니다(security definer).

       함수가 하는 일
         그 번호를 가진 줄이 있으면 → 주인을 나로 바꿉니다
         없으면                    → 새로 만듭니다

       ⚠ 옛 주인은 더 이상 그 폰을 안 씁니다. 가져오는 것이 맞습니다.
       ⚠ 이 함수 하나로 "찾기 · 고치기 · 넣기" 가 다 됩니다. 화면에서
         여러 갈래로 나누면 그 사이에 또 구멍이 생깁니다. */
    var res = await AL.sb.rpc('claim_device', {
      p_token: token,
      p_platform: platform || 'web',
    });
    if (res.error) {
      /* 🔴 2026-09-15 — 어느 코드가 도는지 구별되게 표를 붙입니다.
         옛 판과 새 판의 오류 문구가 똑같아서, 파일이 안 올라간 건지
         함수가 실패한 건지 알 수가 없었습니다. */
      AL._pushErr = '[claim] 기기 줄 저장 실패: ' +
        (res.error.message || res.error.code || '알 수 없음');
      console.error('[push] 🔴', AL._pushErr);
      return false;
    }

    AL._pushErr = '';
    try { localStorage.setItem(AL.DEVICE_ID_KEY, res.data); } catch (e) {}
    console.log('[push] 기기 줄을 저장했습니다');

    /* 🔴🔴 2026-09-16 — 계정이 바뀌었으면 한 번만 알려드립니다.

       기기 번호는 폰에 붙습니다. 계정을 바꾸면 전화도 따라옵니다.
       그러면 **옛 계정은 이 폰으로 전화를 못 받습니다.**

       ⚠ 이걸 안 알리면 손님은 옛 계정의 전화가 안 오는 줄도 모릅니다.
       ⚠ 같은 계정으로 다시 열 때마다 뜨면 귀찮습니다. 바뀔 때만 한 번. */
    try {
      var lastKey = 'alias_last_push_account';
      var last = localStorage.getItem(lastKey);
      var nowId = sess.data.session.user.id;
      if (last && last !== nowId) {
        var who = '';
        try {
          var me = await AL.sb.from('personas')
            .select('display_name').eq('is_default', true).maybeSingle();
          /* 기본 별칭이 있으면 그걸 쓰고, 없으면 닉네임을 씁니다.
             ⚠ 이 앱은 닉네임을 이메일 모양으로 바꿔 저장합니다.
               앞부분만 떼어내면 손님이 아는 이름이 됩니다. */
          var mail = (sess.data.session.user.email || '');
          who = (me.data && me.data.display_name) || mail.split('@')[0] || '';
        } catch (e) {}
        setTimeout(function(){ alert(AL.t('pshTook', { who: who })); }, 600);
      }
      localStorage.setItem(lastKey, nowId);
    } catch (e) {}

    /* 옛 줄 치우기는 그대로 둡니다. 30일 넘게 안 쓴 것과, 이 계정에
       너무 많이 쌓인 것을 정리합니다. 실패해도 그냥 넘어갑니다. */
    try { await AL.sweepDevices(); } catch (e) {}
    return true;

  } catch (e) {
    AL._pushErr = '기기 줄 저장 실패: ' + (e.message || String(e));
    console.error('[push] 🔴', AL._pushErr);
    return false;
  }
};

/* 🔴 2026-09-15 — 옛 줄 치우기를 따로 뺐습니다.
   ⚠ 실패해도 통화에는 지장이 없습니다. 조용히 넘어갑니다.
   ⚠ DELETE 정책과 권한이 있어야 실제로 지워집니다. 없으면 아무 일도
     안 일어나는데, 오류도 안 납니다(함정 ⑦). */
AL.sweepDevices = async function(){
  try {
    var sess = await AL.sb.auth.getSession();
    if (!sess.data.session) return;
    var uid = sess.data.session.user.id;

    /* ① 30일 넘게 안 쓴 줄 */
    var old = new Date(Date.now() - 30 * 86400000).toISOString();
    await AL.sb.from('devices').delete()
      .eq('account_id', uid).lt('last_seen_at', old);

    /* ② 그래도 많으면 최근 다섯 줄만 남깁니다.
       폰을 다섯 대 넘게 쓰는 분은 거의 없습니다. */
    var mine = await AL.sb.from('devices')
      .select('id').eq('account_id', uid).order('last_seen_at', { ascending: false });
    var rows = mine.data || [];
    if (rows.length > 5) {
      var doomed = rows.slice(5).map(function(r){ return r.id; });
      await AL.sb.from('devices').delete().in('id', doomed);
    }
  } catch (e) { /* 못 치워도 통화는 됩니다 */ }
};

/* 앱이 켜질 때 한 번 부릅니다. 브라우저면 아무 일도 안 합니다. */
AL.registerPush = async function(){
  if (!AL.isNativeApp()) return false;

  var PN = null;
  try {
    PN = window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
  } catch (e) {}
  if (!PN) {
    AL._pushErr = '푸시 플러그인이 없습니다 (APK 를 다시 만들어야 할 수 있습니다)';
    console.warn('[push] 🔴', AL._pushErr);
    return false;
  }

  try {
    /* 알림을 받아도 되는지 먼저 묻습니다. */
    var perm = await PN.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PN.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      AL._pushErr = '알림 권한이 거부되었습니다 (' + String(perm.receive) + ')';
      console.warn('[push] 🔴', AL._pushErr);
      return false;
    }

    /* 번호를 받으면 registration 이 불립니다. 실패하면 registrationError 입니다.
       ⚠ 듣는 귀를 먼저 달고 register() 를 불러야 합니다.
         순서가 바뀌면 번호가 와도 못 받습니다. */
    PN.addListener('registration', function(t){
      var tok = t && (t.value || t.token);
      console.log('[push] 기기 번호를 받았습니다 (' + String(tok).slice(0, 12) + '…)');
      AL._pushErr = '';
      AL.savePushToken(tok, AL.pushPlatform());
    });

    PN.addListener('registrationError', function(err){
      /* 🔴 2026-09-15 — 구글이 번호를 안 준 이유를 남깁니다.
         google-services.json 이 안 맞거나, 구글 서비스가 없는 폰이면
         여기로 옵니다. */
      AL._pushErr = 'Firebase 가 번호를 안 줍니다: ' +
        String((err && (err.error || err.message)) || JSON.stringify(err)).slice(0, 160);
      console.error('[push] 🔴', AL._pushErr);
    });

    /* 앱이 켜져 있을 때 알림이 오면 여기로 옵니다. */
    PN.addListener('pushNotificationReceived', function(n){
      console.log('[push] 알림이 왔습니다', n);
      try { AL.alertNew && AL.alertNew(); } catch (e) {}
    });

    /* 잠금화면의 알림을 눌러서 들어온 경우입니다.
       ⚠ 여기가 3단계의 핵심입니다. 알림을 누르면 통화 화면으로 갑니다. */
    PN.addListener('pushNotificationActionPerformed', function(a){
      try {
        var d = (a && a.notification && a.notification.data) || {};
        if (!d.link_id) return;

        /* 🔴 2026-09-09: 알림 종류에 따라 갈 곳이 다릅니다.
             gcall    여럿이 하는 통화 → 방으로 들어갑니다
             call     1:1 전화        → 받는 화면으로 갑니다
             missed   부재중          → 통화 화면으로 가면 안 됩니다.
                                        이미 끝난 전화라 대화로 보냅니다.
           ⚠ kind 를 먼저 봐야 합니다. call_id 만 보고 갈라면
             부재중 알림을 눌렀을 때도 통화 화면으로 갑니다. */
        if (d.kind === 'gcall') {
          location.href = 'alias_gcall.html?link=' + encodeURIComponent(d.link_id) +
            '&type=' + encodeURIComponent(d.call_type || 'voice');

        } else if (d.kind === 'call' && d.call_id) {
          /* 🔴 2026-09-10 — 자바(MainActivity.openCallIfAsked)도 똑같은 일을 합니다.
             둘이 겹치면 이미 들어간 통화화면에서 도로 튕겨나갑니다.
             그 통화의 화면에 이미 있으면 아무 것도 하지 않습니다. */
          if (location.pathname.indexOf('alias_call.html') >= 0 &&
              location.search.indexOf('call=' + d.call_id) >= 0) {
            console.log('[push] 이미 그 통화 화면입니다. 그냥 둡니다.');
            return;
          }
          location.href = 'alias_call.html?call=' + encodeURIComponent(d.call_id) +
            '&token=' + encodeURIComponent(d.session_token || '') +
            '&link=' + encodeURIComponent(d.link_id) +
            '&type=' + encodeURIComponent(d.call_type || 'voice') +
            '&once=' + encodeURIComponent(d.call_id);

        } else {
          location.href = 'alias_chat.html?link=' + encodeURIComponent(d.link_id);
        }
      } catch (e) { console.error('[push] 알림 누름 처리 실패', e); }
    });

    await PN.register();
    return true;

  } catch (e) {
    console.warn('[push] 준비 실패 — 앱은 그대로 씁니다', e);
    return false;
  }
};

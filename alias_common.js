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
  save:       { kr:'저장', en:'Save' },
  close:      { kr:'닫기', en:'Close' },
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

/* ── 🔴 실시간 채널에 새 토큰 물려주기 ─────────────────────────────
   함정 ⑥ — 토큰은 한 시간쯤이면 만료됩니다.
   보내기(callFn)는 매번 getSession() 으로 새 토큰을 읽어서 괜찮은데,
   실시간 채널은 처음 붙을 때의 토큰을 그대로 쥐고 있습니다.
   만료되면 조용히 끊기고 다시 안 붙습니다.

   실제로 여섯 시간짜리 대화에서 양쪽 다 상대 메시지를 못 받았습니다.
   자기가 보낸 것만 보여서 겉으로는 멀쩡해 보입니다.
------------------------------------------------------------------ */
AL.sb.auth.onAuthStateChange(function(_event, session){
  if (session && session.access_token) {
    try { AL.sb.realtime.setAuth(session.access_token); } catch (e) {}
  }
});

/* 지금 토큰을 실시간에 한 번 물려줍니다(첫 진입용) */
AL.syncRealtimeAuth = async function(){
  try {
    var sess = await AL.sb.auth.getSession();
    if (sess.data.session) AL.sb.realtime.setAuth(sess.data.session.access_token);
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

/* 눈·비·벚꽃·별. 조각을 몇 개 뿌리고 CSS 가 움직입니다. */
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
      html += '<i style="left:' + left.toFixed(2) + '%;top:' + (Math.random()*100).toFixed(2) +
              '%;animation-duration:' + (1.6 + Math.random()*2.6).toFixed(2) +
              's;animation-delay:' + (Math.random()*3).toFixed(2) + 's"></i>';
    } else {
      var dur = kind === 'rain' ? (0.7 + Math.random()*0.7) : (7 + Math.random()*9);
      html += '<i style="left:' + left.toFixed(2) + '%;animation-duration:' + dur.toFixed(2) +
              's;animation-delay:-' + (Math.random()*dur).toFixed(2) +
              's;transform:scale(' + (0.6 + Math.random()*0.8).toFixed(2) + ')"></i>';
    }
  }
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
           ['dusk','thDusk'], ['ink','thInk']],
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

AL.startAlerts = function(opts){
  opts = opts || {};
  if (AL._alertWatcher) return;   // 한 화면에 두 번 붙지 않게

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

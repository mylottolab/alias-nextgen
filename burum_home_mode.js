/* =====================================================================
   부름 · 누름 첫 화면 고르기 (2026-11-22) — ☎ 다이얼 첫 화면
   · 'classic' = 지금 첫 화면(부름: 연락처 · 번호판 / 누름: 내 라인들)   · 'dial' = 큰 다이얼 첫 화면
       부름 → burum_home_dial.html   누름만 쓰는 분 → nureum_home_dial.html
   · 모든 분을 한 번에 바꾸려면 아래 ALL 만 'dial' 로, 되돌리려면 'classic' 으로 (앱 업데이트 필요 없음)
   · 이 폰만 시험: burum_home_dial.html?try=1 (누름은 nureum_home_dial.html?try=1) 을 한 번 열기
     다이얼 화면 아래 [예전 첫 화면으로] 를 누르면 이 폰은 바로 원래대로.
   ===================================================================== */
(function(){
  var ALL = 'dial';   // 2026-11-22 개편 — 다이얼 첫 화면(되돌리려면 'classic')   // ← 전체 전환 스위치: 'classic' | 'dial'
  var m = ALL;
  try { var l = localStorage.getItem('burum_home_mode'); if (l === 'dial' || l === 'classic') m = l; } catch (e) {}
  window.BURUM_HOME = m;
  /* ⇆ 2026-11-24 부름 · 누름 갈림길 첫 화면(burum_home_split.html) — 모든 분은 SPLIT_ALL=true, 이 폰만: 갈림길 화면 ?try=1 / ?try=0
     앱을 열면 처음에: burum_start = 'split'(갈림길) | 'burum'(부름 다이얼) | 'nureum'(누름 다이얼) — 갈림길 화면 아래에서 고름 */
  var SPLIT_ALL = true;    // 2026-11-24 모든 분께 적용(되돌리려면 false)   ← 전체 전환 스위치
  var sp = SPLIT_ALL;
  try { var ls = localStorage.getItem('burum_split'); if (ls === '1') sp = true; if (ls === '0' && !SPLIT_ALL) sp = false; } catch (e) {}
  window.BURUM_SPLIT = sp; window.BURUM_SPLIT_ALL = SPLIT_ALL;
  try { localStorage.setItem('burum_split_on', sp ? '1' : '0'); } catch (e) {}   // 다른 화면 위쪽 [☎ 초기화면] 단추용
  window.BURUM_START = function(){ var v = 'split'; try { v = localStorage.getItem('burum_start') || 'split'; } catch (e) {} return /^(split|burum|nureum)$/.test(v) ? v : 'split'; };
  window.BURUM_HOME_ALL = ALL;
  try { localStorage.setItem('burum_home_active', m === 'dial' ? '1' : '0'); } catch (e) {}   // 다른 화면 위쪽 [☎ 다이얼] 단추용
})();

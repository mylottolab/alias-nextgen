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
  window.BURUM_HOME_ALL = ALL;
  try { localStorage.setItem('burum_home_active', m === 'dial' ? '1' : '0'); } catch (e) {}   // 다른 화면 위쪽 [☎ 다이얼] 단추용
})();

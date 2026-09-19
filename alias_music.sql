-- =====================================================================
-- Alias Next-Gen — 같이 듣기: 회사가 고른 곡
-- 2026-09-20
--
-- ⚠ Alias Next-Gen 프로젝트(azredlrnvsssfjytaotb)에서 한 문장씩 돌리세요.
--
-- 왜 필요한가
--   "같이 듣기" 에서 손님이 아무 음원이나 올릴 수 있었습니다.
--   이제 **회사가 고른 곡** 중에서만 고르게 합니다.
--   갤러리 배경음과 **같은 표(gallery_music)** 를 씁니다. 곡을 한 번
--   올리면 갤러리와 같이 듣기 양쪽에서 쓸 수 있습니다.
-- =====================================================================

-- ① 지금 어느 곡을 틀고 있는지 적어둘 칸
--
-- ⚠ 회사 곡은 tracks 에 안 담습니다. 공개 서랍에 있고 모두가 나눠
--   쓰니 방마다 복사할 이유가 없습니다. 어느 곡인지만 적어둡니다.
alter table links
  add column if not exists shared_music_id uuid references gallery_music(id);

-- ② 캐시 새로 읽기 (함정 114)
notify pgrst, 'reload schema';

-- ③ 확인
-- select id, shared_music_id, track_id, music_youtube_id from links limit 5;
-- select id, title, artist from gallery_music where is_active order by sort;

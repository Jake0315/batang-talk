-- ============================================================
-- 처음 한 번: 채널 7개를 넣어요. schema.sql 다음에 SQL Editor에서 실행하세요.
-- 회원 명단은 이 파일에 적지 않아요. (공개 저장소라 이메일이 노출돼요)
-- 명단은 Supabase 대시보드 → Table Editor → allowlist 에 직접 넣어요.
-- ============================================================
insert into channels (name, is_private, post_policy, sort) values
  ('공지',       false, 'staff', 1),   -- 운영진만 글쓰기, 나머지는 스레드로 답글
  ('자유',       false, 'all',   2),
  ('국장방',     true,  'all',   3),
  ('기획국',     true,  'all',   4),
  ('대외협력국', true,  'all',   5),
  ('홍보국',     true,  'all',   6),
  ('사무국',     true,  'all',   7)
on conflict (name) do nothing;

-- allowlist 한 줄 예시 (Table Editor에서 같은 값을 넣으면 돼요)
--   email:    someone@gmail.com     ← 소문자
--   name:     홍길동
--   role:     admin(관리자) / staff(회장·부회장·국장) / member
--   channels: {공지,자유,기획국}     ← 들어갈 채널 이름들

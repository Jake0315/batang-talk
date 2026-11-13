-- ============================================================
-- 처음 한 번: 채널 7개를 넣어요. schema.sql 다음에 SQL Editor에서 실행하세요.
-- 채널 이름은 '#' 없이 저장해요. 앱 화면이 앞에 '#'을 붙여서 #친목처럼 보여 줘요.
-- 회원 명단은 이 파일에 적지 않아요. (공개 저장소라 이메일이 노출돼요)
-- 명단은 Supabase 대시보드 → Table Editor → allowlist 에 직접 넣어요.
-- 여러 번 실행해도 괜찮아요.
-- ============================================================

-- 예전 이름으로 이미 만들었다면 새 이름으로 바꿔요 (메시지·구성원은 그대로 남아요)
update channels set name = '친목' where name = '자유'       and not exists (select 1 from channels where name = '친목');
update channels set name = '국장' where name = '국장방'     and not exists (select 1 from channels where name = '국장');
update channels set name = '기획' where name = '기획국'     and not exists (select 1 from channels where name = '기획');
update channels set name = '대협' where name = '대외협력국' and not exists (select 1 from channels where name = '대협');
update channels set name = '홍보' where name = '홍보국'     and not exists (select 1 from channels where name = '홍보');
update channels set name = '사무' where name = '사무국'     and not exists (select 1 from channels where name = '사무');
update allowlist set channels = array(
  select case x when '자유' then '친목' when '국장방' then '국장' when '기획국' then '기획'
                when '대외협력국' then '대협' when '홍보국' then '홍보' when '사무국' then '사무' else x end
  from unnest(channels) x)
where channels && array['자유','국장방','기획국','대외협력국','홍보국','사무국'];

insert into channels (name, is_private, post_policy, sort) values
  ('공지', false, 'staff', 1),   -- 운영진만 글쓰기, 나머지는 스레드로 답글
  ('친목', false, 'all',   2),
  ('국장', true,  'all',   3),
  ('기획', true,  'all',   4),
  ('대협', true,  'all',   5),
  ('홍보', true,  'all',   6),
  ('사무', true,  'all',   7)
on conflict (name) do nothing;

-- allowlist 한 줄 예시 (Table Editor에서 같은 값을 넣으면 돼요)
--   email:    someone@gmail.com     ← 소문자
--   name:     홍길동
--   role:     admin(관리자) / staff(회장·부회장·국장) / member
--   channels: ["공지","친목","기획"]   ← 들어갈 채널 이름들, '#' 없이

-- 예전 채널 이름(자유·국장방·기획국…)으로 이미 만든 DB에서 seed.sql을 다시 돌리면
-- 새 이름(친목·국장·기획…)으로 바뀌는지 점검해요. test-db.sh가 이 파일 → seed.sql 2번 → 아래 확인 순서로 실행해요.
\set ON_ERROR_STOP 1
\if :{?check}
do $$ begin
  if (select count(*) from channels) <> 7 then raise exception 'FAIL: 채널이 7개가 아님'; end if;
  if (select count(*) from channels where name in ('공지','친목','국장','기획','대협','홍보','사무')) <> 7 then raise exception 'FAIL: 새 이름이 아님'; end if;
  if (select channels from allowlist where email = 'old.example@gmail.com') <> '{공지,친목,국장,기획,대협,홍보,사무}'::text[] then raise exception 'FAIL: 명단의 채널 이름이 안 바뀜'; end if;
  if (select id from channels where name = '기획') <> '11111111-1111-1111-1111-111111111111' then raise exception 'FAIL: 채널 id가 바뀜'; end if;
  raise notice 'pass: 예전 이름 → 새 이름 바꾸기';
end $$;
\else
insert into channels (id, name, is_private, post_policy, sort) values
  (gen_random_uuid(), '공지', false, 'staff', 1), (gen_random_uuid(), '자유', false, 'all', 2),
  (gen_random_uuid(), '국장방', true, 'all', 3), ('11111111-1111-1111-1111-111111111111', '기획국', true, 'all', 4),
  (gen_random_uuid(), '대외협력국', true, 'all', 5), (gen_random_uuid(), '홍보국', true, 'all', 6), (gen_random_uuid(), '사무국', true, 'all', 7);
insert into allowlist (email, name, role, channels) values
  ('old.example@gmail.com', '예전관리자', 'admin', '{공지,자유,국장방,기획국,대외협력국,홍보국,사무국}');
\endif

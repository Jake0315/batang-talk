-- 보안 점검용 가짜 명단 (테스트 DB에만 넣어요. 실제 Supabase에는 넣지 마세요)
insert into allowlist (email, name, role, channels) values
  ('jake.example@gmail.com', '관리자',  'admin',  '{공지,친목,국장,기획,대협,홍보,사무}'),
  ('vice.example@gmail.com', '부회장',  'staff',  '{공지,친목,국장,기획,대협,홍보,사무}'),
  ('plan.head@gmail.com',    '기획국장', 'staff', '{공지,친목,국장,기획}'),
  ('plan.member@gmail.com',  '기획국원', 'member','{공지,친목,기획}')
on conflict (email) do update set name = excluded.name, role = excluded.role, channels = excluded.channels;

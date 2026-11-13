-- 보안 규칙 자동 점검: bash tools/test-db.sh 로 실행해요. (local_stub → schema → seed → fixtures → 이 파일 순서)
-- 하나라도 틀리면 'FAIL' 예외로 멈춰요. 끝까지 가면 ALL PASS.
\set ON_ERROR_STOP 1
create or replace function t_login(p_email text) returns void language plpgsql as $$
declare u uuid; begin
  select id into u from auth.users where email = p_email;
  perform set_config('request.jwt.claims', json_build_object('sub', coalesce(u::text,''), 'email', p_email)::text, false);
end $$;
create or replace function t_ok(cond boolean, label text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAIL: %', label; end if; raise notice 'pass: %', label; end $$;
create or replace function t_fails(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'pass: % (%)', label, sqlerrm; return; end;
  raise exception 'FAIL (막혀야 하는데 통과): %', label;
end $$;
grant execute on function t_login(text), t_ok(boolean,text), t_fails(text,text) to authenticated;
grant select on auth.users to authenticated;

-- 1) 가입
select t_fails($$insert into auth.users(email) values ('stranger@gmail.com')$$, '명단에 없는 계정은 가입 차단');
insert into auth.users(email) values ('jake.example@gmail.com'), ('plan.head@gmail.com'), ('plan.member@gmail.com');
select t_ok((select count(*) = 3 from members), '명단에 있는 3명 가입');
select t_ok((select count(*) = 3 from channel_members cm join members m on m.id = cm.member_id where m.email = 'plan.member@gmail.com'), '기획국원은 채널 3개에 자동 입장');

-- 2) 관리자가 국장방·공지·기획국에 글 작성
select t_login('jake.example@gmail.com'); set role authenticated;
select send_message((select id from channels where name='국장방'), '국장방 비밀 안건', null, false, '{}', false, '[]') as boss_msg \gset
select send_message((select id from channels where name='공지'), '공지입니다', null, false, '{}', true, '[]') as notice_msg \gset
select send_message((select id from channels where name='기획국'), '기획국 원글', null, false, '{}', false, '[{"drive_file_id":"F1","name":"a.pptx","mime":"x","size":"10"}]') as plan_msg \gset
reset role;

-- 3) 기획국원 시점
select t_login('plan.member@gmail.com'); set role authenticated;
select t_ok((select count(*) = 0 from messages where id = :'boss_msg'), '기획국원은 국장방 메시지를 못 읽음');
select t_ok((select count(*) = 0 from channels where name = '국장방'), '기획국원은 국장방 채널 자체가 안 보임');
select t_ok((select count(*) = 3 from channel_overview()), '내 채널 목록은 3개');
select t_ok((select count(*) = 1 from attachments), '기획국 첨부는 보임');
select t_fails(format($$select send_message(%L, '몰래 쓰기', null, false, '{}', false, '[]')$$, (select id from public.channels where name = '국장방' limit 1)), '채널이 안 보이면 글도 못 씀(null 채널)');
select t_fails($$insert into messages(channel_id, sender_id, body) values ('00000000-0000-0000-0000-000000000000', auth.uid(), 'x')$$, '없는 채널에 쓰기 차단');
select t_fails(format($$select send_message(%L, '공지에 원글', null, false, '{}', false, '[]')$$, (select id from channels where name='공지')), '일반 회원은 공지에 원글 못 씀');
select send_message((select id from channels where name='공지'), '공지에 스레드 답글', :'notice_msg', false, '{}', false, '[]') as reply1 \gset
select t_ok(:'reply1' is not null, '일반 회원도 공지 스레드 답글은 가능');
select t_fails(format($$select send_message(%L, '채널에도', %L, true, '{}', false, '[]')$$, (select id from channels where name='공지'), :'notice_msg'), '공지에서 채널에도 보내기는 차단');
select t_fails(format($$select edit_message(%L, '남의 글 수정')$$, :'plan_msg'), '남의 메시지 수정 차단');
select t_fails(format($$select delete_message(%L)$$, :'plan_msg'), '남의 메시지 삭제 차단');
select t_fails(format($$update messages set body = 'hack' where id = %L; select 1/(select count(*) from messages where id = %L and body = 'hack')$$, :'plan_msg', :'plan_msg'), '직접 UPDATE는 반영 안 됨');
select t_fails(format($$insert into messages(channel_id, sender_id, body) values (%L, %L, '사칭')$$, (select id from channels where name='기획국'), (select id from members where email='jake.example@gmail.com')), '남의 이름으로 쓰기 차단');
select t_fails($$insert into allowlist(email, name) values ('evil@gmail.com', 'x')$$, '일반 회원은 명단 수정 차단');
select t_ok((select count(*) = 1 from allowlist), '명단은 내 줄만 보임');
select t_fails(format($$insert into channel_members(channel_id, member_id) values (%L, auth.uid())$$, (select id from public.channels limit 1)), '채널 구성원 직접 추가 차단');
select send_message((select id from channels where name='기획국'), '@채널 시도', null, false, '{}', true, '[]') as m2 \gset
select t_ok((select not mention_all from messages where id = :'m2'), '일반 회원의 @채널은 무시됨');
select edit_message(:'m2', '내 글 수정');
select t_ok((select body = '내 글 수정' and edited_at is not null from messages where id = :'m2'), '내 메시지 수정 가능');
select send_message((select id from channels where name='기획국'), '답글', :'plan_msg', false, '{}', false, '[]') as r2 \gset
select t_fails(format($$select send_message(%L, '답글의 답글', %L, false, '{}', false, '[]')$$, (select id from channels where name='기획국'), :'r2'), '스레드는 한 단계만');
reset role;
select t_ok((select reply_count = 1 and last_reply_at is not null and array_length(reply_users,1) = 1 from messages where id = :'plan_msg'), '답글 수·참여자 집계');
select t_ok((select count(*) = 2 from thread_reads where root_id = :'plan_msg' and following), '원글 작성자와 답글 작성자가 스레드 참여자');

-- 4) 관리자: 스레드 목록, 남의 글 삭제
select t_login('jake.example@gmail.com'); set role authenticated;
select t_ok((select count(*) = 2 and sum(unread) = 2 from my_threads()), '내 스레드 2개, 안 읽은 답글 2개');
select mark_thread_read(:'plan_msg');
select t_ok((select sum(unread) = 1 from my_threads()), '스레드 읽음 처리');
select t_ok((select unread = 1 from channel_overview() where name = '기획국'), '기획국 안 읽음 1개');
select mark_read((select id from channels where name='기획국'));
select t_ok((select unread = 0 from channel_overview() where name = '기획국'), '채널 읽음 처리');
select delete_message(:'m2');
select t_ok((select body = '' and deleted_at is not null from messages where id = :'m2'), '관리자는 남의 메시지 삭제 가능');
reset role;

-- 5) 명단 변경 → 즉시 반영
update allowlist set channels = '{공지,자유}' where email = 'plan.member@gmail.com';
select t_login('plan.member@gmail.com'); set role authenticated;
select t_ok((select count(*) = 0 from messages where id = :'plan_msg'), '채널에서 빠지면 그 채널 메시지 못 읽음');
reset role;
delete from allowlist where email = 'plan.member@gmail.com';
select t_login('plan.member@gmail.com'); set role authenticated;
select t_ok((select count(*) = 0 from messages) and (select count(*) = 0 from members) and (select count(*) = 0 from channel_overview()), '명단에서 지우면 전부 차단');
select t_fails(format($$select send_message(%L, 'x', null, false, '{}', false, '[]')$$, (select id from public.channels limit 1)), '명단에서 지워진 계정은 쓰기 차단');
reset role;

-- 6) 로그인하지 않은 접근
set role anon;
select t_ok((select count(*) = 0 from messages) and (select count(*) = 0 from allowlist) and (select count(*) = 0 from members), '비로그인은 아무것도 못 읽음');
reset role;
\echo ALL PASS

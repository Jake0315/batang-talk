-- ============================================================
-- Batang (학생회 '바탕' 업무 메신저) 데이터베이스 설계
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 되도록 만들었어요(이미 있으면 건너뜀).
-- ============================================================
create extension if not exists pg_trgm;

-- ---------- 표 ----------
create table if not exists allowlist (
  email    text primary key check (email = lower(email)),
  name     text not null,
  role     text not null default 'member' check (role in ('admin','staff','member')),
  channels text[] not null default '{}'          -- 들어갈 채널 이름 목록
);
create table if not exists members (
  id         uuid primary key references auth.users on delete cascade,
  email      text unique not null,
  name       text not null,
  avatar_url text,
  quiet      boolean not null default true,      -- 방해 금지(밤 12시~오전 8시, 멘션은 알림)
  created_at timestamptz not null default now()
);
create table if not exists channels (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  is_private  boolean not null default true,
  post_policy text not null default 'all' check (post_policy in ('all','staff')),
  sort        int not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create table if not exists channel_members (
  channel_id   uuid not null references channels on delete cascade,
  member_id    uuid not null references members on delete cascade,
  last_read_at timestamptz not null default now(),
  notify       text not null default 'all' check (notify in ('all','mentions')),
  primary key (channel_id, member_id)
);
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  channel_id      uuid not null references channels on delete cascade,
  sender_id       uuid not null references members,
  body            text not null default '',
  parent_id       uuid references messages on delete cascade,   -- 스레드 답글이면 원글 번호
  also_to_channel boolean not null default false,
  mention_ids     uuid[] not null default '{}',
  mention_all     boolean not null default false,
  reply_count     int not null default 0,
  last_reply_at   timestamptz,
  reply_users     uuid[] not null default '{}',
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists messages_channel_idx on messages (channel_id, created_at desc);
create index if not exists messages_parent_idx  on messages (parent_id, created_at);
create index if not exists messages_body_trgm   on messages using gin (body gin_trgm_ops);
create index if not exists messages_mention_idx on messages using gin (mention_ids);

create table if not exists thread_reads (
  member_id    uuid not null references members on delete cascade,
  root_id      uuid not null references messages on delete cascade,
  last_read_at timestamptz not null default now(),
  following    boolean not null default true,
  primary key (member_id, root_id)
);
create table if not exists attachments (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references messages on delete cascade,
  drive_file_id text not null,
  name          text not null,
  mime          text,
  size          bigint
);
create index if not exists attachments_msg_idx  on attachments (message_id);
create index if not exists attachments_file_idx on attachments (drive_file_id);
create table if not exists reactions (
  message_id uuid not null references messages on delete cascade,
  member_id  uuid not null references members on delete cascade,
  emoji      text not null,
  primary key (message_id, member_id, emoji)
);
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members on delete cascade,
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  device     text,
  created_at timestamptz not null default now()
);

-- ---------- 권한 확인 함수 ----------
create or replace function my_email() returns text language sql stable
  as $$ select lower(coalesce(auth.jwt()->>'email','')) $$;
create or replace function is_active() returns boolean language sql stable security definer set search_path = public
  as $$ select exists (select 1 from allowlist where email = my_email()) $$;
create or replace function my_role() returns text language sql stable security definer set search_path = public
  as $$ select role from allowlist where email = my_email() $$;
create or replace function in_channel(cid uuid) returns boolean language sql stable security definer set search_path = public
  as $$ select is_active() and exists (select 1 from channel_members where channel_id = cid and member_id = auth.uid()) $$;
create or replace function can_post(cid uuid, parent uuid, also boolean) returns boolean language sql stable security definer set search_path = public
  as $$ select (parent is not null and not coalesce(also,false))
            or coalesce(my_role(),'member') in ('admin','staff')
            or exists (select 1 from channels where id = cid and post_policy = 'all') $$;

-- ---------- 가입: 명단에 있는 구글 계정만 ----------
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare a allowlist;
begin
  select * into a from allowlist where email = lower(new.email);
  if not found then raise exception 'not_on_allowlist'; end if;
  insert into members (id, email, name, avatar_url)
    values (new.id, lower(new.email), a.name, new.raw_user_meta_data->>'avatar_url');
  insert into channel_members (channel_id, member_id)
    select c.id, new.id from channels c where c.name = any (a.channels);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- 명단(allowlist)을 고치면 채널 구성원도 따라 바뀜
create or replace function sync_allowlist() returns trigger language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if tg_op in ('UPDATE','DELETE') then
    select id into mid from members where email = old.email;
    if mid is not null and (tg_op = 'DELETE' or new.email <> old.email) then
      delete from channel_members where member_id = mid;
    end if;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    select id into mid from members where email = new.email;
    if mid is not null then
      update members set name = new.name where id = mid;
      delete from channel_members cm using channels c
        where cm.member_id = mid and c.id = cm.channel_id and not (c.name = any (new.channels));
      insert into channel_members (channel_id, member_id)
        select c.id, mid from channels c where c.name = any (new.channels)
        on conflict do nothing;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists allowlist_sync on allowlist;
create trigger allowlist_sync after insert or update or delete on allowlist
  for each row execute function sync_allowlist();

-- ---------- 메시지 규칙 ----------
create or replace function before_message_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare pc uuid; pp uuid;
begin
  new.created_at := now(); new.reply_count := 0; new.last_reply_at := null;
  new.reply_users := '{}'; new.edited_at := null; new.deleted_at := null;
  if char_length(new.body) > 4000 then raise exception 'message_too_long'; end if;
  if new.parent_id is not null then
    select channel_id, parent_id into pc, pp from messages where id = new.parent_id;
    if pc is null or pc <> new.channel_id or pp is not null then raise exception 'invalid_thread_parent'; end if;
  else
    new.also_to_channel := false;
  end if;
  if new.mention_all and coalesce(my_role(),'member') not in ('admin','staff') then new.mention_all := false; end if;
  return new;
end $$;
drop trigger if exists messages_before_insert on messages;
create trigger messages_before_insert before insert on messages
  for each row execute function before_message_insert();

create or replace function after_message_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare r messages;
begin
  if new.parent_id is not null then
    select * into r from messages where id = new.parent_id;
    update messages set reply_count = reply_count + 1, last_reply_at = new.created_at,
      reply_users = (select coalesce(array_agg(u), '{}') from (select distinct u from unnest(reply_users || new.sender_id) u limit 5) s)
      where id = new.parent_id;
    insert into thread_reads (member_id, root_id, last_read_at, following)
      values (new.sender_id, new.parent_id, new.created_at, true)
      on conflict (member_id, root_id) do update set last_read_at = excluded.last_read_at, following = true;
    insert into thread_reads (member_id, root_id, last_read_at, following)
      select distinct u, new.parent_id, r.created_at, true
      from unnest(array[r.sender_id] || r.mention_ids || new.mention_ids) u
      where u <> new.sender_id
        and exists (select 1 from channel_members cm where cm.channel_id = new.channel_id and cm.member_id = u)
      on conflict do nothing;
  end if;
  if new.parent_id is null or new.also_to_channel then
    update channel_members set last_read_at = new.created_at
      where channel_id = new.channel_id and member_id = new.sender_id;
  end if;
  return null;
end $$;
drop trigger if exists messages_after_insert on messages;
create trigger messages_after_insert after insert on messages
  for each row execute function after_message_insert();

-- ---------- 앱이 부르는 함수 ----------
create or replace function send_message(p_channel uuid, p_body text, p_parent uuid, p_also boolean,
    p_mentions uuid[], p_mention_all boolean, p_files jsonb)
  returns uuid language plpgsql security invoker set search_path = public as $$
declare v uuid;
begin
  if coalesce(btrim(p_body),'') = '' and jsonb_array_length(coalesce(p_files,'[]'::jsonb)) = 0 then
    raise exception 'empty_message';
  end if;
  insert into messages (channel_id, sender_id, body, parent_id, also_to_channel, mention_ids, mention_all)
    values (p_channel, auth.uid(), coalesce(p_body,''), p_parent, coalesce(p_also,false),
            coalesce(p_mentions,'{}'), coalesce(p_mention_all,false))
    returning id into v;
  insert into attachments (message_id, drive_file_id, name, mime, size)
    select v, f->>'drive_file_id', f->>'name', f->>'mime', nullif(f->>'size','')::bigint
    from jsonb_array_elements(coalesce(p_files,'[]'::jsonb)) f;
  return v;
end $$;

create or replace function edit_message(p_id uuid, p_body text) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(btrim(p_body),'') = '' or char_length(p_body) > 4000 then raise exception 'invalid_body'; end if;
  update messages set body = p_body, edited_at = now()
    where id = p_id and sender_id = auth.uid() and deleted_at is null and in_channel(channel_id);
  if not found then raise exception 'not_allowed'; end if;
end $$;

create or replace function delete_message(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update messages set deleted_at = now(), body = '', mention_ids = '{}', mention_all = false
    where id = p_id and deleted_at is null and in_channel(channel_id)
      and (sender_id = auth.uid() or my_role() = 'admin');
  if not found then raise exception 'not_allowed'; end if;
  delete from attachments where message_id = p_id;
  delete from reactions where message_id = p_id;
end $$;

create or replace function mark_read(p_channel uuid) returns void language sql security definer set search_path = public as $$
  update channel_members set last_read_at = now()
    where channel_id = p_channel and member_id = auth.uid() and is_active();
$$;
create or replace function mark_thread_read(p_root uuid) returns void language sql security definer set search_path = public as $$
  update thread_reads set last_read_at = now()
    where root_id = p_root and member_id = auth.uid() and is_active();
$$;
create or replace function set_follow(p_root uuid, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from messages m where m.id = p_root and m.parent_id is null and in_channel(m.channel_id)) then
    raise exception 'not_allowed';
  end if;
  insert into thread_reads (member_id, root_id, last_read_at, following) values (auth.uid(), p_root, now(), p_on)
    on conflict (member_id, root_id) do update set following = excluded.following, last_read_at = now();
end $$;
create or replace function set_notify(p_channel uuid, p_mode text) returns void language sql security definer set search_path = public as $$
  update channel_members set notify = p_mode
    where channel_id = p_channel and member_id = auth.uid() and is_active() and p_mode in ('all','mentions');
$$;
create or replace function set_quiet(p_on boolean) returns void language sql security definer set search_path = public as $$
  update members set quiet = p_on where id = auth.uid() and is_active();
$$;

create or replace function channel_overview()
  returns table (id uuid, name text, is_private boolean, post_policy text, sort int, notify text,
                 last_read_at timestamptz, unread int, mentions int, member_count int)
  language sql stable security invoker set search_path = public as $$
  select c.id, c.name, c.is_private, c.post_policy, c.sort, cm.notify, cm.last_read_at,
    (select count(*)::int from messages m where m.channel_id = c.id and (m.parent_id is null or m.also_to_channel)
       and m.deleted_at is null and m.sender_id <> auth.uid() and m.created_at > cm.last_read_at),
    (select count(*)::int from messages m where m.channel_id = c.id and (m.parent_id is null or m.also_to_channel)
       and m.deleted_at is null and m.sender_id <> auth.uid() and m.created_at > cm.last_read_at
       and (m.mention_all or auth.uid() = any (m.mention_ids))),
    (select count(*)::int from channel_members x where x.channel_id = c.id)
  from channels c
  join channel_members cm on cm.channel_id = c.id and cm.member_id = auth.uid()
  where not c.archived
  order by c.sort, c.name;
$$;

create or replace function my_threads()
  returns table (id uuid, channel_id uuid, sender_id uuid, body text, deleted_at timestamptz, reply_count int,
                 last_reply_at timestamptz, reply_users uuid[], unread int)
  language sql stable security invoker set search_path = public as $$
  select r.id, r.channel_id, r.sender_id, r.body, r.deleted_at, r.reply_count, r.last_reply_at, r.reply_users,
    (select count(*)::int from messages m where m.parent_id = r.id and m.deleted_at is null
       and m.sender_id <> auth.uid() and m.created_at > tr.last_read_at)
  from thread_reads tr join messages r on r.id = tr.root_id
  where tr.member_id = auth.uid() and tr.following and r.reply_count > 0
  order by r.last_reply_at desc limit 50;
$$;

-- Apps Script(관리자 키)만 부르는 용량 확인
create or replace function db_size_mb() returns numeric language sql security definer set search_path = public
  as $$ select round(pg_database_size(current_database()) / 1048576.0, 1) $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function db_size_mb() from authenticated;
revoke execute on function handle_new_user(), sync_allowlist(), before_message_insert(), after_message_insert() from authenticated;

-- ---------- 행 단위 보안 규칙(RLS) ----------
alter table allowlist          enable row level security;
alter table members            enable row level security;
alter table channels           enable row level security;
alter table channel_members    enable row level security;
alter table messages           enable row level security;
alter table thread_reads       enable row level security;
alter table attachments        enable row level security;
alter table reactions          enable row level security;
alter table push_subscriptions enable row level security;

do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I', p.policyname, p.tablename);
  end loop;
end $$;

-- 명단: 본인 줄만 읽기, 관리자는 전부 읽고 쓰기
create policy allowlist_read  on allowlist for select to authenticated using (email = my_email() or my_role() = 'admin');
create policy allowlist_admin on allowlist for all    to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
-- 회원 목록: 회원끼리 이름·사진 보기
create policy members_read on members for select to authenticated using (is_active());
-- 채널·구성원: 내가 속한 채널만
create policy channels_read on channels        for select to authenticated using (in_channel(id));
create policy cm_read       on channel_members for select to authenticated using (in_channel(channel_id));
-- 메시지: 내가 속한 채널만 읽고, 내 이름으로만 씀. 고치기·지우기는 함수로만
create policy messages_read  on messages for select to authenticated using (in_channel(channel_id));
create policy messages_write on messages for insert to authenticated
  with check (sender_id = auth.uid() and in_channel(channel_id) and can_post(channel_id, parent_id, also_to_channel));
-- 스레드 읽음: 볼 수 있는 스레드만 읽기. 쓰기는 함수로만
create policy tr_read on thread_reads for select to authenticated
  using (exists (select 1 from messages m where m.id = root_id and in_channel(m.channel_id)));
-- 첨부: 메시지를 볼 수 있을 때만 읽기, 내 메시지에만 붙이기
create policy att_read  on attachments for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id and in_channel(m.channel_id)));
create policy att_write on attachments for insert to authenticated
  with check (exists (select 1 from messages m where m.id = message_id and m.sender_id = auth.uid() and in_channel(m.channel_id)));
-- 반응
create policy re_read  on reactions for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id and in_channel(m.channel_id)));
create policy re_write on reactions for insert to authenticated
  with check (member_id = auth.uid() and char_length(emoji) <= 8
    and exists (select 1 from messages m where m.id = message_id and m.deleted_at is null and in_channel(m.channel_id)));
create policy re_del   on reactions for delete to authenticated using (member_id = auth.uid());
-- 푸시 주소: 본인 것만
create policy push_own on push_subscriptions for all to authenticated
  using (member_id = auth.uid() and is_active()) with check (member_id = auth.uid() and is_active());

-- ---------- 실시간 전송 ----------
do $$ declare t text; begin
  foreach t in array array['messages','reactions','channel_members','thread_reads'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

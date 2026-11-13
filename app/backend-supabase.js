/* Batang — 실제 서버 연결 (Supabase + Apps Script) */
(function () {
'use strict';
var C = window.BATANG_CONFIG || {};
var ready = !!(C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase);
var urlError = /[?&#]error(_description)?=/.test(location.search + location.hash);
var sb = ready ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }) : null;
var SEL = '*, attachments(id,drive_file_id,name,mime,size), reactions(member_id,emoji)';
var me = null, imgCache = {};
function ok(r) { if (r.error) throw r.error; return r.data; }
function token() { return sb.auth.getSession().then(function (r) { return r.data.session && r.data.session.access_token; }); }
function gas(payload) {
  return token().then(function (t) {
    payload.token = t;
    // Content-Type을 지정하지 않아(text/plain) 사전 요청 없이 Apps Script로 보냄
    return fetch(C.GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
  }).then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'gas'); return j; });
}
function toBase64(file) {
  return new Promise(function (res, rej) {
    var fr = new FileReader();
    fr.onload = function () { res(String(fr.result).split(',')[1]); }; fr.onerror = rej; fr.readAsDataURL(file);
  });
}
function b64ToBytes(s) {
  var t = (s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(t), out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
function swReg() { return navigator.serviceWorker.ready; }

var B = window.BACKEND = {
  demo: false, useServiceWorker: true, version: C.VERSION,
  img: function (n) { return './img/' + n + '.svg'; },

  init: function () {
    if (!ready) return Promise.resolve({ status: 'unconfigured' });
    return sb.auth.getSession().then(function (r) {
      var s = r.data.session;
      if (!s) {
        if (urlError) { history.replaceState(null, '', location.pathname); return { status: 'denied' }; }
        return { status: 'signedout' };
      }
      var email = (s.user.email || '').toLowerCase();
      return Promise.all([
        sb.from('members').select('*').eq('id', s.user.id).maybeSingle(),
        sb.from('allowlist').select('role').eq('email', email).maybeSingle()
      ]).then(function (d) {
        var m = ok(d[0]), a = ok(d[1]);
        if (!m || !a) return { status: 'denied' };
        me = m; me.role = a.role;
        return { status: 'ok', me: me };
      });
    });
  },
  signIn: function () { return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); },
  signOut: function () { return sb.auth.signOut().then(function () { location.hash = ''; location.reload(); }); },

  listMembers: function () { return sb.from('members').select('id,name,email,avatar_url').then(ok); },
  listAllowlist: function () { return sb.from('allowlist').select('email,name,role').order('name').then(ok); },   // 관리자만 전부 보여요
  createChannel: function (name, staffOnly, emails) { return sb.rpc('create_channel', { p_name: name, p_staff_only: !!staffOnly, p_emails: emails || [] }).then(ok); },
  overview: function () { return sb.rpc('channel_overview').then(ok); },
  channelMembers: function (cid) { return sb.from('channel_members').select('channel_id,member_id,last_read_at,notify').eq('channel_id', cid).then(ok); },
  listMessages: function (cid, before) {
    var q = sb.from('messages').select(SEL).eq('channel_id', cid).or('parent_id.is.null,also_to_channel.eq.true').order('created_at', { ascending: false }).limit(50);
    if (before) q = q.lt('created_at', before);
    return q.then(ok).then(function (rows) { return rows.reverse(); });
  },
  getMessage: function (id) { return sb.from('messages').select(SEL).eq('id', id).maybeSingle().then(ok); },
  listThread: function (root) {
    return Promise.all([
      B.getMessage(root),
      sb.from('messages').select(SEL).eq('parent_id', root).order('created_at').limit(500).then(ok),
      sb.from('thread_reads').select('member_id,root_id,last_read_at,following').eq('root_id', root).then(ok)
    ]).then(function (d) { return { root: d[0], replies: d[1], reads: d[2] }; });
  },
  send: function (p) {
    return sb.rpc('send_message', { p_channel: p.channel_id, p_body: p.body, p_parent: p.parent_id, p_also: p.also_to_channel,
      p_mentions: p.mention_ids, p_mention_all: p.mention_all, p_files: p.files }).then(ok).then(B.getMessage);
  },
  edit: function (id, body) { return sb.rpc('edit_message', { p_id: id, p_body: body }).then(ok).then(function () { return B.getMessage(id); }); },
  remove: function (id) { return sb.rpc('delete_message', { p_id: id }).then(ok).then(function () { return B.getMessage(id); }); },
  react: function (id, emoji, wasOn) {
    if (wasOn) return sb.from('reactions').delete().eq('message_id', id).eq('member_id', me.id).eq('emoji', emoji).then(ok);
    return sb.from('reactions').insert({ message_id: id, member_id: me.id, emoji: emoji }).then(ok);
  },
  markRead: function (cid) { return sb.rpc('mark_read', { p_channel: cid }).then(ok); },
  markThreadRead: function (root) { return sb.rpc('mark_thread_read', { p_root: root }).then(ok); },
  setFollow: function (root, on) { return sb.rpc('set_follow', { p_root: root, p_on: on }).then(ok); },
  setNotify: function (cid, mode) { return sb.rpc('set_notify', { p_channel: cid, p_mode: mode }).then(ok); },
  setQuiet: function (on) { return sb.rpc('set_quiet', { p_on: on }).then(ok); },
  myThreads: function () { return sb.rpc('my_threads').then(ok); },
  myMentions: function () {
    return sb.from('messages').select('id,channel_id,parent_id,sender_id,body,created_at')
      .or('mention_ids.cs.{' + me.id + '},mention_all.eq.true').neq('sender_id', me.id).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(50).then(ok);
  },
  search: function (q, cid) {
    var x = sb.from('messages').select('id,channel_id,parent_id,sender_id,body,created_at')
      .ilike('body', '%' + q.replace(/[%_\\]/g, '\\$&') + '%').is('deleted_at', null).order('created_at', { ascending: false }).limit(40);
    if (cid) x = x.eq('channel_id', cid);
    return x.then(ok);
  },

  // 파일: Apps Script가 로그인·채널 구성원을 확인한 뒤 드라이브에 저장
  upload: function (file, cid) {
    return toBase64(file).then(function (data) {
      return gas({ action: 'upload', channel_id: cid, name: file.name, mime: file.type, data: data });
    }).then(function (j) { return j.file; });
  },
  imageUrl: function (att) {
    var k = att.drive_file_id;
    if (!imgCache[k]) imgCache[k] = gas({ action: 'image', file_id: k }).then(function (j) { return j.dataUrl; }).catch(function (e) { delete imgCache[k]; throw e; });
    return imgCache[k];
  },
  previewUrl: function (att) { return 'https://drive.google.com/file/d/' + att.drive_file_id + '/preview'; },
  openUrl: function (att) { return 'https://drive.google.com/file/d/' + att.drive_file_id + '/view'; },

  subscribe: function (h) {
    var refetch = function (id) { if (id) B.getMessage(id).then(function (m) { if (m) h.onMessage(m); }).catch(function () {}); };
    sb.channel('batang')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, function (p) { refetch(p.new && p.new.id); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, function (p) { refetch((p.new && p.new.message_id) || (p.old && p.old.message_id)); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channel_members' }, function (p) { h.onRead(p.new); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_reads' }, function (p) { if (p.new && p.new.root_id) h.onThreadRead(p.new); })
      .subscribe();
  },

  // 푸시 알림
  pushStatus: function () {
    var sup = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!sup) return Promise.resolve({ supported: false });
    return swReg().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      return { supported: true, permission: Notification.permission, subscribed: !!sub && Notification.permission === 'granted' };
    });
  },
  enablePush: function () {
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') return B.pushStatus();
      return swReg().then(function (reg) {
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(C.VAPID_PUBLIC_KEY) });
      }).then(function (sub) {
        var j = sub.toJSON();
        return sb.from('push_subscriptions').upsert({ member_id: me.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
          device: navigator.userAgent.slice(0, 120) }, { onConflict: 'endpoint' }).then(ok);
      }).then(B.pushStatus);
    });
  },
  testPush: function () { return sb.functions.invoke('push', { body: { test: true } }).then(ok); }
};
})();

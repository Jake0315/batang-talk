/* Batang 화면 (학생회 '바탕' 업무 메신저)
 * 서버와 주고받는 일은 window.BACKEND가 맡아요.
 *   실제 앱: backend-supabase.js   /   시연용: demo/backend-demo.js
 */
(function () {
'use strict';
var B = window.BACKEND;
var $ = function (s, r) { return (r || document).querySelector(s); };
var S = { me: null, members: {}, channels: [], tab: 'home', ch: null, th: null, nav: 0, route: { c: null, t: null },
          threads: null, mentions: null, focus: null, push: null };
var EMOJI = ['👍', '✅', '👀', '🙏', '😂', '🎉'];
var MAX_FILE = 25 * 1024 * 1024;

/* ───────── 아이콘 ───────── */
function ico(d, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' + (extra || '') + '>' + d + '</svg>'; }
var I = {
  back: ico('<path d="M15 5l-7 7 7 7"/>'), search: ico('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  bell: ico('<path d="M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 20a2 2 0 004 0"/>'),
  bellOff: ico('<path d="M6 9a6 6 0 019.5-4.9M18 9c0 6 2 7 2 7H8"/><path d="M10 20a2 2 0 004 0M4 4l16 16"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'), send: ico('<path d="M5 12l14-7-5 14-3-6z"/>'),
  hash: ico('<path d="M9 4L7 20M17 4l-2 16M4 9h17M3 15h17"/>'), lock: ico('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  home: ico('<path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z"/>'),
  thread: ico('<path d="M4 6h16v10H10l-5 4v-4H4z"/><path d="M8 10h8M8 13h5"/>'),
  at: ico('<circle cx="12" cy="12" r="4"/><path d="M16 8v5a2.5 2.5 0 005 0v-1a9 9 0 10-4 7.5"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'), more: ico('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  x: ico('<path d="M6 6l12 12M18 6L6 18"/>'), check: ico('<path d="M5 12l5 5 9-10"/>', 'stroke-width="3"'),
  reply: ico('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 016 6v3"/>'), copy: ico('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>'),
  eye: ico('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  edit: ico('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), trash: ico('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  chev: ico('<path d="M9 5l7 7-7 7"/>'), out: ico('<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>')
};

/* ───────── 도우미 ───────── */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ts(s) { return s ? Date.parse(s) : 0; }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function fmtTime(s) { var d = new Date(s), h = d.getHours(); return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + pad(d.getMinutes()); }
function dayKey(s) { var d = new Date(s); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
function fmtDay(s) {
  var d = new Date(s), now = new Date();
  if (dayKey(d) === dayKey(now)) return '오늘';
  if (dayKey(d) === dayKey(new Date(now - 864e5))) return '어제';
  return (d.getFullYear() !== now.getFullYear() ? d.getFullYear() + '년 ' : '') + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + '일월화수목금토'[d.getDay()] + '요일';
}
function rel(s) {
  var m = Math.floor((Date.now() - ts(s)) / 6e4);
  if (m < 1) return '방금'; if (m < 60) return m + '분 전';
  if (m < 1440) return Math.floor(m / 60) + '시간 전';
  if (m < 10080) return Math.floor(m / 1440) + '일 전';
  var d = new Date(s); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}
function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round((n || 0) / 1024)) + 'KB'; }
var AVC = ['#668485', '#7C9A6B', '#B0805A', '#7A86A8', '#A8727F', '#5E9396', '#9A8A5C', '#8A78A6'];
function av(id, cls) {
  var u = S.members[id] || { name: '?' }, h = 0, k = String(id || '');
  for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  var inner = u.avatar_url ? '<img src="' + esc(u.avatar_url) + '" alt="" referrerpolicy="no-referrer">' : esc(u.name.slice(-2));
  return '<span class="av ' + (cls || '') + '" style="background:' + AVC[h % AVC.length] + '">' + inner + '</span>';
}
function name(id) { return (S.members[id] || {}).name || '알 수 없음'; }
function chan(id) { for (var i = 0; i < S.channels.length; i++) if (S.channels[i].id === id) return S.channels[i]; return null; }
function isStaff() { return S.me.role === 'admin' || S.me.role === 'staff'; }
function reRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function rich(text, hl) {
  var h = esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" data-act="link">$1</a>');
  var names = Object.keys(S.members).map(function (k) { return S.members[k].name; }).sort(function (a, b) { return b.length - a.length; });
  var rx = new RegExp('@(채널|' + names.map(reRx).join('|') + ')', 'g');
  h = h.replace(rx, function (m, n) { return '<span class="mn' + (n === '채널' || n === S.me.name ? ' me' : '') + '">@' + n + '</span>'; });
  if (hl) h = h.replace(/(<[^>]+>)|([^<]+)/g, function (m, tag, txt) { return tag || txt.replace(new RegExp('(' + reRx(esc(hl)) + ')', 'gi'), '<mark>$1</mark>'); });
  return h;
}
var toastT;
function toast(s) { var t = $('#toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }
function fail(e) { console.error(e); toast((e && e.userMessage) || '잠시 후 다시 시도해 주세요'); }

/* ───────── 시작 ───────── */
function boot() {
  if ('serviceWorker' in navigator && B.useServiceWorker) navigator.serviceWorker.register('./sw.js').catch(function () {});
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.go) { S.nav++; location.hash = e.data.go; } });
  B.init().then(function (r) {
    if (r.status !== 'ok') return renderAuth(r.status);
    S.me = r.me;
    return Promise.all([B.listMembers(), B.overview()]).then(function (d) {
      d[0].forEach(function (m) { S.members[m.id] = m; });
      S.channels = d[1];
      B.subscribe({ onMessage: upsertMsg, onRead: onRead, onThreadRead: onThreadRead });
      $('#scr-auth').hidden = true; $('#scr-main').hidden = false;
      renderTabbar(); renderTab(); route();
      refreshPush();
    });
  }).catch(function (e) { console.error(e); renderAuth('error'); });
}
function renderAuth(status) {
  var a = $('#scr-auth'); a.hidden = false; $('#scr-main').hidden = true;
  var G = '<svg class="gg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5z"/><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.4 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0012 23.5z"/><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 010-4.4v-3H1.8a11.5 11.5 0 000 10.4l3.8-3z"/><path fill="#EA4335" d="M12 5.1c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 001.8 6.8l3.8 3C6.500 7.100 9 5.1 12 5.1z"/></svg>';
  var v = {
    signedout: ['taang_hello', 'Batang', '교육학과 학생회 바탕 운영진 메신저', '<button class="btn soft" data-act="signin">' + G + 'Google로 계속하기</button>'],
    denied: ['taang_sorry', '운영진 전용이에요', '명단에 등록된 구글 계정만 들어올 수 있어요.<br>다른 계정으로 로그인했다면 다시 시도해 주세요.', '<button class="btn soft" data-act="signout">다른 계정으로 로그인</button>'],
    unconfigured: ['taang_thinking', '설정이 필요해요', 'config.js에 Supabase 주소와 키를 넣어 주세요.<br>자세한 방법은 README에 있어요.', ''],
    error: ['taang_sorry', '연결하지 못했어요', '인터넷 연결을 확인하고 다시 열어 주세요.', '<button class="btn soft" data-act="reload">다시 시도</button>']
  }[status] || [];
  a.innerHTML = '<div class="auth fade"><img src="' + B.img(v[0]) + '" alt=""><h1>' + v[1] + '</h1><p>' + v[2] + '</p>' + v[3] + '</div>';
}

/* ───────── 화면 이동 ───────── */
function parse() { var m = location.hash.match(/^#\/c\/([\w-]+)(?:\/t\/([\w-]+))?/); return m ? { c: m[1], t: m[2] || null } : { c: null, t: null }; }
function depth(r) { return r.t ? 2 : r.c ? 1 : 0; }
function go(h) { S.nav++; location.hash = h; }
function back() { if (S.nav > 0) history.back(); else location.replace('#' + (S.route.t ? '/c/' + S.route.c : '/')); }
function route() {
  if (!S.me) return;
  var r = parse(), old = S.route; S.route = r;
  if (depth(r) < depth(old)) S.nav = Math.max(0, S.nav - 1);
  closeSheet(true);
  if (r.c !== (S.ch && S.ch.id)) { if (r.c) openChannel(r.c, r.t ? null : S.focus); else { S.ch = null; refreshOverview(); } }
  if (r.t !== (S.th && S.th.id)) { if (r.t) openThread(r.t, S.focus); else { S.th = null; if (S.tab === 'threads') loadTab(); } }
  S.focus = null;
  if (!r.t && r.c && S.ch && !S.ch.loading && old.t) { renderMsgs('ch'); markRead(); }
  $('#scr-channel').classList.toggle('in', !!r.c); $('#scr-thread').classList.toggle('in', !!r.t);
  $('#scr-main').classList.toggle('under', !!r.c); $('#scr-channel').classList.toggle('under', !!r.t);
}

/* ───────── 탭 ───────── */
function renderTabbar() {
  var un = S.threads ? S.threads.filter(function (t) { return t.unread; }).length : 0;
  var tabs = [['home', '홈', I.home], ['threads', '스레드', I.thread], ['activity', '활동', I.at], ['me', '내 정보', I.user]];
  $('#tabbar').innerHTML = tabs.map(function (t) {
    return '<button class="' + (S.tab === t[0] ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[2] + t[1] +
      (t[0] === 'threads' && un ? '<span class="dot">' + un + '</span>' : '') + '</button>';
  }).join('');
}
function loadTab() {
  if (S.tab === 'threads') B.myThreads().then(function (d) { S.threads = d; renderTabbar(); if (S.tab === 'threads') renderTab(); }).catch(fail);
  if (S.tab === 'activity') B.myMentions().then(function (d) { S.mentions = d; if (S.tab === 'activity') renderTab(); }).catch(fail);
}
function skel(n) { var h = ''; for (var i = 0; i < n; i++) h += '<div class="skrow"><i class="sk" style="width:38px;height:38px"></i><div style="flex:1"><i class="sk" style="width:' + (30 + i * 13 % 40) + '%;height:13px;margin:3px 0 8px"></i><i class="sk" style="width:' + (55 + i * 17 % 40) + '%;height:13px"></i></div></div>'; return h; }
function renderTab() {
  var v = $('#tabview'), h = '';
  if (S.tab === 'home') {
    h = '<div class="top"><div class="brand">Batang</div><button class="ib" data-act="search" aria-label="검색">' + I.search + '</button></div>' + homeBanner() +
      '<div class="h2">채널</div><div class="list">' + S.channels.map(function (c) {
        return '<button class="row' + (c.unread ? ' unread' : '') + '" data-act="open" data-c="' + c.id + '"><span class="ic">' + (c.is_private ? I.lock : I.hash) + '</span>' +
          '<span class="nm">' + esc(c.name) + '</span>' + (c.notify === 'mentions' ? '<span class="mute">' + I.bellOff + '</span>' : '') +
          (c.mentions ? '<span class="badge hot">@' + c.mentions + '</span>' : c.unread ? '<span class="badge">' + c.unread + '</span>' : '') + '</button>';
      }).join('') + '</div>' + (S.channels.length ? '' : '<div class="empty">아직 들어간 채널이 없어요.<br>관리자에게 알려 주세요.</div>');
  } else if (S.tab === 'threads') {
    h = '<div class="top"><div class="brand">스레드</div></div>';
    if (!S.threads) h += skel(4);
    else if (!S.threads.length) h += '<div class="empty"><img src="' + B.img('taang_thinking') + '" alt="">참여 중인 스레드가 없어요.<br>메시지를 눌러 답글을 달아 보세요.</div>';
    else h += '<div class="list">' + S.threads.map(function (t) {
      var c = chan(t.channel_id);
      return '<button class="item" data-act="hit" data-c="' + t.channel_id + '" data-t="' + t.id + '"><div class="meta"><b>' + esc(c ? c.name : '') + '</b>· ' + esc(name(t.sender_id)) + (t.unread ? '<span class="pip"></span>' : '') + '</div>' +
        '<div class="tx">' + (t.deleted_at ? '삭제된 메시지예요' : esc(t.body || '📎 파일')) + '</div><div class="ft">답글 ' + t.reply_count + '개 · ' + rel(t.last_reply_at) + (t.unread ? ' · <b style="color:var(--bad)">새 답글 ' + t.unread + '</b>' : '') + '</div></button>';
    }).join('') + '</div>';
  } else if (S.tab === 'activity') {
    h = '<div class="top"><div class="brand">활동</div></div>';
    if (!S.mentions) h += skel(4);
    else if (!S.mentions.length) h += '<div class="empty"><img src="' + B.img('taang_hello') + '" alt="">나를 멘션한 메시지가 여기 모여요.</div>';
    else h += '<div class="list">' + S.mentions.map(function (m) {
      var c = chan(m.channel_id);
      return '<button class="item" data-act="hit" data-c="' + m.channel_id + '" data-t="' + (m.parent_id || '') + '" data-id="' + m.id + '"><div class="meta"><b>' + esc(name(m.sender_id)) + '</b>· ' + esc(c ? c.name : '') + ' · ' + rel(m.created_at) + '</div><div class="tx">' + rich(m.body) + '</div></button>';
    }).join('') + '</div>';
  } else {
    var p = S.push || {}, role = { admin: '관리자', staff: '운영진', member: '회원' }[S.me.role];
    var st = !p.supported ? '이 브라우저는 알림을 지원하지 않아요' : p.permission === 'denied' ? '휴대폰 설정에서 알림이 꺼져 있어요' : p.subscribed ? '이 기기에서 알림을 받고 있어요' : '아직 알림이 꺼져 있어요';
    h = '<div class="top"><div class="brand">내 정보</div></div><div class="card" style="display:flex;gap:14px;align-items:center">' + av(S.me.id) +
      '<div><b style="font-size:17px">' + esc(S.me.name) + '</b><div style="font-size:13px;color:var(--sub)">' + esc(S.me.email) + ' · ' + role + '</div></div></div>' +
      '<div class="h2">알림</div><div class="card"><div class="opt"><div class="g"><b>푸시 알림</b><small>' + st + '</small></div>' +
      (p.supported && !p.subscribed && p.permission !== 'denied' ? '<button class="btn primary sm" data-act="pushOn">켜기</button>' : p.subscribed ? '<button class="btn soft sm" data-act="pushTest">테스트</button>' : '') + '</div>' +
      '<div class="opt"><div class="g"><b>방해 금지</b><small>밤 12시~오전 8시에는 멘션만 알려요</small></div><button class="toggle' + (S.me.quiet ? ' on' : '') + '" data-act="quiet" aria-label="방해 금지"></button></div></div>' +
      '<div class="h2">앱</div><div class="list"><button class="row" data-act="install"><span class="nm" style="color:var(--ink)">홈 화면에 추가하는 방법</span><span class="ic">' + I.chev + '</span></button>' +
      '<button class="row" data-act="signout"><span class="nm" style="color:var(--bad)">로그아웃</span><span class="ic">' + I.out + '</span></button></div>' +
      '<div class="empty" style="font-size:12px">Batang ' + esc(B.version || '') + '</div>';
  }
  v.innerHTML = '<div class="fade">' + h + '</div>';
}
function standalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function homeBanner() {
  var p = S.push; if (!p || B.demo) return '';
  if (isIOS() && !standalone()) return '<button class="banner" data-act="install"><img src="' + B.img('taang_guide') + '" alt=""><div><b>홈 화면에 추가해 주세요</b><span>아이폰은 홈 화면 앱에서만 알림을 받을 수 있어요</span></div></button>';
  if (p.supported && !p.subscribed && p.permission !== 'denied') return '<button class="banner" data-act="pushOn"><img src="' + B.img('taang_hello') + '" alt=""><div><b>알림을 켜 둘까요?</b><span>새 메시지와 멘션을 놓치지 않아요</span></div></button>';
  return '';
}
function refreshPush() { B.pushStatus().then(function (p) { S.push = p; if (!S.route.c) renderTab(); }).catch(function () {}); }
var ovT;
function refreshOverview() {
  clearTimeout(ovT);
  ovT = setTimeout(function () {
    B.overview().then(function (d) { S.channels = d; if (S.tab === 'home') renderTab(); }).catch(function () {});
    B.myThreads().then(function (d) { S.threads = d; renderTabbar(); if (S.tab === 'threads' && !S.route.t) renderTab(); }).catch(function () {});
  }, 250);
}

/* ───────── 메시지 그리기 ───────── */
function unreadOf(m, kind) {
  if (m.deleted_at) return 0;
  var t = ts(m.created_at);
  if (kind === 'th' && m.parent_id) return S.th.reads.filter(function (r) { return r.following && r.member_id !== m.sender_id && ts(r.last_read_at) < t; }).length;
  var cm = (kind === 'th' ? S.th.cm : S.ch.cm) || [];
  return cm.filter(function (r) { return r.member_id !== m.sender_id && ts(r.last_read_at) < t; }).length;
}
var EXT = { ppt: '#C8553D', pptx: '#C8553D', doc: '#3D6FC8', docx: '#3D6FC8', hwp: '#3D8FC8', hwpx: '#3D8FC8', xls: '#3F8F5F', xlsx: '#3F8F5F', pdf: '#B4514C', zip: '#8A7A5C' };
function isImg(a) { return /^image\//.test(a.mime || '') || /\.(png|jpe?g|gif|webp)$/i.test(a.name); }
function attHTML(m) {
  if (!m.attachments || !m.attachments.length) return '';
  return '<div class="att">' + m.attachments.map(function (a) {
    if (isImg(a)) return '<button class="att-img sk" data-act="preview" data-m="' + m.id + '" data-a="' + a.id + '" data-img="' + a.id + '" aria-label="' + esc(a.name) + '"></button>';
    var e = (a.name.split('.').pop() || '').toLowerCase();
    return '<button class="att-file" data-act="preview" data-m="' + m.id + '" data-a="' + a.id + '"><span class="ext" style="background:' + (EXT[e] || '#7A8C8C') + '">' + esc(e.slice(0, 4).toUpperCase()) + '</span><span><b>' + esc(a.name) + '</b><small>' + size(a.size) + '</small></span></button>';
  }).join('') + '</div>';
}
function rxHTML(m) {
  var g = {}, order = [];
  (m.reactions || []).forEach(function (r) { if (!g[r.emoji]) { g[r.emoji] = { n: 0, me: false }; order.push(r.emoji); } g[r.emoji].n++; if (r.member_id === S.me.id) g[r.emoji].me = true; });
  if (!order.length) return '';
  return '<div class="rx">' + order.map(function (e) { return '<button class="' + (g[e].me ? 'on' : '') + '" data-act="react" data-m="' + m.id + '" data-e="' + e + '">' + e + ' ' + g[e].n + '</button>'; }).join('') + '</div>';
}
function msgHTML(m, prev, kind, opt) {
  var isReplyInCh = kind === 'ch' && m.parent_id;
  var cont = prev && !opt.first && prev.sender_id === m.sender_id && !isReplyInCh && !(kind === 'ch' && prev.parent_id) &&
    ts(m.created_at) - ts(prev.created_at) < 3e5 && dayKey(m.created_at) === dayKey(prev.created_at);
  var un = unreadOf(m, kind);
  var body = m.deleted_at ? '<div class="mt del">삭제된 메시지예요</div>' :
    (m.body ? '<div class="mt">' + rich(m.body, opt.hl) + (m.edited_at ? '<span class="ed">(수정됨)</span>' : '') + '</div>' : '') + attHTML(m) + rxHTML(m);
  var thr = '';
  if (kind === 'ch' && !m.parent_id && m.reply_count > 0) thr = '<button class="thr" data-act="thread" data-m="' + m.id + '"><span class="avs">' + (m.reply_users || []).slice(0, 3).map(function (u) { return av(u, 's'); }).join('') + '</span><b>답글 ' + m.reply_count + '개</b>' + rel(m.last_reply_at) + I.chev + '</button>';
  return '<div class="msg' + (cont ? ' cont' : '') + (opt.isNew ? ' new' : '') + '" data-id="' + m.id + '" data-kind="' + kind + '" data-act="msg">' +
    (cont ? '<span></span>' : av(m.sender_id)) + '<div class="mb">' +
    (cont ? '' : '<div class="mh"><b>' + esc(name(m.sender_id)) + '</b><time>' + fmtTime(m.created_at) + '</time>' + (isReplyInCh ? '<span class="tag">스레드 답글</span>' : '') + '</div>') +
    body + thr + '</div><div class="mr">' + (un ? '<span class="un" data-act="readers" data-m="' + m.id + '" data-kind="' + kind + '">' + un + '</span>' : '') + '</div>' +
    (m.deleted_at ? '' : '<button class="more" data-act="sheet" data-m="' + m.id + '" data-kind="' + kind + '" aria-label="더 보기">' + I.more + '</button>') + '</div>';
}
function listHTML(kind) {
  var ctx = kind === 'th' ? S.th : S.ch, h = '', prev = null, lined = false;
  if (ctx.loading) return skel(6);
  if (kind === 'ch' && ctx.more) h += '<button class="loadmore" data-act="older">이전 메시지 더 보기</button>';
  if (!ctx.msgs.length) return '<div class="empty"><img src="' + B.img('taang_hello') + '" alt="">첫 메시지를 남겨 보세요.</div>';
  ctx.msgs.forEach(function (m, i) {
    var first = false, t = ts(m.created_at);
    if (kind === 'ch' && (!prev || dayKey(prev.created_at) !== dayKey(m.created_at))) { h += '<div class="day">' + fmtDay(m.created_at) + '</div>'; first = true; }
    if (ctx.newFrom && t > ctx.newFrom && (kind === 'ch' || i > 0)) {
      if (!lined && prev && m.sender_id !== S.me.id) { h += '<div class="newline">여기서부터 새 메시지</div>'; first = true; }
      lined = true;
    }
    h += msgHTML(m, kind === 'th' && i === 1 ? null : prev, kind, { first: first, hl: ctx.hl, isNew: m.id === ctx.justAdded });
    if (kind === 'th' && i === 0) h += '<div class="thead">답글 ' + (ctx.msgs.length - 1) + '개</div>';
    prev = m;
  });
  ctx.justAdded = null;
  return h;
}
function renderMsgs(kind, opt) {
  opt = opt || {};
  var ctx = kind === 'th' ? S.th : S.ch; if (!ctx) return;
  var el = $('#list-' + kind); if (!el) return;
  var nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120, top = el.scrollTop, hOld = el.scrollHeight;
  el.innerHTML = listHTML(kind);
  if (opt.keepTop) el.scrollTop = el.scrollHeight - hOld + top;
  else if (opt.bottom || nearBottom) el.scrollTop = el.scrollHeight;
  else el.scrollTop = top;
  loadImages(el);
  if (ctx.focus) { var f = ctx.focus; ctx.focus = null; focusMsg(kind, f); }
}
function loadImages(root) {
  Array.prototype.forEach.call(root.querySelectorAll('[data-img]'), function (el) {
    var a = findAtt(el.dataset.m, el.dataset.a); if (!a) return;
    B.imageUrl(a).then(function (u) { if (u) { el.style.backgroundImage = 'url("' + u + '")'; el.classList.remove('sk'); } }).catch(function () { el.classList.remove('sk'); });
  });
}
function findMsg(id) {
  var pools = [S.th && S.th.msgs, S.ch && S.ch.msgs];
  for (var p = 0; p < 2; p++) if (pools[p]) for (var i = 0; i < pools[p].length; i++) if (pools[p][i].id === id) return pools[p][i];
  return null;
}
function findAtt(mid, aid) { var m = findMsg(mid); if (!m) return null; return (m.attachments || []).filter(function (a) { return a.id === aid; })[0] || null; }
function focusMsg(kind, id) {
  var el = $('#list-' + kind + ' [data-id="' + id + '"]'); if (!el) return;
  el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1700);
}

/* ───────── 입력창 ───────── */
function compHTML(kind) {
  var c = kind === 'ch' ? chan(S.ch.id) : null;
  if (kind === 'ch' && c && c.post_policy === 'staff' && !isStaff()) return '<div class="ro">운영진만 글을 쓸 수 있어요. 메시지를 눌러 스레드로 답할 수 있어요.</div>';
  return '<div class="comp" id="comp-' + kind + '"><div id="cx-' + kind + '"></div><div class="bar">' +
    '<button class="ib" data-act="attach" data-kind="' + kind + '" aria-label="파일 첨부">' + I.plus + '</button>' +
    '<textarea id="ta-' + kind + '" rows="1" placeholder="' + (kind === 'th' ? '답글 쓰기' : '메시지 쓰기') + '" data-kind="' + kind + '"></textarea>' +
    '<button class="send" id="send-' + kind + '" data-act="send" data-kind="' + kind + '" aria-label="보내기">' + I.send + '</button></div>' +
    '<input type="file" id="file-' + kind + '" multiple hidden data-kind="' + kind + '"></div>';
}
function renderCtx(kind) {
  var ctx = kind === 'th' ? S.th : S.ch, el = $('#cx-' + kind); if (!el || !ctx) return;
  var h = '';
  if (ctx.mq != null) {
    var list = mentionCandidates(kind, ctx.mq);
    if (list.length) h += '<div class="mlist">' + list.map(function (u) { return '<button data-act="pick" data-kind="' + kind + '" data-n="' + esc(u.name) + '">' + (u.id ? av(u.id, 's') : '<span class="av s" style="background:var(--warn)">@</span>') + esc(u.name) + (u.id ? '' : ' <small style="color:var(--sub)">채널 전원에게 알림</small>') + '</button>'; }).join('') + '</div>';
  }
  if (ctx.edit) h += '<div class="ctx"><span>메시지 수정 중</span><button data-act="cancelEdit" data-kind="' + kind + '">취소</button></div>';
  if (ctx.pending.length) h += '<div class="pend">' + ctx.pending.map(function (f, i) { return '<span><i>' + esc(f.name) + '</i><button data-act="unfile" data-kind="' + kind + '" data-i="' + i + '" aria-label="빼기">✕</button></span>'; }).join('') + '</div>';
  if (kind === 'th' && !ctx.edit && canAlso()) h += '<button class="also' + (ctx.also ? ' on' : '') + '" data-act="also"><i>' + I.check + '</i>채널에도 보내기</button>';
  el.innerHTML = h;
  var sb = $('#send-' + kind); if (sb) { sb.classList.toggle('busy', !!ctx.sending); sb.disabled = !!ctx.sending; }
}
function canAlso() { var c = S.th && S.th.root && chan(S.th.root.channel_id); return c && (c.post_policy === 'all' || isStaff()); }
function mentionCandidates(kind, q) {
  var cm = (kind === 'th' ? S.th.cm : S.ch.cm) || [];
  var l = cm.map(function (r) { return S.members[r.member_id]; }).filter(function (u) { return u && u.id !== S.me.id && u.name.indexOf(q) >= 0; });
  if (isStaff() && '채널'.indexOf(q) >= 0) l.unshift({ id: null, name: '채널' });
  return l.slice(0, 8);
}
function onInput(ta) {
  var kind = ta.dataset.kind, ctx = kind === 'th' ? S.th : S.ch;
  ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
  var m = ta.value.slice(0, ta.selectionStart).match(/@([^\s@]*)$/), mq = m ? m[1] : null;
  if (mq !== ctx.mq) { ctx.mq = mq; renderCtx(kind); }
}
function parseMentions(body, cm) {
  var ids = [];
  (cm || []).forEach(function (r) { var u = S.members[r.member_id]; if (u && u.id !== S.me.id && body.indexOf('@' + u.name) >= 0) ids.push(u.id); });
  return { ids: ids, all: isStaff() && body.indexOf('@채널') >= 0 };
}
function send(kind) {
  var ctx = kind === 'th' ? S.th : S.ch, ta = $('#ta-' + kind), body = ta.value.trim();
  if (!ctx || ctx.sending || (!body && !ctx.pending.length)) return;
  ctx.sending = true; ctx.mq = null; renderCtx(kind);
  var done = function () { ctx.sending = false; renderCtx(kind); };
  if (ctx.edit) {
    if (!body) { done(); return toast('내용을 입력해 주세요'); }
    return B.edit(ctx.edit, body).then(function (m) { ctx.edit = null; ta.value = ''; onInput(ta); upsertMsg(m); }).catch(fail).then(done);
  }
  var channel = kind === 'th' ? S.th.root.channel_id : S.ch.id, files = [], chain = Promise.resolve();
  ctx.pending.forEach(function (f) { chain = chain.then(function () { return B.upload(f, channel); }).then(function (a) { files.push(a); }); });
  var men = parseMentions(body, ctx.cm);
  chain.then(function () {
    return B.send({ channel_id: channel, body: body, parent_id: kind === 'th' ? S.th.id : null, also_to_channel: kind === 'th' && !!ctx.also, mention_ids: men.ids, mention_all: men.all, files: files });
  }).then(function (m) {
    ta.value = ''; ctx.pending = []; ctx.also = false; onInput(ta); ctx.justAdded = m.id; upsertMsg(m, true);
  }).catch(function (e) { if (files.length || ctx.pending.length) e.userMessage = e.userMessage || '파일을 올리지 못했어요'; fail(e); }).then(done);
}

/* ───────── 채널 ───────── */
function openChannel(id, focus) {
  var c = chan(id);
  S.ch = { id: id, msgs: [], cm: [], loading: true, more: false, pending: [], edit: null, newFrom: c ? ts(c.last_read_at) : 0, focus: focus, hl: null };
  $('#scr-channel').innerHTML = '<div class="top line"><button class="ib" data-act="back" aria-label="뒤로">' + I.back + '</button><div class="ttl"><b>' + (c ? esc(c.name) : '') + '</b><small>' + (c ? '구성원 ' + c.member_count + '명' : '') + '</small></div>' +
    '<button class="ib" data-act="search" data-c="' + id + '" aria-label="검색">' + I.search + '</button><button class="ib" data-act="notif" aria-label="알림 설정">' + (c && c.notify === 'mentions' ? I.bellOff : I.bell) + '</button></div>' +
    '<div class="msgs" id="list-ch">' + skel(6) + '</div>' + (c ? compHTML('ch') : '');
  if (!c) { S.ch.loading = false; $('#list-ch').innerHTML = '<div class="empty"><img src="' + B.img('taang_sorry') + '" alt="">볼 수 없는 채널이에요.</div>'; return; }
  Promise.all([B.listMessages(id), B.channelMembers(id)]).then(function (d) {
    if (!S.ch || S.ch.id !== id) return;
    S.ch.msgs = d[0]; S.ch.cm = d[1]; S.ch.loading = false; S.ch.more = d[0].length >= 50;
    if (S.th && S.th.root && S.th.root.channel_id === id) S.th.cm = d[1];
    renderMsgs('ch', { bottom: true }); renderCtx('ch'); markRead();
  }).catch(fail);
}
var mrT;
function markRead() {
  if (!S.ch || S.ch.loading || document.hidden || S.route.t) return;
  var id = S.ch.id; clearTimeout(mrT);
  mrT = setTimeout(function () {
    var c = chan(id); if (c) { c.unread = 0; c.mentions = 0; }
    var mine = S.ch && S.ch.id === id && S.ch.cm.filter(function (r) { return r.member_id === S.me.id; })[0];
    if (mine) mine.last_read_at = new Date().toISOString();
    B.markRead(id).catch(function () {});
  }, 400);
}
function upsertInto(arr, m) {
  for (var i = 0; i < arr.length; i++) if (arr[i].id === m.id) { arr[i] = m; return false; }
  arr.push(m); arr.sort(function (a, b) { return ts(a.created_at) - ts(b.created_at); }); return true;
}
function upsertMsg(m, mine) {
  if (!m) return;
  if (S.ch && !S.ch.loading && m.channel_id === S.ch.id && (!m.parent_id || m.also_to_channel)) {
    var added = upsertInto(S.ch.msgs, m);
    if (added && !mine && m.sender_id !== S.me.id) S.ch.justAdded = m.id;
    renderMsgs('ch', { bottom: mine });
    if (added && m.sender_id !== S.me.id) markRead();
  }
  if (S.th && !S.th.loading && (m.id === S.th.id || m.parent_id === S.th.id)) {
    if (m.id === S.th.id) { S.th.root = m; S.th.msgs[0] = m; } else {
      var add2 = upsertInto(S.th.msgs, m);
      if (add2 && m.sender_id !== S.me.id) { S.th.justAdded = m.id; B.markThreadRead(S.th.id).catch(function () {}); }
    }
    renderMsgs('th', { bottom: mine });
  }
  refreshOverview();
}
function onRead(r) {
  var patch = function (cm) { (cm || []).forEach(function (x) { if (x.member_id === r.member_id) x.last_read_at = r.last_read_at; }); };
  if (S.ch && S.ch.id === r.channel_id) { patch(S.ch.cm); renderMsgs('ch'); }
  if (S.th && S.th.root && S.th.root.channel_id === r.channel_id) { if (!S.ch || S.th.cm !== S.ch.cm) patch(S.th.cm); renderMsgs('th'); }
}
function onThreadRead(r) {
  if (!S.th || r.root_id !== S.th.id) return;
  var f = S.th.reads.filter(function (x) { return x.member_id === r.member_id; })[0];
  if (f) { f.last_read_at = r.last_read_at; f.following = r.following; } else S.th.reads.push(r);
  renderMsgs('th'); renderThreadTop();
}

/* ───────── 스레드 ───────── */
function openThread(id, focus) {
  S.th = { id: id, msgs: [], reads: [], cm: [], loading: true, pending: [], edit: null, also: false, focus: focus, newFrom: 0 };
  $('#scr-thread').innerHTML = '<div class="top line" id="th-top"></div><div class="msgs" id="list-th">' + skel(4) + '</div>' + compHTML('th');
  renderThreadTop();
  B.listThread(id).then(function (d) {
    if (!S.th || S.th.id !== id) return;
    if (!d.root) { S.th.loading = false; $('#list-th').innerHTML = '<div class="empty"><img src="' + B.img('taang_sorry') + '" alt="">볼 수 없는 스레드예요.</div>'; return; }
    S.th.root = d.root; S.th.msgs = [d.root].concat(d.replies); S.th.reads = d.reads; S.th.loading = false;
    var mine = d.reads.filter(function (r) { return r.member_id === S.me.id; })[0];
    S.th.newFrom = mine ? ts(mine.last_read_at) : 0;
    var useCh = S.ch && S.ch.id === d.root.channel_id && !S.ch.loading;
    return (useCh ? Promise.resolve(S.ch.cm) : B.channelMembers(d.root.channel_id)).then(function (cm) {
      if (!S.th || S.th.id !== id) return;
      S.th.cm = cm; renderThreadTop(); renderMsgs('th', { bottom: !S.th.focus }); renderCtx('th');
      B.markThreadRead(id).then(refreshOverview).catch(function () {});
    });
  }).catch(fail);
}
function renderThreadTop() {
  var el = $('#th-top'); if (!el || !S.th) return;
  var c = S.th.root && chan(S.th.root.channel_id);
  var mine = S.th.reads.filter(function (r) { return r.member_id === S.me.id; })[0], fol = !!(mine && mine.following);
  el.innerHTML = '<button class="ib" data-act="back" aria-label="뒤로">' + I.back + '</button><div class="ttl"><b>스레드</b><small>' + (c ? esc(c.name) : '') + '</small></div>' +
    (S.th.root ? '<button class="ib' + (fol ? ' on' : '') + '" data-act="follow" aria-label="스레드 알림">' + (fol ? I.bell : I.bellOff) + '</button>' : '');
}

/* ───────── 시트 ───────── */
function openSheet(html, cls) {
  var r = $('#sheet-root');
  r.innerHTML = '<div class="scrim" data-act="closeSheet"></div><div class="sheet ' + (cls || '') + '"><div class="grab"></div>' + html + '</div>';
}
function closeSheet(now) {
  var r = $('#sheet-root'); if (!r.firstChild) return;
  if (now === true) { r.innerHTML = ''; return; }
  var kids = r.children; for (var i = 0; i < kids.length; i++) kids[i].classList.add('out');
  setTimeout(function () { if (r.querySelector('.out')) r.innerHTML = ''; }, 200);
}
function msgSheet(id, kind) {
  var m = findMsg(id); if (!m || m.deleted_at) return;
  var mine = m.sender_id === S.me.id, my = {};
  (m.reactions || []).forEach(function (r) { if (r.member_id === S.me.id) my[r.emoji] = 1; });
  var a = function (act, icon, label, cls) { return '<button class="act ' + (cls || '') + '" data-act="' + act + '" data-m="' + id + '" data-kind="' + kind + '">' + icon + label + '</button>'; };
  openSheet('<div class="emo">' + EMOJI.map(function (e) { return '<button class="' + (my[e] ? 'on' : '') + '" data-act="react" data-m="' + id + '" data-e="' + e + '">' + e + '</button>'; }).join('') + '</div>' +
    (kind === 'ch' ? a('thread', I.reply, '스레드에서 답글 달기') : '') + (m.body ? a('copy', I.copy, '복사') : '') + a('readers', I.eye, '읽음 확인') +
    (mine && m.body ? a('edit', I.edit, '수정') : '') + (mine || S.me.role === 'admin' ? a('del', I.trash, '삭제', 'danger') : ''));
}
function readersSheet(id, kind) {
  var m = findMsg(id); if (!m) return;
  var t = ts(m.created_at), rows;
  if (kind === 'th' && m.parent_id) rows = S.th.reads.filter(function (r) { return r.following; });
  else rows = (kind === 'th' ? S.th.cm : S.ch.cm) || [];
  rows = rows.filter(function (r) { return r.member_id !== m.sender_id; });
  var n = rows.filter(function (r) { return ts(r.last_read_at) >= t; }).length;
  openSheet('<h3>읽음 ' + n + ' · 안 읽음 ' + (rows.length - n) + '</h3>' + (kind === 'th' && m.parent_id ? '<div style="font-size:12.5px;color:var(--sub);margin:-6px 2px 8px">스레드 참여자 기준이에요</div>' : '') +
    rows.map(function (r) { var ok = ts(r.last_read_at) >= t; return '<div class="who">' + av(r.member_id, 's') + '<span>' + esc(name(r.member_id)) + '</span><em class="' + (ok ? '' : 'no') + '">' + (ok ? '읽음' : '안 읽음') + '</em></div>'; }).join(''));
}
function notifSheet() {
  var c = chan(S.ch.id); if (!c) return;
  openSheet('<h3>' + esc(c.name) + ' 알림</h3><div class="opt"><div class="g"><b>모든 메시지 알림</b><small>끄면 나를 멘션했을 때만 알려요</small></div><button class="toggle' + (c.notify === 'all' ? ' on' : '') + '" data-act="setNotify" aria-label="모든 메시지 알림"></button></div>' +
    '<div class="opt"><div class="g"><b>멘션은 항상 알림</b><small>@' + esc(S.me.name) + ' · @채널</small></div><button class="toggle on" disabled style="opacity:.5" aria-label="항상 켜짐"></button></div>');
}
function previewSheet(mid, aid) {
  var a = findAtt(mid, aid); if (!a) return;
  var h = '<h3 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a.name) + '</h3><div class="pv" id="pv">';
  if (isImg(a)) h += '<div class="sk" style="width:100%;height:100%"></div>';
  else if (B.demo) h += '<div class="fake"><div class="slide">' + esc(a.name.replace(/\.[^.]+$/, '')) + '</div>실제 앱에서는 여기에<br>구글 드라이브 미리보기가 열려요.</div>';
  else h += '<iframe src="' + esc(B.previewUrl(a)) + '" allow="autoplay"></iframe>';
  h += '</div>' + (B.demo ? '' : '<div style="display:flex;gap:8px;margin-top:12px"><a class="btn soft" style="text-decoration:none;color:inherit" href="' + esc(B.openUrl(a)) + '" target="_blank" rel="noopener">드라이브에서 열기</a></div><div style="font-size:12px;color:var(--sub);margin-top:8px;text-align:center">미리보기가 안 보이면 [드라이브에서 열기]를 눌러 주세요.</div>');
  openSheet(h, 'tall');
  if (isImg(a)) B.imageUrl(a).then(function (u) { var p = $('#pv'); if (p && u) p.innerHTML = '<img src="' + u + '" alt="">'; }).catch(function () {});
}
function installSheet() {
  openSheet('<div style="text-align:center"><img src="' + B.img('taang_guide') + '" style="width:110px" alt=""></div><h3>홈 화면에 추가하기</h3><ol class="steps">' +
    (isIOS() ? '<li>사파리로 이 주소를 열어요.</li><li>아래 가운데 <b>공유 버튼</b>(네모에 화살표)을 눌러요.</li><li><b>홈 화면에 추가</b>를 눌러요.</li><li>홈 화면의 Batang을 열고 알림을 켜요.</li>'
             : '<li>크롬 오른쪽 위 <b>⋮</b> 메뉴를 눌러요.</li><li><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요.</li><li>홈 화면의 Batang을 열고 알림을 켜요.</li>') + '</ol>');
}
var srT, srScope = null;
function searchSheet(cid) {
  srScope = cid || null;
  openSheet('<div class="sbox">' + I.search + '<input id="sq" placeholder="' + (cid ? '이 채널에서 검색' : '모든 채널에서 검색') + '" autocomplete="off"></div><div class="sres" id="sres"><div class="empty">찾고 싶은 말을 입력해 주세요.</div></div>', 'tall');
  setTimeout(function () { var i = $('#sq'); if (i) i.focus(); }, 320);
}
function doSearch(q) {
  clearTimeout(srT); q = q.trim();
  if (q.length < 2) { $('#sres').innerHTML = '<div class="empty">두 글자 이상 입력해 주세요.</div>'; return; }
  srT = setTimeout(function () {
    B.search(q, srScope).then(function (rows) {
      var el = $('#sres'); if (!el) return;
      el.innerHTML = rows.length ? rows.map(function (m) {
        var c = chan(m.channel_id);
        return '<button class="item" data-act="hit" data-c="' + m.channel_id + '" data-t="' + (m.parent_id || '') + '" data-id="' + m.id + '" data-q="' + esc(q) + '"><div class="meta"><b>' + esc(name(m.sender_id)) + '</b>· ' + esc(c ? c.name : '') + ' · ' + rel(m.created_at) + '</div><div class="tx">' + rich(m.body, q) + '</div></button>';
      }).join('') : '<div class="empty"><img src="' + B.img('taang_thinking') + '" alt="">찾는 메시지가 없어요.</div>';
    }).catch(fail);
  }, 300);
}

/* ───────── 누르기 ───────── */
var ACT = {
  signin: function () { B.signIn(); }, signout: function () { B.signOut(); }, reload: function () { location.reload(); },
  tab: function (el) { S.tab = el.dataset.tab; renderTabbar(); renderTab(); loadTab(); if (S.tab === 'home') refreshOverview(); if (S.tab === 'me') refreshPush(); },
  open: function (el) { go('#/c/' + el.dataset.c); },
  back: back, closeSheet: function () { closeSheet(); },
  link: function () {},
  msg: function (el) { if (el.dataset.kind === 'ch') ACT.thread({ dataset: { m: el.dataset.id } }); else msgSheet(el.dataset.id, 'th'); },
  sheet: function (el) { msgSheet(el.dataset.m, el.dataset.kind); },
  thread: function (el) { var m = findMsg(el.dataset.m); if (!m) return; closeSheet(true); go('#/c/' + m.channel_id + '/t/' + (m.parent_id || m.id)); },
  readers: function (el) { readersSheet(el.dataset.m, el.dataset.kind); },
  copy: function (el) { var m = findMsg(el.dataset.m); closeSheet(); if (navigator.clipboard) navigator.clipboard.writeText(m.body).then(function () { toast('복사했어요'); }, function () {}); },
  edit: function (el) {
    var m = findMsg(el.dataset.m), kind = el.dataset.kind, ctx = kind === 'th' ? S.th : S.ch, ta = $('#ta-' + kind); closeSheet();
    if (!ta) return; ctx.edit = m.id; ctx.pending = []; ta.value = m.body; onInput(ta); renderCtx(kind); ta.focus();
  },
  cancelEdit: function (el) { var k = el.dataset.kind, ctx = k === 'th' ? S.th : S.ch, ta = $('#ta-' + k); ctx.edit = null; ta.value = ''; onInput(ta); renderCtx(k); },
  del: function (el) {
    var id = el.dataset.m;
    openSheet('<h3>이 메시지를 삭제할까요?</h3><div style="color:var(--sub);font-size:14px;margin:-4px 2px 14px">삭제하면 되돌릴 수 없고, 백업에서도 지워져요.</div><div style="display:flex;gap:8px"><button class="btn soft" data-act="closeSheet">취소</button><button class="btn danger" data-act="delYes" data-m="' + id + '">삭제</button></div>');
  },
  delYes: function (el) { closeSheet(); B.remove(el.dataset.m).then(function (m) { upsertMsg(m); toast('삭제했어요'); }).catch(fail); },
  react: function (el) {
    var m = findMsg(el.dataset.m), e = el.dataset.e; if (!m) return; closeSheet();
    var on = (m.reactions || []).some(function (r) { return r.member_id === S.me.id && r.emoji === e; });
    m.reactions = (m.reactions || []).filter(function (r) { return !(r.member_id === S.me.id && r.emoji === e); });
    if (!on) m.reactions.push({ member_id: S.me.id, emoji: e });
    renderMsgs('ch'); renderMsgs('th');
    B.react(m.id, e, on).catch(fail);
  },
  preview: function (el) { previewSheet(el.dataset.m, el.dataset.a); },
  older: function () {
    var first = S.ch.msgs[0]; if (!first) return;
    B.listMessages(S.ch.id, first.created_at).then(function (rows) { S.ch.more = rows.length >= 50; S.ch.msgs = rows.concat(S.ch.msgs); renderMsgs('ch', { keepTop: true }); }).catch(fail);
  },
  attach: function (el) { $('#file-' + el.dataset.kind).click(); },
  unfile: function (el) { var ctx = el.dataset.kind === 'th' ? S.th : S.ch; ctx.pending.splice(+el.dataset.i, 1); renderCtx(el.dataset.kind); },
  also: function () { S.th.also = !S.th.also; renderCtx('th'); },
  pick: function (el) {
    var k = el.dataset.kind, ta = $('#ta-' + k), ctx = k === 'th' ? S.th : S.ch, pos = ta.selectionStart;
    var before = ta.value.slice(0, pos).replace(/@([^\s@]*)$/, '@' + el.dataset.n + ' ');
    ta.value = before + ta.value.slice(pos); ctx.mq = null; renderCtx(k); ta.focus(); ta.selectionStart = ta.selectionEnd = before.length;
  },
  send: function (el) { send(el.dataset.kind); },
  notif: notifSheet,
  setNotify: function (el) {
    var c = chan(S.ch.id), mode = c.notify === 'all' ? 'mentions' : 'all'; c.notify = mode; el.classList.toggle('on', mode === 'all');
    $('#scr-channel [data-act="notif"]').innerHTML = mode === 'all' ? I.bell : I.bellOff;
    B.setNotify(c.id, mode).then(function () { toast(mode === 'all' ? '모든 메시지를 알려요' : '멘션만 알려요'); }).catch(fail);
  },
  follow: function () {
    var mine = S.th.reads.filter(function (r) { return r.member_id === S.me.id; })[0], on = !(mine && mine.following);
    if (mine) mine.following = on; else S.th.reads.push({ member_id: S.me.id, root_id: S.th.id, last_read_at: new Date().toISOString(), following: on });
    renderThreadTop(); B.setFollow(S.th.id, on).then(function () { toast(on ? '이 스레드의 새 답글을 알려요' : '이 스레드 알림을 껐어요'); }).catch(fail);
  },
  search: function (el) { searchSheet(el.dataset.c); },
  hit: function (el) {
    var c = el.dataset.c, t = el.dataset.t, id = el.dataset.id; closeSheet(true);
    if (!t && S.ch && S.ch.id === c && !S.route.t) { S.ch.hl = el.dataset.q || null; renderMsgs('ch'); return focusMsg('ch', id); }
    S.focus = id || null; go('#/c/' + c + (t ? '/t/' + t : ''));
  },
  quiet: function (el) { S.me.quiet = !S.me.quiet; el.classList.toggle('on', S.me.quiet); B.setQuiet(S.me.quiet).catch(fail); },
  install: installSheet,
  pushOn: function () { B.enablePush().then(function (p) { S.push = p; renderTab(); toast(p.subscribed ? '알림을 켰어요' : '알림을 켜지 못했어요'); if (p.subscribed) B.testPush().catch(function () {}); }).catch(function (e) { e.userMessage = '알림을 켜지 못했어요'; fail(e); }); },
  pushTest: function () { B.testPush().then(function () { toast('테스트 알림을 보냈어요'); }).catch(fail); }
};
var holdT, held = false;
document.addEventListener('click', function (e) {
  if (held) { held = false; e.preventDefault(); return; }
  var el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'msg' && window.getSelection && String(window.getSelection())) return;
  var f = ACT[el.dataset.act]; if (f) f(el, e);
});
document.addEventListener('pointerdown', function (e) {
  var el = e.target.closest('.msg'); if (!el || e.target.closest('button,a')) return;
  clearTimeout(holdT);
  holdT = setTimeout(function () { held = true; el.classList.add('hold'); setTimeout(function () { el.classList.remove('hold'); }, 300); if (navigator.vibrate) navigator.vibrate(8); msgSheet(el.dataset.id, el.dataset.kind); setTimeout(function () { held = false; }, 700); }, 450);
});
['pointerup', 'pointercancel', 'pointermove', 'scroll'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { if (ev !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 6) clearTimeout(holdT); }, true);
});
document.addEventListener('contextmenu', function (e) { var el = e.target.closest('.msg'); if (el) { e.preventDefault(); clearTimeout(holdT); msgSheet(el.dataset.id, el.dataset.kind); } });
document.addEventListener('input', function (e) {
  if (e.target.tagName === 'TEXTAREA') onInput(e.target);
  if (e.target.id === 'sq') doSearch(e.target.value);
});
document.addEventListener('keydown', function (e) {
  if (e.target.tagName !== 'TEXTAREA' || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;   // 휴대폰에서는 Enter가 줄바꿈
  e.preventDefault(); send(e.target.dataset.kind);
});
document.addEventListener('change', function (e) {
  if (e.target.type !== 'file') return;
  var kind = e.target.dataset.kind, ctx = kind === 'th' ? S.th : S.ch;
  Array.prototype.forEach.call(e.target.files, function (f) { if (f.size > MAX_FILE) toast('25MB보다 큰 파일은 올릴 수 없어요'); else if (ctx.pending.length < 5) ctx.pending.push(f); });
  e.target.value = ''; renderCtx(kind);
});
/* 왼쪽 끝에서 밀어 뒤로 가기 */
var sw = null;
document.addEventListener('touchstart', function (e) {
  var t = e.touches[0], scr = S.route.t ? $('#scr-thread') : S.route.c ? $('#scr-channel') : null;
  if (!scr || t.clientX - $('#app').getBoundingClientRect().left > 24 || $('#sheet-root').firstChild) return;
  sw = { x: t.clientX, y: t.clientY, scr: scr, dx: 0, on: false };
}, { passive: true });
document.addEventListener('touchmove', function (e) {
  if (!sw) return; var t = e.touches[0]; sw.dx = t.clientX - sw.x;
  if (!sw.on) { if (Math.abs(t.clientY - sw.y) > 12) { sw = null; return; } if (sw.dx < 10) return; sw.on = true; sw.scr.classList.add('drag'); }
  sw.scr.style.transform = 'translateX(' + Math.max(0, sw.dx) + 'px)';
}, { passive: true });
document.addEventListener('touchend', function () {
  if (!sw) return; var s = sw; sw = null; if (!s.on) return;
  s.scr.classList.remove('drag'); s.scr.style.transform = '';
  if (s.dx > s.scr.clientWidth * 0.33) back();
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', function () {
  if (document.hidden || !S.me) return;
  refreshOverview();
  if (S.ch && !S.ch.loading) B.listMessages(S.ch.id).then(function (rows) {
    if (!S.ch) return; rows.forEach(function (m) { upsertInto(S.ch.msgs, m); }); renderMsgs('ch'); markRead();
  }).catch(function () {});
  if (S.th && !S.th.loading) B.listThread(S.th.id).then(function (d) { if (!S.th || !d.root) return; S.th.root = d.root; S.th.msgs = [d.root].concat(d.replies); S.th.reads = d.reads; renderMsgs('th'); }).catch(function () {});
});
window.BATANG_BOOT = boot;
boot();
})();

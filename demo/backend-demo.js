/* Batang 시연용 가짜 서버: 모든 데이터가 이 화면 안에만 있고, 새로 고치면 처음으로 돌아가요. */
(function () {
'use strict';
var IMG = window.DEMO_IMG || {};
var uid = 0; function id(p) { return p + '-' + (++uid); }
var now = Date.now();
function ago(min) { return new Date(now - min * 6e4).toISOString(); }
function wait(v, ms) { return new Promise(function (r) { setTimeout(function () { r(JSON.parse(JSON.stringify(v === undefined ? null : v))); }, ms == null ? 120 : ms); }); }

var names = ['김정훈', '김유나', '김서연', '박지호', '이하린', '최민준', '정유나', '한도윤', '윤채원', '오세훈', '강지민', '임수아', '송현우', '배다은', '조예린', '신우진'];
var M = {}, members = names.map(function (n, i) { var m = { id: 'u' + i, name: n, email: 'member' + i + '@example.com', avatar_url: null }; M[n] = m.id; return m; });
var me = { id: 'u0', name: '김정훈', email: 'jake@example.com', role: 'admin', quiet: true };
members[0].email = me.email;
var all = names.slice(), heads = ['김정훈', '김유나', '김서연', '박지호', '이하린', '최민준'];
var defs = [
  ['공지', false, 'staff', all], ['자유', false, 'all', all], ['국장방', true, 'all', heads],
  ['기획국', true, 'all', ['김정훈', '김유나', '김서연', '정유나', '한도윤', '윤채원']],
  ['대외협력국', true, 'all', ['김정훈', '김유나', '박지호', '오세훈', '강지민']],
  ['홍보국', true, 'all', ['김정훈', '김유나', '이하린', '임수아', '송현우', '배다은']],
  ['사무국', true, 'all', ['김정훈', '김유나', '최민준', '조예린', '신우진']]
];
var channels = [], cms = [], msgs = [], treads = [], C = {};
defs.forEach(function (d, i) {
  var c = { id: 'c' + i, name: d[0], is_private: d[1], post_policy: d[2], sort: i }; channels.push(c); C[d[0]] = c.id;
  d[3].forEach(function (n) { cms.push({ channel_id: c.id, member_id: M[n], last_read_at: ago(n === '김정훈' ? 200 : Math.random() * 30), notify: 'all' }); });
});
function add(ch, who, min, body, o) {
  o = o || {};
  var m = { id: id('m'), channel_id: C[ch], sender_id: M[who], body: body, parent_id: o.parent || null, also_to_channel: !!o.also,
    mention_ids: (o.mention || []).map(function (n) { return M[n]; }), mention_all: !!o.all, reply_count: 0, last_reply_at: null, reply_users: [],
    edited_at: o.edited ? ago(min - 1) : null, deleted_at: null, created_at: ago(min),
    attachments: (o.files || []).map(function (f) { return { id: id('a'), drive_file_id: id('f'), name: f[0], mime: f[1], size: f[2] }; }),
    reactions: (o.rx || []).map(function (r) { return { member_id: M[r[0]], emoji: r[1] }; }) };
  msgs.push(m);
  if (m.parent_id) {
    var r = byId(m.parent_id); r.reply_count++; r.last_reply_at = m.created_at; if (r.reply_users.indexOf(m.sender_id) < 0) r.reply_users.push(m.sender_id);
    [r.sender_id, m.sender_id].concat(r.mention_ids, m.mention_ids).forEach(function (u) { follow(u, r.id, u === m.sender_id ? m.created_at : null); });
  }
  return m.id;
}
function byId(x) { for (var i = 0; i < msgs.length; i++) if (msgs[i].id === x) return msgs[i]; return null; }
function follow(u, root, readAt) {
  var f = treads.filter(function (t) { return t.member_id === u && t.root_id === root; })[0];
  if (!f) { f = { member_id: u, root_id: root, last_read_at: readAt || byId(root).created_at, following: true }; treads.push(f); }
  else if (readAt) { f.last_read_at = readAt; f.following = true; }
  return f;
}
var PPT = 'application/vnd.openxmlformats-officedocument.presentationml.presentation', DOC = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

var n1 = add('공지', '김정훈', 1500, '@채널 2027 바탕 운영진 메신저를 열었어요 🎉\n공지와 파일은 앞으로 여기에만 올릴게요.', { all: true, rx: [['김유나', '🎉'], ['김서연', '🎉'], ['박지호', '👍'], ['임수아', '👍'], ['조예린', '✅']] });
add('공지', '임수아', 1490, '홈 화면에 추가하니까 진짜 앱 같아요!', { parent: n1 });
add('공지', '김유나', 1480, '알림 안 오시는 분은 내 정보 탭에서 테스트 눌러 보세요.', { parent: n1 });
var n2 = add('공지', '김유나', 190, '이번 주 전체 회의는 목요일 저녁 6시, 북악관 615호예요. 못 오시는 분은 스레드에 남겨 주세요.', { rx: [['김서연', '✅'], ['최민준', '✅'], ['이하린', '✅']] });
add('공지', '오세훈', 170, '수업이 6시 15분에 끝나서 조금 늦어요!', { parent: n2 });

add('자유', '송현우', 400, '학회실 리모델링 끝나면 집들이 하나요 ㅎㅎ');
add('자유', '윤채원', 395, '타앙이 인형 놓아야죠', { rx: [['송현우', '😂'], ['배다은', '😂']] });
add('자유', '강지민', 60, '오늘 학식 제육이래요');

add('국장방', '김서연', 240, '목요일 회의 안건 모을게요. OT 예산, 굿즈 발주 말고 더 있을까요?');
add('국장방', '박지호', 232, '제휴 카페 협약서 초안 공유드려도 될까요?');
var b1 = add('국장방', '김정훈', 228, '좋아요. 안건은 OT 예산, 굿즈 발주, 제휴 협약 세 가지로 할게요.', { rx: [['김서연', '👍'], ['박지호', '👍']] });
add('국장방', '최민준', 180, '@김정훈 예산 시트 링크도 같이 올려 주실 수 있나요?', { parent: b1, mention: ['김정훈'] });
add('국장방', '이하린', 25, '굿즈 시안은 수요일까지 홍보국에서 올릴게요.');

var p1 = add('기획국', '정유나', 300, 'OT 기획안 1차 올립니다. 피드백 부탁드려요!', { files: [['2027 신입생 OT 기획안_v1.pptx', PPT, 5347737]], rx: [['김서연', '👀'], ['한도윤', '👍']] });
add('기획국', '한도윤', 280, '2부 레크레이션 시간이 조금 긴 것 같아요.', { parent: p1, edited: true });
add('기획국', '김서연', 260, '레크 30분 줄이고 학과 소개를 넣는 건 어때요?', { parent: p1 });
add('기획국', '윤채원', 250, '찬성이에요. 교수님 인사 시간도 10분 필요해요.', { parent: p1 });
add('기획국', '정유나', 40, '반영해서 v2 올렸어요. 레크 30분 줄였습니다.', { parent: p1, also: true, files: [['2027 신입생 OT 기획안_v2.pptx', PPT, 5512000]] });
add('기획국', '김서연', 35, '장소는 북악관 1005호로 예약 넣어 둘게요.');
add('기획국', '김서연', 34, '예약 확정되면 바로 공유할게요.');
add('기획국', '윤채원', 12, '@김정훈 OT 날짜 2월 26일로 확정해도 될까요?', { mention: ['김정훈'] });

var e1 = add('대외협력국', '오세훈', 1440, '정문 앞 카페에서 답변 왔어요. 학생증 보여 주면 10% 할인 확정!', { rx: [['박지호', '🎉'], ['강지민', '🎉'], ['김정훈', '👍']] });
add('대외협력국', '강지민', 1400, '협약서 초안이에요.', { files: [['제휴 협약서_초안.docx', DOC, 287000]] });
add('대외협력국', '박지호', 1390, '바탕화면 KMU 혜택 메뉴에도 올려야겠네요.', { parent: e1 });

add('홍보국', '임수아', 320, 'OT 포스터 시안이에요.', { files: [['OT_포스터_시안1.png', 'image/png', 2411724]], rx: [['송현우', '👍'], ['이하린', '👍'], ['배다은', '🎉']] });
add('홍보국', '송현우', 310, '색감 너무 좋아요. 민트가 로고랑 잘 맞네요.');
add('홍보국', '이하린', 90, '@배다은 카드뉴스 문구 내일까지 가능할까요?', { mention: ['배다은'] });

add('사무국', '조예린', 1300, '지난 회의록 드라이브에 올렸어요.', { files: [['11월 2주차 회의록.docx', DOC, 54000]] });
add('사무국', '신우진', 1290, '확인했습니다!', { rx: [['조예린', '🙏']] });
msgs.forEach(function (m) { if (m.sender_id === me.id) cms.forEach(function (c) { if (c.channel_id === m.channel_id && c.member_id === me.id && Date.parse(c.last_read_at) < Date.parse(m.created_at)) c.last_read_at = m.created_at; }); });

var H = {}, logged = false, quiet = true, urls = {};
function myCm(cid) { return cms.filter(function (c) { return c.channel_id === cid && c.member_id === me.id; })[0]; }
function inCh(m) { return !m.parent_id || m.also_to_channel; }
function emit(m) { if (H.onMessage) H.onMessage(JSON.parse(JSON.stringify(m))); }
function othersRead(m) {
  var list = m.parent_id && !m.also_to_channel ? treads.filter(function (t) { return t.root_id === m.parent_id && t.following; }) : cms.filter(function (c) { return c.channel_id === m.channel_id; });
  list.filter(function (r) { return r.member_id !== me.id; }).forEach(function (r, i) {
    setTimeout(function () {
      r.last_read_at = new Date().toISOString();
      if (r.root_id) { if (H.onThreadRead) H.onThreadRead(JSON.parse(JSON.stringify(r))); } else if (H.onRead) H.onRead(JSON.parse(JSON.stringify(r)));
    }, 1500 + i * 1300 + Math.random() * 900);
  });
}
function pushBanner(title, body, hash) {
  var el = document.getElementById('demo-push');
  if (!el) { el = document.createElement('button'); el.id = 'demo-push'; document.getElementById('app').appendChild(el);
    el.style.cssText = 'position:absolute;top:10px;left:10px;right:10px;z-index:80;display:flex;gap:10px;align-items:center;text-align:left;padding:11px 13px;border-radius:18px;background:var(--card);box-shadow:0 10px 30px rgba(0,0,0,.22);transform:translateY(-140%);transition:transform .35s cubic-bezier(.2,1.2,.4,1)'; }
  el.innerHTML = '<span style="width:36px;height:36px;border-radius:10px;background:#668485;color:#fff;display:grid;place-items:center;font-weight:800;flex:none">B</span><span style="min-width:0"><b style="display:block;font-size:13.5px">' + title + '</b><span style="display:block;font-size:13px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + body + '</span></span>';
  el.onclick = function () { el.style.transform = 'translateY(-140%)'; location.hash = hash; };
  requestAnimationFrame(function () { el.style.transform = 'none'; });
  setTimeout(function () { el.style.transform = 'translateY(-140%)'; }, 4200);
}
function incoming(ch, who, body, o, delay) {
  setTimeout(function () {
    var mid = add(ch, who, 0, body, o), m = byId(mid); m.created_at = new Date().toISOString();
    if (m.parent_id) byId(m.parent_id).last_reply_at = m.created_at;
    emit(m); if (m.parent_id) emit(byId(m.parent_id));
    var open = location.hash.indexOf('/c/' + m.channel_id) >= 0;
    if (!open || document.hidden) pushBanner(ch + (m.parent_id ? ' 스레드' : '') + ' · ' + who, body, '#/c/' + m.channel_id + (m.parent_id ? '/t/' + m.parent_id : ''));
  }, delay);
}

window.BACKEND = {
  demo: true, useServiceWorker: false, version: '시연용',
  img: function (n) { return IMG[n] || ''; },
  init: function () { return wait(logged ? { status: 'ok', me: me } : { status: 'signedout' }, 200); },
  signIn: function () {
    logged = true; window.BATANG_BOOT();
    incoming('홍보국', '배다은', '@김정훈 카드뉴스 초안 올렸어요! 확인 부탁드려요', { mention: ['김정훈'] }, 6000);
    incoming('기획국', '한도윤', '저는 26일 좋아요!', {}, 16000);
  },
  signOut: function () { location.hash = ''; location.reload(); },
  listMembers: function () { return wait(members); },
  overview: function () {
    return wait(channels.filter(function (c) { return myCm(c.id); }).map(function (c) {
      var cm = myCm(c.id), t = Date.parse(cm.last_read_at);
      var un = msgs.filter(function (m) { return m.channel_id === c.id && inCh(m) && !m.deleted_at && m.sender_id !== me.id && Date.parse(m.created_at) > t; });
      return { id: c.id, name: c.name, is_private: c.is_private, post_policy: c.post_policy, sort: c.sort, notify: cm.notify, last_read_at: cm.last_read_at, unread: un.length,
        mentions: un.filter(function (m) { return m.mention_all || m.mention_ids.indexOf(me.id) >= 0; }).length, member_count: cms.filter(function (x) { return x.channel_id === c.id; }).length };
    }));
  },
  channelMembers: function (cid) { return wait(cms.filter(function (c) { return c.channel_id === cid; })); },
  listMessages: function (cid, before) {
    var rows = msgs.filter(function (m) { return m.channel_id === cid && inCh(m) && (!before || m.created_at < before); }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    return wait(rows.slice(-50), 350);
  },
  getMessage: function (x) { return wait(byId(x)); },
  listThread: function (root) {
    return wait({ root: byId(root), replies: msgs.filter(function (m) { return m.parent_id === root; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; }),
      reads: treads.filter(function (t) { return t.root_id === root; }) }, 300);
  },
  send: function (p) {
    var mid = add(null, null, 0, p.body, {}), m = byId(mid);
    m.channel_id = p.channel_id; m.sender_id = me.id; m.created_at = new Date().toISOString(); m.mention_ids = p.mention_ids || []; m.mention_all = !!p.mention_all;
    m.attachments = (p.files || []).map(function (f) { f.id = id('a'); return f; });
    if (p.parent_id) {
      m.parent_id = p.parent_id; m.also_to_channel = !!p.also_to_channel;
      var r = byId(p.parent_id); r.reply_count++; r.last_reply_at = m.created_at; if (r.reply_users.indexOf(me.id) < 0) r.reply_users.push(me.id);
      [r.sender_id].concat(r.mention_ids, m.mention_ids).forEach(function (u) { follow(u, r.id); });
      var f = follow(me.id, r.id, m.created_at); if (H.onThreadRead) H.onThreadRead(JSON.parse(JSON.stringify(f)));
      setTimeout(function () { emit(r); }, 150);
    }
    if (inCh(m)) myCm(m.channel_id).last_read_at = m.created_at;
    othersRead(m);
    return wait(m, 250);
  },
  edit: function (x, body) { var m = byId(x); m.body = body; m.edited_at = new Date().toISOString(); return wait(m, 200); },
  remove: function (x) { var m = byId(x); m.deleted_at = new Date().toISOString(); m.body = ''; m.attachments = []; m.reactions = []; return wait(m, 200); },
  react: function (x, emoji, wasOn) {
    var m = byId(x); m.reactions = m.reactions.filter(function (r) { return !(r.member_id === me.id && r.emoji === emoji); });
    if (!wasOn) m.reactions.push({ member_id: me.id, emoji: emoji });
    return wait(null);
  },
  markRead: function (cid) { var c = myCm(cid); if (c) c.last_read_at = new Date().toISOString(); return wait(null, 50); },
  markThreadRead: function (root) { treads.forEach(function (t) { if (t.root_id === root && t.member_id === me.id) t.last_read_at = new Date().toISOString(); }); return wait(null, 50); },
  setFollow: function (root, on) { var f = follow(me.id, root, new Date().toISOString()); f.following = on; return wait(null); },
  setNotify: function (cid, mode) { myCm(cid).notify = mode; return wait(null); },
  setQuiet: function (on) { quiet = on; return wait(null); },
  myThreads: function () {
    return wait(treads.filter(function (t) { return t.member_id === me.id && t.following; }).map(function (t) {
      var r = byId(t.root_id);
      return { id: r.id, channel_id: r.channel_id, sender_id: r.sender_id, body: r.body, deleted_at: r.deleted_at, reply_count: r.reply_count, last_reply_at: r.last_reply_at, reply_users: r.reply_users,
        unread: msgs.filter(function (m) { return m.parent_id === r.id && !m.deleted_at && m.sender_id !== me.id && Date.parse(m.created_at) > Date.parse(t.last_read_at); }).length };
    }).filter(function (r) { return r.reply_count > 0; }).sort(function (a, b) { return a.last_reply_at < b.last_reply_at ? 1 : -1; }));
  },
  myMentions: function () {
    return wait(msgs.filter(function (m) { return !m.deleted_at && m.sender_id !== me.id && myCm(m.channel_id) && (m.mention_all || m.mention_ids.indexOf(me.id) >= 0); })
      .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }), 250);
  },
  search: function (q, cid) {
    q = q.toLowerCase();
    return wait(msgs.filter(function (m) { return !m.deleted_at && myCm(m.channel_id) && (!cid || m.channel_id === cid) && m.body.toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 40), 250);
  },
  upload: function (file) {
    var f = { drive_file_id: id('f'), name: file.name, mime: file.type, size: file.size };
    if (/^image\//.test(file.type)) urls[f.drive_file_id] = URL.createObjectURL(file);
    return wait(f, 700);
  },
  imageUrl: function (att) {
    if (urls[att.drive_file_id]) return Promise.resolve(urls[att.drive_file_id]);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BEDDD7"/><stop offset="1" stop-color="#668485"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="310" cy="80" r="46" fill="#F5FBFF" opacity=".55"/><text x="30" y="150" font-family="sans-serif" font-size="44" font-weight="700" fill="#fff">2027 신입생 OT</text><text x="30" y="196" font-family="sans-serif" font-size="22" fill="#F5FBFF">2월 26일 · 북악관 1005호</text><text x="30" y="270" font-family="sans-serif" font-size="18" fill="#F5FBFF">교육학과 학생회 바탕</text></svg>';
    return new Promise(function (r) { setTimeout(function () { r('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); }, 500); });
  },
  previewUrl: function () { return ''; }, openUrl: function () { return ''; },
  subscribe: function (h) { H = h; },
  pushStatus: function () { return wait({ supported: true, permission: 'granted', subscribed: true }, 50); },
  enablePush: function () { return wait({ supported: true, permission: 'granted', subscribed: true }); },
  testPush: function () { setTimeout(function () { pushBanner('Batang', '알림이 켜졌어요 🎉', '#/'); }, 600); return wait(null); }
};
})();

/**
 * Batang — 구글 쪽 일꾼 (Apps Script)
 *  - 파일 올리기: 로그인 확인 → 채널 구성원 확인 → 드라이브 채널 폴더에 저장
 *  - 이미지 보여주기: 볼 권한이 있는 회원에게만 이미지를 전달
 *  - 자동 작업: Supabase 깨우기(3일), 메시지 백업(매일), 드라이브 권한 맞추기(매시간), 용량 점검(매주)
 *
 * [프로젝트 설정 → 스크립트 속성]에 아래 6개를 넣어 주세요. (코드에 직접 적지 마세요)
 *   SUPABASE_URL          예) https://abcd.supabase.co
 *   SUPABASE_ANON_KEY     공개 키 (anon / publishable)
 *   SUPABASE_SERVICE_KEY  관리자 키 (service_role / secret) ← 절대 공유 금지
 *   ROOT_FOLDER_ID        파일을 모을 드라이브 폴더 ID
 *   BACKUP_SHEET_ID       백업용 구글 시트 ID
 *   ADMIN_EMAIL           경고 메일 받을 주소
 */
var P = PropertiesService.getScriptProperties();
function prop(k) { var v = P.getProperty(k); if (!v) throw new Error('스크립트 속성이 없어요: ' + k); return v; }
var MAX_BYTES = 25 * 1024 * 1024;

/* ───────── 웹앱 입구 ───────── */
function doGet() { return out({ ok: true, app: 'batang' }); }
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var user = verifyUser(req.token);
    if (!user) return out({ ok: false, error: 'auth' });
    if (req.action === 'upload') return out(upload(req, user));
    if (req.action === 'image') return out(image(req));
    return out({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error(err);
    return out({ ok: false, error: String(err && err.message || err) });
  }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ───────── Supabase 호출 ───────── */
// 회원 본인의 로그인 증명(token)으로 부르면 DB 보안 규칙이 그대로 적용돼요.
function sbUser(path, token) {
  var r = UrlFetchApp.fetch(prop('SUPABASE_URL') + path, {
    headers: { apikey: prop('SUPABASE_ANON_KEY'), Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null;
}
// 관리자 키: 자동 작업에서만 사용
function sbAdmin(path, opt) {
  opt = opt || {};
  var key = prop('SUPABASE_SERVICE_KEY');
  var r = UrlFetchApp.fetch(prop('SUPABASE_URL') + path, {
    method: opt.method || 'get', contentType: 'application/json', payload: opt.payload,
    headers: { apikey: key, Authorization: 'Bearer ' + key }, muteHttpExceptions: true
  });
  if (r.getResponseCode() >= 300) throw new Error('Supabase ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  var t = r.getContentText();
  return t ? JSON.parse(t) : null;
}
function verifyUser(token) {
  if (!token) return null;
  var u = sbUser('/auth/v1/user', token);
  return u && u.id ? { id: u.id, email: u.email, token: token } : null;
}

/* ───────── 파일 올리기 ───────── */
function upload(req, user) {
  if (!/^[0-9a-f-]{36}$/.test(req.channel_id || '')) return { ok: false, error: 'bad_channel' };
  // 이 회원이 그 채널 구성원인지: 회원 본인 권한으로 물어봄 → 아니면 빈 결과
  var rows = sbUser('/rest/v1/channel_members?select=channel_id&channel_id=eq.' + req.channel_id + '&member_id=eq.' + user.id, user.token);
  if (!rows || !rows.length) return { ok: false, error: 'not_member' };
  var bytes = Utilities.base64Decode(req.data);
  if (bytes.length > MAX_BYTES) return { ok: false, error: 'too_large' };
  var name = String(req.name || 'file').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  var folder = channelFolder(req.channel_id);
  var file = folder.createFile(Utilities.newBlob(bytes, req.mime || 'application/octet-stream', name));
  return { ok: true, file: { drive_file_id: file.getId(), name: name, mime: file.getMimeType(), size: bytes.length } };
}
function channelFolder(channelId) {
  var root = DriveApp.getFolderById(prop('ROOT_FOLDER_ID'));
  var it = root.getFoldersByName(channelId);
  if (it.hasNext()) return it.next();
  var f = root.createFolder(channelId);
  var ch = sbAdmin('/rest/v1/channels?select=name&id=eq.' + channelId);
  f.setDescription('Batang 채널: ' + (ch && ch[0] ? ch[0].name : ''));
  syncDrivePermissions();
  return f;
}

/* ───────── 이미지 보여주기 ───────── */
function image(req) {
  if (!/^[\w-]{10,}$/.test(req.file_id || '')) return { ok: false, error: 'bad_id' };
  // 이 파일이 달린 메시지를 볼 수 있는 회원인지: 회원 본인 권한으로 물어봄
  var rows = sbUser('/rest/v1/attachments?select=id&drive_file_id=eq.' + req.file_id + '&limit=1', req.token);
  if (!rows || !rows.length) return { ok: false, error: 'not_allowed' };
  var blob = null;
  try {
    var meta = Drive.Files.get(req.file_id, { fields: 'thumbnailLink' });
    if (meta.thumbnailLink) {
      var r = UrlFetchApp.fetch(meta.thumbnailLink.replace(/=s\d+$/, '=s1600'),
        { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (r.getResponseCode() === 200) blob = r.getBlob();
    }
  } catch (err) { /* 아래 원본으로 대신함 */ }
  if (!blob) {
    var f = DriveApp.getFileById(req.file_id);
    if (f.getSize() > 8 * 1024 * 1024) return { ok: false, error: 'too_large' };
    blob = f.getBlob();
  }
  return { ok: true, dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}

/* ───────── 자동 작업 ───────── */
// 처음 한 번 실행: 시간 예약을 걸어 줘요.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('keepAlive').timeBased().everyDays(3).atHour(4).create();
  ScriptApp.newTrigger('backupMessages').timeBased().everyDays(1).atHour(5).create();
  ScriptApp.newTrigger('syncDrivePermissions').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('weeklyCheck').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
  keepAlive(); syncDrivePermissions(); backupMessages();
  return '예약 완료';
}

// 무료 Supabase는 1주일 동안 요청이 없으면 멈추므로 3일마다 한 번 불러 줘요.
function keepAlive() { sbAdmin('/rest/v1/channels?select=id&limit=1'); }

// 드라이브 채널 폴더의 보기 권한을 회원 명단과 똑같이 맞춰요. (링크 공개 없음, 공유 알림 메일 없음)
function syncDrivePermissions() {
  var channels = sbAdmin('/rest/v1/channels?select=id,name');
  var allow = sbAdmin('/rest/v1/allowlist?select=email,channels');
  var root = DriveApp.getFolderById(prop('ROOT_FOLDER_ID'));
  channels.forEach(function (c) {
    var it = root.getFoldersByName(c.id);
    if (!it.hasNext()) return;
    var folderId = it.next().getId();
    var want = {};
    allow.forEach(function (a) { if ((a.channels || []).indexOf(c.name) >= 0) want[a.email.toLowerCase()] = true; });
    var perms = Drive.Permissions.list(folderId, { fields: 'permissions(id,emailAddress,role,type)' }).permissions || [];
    perms.forEach(function (p) {
      if (p.role === 'owner') return;
      var em = (p.emailAddress || '').toLowerCase();
      if (p.type === 'user' && want[em]) { delete want[em]; return; }
      Drive.Permissions.remove(folderId, p.id);          // 명단에 없거나 '링크 공개'면 회수
    });
    Object.keys(want).forEach(function (em) {
      try {
        Drive.Permissions.create({ role: 'reader', type: 'user', emailAddress: em }, folderId, { sendNotificationEmail: false });
      } catch (err) { console.error('권한 추가 실패 ' + em + ': ' + err); }
    });
  });
}

// 메시지를 구글 시트에 백업. 수정된 글은 고치고, 삭제된 글은 시트에서도 지워요.
var HEAD = ['id', '보낸 시각', '채널', '보낸 사람', '스레드 원글 id', '내용', '첨부', '수정 시각'];
function backupMessages() {
  var sh = SpreadsheetApp.openById(prop('BACKUP_SHEET_ID')).getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEAD);
  var since = P.getProperty('BACKUP_SINCE') || '2000-01-01T00:00:00Z';
  var now = new Date().toISOString();
  var names = {}; sbAdmin('/rest/v1/members?select=id,name').forEach(function (m) { names[m.id] = m.name; });
  var chans = {}; sbAdmin('/rest/v1/channels?select=id,name').forEach(function (c) { chans[c.id] = c.name; });
  var sel = 'select=id,created_at,channel_id,sender_id,parent_id,body,edited_at,deleted_at,attachments(name)';
  var q = encodeURIComponent(since);
  var fresh = pageAll('/rest/v1/messages?' + sel + '&deleted_at=is.null&created_at=gt.' + q + '&order=created_at');
  var edited = pageAll('/rest/v1/messages?' + sel + '&deleted_at=is.null&edited_at=gt.' + q + '&created_at=lte.' + q);
  var deleted = pageAll('/rest/v1/messages?select=id&deleted_at=gt.' + q);
  function row(m) {
    return [m.id, Utilities.formatDate(new Date(m.created_at), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'), chans[m.channel_id] || '',
      names[m.sender_id] || '', m.parent_id || '', m.body, (m.attachments || []).map(function (a) { return a.name; }).join(', '),
      m.edited_at ? Utilities.formatDate(new Date(m.edited_at), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss') : ''];
  }
  if (edited.length || deleted.length) {
    var ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
    var at = {}; ids.forEach(function (id, i) { at[id] = i + 2; });
    edited.forEach(function (m) { if (at[m.id]) sh.getRange(at[m.id], 1, 1, HEAD.length).setValues([row(m)]); });
    deleted.map(function (m) { return at[m.id]; }).filter(Boolean).sort(function (a, b) { return b - a; })
      .forEach(function (r) { sh.deleteRow(r); });
  }
  if (fresh.length) sh.getRange(sh.getLastRow() + 1, 1, fresh.length, HEAD.length).setValues(fresh.map(row));
  P.setProperty('BACKUP_SINCE', now);
}
function pageAll(path) {
  var all = [], step = 1000;
  for (var off = 0; ; off += step) {
    var part = sbAdmin(path + '&limit=' + step + '&offset=' + off);
    all = all.concat(part);
    if (part.length < step) return all;
  }
}

// 매주: DB·드라이브 용량 확인, 기준을 넘으면 메일
function weeklyCheck() {
  var mb = Number(sbAdmin('/rest/v1/rpc/db_size_mb', { method: 'post', payload: '{}' }));
  var used = DriveApp.getStorageUsed(), limit = DriveApp.getStorageLimit();
  var warn = [];
  if (mb >= 400) warn.push('DB 용량이 ' + mb + 'MB예요 (무료 한도 500MB). 오래된 메시지를 정리할 때예요.');
  if (limit > 0 && used / limit > 0.9) warn.push('구글 드라이브를 ' + Math.round(used / limit * 100) + '% 쓰고 있어요.');
  if (warn.length) MailApp.sendEmail(prop('ADMIN_EMAIL'), '[Batang] 용량 경고', warn.join('\n'));
}

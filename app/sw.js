/* Batang 서비스 워커: 푸시 알림 받기 + 화면 파일 보관(오프라인에서도 앱이 열리게) */
var CACHE = 'batang-v1';
var SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'backend-supabase.js', 'config.js', 'manifest.webmanifest',
  'img/taang_hello.svg', 'img/taang_sorry.svg', 'img/taang_guide.svg', 'img/taang_thinking.svg', 'img/icon-192.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// 화면 파일은 항상 최신을 먼저 받고, 인터넷이 없을 때만 보관본을 써요.
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    if (res.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); }); }));
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  // 아이폰은 푸시를 받으면 반드시 알림을 보여 줘야 해서, 앱을 보고 있을 때도 표시해요.
  e.waitUntil(self.registration.showNotification(d.title || 'Batang', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag,
    icon: 'img/icon-192.png', badge: 'img/badge.png', data: { url: d.url || '#/' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var hash = (e.notification.data && e.notification.data.url) || '#/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ('focus' in list[i]) { list[i].postMessage({ go: hash }); return list[i].focus(); }
    }
    return self.clients.openWindow(self.registration.scope + hash);
  }));
});

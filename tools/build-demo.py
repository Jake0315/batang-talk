#!/usr/bin/env python3
"""시연용 demo.html을 다시 만들어요:  python3 tools/build-demo.py
app/ 의 화면 코드(styles.css, app.js)를 그대로 쓰고, 서버만 가짜(demo/backend-demo.js)로 바꿔 한 파일로 묶어요."""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
rd = lambda p: (root / p).read_text(encoding='utf-8')
imgs = {p.stem: 'data:image/svg+xml;base64,' + base64.b64encode(p.read_bytes()).decode() for p in sorted((root / 'app/img').glob('taang_*.svg'))}
html = f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Batang (시연용)</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&display=swap">
<style>
{rd('app/styles.css')}
.demo-tag{{position:absolute;top:calc(8px + var(--safe-t));left:50%;transform:translateX(-50%);z-index:90;background:var(--warn-soft);color:var(--warn);font-size:11px;font-weight:700;border-radius:8px;padding:2px 8px;pointer-events:none;opacity:.9}}
</style>
</head>
<body>
<div id="app">
  <section class="screen" id="scr-auth"></section>
  <section class="screen" id="scr-main" hidden><div class="tabview" id="tabview"></div><nav class="tabbar" id="tabbar"></nav></section>
  <section class="screen push" id="scr-channel"></section>
  <section class="screen push" id="scr-thread"></section>
  <div id="sheet-root"></div>
  <div class="toast" id="toast"></div>
  <div class="demo-tag">시연용 · 가짜 데이터</div>
</div>
<script>window.DEMO_IMG = {json.dumps(imgs)};</script>
<script>
{rd('demo/backend-demo.js')}
</script>
<script>
{rd('app/app.js')}
</script>
</body>
</html>
'''
(root / 'demo.html').write_text(html, encoding='utf-8')
print('demo.html', len(html) // 1024, 'KB')

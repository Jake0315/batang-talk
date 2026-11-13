#!/usr/bin/env python3
"""저장소에 올라가면 안 되는 값을 찾아요 (checks 워크플로가 사용).
- Supabase 관리자 키(service_role JWT, sb_secret_…)  - 개인 키(PEM)  - 구글 로그인 토큰
- 실제 이메일 주소 (회원 명단은 Supabase allowlist 표에만)"""
import base64, json, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
skip = {'.git', 'node_modules'}
bad = []
jwt = re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}')
email = re.compile(r'[A-Za-z0-9._%+-]+@(gmail|naver|daum|kakao|kookmin|hanmail)\.(com|net|ac\.kr)')
for p in root.rglob('*'):
    if not p.is_file() or set(p.relative_to(root).parts) & skip or p.suffix in {'.png', '.jpg', '.ico'}:
        continue
    rel = str(p.relative_to(root))
    try: text = p.read_text(encoding='utf-8')
    except UnicodeDecodeError: continue
    for m in jwt.finditer(text):
        try:
            body = m.group(1) + '=' * (-len(m.group(1)) % 4)
            if json.loads(base64.urlsafe_b64decode(body)).get('role') == 'service_role':
                bad.append(f'{rel}: Supabase 관리자 키(service_role)')
        except Exception: pass
    if re.search(r'sb_secret_[A-Za-z0-9_-]{10,}', text): bad.append(f'{rel}: Supabase 비밀 키(sb_secret_)')
    if re.search(r'-----BEGIN [A-Z ]*PRIVATE KEY-----', text): bad.append(f'{rel}: 개인 키')
    if re.search(r'"refresh_token"\s*:\s*"1//', text): bad.append(f'{rel}: 구글 로그인 토큰')
    if not rel.startswith(('supabase/tests/', 'tools/check-secrets.py', 'CLAUDE.md', 'README.md')):
        for m in email.finditer(text):
            if not re.search(r'example|someone', m.group(0)): bad.append(f'{rel}: 이메일 주소 {m.group(0)}')
if bad:
    print('저장소에 올리면 안 되는 값이 있어요:'); print('\n'.join('  - ' + b for b in bad)); sys.exit(1)
print('비밀 값·이메일 검사 통과')

# Batang — Claude 작업 규칙

교육학과 학생회 '바탕' 운영진 16명이 쓰는 업무 메신저 웹앱(Batang)이에요.
저장소 주인은 Jake(관리자)예요. 컴퓨터 전공이 아니라서, 설명은 한국어로 쉽게 하고 전문 용어는 풀어서 말해요.

## 구조

| 경로 | 무엇 | main에 들어가면 |
| --- | --- | --- |
| `app/` | 화면 (GitHub Pages, PWA) | `deploy-pages`가 자동 배포 |
| `supabase/schema.sql` | 표·보안 규칙(RLS)·함수 | `deploy-db`가 운영 DB에 한 트랜잭션으로 적용 |
| `supabase/functions/push/` | 푸시 알림 (Edge Function) | `deploy-functions`가 배포 |
| `apps-script/` | 드라이브 업로드·이미지·백업·권한 동기화 | `deploy-apps-script`가 같은 /exec 주소로 갱신 |
| `demo/`, `demo.html` | 시연용 가짜 서버 | 배포 없음 |
| `supabase/tests/` | 보안 규칙 점검 | `checks`에서 실행 |

`app/app.js`는 화면만 맡고, 서버와의 통신은 `window.BACKEND`(`app/backend-supabase.js`, 시연은 `demo/backend-demo.js`)를 거쳐요.
BACKEND에 함수를 더하면 **두 파일 모두** 같은 이름으로 만들어요.

## 작업 순서 (꼭 지키기)

1. 작업은 항상 새 브랜치에서 해요: `claude/<짧은-주제>`. **main에 직접 커밋하지 않아요.**
2. 올리기 전에 점검을 돌려요.
   - `bash tools/test-db.sh` (DB·보안 규칙)
   - `node --check app/*.js demo/*.js`
   - `app/`을 고쳤으면 `python3 tools/build-demo.py`로 `demo.html`을 다시 만들어 같이 커밋
   - `python3 tools/check-secrets.py`
3. 브랜치를 올리면 GitHub의 `checks`가 다시 점검해요.
4. Jake에게 바뀐 점을 쉬운 말로 요약하고, 비교 링크
   `https://github.com/<저장소>/compare/main...claude/<주제>`를 줘요.
   위험한 변경(아래 '조심할 것')이면 그 사실을 맨 앞에 말해요.
5. **Jake가 "머지해"라고 말했을 때만** main에 합쳐요.
   - `git fetch origin && git rebase origin/main` → 바뀌었으면 다시 올리고 `checks`를 기다림
   - `git push origin claude/<주제>:main` (빨리 감기만. 강제 푸시 금지)
   - 저장소 규칙상 `checks`를 통과한 커밋만 main에 들어가요. 거절되면 점검이 아직 안 끝났거나 실패한 것이니, 기다렸다 다시 하거나 원인을 고쳐요.
6. 머지 후에는 어떤 자동 배포가 돌아갈지(화면/DB/알림/Apps Script) 알려 줘요.

## 조심할 것

- **보안 규칙(RLS)을 약하게 만들지 않아요.** 회원은 자기 채널만 읽고, 자기 이름으로만 쓰고, 자기 글만 고쳐요. 명단(allowlist)에 없으면 아무것도 못 해요.
  `schema.sql`을 고치면 `supabase/tests/rls_test.sql`에 그 변경을 확인하는 점검을 더해요. 기존 점검을 지우거나 느슨하게 바꾸지 않아요.
- **새 표를 만들면 권한(GRANT)도 직접 줘요.** 2026-05-30 이후 Supabase 새 프로젝트는 새 표를 API에 자동으로 열지 않아요.
  `schema.sql`의 '표 접근 권한' 부분에 필요한 만큼만 더하고(anon에는 주지 않음), 점검(`local_stub.sql`)도 자동 권한 없이 돌아요.
- Apps Script는 Supabase 관리자 키를 쓰지 않아요(새 `sb_secret_` 키는 Apps Script에서 막힘). DB가 더 필요하면
  로봇 비밀번호를 확인하는 `robot_…` 함수를 더하고, 읽기 전용·필요한 열만 주게 만들어요.
- 채널 이름은 `#` 없이 저장하고, 화면에서 `cn(c)`로 `#이름`을 보여 줘요.
- `schema.sql`은 **여러 번 실행해도 되고, 한 트랜잭션 안에서 실행돼도** 되게 유지해요 (`if not exists`, `create or replace`, 정책은 지우고 다시 만듦).
  표를 지우거나 열을 없애는 변경은 데이터가 사라지니, 하기 전에 Jake에게 먼저 물어봐요.
- **비밀 값을 저장소에 넣지 않아요**: Supabase 관리자 키, DB 주소, VAPID 비밀 키, 웹훅 비밀번호, 로봇 비밀번호, clasp 토큰. 이 값들은 GitHub Secrets·Supabase·Apps Script 속성에만 있어요.
- **회원 이메일·이름을 저장소에 넣지 않아요** (공개 저장소). 명단은 Supabase `allowlist` 표에만 있어요. 테스트에는 `example` 주소만 써요.
- 드라이브 파일은 '링크 공개'로 바꾸지 않아요. 권한은 `syncDrivePermissions`가 명단에 맞춰요.
- Apps Script 웹앱 주소(/exec)는 바뀌면 안 돼요. 배포는 항상 같은 배포 ID를 새 버전으로 갱신해요.
- 화면 문구는 "~해요"체, 짧고 쉬운 말로. 디자인은 바탕화면 색(그린 #668485, 하늘 #F5FBFF)·Pretendard·타앙이 캐릭터를 따라요.
- 비밀 값이나 설정이 필요해서 막히면, Jake가 어디서 무엇을 눌러야 하는지 단계별로 알려 줘요.

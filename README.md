# Batang — 학생회 '바탕' 업무 메신저

교육학과 학생회 '바탕' 운영진 16명이 쓰는 휴대폰 중심 메신저 웹앱이에요.
슬랙처럼 채널과 스레드로 대화하고, 메시지는 기한 없이 보관하며, 서버 비용은 0원이에요.

- 화면: GitHub Pages (홈 화면에 설치하는 웹앱)
- 로그인·메시지·실시간: Supabase (무료)
- 파일: 관리자 구글 드라이브 (Apps Script가 저장, 회원 계정에만 보기 권한)
- 알림: 웹 푸시 (Supabase Edge Function)

## 고치는 방법 (설치가 끝난 뒤)

Claude Code에게 말로 시키면 돼요. 코드·드라이브·Supabase를 직접 열 필요가 없어요.

1. Claude Code에서 이 저장소를 고르고 "~~ 바꿔 줘"라고 말해요.
2. Claude가 `claude/…` 브랜치에서 고치고 올려요. GitHub가 보안 점검을 자동으로 돌려요.
3. Claude가 바뀐 점과 비교 링크를 알려 주면, 확인하고 **"머지해"**라고 말해요.
4. main에 들어가면 바뀐 부분만 자동 배포돼요: 화면 → GitHub Pages, DB 규칙 → Supabase, 알림 함수 → Supabase, 파일·백업 → Apps Script.

점검(`checks`)을 통과하지 못한 코드는 저장소 규칙 때문에 main에 들어갈 수 없어요.
작업 규칙은 `CLAUDE.md`에 있어요.

먼저 `demo.html`을 더블클릭해서 열어 보세요. 서버 없이 가짜 데이터로 모든 화면을 눌러 볼 수 있어요.

---

## 1. 폴더 구성

| 경로 | 내용 | 어디에 쓰나 |
| --- | --- | --- |
| `demo.html` | 시연용 한 파일 (가짜 데이터) | 그냥 열어서 보기 |
| `app/` | 실제 앱 화면 | GitHub 저장소에 올림 |
| `app/config.js` | 주소·공개 키 (배포 때 저장소 Variables로 자동 생성) | 보통 안 고침 |
| `supabase/schema.sql` | 표, 보안 규칙, 함수 | Supabase SQL Editor |
| `supabase/seed.sql` | 채널 7개 | Supabase SQL Editor (처음 한 번) |
| `supabase/functions/push/` | 푸시 알림 함수 (파일 2개) | Supabase Edge Functions |
| `supabase/tests/`, `tools/test-db.sh` | 보안 규칙 자동 점검 | 올릴 때마다 자동 실행 |
| `.github/workflows/` | 점검·자동 배포 5개 | GitHub Actions |
| `CLAUDE.md` | Claude 작업 규칙 | Claude Code가 읽음 |
| `apps-script/` | 파일 저장·백업·점검 | 구글 Apps Script |
| `tools/vapid.html` | 푸시 키 만들기 | 브라우저에서 열기 |
| `tools/` | 데모 만들기, 비밀 값 검사, 설정 파일 만들기 | 점검·배포가 사용 |

## 2. 들어 있는 기능

| 기능 | 내용 |
| --- | --- |
| 로그인 | 구글 로그인 + 명단 확인. 명단에 없으면 가입 자체가 막힘 |
| 채널 | 공지(운영진만 글쓰기) · 자유 · 국장방 · 기획국 · 대외협력국 · 홍보국 · 사무국 |
| 스레드 | 메시지를 누르면 스레드. 답글 수·참여자 표시, '채널에도 보내기', 스레드 탭, 따라가기 켜고 끄기 |
| 읽음 표시 | 메시지 옆에 안 읽은 사람 수, 누르면 읽은 사람 목록 |
| 수정·삭제 | 내 메시지만 (관리자는 남의 글 삭제 가능). 삭제하면 백업 시트에서도 지워짐 |
| 파일 | 한 번에 5개, 파일당 25MB. 이미지는 바로 보이고 문서는 드라이브 미리보기 |
| 멘션 | `@이름`, `@채널`(운영진만). 활동 탭에 모아 보기 |
| 반응 | 👍 ✅ 👀 🙏 😂 🎉 |
| 검색 | 전체 채널 또는 채널 안에서 검색, 결과를 누르면 그 메시지로 이동 |
| 알림 | 소속 채널 모든 메시지(기본), 채널별 '멘션만', 스레드는 참여자만, 방해 금지(밤 12시~오전 8시 멘션만) |
| 기타 | 안 읽음 배지, '여기서부터 새 메시지' 선, 이전 메시지 더 보기, 다크 모드, 밀어서 뒤로 가기 |

**이번 버전에 없는 것** (기획안 2·3차): 1:1 대화(DM), 고정 메시지, 나중에 보기, 파일함, 입력 중 표시, 투표, 리마인더, 예약 전송, Claude 연동, 앱 안 관리자 화면, 알림 묶어 보내기, 멘션 미확인 시 메일 알림.
회원·채널 관리는 Supabase 표에서 직접 해요(7장).

## 3. 검증한 범위

| 항목 | 상태 |
| --- | --- |
| DB 설계·보안 규칙 | Postgres 16에서 33개 항목 자동 점검 통과 (`bash tools/test-db.sh`) |
| 자동 점검·배포 워크플로 | 파일 형식·로컬 점검까지만 확인, GitHub에서 실제 실행은 **미검증** |
| 푸시 암호화·서명 | 별도 라이브러리로 복호화·서명 검증 통과 |
| 화면 동작 | 시연용(가짜 서버)으로 크롬에서 로그인~스레드~수정·삭제~검색~미리보기 흐름 확인 |
| 실제 Supabase 연결, 구글 로그인 | **미검증** — 아래 순서대로 설정한 뒤 5장 점검표로 확인 필요 |
| Apps Script (업로드·백업·권한) | **미검증** — 실제 구글 계정에서 실행해 봐야 함 |
| 실제 휴대폰 푸시 도착, 아이폰 홈 화면 앱 동작 | **미검증** — 실기기 확인 필요 |

실제 서비스에 연결하는 부분은 이 작업 환경에서 실행해 볼 수 없었어요. 처음 설정할 때 오류가 나올 수 있으니, 16명에게 열기 전에 2~4명으로 먼저 써 보세요.

---

## 4. 설치 순서 (처음 한 번, 1~2시간)

준비물: 관리자 구글 계정(Google One), GitHub 계정, PC 크롬.
비밀 값(관리자 키, 푸시 비밀 키, 웹훅 비밀번호)은 메모장에 잠깐 적어 두고, 설정이 끝나면 지우세요.
대시보드 메뉴 이름은 바뀔 수 있어요. 안 보이면 비슷한 이름을 찾아 주세요.

### 4-1. Supabase 프로젝트

1. [supabase.com](https://supabase.com)에 가입하고 **New project**를 만들어요. 지역은 Seoul(Northeast Asia)을 골라요.
2. 왼쪽 **SQL Editor**에서 `supabase/schema.sql` 내용을 통째로 붙여 넣고 **Run**.
3. `supabase/seed.sql`을 붙여 넣고 **Run** (채널 7개가 생겨요).
4. **Table Editor → allowlist**에 16명을 한 줄씩 넣어요. 저장소가 공개라서, 명단은 파일이 아니라 여기에만 둬요.
   - `email`: 각자의 구글 이메일, **소문자**로
   - `role`: 관리자 본인은 `admin`, 회장·부회장·국장은 `staff`, 나머지는 `member`
   - `channels`: 들어갈 채널 이름, 예) `{공지,자유,기획국}`. 회장·부회장은 7개 전부
5. **Project Settings → API**에서 세 가지를 메모해요.
   - Project URL
   - 공개 키 (`anon` 또는 `publishable`)
   - 관리자 키 (`service_role` 또는 `secret`) ← 절대 공개 금지

### 4-2. 구글 로그인

1. [Google Cloud Console](https://console.cloud.google.com)에서 새 프로젝트를 만들어요.
2. **API 및 서비스 → OAuth 동의 화면**: 외부(External), 앱 이름 `Batang`, 범위는 기본(email, profile)만.
   그다음 **게시 상태를 '프로덕션'으로** 바꿔요. '테스트'로 두면 로그인이 주기적으로 풀려요.
3. **사용자 인증 정보 → OAuth 클라이언트 ID 만들기 → 웹 애플리케이션**.
   승인된 리디렉션 URI에 `https://<프로젝트>.supabase.co/auth/v1/callback`을 넣어요.
4. 만들어진 클라이언트 ID와 보안 비밀을 Supabase **Authentication → Providers → Google**에 넣고 켜요.
5. Supabase **Authentication → URL Configuration**은 4-5에서 GitHub Pages 주소가 생긴 뒤 채워요.

### 4-3. 구글 드라이브와 Apps Script

1. 관리자 구글 드라이브에 폴더 `Batang 파일`을 만들고, 주소창의 `folders/` 뒤 글자(폴더 ID)를 메모해요. **폴더를 공유하지 마세요.** 권한은 스크립트가 맞춰요.
2. 새 구글 시트 `Batang 백업`을 만들고, 주소의 `/d/` 뒤 글자(시트 ID)를 메모해요.
3. [script.google.com](https://script.google.com)에서 **새 프로젝트** → `Code.gs` 내용을 `apps-script/Code.gs`로 바꿔요.
4. **프로젝트 설정 → 'appsscript.json 표시'**를 켜고, 그 파일 내용을 `apps-script/appsscript.json`으로 바꿔요. (Drive 고급 서비스가 같이 켜져요)
5. **프로젝트 설정 → 스크립트 속성**에 6개를 넣어요.

   | 속성 | 값 |
   | --- | --- |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | 공개 키 |
   | `SUPABASE_SERVICE_KEY` | 관리자 키 |
   | `ROOT_FOLDER_ID` | 폴더 ID |
   | `BACKUP_SHEET_ID` | 시트 ID |
   | `ADMIN_EMAIL` | 경고 메일 받을 주소 |

6. 편집기 위쪽 함수 목록에서 **`setup`**을 골라 **실행**해요. 권한을 묻는 창이 뜨면 허용해요. 자동 작업 4개가 예약돼요.
7. **배포 → 새 배포 → 웹 앱**: 실행 계정 '나', 액세스 '모든 사용자'. 나온 주소(`…/exec`)를 메모해요.
   '모든 사용자'여도 괜찮아요. 스크립트가 요청마다 로그인 증명과 채널 구성원 여부를 확인해요.
   이후 코드 수정은 자동 배포가 같은 주소로 갱신해요.
8. 두 값을 메모해요: **프로젝트 설정 → 스크립트 ID**, **배포 관리**에 보이는 **배포 ID**.

### 4-4. 푸시 알림

1. `tools/vapid.html`을 크롬으로 열고 **키 만들기**. 공개 키와 비밀 키를 메모해요.
2. 웹훅 비밀번호로 쓸 긴 무작위 글자(30자 이상)를 하나 정해요.
3. Supabase 대시보드 **Edge Functions → Secrets**(또는 Manage secrets)에 4개를 넣어요:
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`(`mailto:관리자이메일`), `WEBHOOK_SECRET`(2번 비밀번호).
   함수 코드 자체는 4-5의 자동 배포가 올려요.
4. **Database → Webhooks**(또는 Integrations → Database Webhooks)에서 새 웹훅을 만들어요.
   - 표 `messages`, 이벤트 `Insert`
   - 종류 Supabase Edge Functions → `push`, 방식 POST
   - HTTP 헤더 추가: 이름 `x-webhook-secret`, 값은 2번의 웹훅 비밀번호

### 4-5. GitHub 저장소 설정

이 폴더의 파일이 저장소(`batang-talk`)에 올라가 있다고 할게요. 저장소 **Settings**에서:

1. **Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿔요.
2. **Secrets and variables → Actions → Variables** 탭에 5개 (공개돼도 되는 값):

   | 이름 | 값 |
   | --- | --- |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_KEY` | 공개 키 (anon / publishable) |
   | `SUPABASE_PROJECT_REF` | Project URL의 `https://` 뒤, `.supabase.co` 앞 글자 |
   | `GAS_URL` | Apps Script 웹앱 주소 (…/exec) |
   | `VAPID_PUBLIC_KEY` | 푸시 공개 키 |

3. 같은 화면 **Secrets** 탭에 5개 (절대 공개 금지):

   | 이름 | 값 | 어디서 |
   | --- | --- | --- |
   | `SUPABASE_DB_URL` | DB 접속 주소 | Supabase 위쪽 **Connect** → **Session pooler**의 URI (비밀번호 칸에 DB 비밀번호를 넣은 것). Direct 주소는 GitHub에서 접속이 안 돼요 |
   | `SUPABASE_ACCESS_TOKEN` | Supabase 계정 토큰 | supabase.com → 오른쪽 위 계정 → **Access Tokens** → Generate |
   | `CLASPRC_JSON` | clasp 로그인 정보 | 바탕화면 저장소에 넣은 것과 같은 값 (같은 구글 계정일 때) |
   | `APPS_SCRIPT_ID` | 스크립트 ID | 4-3의 8번 |
   | `APPS_SCRIPT_DEPLOYMENT_ID` | 배포 ID | 4-3의 8번 |

4. **Rules → Rulesets → New branch ruleset**:
   - 이름 `main 보호`, Enforcement **Active**, Target branches → **Include default branch**
   - 체크: **Restrict deletions**, **Block force pushes**, **Require status checks to pass** → **Add checks**에서 `checks` 추가
   - **Require a pull request before merging은 켜지 마세요.** 켜면 Claude가 "머지해" 한마디로 합칠 수 없어요. 점검 통과 커밋만 main에 들어가는 건 위 규칙이 지켜요.
5. **Actions** 탭에서 `deploy-pages`, `deploy-functions`를 하나씩 골라 **Run workflow**로 처음 한 번 실행해요.
   몇 분 뒤 `https://<아이디>.github.io/batang-talk/`가 열려요.
6. Supabase **Authentication → URL Configuration**에서 Site URL과 Redirect URLs에 그 주소를 넣어요(끝의 `/` 포함).

### 4-6. 회원 안내

1. 주소를 운영진에게 보내요. 아이폰은 **사파리**, 갤럭시는 **크롬**으로 열어요. (카카오톡 안에서 열면 구글 로그인이 막혀요)
2. 아이폰: 공유 버튼 → **홈 화면에 추가** → 홈 화면의 Batang을 열어 로그인.
3. 홈의 **'알림을 켜 둘까요?'**를 눌러 허용. 테스트 알림이 오면 끝이에요.

---

## 5. 처음 열기 전 점검표

관리자 계정과 일반 회원 계정, 명단에 없는 계정 하나로 확인해요.

- [ ] 명단에 없는 구글 계정으로 로그인하면 '운영진 전용이에요' 화면에서 멈춘다
- [ ] 일반 회원 계정에 자기 채널만 보인다 (국장방이 안 보인다)
- [ ] 일반 회원은 공지에 글을 못 쓰고, 스레드 답글은 쓸 수 있다
- [ ] 메시지를 보내면 다른 휴대폰에 바로 뜨고, 안 읽음 숫자가 줄어든다
- [ ] 파일을 올리면 드라이브 `Batang 파일` 아래 채널 폴더에 들어가고, 공유 대상이 그 채널 회원뿐이다
- [ ] 이미지가 대화에 바로 보이고, PPT·Word 미리보기가 열린다 (안 열리면 '드라이브에서 열기')
- [ ] 아이폰·갤럭시 모두 잠금화면에 알림이 온다. 알림을 누르면 그 대화가 열린다
- [ ] 다음 날 `Batang 백업` 시트에 메시지가 쌓여 있다
- [ ] Supabase **Advisors → Security**에 빨간 경고가 없다
- [ ] GitHub 저장소에 관리자 키·푸시 비밀 키가 없다
- [ ] 운영진 16명에게 수집 항목(구글 이메일·이름·프로필 사진·메시지·파일)과 보관 방식을 알리고 동의를 받았다

## 6. 미리 알아 둘 점

- **아이폰 홈 화면 앱의 구글 로그인**: 로그인 중 구글 화면으로 나갔다 돌아와요. 돌아오지 않으면 사파리에서 먼저 로그인한 뒤 홈 화면에 추가해 보세요.
- **문서 미리보기**: 드라이브 미리보기는 그 휴대폰이 구글에 로그인되어 있어야 열려요. 홈 화면 앱에서는 구글 로그인을 한 번 더 물을 수 있어요. 이미지는 이 문제 없이 보여요.
- **알림은 앱을 보고 있을 때도 떠요.** 아이폰은 푸시를 받고 알림을 안 띄우면 알림 권한을 거둘 수 있어서 그렇게 만들었어요.
- **삭제한 메시지의 파일**은 대화에서 사라지지만 드라이브 폴더에는 남아요. 필요하면 드라이브에서 직접 지워요.
- **반응을 취소한 사실**(누가 어떤 이모지를 뺐는지)은 메시지 내용 없이 다른 채널 회원 기기에도 신호로 전달될 수 있어요. 메시지 본문과 파일은 전달되지 않아요.
- **무료 Supabase는 1주일 동안 요청이 없으면 멈춰요.** Apps Script가 3일마다 깨우지만, 멈췄다면 대시보드에서 다시 켜면 돼요. 데이터는 남아 있어요.
- **장애 대비**: 고칠 수 있는 사람이 한 명이라, 카카오톡 단톡방은 비상 연락용으로 남겨 두세요.

## 7. 운영

| 할 일 | 방법 |
| --- | --- |
| 회원 추가 | Supabase **Table Editor → allowlist**에 줄 추가 (이메일 소문자, 채널 목록). 그 사람이 로그인하면 끝 |
| 회원 채널 변경 | allowlist의 `channels` 수정 → 즉시 반영, 드라이브 권한은 1시간 안에 따라감 |
| 회원 내보내기 | allowlist에서 줄 삭제 → 즉시 차단, 드라이브 권한은 1시간 안에 회수 (급하면 Apps Script에서 `syncDrivePermissions` 실행) |
| 채널 추가 | channels 표에 줄 추가 → 들어갈 사람의 allowlist `channels`에 이름 추가 |
| 기능·화면·규칙 수정 | Claude Code에게 말로 요청 → 비교 링크 확인 → "머지해" (맨 위 '고치는 방법') |
| 배포가 실패했을 때 | GitHub **Actions** 탭에서 빨간 항목을 열어 메시지를 Claude에게 보여 주기 |
| 달 1회 | 백업 시트, 알림 안 오는 회원, Supabase 보안 경고 확인 |

## 8. 문제 해결

| 증상 | 확인할 것 |
| --- | --- |
| '설정이 필요해요' 화면 | 저장소 Variables가 비어 있음 → 채운 뒤 `deploy-pages` 다시 실행 |
| 명단에 있는데 '운영진 전용' | allowlist 이메일이 소문자인지, 로그인한 구글 계정이 그 주소인지 |
| 로그인 후 빈 화면으로 돌아옴 | Supabase URL Configuration에 Pages 주소(끝 `/` 포함)가 있는지 |
| 파일이 안 올라감 | Apps Script 웹앱 액세스가 '모든 사용자'인지, 스크립트 속성 6개, **실행 → 실행 기록**의 오류 |
| 알림이 안 옴 | 내 정보 → 테스트. 안 오면 Edge Function **Logs**, 비밀 값 4개, 웹훅 헤더 확인. 아이폰은 홈 화면 앱인지 확인 |
| 머지가 거절됨 | `checks`가 아직 도는 중이거나 실패. Actions 탭 확인 |
| 새 메시지가 바로 안 뜸 | `schema.sql` 맨 아래 '실시간 전송' 부분이 실행됐는지 (Database → Publications) |

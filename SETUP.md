# Batang 처음 설정 가이드

처음 한 번만 하면 되는 설정이에요. 위에서부터 순서대로 따라 하면 돼요. 2~3시간쯤 걸려요.
이 설정을 마치면 이후 수정은 Claude Code에게 말로 시키고, Jake는 "머지해"만 말하면 돼요.

> 2026년 11월 기준 화면으로 썼어요. 버튼 이름이 조금 다르면 비슷한 이름을 찾아 주세요.
> 그래도 못 찾으면 그 화면을 캡처해서 Claude에게 보여 주세요. 이때 🔒 값은 가리고 보내요.

## 0. 시작 전에

### 지금 GitHub 저장소 상태

| 브랜치 | 들어 있는 것 |
| --- | --- |
| `main` | 첫 버전(151d4af). 채널 이름 변경, 채널 추가, 2026년 Supabase 변경 대응이 **아직 없어요** |
| `claude/setup-guide` | 최신 버전 전부(이 가이드 포함). 이 ZIP과 같은 내용이에요 |

그래서 **SQL과 Apps Script 코드는 이 ZIP의 파일을 써요.** GitHub의 main 파일을 복사하면 안 돼요.
8단계에서 "머지해"라고 하면 최신 버전이 main에 들어가고, 그다음부터는 저장소 파일과 실제 서비스가 같아져요.

### 준비물

- PC 크롬 (휴대폰으로 설정하기는 어려워요)
- 관리자 구글 계정(Jake 개인 계정, Google One)으로 로그인한 상태. 드라이브 파일이 이 계정에 쌓여요.
  이 가이드의 `admin@example.com`은 모두 **관리자 본인 이메일로 바꿔서** 써요. 저장소가 공개라 실제 이메일은 적지 않았어요.
- GitHub `Jake0315` 계정
- 메모장. 아래 표의 값을 모아 둘 곳이에요. 설정이 끝나면 🔒 값은 지워요.

### 메모장에 모을 값

| 이름 | 어디서 | 공개돼도 되나 |
| --- | --- | --- |
| Project URL | 2단계 | 괜찮아요 |
| Project ref | 2단계 | 괜찮아요 |
| Publishable key | 2단계 | 괜찮아요 |
| DB 비밀번호 | 2단계 | 🔒 |
| 푸시 공개 키 / 푸시 비밀 키 | 1단계 | 공개 키는 괜찮아요 / 비밀 키는 🔒 |
| 웹훅 비밀번호, 로봇 비밀번호 | 1단계 | 🔒 |
| 구글 Client ID / Client Secret | 4단계 | ID는 괜찮아요 / Secret은 🔒 |
| 드라이브 폴더 ID, 백업 시트 ID | 6단계 | 괜찮아요 |
| Apps Script 웹앱 주소(/exec), 스크립트 ID, 배포 ID | 7단계 | 괜찮아요 |

🔒 값은 GitHub 저장소, 카카오톡, Claude와의 대화 어디에도 붙여 넣지 마세요.

**Supabase 관리자 키(Secret key, `sb_secret_…`)는 이번 설정에서 쓰지 않아요.** 푸시 함수는 Supabase가 알아서 넣어 주고, Apps Script는 로봇 비밀번호를 써요(7단계 설명 참고).

---

## 1. 비밀 값 만들기 (5분)

1. ZIP을 푼 폴더에서 `tools/keys.html`을 크롬으로 열어요(더블클릭).
2. **한 번에 만들기**를 눌러요.
3. 나온 값 다섯 개를 메모장에 복사해요: ① 푸시 공개 키, ② 푸시 비밀 키, ③ 웹훅 비밀번호, ④ 로봇 비밀번호, 그리고 ④ 아래의 SQL 한 줄.

값은 이 브라우저 안에서만 만들어지고 어디로도 전송되지 않아요. **한 번만 만들어요.** 푸시 키를 나중에 바꾸면 모든 회원이 알림을 다시 켜야 해요.

---

## 2. Supabase 프로젝트 (20분)

### 2-1. 프로젝트 만들기

이미 만들었으면 2-2로 가요.

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name `batang`, Region **Northeast Asia (Seoul)**
3. **Database Password**: **영어와 숫자로만** 20자 이상 만들어요. `@ # % &` 같은 기호가 있으면 자동 배포의 DB 접속 주소가 깨질 수 있어요. 메모장에 🔒로 적어요.
4. 보안 관련 옵션은 **기본값 그대로** 둬요.
   - "Data API"는 켜져 있어야 해요. 앱이 이걸로 DB와 이야기해요.
   - "Automatically expose new tables"는 꺼져 있어도 괜찮아요. `schema.sql`이 필요한 권한만 직접 줘요.
5. **Create new project**. 1~2분 기다려요.

### 2-2. DB 만들기 (SQL 세 번 실행)

왼쪽 메뉴 **SQL Editor** → **New query**에서 하나씩 실행해요.

1. ZIP의 `supabase/schema.sql` 내용을 **전부** 복사해 붙여 넣고 **Run**. "Success. No rows returned"가 나오면 돼요.
2. 새 쿼리에 `supabase/seed.sql`을 붙여 넣고 **Run**. 채널 7개가 생겨요: `#공지 #친목 #국장 #기획 #대협 #홍보 #사무`
3. 새 쿼리에 1단계의 **로봇 비밀번호 SQL 한 줄**을 붙여 넣고 **Run**.

**전에 예전 파일로 이미 실행했어도** 위 1·2를 그대로 다시 실행하면 돼요. 두 파일 모두 여러 번 실행해도 안전해요. 예전 이름(자유·국장방·기획국…)은 새 이름으로 바뀌고 메시지는 그대로 남아요.

확인: 왼쪽 **Table Editor → channels**에 7줄이 있으면 성공이에요.

### 2-3. 값 세 개 메모하기

- **Project ref**: 주소창 `supabase.com/dashboard/project/〈여기〉`의 영문자예요. **Project Settings → General**의 Reference ID와 같아요.
- **Project URL**: `https://〈Project ref〉.supabase.co`. 상단 **Connect** 버튼 창이나 [Data API 화면](https://supabase.com/dashboard/project/_/integrations/data_api/overview)에서도 볼 수 있어요.
- **Publishable key**: **Project Settings → API Keys** ([바로 가기](https://supabase.com/dashboard/project/_/settings/api-keys)) → "Publishable and secret API keys" 탭의 `sb_publishable_…` 값.
  - 이 탭이 비어 있고 **Create new API keys** 버튼만 보이면 눌러서 만들어요.
  - 예전 화면의 `anon` 키(`eyJ…`)도 동작하지만, Supabase가 2026년 말까지 없애기로 해서 publishable 키를 권해요.

### 2-4. 관리자(본인)를 명단에 넣기

**SQL Editor**에서 아래를 실행해요. Table Editor에 직접 넣는 것보다 실수가 적어요.

```sql
insert into allowlist (email, name, role, channels) values
  ('admin@example.com', '김정훈', 'admin',   -- ← 본인 구글 이메일(소문자)로 바꾸기
   array['공지','친목','국장','기획','대협','홍보','사무'])
on conflict (email) do update
  set name = excluded.name, role = excluded.role, channels = excluded.channels;
```

- 채널 이름은 `#` 없이 적어요. 앱 화면이 앞에 `#`을 붙여서 `#친목`처럼 보여 줘요.
- 다른 운영진은 9단계에서 넣어요. 먼저 혼자 로그인해 보는 게 안전해요.

---

## 3. 구글 로그인용 Supabase 주소 확인 (1분)

Supabase **Authentication → Sign In / Providers → Google** ([바로 가기](https://supabase.com/dashboard/project/_/auth/providers))을 열어요.
**Callback URL (for OAuth)** 값을 복사해 둬요. `https://〈Project ref〉.supabase.co/auth/v1/callback` 모양이에요. 이 창은 열어 둔 채로 4단계로 가요.

---

## 4. Google Cloud: 로그인 창 만들기 (20분)

[console.cloud.google.com](https://console.cloud.google.com)에 관리자 계정으로 들어가요.

### 4-1. 프로젝트와 기본 정보

1. 위쪽 프로젝트 선택 → **새 프로젝트** → 이름 `Batang` → 만들기. 만든 프로젝트가 선택됐는지 확인해요.
2. 왼쪽 메뉴 **Google Auth Platform** ([바로 가기](https://console.cloud.google.com/auth/overview)) → **시작하기(Get started)**
   - 앱 이름 `Batang`, 사용자 지원 이메일은 본인 이메일
   - 대상(Audience): **외부(External)**. 우리는 개인 구글 계정으로 로그인해서 "내부"는 고를 수 없어요.
   - 연락처 이메일: 본인 이메일 → 동의 → **만들기**

### 4-2. 브랜딩 채우기

**브랜딩(Branding)** 메뉴에서 필수 칸만 채우고 저장해요. 이걸 안 하면 다음 단계의 "앱 게시" 버튼이 회색으로 잠겨요.

- 앱 이름 `Batang`, 사용자 지원 이메일, 개발자 연락처 이메일
- **앱 로고는 올리지 마세요.** 로고를 올리면 구글 심사가 필요해질 수 있어요.
- 홈페이지·개인정보처리방침·약관 링크는 비워 둬요.

### 4-3. 게시 상태를 '프로덕션'으로

**대상(Audience)** 메뉴 → 게시 상태 아래 **앱 게시(Publish app)** → 확인. "프로덕션 중"으로 바뀌면 돼요.

- '테스트 중'으로 두면 등록한 테스트 사용자만 로그인되고, 로그인이 주기적으로 풀려요.
- 우리 앱은 이메일·이름·프로필 사진만 받아서 구글 심사 없이 바로 게시돼요.
- 처음 로그인할 때 "Google에서 확인하지 않은 앱" 안내가 나올 수 있어요. **고급 → Batang(으)로 이동**을 누르면 돼요. 회원들에게도 미리 알려 주세요.

### 4-4. 로그인 클라이언트 만들기

1. **클라이언트(Clients)** 메뉴 → **클라이언트 만들기(Create client)**
2. 애플리케이션 유형 **웹 애플리케이션**, 이름 `Batang 웹`
3. **승인된 리디렉션 URI** → URI 추가 → 3단계에서 복사한 Supabase Callback URL을 붙여 넣어요.
   (승인된 자바스크립트 원본은 비워 둬도 돼요)
4. **만들기** → 나온 **클라이언트 ID**와 **클라이언트 보안 비밀번호(Client Secret)**를 메모해요.
   **보안 비밀번호는 이 창에서만 한 번 보여요.** 놓쳤으면 클라이언트를 열어 새 보안 비밀번호를 추가해요.

---

## 5. Supabase: 구글 로그인 켜기 (5분)

1. 3단계의 Google 창에서 **Enable Sign in with Google**을 켜요.
2. **Client IDs**에 클라이언트 ID, **Client Secret (for OAuth)**에 보안 비밀번호를 넣고 **Save**.
3. **Authentication → URL Configuration** ([바로 가기](https://supabase.com/dashboard/project/_/auth/url-configuration))
   - **Site URL**: `https://jake0315.github.io/batang-talk/`
   - **Redirect URLs** → Add URL: `https://jake0315.github.io/batang-talk/**`
   - 저장

앱 주소는 GitHub가 정하는 규칙대로라서 미리 넣어 둘 수 있어요. 대문자 없이, 끝의 `/`까지 똑같이 넣어요.

---

## 6. 구글 드라이브 폴더와 백업 시트 (5분)

1. 관리자 드라이브에 폴더 `Batang 파일`을 만들어요. 폴더를 열고 주소창의 `folders/` 뒤 글자가 **폴더 ID**예요.
   **이 폴더는 아무에게도 공유하지 마세요.** 채널별 하위 폴더의 보기 권한은 Apps Script가 명단에 맞춰 1시간마다 정리해요.
2. 새 구글 시트 `Batang 백업`을 만들어요. 주소의 `/d/`와 `/edit` 사이 글자가 **시트 ID**예요.

---

## 7. Apps Script: 파일·백업 일꾼 (25분)

### 왜 '로봇 비밀번호'를 쓰나요

Apps Script는 자동 작업(백업, 드라이브 권한 맞추기)을 하려고 DB를 읽어야 해요. 예전에는 Supabase 관리자 키를 넣었는데, 지금은 쓸 수 없어요.

- 새 관리자 키(`sb_secret_…`)는 Apps Script에서 막혀요. Supabase는 브라우저에서 온 요청이면 이 키를 거절하는데, Apps Script는 스스로를 브라우저처럼 소개하고 그 소개를 바꿀 수 없어요.
- 예전 관리자 키(`service_role`)는 Supabase가 2026년 말까지 없애기로 했어요.

그래서 Apps Script는 **공개 키 + 로봇 비밀번호**로 `robot_…` 함수만 불러요. 비밀번호가 틀리면 함수가 아무것도 주지 않아요. 할 수 있는 일은 채널·명단·회원 이름 읽기, 백업용 메시지 읽기, 용량 확인뿐이에요.

### 7-1. 프로젝트 만들기

1. 먼저 [script.google.com/home/usersettings](https://script.google.com/home/usersettings)에서 **Google Apps Script API**를 **사용**으로 켜요. 8단계의 자동 배포(clasp)가 이게 켜져 있어야 동작해요.
2. [script.google.com](https://script.google.com) → **새 프로젝트** → 제목 `Batang`
3. `Code.gs`의 내용을 전부 지우고 ZIP의 `apps-script/Code.gs`를 붙여 넣어요.
4. 왼쪽 톱니바퀴 **프로젝트 설정** → **"appsscript.json" 매니페스트 파일을 편집기에 표시** 체크
5. 편집기로 돌아가 `appsscript.json` 내용을 ZIP의 `apps-script/appsscript.json`으로 바꿔요. 드라이브 고급 서비스가 같이 켜져요.
6. 저장(Ctrl+S)

### 7-2. 스크립트 속성 6개

**프로젝트 설정 → 스크립트 속성 → 스크립트 속성 추가**

| 속성 | 값 |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_KEY` | Publishable key (`sb_publishable_…`) |
| `ROBOT_KEY` | ④ 로봇 비밀번호 🔒 |
| `ROOT_FOLDER_ID` | 폴더 ID |
| `BACKUP_SHEET_ID` | 시트 ID |
| `ADMIN_EMAIL` | 용량 경고 메일 받을 주소 (본인 이메일) |

예전 안내의 `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`는 이제 쓰지 않아요. 이미 넣었다면 지워요.

### 7-3. 연결 확인과 자동 작업 예약

1. 편집기 위쪽 함수 목록에서 **`testConnection`** → **실행**
   - 권한 창이 뜨면 관리자 계정 선택 → "확인되지 않은 앱" 안내가 나오면 **고급 → Batang(안전하지 않음)으로 이동** → **허용**. 본인이 만든 스크립트라 괜찮아요.
   - 실행 로그에 `연결 성공: 채널 7개 (#공지, #친목, …)`가 나오면 성공이에요.
   - `Supabase 4xx: forbidden`이면 로봇 비밀번호가 2-2의 SQL과 다른 거예요. `ROBOT_KEY` 값을 확인해요.
2. 함수 목록에서 **`setup`** → **실행**. 자동 작업 4개가 예약돼요(3일마다 깨우기, 매일 백업, 매시간 권한 맞추기, 매주 용량 점검).
   왼쪽 **트리거(시계 모양)**에 4줄이 보이면 돼요.

### 7-4. 웹앱으로 배포

1. 오른쪽 위 **배포 → 새 배포** → 톱니바퀴에서 유형 **웹 앱**
2. 설명 `Batang`, 다음 사용자 인증 정보로 실행: **나**, 액세스 권한이 있는 사용자: **모든 사용자**
   "모든 사용자"여도 괜찮아요. 스크립트가 요청마다 로그인 증명과 채널 구성원 여부를 확인해요.
3. **배포** → 나온 **웹 앱 URL**(`…/exec`)을 메모해요.
4. 값 두 개를 더 메모해요.
   - **스크립트 ID**: 프로젝트 설정 → ID
   - **배포 ID**: 배포 → 배포 관리 → 방금 만든 배포의 ID (`AKfy…`)

이 주소(/exec)는 앞으로 바뀌지 않아요. 코드가 바뀌면 자동 배포가 같은 배포 ID에 새 버전을 올려요.

---

## 8. Supabase: 푸시 알림 비밀 값 (5분)

**Edge Functions → Secrets** ([바로 가기](https://supabase.com/dashboard/project/_/functions/secrets))에 4개를 넣고 저장해요.

| 이름 | 값 |
| --- | --- |
| `VAPID_PUBLIC_KEY` | ① 푸시 공개 키 |
| `VAPID_PRIVATE_KEY` | ② 푸시 비밀 키 🔒 |
| `VAPID_SUBJECT` | `mailto:` + 관리자 이메일 (예: `mailto:admin@example.com`) |
| `WEBHOOK_SECRET` | ③ 웹훅 비밀번호 🔒 |

이름이 `SUPABASE_`로 시작하면 저장이 안 돼요. 위 이름 그대로 써요.
함수 코드는 9단계의 자동 배포가 올려요. 관리자 키는 Supabase가 함수에 알아서 넣어 줘요.

---

## 9. GitHub 저장소 설정 (20분)

저장소: [github.com/Jake0315/batang-talk](https://github.com/Jake0315/batang-talk)

### 9-1. Pages

**Settings → Pages** ([바로 가기](https://github.com/Jake0315/batang-talk/settings/pages)) → Build and deployment → Source를 **GitHub Actions**로 바꿔요.

### 9-2. Variables 5개 (공개돼도 되는 값)

**Settings → Secrets and variables → Actions → Variables 탭** ([바로 가기](https://github.com/Jake0315/batang-talk/settings/variables/actions)) → New repository variable

| 이름 | 값 |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_KEY` | Publishable key |
| `SUPABASE_PROJECT_REF` | Project ref |
| `GAS_URL` | Apps Script 웹앱 주소 (…/exec) |
| `VAPID_PUBLIC_KEY` | ① 푸시 공개 키 |

### 9-3. Secrets 5개 🔒

같은 화면 **Secrets 탭** ([바로 가기](https://github.com/Jake0315/batang-talk/settings/secrets/actions)) → New repository secret

| 이름 | 값 | 어디서 |
| --- | --- | --- |
| `SUPABASE_DB_URL` | DB 접속 주소 | 아래 ① |
| `SUPABASE_ACCESS_TOKEN` | Supabase 계정 토큰 | 아래 ② |
| `CLASPRC_JSON` | clasp 로그인 정보 | 아래 ③ |
| `APPS_SCRIPT_ID` | 스크립트 ID | 7-4 |
| `APPS_SCRIPT_DEPLOYMENT_ID` | 배포 ID | 7-4 |

**① DB 접속 주소**
Supabase 위쪽 **Connect** 버튼 → **Session pooler**를 고르고 주소를 **Copy 버튼으로** 복사해요.
`postgresql://postgres.〈ref〉:[YOUR-PASSWORD]@aws-…pooler.supabase.com:5432/postgres` 모양이에요.
`[YOUR-PASSWORD]`를 대괄호까지 지우고 DB 비밀번호로 바꿔요.
"Direct connection" 주소는 안 돼요. GitHub 서버는 IPv4만 쓰는데, Session pooler만 IPv4로 무료 연결돼요.

**② Supabase 계정 토큰**
[supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token** → 이름 `batang-github` → 나온 `sbp_…` 값. 이 창을 닫으면 다시 볼 수 없어요.

**③ clasp 로그인 정보**
Apps Script 프로젝트를 만든 관리자 계정의 로그인 정보여야 해요.
- 바탕화면 저장소의 `CLASPRC_JSON`이 **같은 구글 계정**으로 만든 거라면 그 값을 그대로 넣어요.
- 다른 계정(학생회 공용 계정 등)으로 만든 거라면 새로 만들어요.
  1. PC에 [Node.js](https://nodejs.org) LTS를 설치해요.
  2. 명령 프롬프트(또는 터미널)에서 `npx @google/clasp login` → 브라우저에서 관리자 계정으로 허용
  3. `C:\Users\〈내 이름〉\.clasprc.json`(맥은 `~/.clasprc.json`) 파일을 메모장으로 열어 **내용 전체**를 복사해 넣어요.
  4. 넣은 뒤 그 파일은 지워도 돼요. 지우려면 `npx @google/clasp logout`.

### 9-4. main 보호 규칙

**Settings → Rules → Rulesets** ([바로 가기](https://github.com/Jake0315/batang-talk/settings/rules)) → **New ruleset → New branch ruleset**

- Ruleset name `main 보호`, Enforcement status **Active**
- Bypass list: **비워 둬요**
- Target branches → Add target → **Include default branch**
- 체크할 것
  - **Restrict deletions**
  - **Block force pushes**
  - **Require status checks to pass** → **Add checks** → 검색창에 `checks` → 목록의 `checks` 선택
- **Require a pull request before merging은 켜지 마세요.** 켜면 Claude가 "머지해" 한마디로 합칠 수 없어요. 점검을 통과한 커밋만 main에 들어가는 건 위 규칙이 지켜요.
- **Create**

### 9-5. 최신 버전을 main에 합치기

Claude Code에게 **"머지해"**라고 말해요. `claude/setup-guide` 브랜치가 main에 들어가고, 바뀐 부분이 자동 배포돼요.

| 자동 배포 | 하는 일 |
| --- | --- |
| `deploy-pages` | 앱 화면을 `https://jake0315.github.io/batang-talk/`에 올려요 |
| `deploy-db` | `schema.sql`을 운영 DB에 다시 적용해요. 2단계와 같은 내용이라 바뀌는 건 없어요. DB 접속 주소가 맞는지 확인하는 역할이에요 |
| `deploy-functions` | 푸시 알림 함수 `push`를 올려요 |
| `deploy-apps-script` | Apps Script 코드를 같은 /exec 주소로 갱신해요 |

저장소의 **Actions** 탭에서 네 개가 모두 초록 체크가 되는지 봐요. 빨간 X가 있으면 그 항목을 열어 오류 내용을 Claude에게 보여 주세요.
머지가 거절되면 `checks`가 아직 도는 중이에요. 몇 분 뒤 다시 "머지해"라고 하면 돼요.

---

## 10. Supabase: 새 메시지 → 푸시 알림 연결 (5분)

**9-5에서 `deploy-functions`가 초록 체크가 된 뒤에** 해요. 함수가 있어야 연결할 수 있어요.

1. 왼쪽 **Integrations → Database Webhooks** (예전 화면은 Database → Webhooks)
   처음이면 **Enable webhooks**를 먼저 눌러요.
2. **Create a new hook**
   - Name `push_on_message`
   - Table `messages`, Events **Insert**만 체크
   - Type of webhook: **HTTP Request**
   - Method `POST`, URL `https://〈Project ref〉.supabase.co/functions/v1/push`
   - Timeout `5000`
   - HTTP Headers: `Content-Type` = `application/json`, 그리고 **Add a new header**로 `x-webhook-secret` = ③ 웹훅 비밀번호
3. **Create webhook**

"Supabase Edge Functions" 유형 대신 "HTTP Request"를 쓰는 이유: Edge Functions 유형은 예전 관리자 키를 헤더에 자동으로 넣는데, 그 키는 곧 없어져요. 우리 함수는 웹훅 비밀번호로만 확인해서 HTTP Request면 충분해요.

---

## 11. 처음 열어 보기 (15분)

1. PC 크롬에서 `https://jake0315.github.io/batang-talk/` → **Google로 계속하기** → 관리자 계정
2. 홈에 `#공지 #친목 #국장 #기획 #대협 #홍보 #사무`가 보이면 성공이에요. 맨 아래 **채널 추가**는 관리자에게만 보여요.
3. `#친목`에 메시지를 하나 보내 봐요.
4. 휴대폰으로 같은 주소를 열어요. 아이폰은 **사파리**, 갤럭시는 **크롬**으로 열어요. 카카오톡 안에서 열면 구글 로그인이 막혀요.
   - 아이폰: 공유 버튼 → **홈 화면에 추가** → 홈 화면의 Batang을 열어 로그인. 아이폰은 이렇게 해야만 알림이 와요.
5. 홈의 **알림을 켜 둘까요?**(또는 **내 정보 → 푸시 알림 → 켜기**) → 허용 → "알림이 켜졌어요 🎉" 알림이 오면 푸시 설정 끝이에요.
6. PC에서 메시지를 보내 휴대폰에 알림이 오는지 봐요.
7. 이미지 하나를 올려 봐요. 드라이브 `Batang 파일` 안에 채널 폴더가 생기면 Apps Script 연결도 끝이에요.

안 되면 README의 '문제 해결' 표를 보거나, 화면 캡처와 함께 Claude에게 물어보세요.

---

## 12. 운영진 초대

처음에는 2~4명으로 며칠 써 보고, 문제가 없으면 나머지를 넣어요.

**SQL Editor**에서 사람 수만큼 줄을 늘려 실행해요. 이메일은 **소문자**로 적어요.

```sql
insert into allowlist (email, name, role, channels) values
  ('someone@example.com', '홍길동', 'staff',   array['공지','친목','국장','기획']),
  ('another@example.com', '김바탕', 'member', array['공지','친목','홍보'])
on conflict (email) do update
  set name = excluded.name, role = excluded.role, channels = excluded.channels;
```

- `role`: `admin`(관리자) / `staff`(회장·부회장·국장. 공지에 글쓰기, `@채널` 가능) / `member`
- 회장·부회장은 채널 7개를 모두 넣어요.
- 명단은 Supabase에만 있어요. 저장소가 공개라서 파일에는 적지 않아요.
- 넣은 사람은 그냥 로그인하면 자기 채널이 보여요. 드라이브 보기 권한은 1시간 안에 따라와요.

회원에게 보낼 안내: 주소, "사파리(아이폰)·크롬(갤럭시)으로 열기", "홈 화면에 추가", "내 정보에서 알림 켜기", "확인되지 않은 앱 안내가 나오면 고급 → 이동".
그리고 수집 항목(구글 이메일·이름·프로필 사진·메시지·파일)과 보관 방식을 알리고 동의를 받아요.

---

## 13. 마지막 점검

- [ ] 명단에 없는 구글 계정으로 로그인하면 '운영진 전용이에요' 화면에서 멈춘다
- [ ] 일반 회원 계정에 자기 채널만 보인다 (`#국장`이 안 보인다)
- [ ] 일반 회원은 `#공지`에 글을 못 쓰고, 스레드 답글은 쓸 수 있다
- [ ] 관리자 홈의 **채널 추가**로 채널을 만들 수 있다
- [ ] 아이폰·갤럭시 모두 잠금화면에 알림이 오고, 누르면 그 대화가 열린다
- [ ] 다음 날 `Batang 백업` 시트에 메시지가 쌓여 있다
- [ ] Supabase **Advisors → Security Advisor**에 빨간(ERROR) 항목이 없다
- [ ] 메모장의 🔒 값을 지웠다

---

## 참고한 공식 문서 (2026년 11월 확인)

- Supabase API 키 (publishable / secret, 브라우저 차단, 예전 키 2026년 말 폐지): https://supabase.com/docs/guides/api/api-keys
- Supabase 새 키로 옮기기 (Edge Function의 `SUPABASE_SECRET_KEYS`, 웹훅 헤더): https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- Supabase 새 표 자동 공개 중단 (2026-05-30 새 프로젝트, 2026-10-30 기존 프로젝트): https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- Supabase 구글 로그인: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase 리디렉션 주소: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase DB 접속 (Session pooler는 IPv4): https://supabase.com/docs/reference/postgres/connection-strings
- Supabase Edge Function 비밀 값: https://supabase.com/docs/guides/functions/secrets
- Google Auth Platform (브랜딩·대상·클라이언트): https://support.google.com/cloud/answer/15544987
- clasp와 GitHub Actions: https://developers.google.com/apps-script/guides/clasp
- GitHub 규칙(Rulesets)의 필수 점검: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets

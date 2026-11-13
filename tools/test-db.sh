#!/usr/bin/env bash
# DB 설계·보안 규칙 자동 점검
#   bash tools/test-db.sh                     ← 임시 Postgres를 띄워서 점검 (Postgres 16 설치 필요)
#   DATABASE_URL=postgres://... bash tools/test-db.sh   ← 이미 있는 테스트용 Postgres로 점검
# 실제 Supabase 주소를 넣지 마세요. 테스트 DB를 새로 만들고 지워요.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
STARTED=""
if [ -z "${DATABASE_URL:-}" ]; then
  BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)
  [ -n "$BIN" ] || BIN=$(dirname "$(command -v initdb 2>/dev/null || echo /x/initdb)")
  [ -x "$BIN/initdb" ] || { echo "Postgres(initdb)를 찾지 못했어요"; exit 1; }
  TMP=$(mktemp -d /tmp/batang-pg.XXXX); chmod 777 "$TMP"
  AS=""; [ "$(id -u)" = "0" ] && AS="su postgres -c"
  run() { if [ -n "$AS" ]; then $AS "$*"; else bash -c "$*"; fi; }
  run "$BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
  run "$BIN/pg_ctl -D $TMP/data -o '-p 5599 -k $TMP -c listen_addresses=' -l $TMP/log -w start >/dev/null"
  STARTED="$TMP"
  trap 'run "$BIN/pg_ctl -D $STARTED/data -m immediate stop >/dev/null" || true; rm -rf "$STARTED"' EXIT
  DATABASE_URL="postgresql://postgres@/postgres?host=$TMP&port=5599"
fi
export PGOPTIONS="-c client_min_messages=warning"
P() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
P -c "drop database if exists batang_test" -c "create database batang_test"
T=$(printf '%s' "$DATABASE_URL" | sed -E 's#/postgres(\?|$)#/batang_test\1#')
Q() { psql "$T" -X -q -v ON_ERROR_STOP=1 "$@"; }
Q -f "$ROOT/supabase/tests/local_stub.sql" >/dev/null
echo "· schema.sql 1회차 (한 트랜잭션)"; Q --single-transaction -f "$ROOT/supabase/schema.sql" >/dev/null
echo "· schema.sql 2회차 (다시 실행해도 되는지)"; Q --single-transaction -f "$ROOT/supabase/schema.sql" >/dev/null
Q -f "$ROOT/supabase/seed.sql" -f "$ROOT/supabase/tests/fixtures.sql" >/dev/null
echo "· 보안 규칙 점검"
OUT=$(PGOPTIONS="-c client_min_messages=notice" Q -f "$ROOT/supabase/tests/rls_test.sql" 2>&1) || { echo "$OUT" | grep -E "FAIL|ERROR" ; exit 1; }
echo "$OUT" | grep -c "pass:" | xargs -I{} echo "  통과 {}개"
echo "$OUT" | grep -q "ALL PASS" || { echo "끝까지 가지 못했어요"; exit 1; }
P -c "drop database batang_test"
echo "DB 점검 통과"

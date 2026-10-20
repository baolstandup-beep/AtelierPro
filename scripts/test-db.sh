#!/usr/bin/env bash
# Démarre un PostgreSQL local jetable pour les tests SQL (npm run test:db).
# Prérequis : PostgreSQL 15+ installé (initdb / pg_ctl dans le PATH ou sous /usr/lib/postgresql/*/bin).
set -euo pipefail
DIR="${PGTEST_DIR:-/tmp/pg}"
PORT="${PGPORT:-54329}"
BIN="$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")"
RUN=""
[ "$(id -u)" = "0" ] && RUN="su postgres -c"
mkdir -p "$DIR" && chown postgres "$DIR" 2>/dev/null || true
if [ ! -f "$DIR/data/PG_VERSION" ]; then
  ${RUN:+$RUN} "$BIN/initdb -D $DIR/data -A trust -U postgres" >/dev/null
fi
${RUN:+$RUN} "$BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start" || true
echo "PostgreSQL de test prêt : PGHOST=$DIR PGPORT=$PORT"

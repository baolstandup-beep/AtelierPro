#!/usr/bin/env bash
# Pile Supabase minimale pour les tests de bout en bout (Docker requis) :
# Postgres Supabase + GoTrue (auth) + PostgREST + passerelle Node sur :54321.
# Le stockage des photos n'est pas inclus (l'envoi de photo échouera localement).
set -euo pipefail
cd "$(dirname "$0")/../.."
JWT_SECRET="${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
PGPASS=postgres
docker network create eba >/dev/null 2>&1 || true
docker run -d --name eba-db --network eba -e POSTGRES_PASSWORD=$PGPASS -e JWT_SECRET="$JWT_SECRET" -p 55432:5432 supabase/postgres:15.8.1.085 >/dev/null
until docker exec eba-db pg_isready -U postgres -h localhost >/dev/null 2>&1; do sleep 2; done
sleep 5
docker exec -e PGPASSWORD=$PGPASS eba-db psql -h localhost -U supabase_admin -d postgres -q \
  -c "alter role authenticator with password '$PGPASS'; alter role supabase_auth_admin with password '$PGPASS'; alter role postgres with password '$PGPASS';"
docker run -d --name eba-auth --network eba -p 59999:9999 \
  -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://localhost:54321 \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:$PGPASS@eba-db:5432/postgres" \
  -e GOTRUE_SITE_URL=http://localhost:3000 -e GOTRUE_DISABLE_SIGNUP=true -e GOTRUE_JWT_SECRET="$JWT_SECRET" -e GOTRUE_JWT_EXP=3600 \
  -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true \
  supabase/gotrue:v2.177.0 >/dev/null
until curl -sf http://localhost:59999/health >/dev/null; do sleep 2; done
for f in supabase/migrations/*.sql; do
  # Le schéma storage complet est créé par storage-api, absent ici : migration ignorée.
  [[ "$f" == *storage.sql ]] && continue
  PGPASSWORD=$PGPASS psql -h localhost -p 55432 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$f"
done
docker run -d --name eba-rest --network eba -p 53000:3000 -e PGRST_DB_URI="postgres://authenticator:$PGPASS@eba-db:5432/postgres" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$JWT_SECRET" postgrest/postgrest:v12.2.12 >/dev/null
nohup node scripts/local-stack/gateway.mjs > /tmp/eba-gateway.log 2>&1 &
JWT_SECRET="$JWT_SECRET" node scripts/local-stack/jwt.mjs > .env.stack
echo "Pile prête sur http://localhost:54321 — clés dans .env.stack"

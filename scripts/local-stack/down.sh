#!/usr/bin/env bash
docker rm -f eba-rest eba-auth eba-db >/dev/null 2>&1 || true
pkill -f scripts/local-stack/gateway.mjs || true
echo "Pile arrêtée."

#!/usr/bin/env bash
#
# ED-2 / F-15 — smoke-test the SHIPPED production proxy config.
#
# The TLS block used to be commented out and the upstreams pointed at
# host.docker.internal, so what shipped neither terminated TLS nor routed under
# Compose. `nginx -t` proves the file parses; it does not prove a browser can
# reach either app over HTTPS. This stands the real nginx/nginx.conf up against
# stub upstreams named exactly as the compose services it expects, then drives
# it over the wire.
#
# Self-contained: generates its own throwaway certificate, uses its own compose
# project and high ports, and tears everything down on exit. Nothing here
# touches the developer's running stack.
#
# Usage:  bash scripts/smoke-tls.sh
# Requires: docker, openssl (via the alpine/openssl image if absent locally).

set -euo pipefail

HTTP_PORT="${SMOKE_HTTP_PORT:-8080}"
HTTPS_PORT="${SMOKE_HTTPS_PORT:-8443}"
PROJECT="turbo-template-smoke-tls"
WORKDIR="$(mktemp -d)"

pass=0
fail=0

ok()   { printf '  ok   %s\n' "$1"; pass=$((pass + 1)); }
bad()  { printf '  FAIL %s\n' "$1"; fail=$((fail + 1)); }

cleanup() {
  docker compose -p "$PROJECT" -f "$WORKDIR/compose.yml" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

# Docker wants native paths for bind mounts, and Git Bash rewrites anything
# that looks like a POSIX path. `cygpath` exists only there, so this is a no-op
# on Linux and macOS.
hostpath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}

echo "==> Generating a throwaway certificate"
mkdir -p "$WORKDIR/certs" "$WORKDIR/webroot"

# The subject goes in a config file rather than -subj. Git Bash rewrites any
# argument that looks like a POSIX path, so "/CN=localhost" arrives as
# "C:/Program Files/Git/CN=localhost"; suppressing that globally breaks the
# -keyout/-out paths instead. A config file has neither problem anywhere.
cat > "$WORKDIR/openssl.cnf" <<'CNF'
[req]
distinguished_name = dn
x509_extensions    = v3
prompt             = no

[dn]
CN = localhost

[v3]
subjectAltName = DNS:localhost, IP:127.0.0.1
CNF

openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -keyout "$WORKDIR/certs/privkey.pem" \
  -out "$WORKDIR/certs/fullchain.pem" \
  -config "$WORKDIR/openssl.cnf" >/dev/null 2>&1

# Stub upstreams. They only need to answer on the ports nginx.conf proxies to,
# under the service names it hard-codes — that pairing IS the acceptance
# criterion ("resolve backend/web by service name, not host.docker.internal").
cat > "$WORKDIR/compose.yml" <<COMPOSE
services:
  web:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:3001", "-text=WEB_STUB_OK"]
  backend:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:3000", "-text=BACKEND_STUB_OK"]
  nginx:
    image: nginx:alpine
    depends_on: [web, backend]
    ports:
      - "${HTTP_PORT}:80"
      - "${HTTPS_PORT}:443"
    volumes:
      - $(hostpath "$PWD/nginx/nginx.conf"):/etc/nginx/templates/default.conf.template:ro
      - $(hostpath "$WORKDIR/certs"):/etc/nginx/certs:ro
      - $(hostpath "$WORKDIR/webroot"):/var/www/certbot
COMPOSE

echo "==> Starting the shipped production config"
docker compose -p "$PROJECT" -f "$WORKDIR/compose.yml" up -d >/dev/null 2>&1

# Wait for the listener rather than sleeping a fixed amount.
for _ in $(seq 1 30); do
  if curl -sk -o /dev/null "https://localhost:${HTTPS_PORT}/" 2>/dev/null; then break; fi
  sleep 1
done

echo "==> Assertions"

# 1. TLS actually terminates, at 1.2 or better.
proto=$(curl -sk -o /dev/null -w '%{ssl_verify_result}\n' "https://localhost:${HTTPS_PORT}/" >/dev/null 2>&1 && \
        openssl s_client -connect "localhost:${HTTPS_PORT}" -brief </dev/null 2>&1 | grep -oE 'TLSv1\.[23]' | head -1 || true)
case "$proto" in
  TLSv1.2|TLSv1.3) ok "TLS terminates at $proto" ;;
  *)               bad "TLS did not negotiate 1.2+ (got '${proto:-nothing}')" ;;
esac

# 2. No legacy protocol is enabled.
#
# Asserted against the config, not over the wire, and deliberately so: every
# OpenSSL available here — including the one in alpine:3.9 — refuses to OFFER
# TLS 1.1, so a handshake probe reports "refused" no matter what the server
# allows. Verified by lowering the floor in nginx.conf and watching the probe
# still pass. A check that cannot fail is worse than no check, so this reads
# the directive instead and says what it is.
floor=$(grep -E '^\s*ssl_protocols' nginx/nginx.conf | head -1)
if printf '%s' "$floor" | grep -qE 'TLSv1(\.1)?[^.0-9]'; then
  bad "a legacy protocol is enabled:${floor}"
elif printf '%s' "$floor" | grep -q 'TLSv1.2'; then
  ok "TLS floor is 1.2, no legacy protocols (${floor# })"
else
  bad "could not find an ssl_protocols floor in nginx.conf"
fi

# 3. Web route reaches the web upstream BY SERVICE NAME.
body=$(curl -sk "https://localhost:${HTTPS_PORT}/" || true)
case "$body" in
  *WEB_STUB_OK*) ok "/ routes to the web service" ;;
  *)             bad "/ did not reach web (got '${body:0:60}')" ;;
esac

# 4. API route reaches the backend upstream, prefix intact.
body=$(curl -sk "https://localhost:${HTTPS_PORT}/api/v1/health" || true)
case "$body" in
  *BACKEND_STUB_OK*) ok "/api/ routes to the backend service" ;;
  *)                 bad "/api/ did not reach backend (got '${body:0:60}')" ;;
esac

# 5. HTTP redirects to HTTPS instead of serving.
code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HTTP_PORT}/login" || true)
location=$(curl -sI "http://localhost:${HTTP_PORT}/login" | grep -i '^location:' | tr -d '\r' || true)
if [ "$code" = "301" ] && printf '%s' "$location" | grep -qi 'https://'; then
  ok "HTTP 301s to HTTPS ($location)"
else
  bad "HTTP did not redirect (code=$code, location='${location:-none}')"
fi

# 6. The ACME challenge path stays on HTTP, or renewal breaks once the
#    redirect above is live.
printf 'renewal-token' > "$WORKDIR/webroot/.well-known-probe" 2>/dev/null || true
mkdir -p "$WORKDIR/webroot/.well-known/acme-challenge"
printf 'renewal-token' > "$WORKDIR/webroot/.well-known/acme-challenge/probe"
body=$(curl -s "http://localhost:${HTTP_PORT}/.well-known/acme-challenge/probe" || true)
case "$body" in
  *renewal-token*) ok "ACME challenge served over HTTP" ;;
  *)               bad "ACME challenge not reachable (got '${body:0:60}')" ;;
esac

echo
echo "==> $pass passed, $fail failed"
[ "$fail" -eq 0 ]

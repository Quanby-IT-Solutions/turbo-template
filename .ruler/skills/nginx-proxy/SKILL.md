---
name: nginx-proxy
description: The single-port Nginx reverse proxy that fronts web + backend on one origin. Use when editing routing, TLS, upstreams, or the docker-proxy compose profile, or when debugging 502/CORS/same-origin issues. Triggers on nginx, reverse proxy, single-port, TLS, upstream, docker-proxy, X-Forwarded-For.
frameworks:
  - nginx
  - docker
category: deployment
updated: 2026-08-15
---

# Nginx Single-Port Reverse Proxy

One entrypoint serves both apps by path, so the whole stack is same-origin — **no browser CORS** and **one TLS certificate** for both apps.

```
/api/*  -> backend  (NestJS global prefix is /api)   :3000
/*      -> web      (Next.js)                          :3001
```

Files (`nginx/`):
- **`nginx.dev.conf`** — local development, **HTTP only on :80**. The default (a fresh clone works with no certificates).
- **`nginx.conf`** — production. HTTP :80 does the ACME challenge + redirects to HTTPS; TLS terminates on :443. Both configs ship live and working, not commented out.

## Compose wiring (`docker-compose.yml`)

The proxy is the `nginx` service, gated behind the **`docker-proxy` compose profile**:

- `COMPOSE_PROFILES=docker-proxy` (default, set in the root `.env`) starts the bundled Nginx on ports **80/443**.
- Set `COMPOSE_PROFILES=` (empty) to NOT start it — freeing port 80 for your own/host Nginx. web/backend are always published on `127.0.0.1:3001` / `:3000`, so a host proxy can reach them.
- The config is mounted as a **template** into `/etc/nginx/templates/default.conf.template`; the nginx image's `envsubst` entrypoint renders it to `conf.d/default.conf`, substituting only names that exist in the environment (so Nginx's own `$host`/`$remote_addr` survive).
- `docker compose restart nginx` picks up edits to the mounted `./nginx/*.conf`.

### Environment knobs

| Var | Default | Purpose |
|---|---|---|
| `NGINX_CONF` | `./nginx/nginx.dev.conf` | selects which config to mount (point at `./nginx/nginx.conf` for prod TLS) |
| `WEB_UPSTREAM` | `web:3001` | web upstream host:port |
| `BACKEND_UPSTREAM` | `backend:3000` | backend upstream host:port |
| `NGINX_CERTS_DIR` | `./nginx/certs` | mounted read-only to `/etc/nginx/certs` (prod expects `fullchain.pem` + `privkey.pem`) |
| `NGINX_ACME_WEBROOT` | `./nginx/certbot` | certbot webroot for `/.well-known/acme-challenge/` |

Two dev topologies, one config, thanks to the upstream variables (`nginx.dev.conf` uses `${WEB_UPSTREAM}`/`${BACKEND_UPSTREAM}`):
- everything in compose → defaults `web:3001`/`backend:3000` (Docker DNS).
- only Nginx in compose, apps under `pnpm dev` on the host → set `WEB_UPSTREAM=host.docker.internal:3001`, `BACKEND_UPSTREAM=host.docker.internal:3000` in the root `.env`.

Docker's embedded resolver (`resolver 127.0.0.11 valid=10s`) plus `set $upstream …; proxy_pass $upstream;` makes Nginx re-resolve upstreams at request time, so recreating web/backend (new IPs) needs no Nginx restart.

## TLS (production `nginx.conf`)

- `:80` keeps `/.well-known/acme-challenge/` reachable (webroot) and `301`s everything else to HTTPS — renewal must not be broken by the redirect.
- `:443 ssl http2`, `ssl_protocols TLSv1.2 TLSv1.3` only (1.0/1.1 refused), forward-secret ECDHE suites only, `ssl_prefer_server_ciphers off` (let TLS 1.3 clients pick). Certs at `/etc/nginx/certs/{fullchain,privkey}.pem`. Issue with `certbot certonly --webroot -w /var/www/certbot -d <domain>`.

## Hardening (shared by both configs)

- **Security headers** are minimal and use `always` (so they apply to Nginx's own error responses, where no app header exists to inherit): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. Deliberately does NOT set CSP — Next.js owns the page CSP and NestJS the API headers; browsers **intersect** multiple CSPs, so duplicating would break the app. Nginx does **not** emit HSTS (`Strict-Transport-Security` appears nowhere in `nginx/`) — HSTS is app-layer in the NestJS backend, gated by `ENABLE_HSTS` (off by default; turn on once TLS terminates in front of the app — see `apps/backend/.env.example`).
- **Request limits**: `client_max_body_size 1m` (above the app's own 100kb parser so oversized requests stop at the edge and borderline bodies get a coherent app 413), `client_body_timeout`/`client_header_timeout 15s` (drops slow or stalled clients), `proxy_connect_timeout 5s`, `proxy_send/read_timeout 60s`.
- **X-Forwarded-For is SET, never appended**: `proxy_set_header X-Forwarded-For $remote_addr`. Nginx sets `X-Forwarded-For` to the connecting address (never appends); the backend's `TRUST_PROXY` must equal the number of proxies in front. The header carries exactly one entry (the peer Nginx accepted), which `ThrottlerProxyGuard` keys on. **Topology assumption**: this is the single hop in front of the app, so the backend runs `TRUST_PROXY=1`. If you add a proxy, switch to appending (`$proxy_add_x_forwarded_for`) and raise `TRUST_PROXY` to match. Raising `TRUST_PROXY` alone does not move the guard's key; an extra hop needs `TRUST_PROXY` and `ThrottlerProxyGuard.getTracker` updated together.
- `/` also forwards `Upgrade`/`Connection: upgrade` for Next.js websockets.

## Production note

`docker-compose.production.yml` and `docker-compose.staging.yml` have **no** nginx service. Production's load balancer fronts those EC2 instances, terminates TLS, and **appends** the address it saw onto `X-Forwarded-For`. That is still one hop, so `TRUST_PROXY` stays `1` (do not raise it just because the load balancer appends). Raising `TRUST_PROXY` alone does not move `ThrottlerProxyGuard`'s key; an extra hop needs `TRUST_PROXY` and `getTracker` updated together. Staging in this repo is EC2 plus an Elastic IP; any load balancer there is managed outside this repo. The bundled nginx is for local single-port dev and any self-hosted deployment. See `docker-deployment` and `aws-infrastructure`.

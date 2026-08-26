---
name: redis-caching
description: Redis usage in this monorepo — the shared ioredis connection, the throttler counter store, and the RBAC permission cache. Use when working on rate limiting, caching, the RBAC cache, or Redis connection/config. Triggers on tasks involving redis, throttle, cache, rate limit, rbac cache, ioredis, or REDIS_URL.
frameworks:
  - ioredis
  - nestjs
languages:
  - typescript
category: caching
updated: 2026-08-15
---

# Redis Caching Skill

## Quick Reference

One Redis connection, two consumers with OPPOSITE failure modes:

| Consumer | File | Redis-down behaviour |
|----------|------|----------------------|
| Throttler counter store | `common/redis/resilient-throttler.storage.ts` | **fail-OPEN** — requests allowed |
| RBAC permission cache | `common/rbac/rbac-cache.service.ts` | **fail-CLOSED** — read misses, recompute from DB |

The asymmetry is the whole point: the throttler guards *how often* (availability
over enforcement), the RBAC cache guards *who may do what* (correctness over
availability). See the security-hardening skill for how both are wired.

## Shared Connection (`common/redis/redis.provider.ts`)

```typescript
export const REDIS_CLIENT = Symbol("REDIS_CLIENT")
export type RedisClient = Redis | null // null when REDIS_URL is unset

export function createRedisClient(): RedisClient {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — throttler and RBAC cache stay process-local ...")
    return null // both consumers degrade to in-process behaviour
  }
  const client = new Redis(env.REDIS_URL, {
    keyPrefix: `${env.REDIS_KEY_PREFIX}:`, // lets environments share one Redis
    enableOfflineQueue: false, // a lookup that resolves minutes later is worse than an immediate miss
    maxRetriesPerRequest: 1,
    retryStrategy: attempt => Math.min(attempt * 200, 5_000), // bounded backoff, no reconnect storm
    lazyConnect: false,
  })
  // MUST attach an 'error' listener or ioredis crashes the process. Logged ONCE
  // per transition (reportedDown flag), not per failed command.
  client.on("error", err => { /* log once */ })
  client.on("ready", () => { /* log recovery once */ })
  return client
}
```

Provided by `RedisModule` (`common/redis/redis.module.ts`), which is `@Global()`
(one connection shared by both consumers) and closes the client on
`onApplicationShutdown`. Inject with `@Inject(REDIS_CLIENT) redis: RedisClient` —
always null-check, since `null` is a valid value.

## Throttler Store — Fail OPEN

`app.module.ts` wires the throttler with the Redis store ONLY when a client
exists, wrapped in `ResilientThrottlerStorage`:

```typescript
...(redis
  ? { storage: new ResilientThrottlerStorage(new ThrottlerStorageRedisService(redis)) }
  : {}) // no client → in-memory store (correct for a single instance)
```

On a Redis error the wrapper swallows it and returns a "well under the limit"
record so the guard admits the request:

```typescript
// requests are NOT rate limited until Redis returns; logged once
return { totalHits: 0, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 }
```

## RBAC Cache — Fail CLOSED

`RbacCacheService` stores each user's resolved role/permission sets as JSON
(Sets don't survive JSON) under `rbac:user:<id>`, 60s TTL.

```typescript
async get(userId): Promise<ResolvedPermissionSet | undefined> {
  if (!this.redis) return undefined // no client → always a miss → DB recompute
  try {
    const raw = await this.redis.get(`rbac:user:${userId}`)
    // ... JSON.parse, rebuild Sets
  } catch {
    return undefined // unreachable or unreadable → treat as miss (fail closed)
  }
}
```

- `set` is fire-and-forget (a failed write costs one recomputation).
- `invalidate(userId)` and `clear()` **throw** on failure — a silent failure
  would keep serving revoked permissions for up to a full TTL. Callers invalidate
  AFTER the mutation commits.
- `clear()` SCANs `rbac:user:*` rather than `FLUSHDB` — the keyspace is shared
  with the throttle counters and possibly other environments.

## Environment

| Var | Default | Notes |
|-----|---------|-------|
| `REDIS_URL` | unset | optional for ONE backend instance; **required** for multiple — the counters and permission cache must be shared or they multiply/diverge per instance |
| `REDIS_KEY_PREFIX` | `turbo-template` | applied as ioredis `keyPrefix`; isolates environments sharing one Redis |
| `REDIS_PASSWORD` | — | not read by the app directly; used in compose to build `REDIS_URL` (`redis://:${REDIS_PASSWORD}@redis:6379`) |

Without `REDIS_URL`, a single instance runs fine (in-process throttler + no RBAC
cache). Across multiple instances a "10 per minute" limit becomes 10×N and a
revoked permission lingers on every instance except the one that revoked it.

## Docker Compose

`docker-compose.yml` starts a `redis:7-alpine` service:

- `command: ["redis-server", "--requirepass", "${REDIS_PASSWORD:?REDIS_PASSWORD is required}", "--appendonly", "no"]`
  — `REDIS_PASSWORD` has NO default, so an unauthenticated Redis cannot boot.
- **No published port** — reachable only inside the compose network by service
  name. Publishing it would expose an internet-facing data store.
- Backend gets `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379`.

## See Also

- `security-hardening` — throttler limiters, `@StrictThrottle()`, RbacGuard, the
  fail-open/fail-closed rationale in full.

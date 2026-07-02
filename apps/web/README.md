# @repo/web

Next.js 16 frontend application with App Router, Tailwind CSS, and shadcn/ui.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS + shadcn/ui
- **Data Fetching**: TanStack Query
- **Auth**: Better Auth (client)
- **Validation**: Zod + @t3-oss/env-nextjs

## Structure

```
apps/web/
├── app/                  # Next.js routing only (pages, layouts, routes)
│   ├── (site)/           # Route groups and page.tsx files
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout
├── features/             # ALL business logic goes here
│   └── [feature]/
│       ├── api/          # TanStack Query hooks
│       ├── components/   # Feature-specific components
│       ├── lib/          # Feature utilities
│       └── server/       # Server actions
├── core/                 # Shared/reusable code
│   ├── components/       # Shared UI components (shadcn/ui)
│   ├── context/          # React contexts
│   ├── hooks/            # Shared hooks
│   ├── lib/              # Shared utilities
│   └── styles/           # Global styles
├── services/             # External service integrations
│   ├── better-auth/      # Auth client setup
│   └── tanstack-query/   # Query client setup
└── env.ts                # Environment validation
```

## Development

```bash
# From monorepo root
pnpm dev:web

# Or directly
pnpm --filter @repo/web dev
```

Runs on [http://localhost:3001](http://localhost:3001)

## Environment Variables

| Variable                   | Description                  |
| -------------------------- | ---------------------------- |
| `INTERNAL_API_BASE_URL`    | Optional server-only API URL |
| `NEXT_PUBLIC_APP_URL`      | Web app URL                  |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL         |
| `NEXT_PUBLIC_API_VERSION`  | API version (default: 1)     |

See `.env.example` for reference.

## Scripts

| Command          | Description            |
| ---------------- | ---------------------- |
| `pnpm dev`       | Start dev server       |
| `pnpm build`     | Build for production   |
| `pnpm start`     | Start production build |
| `pnpm lint`      | Run ESLint             |
| `pnpm typecheck` | Type check             |
| `pnpm pwa:icons` | Generate PWA icons     |

## PWA

This app ships as an installable Progressive Web App (installable, offline-capable, service-worker cached). Everything below is self-contained: setup → usage → behavior → troubleshooting → manual test → change report.

### Icon Generation

Generate all icon assets from a single source SVG:

```bash
pnpm --filter @repo/web pwa:icons
```

Source art: `public/icons/pwa-source.svg` (placeholder — replace before shipping).

Generated outputs:

| File                                 | Size      | Purpose                                |
| ------------------------------------ | --------- | -------------------------------------- |
| `public/icons/icon-192.png`          | 192 × 192 | Manifest standard icon                 |
| `public/icons/icon-512.png`          | 512 × 512 | Manifest standard icon                 |
| `public/icons/icon-512-maskable.png` | 512 × 512 | Manifest maskable icon (80% safe zone) |
| `public/icons/apple-touch-icon.png`  | 180 × 180 | iOS home screen                        |
| `public/favicon.ico`                 | 32 × 32   | Browser tab (PNG-backed placeholder)   |
| `public/icons/favicon.ico`           | 32 × 32   | Mirror copy                            |

Note: `sharp` cannot emit a true multi-size ICO; replace with a dedicated tool (e.g. `png-to-ico`) for production.

**TODO**: Replace `pwa-source.svg` with real brand artwork before shipping.

### Install Button (Opt-In)

`InstallButton` is **not mounted by default** — place it wherever your UI needs it.

Import path: `@/features/pwa/components/install-button`

The button renders `null` automatically when:

- the browser does not support `beforeinstallprompt` (Firefox, Safari/iOS),
- the app is already installed (standalone mode), or
- the install criteria are not yet met.

iOS users install via Safari's native **Share → Add to Home Screen** flow; no button is shown.

Example placement: drop `<InstallButton />` into a header actions cluster or settings page.

### Service Worker Behavior

- **Production only**: the SW is compiled from `app/sw.ts` and served at `/serwist/sw.js` via the route handler at `app/serwist/[[...serwist]]/route.ts`. Registration is performed by `SerwistRegistrationProvider` (mounted in `app/layout.tsx`) only when `NODE_ENV === "production"`.
- **Dev mode**: no SW is registered. The route handler returns 404. The provider runs a dev-only cleanup effect that unregisters any existing service workers and deletes all caches for the origin — handling the case where a developer previously ran a production build on the same `localhost` port.
- **No `public/sw.js` artifact**: `@serwist/turbopack` emits the compiled SW into `.next/` (already git-ignored); there is no `public/sw.js` file to commit or gitignore.

### Caching Safety

Three-tier strategy — order matters, specific rules precede `defaultCache`:

| Traffic                                             | Strategy                                             | Rationale                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/api/*` (all origins)                              | **NetworkOnly**                                      | Auth/dynamic responses never cached; covers same-origin prod (Nginx `/api`) and cross-origin dev (`:3000/api`) |
| Static assets (`_next/static`, JS/CSS/fonts/images) | CacheFirst / StaleWhileRevalidate via `defaultCache` | Fast repeat loads for immutable assets                                                                         |
| Navigations / app shell                             | NetworkFirst → offline fallback at `/~offline`       | Fresh HTML when online; branded fallback page when offline                                                     |

- API and auth data are **never** served stale from cache.
- In-page data errors (e.g. TanStack Query failures) use the app's existing loading/error states; the offline fallback is only for failed navigation requests.

### Dev Troubleshooting — Stale Service Worker

If a stale SW persists after switching from a production build back to `pnpm dev:web`:

1. Open browser DevTools → **Application** tab → **Service Workers** → click **Unregister** for the current origin.
2. DevTools → **Application** → **Storage** → click **Clear site data** (clears caches, cookies, IndexedDB).
3. Hard-reload the page (`Ctrl+Shift+R` / `Cmd+Shift+R`).

The `SerwistRegistrationProvider` performs this cleanup automatically on mount in dev mode, but manual cleanup is the fallback when browser state is already inconsistent before the app loads.

### Manual Test Checklist

**Prerequisites**

A reachable backend is required so the API cache-safety check (step 5) can exercise real `/api/*` traffic. Start the backend, then build and start the production web server:

```bash
# 1. Start a live backend (from monorepo root)
pnpm dev:backend
# Backend runs at http://localhost:3000 (serves /api/*)
# Alternatively, run the full Docker + Nginx stack (see repo root README) so
# web and API share one origin.

# 2. Build and start the production web server (separate terminal)
pnpm --filter @repo/web build
pnpm --filter @repo/web start
# App runs at http://localhost:3001
```

**Android device prerequisites** (only for step 2 below): a physical Android phone with USB debugging enabled and `adb` installed, connected over USB — or an HTTPS tunnel / deployed environment. Plain `http://localhost:3001` on the phone points at the phone itself, not your machine, and a raw LAN IP loses Chrome's localhost secure-context exemption that installability requires.

**Checklist**

1. **Install — Desktop (Chrome/Edge)**
   - Open `http://localhost:3001` in Chrome or Edge.
   - Confirm the install icon appears in the address bar (or use `<InstallButton />` if mounted).
   - Click install → accept the native dialog.
   - Verify the app opens in a standalone window with the correct name and icon.

2. **Install — Android (Chrome)** — real device, not DevTools emulation

   DevTools mobile emulation does **not** exercise the real Add to Home Screen / install flow, so it cannot validate this step. Use one of the two paths below.

   **Path A — `adb reverse` (physical device over USB)**
   - Connect the phone via USB with USB debugging enabled.
   - Forward the phone's `localhost:3001` to your machine:
     ```bash
     adb reverse tcp:3001 tcp:3001
     ```
   - On the phone, open `http://localhost:3001` in Chrome. Because the phone now resolves `localhost` to your machine, Chrome keeps its localhost secure-context exemption and the app stays installable.

   **Path B — HTTPS tunnel / deployed environment**
   - Expose the running server over HTTPS (e.g. an ngrok/cloudflared tunnel to port `3001`, or a deployed staging URL).
   - Open the `https://` URL on the phone in Chrome. HTTPS provides the secure context installability requires.

   Then, on the phone:
   - Confirm the "Add to Home Screen" banner or install prompt appears (or use Chrome menu → **Install app**).
   - Install and launch from the home screen icon; verify it opens in standalone mode with the correct name and icon.

3. **Offline fallback — uncached navigation**
   - With the app running, open DevTools → **Network** → set throttling to **Offline**.
   - Navigate to a route that has not been visited (e.g. `/some-new-path`).
   - Verify the branded `/~offline` page is shown (not the browser's dead-dinosaur error).
   - Restore network → verify the connectivity indicator flips to "Online" and the page auto-retries once.

4. **Offline fallback — cached shell**
   - Visit a route while online so it is cached.
   - Go offline (DevTools → Network → Offline).
   - Navigate to that same route; verify it renders from cache.

5. **API not cached — NetworkOnly** (requires the live backend from Prerequisites)
   - **While online**, visit a page that performs an API request (e.g. the todos page).
   - Open DevTools → **Network** and confirm the `/api/*` request appears and returns a real response (status 200, served from the network — not `(from ServiceWorker)` / `(disk cache)`). This proves API traffic actually succeeded; an empty cache is only meaningful once a real request has run.
   - Open DevTools → **Application** → **Cache Storage**; confirm no entries with `/api/` paths appear in any cache.
   - Now set DevTools → **Network** → **Offline** and reload / re-trigger the same API request; verify it **fails with a network error** rather than returning the earlier response. A stale response here would mean the API was cached — the NetworkOnly rule is only proven when the offline request fails.

6. **Dev mode — SW disabled**
   - Stop the production server; run `pnpm --filter @repo/web dev`.
   - Open `http://localhost:3001` in the browser.
   - DevTools → **Application** → **Service Workers**: confirm no SW is registered for this origin.
   - DevTools → **Network**: request `http://localhost:3001/serwist/sw.js`; confirm it returns **404**.

7. **Typecheck, lint, build** (run before marking done):

   ```bash
   pnpm --filter @repo/web typecheck
   pnpm --filter @repo/web lint
   pnpm --filter @repo/web build
   ```

   All three must pass with no errors.

### PWA — Files Changed

**New files**

| File                                                    | Purpose                                                  |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `apps/web/core/lib/app-config.ts`                       | Single source of truth for app name, colors, description |
| `apps/web/app/manifest.ts`                              | Web app manifest (Next.js route)                         |
| `apps/web/app/sw.ts`                                    | Service worker source (Serwist)                          |
| `apps/web/app/serwist/[[...serwist]]/route.ts`          | SW route handler (dev-guarded)                           |
| `apps/web/app/~offline/page.tsx`                        | Offline fallback route                                   |
| `apps/web/features/pwa/components/serwist-provider.tsx` | SW registration + dev cleanup                            |
| `apps/web/features/pwa/components/offline-view.tsx`     | Offline UI (connectivity indicator, retry)               |
| `apps/web/features/pwa/lib/use-install-prompt.ts`       | `beforeinstallprompt` hook                               |
| `apps/web/features/pwa/components/install-button.tsx`   | Opt-in install button                                    |
| `apps/web/scripts/generate-pwa-icons.mjs`               | Icon generator (`sharp`)                                 |
| `apps/web/public/icons/pwa-source.svg`                  | Source SVG (placeholder)                                 |
| `apps/web/public/icons/icon-192.png`                    | Generated icon                                           |
| `apps/web/public/icons/icon-512.png`                    | Generated icon                                           |
| `apps/web/public/icons/icon-512-maskable.png`           | Generated maskable icon                                  |
| `apps/web/public/icons/apple-touch-icon.png`            | Generated Apple touch icon                               |
| `apps/web/public/favicon.ico`                           | Generated favicon (PNG-backed)                           |
| `apps/web/public/icons/favicon.ico`                     | Mirror favicon copy                                      |

**Modified files**

| File                      | Change                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/next.config.ts` | Wrapped with `withSerwist` from `@serwist/turbopack`                                                                              |
| `apps/web/package.json`   | Added `serwist`, `@serwist/turbopack` (deps); `esbuild`, `sharp` (devDeps); `pwa:icons` script                                    |
| `apps/web/app/layout.tsx` | Added `manifest`, `appleWebApp`, `icons` metadata; `viewport` with dark-aware `themeColor`; mounted `SerwistRegistrationProvider` |
| `apps/web/README.md`      | Added this PWA section                                                                                                            |

**Remaining TODOs**

- Replace `public/icons/pwa-source.svg` with real brand artwork, then re-run `pnpm --filter @repo/web pwa:icons`.
- Update `APP_NAME`, `APP_SHORT_NAME`, `APP_DESCRIPTION`, and `APP_THEME_COLOR` in `core/lib/app-config.ts` for the target product.
- Optionally replace `public/favicon.ico` with a true multi-size ICO using a dedicated tool (e.g. `png-to-ico`).

## Offline Todo Sync

Builds on the PWA service worker to make todo reads and writes survive going offline, then auto-reconcile with the backend on reconnect — without creating duplicate rows.

### Behavior

- **Cached reads**: The TanStack Query client runs with `networkMode: "offlineFirst"`, `gcTime: 24h`, and IndexedDB persistence via `PersistQueryClientProvider`. Previously loaded todos paint instantly from the persisted cache on reload, even while offline.
- **Queued offline writes**: Mutations use `networkMode: "online"`, so create/update/delete operations issued while offline are **paused** (not failed) and persisted to IndexedDB. The sync status indicator shows `Offline · N queued changes` while writes wait for connectivity.
- **Idempotent replay**: Each mutation carries a stable `crypto.randomUUID()` `Idempotency-Key` generated at call time. On reconnect, `resumePausedMutations()` replays the queue. The backend `idempotency_keys` table returns the stored response for any key already processed, so a duplicate replay never creates a second row.
- **Auth-expired replay**: If a session expires while offline, replayed mutations receive a 401/403. `useTodoReplayErrors` (in `todos.hooks.ts`) surfaces these with a user-visible message ("Your session expired. Sign in again to sync your queued changes.") rather than silently dropping them.
- **Mutation defaults registration**: `registerTodosMutationDefaults` is called synchronously in `QueryProvider` and again in the `onSuccess` callback of `PersistQueryClientProvider`, ensuring rehydrated paused mutations have their `mutationFn` and lifecycle callbacks restored before `resumePausedMutations()` runs.

### Manual Verification — Offline Todo Sync

Prerequisites: a live backend plus a production web build (see the PWA "Manual Test Checklist → Prerequisites" above). Then:

1. **Load todos online** — Start the backend and the production web build. Navigate to the todos page. Confirm todos load and appear in the list.
2. **Go offline** — DevTools → **Network** → **Offline**. Confirm the sync indicator shows `Offline`.
3. **Navigate cached pages** — While offline, navigate away and back to the todos page. Confirm previously loaded todos still render from cache (no blank/error state).
4. **Create/edit/delete offline** — While offline, add a new todo, toggle an existing one, and delete one. Confirm the UI updates immediately (optimistic). Confirm the indicator shows `Offline · N queued changes`.
5. **Reload offline** — Hard-reload the page while still offline. Confirm cached todos are still visible and the queued-changes count is preserved (mutations rehydrate from IndexedDB).
6. **Reconnect and auto-sync** — Restore network (DevTools → Network → **No throttling**). Confirm the indicator briefly shows `Syncing N changes`, then `Back online`. Confirm the todos list reconciles with server data (optimistic ids replaced by server ids).
7. **Duplicate-safety / idempotency check** — Simulate a lost response: create a todo offline, go online briefly so the write fires but drop/block the response (e.g. via DevTools request blocking after the request leaves the client), then replay. Confirm only **one** todo row appears in the backend database — not two.
8. **Typecheck and lint** — Run `pnpm --filter @repo/web typecheck` and `pnpm --filter @repo/web lint`; both must pass with no errors.

### OFS-4 — Files Changed

| File                                                            | Change                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/features/pwa/components/network-status-indicator.tsx` | Extended with queued/syncing count from TanStack mutation state; defers the "Back online" flash until queued replay drains |
| `apps/web/app/layout.tsx`                                       | Mounts `NetworkStatusIndicator` in the existing provider tree so it renders on every route                                 |
| `apps/web/README.md`                                            | Added Offline Todo Sync section with behavior notes and verification checklist                                             |

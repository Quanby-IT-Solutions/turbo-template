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

# Vercel Deployment Guide

This guide explains how to deploy the Qhealth turborepo to Vercel.

## Overview

This monorepo contains multiple applications that can be deployed together to Vercel:
- **Web App** (`apps/web/`): Next.js 16 frontend - **Deployed to Vercel**
- **Backend** (`apps/backend/`): NestJS API server - **Deployed as Vercel Serverless Functions**
- **Mobile** (`apps/mobile/`): Flutter mobile app - Not deployed to Vercel

Both the frontend and backend are deployed together in a single Vercel project, with the backend running as serverless functions accessible at `/api/*` routes.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Fork this repository to your personal GitHub account
3. **Environment Variables**: Prepare the required environment variables (see below)

## Deployment Steps

### 1. Fork the Repository

Fork this repository to your personal GitHub account:
1. Navigate to the repository on GitHub
2. Click the "Fork" button in the top-right corner
3. Select your personal account as the destination

### 2. Connect to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your forked repository from GitHub
4. Select the repository from the list

### 3. Configure the Project

Vercel should automatically detect the configuration from `vercel.json`. Verify the following settings:

#### Framework Preset
- **Framework**: Next.js (should be auto-detected)

#### Build & Development Settings
- **Build Command**: `pnpm turbo run build --filter=@repo/web --filter=@repo/backend` (from vercel.json)
- **Install Command**: `pnpm install --frozen-lockfile` (from vercel.json)
- **Output Directory**: `apps/web/.next` (from vercel.json)
- **Root Directory**: Leave as root (`.`)

### 4. Environment Variables

Add the following environment variables in Vercel:

#### Required for Both Web App and Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth (generate with `openssl rand -base64 32`) | `your-secret-key` |
| `BETTER_AUTH_URL` | Base URL for Better Auth | `https://your-domain.vercel.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Public auth URL for client | `https://your-domain.vercel.app` |

#### Optional Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `PORT` | Port for backend (default: 3000) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

### 5. Deploy

1. Click "Deploy" to start the deployment
2. Vercel will:
   - Install dependencies using pnpm
   - Build both the web app and backend using Turborepo
   - Deploy the Next.js app as the frontend
   - Deploy the NestJS backend as serverless functions at `/api/*`

### 6. Post-Deployment

After successful deployment:
1. Set up your database (run migrations)
2. Test the application and API endpoints
3. Configure custom domains (optional)

## Database Setup

Since Vercel is a serverless platform, you'll need a hosted PostgreSQL database. Options include:

- **Vercel Postgres**: Integrated PostgreSQL from Vercel
- **Supabase**: Free tier available with PostgreSQL
- **Railway**: PostgreSQL hosting
- **Neon**: Serverless PostgreSQL

### Running Migrations

After setting up your database, run migrations:

```bash
# Locally with your production database URL
POSTGRES_URL="your-production-db-url" pnpm db:migrate
```

## Backend API Access

The NestJS backend is deployed as Vercel serverless functions and accessible at:
- **API Endpoint**: `https://your-domain.vercel.app/api/*`
- **API Documentation**: `https://your-domain.vercel.app/api/docs`

All API routes from the NestJS backend are automatically proxied through the `/api` path.

## Turborepo Benefits

This monorepo uses Turborepo for optimal build performance:

- ✅ **Incremental Builds**: Only rebuilds what changed
- ✅ **Remote Caching**: Share build cache across team (optional)
- ✅ **Parallel Execution**: Builds dependencies in parallel
- ✅ **Task Pipeline**: Ensures correct build order

## Troubleshooting

### Build Failures

If the build fails, check:
1. All environment variables are set correctly
2. The database URL is accessible from Vercel
3. Build logs in Vercel dashboard for specific errors

### TypeScript Errors

The Next.js config has `typescript.ignoreBuildErrors: true` to allow deployment despite type errors. For production, consider fixing type errors:

```bash
pnpm typecheck
```

### Package Installation Issues

If pnpm installation fails:
1. Ensure `pnpm-lock.yaml` is committed
2. Check that all workspace dependencies are correctly linked
3. Verify Node.js version compatibility (≥22.20.0)

### WASM/WebAssembly Issues

The BiosenseSignal SDK uses WebAssembly. Ensure:
1. SDK files are in the correct location (`apps/web/public/`)
2. Headers are correctly configured in `next.config.ts`
3. WASM files are served with correct MIME types

## Continuous Deployment

Once configured, Vercel automatically deploys:
- **Production**: Deployments from your default branch (main/master)
- **Preview**: Deployments from pull requests and other branches

## Custom Domains

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed by Vercel

## Monitoring

Monitor your application using:
- **Vercel Analytics**: Built-in analytics
- **Vercel Logs**: Real-time logs and errors
- **Speed Insights**: Performance metrics

## Support

For issues specific to:
- **Vercel Platform**: [Vercel Documentation](https://vercel.com/docs)
- **Turborepo**: [Turborepo Documentation](https://turbo.build/repo/docs)
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)

---

**Note**: This repository is configured for optimal Vercel deployment with Turborepo. The configuration ensures fast builds and efficient deployments.

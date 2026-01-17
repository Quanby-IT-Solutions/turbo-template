# Pre-Deployment Checklist

Use this checklist before deploying to Vercel to ensure everything is configured correctly.

## Repository Setup

- [ ] Repository has been forked to your personal GitHub account
- [ ] Fork is up to date with the original repository
- [ ] All dependencies are listed in `package.json` files
- [ ] `pnpm-lock.yaml` is present and committed

## Vercel Configuration Files

- [x] `vercel.json` exists at repository root
- [x] `.vercelignore` exists to exclude unnecessary files
- [x] Build command points to web app: `pnpm turbo run build --filter=@repo/web`
- [x] Install command uses pnpm: `pnpm install --frozen-lockfile`
- [x] Output directory is set to: `apps/web/.next`

## Turborepo Configuration

- [x] `turbo.json` has Vercel environment variables in `globalPassThroughEnv`
- [x] `turbo.json` includes proper build outputs for Next.js
- [x] Web app has its own `turbo.json` with Next.js outputs
- [x] Build dependencies are correctly defined

## Environment Variables

Prepare these before importing to Vercel:

- [ ] `POSTGRES_URL` - PostgreSQL database connection string
- [ ] `BETTER_AUTH_SECRET` - Generated with `openssl rand -base64 32`
- [ ] `BETTER_AUTH_URL` - Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- [ ] `NEXT_PUBLIC_BETTER_AUTH_URL` - Same as BETTER_AUTH_URL for client-side

## Database Setup

- [ ] PostgreSQL database provisioned (Vercel Postgres, Supabase, Railway, or Neon)
- [ ] Database connection string is ready
- [ ] Database allows connections from Vercel
- [ ] SSL configuration is correct (if required)

## Next.js Configuration

- [x] `next.config.ts` is properly configured
- [x] WebAssembly support is enabled (for BiosenseSignal SDK)
- [x] Environment variables are loaded correctly
- [x] Output mode is compatible with Vercel (not standalone)

## Dependencies

- [x] All workspace dependencies use `workspace:*` protocol
- [x] No circular dependencies exist
- [x] Shared packages (`@repo/*`) are properly linked

## Git Configuration

- [ ] `.gitignore` excludes build artifacts
- [ ] `.gitignore` excludes `.env` files
- [ ] `.vercel` directory is in `.gitignore` (already present)
- [ ] No secrets are committed to the repository

## Pre-Deploy Testing (Optional but Recommended)

Local testing to verify the build works:

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Test the build command (same as Vercel will use)
pnpm turbo run build --filter=@repo/web

# Check for build errors
# The build should complete successfully
```

## Documentation

- [x] `QUICK_START.md` provides easy deployment steps
- [x] `VERCEL_DEPLOYMENT.md` has comprehensive deployment guide
- [x] `README.md` links to deployment documentation
- [x] `.env.vercel.example` shows required environment variables

## Post-Import Checklist

After importing to Vercel:

- [ ] Framework preset shows "Next.js"
- [ ] Build command is correct
- [ ] Install command is correct
- [ ] Output directory is correct
- [ ] All environment variables are added
- [ ] Environment variables are added for Production environment
- [ ] (Optional) Preview and Development environments configured

## First Deployment

- [ ] Click "Deploy" button
- [ ] Monitor build logs for errors
- [ ] Build completes successfully
- [ ] Application is accessible at Vercel URL
- [ ] Database connection works
- [ ] Authentication flow works

## Database Migrations

After first successful deployment:

```bash
# Run migrations using production database
POSTGRES_URL="your-production-db-url" pnpm db:migrate

# Or push schema directly
POSTGRES_URL="your-production-db-url" pnpm db:push
```

## Post-Deployment Verification

- [ ] Homepage loads successfully
- [ ] Authentication pages work
- [ ] Database queries execute
- [ ] No console errors in browser
- [ ] SSL certificate is active (https)
- [ ] Environment-specific features work

## Optional Enhancements

- [ ] Add custom domain
- [ ] Enable Vercel Analytics
- [ ] Set up monitoring alerts
- [ ] Configure preview deployments
- [ ] Enable automatic branch deployments
- [ ] Set up staging environment

## Backend Deployment (Separate)

Remember: The NestJS backend is NOT deployed to Vercel. Deploy it separately:

- [ ] Backend deployed to Railway/Render/Heroku
- [ ] Backend URL added as `NEXT_PUBLIC_API_URL` in Vercel
- [ ] Backend environment variables configured
- [ ] CORS configured to allow Vercel domain

## Troubleshooting Resources

If issues occur:
- Check build logs in Vercel dashboard
- Review [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) troubleshooting section
- Verify environment variables are correct
- Ensure database is accessible from Vercel
- Check Next.js build locally first

---

## Summary

This checklist ensures your turborepo is properly configured for Vercel deployment. Most configuration is already complete - you mainly need to:

1. ✅ Fork the repository
2. ✅ Set up a database
3. ✅ Add environment variables in Vercel
4. ✅ Deploy!

The repository is pre-configured with optimal settings for Vercel and Turborepo. 🚀

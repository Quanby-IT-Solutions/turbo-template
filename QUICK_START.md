# Quick Start: Fork and Deploy to Vercel

This is a quick reference guide for forking this repository and deploying to Vercel.

## Step-by-Step Instructions

### 1. Fork the Repository

1. Visit the repository on GitHub
2. Click the **"Fork"** button (top-right corner)
3. Select your personal account as the destination
4. Wait for the fork to complete

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your forked repository
4. Click **"Import"**

### 3. Configure Project Settings

Vercel will auto-detect the configuration from `vercel.json`. Verify these settings:

**Framework Preset:** Next.js (auto-detected)  
**Root Directory:** `.` (repository root)  
**Build Command:** `pnpm turbo run build --filter=@repo/web` (from vercel.json)  
**Install Command:** `pnpm install --frozen-lockfile` (from vercel.json)  
**Output Directory:** `apps/web/.next` (from vercel.json)

### 4. Add Environment Variables

Click **"Environment Variables"** and add the following:

#### Required Variables

```
POSTGRES_URL=postgresql://user:pass@host:5432/dbname
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-app-name.vercel.app
```

#### Generate Auth Secret

```bash
openssl rand -base64 32
```

#### Database Options

You need a PostgreSQL database. Choose one:
- **Vercel Postgres** (recommended for Vercel)
- **Supabase** (free tier available)
- **Railway** or **Neon** (serverless options)

### 5. Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (~3-5 minutes)
3. Your app will be live at `https://your-app-name.vercel.app`

### 6. Run Database Migrations

After deployment, run migrations to set up your database:

```bash
# Clone your forked repository locally
git clone https://github.com/YOUR-USERNAME/Qhealth.git
cd Qhealth

# Install dependencies
pnpm install

# Run migrations (use your production database URL)
POSTGRES_URL="your-production-db-url" pnpm db:migrate
```

## Continuous Deployment

Once configured, Vercel automatically deploys:
- **Production:** Commits to your main/master branch
- **Preview:** Pull requests and other branches

## Next Steps

- ✅ Set up a custom domain (optional)
- ✅ Enable Vercel Analytics
- ✅ Configure the backend separately (see VERCEL_DEPLOYMENT.md)
- ✅ Set up monitoring and alerts

## Troubleshooting

### Build Fails

Check:
- All environment variables are set
- Database URL is accessible
- Check build logs in Vercel dashboard

### Database Connection Issues

- Ensure your database allows connections from Vercel IPs
- Check that the `POSTGRES_URL` format is correct
- Verify SSL settings if required

### Need Help?

- 📖 [Complete Deployment Guide](./VERCEL_DEPLOYMENT.md)
- 🔧 [Vercel Documentation](https://vercel.com/docs)
- 💬 [Turborepo Documentation](https://turbo.build/repo/docs)

---

**That's it!** Your turborepo is now deployed to Vercel with automatic deployments on every push.

# Production Deployment Guide

This guide covers deploying the Cybersecurity Awareness Training SaaS to production using Vercel (frontend) and Render (backend).

## Architecture

- **Frontend**: Next.js app deployed to Vercel
- **Backend**: Node.js/Express API deployed to Render
- **Database**: PostgreSQL on Render
- **CI/CD**: GitHub Actions for testing

## Prerequisites

1. GitHub account with this repository
2. [Vercel account](https://vercel.com/signup) (free tier available)
3. [Render account](https://render.com/signup) (free tier available)

## Backend Deployment (Render)

### 1. Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create:
   - PostgreSQL database (`csat-db`)
   - Web service (`csat-api`)

### 2. Configure Environment Variables

Render will automatically set most variables from `render.yaml`. Verify these in your service settings:

- `NODE_ENV` = `production`
- `PORT` = `4000` (auto-set by Render)
- `DATABASE_URL` = (auto-linked from database)
- `JWT_SECRET` = (auto-generated)
- `FRONTEND_URL` = (update after Vercel deployment)

### 3. Run Database Migrations

After the database is created, run migrations using Render Shell:

1. Go to your `csat-api` service
2. Click **Shell** tab
3. Run: `npm run migrate`

### 4. (Optional) Seed Demo Data

In the Render Shell:
```bash
npm run seed
```

### 5. Get Your Backend URL

Your API will be available at: `https://csat-api.onrender.com`

## Frontend Deployment (Vercel)

### 1. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2. Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_API_BASE=https://csat-api.onrender.com
```

Replace `csat-api.onrender.com` with your actual Render backend URL.

### 3. Deploy

Click **Deploy** and wait for the build to complete.

### 4. Update Backend CORS

After deployment, update the `FRONTEND_URL` environment variable in Render:

1. Go to Render dashboard → `csat-api` service
2. Environment tab
3. Update `FRONTEND_URL` to your Vercel URL (e.g., `https://your-app.vercel.app`)
4. Save and redeploy

## Post-Deployment Setup

### 1. Test Authentication

Visit your Vercel URL and test:
- Login page: `/auth/login`
- Request magic link with a test email
- Check Render logs for email output (production will need real email service)

### 2. Verify API Health

Check backend health:
```bash
curl https://csat-api.onrender.com/
```

### 3. Configure Custom Domains (Optional)

**Vercel**:
- Project Settings → Domains → Add custom domain

**Render**:
- Service Settings → Custom Domain → Add domain

## Environment Variables Reference

### Backend (Render)

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `NODE_ENV` | `production` | Yes | Set to production mode |
| `PORT` | `4000` | Yes | Usually auto-set by Render |
| `DATABASE_URL` | Auto-linked | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Auto-generated | Yes | Secret for JWT signing |
| `FRONTEND_URL` | Your Vercel URL | Yes | For CORS configuration |
| `SMTP_HOST` | Your SMTP host | No | For production emails (future) |
| `SMTP_PORT` | `587` | No | SMTP port |
| `SMTP_USER` | Your SMTP user | No | Email sender account |
| `SMTP_PASS` | Your SMTP password | No | Email password |
| `STRIPE_SECRET_KEY` | Your Stripe key | No | For billing (future) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | No | For billing webhooks (future) |

### Frontend (Vercel)

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `NEXT_PUBLIC_API_BASE` | Backend URL | Yes | e.g., `https://csat-api.onrender.com` |

## Monitoring & Logs

### Render
- **Logs**: Dashboard → Service → Logs tab
- **Metrics**: Dashboard → Service → Metrics tab
- **Shell**: Dashboard → Service → Shell tab (for debugging)

### Vercel
- **Deployments**: Project → Deployments (see build logs)
- **Functions**: Project → Functions (serverless function logs)
- **Analytics**: Project → Analytics (page views, performance)

## Troubleshooting

### Backend won't start
1. Check Render logs for errors
2. Verify `DATABASE_URL` is connected
3. Ensure migrations ran successfully: `npm run migrate` in Shell

### Frontend can't connect to backend
1. Verify `NEXT_PUBLIC_API_BASE` is correct in Vercel
2. Check backend CORS allows frontend URL
3. Verify backend is healthy: `curl https://your-api.onrender.com/`

### Database connection errors
1. Verify database is running in Render dashboard
2. Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
3. Run migrations again if tables are missing

### 401 Unauthorized errors
1. Verify JWT_SECRET is set in backend
2. Check token expiration (default: 1 hour)
3. Test login flow to get fresh token

## Cost Estimates

### Free Tier (Development/Testing)
- **Render**: Free tier includes 750 hours/month
- **Vercel**: Unlimited for personal projects
- **Total**: $0/month

### Starter Tier (Production)
- **Render Web Service**: $7/month (starter plan)
- **Render PostgreSQL**: $7/month (starter plan, 1GB storage)
- **Vercel Pro** (optional): $20/month (custom domains, analytics)
- **Total**: ~$14-34/month

## Next Steps

After deployment, consider:

1. **Email Service**: Configure SMTP or AWS SES for production emails
2. **Billing**: Integrate Stripe for subscription payments
3. **Monitoring**: Set up error tracking (Sentry, LogRocket)
4. **Backups**: Configure database backups on Render
5. **SSL**: Enabled by default on both platforms
6. **CDN**: Vercel includes global CDN for frontend

## Security Checklist

- [ ] Use strong `JWT_SECRET` (auto-generated by Render)
- [ ] Enable HTTPS only (default on Vercel/Render)
- [ ] Set secure CORS origins (FRONTEND_URL)
- [ ] Use environment variables for all secrets
- [ ] Enable database backups on Render
- [ ] Set up rate limiting (already implemented)
- [ ] Review and update dependencies regularly
- [ ] Enable Vercel Web Application Firewall (WAF)

## CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on every push
2. Vercel auto-deploys on push to `main`
3. Render auto-deploys on push to `main`

To disable auto-deploy:
- **Vercel**: Project Settings → Git → disable auto-deploy
- **Render**: Service Settings → Build & Deploy → disable auto-deploy

## Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Issues**: Create an issue in this repository

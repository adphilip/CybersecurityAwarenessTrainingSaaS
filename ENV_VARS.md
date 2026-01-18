# Environment Variables Documentation

This document lists all environment variables required for the Cybersecurity Awareness Training SaaS platform.

## Backend (Node.js/Express API)

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` | ✅ Yes |
| `JWT_SECRET` | Secret key for signing JWT tokens | `your-super-secret-jwt-key-min-32-chars` | ✅ Yes |
| `FRONTEND_URL` | URL of the frontend application (for CORS and magic links) | `https://your-app.vercel.app` | ✅ Yes |

### Optional Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Port number for the API server | `4000` | No |
| `NODE_ENV` | Environment mode | `development` | No |

### Email Configuration (SMTP)

Required for sending magic link authentication emails and phishing simulation emails.

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` or `email-smtp.us-east-1.amazonaws.com` | For production |
| `SMTP_PORT` | SMTP server port | `587` (TLS) or `465` (SSL) | For production |
| `SMTP_SECURE` | Use SSL/TLS | `true` or `false` | For production |
| `SMTP_USER` | SMTP authentication username | `your-email@gmail.com` or AWS SES access key | For production |
| `SMTP_PASS` | SMTP authentication password | `your-app-password` or AWS SES secret key | For production |
| `EMAIL_FROM` | Sender email address | `noreply@yourdomain.com` | For production |

#### Email Provider Examples

**Gmail (for development/testing only)**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**AWS SES (recommended for production)**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

**SendGrid**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Stripe Integration (Future)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_live_...` | For billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` | For billing |

---

## Frontend (Next.js)

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_BASE` | Base URL of the backend API | `https://csat-api.onrender.com` | ✅ Yes |

> **Note**: All frontend environment variables must be prefixed with `NEXT_PUBLIC_` to be exposed to the browser.

---

## Environment-Specific Configuration

### Development (.env.local)

```env
# Backend
DATABASE_URL=postgresql://csat_user:csat_password@localhost:5432/csat_mvp
JWT_SECRET=dev-secret-change-in-prod
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=development

# Email (mock in development)
SMTP_HOST=localhost
SMTP_PORT=587
EMAIL_FROM=dev@localhost
```

Create `web/.env.local` for frontend:
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### Production

#### Backend (Render/Railway/Heroku)

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=generate-a-random-32-char-string-use-openssl-rand-hex-32
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
PORT=4000

# Email (production SMTP)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Frontend (Vercel)

Set in Vercel Dashboard → Project Settings → Environment Variables:

```env
NEXT_PUBLIC_API_BASE=https://csat-api.onrender.com
```

---

## Security Best Practices

1. **Never commit `.env` files** - Already included in `.gitignore`
2. **Use strong secrets** - Generate JWT_SECRET with: `openssl rand -hex 32`
3. **Rotate secrets regularly** - Especially after team member changes
4. **Use environment-specific values** - Never reuse production secrets in development
5. **Limit access** - Only give production secrets to necessary team members
6. **Use secret management** - Consider AWS Secrets Manager or HashiCorp Vault for production

---

## Quick Setup Commands

### Generate JWT Secret
```bash
openssl rand -hex 32
```

### Test Database Connection
```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

### Test SMTP Configuration
```bash
# Using Node.js
node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
t.verify((err) => console.log(err ? 'Error: ' + err : 'SMTP OK'));
"
```

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format matches: `postgresql://user:password@host:port/database`
- Check if PostgreSQL is accepting connections
- Verify SSL settings for cloud databases

### Email Sending Issues
- Test SMTP credentials with your email provider
- Check firewall rules allow outbound connections to SMTP port
- Verify `EMAIL_FROM` address is authorized by your SMTP provider
- For Gmail: Enable "Less secure app access" or use App Passwords

### CORS Errors
- Ensure `FRONTEND_URL` matches your actual frontend domain exactly
- Include protocol (`https://` or `http://`)
- No trailing slash in URL

### JWT Authentication Issues
- Ensure `JWT_SECRET` is the same across all backend instances
- Verify secret is at least 32 characters long
- Check token expiry settings (default: 1 hour)

---

## References

- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [AWS SES SMTP Setup](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Render Environment Variables](https://render.com/docs/environment-variables)

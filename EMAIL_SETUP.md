# Production Email Setup Guide

This guide walks you through configuring production email delivery for the Cybersecurity Awareness Training SaaS platform.

## Quick Start

1. Choose an email provider (AWS SES recommended)
2. Get SMTP credentials
3. Add environment variables
4. Verify configuration
5. Test email sending

---

## Supported Email Providers

### 1. AWS SES (Recommended for Production)

**Why AWS SES?**
- Highly reliable and scalable
- Cost-effective ($0.10 per 1,000 emails)
- Built-in deliverability features
- No daily sending limits after verification
- Detailed analytics

**Setup Steps:**

1. **Create AWS Account** (if you don't have one)
   - Go to https://aws.amazon.com/ses/

2. **Verify Email or Domain**
   ```bash
   # Go to: SES Console → Verified Identities
   # Add and verify your sender email or domain
   ```

3. **Request Production Access**
   - By default, SES starts in sandbox mode
   - Go to: Account Dashboard → Request production access
   - Fill out the form (usually approved within 24 hours)

4. **Create SMTP Credentials**
   ```bash
   # Go to: SES Console → SMTP Settings → Create SMTP Credentials
   # Save the SMTP username and password
   ```

5. **Add to `.env`**:
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-ses-smtp-username
   SMTP_PASS=your-ses-smtp-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

6. **Regional Endpoints**:
   - US East (N. Virginia): `email-smtp.us-east-1.amazonaws.com`
   - US West (Oregon): `email-smtp.us-west-2.amazonaws.com`
   - EU (Ireland): `email-smtp.eu-west-1.amazonaws.com`
   - See full list: https://docs.aws.amazon.com/ses/latest/dg/regions.html

---

### 2. SendGrid

**Why SendGrid?**
- Easy to set up
- Generous free tier (100 emails/day forever)
- Good deliverability
- User-friendly dashboard

**Setup Steps:**

1. **Create Account**: https://signup.sendgrid.com/

2. **Create API Key**:
   ```bash
   # Go to: Settings → API Keys → Create API Key
   # Choose "Restricted Access" and enable "Mail Send"
   ```

3. **Verify Sender Identity**:
   ```bash
   # Go to: Settings → Sender Authentication
   # Verify a single sender or authenticate your domain
   ```

4. **Add to `.env`**:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   EMAIL_FROM=noreply@yourdomain.com
   ```

---

### 3. Mailgun

**Why Mailgun?**
- Developer-friendly API
- Good free tier (5,000 emails/month for 3 months)
- Powerful email validation
- Detailed logs and analytics

**Setup Steps:**

1. **Create Account**: https://signup.mailgun.com/

2. **Add Domain**:
   ```bash
   # Go to: Sending → Domains → Add New Domain
   # Follow DNS setup instructions
   ```

3. **Get SMTP Credentials**:
   ```bash
   # Go to: Sending → Domain Settings → SMTP Credentials
   # Create new SMTP credentials
   ```

4. **Add to `.env`**:
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=postmaster@yourdomain.mailgun.org
   SMTP_PASS=your-mailgun-smtp-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

---

### 4. Gmail (Development/Testing Only)

**⚠️ Not Recommended for Production**
- Daily sending limit: 500 emails/day
- May be flagged as spam
- Account can be suspended for bulk sending

**Setup for Testing:**

1. **Enable 2-Factor Authentication** on your Google account

2. **Generate App Password**:
   ```bash
   # Go to: Google Account → Security → 2-Step Verification → App passwords
   # Generate password for "Mail" application
   ```

3. **Add to `.env`**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

---

## Domain Authentication (SPF, DKIM, DMARC)

To improve deliverability and avoid spam filters, configure these DNS records:

### SPF Record
Specifies which mail servers can send email on behalf of your domain.

```dns
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
```
*(Replace amazonses.com with your provider's SPF include)*

### DKIM Record
Cryptographically signs your emails.

```dns
Type: TXT
Name: your-provider-dkim-selector._domainkey
Value: [provided by your email service]
```

### DMARC Record
Tells receiving servers what to do with emails that fail SPF/DKIM.

```dns
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

---

## Testing Your Configuration

### 1. Check Configuration Status

```bash
curl http://localhost:4000/email/status
```

Expected response:
```json
{
  "configured": true,
  "provider": "aws-ses",
  "host": "email-smtp.us-east-1.amazonaws.com",
  "port": "587",
  "from": "noreply@yourdomain.com"
}
```

### 2. Verify SMTP Connection

```bash
curl -X POST http://localhost:4000/email/verify
```

Expected response:
```json
{
  "success": true,
  "provider": "aws-ses"
}
```

### 3. Send Test Email

```bash
node send-test-email.js your-email@example.com
```

### 4. Test Magic Link Authentication

1. Go to http://localhost:3000/auth/login
2. Enter your email
3. Check your inbox for the magic link
4. Click the link to log in

---

## Environment Variables Reference

```env
# Required for production
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Optional
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

---

## Monitoring and Troubleshooting

### Check Logs

The email service logs all send attempts:

```bash
# Backend logs will show:
[email] Configured with aws-ses (email-smtp.us-east-1.amazonaws.com:587)
[email] Sent to user@example.com - MessageID: 01234567-89ab-cdef-0123-456789abcdef
```

### Common Issues

#### 1. Authentication Failed
```
Error: Invalid login: 535 Authentication credentials invalid
```
**Solution**: Double-check SMTP_USER and SMTP_PASS

#### 2. Connection Timeout
```
Error: Connection timeout
```
**Solutions**:
- Check firewall/security group allows outbound on port 587
- Verify SMTP_HOST is correct
- Try port 465 with SMTP_SECURE=true

#### 3. Emails Going to Spam
**Solutions**:
- Set up SPF, DKIM, and DMARC records
- Use a verified sender domain
- Avoid spam trigger words in subject lines
- Maintain good sender reputation

#### 4. AWS SES Sandbox Restrictions
```
Error: MessageRejected: Email address is not verified
```
**Solution**: Request production access in AWS SES console

#### 5. SendGrid API Key Not Working
**Solution**: Ensure you're using "apikey" as SMTP_USER, not your username

---

## Production Checklist

- [ ] Email provider account created
- [ ] Domain/sender verified
- [ ] SMTP credentials generated
- [ ] Environment variables configured
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS
- [ ] SMTP connection verified (`/email/verify`)
- [ ] Test email sent successfully
- [ ] Magic link authentication tested
- [ ] Phishing template email tested
- [ ] Monitor email logs for 24 hours

---

## Cost Estimates

### AWS SES
- First 62,000 emails/month: Free (when sent from EC2)
- After that: $0.10 per 1,000 emails
- Example: 100,000 emails/month = ~$10/month

### SendGrid
- Free: 100 emails/day
- Essentials ($19.95/month): 50,000 emails/month
- Pro ($89.95/month): 100,000 emails/month

### Mailgun
- Free trial: 5,000 emails/month for 3 months
- Foundation ($35/month): 50,000 emails/month
- Growth ($80/month): 100,000 emails/month

---

## Security Best Practices

1. **Use Environment Variables**: Never commit SMTP credentials to git
2. **Rotate Credentials**: Change SMTP passwords every 90 days
3. **Limit Access**: Use IAM roles/restricted API keys
4. **Monitor Sending**: Set up alerts for unusual sending patterns
5. **Use TLS**: Always use SMTP_PORT=587 with STARTTLS
6. **Verify Recipients**: Don't send to unverified emails in production

---

## Support

- **AWS SES**: https://docs.aws.amazon.com/ses/
- **SendGrid**: https://docs.sendgrid.com/
- **Mailgun**: https://documentation.mailgun.com/
- **Nodemailer**: https://nodemailer.com/about/

For issues with this application, check the logs or open an issue on GitHub.

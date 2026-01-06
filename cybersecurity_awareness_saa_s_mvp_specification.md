# Cybersecurity Awareness Training SaaS (Solo Developer)

## 1. Product Overview
**One-line pitch:**
> A 5-minute-per-month cybersecurity awareness platform for small companies, focused on phishing simulations and audit-ready reports.

**Target customers:**
- SMEs with 10–200 employees
- No dedicated security team
- Regulated or client-facing industries

**Buyer personas:** IT manager, operations manager, CEO

---

## 2. MVP Rules (Strict)
- Web app only (no mobile app)
- No videos
- No complex AI
- No integrations (Slack, Teams, etc.)
- Email-based workflows only

Goal: first sellable version in ≤ 90 days.

---

## 3. User Roles
### Admin (Company)
- Creates company account
- Uploads employees
- Enables/disables campaigns
- Views dashboard & reports
- Pays subscription

### Employee
- Receives phishing & quiz emails
- Completes training via link
- No login, no dashboard

---

## 4. Core MVP Features
1. Company setup & employee import (CSV)
2. Monthly phishing simulation
3. 3-question micro-quiz
4. Fully automated monthly campaigns
5. Admin dashboard + PDF audit report

---

## 5. Database Schema (PostgreSQL)

### companies
- id (uuid, pk)
- name
- created_at
- campaign_enabled

### admins
- id
- company_id (fk)
- email
- created_at

### employees
- id
- company_id (fk)
- email
- active
- created_at

### campaigns
- id
- company_id (fk)
- month (date)
- phishing_template_id
- quiz_id
- status (scheduled | active | closed)
- started_at
- closed_at

### phishing_templates
- id
- name
- subject
- body_html
- created_at

### phishing_events
- id
- campaign_id
- employee_id
- event_type (sent | opened | clicked)
- event_time

### quizzes
- id
- title
- created_at

### quiz_questions
- id
- quiz_id
- question_text
- options (jsonb)
- correct_option

### quiz_attempts
- id
- quiz_id
- employee_id
- score
- completed_at

### subscriptions
- id
- company_id
- stripe_customer_id
- stripe_subscription_id
- status
- started_at

---

## 6. API Endpoints (REST)

### Auth
- POST /auth/request-link
- POST /auth/verify

### Company & Employees
- GET /company
- POST /employees/import
- GET /employees
- PATCH /employees/{id}/deactivate

### Campaigns
- POST /campaigns
- GET /campaigns
- GET /campaigns/{id}
- POST /campaigns/{id}/start
- POST /campaigns/{id}/close

### Phishing Tracking
- GET /phishing/open/{token}
- GET /phishing/click/{token}

### Quiz
- GET /quiz/{token}
- POST /quiz/{token}/submit

### Metrics & Reports
- GET /metrics/campaign/{id}
- GET /reports/campaign/{id}

### Billing
- POST /billing/checkout
- POST /billing/webhook

---

## 7. Campaign Automation Logic

### Cron Jobs
1. **Campaign Scheduler (daily)** – auto-create monthly campaigns
2. **Campaign Starter (hourly)** – start campaign & send emails
3. **Reminder Engine (daily)** – reminder after 3 days
4. **Campaign Closer (daily)** – close after 30 days & notify admin

### Email Flow
- Day 0: phishing email + quiz invite
- Day 3: reminder (if incomplete)
- Day 30: campaign closed + admin summary

---

## 8. Dashboard Metrics (SQL Logic)

**KPIs:**
- Total employees
- Trained employees
- Training completion %
- Phishing click rate
- Risk level (LOW <5%, MEDIUM 5–15%, HIGH >15%)

Metrics are calculated per campaign and used for dashboard cards and PDF reports.

---

## 9. Security & Compliance
- Email magic links (no passwords)
- JWT expiration: 1 hour
- Campaign tokens expire in 30 days
- HTTPS everywhere
- Rate-limited auth endpoints
- No IP or device tracking

**GDPR:**
- Minimal data (emails only)
- Data retention: 12–24 months
- Company-level data deletion

---

## 10. Deployment Architecture

### Stack
- Frontend: Next.js (Vercel)
- Backend: Node.js (Render / Fly.io / Railway)
- Database: Managed PostgreSQL
- Email: AWS SES or SendGrid
- Files: S3-compatible storage
- Payments: Stripe
- DNS & SSL: Cloudflare

### Environments
- staging
- production

---

## 11. Production Checklist
- SPF / DKIM / DMARC configured
- Email domain warmed up
- Daily DB backups enabled
- Stripe webhooks tested
- Full test campaign executed
- PDF report verified

---

## 12. Pricing (MVP)
- €2–3 per user / month
- Minimum €25 per company / month
- Monthly billing only

---

## 13. Post-MVP (Out of Scope)
- AI-generated phishing
- Integrations (Slack, Teams)
- Multi-language
- Mobile app
- Enterprise SSO

---

## 14. Success Criteria
- Setup < 10 minutes
- Employee training < 5 minutes
- First paying customer
- Zero manual work after setup

---

**Status:** This document defines a complete, sellable MVP ready for development and launch by a solo developer.


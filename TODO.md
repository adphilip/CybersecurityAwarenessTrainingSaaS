# MVP Development Todo List

## Frontend Authentication
- [ ] Create frontend auth pages (login + verify)
- [ ] Add JWT storage and auth context in frontend
- [ ] Protect admin dashboard routes with auth middleware

## Backend Integrations
- [ ] Implement Stripe billing integration (checkout + webhook)
- [ ] Configure production email delivery (SES or SMTP)

## Core Features
- [ ] Complete campaign automation cron logic
- [ ] Build employee phishing email templates
- [ ] Add PDF report generation for campaigns
- [ ] Implement admin UI for campaign management

## Compliance & Deployment
- [ ] Add GDPR data export and deletion endpoints
- [ ] Set up deployment (Vercel frontend + Render backend)
- [ ] Add environment variables documentation for production

---

## Completed
- [x] Backend API scaffold (companies, employees, campaigns, phishing, quiz, metrics, reports)
- [x] PostgreSQL schema with 11 tables
- [x] Docker Compose PostgreSQL setup
- [x] Migrations and seed scripts
- [x] Jest test suite (14 tests passing)
- [x] GitHub Actions CI/CD
- [x] Next.js frontend scaffold
- [x] Magic-link authentication with JWT
- [x] Auth endpoints with rate limiting
- [x] Auth tests and documentation

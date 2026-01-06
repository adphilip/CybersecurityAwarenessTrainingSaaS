# Cybersecurity Awareness Training — MVP Scaffold

This repository contains a minimal Node.js backend scaffold implementing the core data model and basic endpoints derived from the MVP specification.

## Stack
- Node.js + Express
- PostgreSQL (via `pg`)
- Cron orchestration with `node-cron`
- dotenv for configuration

## Features covered
- Company creation
- Employee CSV import
- Campaign create/start
- Phishing open/click tracking (token-based)
- Quiz submission stub
- Metrics per campaign (total employees, clicks)

## Environment variables
- `DATABASE_URL` – PostgreSQL connection string (examples below)
- `PORT` – API port (default 4000)

## NPM scripts
- `npm start` – run API server
- `npm run migrate` – apply `db/init.sql`
- `npm run cron` – run placeholder schedulers

## PostgreSQL Setup

### Option 1: Using Docker (Recommended)

1. Start Docker Desktop on your Mac
2. Run PostgreSQL container:

```bash
docker-compose up -d
```

3. Wait for PostgreSQL to be ready (~10 seconds)
4. Apply migrations:

```bash
npm run migrate
```

5. Start the server:

```bash
npm start
```

To stop PostgreSQL:

```bash
docker-compose down
```

### Option 2: Install PostgreSQL Locally

Update Command Line Tools first:

```bash
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install
```

Then install PostgreSQL:

```bash
brew install postgresql@15
brew services start postgresql@15
createdb csat_mvp
```

Update `.env` with your connection string, then run migrations.
## Quick Start (After PostgreSQL Setup)

1) Install deps (once):
```bash
npm install
```

2) Configure env:
```bash
cp .env.example .env
# edit .env if needed
```

3) Migrate DB:
```bash
npm run migrate
```

4) (Optional) Seed demo data (company, employees, template, quiz, campaign):
```bash
npm run seed
```
Seed values (if you need direct IDs):
- company_id: 11111111-1111-1111-1111-111111111111
- quiz_id: 55555555-5555-5555-5555-555555555555
- campaign_id: 66666666-6666-6666-6666-666666666666

5) Start API:
```bash
npm start
```

6) (Optional) Start cron placeholders:
```bash
npm run cron
```

## Testing the API

```bash
# Health check
curl http://localhost:4000/

# Create a company
curl -X POST http://localhost:4000/company \
	-H "Content-Type: application/json" \
	-d '{"name":"Test Corp","campaign_enabled":true}'

# Import employees (replace <company_id> from previous response)
curl -X POST http://localhost:4000/employees/import \
	-H "Content-Type: application/json" \
	-d '{"company_id":"<company_id>","csv":"email\njohn@test.com\njane@test.com"}'

# Create campaign
curl -X POST http://localhost:4000/campaigns \
	-H "Content-Type: application/json" \
	-d '{"company_id":"<company_id>","month":"2026-01-01"}'

# Start campaign
curl -X POST http://localhost:4000/campaigns/<campaign_id>/start

# Record open / click
curl http://localhost:4000/phishing/open/<token>
curl http://localhost:4000/phishing/click/<token>

# Submit quiz
curl -X POST http://localhost:4000/quiz/<token>/submit \
	-H "Content-Type: application/json" \
	-d '{"quiz_id":"sample","employee_id":"<employee_id>","answers":[]}'

# Metrics
curl http://localhost:4000/metrics/campaign/<campaign_id>

# Report stub
curl http://localhost:4000/reports/campaign/<campaign_id>
```

Notes
- The server uses PostgreSQL and expects `DATABASE_URL` in `.env`.
- Email sending, Stripe billing, and production-ready security are left as integrations to add later.
- Endpoints are basic stubs intended to capture MVP flows; expand business logic and validation before production.

## Endpoint map (per spec)
- Auth (not yet implemented): POST /auth/request-link, POST /auth/verify
- Company & Employees: GET /company, POST /employees/import, GET /employees, PATCH /employees/{id}/deactivate
- Campaigns: POST /campaigns, GET /campaigns, GET /campaigns/{id}, POST /campaigns/{id}/start, POST /campaigns/{id}/close
- Phishing tracking: GET /phishing/open/{token}, GET /phishing/click/{token}
- Quiz: GET /quiz/{token} (stub), POST /quiz/{token}/submit
- Metrics & Reports: GET /metrics/campaign/{id}, GET /reports/campaign/{id}
- Billing: POST /billing/checkout (todo), POST /billing/webhook (todo)

## Cron schedule (placeholders)
- Daily 02:00 – Campaign Scheduler
- Hourly – Campaign Starter
- Daily 02:30 – Reminder Engine
- Daily 02:45 – Campaign Closer

Next steps I can do for you
- Add a minimal Next.js frontend scaffold
- Add Stripe and SES integration stubs
- Implement full campaign automation logic and tests

# System Architecture

## Overview
The Cybersecurity Awareness Training SaaS is built as a full-stack web application with a React-based frontend, Express.js backend, and PostgreSQL database.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend - Next.js"
        A[Demo Page<br/>/demo]
        B[Quiz Page<br/>/quiz/token]
        C[Login Page<br/>/auth/login]
        D[Verify Page<br/>/auth/verify]
        E[Admin Pages<br/>employees, campaigns]
    end

    subgraph "Backend - Express.js API"
        F[Express Server<br/>Port 4000]
        G[Auth Endpoints<br/>/auth/*]
        H[Quiz Endpoints<br/>/quiz/*]
        I[Admin Endpoints<br/>/company, /employees, /campaigns]
        J[Tracking Endpoints<br/>/phishing/*, /metrics/*]
    end

    subgraph "Data Layer"
        K[(PostgreSQL Database<br/>Port 5432)]
        L[Docker Container<br/>csat_postgres]
    end

    subgraph "External Services"
        M[Email Service<br/>Magic Links]
        N[Stripe API<br/>Billing - Future]
    end

    A --> F
    B --> F
    C --> F
    D --> F
    E --> F

    F --> G
    F --> H
    F --> I
    F --> J

    G --> K
    H --> K
    I --> K
    J --> K

    K --> L

    G --> M
    F -.Future.-> N

    style A fill:#667eea
    style B fill:#667eea
    style C fill:#667eea
    style D fill:#667eea
    style E fill:#667eea
    style F fill:#764ba2
    style K fill:#22c55e
    style L fill:#22c55e
```

## System Components

### Frontend (Next.js + React)
- **Technology**: Next.js 14, React, TypeScript
- **Port**: 3000
- **Key Pages**:
  - `/demo` - Landing page for quick quiz access
  - `/quiz/[token]` - Interactive quiz interface
  - `/auth/login` - Admin authentication
  - `/auth/verify` - Magic link verification
  - `/employees` - Employee management (future)
  - `/campaigns` - Campaign management (future)

### Backend (Express.js)
- **Technology**: Node.js, Express.js
- **Port**: 4000
- **Key Features**:
  - RESTful API
  - JWT authentication
  - Rate limiting
  - CORS enabled
  - PostgreSQL connection pooling

### Database (PostgreSQL)
- **Technology**: PostgreSQL 15
- **Port**: 5432
- **Deployment**: Docker container
- **Schema**: 11 tables
  - companies, admins, employees
  - campaigns, phishing_templates, phishing_events
  - quizzes, quiz_questions, quiz_attempts
  - auth_tokens, subscriptions

## End-User Quiz Flow - Sequence Diagram

```mermaid
sequenceDiagram
    actor Employee
    participant Demo as Demo Page<br/>(Frontend)
    participant API as Express API<br/>(Backend)
    participant Quiz as Quiz Page<br/>(Frontend)
    participant DB as PostgreSQL<br/>(Database)

    Employee->>Demo: Visit /demo
    Demo->>Demo: Display landing page

    Employee->>Demo: Click "Start Quiz"
    Demo->>API: POST /generate-quiz-token
    API->>API: Generate random token
    API-->>Demo: Return token & quiz_url
    Demo->>Quiz: Redirect to /quiz/[token]

    Quiz->>API: GET /quiz/:token
    API->>DB: SELECT quiz & questions
    DB-->>API: Return quiz data
    API->>API: Format questions<br/>(hide correct answers)
    API-->>Quiz: Return quiz with questions

    Quiz->>Quiz: Display questions<br/>A/B/C/D options
    Employee->>Quiz: Select answers
    Quiz->>Quiz: Validate all answered

    Employee->>Quiz: Click "Submit Quiz"
    Quiz->>API: POST /quiz/:token/submit<br/>{answers: [{questionId, answer}]}
    
    API->>DB: SELECT correct answers & options
    DB-->>API: Return correct data
    API->>API: Convert letter to text<br/>Compare with correct answer<br/>Calculate score
    API->>DB: INSERT quiz_attempt<br/>(score, timestamp)
    API->>DB: INSERT phishing_event<br/>(quiz_completed)
    API-->>Quiz: Return {score, correct, total, results}

    Quiz->>Quiz: Display results page<br/>Show score & review
    Employee->>Quiz: Review answers<br/>See correct/incorrect
```

## Quiz Scoring Logic Flow

```mermaid
flowchart TD
    A[Receive User Answers<br/>Letter Format: A, B, C, D] --> B[Fetch Quiz Questions<br/>from Database]
    B --> C[Get Correct Answers<br/>Text Format: 'Malicious email']
    C --> D[Get Options Array<br/>['Malicious email', 'Type of fish', ...]]
    
    D --> E{For Each Answer}
    E --> F[Convert Letter to Index<br/>A=0, B=1, C=2, D=3]
    F --> G[Get Option Text<br/>options[index]]
    G --> H{Compare:<br/>User Text == Correct Text?}
    
    H -->|Yes| I[Mark as Correct<br/>score++]
    H -->|No| J[Mark as Incorrect]
    
    I --> K[Find Correct Letter<br/>for Response]
    J --> K
    K --> L{More Answers?}
    
    L -->|Yes| E
    L -->|No| M[Calculate Percentage<br/>score/total × 100]
    M --> N[Save to Database]
    N --> O[Return Results to User]
```

## Data Flow

### Quiz Submission Data Flow
1. **Frontend** → Sends answers as `[{questionId: "uuid", answer: "A"}]`
2. **Backend** → Fetches questions with `correct_option` (text) and `options` (array)
3. **Backend** → Converts letter answer to option text using array index
4. **Backend** → Compares user's option text with correct_option text
5. **Backend** → Calculates score and formats response
6. **Backend** → Stores result in `quiz_attempts` table
7. **Frontend** → Displays score and detailed review

## Authentication Flow

```mermaid
sequenceDiagram
    actor Admin
    participant Login as Login Page
    participant API as API Server
    participant DB as Database
    participant Verify as Verify Page

    rect rgb(200, 220, 250)
        Note over Admin,Verify: Password-based Login
        Admin->>Login: Enter email & password
        Login->>API: POST /auth/login
        API->>DB: Verify credentials<br/>(bcrypt hash)
        DB-->>API: Admin record
        API->>API: Generate JWT
        API-->>Login: Return JWT token
        Login->>Login: Store token<br/>(localStorage)
        Login->>Admin: Redirect to dashboard
    end

    rect rgb(250, 220, 200)
        Note over Admin,Verify: Magic Link Login (Alternative)
        Admin->>Login: Request magic link
        Login->>API: POST /auth/request-link
        API->>DB: Create auth_token
        API->>Admin: Send email with link
        Admin->>Verify: Click magic link<br/>/auth/verify?token=...
        Verify->>API: POST /auth/verify
        API->>DB: Validate token<br/>(not expired, not used)
        DB-->>API: Token valid
        API->>DB: Mark token as used
        API->>API: Generate JWT
        API-->>Verify: Return JWT token
        Verify->>Verify: Store token
        Verify->>Admin: Redirect to dashboard
    end
```

## Database Schema Overview

```mermaid
erDiagram
    COMPANIES ||--o{ ADMINS : has
    COMPANIES ||--o{ EMPLOYEES : has
    COMPANIES ||--o{ CAMPAIGNS : runs
    COMPANIES ||--o{ SUBSCRIPTIONS : has
    
    CAMPAIGNS }o--|| PHISHING_TEMPLATES : uses
    CAMPAIGNS }o--|| QUIZZES : includes
    CAMPAIGNS ||--o{ PHISHING_EVENTS : tracks
    
    QUIZZES ||--o{ QUIZ_QUESTIONS : contains
    QUIZZES ||--o{ QUIZ_ATTEMPTS : records
    
    EMPLOYEES ||--o{ QUIZ_ATTEMPTS : takes
    EMPLOYEES ||--o{ PHISHING_EVENTS : generates
    
    ADMINS ||--o{ AUTH_TOKENS : creates

    COMPANIES {
        uuid id PK
        text name
        boolean campaign_enabled
        timestamptz created_at
    }

    EMPLOYEES {
        uuid id PK
        uuid company_id FK
        text email
        boolean active
        timestamptz created_at
    }

    QUIZZES {
        uuid id PK
        text title
        timestamptz created_at
    }

    QUIZ_QUESTIONS {
        uuid id PK
        uuid quiz_id FK
        text question_text
        jsonb options
        text correct_option
    }

    QUIZ_ATTEMPTS {
        uuid id PK
        uuid quiz_id FK
        uuid employee_id FK
        int score
        timestamptz completed_at
    }

    CAMPAIGNS {
        uuid id PK
        uuid company_id FK
        date month
        uuid phishing_template_id FK
        uuid quiz_id FK
        text status
        timestamptz started_at
        timestamptz closed_at
    }

    PHISHING_EVENTS {
        uuid id PK
        uuid campaign_id FK
        uuid employee_id FK
        text event_type
        timestamptz event_time
    }
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14.2.35
- **Language**: TypeScript
- **Styling**: CSS-in-JS (inline styles)
- **State Management**: React Hooks (useState, useEffect)
- **Routing**: Next.js App Router

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript
- **Authentication**: JWT + bcrypt
- **Database Client**: pg (node-postgres)
- **Security**: express-rate-limit, CORS

### Database
- **DBMS**: PostgreSQL 15
- **Container**: Docker (postgres:15-alpine)
- **ORM**: Raw SQL queries (no ORM)
- **Extensions**: pgcrypto (for UUID generation and password hashing)

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Jest
- **Version Control**: Git

## API Endpoints

### Authentication
- `POST /auth/login` - Email/password authentication
- `POST /auth/request-link` - Request magic link
- `POST /auth/verify` - Verify magic link token

### Quiz System
- `GET /quiz/:token` - Fetch quiz questions
- `POST /quiz/:token/submit` - Submit quiz answers
- `POST /generate-quiz-token` - Generate quiz access token

### Admin - Companies
- `POST /company` - Create company
- `GET /company` - Get company details

### Admin - Employees
- `POST /employees/import` - Bulk import via CSV
- `GET /employees` - List employees
- `PATCH /employees/:id/deactivate` - Deactivate employee

### Admin - Campaigns
- `POST /campaigns` - Create campaign
- `GET /campaigns` - List campaigns
- `GET /campaigns/:id` - Get campaign details
- `POST /campaigns/:id/start` - Start campaign
- `POST /campaigns/:id/close` - Close campaign

### Tracking & Analytics
- `GET /phishing/open/:token` - Track email opens
- `GET /phishing/click/:token` - Track link clicks
- `GET /metrics/campaign/:id` - Get campaign metrics
- `GET /reports/campaign/:id` - Get campaign report

## Security Features

1. **Authentication**
   - JWT-based token authentication
   - bcrypt password hashing
   - Magic link email verification
   - Token expiration and single-use enforcement

2. **Rate Limiting**
   - Auth endpoints: 5 requests per 15 minutes
   - Prevents brute force attacks

3. **Data Protection**
   - CORS enabled for controlled access
   - SQL injection prevention (parameterized queries)
   - Password hashes never exposed in API responses
   - Correct quiz answers hidden from client

4. **Input Validation**
   - Required field validation
   - Email format validation
   - Token length validation

## Deployment Architecture (Future)

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Vercel"
            A[Next.js Frontend<br/>CDN Distribution]
        end
        
        subgraph "Render / Heroku"
            B[Express.js Backend<br/>Node.js Runtime]
        end
        
        subgraph "Database Service"
            C[(PostgreSQL<br/>Managed DB)]
        end
        
        subgraph "Email Service"
            D[AWS SES / SendGrid]
        end
        
        subgraph "Payment Service"
            E[Stripe API]
        end
    end
    
    subgraph "Users"
        F[Admin Users]
        G[Employee Users]
    end
    
    F --> A
    G --> A
    A --> B
    B --> C
    B --> D
    B --> E
```

## Performance Considerations

1. **Database Connection Pooling**
   - PostgreSQL connection pool for efficient resource usage
   - Prevents connection exhaustion

2. **Frontend Optimization**
   - Next.js automatic code splitting
   - Server-side rendering for initial load
   - Static asset optimization

3. **API Response Size**
   - Pagination for list endpoints (future)
   - Selective field return
   - JSON compression

4. **Caching Strategy** (Future)
   - Redis for session storage
   - CDN caching for static assets
   - Query result caching for reports

## Scalability

### Horizontal Scaling
- Stateless backend allows multiple server instances
- Load balancer distribution (future)
- Database read replicas for reporting (future)

### Vertical Scaling
- Increase server resources as needed
- Database performance tuning
- Connection pool size adjustment

## Monitoring & Logging (Future)

- Application performance monitoring (APM)
- Error tracking (Sentry)
- Access logs
- Database query performance monitoring
- User analytics

## Backup & Recovery (Future)

- Automated daily database backups
- Point-in-time recovery capability
- Data retention policies
- Disaster recovery plan

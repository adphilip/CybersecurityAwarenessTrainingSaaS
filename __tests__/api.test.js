const request = require('supertest');
const { app } = require('../app');
const { execSync } = require('node:child_process');
const { Pool } = require('pg');

// Get admin email from seeded data
const testAdminEmail = 'admin@csat.test';

// Ensure migrations + seed before tests
beforeAll(() => {
  execSync('npm run migrate', { stdio: 'inherit' });
  execSync('npm run seed', { stdio: 'inherit' });
});

describe('API smoke tests (from README)', () => {
  const companyId = '11111111-1111-1111-1111-111111111111';
  const campaignId = '66666666-6666-6666-6666-666666666666';
  let jwtToken;

  beforeAll(async () => {
    // Login to get JWT token
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@demo.test', password: 'changeme123' });
    jwtToken = loginRes.body.token;
  });

  test('health check', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('create company', async () => {
    const res = await request(app)
      .post('/company')
      .send({ name: 'Test Corp Jest', campaign_enabled: true });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Test Corp Jest');
  });

  test('list company (first)', async () => {
    const res = await request(app).get('/company');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  test('list employees for seeded company', async () => {
    const res = await request(app)
      .get(`/employees?company_id=${companyId}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('create campaign', async () => {
    const res = await request(app)
      .post('/campaigns')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ company_id: companyId, month: '2026-01-01' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('start campaign (seeded)', async () => {
    const res = await request(app)
      .post(`/campaigns/${campaignId}/start`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('active');
  });

  test('report stub', async () => {
    const res = await request(app)
      .get(`/reports/campaign/${campaignId}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('campaign_id');
  });
});

describe('Auth endpoints', () => {
  const testAdminEmail = 'admin@demo.test';
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  afterAll(async () => {
    await pool.end();
  });

  test('POST /auth/request-link with valid email', async () => {
    const res = await request(app)
      .post('/auth/request-link')
      .send({ email: testAdminEmail });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  }, 10000);

  test('POST /auth/request-link without email', async () => {
    const res = await request(app)
      .post('/auth/request-link')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('email_required');
  });

  test('POST /auth/request-link with non-existent email (should not reveal existence)', async () => {
    const res = await request(app)
      .post('/auth/request-link')
      .send({ email: 'nonexistent@test.com' });
    expect(res.statusCode).toBe(200);
    // Should not reveal whether email exists
    expect(res.body).toHaveProperty('message');
  });

  test('POST /auth/verify with valid token', async () => {
    // First request a link
    await request(app)
      .post('/auth/request-link')
      .send({ email: testAdminEmail });

    // Get the token from DB
    const tokenResult = await pool.query(
      'SELECT token FROM auth_tokens WHERE admin_id IN (SELECT id FROM admins WHERE email = $1) ORDER BY created_at DESC LIMIT 1',
      [testAdminEmail]
    );
    expect(tokenResult.rows.length).toBeGreaterThan(0);
    const token = tokenResult.rows[0].token;

    // Verify the token
    const res = await request(app)
      .post('/auth/verify')
      .send({ token });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /auth/verify without token', async () => {
    const res = await request(app)
      .post('/auth/verify')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('token_required');
  });

  test('POST /auth/verify with invalid token', async () => {
    const res = await request(app)
      .post('/auth/verify')
      .send({ token: 'invalid_token_string' });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  test('POST /auth/verify token already used (should reject)', async () => {
    // Request and get token
    await request(app)
      .post('/auth/request-link')
      .send({ email: testAdminEmail });

    const tokenResult = await pool.query(
      'SELECT token FROM auth_tokens WHERE admin_id IN (SELECT id FROM admins WHERE email = $1) ORDER BY created_at DESC LIMIT 1',
      [testAdminEmail]
    );
    const token = tokenResult.rows[0].token;

    // Use it once
    const res1 = await request(app)
      .post('/auth/verify')
      .send({ token });
    expect(res1.statusCode).toBe(200);

    // Try to use again (should fail)
    const res2 = await request(app)
      .post('/auth/verify')
      .send({ token });
    expect(res2.statusCode).toBe(401);
    expect(res2.body.error).toBe('token_already_used');
  });
});

describe('Company Authorization Tests', () => {
  const company1Id = '11111111-1111-1111-1111-111111111111';
  const company2Id = '22222222-2222-2222-2222-222222222222';
  const campaignId = '66666666-6666-6666-6666-666666666666';
  let admin1Token;
  let admin2Token;
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  beforeAll(async () => {
    // Create second company for cross-company testing
    await pool.query(
      `INSERT INTO companies (id, name, campaign_enabled) 
       VALUES ($1, 'Test Company 2', true) 
       ON CONFLICT (id) DO NOTHING`,
      [company2Id]
    );

    // Delete existing admin2 if exists
    await pool.query('DELETE FROM admins WHERE email = $1', ['admin2@test.com']);

    // Create admin for company 2
    await pool.query(
      `INSERT INTO admins (id, company_id, email, password_hash) 
       VALUES (gen_random_uuid(), $1, 'admin2@test.com', crypt('password123', gen_salt('bf')))`,
      [company2Id]
    );

    // Get tokens for both admins
    const res1 = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@demo.test', password: 'changeme123' });
    
    if (res1.statusCode !== 200 || !res1.body.token) {
      throw new Error(`Admin1 login failed: ${res1.statusCode} - ${JSON.stringify(res1.body)}`);
    }
    admin1Token = res1.body.token;

    const res2 = await request(app)
      .post('/auth/login')
      .send({ email: 'admin2@test.com', password: 'password123' });
    
    if (res2.statusCode !== 200 || !res2.body.token) {
      throw new Error(`Admin2 login failed: ${res2.statusCode} - ${JSON.stringify(res2.body)}`);
    }
    admin2Token = res2.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM admins WHERE email = $1', ['admin2@test.com']);
    await pool.query('DELETE FROM companies WHERE id = $1', [company2Id]);
    await pool.end();
  });

  describe('UUID Validation', () => {
    test('should reject invalid UUID format in company_id', async () => {
      const res = await request(app)
        .get('/employees?company_id=invalid-uuid')
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid_company_id_format');
    });

    test('should reject malformed UUID', async () => {
      const res = await request(app)
        .post('/campaigns')
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ company_id: '12345', month: '2026-01-01' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid_company_id_format');
    });

    test('should accept valid UUID format', async () => {
      const res = await request(app)
        .get(`/employees?company_id=${company1Id}`)
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('JWT Authentication', () => {
    test('should reject request without JWT token', async () => {
      const res = await request(app).get('/employees');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('should reject request with invalid JWT token', async () => {
      const res = await request(app)
        .get('/employees')
        .set('Authorization', 'Bearer invalid_token_here');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('invalid_token');
    });

    test('should reject request with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/employees')
        .set('Authorization', 'InvalidFormat token');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('should accept request with valid JWT token', async () => {
      const res = await request(app)
        .get(`/employees?company_id=${company1Id}`)
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Cross-Company Access Prevention', () => {
    test('admin from company1 should not access company2 employees', async () => {
      const res = await request(app)
        .get(`/employees?company_id=${company2Id}`)
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('access_denied_to_company');
    });

    test('admin from company2 should not access company1 employees', async () => {
      const res = await request(app)
        .get(`/employees?company_id=${company1Id}`)
        .set('Authorization', `Bearer ${admin2Token}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('access_denied_to_company');
    });

    test('admin from company1 should not create campaign for company2', async () => {
      const res = await request(app)
        .post('/campaigns')
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ company_id: company2Id, month: '2026-02-01' });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('access_denied_to_company');
    });

    test('admin from company2 should not access company1 campaign', async () => {
      const res = await request(app)
        .get(`/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${admin2Token}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('campaign_not_found_or_access_denied');
    });

    test('admin from company2 should not start company1 campaign', async () => {
      const res = await request(app)
        .post(`/campaigns/${campaignId}/start`)
        .set('Authorization', `Bearer ${admin2Token}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('campaign_not_found_or_access_denied');
    });
  });

  describe('Employee Management Authorization', () => {
    let employee1Id;
    let employee2Id;

    beforeAll(async () => {
      // Create employee for company 1
      const emp1 = await pool.query(
        `INSERT INTO employees (id, company_id, email, active) 
         VALUES (gen_random_uuid(), $1, 'emp1@company1.com', true) 
         RETURNING id`,
        [company1Id]
      );
      employee1Id = emp1.rows[0].id;

      // Create employee for company 2
      const emp2 = await pool.query(
        `INSERT INTO employees (id, company_id, email, active) 
         VALUES (gen_random_uuid(), $1, 'emp2@company2.com', true) 
         RETURNING id`,
        [company2Id]
      );
      employee2Id = emp2.rows[0].id;
    });

    afterAll(async () => {
      await pool.query('DELETE FROM employees WHERE id IN ($1, $2)', [employee1Id, employee2Id]);
    });

    test('admin should be able to deactivate own company employee', async () => {
      const res = await request(app)
        .patch(`/employees/${employee1Id}/deactivate`)
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.active).toBe(false);
    });

    test('admin should not deactivate other company employee', async () => {
      const res = await request(app)
        .patch(`/employees/${employee2Id}/deactivate`)
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('employee_not_found_or_access_denied');
    });

    test('admin should be able to import employees to own company', async () => {
      const csvData = 'email\ntest@company1.com';
      const res = await request(app)
        .post('/employees/import')
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ company_id: company1Id, csv: csvData });
      expect(res.statusCode).toBe(200);
    });

    test('admin should not import employees to other company', async () => {
      const csvData = 'email\ntest@company2.com';
      const res = await request(app)
        .post('/employees/import')
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ company_id: company2Id, csv: csvData });
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('access_denied_to_company');
    });
  });

  describe('Campaign Authorization', () => {
    test('admin can list only own company campaigns', async () => {
      const res = await request(app)
        .get('/campaigns')
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // All campaigns should belong to company1
      res.body.forEach(campaign => {
        expect(campaign.company_id).toBe(company1Id);
      });
    });

    test('admin can create campaign for own company', async () => {
      const res = await request(app)
        .post('/campaigns')
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ company_id: company1Id, month: '2026-03-01' });
      expect(res.statusCode).toBe(201);
      expect(res.body.company_id).toBe(company1Id);
    });

    test('admin should get 404 for non-existent company', async () => {
      const fakeCompanyId = '99999999-9999-9999-9999-999999999999';
      const res = await request(app)
        .post('/campaigns')
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ company_id: fakeCompanyId, month: '2026-04-01' });
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('company_not_found');
    });
  });

  describe('Metrics and Reports Authorization', () => {
    test('admin can access own company campaign metrics', async () => {
      const res = await request(app)
        .get(`/metrics/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
    });

    test('admin cannot access other company campaign metrics', async () => {
      const res = await request(app)
        .get(`/metrics/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${admin2Token}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('access_denied_to_campaign');
    });

    test('admin can access own company campaign reports', async () => {
      const res = await request(app)
        .get(`/reports/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.campaign_id).toBe(campaignId);
    });

    test('admin cannot access other company campaign reports', async () => {
      const res = await request(app)
        .get(`/reports/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${admin2Token}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('access_denied_to_campaign');
    });
  });

  describe('Default Company Behavior', () => {
    test('GET /employees without company_id should use admin company', async () => {
      const res = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /campaigns without company_id should use admin company', async () => {
      const res = await request(app)
        .get('/campaigns')
        .set('Authorization', `Bearer ${admin1Token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

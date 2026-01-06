const request = require('supertest');
const { app } = require('../app');
const { execSync } = require('child_process');
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
    const res = await request(app).get(`/employees?company_id=${companyId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('create campaign', async () => {
    const res = await request(app)
      .post('/campaigns')
      .send({ company_id: companyId, month: '2026-01-01' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('start campaign (seeded)', async () => {
    const res = await request(app).post(`/campaigns/${campaignId}/start`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('active');
  });

  test('report stub', async () => {
    const res = await request(app).get(`/reports/campaign/${campaignId}`);
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

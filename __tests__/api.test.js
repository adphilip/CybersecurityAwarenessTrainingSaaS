const request = require('supertest');
const { app } = require('../app');
const { execSync } = require('child_process');

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

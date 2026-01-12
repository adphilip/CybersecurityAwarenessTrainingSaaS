const request = require('supertest');
const { app, pool } = require('../app');

describe('Performance Tests', () => {
  let companyId;
  let campaignId;
  let jwtToken;

  beforeAll(async () => {
    // Setup: Create test data
    const companyRes = await request(app)
      .post('/company')
      .send({ name: 'Performance Test Co', campaign_enabled: true });
    companyId = companyRes.body.id;

    // Create an admin linked to the company and get JWT token
    const existingAdmin = await pool.query('SELECT id FROM admins WHERE email = $1', ['perf@test.com']);
    if (existingAdmin.rows.length > 0) {
      // Update existing admin with company_id
      await pool.query('UPDATE admins SET company_id = $1 WHERE email = $2', [companyId, 'perf@test.com']);
    } else {
      // Insert new admin with company_id
      await pool.query(
        `INSERT INTO admins (id, company_id, email, password_hash) 
         VALUES (gen_random_uuid(), $1, 'perf@test.com', crypt('password123', gen_salt('bf')))`,
        [companyId]
      );
    }
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'perf@test.com', password: 'password123' });
    jwtToken = loginRes.body.token;

    // Create a campaign
    const campaignRes = await request(app)
      .post('/campaigns')
      .send({ company_id: companyId, month: '2026-01-01' });
    campaignId = campaignRes.body.id;
  });

  afterAll(async () => {
    // Cleanup
    if (companyId) {
      await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);
    }
    await pool.query('DELETE FROM admins WHERE email = $1', ['perf@test.com']);
    await pool.end();
  });

  describe('Response Time Tests', () => {
    test('GET / should respond in under 100ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/');
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
      console.log(`    ⏱️  Health check: ${duration}ms`);
    });

    test('POST /auth/login should respond in under 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'perf@test.com', password: 'password123' });
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
      console.log(`    ⏱️  Login: ${duration}ms`);
    });

    test('GET /campaigns should respond in under 200ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/campaigns')
        .set('Authorization', `Bearer ${jwtToken}`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
      console.log(`    ⏱️  List campaigns: ${duration}ms`);
    });

    test('GET /employees should respond in under 200ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get(`/employees?company_id=${companyId}`)
        .set('Authorization', `Bearer ${jwtToken}`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
      console.log(`    ⏱️  List employees: ${duration}ms`);
    });

    test('GET /reports/campaign/:id should respond in under 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get(`/reports/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${jwtToken}`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
      console.log(`    ⏱️  Generate report: ${duration}ms`);
    });
  });

  describe('Concurrent Request Tests', () => {
    test('should handle 10 concurrent health checks', async () => {
      const requests = new Array(10).fill().map(() => request(app).get('/'));
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      responses.forEach(res => expect(res.status).toBe(200));
      expect(duration).toBeLessThan(500);
      console.log(`    ⏱️  10 concurrent requests: ${duration}ms`);
    });

    test('should handle 20 concurrent campaign list requests', async () => {
      const requests = new Array(20).fill().map(() => 
        request(app)
          .get('/campaigns')
          .set('Authorization', `Bearer ${jwtToken}`)
      );
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      responses.forEach(res => expect(res.status).toBe(200));
      expect(duration).toBeLessThan(1000);
      console.log(`    ⏱️  20 concurrent campaign requests: ${duration}ms`);
    });

    test('should handle 50 concurrent read operations', async () => {
      const requests = new Array(50).fill().map((_, i) => {
        if (i % 2 === 0) {
          return request(app).get('/campaigns');
        } else {
          return request(app).get(`/employees?company_id=${companyId}`);
        }
      });
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      responses.forEach(res => expect(res.status).toBe(200));
      expect(duration).toBeLessThan(2000);
      console.log(`    ⏱️  50 concurrent mixed reads: ${duration}ms`);
    });
  });

  describe('Database Performance Tests', () => {
    test('bulk employee insert should be efficient', async () => {
      const employeeCount = 100;
      const csvData = new Array(employeeCount)
        .fill()
        .map((_, i) => `email\nperf${i}@test.com`)
        .join('\n');

      const start = Date.now();
      const response = await request(app)
        .post('/employees/import')
        .send({ company_id: companyId, csv: csvData });
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(3000);
      console.log(`    ⏱️  Import ${employeeCount} employees: ${duration}ms`);
      
      // Cleanup
      await pool.query('DELETE FROM employees WHERE email LIKE $1', ['perf%@test.com']);
    });

    test('query with company filter should be fast', async () => {
      const start = Date.now();
      const result = await pool.query(
        'SELECT * FROM employees WHERE company_id = $1 ORDER BY created_at',
        [companyId]
      );
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50);
      console.log(`    ⏱️  Query employees by company: ${duration}ms (${result.rows.length} rows)`);
    });

    test('campaign report aggregation should be efficient', async () => {
      const start = Date.now();
      await pool.query(`
        SELECT 
          c.id,
          COUNT(DISTINCT e.id) as employee_count,
          COUNT(DISTINCT pe.id) FILTER (WHERE pe.event_type = 'opened') as opens,
          COUNT(DISTINCT pe.id) FILTER (WHERE pe.event_type = 'clicked') as clicks
        FROM campaigns c
        LEFT JOIN companies co ON c.company_id = co.id
        LEFT JOIN employees e ON e.company_id = co.id
        LEFT JOIN phishing_events pe ON pe.campaign_id = c.id
        WHERE c.id = $1
        GROUP BY c.id
      `, [campaignId]);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
      console.log(`    ⏱️  Campaign report aggregation: ${duration}ms`);
    });
  });

  describe('Load Pattern Tests', () => {
    test('sequential authentication requests should maintain performance', async () => {
      const iterations = 10;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .post('/auth/login')
          .send({ email: 'perf@test.com', password: 'password123' });
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(300);
      expect(maxTime).toBeLessThan(500);
      console.log(`    ⏱️  ${iterations} sequential logins - avg: ${avgTime.toFixed(0)}ms, max: ${maxTime}ms`);
    });

    test('mixed read/write operations should not degrade', async () => {
      const operations = [];
      const times = { read: [], write: [] };
      
      for (let i = 0; i < 20; i++) {
        if (i % 3 === 0) {
          // Write operation
          operations.push(
            (async () => {
              const start = Date.now();
              await request(app)
                .post('/campaigns')
                .send({ company_id: companyId, month: `2026-${String(i % 12 + 1).padStart(2, '0')}-01` });
              times.write.push(Date.now() - start);
            })()
          );
        } else {
          // Read operation
          operations.push(
            (async () => {
              const start = Date.now();
              await request(app).get('/campaigns');
              times.read.push(Date.now() - start);
            })()
          );
        }
      }
      
      await Promise.all(operations);
      
      const avgRead = times.read.reduce((a, b) => a + b, 0) / times.read.length;
      const avgWrite = times.write.reduce((a, b) => a + b, 0) / times.write.length;
      
      expect(avgRead).toBeLessThan(200);
      expect(avgWrite).toBeLessThan(300);
      console.log(`    ⏱️  Mixed operations - reads avg: ${avgRead.toFixed(0)}ms, writes avg: ${avgWrite.toFixed(0)}ms`);
    });
  });

  describe('Memory and Resource Tests', () => {
    test('large CSV import should not cause memory issues', async () => {
      const largeCSVRows = 1000;
      const csv = 'email\n' + new Array(largeCSVRows)
        .fill()
        .map((_, i) => `large${i}@test.com`)
        .join('\n');
      
      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
      const start = Date.now();
      
      const response = await request(app)
        .post('/employees/import')
        .send({ company_id: companyId, csv });
      
      const duration = Date.now() - start;
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memDiff = memAfter - memBefore;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(10000);
      expect(memDiff).toBeLessThan(50); // Less than 50MB increase
      
      console.log(`    ⏱️  Import ${largeCSVRows} employees: ${duration}ms, memory: +${memDiff.toFixed(2)}MB`);
      
      // Cleanup
      await pool.query('DELETE FROM employees WHERE email LIKE $1', ['large%@test.com']);
    });

    test('connection pool should handle high load', async () => {
      const queries = new Array(100).fill().map((_, i) => 
        pool.query('SELECT $1 as id', [i])
      );
      
      const start = Date.now();
      const results = await Promise.all(queries);
      const duration = Date.now() - start;
      
      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(2000);
      console.log(`    ⏱️  100 concurrent DB queries: ${duration}ms`);
    });
  });
});

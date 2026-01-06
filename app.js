require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');

const PORT = process.env.PORT || 4000;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => res.json({ status: 'ok', app: 'cybersecurity-awareness-mvp' }));

// Create company (simple)
app.post('/company', async (req, res) => {
  const { name, campaign_enabled } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO companies (id, name, campaign_enabled, created_at) VALUES (gen_random_uuid(), $1, $2, now()) RETURNING *',
      [name, campaign_enabled || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Get company (by id or first)
app.get('/company', async (req, res) => {
  const { company_id } = req.query;
  try {
    const result = company_id
      ? await pool.query('SELECT * FROM companies WHERE id = $1 LIMIT 1', [company_id])
      : await pool.query('SELECT * FROM companies ORDER BY created_at ASC LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Import employees via CSV text (body.csv)
app.post('/employees/import', async (req, res) => {
  const { company_id, csv } = req.body;
  if (!company_id || !csv) return res.status(400).json({ error: 'company_id and csv required' });
  try {
    const records = parse(csv, { columns: true, skip_empty_lines: true });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const row of records) {
        const email = row.email || row.Email || row.email_address;
        if (!email) continue;
        const r = await client.query(
          'INSERT INTO employees (id, company_id, email, active, created_at) VALUES (gen_random_uuid(), $1, $2, true, now()) ON CONFLICT (email) DO NOTHING RETURNING *',
          [company_id, email.toLowerCase()]
        );
        if (r.rows[0]) inserted.push(r.rows[0]);
      }
      await client.query('COMMIT');
      res.json({ imported: inserted.length, rows: inserted });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'import_failed' });
  }
});

// List employees (optional company_id)
app.get('/employees', async (req, res) => {
  const { company_id } = req.query;
  try {
    const result = company_id
      ? await pool.query('SELECT * FROM employees WHERE company_id = $1 ORDER BY created_at', [company_id])
      : await pool.query('SELECT * FROM employees ORDER BY created_at');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Deactivate employee
app.patch('/employees/:id/deactivate', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('UPDATE employees SET active = false WHERE id = $1 RETURNING *', [id]);
    res.json(result.rows[0] || { error: 'not_found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Basic campaign create
app.post('/campaigns', async (req, res) => {
  const { company_id, month, phishing_template_id, quiz_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO campaigns (id, company_id, month, phishing_template_id, quiz_id, status) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING *',
      [company_id, month, phishing_template_id, quiz_id, 'scheduled']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// List campaigns (optional company_id)
app.get('/campaigns', async (req, res) => {
  const { company_id } = req.query;
  try {
    const result = company_id
      ? await pool.query('SELECT * FROM campaigns WHERE company_id = $1 ORDER BY month DESC', [company_id])
      : await pool.query('SELECT * FROM campaigns ORDER BY month DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Get campaign by id
app.get('/campaigns/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    res.json(result.rows[0] || { error: 'not_found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Start campaign (simple state change)
app.post('/campaigns/:id/start', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query(
      'UPDATE campaigns SET status = $1, started_at = now() WHERE id = $2 RETURNING *',
      ['active', id]
    );
    res.json(result.rows[0] || { error: 'not_found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Close campaign
app.post('/campaigns/:id/close', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query(
      'UPDATE campaigns SET status = $1, closed_at = now() WHERE id = $2 RETURNING *',
      ['closed', id]
    );
    res.json(result.rows[0] || { error: 'not_found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Phishing tracking: open
app.get('/phishing/open/:token', async (req, res) => {
  const token = req.params.token;
  try {
    await pool.query(
      'INSERT INTO phishing_events (id, campaign_id, employee_id, event_type, event_time) VALUES (gen_random_uuid(), NULL, $1, $2, now())',
      [token, 'opened']
    );
    res.json({ status: 'recorded', event: 'opened' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'tracking_failed' });
  }
});

// Phishing click
app.get('/phishing/click/:token', async (req, res) => {
  const token = req.params.token;
  try {
    await pool.query(
      'INSERT INTO phishing_events (id, campaign_id, employee_id, event_type, event_time) VALUES (gen_random_uuid(), NULL, $1, $2, now())',
      [token, 'clicked']
    );
    res.json({ status: 'recorded', event: 'clicked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'tracking_failed' });
  }
});

// Quiz endpoints (simple stub)
app.get('/quiz/:token', async (req, res) => {
  res.json({ quiz: { id: 'sample-quiz', title: '3-question micro-quiz', questions: [{ id: 1, text: 'What is phishing?' }] } });
});

app.post('/quiz/:token/submit', async (req, res) => {
  const { answers, employee_id, quiz_id } = req.body;
  const score = 100;
  try {
    await pool.query(
      'INSERT INTO quiz_attempts (id, quiz_id, employee_id, score, completed_at) VALUES (gen_random_uuid(), $1, $2, $3, now())',
      [quiz_id || 'sample', employee_id || null, score]
    );
    res.json({ success: true, score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'submit_failed' });
  }
});

// Metrics example
app.get('/metrics/campaign/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const total = (await pool.query(
      'SELECT count(*) FROM employees WHERE company_id = (SELECT company_id FROM campaigns WHERE id = $1)',
      [id]
    )).rows[0].count;
    const clicks = (await pool.query(
      'SELECT count(*) FROM phishing_events WHERE campaign_id = $1 AND event_type = $2',
      [id, 'clicked']
    )).rows[0].count;
    res.json({ total_employees: Number(total), clicks: Number(clicks) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'metrics_error' });
  }
});

// Report stub
app.get('/reports/campaign/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const companyRow = await pool.query('SELECT company_id FROM campaigns WHERE id = $1', [id]);
    const companyId = companyRow.rows[0]?.company_id;
    const total = (await pool.query('SELECT count(*) FROM employees WHERE company_id = $1', [companyId])).rows[0].count || 0;
    const opens = (await pool.query('SELECT count(*) FROM phishing_events WHERE campaign_id = $1 AND event_type = $2', [id, 'opened'])).rows[0].count || 0;
    const clicks = (await pool.query('SELECT count(*) FROM phishing_events WHERE campaign_id = $1 AND event_type = $2', [id, 'clicked'])).rows[0].count || 0;
    const quiz = (await pool.query('SELECT count(*) FROM quiz_attempts WHERE quiz_id = (SELECT quiz_id FROM campaigns WHERE id = $1)', [id])).rows[0].count || 0;
    res.json({
      campaign_id: id,
      company_id: companyId,
      totals: {
        employees: Number(total),
        opens: Number(opens),
        clicks: Number(clicks),
        quiz_attempts: Number(quiz)
      },
      kpis: {
        click_rate: total ? Number(clicks) / Number(total) : 0,
        open_rate: total ? Number(opens) / Number(total) : 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'report_error' });
  }
});

module.exports = { app, pool, PORT };
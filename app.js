require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');
const { signJWT, verifyJWT, sendMagicLink, TOKEN_EXPIRY } = require('./lib/auth');

const PORT = process.env.PORT || 4000;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// Rate limiters (disabled in test mode)
const authLimiter = process.env.NODE_ENV === 'test' 
  ? (req, res, next) => next()  // No rate limiting in tests
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many auth attempts, try again later'
    });

app.get('/', (req, res) => res.json({ status: 'ok', app: 'cybersecurity-awareness-mvp' }));

// ===== AUTH ENDPOINTS =====

// POST /auth/login - Email + Password login
app.post('/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email_and_password_required' });
  }

  try {
    const result = await pool.query(
      `SELECT id FROM admins WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const adminId = result.rows[0].id;
    const jwtToken = signJWT(adminId);
    return res.status(200).json({ token: jwtToken });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    return res.status(500).json({ error: 'db_error' });
  }
});

// POST /auth/request-link - Request a magic link
app.post('/auth/request-link', authLimiter, async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'email_required' });
  }

  try {
    // Find admin by email
    const adminResult = await pool.query('SELECT id, email FROM admins WHERE email = $1', [email]);
    
    if (adminResult.rows.length === 0) {
      // Don't reveal whether email exists (security)
      return res.status(200).json({ message: 'If email exists, magic link sent' });
    }

    const admin = adminResult.rows[0];
    const tokenString = require('node:crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

    // Create auth token record
    await pool.query(
      'INSERT INTO auth_tokens (admin_id, token, expires_at, created_at) VALUES ($1, $2, $3, now())',
      [admin.id, tokenString, expiresAt]
    );

    // Send magic link email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    await sendMagicLink(email, tokenString, frontendUrl);

    res.status(200).json({ message: 'Magic link sent if email exists' });
  } catch (err) {
    console.error('POST /auth/request-link error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// POST /auth/verify - Verify magic link token and return JWT
app.post('/auth/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'token_required' });
  }

  try {
    // Find token record
    const tokenResult = await pool.query(
      'SELECT * FROM auth_tokens WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const tokenRecord = tokenResult.rows[0];

    // Check if expired
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(401).json({ error: 'token_expired' });
    }

    // Check if already used
    if (tokenRecord.used_at) {
      return res.status(401).json({ error: 'token_already_used' });
    }

    // Mark token as used
    await pool.query(
      'UPDATE auth_tokens SET used_at = now() WHERE id = $1',
      [tokenRecord.id]
    );

    // Generate JWT
    const jwtToken = signJWT(tokenRecord.admin_id);

    res.status(200).json({ token: jwtToken });
  } catch (err) {
    console.error('POST /auth/verify error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Middleware to verify JWT and fetch admin's company
const verifyTokenMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyJWT(token);

  if (!decoded) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  req.adminId = decoded.admin_id;
  
  // Fetch admin's company_id
  try {
    const adminResult = await pool.query('SELECT company_id FROM admins WHERE id = $1', [decoded.admin_id]);
    if (adminResult.rows.length > 0) {
      req.adminCompanyId = adminResult.rows[0].company_id;
    }
  } catch (err) {
    console.error('Error fetching admin company:', err);
  }
  
  next();
};

// UUID validation helper
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Middleware to validate company access
function validateCompanyAccess(source = 'body') {
  return (req, res, next) => {
    let company_id;
    
    // Get company_id from specified source (body, query, or params)
    if (source === 'body') {
      company_id = req.body.company_id;
    } else if (source === 'query') {
      company_id = req.query.company_id || req.adminCompanyId;  // Use admin's company if not specified
    } else if (source === 'params') {
      company_id = req.params.company_id;
    }
    
    // Allow if no company_id specified in query (will use admin's company)
    if (!company_id && source === 'query') {
      return next();
    }
    
    // Validate UUID format
    if (company_id && !isValidUUID(company_id)) {
      return res.status(400).json({ error: 'invalid_company_id_format' });
    }
    
    // Check if admin has access to this company
    if (company_id && req.adminCompanyId && company_id !== req.adminCompanyId) {
      return res.status(403).json({ error: 'access_denied_to_company' });
    }
    
    next();
  };
}

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

// List all companies
app.get('/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM companies ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Import employees via CSV text (body.csv)
app.post('/employees/import', verifyTokenMiddleware, validateCompanyAccess('body'), async (req, res) => {
  const { company_id, csv } = req.body;
  if (!company_id || !csv) return res.status(400).json({ error: 'company_id and csv required' });
  
  // Check if company exists
  const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [company_id]);
  if (companyCheck.rows.length === 0) {
    return res.status(404).json({ error: 'company_not_found' });
  }
  
  try {
    const records = parse(csv, { columns: true, skip_empty_lines: true });
    
    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid records found in CSV. Make sure CSV has an "email" column header.' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];
      const skipped = [];
      
      for (const row of records) {
        const email = row.email || row.Email || row.email_address;
        if (!email) {
          skipped.push({ row, reason: 'Missing email' });
          continue;
        }
        const r = await client.query(
          'INSERT INTO employees (id, company_id, email, active, created_at) VALUES (gen_random_uuid(), $1, $2, true, now()) ON CONFLICT (email) DO NOTHING RETURNING *',
          [company_id, email.toLowerCase()]
        );
        if (r.rows[0]) {
          inserted.push(r.rows[0]);
        } else {
          skipped.push({ email: email.toLowerCase(), reason: 'Already exists' });
        }
      }
      await client.query('COMMIT');
      res.json({ 
        imported: inserted.length, 
        skipped: skipped.length,
        total: records.length,
        rows: inserted 
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'import_failed', message: err.message });
  }
});

// List employees (optional company_id)
app.get('/employees', verifyTokenMiddleware, validateCompanyAccess('query'), async (req, res) => {
  const company_id = req.query.company_id || req.adminCompanyId;
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
app.patch('/employees/:id/deactivate', verifyTokenMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    // Check if employee belongs to admin's company
    const empCheck = await pool.query('SELECT company_id FROM employees WHERE id = $1', [id]);
    if (empCheck.rows.length === 0 || empCheck.rows[0].company_id !== req.adminCompanyId) {
      return res.status(404).json({ error: 'employee_not_found_or_access_denied' });
    }
    
    const result = await pool.query('UPDATE employees SET active = false WHERE id = $1 RETURNING *', [id]);
    res.json(result.rows[0] || { error: 'not_found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Basic campaign create
app.post('/campaigns', verifyTokenMiddleware, async (req, res) => {
  const { company_id, month, phishing_template_id, quiz_id } = req.body;
  
  // Validate UUID format first
  if (company_id && !isValidUUID(company_id)) {
    return res.status(400).json({ error: 'invalid_company_id_format' });
  }
  
  // Check if company exists
  const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [company_id]);
  if (companyCheck.rows.length === 0) {
    return res.status(404).json({ error: 'company_not_found' });
  }
  
  // Then check authorization
  if (company_id && req.adminCompanyId && company_id !== req.adminCompanyId) {
    return res.status(403).json({ error: 'access_denied_to_company' });
  }
  
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
app.get('/campaigns', verifyTokenMiddleware, validateCompanyAccess('query'), async (req, res) => {
  const company_id = req.query.company_id || req.adminCompanyId;
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
app.get('/campaigns/:id', verifyTokenMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'campaign_not_found_or_access_denied' });
    }
    
    const campaign = result.rows[0];
    // Check if campaign belongs to admin's company
    if (campaign.company_id !== req.adminCompanyId) {
      return res.status(404).json({ error: 'campaign_not_found_or_access_denied' });
    }
    
    res.json(campaign);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Start campaign (simple state change)
app.post('/campaigns/:id/start', verifyTokenMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    // Check if campaign belongs to admin's company
    const campCheck = await pool.query('SELECT company_id FROM campaigns WHERE id = $1', [id]);
    if (campCheck.rows.length === 0 || campCheck.rows[0].company_id !== req.adminCompanyId) {
      return res.status(404).json({ error: 'campaign_not_found_or_access_denied' });
    }
    
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

// Quiz endpoints
app.get('/quiz/:token', async (req, res) => {
  try {
    // Validate token exists
    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'invalid_token' });
    }

    // For MVP, fetch the first available quiz with questions
    const quizResult = await pool.query(`
      SELECT q.id, q.title
      FROM quizzes q
      WHERE EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.quiz_id = q.id)
      ORDER BY q.id DESC
      LIMIT 1
    `);

    if (quizResult.rows.length === 0) {
      // Return default quiz if none exists
      return res.json({
        quiz: {
          id: 'default',
          title: 'Cybersecurity Awareness Quiz',
          questions: [
            {
              id: '1',
              question_text: 'What is phishing?',
              options: ['A type of fishing', 'A fraudulent attempt to obtain sensitive information', 'A computer virus', 'A firewall'],
              correct_option: 'B'
            },
            {
              id: '2',
              question_text: 'What should you do if you receive a suspicious email?',
              options: ['Click all links to investigate', 'Report it to IT/Security', 'Reply to sender', 'Forward to colleagues'],
              correct_option: 'B'
            },
            {
              id: '3',
              question_text: 'What makes a strong password?',
              options: ['Your birthday', 'The word "password"', 'At least 12 characters with mixed types', 'Your name'],
              correct_option: 'C'
            }
          ],
          token
        }
      });
    }

    const quiz = quizResult.rows[0];
    
    // Fetch questions for this quiz
    const questionsResult = await pool.query(`
      SELECT id, question_text, options, correct_option
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY id ASC
    `, [quiz.id]);

    const questions = questionsResult.rows.map(q => ({
      id: q.id,
      question_text: q.question_text,
      options: Array.isArray(q.options) ? q.options : (q.options?.options || []),
      // Don't send correct_option to client
    }));

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questions,
        token
      }
    });

  } catch (err) {
    console.error('GET /quiz/:token error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

app.post('/quiz/:token/submit', async (req, res) => {
  const { answers } = req.body; // answers should be array of { questionId, answer }
  
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers_required' });
  }

  try {
    // Track that someone clicked through from phishing email
    await pool.query(
      'INSERT INTO phishing_events (id, campaign_id, employee_id, event_type, event_time) VALUES (gen_random_uuid(), NULL, NULL, $1, now())',
      ['quiz_completed']
    );

    // For MVP, fetch quiz questions and calculate score
    const quizResult = await pool.query(`
      SELECT id FROM quizzes 
      ORDER BY id DESC 
      LIMIT 1
    `);

    let quiz_id = 'default';
    let score = 0;
    let total = answers.length;
    let results = [];

    if (quizResult.rows.length > 0) {
      quiz_id = quizResult.rows[0].id;
      
      // Get correct answers and options
      const questionsResult = await pool.query(`
        SELECT id, correct_option, options
        FROM quiz_questions
        WHERE quiz_id = $1
      `, [quiz_id]);

      const correctAnswers = {};
      questionsResult.rows.forEach(q => {
        // Store both the text answer and build a mapping from letter to text
        const optionsArray = Array.isArray(q.options) ? q.options : (q.options?.options || []);
        correctAnswers[q.id] = {
          correctText: q.correct_option,
          options: optionsArray
        };
      });

      // Calculate score
      answers.forEach(ans => {
        const questionData = correctAnswers[ans.questionId];
        if (!questionData) {
          results.push({
            questionId: ans.questionId,
            isCorrect: false,
            correctAnswer: ans.answer
          });
          return;
        }
        
        // Convert letter (A, B, C, D) to option text
        const optionIndex = ans.answer.codePointAt(0) - 65; // A=0, B=1, C=2, D=3
        const userAnswerText = questionData.options[optionIndex];
        
        // Compare with correct answer
        const isCorrect = userAnswerText === questionData.correctText;
        if (isCorrect) score++;
        
        // Find correct answer letter
        const correctIndex = questionData.options.indexOf(questionData.correctText);
        const correctLetter = correctIndex >= 0 ? String.fromCodePoint(65 + correctIndex) : ans.answer;
        
        results.push({
          questionId: ans.questionId,
          isCorrect,
          correctAnswer: correctLetter
        });
      });
    } else {
      // Use default quiz answers (A=1, B=2, C=3, D=4)
      const defaultCorrect = { '1': 'B', '2': 'B', '3': 'C' };
      answers.forEach(ans => {
        const isCorrect = defaultCorrect[ans.questionId] === ans.answer;
        if (isCorrect) score++;
        results.push({
          questionId: ans.questionId,
          isCorrect,
          correctAnswer: defaultCorrect[ans.questionId]
        });
      });
    }

    const percentScore = total > 0 ? Math.round((score / total) * 100) : 0;

    // Record quiz attempt
    await pool.query(
      'INSERT INTO quiz_attempts (id, quiz_id, employee_id, score, completed_at) VALUES (gen_random_uuid(), $1, NULL, $2, now())',
      [quiz_id, percentScore]
    );

    res.json({
      success: true,
      score: percentScore,
      correct: score,
      total,
      results
    });

  } catch (err) {
    console.error('POST /quiz/:token/submit error:', err);
    res.status(500).json({ error: 'submit_failed' });
  }
});

// Metrics example
app.get('/metrics/campaign/:id', verifyTokenMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    // Check if campaign belongs to admin's company
    const campCheck = await pool.query('SELECT company_id FROM campaigns WHERE id = $1', [id]);
    if (campCheck.rows.length === 0 || campCheck.rows[0].company_id !== req.adminCompanyId) {
      return res.status(403).json({ error: 'access_denied_to_campaign' });
    }
    
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
app.get('/reports/campaign/:id', verifyTokenMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    const companyRow = await pool.query('SELECT company_id FROM campaigns WHERE id = $1', [id]);
    const companyId = companyRow.rows[0]?.company_id;
    
    // Check if campaign belongs to admin's company
    if (!companyId || companyId !== req.adminCompanyId) {
      return res.status(403).json({ error: 'access_denied_to_campaign' });
    }
    
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

// Generate quiz token for employee (for testing/demo purposes)
app.post('/generate-quiz-token', async (req, res) => {
  const { employee_email } = req.body;
  
  try {
    // Generate a unique token
    const token = require('node:crypto').randomBytes(16).toString('hex');
    
    // Optionally link to employee if email provided
    if (employee_email) {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE email = $1',
        [employee_email]
      );
      
      if (employeeResult.rows.length > 0) {
        // Could store token-employee mapping if needed for tracking
        console.log(`Generated token for employee: ${employee_email}`);
      }
    }
    
    res.json({ 
      token,
      quiz_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/quiz/${token}`
    });
  } catch (err) {
    console.error('Generate token error:', err);
    res.status(500).json({ error: 'token_generation_failed' });
  }
});

module.exports = { app, pool, PORT };
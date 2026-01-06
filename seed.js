require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');
    await client.query('BEGIN');

    // Sample company and admin
    const companyId = '11111111-1111-1111-1111-111111111111';
    await client.query(`
      INSERT INTO companies (id, name, campaign_enabled, created_at)
      VALUES ($1, 'Demo Corp', true, now())
      ON CONFLICT (id) DO NOTHING;
    `, [companyId]);

    await client.query(`
      INSERT INTO admins (id, company_id, email, created_at)
      VALUES ($1, $2, 'admin@demo.test', now())
      ON CONFLICT (id) DO NOTHING;
    `, ['22222222-2222-2222-2222-222222222222', companyId]);

    // Set a default password (hashed) for the admin
    // Password: changeme123 (update in production)
    await client.query(
      `UPDATE admins
       SET password_hash = crypt('changeme123', gen_salt('bf'))
       WHERE email = 'admin@demo.test';`
    );

    // Employees
    const employees = [
      ['33333333-3333-3333-3333-333333333331', 'alice@demo.test'],
      ['33333333-3333-3333-3333-333333333332', 'bob@demo.test'],
      ['33333333-3333-3333-3333-333333333333', 'carol@demo.test']
    ];
    for (const [id, email] of employees) {
      await client.query(
        `INSERT INTO employees (id, company_id, email, active, created_at)
         VALUES ($1, $2, $3, true, now())
         ON CONFLICT (id) DO NOTHING;`,
        [id, companyId, email]
      );
    }

    // Phishing template
    const templateId = '44444444-4444-4444-4444-444444444444';
    await client.query(`
      INSERT INTO phishing_templates (id, name, subject, body_html, created_at)
      VALUES ($1, 'Demo Template', 'Important: Action Required', '<p>Please review your account</p>', now())
      ON CONFLICT (id) DO NOTHING;
    `, [templateId]);

    // Quiz + questions
    const quizId = '55555555-5555-5555-5555-555555555555';
    await client.query(`
      INSERT INTO quizzes (id, title, created_at)
      VALUES ($1, 'Security Basics', now())
      ON CONFLICT (id) DO NOTHING;
    `, [quizId]);

    const questions = [
      ['What is phishing?', ['Malicious email', 'Type of fish', 'Antivirus'], 'Malicious email'],
      ['Best password practice?', ['Reuse everywhere', 'Write on sticky note', 'Use a password manager'], 'Use a password manager'],
      ['How to verify links?', ['Click immediately', 'Hover to inspect', 'Forward to all'], 'Hover to inspect']
    ];
    let qIndex = 0;
    for (const [text, options, correct] of questions) {
      qIndex += 1;
      await client.query(
        `INSERT INTO quiz_questions (id, quiz_id, question_text, options, correct_option)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING;`,
        [`55555555-5555-5555-5555-55555555555${qIndex}`, quizId, text, JSON.stringify(options), correct]
      );
    }

    // Campaign
    const campaignId = '66666666-6666-6666-6666-666666666666';
    await client.query(`
      INSERT INTO campaigns (id, company_id, month, phishing_template_id, quiz_id, status, started_at)
      VALUES ($1, $2, date_trunc('month', now()), $3, $4, 'active', now())
      ON CONFLICT (id) DO NOTHING;
    `, [campaignId, companyId, templateId, quizId]);

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();

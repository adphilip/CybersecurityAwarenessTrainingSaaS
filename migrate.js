require('dotenv').config();
const fs = require('node:fs');
const { Pool } = require('pg');

const sql = fs.readFileSync(__dirname + '/db/init.sql', 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(sql);
    console.log('Migrations applied.');
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();

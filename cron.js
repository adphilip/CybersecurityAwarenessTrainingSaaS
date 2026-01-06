require('dotenv').config();
const cron = require('node-cron');

// Placeholder cron jobs matching spec schedule
// Campaign Scheduler: daily
cron.schedule('0 2 * * *', () => {
  console.log('[cron] Campaign Scheduler (daily) running at', new Date().toISOString());
});

// Campaign Starter: hourly
cron.schedule('0 * * * *', () => {
  console.log('[cron] Campaign Starter (hourly) running at', new Date().toISOString());
});

// Reminder Engine: daily
cron.schedule('30 2 * * *', () => {
  console.log('[cron] Reminder Engine (daily) running at', new Date().toISOString());
});

// Campaign Closer: daily
cron.schedule('45 2 * * *', () => {
  console.log('[cron] Campaign Closer (daily) running at', new Date().toISOString());
});

console.log('Cron jobs scheduled. Keep process running to execute.');

/**
 * Send a test phishing email to yourself
 * Usage: node send-test-email.js your-email@example.com
 */

require('dotenv').config();
const { sendPhishingEmail, getAvailableTemplates } = require('./lib/phishing');

const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('Usage: node send-test-email.js your-email@example.com');
  process.exit(1);
}

// Configuration check
if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
  console.log('\n⚠️  SMTP not configured. Email will not actually send.');
  console.log('To send real emails, configure these in .env:');
  console.log('  SMTP_HOST=smtp.gmail.com');
  console.log('  SMTP_PORT=587');
  console.log('  SMTP_USER=your-email@gmail.com');
  console.log('  SMTP_PASS=your-app-password');
  console.log('  EMAIL_FROM=your-email@gmail.com\n');
}

async function sendTestEmail() {
  console.log('\n=== Sending Test Phishing Email ===\n');
  console.log(`To: ${recipientEmail}\n`);
  
  // List available templates
  const templates = getAvailableTemplates();
  console.log('Available templates:');
  templates.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name}`);
  });
  
  // Use first template as example (password reset)
  const templateToUse = templates[0];
  console.log(`\nUsing template: ${templateToUse.name}`);
  
  try {
    const result = await sendPhishingEmail({
      to: recipientEmail,
      templateName: templateToUse.id,
      subject: templateToUse.subject,
      variables: {
        employee_name: 'Test User',
        employee_email: recipientEmail,
        company_name: 'Acme Corporation',
        company_domain: 'acmecorp.com',
        phishing_link: 'http://localhost:3000/quiz/test-token-123',
        tracking_pixel_url: 'http://localhost:4000/phishing/open/test-token-123'
      }
    });
    
    console.log('\n✅ Email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log('\nCheck your inbox and spam folder.\n');
    
  } catch (error) {
    console.error('\n❌ Error sending email:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure SMTP settings are correct in .env');
    console.log('2. For Gmail, use an App Password, not your regular password');
    console.log('3. Check if less secure app access is enabled (Gmail)');
    console.log('4. Verify your SMTP port and host are correct\n');
  }
}

sendTestEmail();

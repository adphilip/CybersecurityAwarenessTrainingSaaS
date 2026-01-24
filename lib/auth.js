const jwt = require('jsonwebtoken');
const emailService = require('./email-service');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRY = 3600; // 1 hour
const TOKEN_EXPIRY = 24 * 3600 * 1000; // 24 hours for magic link

function signJWT(adminId) {
  return jwt.sign({ admin_id: adminId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return null;
  }
}

async function sendMagicLink(email, token, frontendUrl) {
  const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${baseUrl}/auth/verify?token=${token}`;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@csat.test',
      to: email,
      subject: 'Your CSAT login link',
      text: `Click here to log in: ${link}\nThis link expires in 24 hours.`,
      html: `<p>Click <a href="${link}">here to log in</a>.</p><p>This link expires in 24 hours.</p>`
    });
    console.log(`[auth] Magic link sent to ${email}`);
  } catch (err) {
    console.error('[auth] Email send failed (will not block auth flow):', err.message);
    // Don't throw - allow auth to proceed even if email sending fails
    // In dev/test, admins can extract token from DB
  }
}
return emailService.sendMagicLink(email, token, frontendUrl);
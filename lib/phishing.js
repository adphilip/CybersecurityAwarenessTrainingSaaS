const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

/**
 * Load an email template by name
 * @param {string} templateName - Name of the template file (without .html extension)
 * @returns {string} Template HTML content
 */
function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return fs.readFileSync(templatePath, 'utf8');
}

/**
 * Generate random values for template variables
 * @returns {object} Object with random values
 */
function generateRandomValues() {
  const now = new Date();
  const pastDate = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const futureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  
  const locations = ['New York, NY', 'Los Angeles, CA', 'London, UK', 'Tokyo, Japan', 'Sydney, Australia', 'Moscow, Russia'];
  const devices = ['iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Pro', 'Windows Desktop', 'iPad Air', 'Linux Workstation'];
  const browsers = ['Chrome 120', 'Safari 17', 'Firefox 122', 'Edge 120', 'Opera 106'];
  
  return {
    random_number: Math.floor(Math.random() * 900000) + 100000,
    random_tracking: Math.floor(Math.random() * 9000000000) + 1000000000,
    invoice_date: pastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    due_date: new Date(pastDate.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    issue_date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    deadline_date: futureDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    attempt_time: now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
    attempt_location: locations[Math.floor(Math.random() * locations.length)],
    attempt_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    attempt_device: devices[Math.floor(Math.random() * devices.length)],
    attempt_browser: browsers[Math.floor(Math.random() * browsers.length)],
    delivery_time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    ship_date: pastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    transit_date: new Date(pastDate.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  };
}

/**
 * Replace template variables with actual values
 * @param {string} template - HTML template with {{variable}} placeholders
 * @param {object} variables - Object with variable names and values
 * @returns {string} Populated HTML
 */
function populateTemplate(template, variables) {
  let result = template;
  
  // Add random values
  const randomValues = generateRandomValues();
  const allVariables = { ...randomValues, ...variables };
  
  // Replace all variables
  for (const [key, value] of Object.entries(allVariables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

/**
 * Send a phishing simulation email
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.templateName - Name of template to use
 * @param {string} options.subject - Email subject line
 * @param {object} options.variables - Variables to populate in template
 * @param {object} options.transporter - Nodemailer transporter (optional, uses default if not provided)
 * @returns {Promise} Nodemailer send result
 */
async function sendPhishingEmail(options) {
  const { to, templateName, subject, variables, transporter: customTransporter } = options;
  
  // Load and populate template
  const template = loadTemplate(templateName);
  const html = populateTemplate(template, variables);
  
  // Use custom transporter or create default
  const transporter = customTransporter || nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });
  
  // Send email
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@csat.test',
    to,
    subject,
    html
  });
}

/**
 * Get available templates with metadata
 * @returns {array} Array of template objects
 */
function getAvailableTemplates() {
  return [
    {
      id: 'phishing-password-reset',
      name: 'Password Reset Request',
      subject: 'Your Password Reset Request',
      description: 'Fake IT password reset notification',
      urgency: 'high',
      difficulty: 'medium'
    },
    {
      id: 'phishing-invoice',
      name: 'Overdue Invoice Payment',
      subject: 'URGENT: Payment Required - Invoice #INV-{{random_number}}',
      description: 'Fake overdue invoice with service suspension threat',
      urgency: 'critical',
      difficulty: 'easy'
    },
    {
      id: 'phishing-security-alert',
      name: 'Security Alert - Unusual Login',
      subject: '🔐 Security Alert: Unusual Login Activity Detected',
      description: 'Fake security breach notification',
      urgency: 'critical',
      difficulty: 'hard'
    },
    {
      id: 'phishing-hr-document',
      name: 'HR Document Signature Required',
      subject: 'Action Required: Sign Your 2026 Benefits Enrollment',
      description: 'Fake HR benefits document requiring signature',
      urgency: 'moderate',
      difficulty: 'medium'
    },
    {
      id: 'phishing-package-delivery',
      name: 'Package Delivery Issue',
      subject: 'Delivery Exception: Action Required - Track #SF{{random_tracking}}',
      description: 'Fake package delivery failure notification',
      urgency: 'moderate',
      difficulty: 'easy'
    }
  ];
}

module.exports = {
  loadTemplate,
  populateTemplate,
  sendPhishingEmail,
  getAvailableTemplates,
  generateRandomValues
};

/**
 * Email Service - Production-ready email delivery
 * Supports multiple providers: Gmail, AWS SES, SendGrid, Mailgun, Custom SMTP
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.provider = 'smtp'; // default
    this.initialize();
  }

  /**
   * Initialize email transporter based on environment
   */
  initialize() {
    // Test/Development mock transporter
    if (process.env.NODE_ENV === 'test') {
      this.transporter = {
        sendMail: async (mailOptions) => {
          console.log(`[mock-email] To: ${mailOptions.to}, Subject: ${mailOptions.subject}`);
          return { messageId: 'mock-message-id', accepted: [mailOptions.to] };
        }
      };
      this.isConfigured = true;
      return;
    }

    // Development without SMTP - console logging only
    if (!process.env.SMTP_HOST && process.env.NODE_ENV === 'development') {
      console.log('[email] No SMTP configured - using console logging for development');
      this.transporter = {
        sendMail: async (mailOptions) => {
          console.log('\n=== EMAIL WOULD BE SENT ===');
          console.log(`To: ${mailOptions.to}`);
          console.log(`From: ${mailOptions.from}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Text: ${mailOptions.text}`);
          console.log('===========================\n');
          return { messageId: 'dev-message-id', accepted: [mailOptions.to] };
        }
      };
      this.isConfigured = true;
      return;
    }

    // Production SMTP configuration
    if (process.env.SMTP_HOST) {
      try {
        const config = this.buildTransportConfig();
        this.transporter = nodemailer.createTransport(config);
        this.isConfigured = true;
        console.log(`[email] Configured with ${this.provider} (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587})`);
      } catch (err) {
        console.error('[email] Failed to initialize email transport:', err.message);
        this.isConfigured = false;
      }
    } else {
      console.warn('[email] SMTP not configured - emails will not be sent');
      this.isConfigured = false;
    }
  }

  /**
   * Build transport configuration based on provider
   */
  buildTransportConfig() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';

    // Detect provider from host
    if (host.includes('smtp.gmail.com')) {
      this.provider = 'gmail';
    } else if (host.includes('email-smtp') && host.includes('amazonaws.com')) {
      this.provider = 'aws-ses';
    } else if (host.includes('smtp.sendgrid.net')) {
      this.provider = 'sendgrid';
    } else if (host.includes('smtp.mailgun.org')) {
      this.provider = 'mailgun';
    }

    const config = {
      host,
      port,
      secure,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    };

    // Provider-specific configurations
    if (this.provider === 'gmail') {
      config.service = 'gmail';
    } else if (this.provider === 'aws-ses') {
      // AWS SES specific settings
      config.connectionTimeout = 5000;
      config.greetingTimeout = 5000;
    } else if (this.provider === 'sendgrid') {
      // SendGrid uses 'apikey' as username
      config.auth = {
        user: 'apikey',
        pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY
      };
    }

    return config;
  }

  /**
   * Verify email configuration
   */
  async verify() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email not configured' };
    }

    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      return { success: true, provider: this.provider };
    }

    try {
      await this.transporter.verify();
      console.log('[email] SMTP connection verified successfully');
      return { success: true, provider: this.provider };
    } catch (err) {
      console.error('[email] SMTP verification failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send email with retry logic
   */
  async sendMail(options, retries = 2) {
    if (!this.isConfigured) {
      console.warn('[email] Cannot send email - not configured');
      return { success: false, error: 'Email not configured' };
    }

    const mailOptions = {
      from: options.from || process.env.EMAIL_FROM || 'noreply@csat.test',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      ...options
    };

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log(`[email] Sent to ${mailOptions.to} - MessageID: ${result.messageId}`);
        return { success: true, messageId: result.messageId, accepted: result.accepted };
      } catch (err) {
        lastError = err;
        console.error(`[email] Send attempt ${attempt + 1} failed:`, err.message);
        
        if (attempt < retries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    return { success: false, error: lastError.message };
  }

  /**
   * Send magic link authentication email
   */
  async sendMagicLink(email, token, frontendUrl) {
    const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${baseUrl}/auth/verify?token=${token}`;
    
    return this.sendMail({
      to: email,
      subject: 'Your CSAT login link',
      text: `Click here to log in: ${link}\n\nThis link expires in 24 hours.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Log in to CSAT</h2>
          <p>Click the button below to securely log in to your account:</p>
          <div style="margin: 30px 0;">
            <a href="${link}" style="background-color: #0078d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Log In</a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #0078d4; word-break: break-all;">${link}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 24 hours. If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
  }

  /**
   * Send phishing simulation email
   */
  async sendPhishingEmail(employee, template, variables) {
    return this.sendMail({
      to: employee.email,
      subject: template.subject,
      html: template.html,
      ...variables
    });
  }

  /**
   * Send campaign results email
   */
  async sendCampaignReport(adminEmail, campaignData) {
    return this.sendMail({
      to: adminEmail,
      subject: `Campaign Report: ${campaignData.name}`,
      text: `Campaign completed. View results in your dashboard.`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Campaign Report: ${campaignData.name}</h2>
          <p>Your cybersecurity awareness campaign has been completed.</p>
          <h3>Results Summary:</h3>
          <ul>
            <li>Emails Sent: ${campaignData.sent || 0}</li>
            <li>Opened: ${campaignData.opened || 0}</li>
            <li>Clicked: ${campaignData.clicked || 0}</li>
            <li>Completed Quiz: ${campaignData.completed || 0}</li>
          </ul>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/campaigns">View Full Report</a></p>
        </div>
      `
    });
  }

  /**
   * Get provider information
   */
  getInfo() {
    return {
      configured: this.isConfigured,
      provider: this.provider,
      host: process.env.SMTP_HOST || 'not configured',
      port: process.env.SMTP_PORT || 587,
      from: process.env.EMAIL_FROM || 'noreply@csat.test'
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;

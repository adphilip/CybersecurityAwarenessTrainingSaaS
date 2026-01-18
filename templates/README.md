# Phishing Email Templates

This directory contains HTML email templates for cybersecurity awareness training phishing simulations.

## Available Templates

### 1. Password Reset (`phishing-password-reset.html`)
**Scenario:** Fake IT password reset request  
**Urgency Factor:** High (30-minute expiry)  
**Target Audience:** All employees  
**Red Flags:**
- Unexpected password reset request
- Urgency pressure (30-minute timer)
- Generic greeting
- Suspicious link domain

### 2. Overdue Invoice (`phishing-invoice.html`)
**Scenario:** Fake invoice payment demand  
**Urgency Factor:** Critical (service suspension threat)  
**Target Audience:** Employees in finance, operations  
**Red Flags:**
- Unexpected invoice from unknown vendor
- Large payment amount
- Threat of service suspension
- Pressure to act immediately

### 3. Security Alert (`phishing-security-alert.html`)
**Scenario:** Suspicious login activity notification  
**Urgency Factor:** Critical (2-hour expiry)  
**Target Audience:** All employees  
**Red Flags:**
- Creates panic with security breach language
- Detailed fake login information
- Multiple urgent CTAs
- Time pressure (2-hour expiry)

### 4. HR Document (`phishing-hr-document.html`)
**Scenario:** Benefits enrollment form requiring signature  
**Urgency Factor:** Moderate (deadline pressure)  
**Target Audience:** All employees  
**Red Flags:**
- Unexpected HR document
- Requests employee credentials
- Deadline pressure
- Confidentiality notice creates false trust

### 5. Package Delivery (`phishing-package-delivery.html`)
**Scenario:** Failed package delivery requiring address verification  
**Urgency Factor:** Moderate (48-hour window)  
**Target Audience:** All employees  
**Red Flags:**
- Unexpected package notification
- Vague sender information
- Requires personal information verification
- Return-to-sender threat

## Template Variables

All templates support the following placeholder variables:

### Employee Information
- `{{employee_name}}` - Employee's full name
- `{{employee_email}}` - Employee's email address

### Company Information
- `{{company_name}}` - Company name
- `{{company_domain}}` - Company domain (e.g., example.com)

### Phishing Tracking
- `{{phishing_link}}` - Click tracking URL (redirects to quiz)
- `{{tracking_pixel_url}}` - 1x1 pixel for open tracking

### Dynamic Content
- `{{random_number}}` - Random number for invoice/document IDs
- `{{random_tracking}}` - Random tracking number
- `{{invoice_date}}` - Generated invoice date
- `{{due_date}}` - Generated due date
- `{{issue_date}}` - Generated issue date
- `{{deadline_date}}` - Generated deadline
- `{{attempt_time}}` - Generated login attempt time
- `{{attempt_location}}` - Fake login location
- `{{attempt_ip}}` - Fake IP address
- `{{attempt_device}}` - Fake device name
- `{{attempt_browser}}` - Fake browser name
- `{{delivery_time}}` - Generated delivery time
- `{{ship_date}}` - Generated shipping date
- `{{transit_date}}` - Generated transit date

## Usage

### Loading a Template

```javascript
const fs = require('fs');
const path = require('path');

function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
  return fs.readFileSync(templatePath, 'utf8');
}

const template = loadTemplate('phishing-password-reset');
```

### Replacing Variables

```javascript
function populateTemplate(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

const html = populateTemplate(template, {
  employee_name: 'John Doe',
  company_name: 'Acme Corp',
  phishing_link: 'https://your-app.com/quiz/abc123',
  tracking_pixel_url: 'https://your-app.com/phishing/open/abc123',
  random_number: Math.floor(Math.random() * 100000)
});
```

## Security Considerations

### For Training Purposes Only
These templates are designed **exclusively for authorized cybersecurity awareness training**. Unauthorized use for actual phishing attacks is:
- Illegal under anti-fraud and computer crime laws
- Unethical and harmful
- May result in criminal prosecution

### Best Practices
1. **Always obtain written authorization** before conducting phishing simulations
2. **Clearly mark training campaigns** in your system
3. **Never collect real credentials** - redirect to educational content
4. **Provide immediate feedback** when employees click phishing links
5. **Track metrics anonymously** to avoid singling out individuals
6. **Follow up with training** for employees who fall for simulations

### Template Customization
When customizing templates:
- Use realistic but obviously fake domains for links
- Don't impersonate real vendors or partners
- Avoid templates that could cause genuine distress
- Test with a small group first
- Provide clear opt-out mechanisms

## Tracking Implementation

### Email Open Tracking
Add a 1x1 transparent pixel:
```html
<img src="{{tracking_pixel_url}}" width="1" height="1" style="display:none;" alt="">
```

Implement endpoint:
```javascript
app.get('/phishing/open/:token', async (req, res) => {
  // Log open event
  await logPhishingEvent(req.params.token, 'opened');
  
  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length
  });
  res.end(pixel);
});
```

### Link Click Tracking
Replace all links with tracking URLs:
```javascript
app.get('/phishing/click/:token', async (req, res) => {
  // Log click event
  await logPhishingEvent(req.params.token, 'clicked');
  
  // Redirect to quiz
  res.redirect(`/quiz/${req.params.token}`);
});
```

## Template Design Principles

### Realism
- Use professional styling matching real corporate emails
- Include realistic sender information
- Add footer disclaimers and contact information
- Use proper branding elements

### Psychological Triggers
- **Urgency:** Time limits and deadlines
- **Authority:** Impersonate IT, HR, executives
- **Fear:** Account suspension, security threats
- **Curiosity:** Package deliveries, invoices
- **Helpfulness:** Offering verification or assistance

### Red Flags (Educational)
Each template intentionally includes detectable warning signs:
- Generic greetings
- Suspicious URLs
- Grammar/spelling issues (subtle)
- Unexpected requests
- Pressure tactics
- Too-good-to-be-true offers

## Reporting and Analytics

### Metrics to Track
- **Open Rate:** Percentage who opened the email
- **Click Rate:** Percentage who clicked the phishing link
- **Submission Rate:** Percentage who entered credentials (if applicable)
- **Report Rate:** Percentage who reported the email
- **Time to Action:** How quickly users fell for the phish

### Sample Reporting Query
```sql
SELECT 
  template_name,
  COUNT(DISTINCT employee_id) as sent_count,
  COUNT(DISTINCT CASE WHEN event_type = 'opened' THEN employee_id END) as opened_count,
  COUNT(DISTINCT CASE WHEN event_type = 'clicked' THEN employee_id END) as clicked_count,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'clicked' THEN employee_id END) / 
        COUNT(DISTINCT employee_id), 2) as click_rate
FROM phishing_events pe
JOIN campaigns c ON pe.campaign_id = c.id
JOIN phishing_templates pt ON c.phishing_template_id = pt.id
WHERE c.id = $1
GROUP BY template_name;
```

## License

These templates are provided for educational purposes as part of the Cybersecurity Awareness Training SaaS platform. Use responsibly and ethically.

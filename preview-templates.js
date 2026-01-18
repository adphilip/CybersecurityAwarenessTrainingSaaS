/**
 * Generate preview HTML files with populated variables
 * Usage: node preview-templates.js
 */

const fs = require('fs');
const path = require('path');
const { getAvailableTemplates, populateTemplate, loadTemplate } = require('./lib/phishing');

const outputDir = path.join(__dirname, 'preview');

// Test variables
const testVariables = {
  employee_name: 'Jane Smith',
  employee_email: 'jane.smith@acmecorp.com',
  company_name: 'Acme Corporation',
  company_domain: 'acmecorp.com',
  phishing_link: 'http://localhost:3000/quiz/test-token-preview',
  tracking_pixel_url: 'http://localhost:4000/phishing/open/test-token-preview'
};

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

console.log('=== Generating Template Previews ===\n');

const templates = getAvailableTemplates();

templates.forEach(template => {
  try {
    const html = loadTemplate(template.id);
    const populated = populateTemplate(html, testVariables);
    
    const outputPath = path.join(outputDir, `${template.id}-preview.html`);
    fs.writeFileSync(outputPath, populated);
    
    console.log(`✅ Generated: ${template.name}`);
    console.log(`   File: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error with ${template.name}:`, error.message);
  }
});

console.log(`\n✅ Preview files created in: ${outputDir}`);
console.log('\nTo view:');
console.log(`  open ${outputDir}/phishing-password-reset-preview.html`);
console.log(`  # or open all: open ${outputDir}/*.html\n`);

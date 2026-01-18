/**
 * Test script for phishing email templates
 * Run with: node test-phishing-templates.js
 */

const { getAvailableTemplates, populateTemplate, loadTemplate } = require('./lib/phishing');

console.log('=== Phishing Email Templates Test ===\n');

// List all available templates
const templates = getAvailableTemplates();
console.log(`Found ${templates.length} templates:\n`);

templates.forEach((template, index) => {
  console.log(`${index + 1}. ${template.name}`);
  console.log(`   ID: ${template.id}`);
  console.log(`   Subject: ${template.subject}`);
  console.log(`   Description: ${template.description}`);
  console.log(`   Urgency: ${template.urgency} | Difficulty: ${template.difficulty}`);
  console.log('');
});

// Test template loading and population
console.log('\n=== Testing Template Population ===\n');

const testVariables = {
  employee_name: 'John Doe',
  employee_email: 'john.doe@acmecorp.com',
  company_name: 'Acme Corporation',
  company_domain: 'acmecorp.com',
  phishing_link: 'https://your-training-app.com/quiz/test123abc',
  tracking_pixel_url: 'https://your-training-app.com/phishing/open/test123abc'
};

try {
  const templateName = 'phishing-password-reset';
  const template = loadTemplate(templateName);
  const populated = populateTemplate(template, testVariables);
  
  console.log(`✅ Successfully loaded template: ${templateName}`);
  console.log(`✅ Template size: ${template.length} bytes`);
  console.log(`✅ Populated template size: ${populated.length} bytes`);
  console.log(`✅ Variables replaced successfully`);
  
  // Check if all variables were replaced
  const unreplacedVars = populated.match(/{{([^}]+)}}/g);
  if (unreplacedVars) {
    console.log(`⚠️  Warning: Some variables not replaced: ${unreplacedVars.join(', ')}`);
  } else {
    console.log(`✅ All variables replaced`);
  }
  
  console.log('\n=== Template Preview (first 500 chars) ===\n');
  console.log(populated.substring(0, 500) + '...\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n=== Test Complete ===');
console.log('\nTo preview templates visually:');
console.log('1. Open any template HTML file in a browser');
console.log('2. Or integrate with your email sending service');
console.log('3. Test with a small group before full campaign\n');

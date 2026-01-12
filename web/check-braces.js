const fs = require('node:fs');
const content = fs.readFileSync('pages/employees.tsx', 'utf8');
const lines = content.split('\n');

let depth = 0;
let inString = false;
let inTemplate = false;
let stringChar = '';
let escape = false;

for (let i = 0; i < Math.min(lines.length, 125); i++) {
  const line = lines[i];
  
  for (const char of line) {
    
    // Handle escape sequences
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    // Handle strings
    if (!inString && !inTemplate && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar) {
      inString = false;
      continue;
    }
    
    // Handle template literals
    if (!inString && char === '`') {
      inTemplate = !inTemplate;
      continue;
    }
    
    // Count braces outside of strings/templates
    if (!inString && !inTemplate) {
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
  }
  
  // Reset string states at line end (but not template)
  if (!inTemplate) {
    inString = false;
    escape = false;
  }
  
  if (i >= 50 && i <= 92) {
    console.log(`Line ${i+1}: depth=${depth} | ${line.trim().substring(0, 60)}`);
  }
}

console.log(`\nFinal depth at line 125: ${depth}`);

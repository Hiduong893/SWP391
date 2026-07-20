const fs = require('fs');
const path = require('path');

const dir = 'd:/LEARN/SE V SU26/SWP391/Project SU26/SWP391/client/src/pages/CSKHDashboard';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace colors with variables
  content = content.replace(/'#e2e8f0'/g, '`var(--cskh-text)`');
  content = content.replace(/'#94a3b8'/g, '`var(--cskh-text-muted)`');
  content = content.replace(/'#cbd5e1'/g, '`var(--cskh-text-muted)`');
  content = content.replace(/'#64748b'/g, '`var(--cskh-text-dim)`');
  content = content.replace(/'#475569'/g, '`var(--cskh-text-dim)`');
  content = content.replace(/'rgba\(255,255,255,0.04\)'/g, '`var(--cskh-border-light)`');
  content = content.replace(/'rgba\(255,255,255,0.03\)'/g, '`var(--cskh-surface-2)`');

  // Some might not have quotes around rgba in the regex replace if they are in template literals, but they are in style objects so they have quotes.
  content = content.replace(/rgba\(255,255,255,0\.04\)/g, 'var(--cskh-border-light)');
  content = content.replace(/rgba\(255,255,255,0\.03\)/g, 'var(--cskh-surface-2)');
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${f}`);
});

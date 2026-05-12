#!/usr/bin/env node
/**
 * Pre-deployment sanity check
 */

const fs = require('fs');
const path = require('path');

// Absolute path to web directory
const webDir = path.resolve(__dirname);

const checks = [
  {
    name: 'Check capturedCompany state variable exists',
    file: 'src/components/ChatWidget.jsx',
    pattern: /const \[capturedCompany,\s*setCapturedCompany\]/,
    expected: true
  },
  {
    name: 'Check company in lead capture finalize',
    file: 'src/components/ChatWidget.jsx',
    pattern: /setCapturedCompany\(data\.company/,
    expected: true
  },
  {
    name: 'Check company in API response mapping',
    file: 'src/app/api/chat/route.js',
    pattern: /company:\s*leadData\.company/,
    expected: true
  },
  {
    name: 'No duplicate useEffect imports in ChatWidget',
    file: 'src/components/ChatWidget.jsx',
    pattern: /import.*useEffect.*from/is,
    expected: 1 // should appear only once
  },
  {
    name: 'No js-cookie imports remaining',
    file: 'src/utils/personalization.js',
    pattern: /import.*js-cookie/is,
    expected: false
  },
  {
    name: 'Analytics imported in ChatWidget',
    file: 'src/components/ChatWidget.jsx',
    pattern: /import.*analytics.*from/i,
    expected: true
  },
  {
    name: 'Consent prompt UI element exists',
    file: 'src/components/ChatWidget.jsx',
    pattern: /showConsentPrompt/,
    expected: true
  },
  {
    name: 'Dwell time config defined',
    file: 'src/components/ChatWidget.jsx',
    pattern: /dwellTimeMs:/,
    expected: true
  },
  {
    name: 'Knowledge cache function exists',
    file: 'src/app/api/chat/route.js',
    pattern: /async function getCachedKnowledgeBase/,
    expected: true
  },
  {
    name: 'Locales en.js exists',
    file: 'src/locales/en.js',
    pattern: /export default/,
    expected: true
  },
  {
    name: 'Locales sw.js exists',
    file: 'src/locales/sw.js',
    pattern: /export default/,
    expected: true
  }
];

console.log('=== Pre-Deployment Sanity Check ===\n');

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const fullPath = path.join(webDir, check.file);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${check.name}: FILE NOT FOUND (${check.file})`);
    failed++;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const matches = content.match(check.pattern) || [];
  const count = matches.length;

  let ok;
  if (typeof check.expected === 'boolean') {
    ok = check.expected ? count > 0 : count === 0;
  } else {
    ok = count === check.expected;
  }

  if (ok) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name}: expected ${JSON.stringify(check.expected)}, got ${count} matches`);
    failed++;
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}/${checks.length}`);
console.log(`Failed: ${failed}/${checks.length}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\nAll sanity checks passed! 🚀");
  process.exit(0);
}

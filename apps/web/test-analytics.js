#!/usr/bin/env node
/**
 * Analytics Endpoint Test Script
 * Validates the /api/analytics/log endpoint and database integration
 *
 * Usage: node test-analytics.js [baseUrl]
 * Example: node test-analytics.js https://staging.sokogate.com
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const ANALYTICS_ENDPOINT = `${BASE_URL}/api/analytics/log`;

console.log(`=== Analytics Endpoint Test ===`);
console.log(`Target: ${ANALYTICS_ENDPOINT}\n`);

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Reject empty payload
  console.log('Test 1: Reject empty payload');
  try {
    const res = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status === 400) {
      console.log('  ✅ Returns 400 for empty payload');
      passed++;
    } else {
      console.log(`  ❌ Expected 400, got ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    failed++;
  }

  // Test 2: Reject non-array events
  console.log('Test 2: Reject non-array events');
  try {
    const res = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: "not an array" }),
    });
    if (res.status === 400) {
      console.log('  ✅ Returns 400 for non-array');
      passed++;
    } else {
      console.log(`  ❌ Expected 400, got ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    failed++;
  }

  // Test 3: Accept valid single event
  console.log('Test 3: Accept valid single event');
  const testVisitorId = `vis_test_${Date.now()}`;
  try {
    const res = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            type: 'test_ingest',
            visitorId: testVisitorId,
            timestamp: Date.now(),
            test: true,
          },
        ],
      }),
    });
    if (res.status === 200) {
      const data = await res.json();
      if (data.success && data.received === 1) {
        console.log('  ✅ Single event accepted with success response');
        passed++;
      } else {
        console.log(`  ❌ Unexpected response: ${JSON.stringify(data)}`);
        failed++;
      }
    } else {
      const err = await res.text();
      console.log(`  ❌ Expected 200, got ${res.status}: ${err}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    failed++;
  }

  // Test 4: Batch 10 events
  console.log('Test 4: Batch 10 events');
  const batchSize = 10;
  const batchVisitorId = `vis_batch_${Date.now()}`;
  try {
    const events = Array.from({ length: batchSize }, (_, i) => ({
      type: i % 2 === 0 ? 'message_sent' : 'stage_advanced',
      visitorId: batchVisitorId,
      timestamp: Date.now() - (batchSize - i) * 1000,
      role: i % 2 === 0 ? 'user' : 'system',
      fromStage: 'greeting',
      toStage: 'needs',
    }));
    const res = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    if (res.status === 200) {
      const data = await res.json();
      if (data.success && data.received === batchSize) {
        console.log(`  ✅ Batch of ${batchSize} events accepted`);
        passed++;
      } else {
        console.log(`  ❌ Received count mismatch: ${data.received} vs expected ${batchSize}`);
        failed++;
      }
    } else {
      console.log(`  ❌ Expected 200, got ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    failed++;
  }

  // Test 5: Reject >100 events (max batch size)
  console.log('Test 5: Reject oversized batch (>100 events)');
  try {
    const largeBatch = Array.from({ length: 101 }, (_, i) => ({
      type: 'test_overflow',
      visitorId: 'vis_overflow',
      timestamp: Date.now() + i,
    }));
    const res = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: largeBatch }),
    });
    if (res.status === 400) {
      console.log('  ✅ Rejected batch >100 events');
      passed++;
    } else {
      console.log(`  ❌ Expected 400, got ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    failed++;
  }

  // Test 6: Verify summary endpoint works
  console.log('Test 6: Summary endpoint accessible');
  try {
    const res = await fetch(`${BASE_URL}/api/analytics/summary?days=1`);
    if (res.status === 200) {
      const data = await res.json();
      if (data.summary && data.daily_trends) {
        console.log('  ✅ Summary endpoint returns structured data');
        console.log(`     Unique visitors: ${data.summary.unique_visitors}`);
        console.log(`     Total events: ${data.summary.total_events}`);
        passed++;
      } else {
        console.log('  ❌ Missing expected fields in summary');
        failed++;
      }
    } else {
      console.log(`  ❌ Expected 200, got ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    failed++;
  }

  // Summary
  console.log(`\n=== RESULTS ===`);
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    console.log('\n🔴 Some tests failed. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n🟢 All analytics tests passed!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

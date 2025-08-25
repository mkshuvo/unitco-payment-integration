#!/usr/bin/env node

/**
 * Test POST /integration/unit/application-forms
 * Usage:
 *   node scripts/test-application-form.js
 *   API_URL=http://localhost:41873 node scripts/test-application-form.js
 */

const API_URL = process.env.API_URL || 'http://localhost:41873';

async function main() {
  if (typeof fetch === 'undefined') {
    console.error('Node 18+ required for native fetch.');
    process.exit(1);
  }

  const url = `${API_URL}/integration/unit/application-forms`;
  console.log('POST', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: { source: 'script' } }),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }

    if (!res.ok) {
      console.error('❌ Request failed', res.status, res.statusText, json);
      process.exit(1);
    }

    console.log('✅ OK', json);
  } catch (e) {
    console.error('❌ Error', e?.message || e);
    process.exit(1);
  }
}

main();

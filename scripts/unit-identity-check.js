#!/usr/bin/env node

// Quick connectivity check to Unit API using the official SDK
// Usage (PowerShell):
//   $env:UNIT_API_KEY="<your-token>"; node scripts/unit-identity-check.js
// Optionally:
//   $env:UNIT_BASE_URL="https://api.s.unit.sh"  (default)

const { Unit } = require('@unit-finance/unit-node-sdk');
// set dotenv
require('dotenv').config();
const BASE_URL = (process.env.UNIT_BASE_URL || 'https://api.s.unit.sh').replace(/\/\/+$/, '');
const TOKEN = process.env.UNIT_API_KEY;

if (!TOKEN) {
  console.error('UNIT_API_KEY is not set. Aborting.');
  process.exit(1);
}

const unit = new Unit(TOKEN, BASE_URL);

(async () => {
  try {
    // Use the official SDK public API for a lightweight connectivity check
    // This avoids relying on internal/protected methods.
    const res = await unit.customers.list();

    console.log('✅ Unit SDK connectivity check succeeded');
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    if (err && err.isUnitError) {
      console.error('❌ Unit SDK connectivity check failed with UnitError');
      console.error(JSON.stringify(err, null, 2));
    } else {
      console.error('❌ Unit SDK connectivity check error:', err && err.message ? err.message : err);
    }
    process.exit(1);
  }
})();

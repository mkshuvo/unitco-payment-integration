#!/usr/bin/env node

/**
 * Test the bank API endpoint
 * Usage: node scripts/test-api.js
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:41873';

// Valid Chase routing number for testing
const testData = {
  holderName: 'John Doe',
  accountType: 'checking',
  routingNumber: '021000021', // Valid Chase routing number
  accountNumber: '1234567890',
  address1: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  makePrimary: true,
};

async function testHealth() {
  console.log('Testing health endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testBankApi() {
  console.log('\nTesting bank API endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/providers/me/bank-accounts/ach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Bank API test passed');
      console.log('Response:', {
        accountId: data.accountId,
        bankName: data.bankName,
        mask: data.mask,
        method: data.method,
        unitCounterpartyStatus: data.unitCounterpartyStatus,
      });
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Bank API test failed:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Bank API test failed:', error.message);
    return false;
  }
}

async function testInvalidRouting() {
  console.log('\nTesting invalid routing number...');
  
  const invalidData = { ...testData, routingNumber: '123456789' };
  
  try {
    const response = await fetch(`${API_BASE}/providers/me/bank-accounts/ach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData),
    });

    if (response.status === 400) {
      console.log('✅ Invalid routing validation working');
      return true;
    } else {
      console.log('❌ Invalid routing should have returned 400, got:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Invalid routing test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing UnitCo Payment Integration API\n');
  
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('\n❌ API is not running. Start with: docker compose up -d --build');
    process.exit(1);
  }
  
  const bankOk = await testBankApi();
  const validationOk = await testInvalidRouting();
  
  if (bankOk && validationOk) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

// Use fetch if available (Node 18+), otherwise use node-fetch
if (typeof fetch === 'undefined') {
  console.log('⚠️  Node.js version < 18 detected. Install node-fetch or upgrade Node.js.');
  process.exit(1);
}

main().catch(console.error);

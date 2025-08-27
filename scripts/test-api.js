#!/usr/bin/env node

/**
 * Test the bank API endpoint
 * Usage: node scripts/test-api.js
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:56482';

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

async function testSecurityWithoutAuth() {
  console.log('\n🔒 Testing security without authentication...');
  
  try {
    const response = await fetch(`${API_BASE}/providers/me/bank-accounts/ach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (response.status === 401) {
      console.log('✅ Security working - Protected endpoint blocked without auth');
      return true;
    } else {
      console.log('❌ Security FAILED - Protected endpoint accessible without auth:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Security test failed:', error.message);
    return false;
  }
}

async function testPublicEndpoints() {
  console.log('\n🌐 Testing public endpoints...');
  
  try {
    // Test health endpoint (should be accessible)
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthOk = healthResponse.ok;
    console.log(`${healthOk ? '✅' : '❌'} Health endpoint: ${healthOk ? 'ACCESSIBLE' : 'BLOCKED'} (${healthResponse.status})`);
    
    // Test root endpoint (should be accessible)
    const rootResponse = await fetch(`${API_BASE}/`);
    const rootOk = rootResponse.ok;
    console.log(`${rootOk ? '✅' : '❌'} Root endpoint: ${rootOk ? 'ACCESSIBLE' : 'BLOCKED'} (${rootResponse.status})`);
    
    return healthOk && rootOk;
  } catch (error) {
    console.log('❌ Public endpoints test failed:', error.message);
    return false;
  }
}

async function testProtectedEndpoints() {
  console.log('\n🛡️  Testing protected endpoints without auth...');
  
  const endpoints = [
    { path: '/auth/me', method: 'GET' },
    { path: '/providers/me/bank-accounts', method: 'GET' },
    { path: '/integration/unit/status', method: 'GET' },
    { path: '/api/keys', method: 'GET' }
  ];
  
  let allBlocked = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`, {
        method: endpoint.method
      });
      
      const isBlocked = response.status === 401;
      console.log(`${isBlocked ? '✅' : '❌'} ${endpoint.method} ${endpoint.path}: ${isBlocked ? 'BLOCKED' : 'ACCESSIBLE'} (${response.status})`);
      
      if (!isBlocked) allBlocked = false;
    } catch (error) {
      console.log(`❌ Error testing ${endpoint.path}:`, error.message);
      allBlocked = false;
    }
  }
  
  return allBlocked;
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
  console.log('🛡️  SECURITY END-TO-END TESTING\n');
  console.log('=====================================\n');
  
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('\n❌ API is not running. Start with: docker compose up -d --build');
    process.exit(1);
  }
  
  const publicOk = await testPublicEndpoints();
  const protectedOk = await testProtectedEndpoints();
  const securityOk = await testSecurityWithoutAuth();
  
  console.log('\n📊 SECURITY TEST RESULTS');
  console.log('=========================');
  console.log(`${publicOk ? '✅' : '❌'} Public Endpoints: ${publicOk ? 'PASS' : 'FAIL'}`);
  console.log(`${protectedOk ? '✅' : '❌'} Protected Endpoints: ${protectedOk ? 'PASS' : 'FAIL'}`);
  console.log(`${securityOk ? '✅' : '❌'} Authentication Required: ${securityOk ? 'PASS' : 'FAIL'}`);
  
  const allPassed = publicOk && protectedOk && securityOk;
  
  console.log('\n🎯 OVERALL SECURITY STATUS');
  console.log('===========================');
  console.log(`${allPassed ? '🟢 SECURITY IMPLEMENTATION: SUCCESSFUL' : '🔴 SECURITY IMPLEMENTATION: NEEDS ATTENTION'}`);
  
  if (allPassed) {
    console.log('\n✅ All security measures are working correctly!');
    console.log('   - Public endpoints accessible');
    console.log('   - Protected endpoints require authentication');
    console.log('   - Global JWT guard is active');
  } else {
    console.log('\n⚠️  Some security tests failed. Review the results above.');
    process.exit(1);
  }
}

// Use fetch if available (Node 18+), otherwise use node-fetch
if (typeof fetch === 'undefined') {
  console.log('⚠️  Node.js version < 18 detected. Install node-fetch or upgrade Node.js.');
  process.exit(1);
}

main().catch(console.error);

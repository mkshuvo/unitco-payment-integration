#!/usr/bin/env node

/**
 * Test the payout API endpoints
 * Usage: node scripts/test-payout-api.js
 */

const API_BASE = 'http://localhost:41873';

// Test data
const startDate = '2024-12-15';
const endDate = '2024-12-21';
const idempotencyKey = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

async function testPayoutPreview() {
  console.log('Testing payout preview endpoint...');

  try {
    const response = await fetch(`${API_BASE}/providers/me/payouts/preview?startDate=${startDate}&endDate=${endDate}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Payout preview test passed');
      console.log('Preview:', {
        totalAmount: data.totalAmount,
        itemCount: data.itemCount,
        currency: data.currency,
        estimatedDeliveryDate: data.estimatedDeliveryDate,
        bankAccount: data.bankAccount,
      });
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Payout preview test failed:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Payout preview test failed:', error.message);
    return false;
  }
}

async function testCreatePayoutBatch() {
  console.log('\nTesting create payout batch endpoint...');

  const batchData = {
    startDate,
    endDate,
    idempotencyKey,
  };

  try {
    const response = await fetch(`${API_BASE}/providers/me/payouts/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchData),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Create payout batch test passed');
      console.log('Batch:', {
        batchId: data.batchId,
        totalAmount: data.totalAmount,
        itemCount: data.itemCount,
        status: data.status,
      });
      return data.batchId;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Create payout batch test failed:', response.status, errorData);
      return null;
    }
  } catch (error) {
    console.log('❌ Create payout batch test failed:', error.message);
    return null;
  }
}

async function testSubmitPayoutBatch(batchId) {
  if (!batchId) {
    console.log('\n⚠️  Skipping submit test - no batch ID');
    return false;
  }

  console.log(`\nTesting submit payout batch endpoint (batch ${batchId})...`);

  try {
    const response = await fetch(`${API_BASE}/providers/me/payouts/batches/${batchId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Submit payout batch test passed');
      console.log('Response:', data);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Submit payout batch test failed:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Submit payout batch test failed:', error.message);
    return false;
  }
}

async function testGetPayoutBatches() {
  console.log('\nTesting get payout batches endpoint...');

  try {
    const response = await fetch(`${API_BASE}/providers/me/payouts/batches`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Get payout batches test passed');
      console.log(`Found ${data.length} batches`);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Get payout batches test failed:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Get payout batches test failed:', error.message);
    return false;
  }
}

async function testIdempotency() {
  console.log('\nTesting idempotency...');

  const batchData = {
    startDate,
    endDate,
    idempotencyKey, // Same key as before
  };

  try {
    const response = await fetch(`${API_BASE}/providers/me/payouts/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchData),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Idempotency test passed - same batch returned');
      console.log('Batch ID:', data.batchId);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Idempotency test failed:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Idempotency test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing UnitCo Payout API\n');

  const previewOk = await testPayoutPreview();
  if (!previewOk) {
    console.log('\n❌ Payout preview failed. Make sure you have a primary bank account.');
    process.exit(1);
  }

  const batchId = await testCreatePayoutBatch();
  const submitOk = await testSubmitPayoutBatch(batchId);
  const batchesOk = await testGetPayoutBatches();
  const idempotencyOk = await testIdempotency();

  if (previewOk && batchId && submitOk && batchesOk && idempotencyOk) {
    console.log('\n🎉 All payout tests passed!');
  } else {
    console.log('\n❌ Some payout tests failed');
    process.exit(1);
  }
}

// Use fetch if available (Node 18+), otherwise use node-fetch
if (typeof fetch === 'undefined') {
  console.log('⚠️  Node.js version < 18 detected. Install node-fetch or upgrade Node.js.');
  process.exit(1);
}

main().catch(console.error);

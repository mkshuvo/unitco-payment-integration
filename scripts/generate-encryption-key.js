#!/usr/bin/env node

/**
 * Generate a secure encryption key for the application
 * Usage: node scripts/generate-encryption-key.js
 */

const crypto = require('crypto');

// Generate a random 32-byte (256-bit) key
const key = crypto.randomBytes(32);

// Encode as base64
const base64Key = key.toString('base64');

console.log('Generated encryption key:');
console.log(base64Key);
console.log('\nAdd this to your .env file:');
console.log(`ENCRYPTION_KEY=${base64Key}`);
console.log('\nOr set it in docker-compose.yml environment section.');

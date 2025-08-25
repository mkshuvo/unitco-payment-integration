-- Migration: Add unit_customer_id column to users table
-- Date: 2025-08-25

ALTER TABLE users
  ADD COLUMN unit_customer_id VARCHAR(64) NULL;

CREATE UNIQUE INDEX uq_user_unit_customer ON users (unit_customer_id);

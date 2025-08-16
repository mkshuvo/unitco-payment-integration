-- Migration: Add Unit-specific columns to bank_account table
-- Date: 2024-12-21

-- Add new columns to bank_account table
ALTER TABLE bank_account
  ADD COLUMN unit_counterparty_id VARCHAR(128) NULL,
  ADD COLUMN unit_counterparty_status ENUM('PENDING','ACTIVE','REJECTED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN mask VARCHAR(8) NULL,
  ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN method ENUM('ACH','WIRE') NOT NULL DEFAULT 'ACH',
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'USD';

-- Add indexes for performance
CREATE UNIQUE INDEX uq_unit_counterparty ON bank_account (unit_counterparty_id);
CREATE INDEX idx_bank_account_user ON bank_account (user_id);
CREATE INDEX idx_bank_account_status ON bank_account (status);
CREATE INDEX idx_bank_account_primary ON bank_account (user_id, is_primary);

-- Add indexes to bank_branch table if they don't exist
CREATE INDEX idx_bank_branch_routing ON bank_branch (country, routing);
CREATE INDEX idx_bank_branch_swift ON bank_branch (swift);

-- Update existing records to have proper defaults
UPDATE bank_account SET 
  status = 'ACTIVE',
  method = 'ACH',
  currency = 'USD'
WHERE status IS NULL OR method IS NULL OR currency IS NULL;

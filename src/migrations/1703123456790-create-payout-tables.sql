-- Migration: Create payout tables
-- Date: 2024-12-21

-- Create payout_batch table
CREATE TABLE payout_batch (
  batch_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  item_count INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status ENUM('PENDING','SUBMITTED','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  unit_batch_id VARCHAR(128) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT UNSIGNED NOT NULL,
  updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_payout_batch_user (user_id),
  INDEX idx_payout_batch_status (status),
  INDEX idx_payout_batch_dates (start_date, end_date),
  INDEX idx_payout_batch_idempotency (idempotency_key)
);

-- Create payout_item table
CREATE TABLE payout_item (
  item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  description VARCHAR(255) NOT NULL,
  reference_id VARCHAR(128) NOT NULL,
  status ENUM('PENDING','SUBMITTED','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  unit_payment_id VARCHAR(128) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT UNSIGNED NOT NULL,
  updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES payout_batch(batch_id) ON DELETE CASCADE,
  INDEX idx_payout_item_batch (batch_id),
  INDEX idx_payout_item_user (user_id),
  INDEX idx_payout_item_status (status),
  INDEX idx_payout_item_reference (reference_id)
);

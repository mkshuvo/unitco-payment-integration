-- Seed base roles
INSERT INTO `roles` (`name`, `description`, `is_system`)
VALUES
  ('ADMIN', 'Full administrative access', 1),
  ('ACCOUNTANT', 'Manage payouts and banking operations', 1),
  ('USER', 'Standard user with self-service capabilities', 1)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  is_system = VALUES(is_system);

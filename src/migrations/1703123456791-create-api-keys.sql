-- Create api_keys table for storing encrypted Unit API keys
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `encrypted_secret` text NOT NULL,
  `fingerprint` varchar(12) NOT NULL,
  `mask` varchar(20) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_api_keys_fingerprint` (`fingerprint`),
  KEY `IDX_api_keys_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

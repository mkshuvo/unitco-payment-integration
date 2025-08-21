-- Baseline creation of bank_branch and bank_account tables

CREATE TABLE IF NOT EXISTS `bank_branch` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `swift` varchar(11) DEFAULT NULL,
  `routing` varchar(9) DEFAULT NULL,
  `bank_name` varchar(100) NOT NULL,
  `reuse` tinyint(1) NOT NULL DEFAULT 1,
  `country` char(2) NOT NULL DEFAULT 'US',
  `address1` varchar(100) DEFAULT NULL,
  `address2` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` char(2) DEFAULT NULL,
  `zip` varchar(10) DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int unsigned NOT NULL,
  `updated_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bank_account` (
  `account_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `encrypted_account_number` varchar(100) DEFAULT NULL,
  `encrypted_account_holder_name` varchar(100) DEFAULT NULL,
  `encrypted_iban` varchar(34) DEFAULT NULL,
  `encrypted_swift_code` varchar(11) DEFAULT NULL,
  `encrypted_sort_code` varchar(8) DEFAULT NULL,
  `encrypted` tinyint(1) NOT NULL DEFAULT 0,
  `address1` varchar(100) DEFAULT NULL,
  `address2` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` char(2) DEFAULT NULL,
  `zip` varchar(10) DEFAULT NULL,
  `country` char(2) NOT NULL DEFAULT 'US',
  `created_by` int unsigned NOT NULL,
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int unsigned NOT NULL,
  `updated_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  KEY `IDX_bank_account_user` (`user_id`),
  CONSTRAINT `FK_bank_account_branch` FOREIGN KEY (`branch_id`) REFERENCES `bank_branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

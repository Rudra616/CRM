-- ============================================================
--  UserHub – Full Database Schema (Rebuilt)
--  Tables: role, user, admin, user_token, admin_token
-- ============================================================

CREATE DATABASE IF NOT EXISTS userhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE userhub;

-- ─── 1. role ─────────────────────────────────────────────────
-- Stores role definitions used by the admin table only.
CREATE TABLE IF NOT EXISTS `role` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `name`       ENUM('admin','subadmin') NOT NULL UNIQUE,
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed roles
INSERT IGNORE INTO `role` (`name`) VALUES ('admin'), ('subadmin');

-- ─── 2. user ─────────────────────────────────────────────────
-- Plain users only – no role column.
CREATE TABLE IF NOT EXISTS `user` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)      NOT NULL UNIQUE,
  `password`   VARCHAR(255)     NOT NULL,
  `first_name` VARCHAR(50)      NOT NULL,
  `last_name`  VARCHAR(50)      NOT NULL,
  `phone`      VARCHAR(15)      NOT NULL,
  `email`      VARCHAR(100)     NOT NULL UNIQUE,
  `gender`     ENUM('male','female','other') DEFAULT NULL,
  `image_url`  VARCHAR(500)     DEFAULT NULL,
  `status`     ENUM('active','pending','inactive','delete') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_status` (`status`),
  KEY `idx_user_email`  (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. admin ────────────────────────────────────────────────
-- Both admin and subadmin rows live here.
-- role column references the `role` table name column.
CREATE TABLE IF NOT EXISTS `admin` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)      NOT NULL UNIQUE,
  `password`   VARCHAR(255)     NOT NULL,
  `first_name` VARCHAR(50)      NOT NULL,
  `last_name`  VARCHAR(50)      NOT NULL,
  `phone`      VARCHAR(15)      NOT NULL,
  `email`      VARCHAR(100)     NOT NULL UNIQUE,
  `gender`     ENUM('male','female','other') DEFAULT NULL,
  `image_url`  VARCHAR(500)     DEFAULT NULL,
  `role`       ENUM('admin','subadmin') NOT NULL DEFAULT 'admin',
  `status`     ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_role`  (`role`),
  KEY `idx_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin account  (password: Admin@1234)
INSERT IGNORE INTO `admin`
  (`username`, `password`, `first_name`, `last_name`, `phone`, `email`, `role`)
VALUES
  (
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin@1234 (bcrypt)
    'Super',
    'Admin',
    '0000000000',
    'admin@userhub.com',
    'admin'
  );

-- ─── 4. user_token ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_token` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED     NOT NULL,
  `username`   VARCHAR(50)      NOT NULL,
  `token`      TEXT             NOT NULL,
  `expires_at` DATETIME         NOT NULL,
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_token_user_id` (`user_id`),
  CONSTRAINT `fk_user_token_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. admin_token ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admin_token` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `admin_id`   INT UNSIGNED     NOT NULL,
  `username`   VARCHAR(50)      NOT NULL,
  `token`      TEXT             NOT NULL,
  `expires_at` DATETIME         NOT NULL,
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_token_admin_id` (`admin_id`),
  CONSTRAINT `fk_admin_token_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

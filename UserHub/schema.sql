-- UserHub Database Schema
-- Run this to create/ensure admin tables exist (admin is separate from users)

-- Users table: role_id 2 = subadmin, 3 = user (NO admin in users table)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role_id INT NOT NULL,
  status ENUM('active','pending','inactive','delete') NOT NULL DEFAULT 'active',
  image_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If users table exists without image_url: ALTER TABLE users ADD COLUMN image_url VARCHAR(500) DEFAULT NULL;
-- If users table exists without status:
-- ALTER TABLE users ADD COLUMN status ENUM('active','pending','inactive','delete') NOT NULL DEFAULT 'active';

-- Admin table: separate from users
CREATE TABLE IF NOT EXISTS admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  image_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If admin table exists without image_url: ALTER TABLE admin ADD COLUMN image_url VARCHAR(500) DEFAULT NULL;

-- User tokens (for subadmin, user sessions)
CREATE TABLE IF NOT EXISTS user_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(100) NOT NULL,
  role_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin tokens (for admin sessions)
CREATE TABLE IF NOT EXISTS admin_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  username VARCHAR(100) NOT NULL,
  role_id INT DEFAULT 1,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create an admin (password: Admin@123 - change after first login)
-- INSERT INTO admin (username, password, email) VALUES ('admin', '$2b$10$...', 'admin@example.com');
-- Use bcrypt to hash password before inserting.

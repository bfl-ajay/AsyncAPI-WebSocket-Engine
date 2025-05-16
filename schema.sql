-- Create the database
CREATE DATABASE IF NOT EXISTS userdb;
USE userdb;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  client_ip VARCHAR(100),
  client_agent VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stored procedure to create user
DELIMITER //
CREATE PROCEDURE sp_create_user(
  IN p_name VARCHAR(100),
  IN p_email VARCHAR(100),
  IN p_password VARCHAR(255),
  OUT p_user_id INT
)
BEGIN
  INSERT INTO users (name, email, password)
  VALUES (p_name, p_email, p_password);
  SET p_user_id = LAST_INSERT_ID();
END //
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_delete_user (
    IN p_id INT,
    OUT p_name VARCHAR(255),
    OUT p_email VARCHAR(255)
)
BEGIN
    SELECT name, email INTO p_name, p_email FROM users WHERE id = p_id;
    DELETE FROM users WHERE id = p_id;
END $$
DELIMITER ;
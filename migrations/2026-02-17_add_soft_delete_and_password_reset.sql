-- Add soft delete support for products and temporary password reset tokens.
-- Safe to run multiple times.

SET @schema_name = DATABASE();

SET @has_is_active = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'articles'
    AND COLUMN_NAME = 'is_active'
);

SET @sql_stmt = IF(
  @has_is_active = 0,
  'ALTER TABLE articles ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE articles
SET is_active = 1
WHERE is_active IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  id_client INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_password_reset_tokens_client
    FOREIGN KEY (id_client)
    REFERENCES clients(id_client)
    ON DELETE CASCADE
);

SET @has_token_hash_index = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'password_reset_tokens'
    AND INDEX_NAME = 'idx_password_reset_token_hash'
);

SET @sql_stmt = IF(
  @has_token_hash_index = 0,
  'CREATE INDEX idx_password_reset_token_hash ON password_reset_tokens (token_hash)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_client_index = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'password_reset_tokens'
    AND INDEX_NAME = 'idx_password_reset_client'
);

SET @sql_stmt = IF(
  @has_client_index = 0,
  'CREATE INDEX idx_password_reset_client ON password_reset_tokens (id_client)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  userId BIGINT UNSIGNED NOT NULL,

  tokenHash VARCHAR(255) NOT NULL,

  expiresAt DATETIME NOT NULL,

  usedAt DATETIME NULL,

  createdAt DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (userId)
    REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_password_reset_user (
    userId
  ),

  INDEX idx_password_reset_token (
    tokenHash
  )
);
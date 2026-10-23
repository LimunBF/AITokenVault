-- AI Token Vault — schema MySQL/MariaDB (cPanel)
-- Jalankan di phpMyAdmin: pilih database, tab SQL, paste semua, Go.
-- Catatan: prefix tabel pakai atv_ supaya aman kalau DB dipakai bareng app lain.

CREATE TABLE IF NOT EXISTS atv_users (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  status        ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at   DATETIME     NULL,
  deleted_at    DATETIME     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS atv_sessions (
  token      CHAR(64)  NOT NULL PRIMARY KEY,
  user_id    CHAR(36)  NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME  NOT NULL,
  CONSTRAINT fk_atv_sessions_user FOREIGN KEY (user_id)
    REFERENCES atv_users(id) ON DELETE CASCADE,
  INDEX idx_atv_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS atv_providers (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36)     NOT NULL,
  name       VARCHAR(255) NOT NULL,
  url        TEXT         NOT NULL,
  category   VARCHAR(100) NULL,
  model      VARCHAR(255) NULL,
  tags       TEXT         NULL,           -- disimpan JSON array
  notes      TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_atv_providers_user FOREIGN KEY (user_id)
    REFERENCES atv_users(id) ON DELETE CASCADE,
  INDEX idx_atv_providers_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS atv_tokens (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  user_id         CHAR(36)     NOT NULL,
  provider_id     CHAR(36)     NOT NULL,
  label           VARCHAR(255) NOT NULL,
  token_encrypted TEXT         NOT NULL,
  token_iv        VARCHAR(64)  NOT NULL,
  status          ENUM('active','expired','out_of_quota') NOT NULL DEFAULT 'active',
  notes           TEXT         NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME     NULL,
  CONSTRAINT fk_atv_tokens_user FOREIGN KEY (user_id)
    REFERENCES atv_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_atv_tokens_provider FOREIGN KEY (provider_id)
    REFERENCES atv_providers(id) ON DELETE CASCADE,
  INDEX idx_atv_tokens_provider (provider_id),
  INDEX idx_atv_tokens_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin pertama: register lewat UI dulu, lalu jalankan (ganti email):
-- UPDATE atv_users SET role='admin', status='active', approved_at=NOW() WHERE email='email@lo.com';

import aiosqlite
from typing import AsyncGenerator
from settings import settings

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS used_nonces (
  nonce TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vc_status (
  vc_id TEXT PRIMARY KEY,
  issuer_did TEXT NOT NULL,
  subject_did TEXT NOT NULL,
  status TEXT NOT NULL,         -- 'valid' | 'revoked' | 'suspended'
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  action TEXT NOT NULL,         -- 'verify' | 'issue' | 'revoke' | 'challenge'
  did_issuer TEXT,
  did_subject TEXT,
  result TEXT NOT NULL,         -- 'ok' | 'fail' | 'replay' | 'revoked'
  meta TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt hash
  did TEXT,                     -- user's DID
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive' | 'suspended'
  display_name TEXT,            -- user's display name
  theme TEXT DEFAULT 'light',   -- UI theme preference
  avatar TEXT,                  -- user's profile photo (data URL or path)
  phone TEXT,                   -- user's phone number
  lang TEXT DEFAULT 'en',       -- user's preferred language
  otp_enabled INTEGER DEFAULT 0, -- 2FA enabled flag (0 or 1)
  otp_secret TEXT,              -- TOTP secret key
  email_verified INTEGER DEFAULT 0, -- Email verification status
  verification_token TEXT,      -- Email verification token
  reset_token TEXT,             -- Password reset token
  reset_token_expires INTEGER,  -- Password reset token expiration
  backup_codes TEXT             -- Hashed backup codes (JSON list)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS user_vcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  vc_id TEXT NOT NULL,          -- jti from VC
  vc_payload TEXT NOT NULL,     -- full VC JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, vc_id)
);

CREATE INDEX IF NOT EXISTS idx_user_vcs_user_id ON user_vcs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vcs_vc_id ON user_vcs(vc_id);

CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did TEXT NOT NULL UNIQUE,
  profile_data TEXT NOT NULL,   -- JSON: encrypted profile data
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_did ON user_profiles(did);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,           -- user DID or user ID
  amount_minor INTEGER NOT NULL,   -- amount in minor units (cents/kuruş)
  currency TEXT NOT NULL DEFAULT 'TRY',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'success' | 'failed'
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_tx_id TEXT,             -- external provider transaction ID
  return_url TEXT,                 -- frontend callback URL
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_tx_id ON transactions(provider_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE TABLE IF NOT EXISTS issuers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  domain TEXT,
  did TEXT,
  status TEXT NOT NULL,         -- 'pending' | 'approved' | 'revoked'
  api_key_hash TEXT,            -- SHA256(apiKey)
  password_hash TEXT,           -- bcrypt hash (added for issuer login)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  meta TEXT,                    -- JSON: additional settings like contact_email, support_link, timezone, locale
  contact_email TEXT,
  support_link TEXT,
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS issued_vcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vc_id TEXT,                   -- jti
  issuer_id INTEGER,
  subject_did TEXT,
  recipient_id TEXT,            -- unique ID for the recipient (for QR/NFC scanning)
  payload TEXT,                 -- raw VC JSON (canonical, sorted keys)
  payload_hash TEXT,            -- SHA256(payload canonical JSON)
  credential_type TEXT,         -- extracted from payload for filtering
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY(issuer_id) REFERENCES issuers(id)
);

CREATE INDEX IF NOT EXISTS idx_issued_vcs_recipient_id ON issued_vcs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_issued_vcs_issuer_id ON issued_vcs(issuer_id);
CREATE INDEX IF NOT EXISTS idx_issued_vcs_vc_id ON issued_vcs(vc_id);

CREATE TABLE IF NOT EXISTS issuer_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  vc_type TEXT NOT NULL,
  schema_json TEXT NOT NULL,    -- JSON schema for the template
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(issuer_id) REFERENCES issuers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issuer_templates_issuer_id ON issuer_templates(issuer_id);

CREATE TABLE IF NOT EXISTS issuer_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  event_type TEXT NOT NULL,     -- 'credential.issued' | 'credential.revoked' | 'credential.updated'
  secret TEXT,                  -- Optional webhook secret for HMAC validation
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  last_delivery INTEGER,
  failure_count INTEGER DEFAULT 0,
  FOREIGN KEY(issuer_id) REFERENCES issuers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issuer_webhooks_issuer_id ON issuer_webhooks(issuer_id);

CREATE TABLE IF NOT EXISTS vc_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,     -- creator of the template
  name TEXT NOT NULL,           -- template name
  description TEXT,             -- template description
  vc_type TEXT NOT NULL,        -- e.g., "StudentCard", "Membership"
  fields TEXT NOT NULL,         -- JSON: field definitions
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vc_templates_user_id ON vc_templates(user_id);

CREATE TABLE IF NOT EXISTS tmp_payloads (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_secret_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  redirect_uris TEXT NOT NULL,  -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_auth_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_did TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY(client_id) REFERENCES oauth_clients(client_id)
);

CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  token TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_did TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(client_id) REFERENCES oauth_clients(client_id)
);


"""

# Monkey patch aiosqlite.Connection to add execute_fetchone helper
async def _execute_fetchone(self, sql: str, parameters=None):
    """Helper method to execute a query and fetch one result"""
    cursor = await self.execute(sql, parameters or ())
    return await cursor.fetchone()

async def _execute_fetchall(self, sql: str, parameters=None):
    """Helper method to execute a query and fetch all results"""
    cursor = await self.execute(sql, parameters or ())
    return await cursor.fetchall()

# Add the methods to the Connection class
aiosqlite.Connection.execute_fetchone = _execute_fetchone
aiosqlite.Connection.execute_fetchall = _execute_fetchall

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    conn = await aiosqlite.connect(settings.SQLITE_PATH)
    conn.row_factory = aiosqlite.Row
    yield conn
    await conn.close()

async def init_db():
    import os
    # Ensure the directory exists
    db_path = settings.SQLITE_PATH
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    async with aiosqlite.connect(settings.SQLITE_PATH) as conn:
        await conn.executescript(SCHEMA_SQL)
        await conn.commit()
        
        # Run migrations for existing databases
        await _run_migrations(conn)

async def _run_migrations(conn: aiosqlite.Connection):
    """Run database migrations to add new columns to existing tables"""
    
    # Check if avatar column exists in users table
    cursor = await conn.execute("PRAGMA table_info(users)")
    columns = await cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    # Add missing columns if they don't exist
    migrations = [
        ("avatar", "ALTER TABLE users ADD COLUMN avatar TEXT"),
        ("phone", "ALTER TABLE users ADD COLUMN phone TEXT"),
        ("lang", "ALTER TABLE users ADD COLUMN lang TEXT DEFAULT 'en'"),
        ("otp_enabled", "ALTER TABLE users ADD COLUMN otp_enabled INTEGER DEFAULT 0"),
        ("otp_secret", "ALTER TABLE users ADD COLUMN otp_secret TEXT"),
        ("email_verified", "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0"),
        ("verification_token", "ALTER TABLE users ADD COLUMN verification_token TEXT"),
        ("reset_token", "ALTER TABLE users ADD COLUMN reset_token TEXT"),
        ("reset_token_expires", "ALTER TABLE users ADD COLUMN reset_token_expires INTEGER"),
        ("backup_codes", "ALTER TABLE users ADD COLUMN backup_codes TEXT"),
    ]
    
    for column_name, alter_sql in migrations:
        if column_name not in column_names:
            try:
                await conn.execute(alter_sql)
                print(f"Migration: Added column {column_name} to users table")
            except Exception as e:
                # Column might already exist due to race condition or previous partial migration
                print(f"Migration warning: Could not add column {column_name}: {e}")
    
    # Check if password_hash column exists in issuers table
    cursor = await conn.execute("PRAGMA table_info(issuers)")
    columns = await cursor.fetchall()
    issuer_column_names = [col[1] for col in columns]
    
    issuer_migrations = [
        ("password_hash", "ALTER TABLE issuers ADD COLUMN password_hash TEXT"),
        ("contact_email", "ALTER TABLE issuers ADD COLUMN contact_email TEXT"),
        ("support_link", "ALTER TABLE issuers ADD COLUMN support_link TEXT"),
        ("timezone", "ALTER TABLE issuers ADD COLUMN timezone TEXT DEFAULT 'UTC'"),
        ("locale", "ALTER TABLE issuers ADD COLUMN locale TEXT DEFAULT 'en'"),
    ]
    
    for column_name, alter_sql in issuer_migrations:
        if column_name not in issuer_column_names:
            try:
                await conn.execute(alter_sql)
                print(f"Migration: Added column {column_name} to issuers table")
            except Exception as e:
                print(f"Migration warning: Could not add column {column_name} to issuers: {e}")
    
    # Check and migrate issued_vcs table
    cursor = await conn.execute("PRAGMA table_info(issued_vcs)")
    columns = await cursor.fetchall()
    issued_vcs_column_names = [col[1] for col in columns]
    
    issued_vcs_migrations = [
        ("credential_type", "ALTER TABLE issued_vcs ADD COLUMN credential_type TEXT"),
        ("updated_at", "ALTER TABLE issued_vcs ADD COLUMN updated_at INTEGER"),
      ("payload_hash", "ALTER TABLE issued_vcs ADD COLUMN payload_hash TEXT"),
    ]
    
    for column_name, alter_sql in issued_vcs_migrations:
        if column_name not in issued_vcs_column_names:
            try:
                await conn.execute(alter_sql)
                print(f"Migration: Added column {column_name} to issued_vcs table")
            except Exception as e:
                print(f"Migration warning: Could not add column {column_name} to issued_vcs: {e}")

    await conn.commit()

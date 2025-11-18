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
  theme TEXT DEFAULT 'light'    -- UI theme preference
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

CREATE TABLE IF NOT EXISTS issuers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  domain TEXT,
  did TEXT,
  status TEXT NOT NULL,         -- 'pending' | 'approved' | 'revoked'
  api_key_hash TEXT,            -- SHA256(apiKey)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  meta TEXT
);

CREATE TABLE IF NOT EXISTS issued_vcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vc_id TEXT,                   -- jti
  issuer_id INTEGER,
  subject_did TEXT,
  payload TEXT,                 -- raw VC JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY(issuer_id) REFERENCES issuers(id)
);


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

# Add the method to the Connection class
aiosqlite.Connection.execute_fetchone = _execute_fetchone

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    conn = await aiosqlite.connect(settings.SQLITE_PATH)
    conn.row_factory = aiosqlite.Row
    yield conn
    await conn.close()

async def init_db():
    async with aiosqlite.connect(settings.SQLITE_PATH) as conn:
        await conn.executescript(SCHEMA_SQL)
        await conn.commit()

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


"""

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    conn = await aiosqlite.connect(settings.SQLITE_PATH)
    conn.row_factory = aiosqlite.Row
    yield conn
    await conn.close()

async def init_db():
    async with aiosqlite.connect(settings.SQLITE_PATH) as conn:
        await conn.executescript(SCHEMA_SQL)
        await conn.commit()

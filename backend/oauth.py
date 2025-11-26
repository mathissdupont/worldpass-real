from fastapi import HTTPException, Depends
from backend.database import get_db
from backend.schemas import (
    OAuthClientRegisterReq, OAuthClientRegisterResp,
    OAuthAuthorizeReq, OAuthAuthorizeResp,
    OAuthTokenReq, OAuthTokenResp,
    OAuthUserInfo,
)
import time, secrets, base64
import hashlib, json
from typing import Optional

# ---------- OAuth benzeri sistem ----------

def _gen_client_id() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(16)).decode().rstrip("=")

def _gen_client_secret() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")

def _gen_auth_code() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(24)).decode().rstrip("=")

def _gen_access_token() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")

def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()

async def register_oauth_client(body: OAuthClientRegisterReq, db):
    client_id = _gen_client_id()
    client_secret = _gen_client_secret()
    now = int(time.time())

    await db.execute(
        """
        INSERT INTO oauth_clients(client_id, client_secret_hash, name, domain, redirect_uris, created_at, updated_at, status)
        VALUES(?, ?, ?, ?, ?, ?, ?, 'active')
        """,
        (
            client_id,
            _sha256(client_secret),
            body.name,
            body.domain,
            json.dumps(body.redirect_uris),
            now,
            now,
        ),
    )
    await db.commit()
    return OAuthClientRegisterResp(
        client_id=client_id,
        client_secret=client_secret,
        name=body.name,
        domain=body.domain,
    )

async def authorize_oauth(body: OAuthAuthorizeReq, user_did: str, db):
    # Client kontrolü
    row = await db.execute_fetchone(
        "SELECT * FROM oauth_clients WHERE client_id=? AND status='active'",
        (body.client_id,)
    )
    if not row:
        raise HTTPException(status_code=400, detail="invalid_client")

    # Redirect URI kontrolü
    redirect_uris = json.loads(row["redirect_uris"])
    if body.redirect_uri not in redirect_uris:
        raise HTTPException(status_code=400, detail="invalid_redirect_uri")

    # Auth code oluştur
    code = _gen_auth_code()
    now = int(time.time())
    exp = now + 600  # 10 dakika

    await db.execute(
        """
        INSERT INTO oauth_auth_codes(code, client_id, user_did, redirect_uri, scope, expires_at, created_at)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (code, body.client_id, user_did, body.redirect_uri, body.scope, exp, now),
    )
    await db.commit()

    return OAuthAuthorizeResp(code=code, state=body.state)

async def token_oauth(body: OAuthTokenReq, db):
    # Client kontrolü
    row = await db.execute_fetchone(
        "SELECT * FROM oauth_clients WHERE client_id=? AND status='active'",
        (body.client_id,)
    )
    if not row:
        raise HTTPException(status_code=400, detail="invalid_client")

    # Client secret kontrolü
    if _sha256(body.client_secret) != row["client_secret_hash"]:
        raise HTTPException(status_code=400, detail="invalid_client_secret")

    # Auth code kontrolü
    code_row = await db.execute_fetchone(
        "SELECT * FROM oauth_auth_codes WHERE code=? AND used=0",
        (body.code,)
    )
    if not code_row:
        raise HTTPException(status_code=400, detail="invalid_grant")

    if code_row["expires_at"] < int(time.time()):
        await db.execute("DELETE FROM oauth_auth_codes WHERE code=?", (body.code,))
        await db.commit()
        raise HTTPException(status_code=400, detail="code_expired")

    if code_row["client_id"] != body.client_id or code_row["redirect_uri"] != body.redirect_uri:
        raise HTTPException(status_code=400, detail="invalid_grant")

    # Code'u kullan
    await db.execute("UPDATE oauth_auth_codes SET used=1 WHERE code=?", (body.code,))

    # Access token oluştur
    token = _gen_access_token()
    now = int(time.time())
    exp = now + 3600  # 1 saat

    await db.execute(
        """
        INSERT INTO oauth_access_tokens(token, client_id, user_did, scope, expires_at, created_at)
        VALUES(?, ?, ?, ?, ?, ?)
        """,
        (token, body.client_id, code_row["user_did"], code_row["scope"], exp, now),
    )
    await db.commit()

    return OAuthTokenResp(
        access_token=token,
        token_type="Bearer",
        expires_in=3600,
        scope=code_row["scope"],
    )

async def get_user_info(token: str, db) -> OAuthUserInfo:
    row = await db.execute_fetchone(
        "SELECT * FROM oauth_access_tokens WHERE token=? AND expires_at > ?",
        (token, int(time.time())),
    )
    if not row:
        raise HTTPException(status_code=401, detail="invalid_token")

    # Basit user info - gerçek uygulamada daha fazla bilgi eklenebilir
    return OAuthUserInfo(
        sub=row["user_did"],
        name=None,  # Profil bilgisi eklenmedi henüz
        email=None,
        picture=None,
    )

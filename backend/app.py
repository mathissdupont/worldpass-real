from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

# Tamamı paket içi relative olsun:
from settings import settings
from database import get_db, init_db
from schemas import (
    HealthResp, ChallengeReq, ChallengeResp,
    VerifyReq, VerifyResp,
    RevokeReq, RevokeResp,
    AdminLoginReq, AdminLoginResp,
    IssuerRegisterReq, IssuerRegisterResp,
    IssuerLoginReq, IssuerLoginResp,
    IssuerProfileResp, IssuerApiKeyResp,
    ApproveIssuerReq, ApproveIssuerResp,
    IssuerListItem,
    IssuerIssueReq, IssuerIssueResp,
    IssuerRevokeReq, IssuerRevokeResp,
    UserRegisterReq, UserRegisterResp,
    UserLoginReq, UserLoginResp,
    UserVCAddReq, UserVCAddResp,
    UserVCListResp, UserVCItem,
    UserVCDeleteReq, UserVCDeleteResp,
    UserProfileUpdateReq, UserProfileResp,
    UserDeleteResp,
    TwoFASetupResp, TwoFAEnableReq, TwoFAEnableResp, TwoFADisableResp,
    BackupCodesResp, VerifyEmailReq, VerifyEmailResp,
    ForgotPasswordReq, ForgotPasswordResp, ResetPasswordReq, ResetPasswordResp,
    VCTemplateCreateReq, VCTemplateCreateResp,
    VCTemplateListResp, VCTemplateItem,
    VCTemplateUpdateReq, VCTemplateUpdateResp,
    VCTemplateDeleteResp,
    RecipientLookupResp,
    IssuerVerifyDomainReq, IssuerVerifyDomainResp,
)
from core.crypto_ed25519 import Ed25519Signer, b64u_d
from core.vc import verify_vc
from core.vc_crypto import VCEncryptor, generate_encryption_key
from oauth_endpoints import router as oauth_router
from issuer_endpoints import router as issuer_router

import time, secrets, base64
import hashlib, os, json
from typing import Optional
import dns.resolver
import httpx
import pyotp

app = FastAPI(title=settings.APP_NAME)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

API = settings.API_PREFIX
signer = Ed25519Signer()

# Initialize VC encryptor with encryption key
# If no key is set, generate one and warn (for development)
if not settings.VC_ENCRYPTION_KEY:
    import warnings
    warnings.warn(
        "VC_ENCRYPTION_KEY is not set. Generating a temporary key. "
        "Set VC_ENCRYPTION_KEY environment variable in production.",
        RuntimeWarning
    )
    vc_encryption_key = generate_encryption_key()
else:
    vc_encryption_key = settings.VC_ENCRYPTION_KEY

vc_encryptor = VCEncryptor(vc_encryption_key)

# Enhanced CORS with environment variables
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    await init_db()


# ---------- health ----------
@app.get(f"{API}/health", response_model=HealthResp)
async def health():
    return HealthResp()


# ---------- challenge ----------
@app.post(f"{API}/challenge/new", response_model=ChallengeResp)
async def new_challenge(body: ChallengeReq, db=Depends(get_db)):
    nonce = base64.urlsafe_b64encode(secrets.token_bytes(16)).decode().rstrip("=")
    now = int(time.time())
    exp = now + min(body.exp_secs, settings.CHALLENGE_TTL_SECONDS)

    await db.execute(
        "INSERT OR REPLACE INTO used_nonces(nonce, created_at, expires_at) VALUES(?,?,?)",
        (nonce, now, exp),
    )
    await db.execute(
        "INSERT INTO audit_logs(ts, action, result, meta) VALUES(?,?,?,?)",
        (now, "challenge", "ok", json.dumps({"aud": body.audience})),
    )
    await db.commit()

    return ChallengeResp(challenge=nonce, nonce=nonce, expires_at=exp)


# ---------- /present/verify ----------
@app.post(f"{API}/present/verify", response_model=VerifyResp)
async def present_verify(payload: dict, db=Depends(get_db)):
    """
    Holder'dan gelen presentation payload'ını doğrular.

    Beklenen şekil (özet):
    {
      "type": "presentation",
      "challenge": "nonce-123",
      "aud": "kampus-kapi",
      "exp": 1731000000,
      "holder": {
        "did": "did:key:z<pk_b64u>",
        "pk_b64u": "<base64url>",
        "sig_b64u": "<base64url>",   # Ed25519 detached signature
        "alg": "Ed25519"
      },
      "vc": { ... imzalı VC ... }
    }
    """
    now = int(time.time())

    # 1) Temel alan kontrolleri
    if payload.get("type") != "presentation":
        raise HTTPException(status_code=400, detail="bad_type")

    ch = payload.get("challenge")
    aud = payload.get("aud") or ""
    exp = payload.get("exp", None)

    if not isinstance(ch, str) or not ch:
        raise HTTPException(status_code=400, detail="missing_challenge")

    # 2) Nonce / replay kontrolü (DB truth)
    row = await db.execute_fetchone(
        "SELECT nonce, expires_at FROM used_nonces WHERE nonce=?", (ch,)
    )
    if not row:
        await db.execute(
            "INSERT INTO audit_logs(ts, action, did_issuer, did_subject, result, meta) "
            "VALUES(?,?,?,?,?,?)",
            (now, "present_verify", "", "", "fail",
             json.dumps({"reason": "replay_or_invalid_nonce"})),
        )
        await db.commit()
        raise HTTPException(status_code=409, detail="replay_or_invalid_nonce")

    if row["expires_at"] < now:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.execute(
            "INSERT INTO audit_logs(ts, action, did_issuer, did_subject, result, meta) "
            "VALUES(?,?,?,?,?,?)",
            (now, "present_verify", "", "", "fail",
             json.dumps({"reason": "nonce_expired"})),
        )
        await db.commit()
        raise HTTPException(status_code=409, detail="nonce_expired")

    # Opsiyonel: payload.exp ile DB'deki expires_at uyumlu mu diye bakılabilir
    if exp is not None:
        try:
            exp_int = int(exp)
            if exp_int != row["expires_at"]:
                # çok katı olmasın dersen bu bloğu kaldırabilirsin
                await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
                await db.commit()
                raise HTTPException(status_code=400, detail="exp_mismatch")
        except Exception:
            await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
            await db.commit()
            raise HTTPException(status_code=400, detail="bad_exp")

    # 3) VC imzasını ve issuer bilgisini doğrula
    vc = payload.get("vc") or {}
    ok, reason, issuer, subject = verify_vc(vc, signer)
    if not ok:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.execute(
            "INSERT INTO audit_logs(ts, action, did_issuer, did_subject, result, meta) "
            "VALUES(?,?,?,?,?,?)",
            (now, "present_verify", issuer or "", subject or "", "fail",
             json.dumps({"reason": "vc_sig"})),
        )
        await db.commit()
        raise HTTPException(status_code=401, detail="invalid_vc_signature")

    # 4) Revocation kontrolü (vc_status tablosı)
    jti = vc.get("jti")
    revoked = False
    if jti:
        r2 = await db.execute_fetchone(
            "SELECT status FROM vc_status WHERE vc_id=?", (jti,)
        )
        if r2 and r2["status"] == "revoked":
            revoked = True

    # 5) Holder bilgisi + DID / subject uyumu
    holder = payload.get("holder") or {}
    holder_did = holder.get("did") or ""
    holder_pk_b64u = holder.get("pk_b64u") or ""
    holder_sig_b64u = holder.get("sig_b64u") or ""
    alg = holder.get("alg") or "Ed25519"

    if not (holder_did and holder_pk_b64u and holder_sig_b64u):
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=400, detail="missing_holder")

    if alg != "Ed25519":
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=400, detail="unsupported_alg")

    subject_did = (vc.get("credentialSubject") or {}).get("id", "") or ""
    if subject_did != holder_did:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=400, detail="subject_holder_mismatch")

    # DID ↔ pk uyumu (senin önceki mantığı koruyorum)
    expected_did = f"did:key:z{holder_pk_b64u}"
    if expected_did != holder_did:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=400, detail="did_pk_mismatch")

    # 6) Holder imzası: challenge|aud|exp formatı
    try:
        pk = b64u_d(holder_pk_b64u)
        sig = b64u_d(holder_sig_b64u)

        # Frontend Present.jsx ile birebir aynı mesaj:
        # const parts = [req.challenge, req.aud || "", req.exp ? String(req.exp) : ""].join("|");
        # msgBytes = enc.encode(parts);
        parts = [
            ch,
            aud or "",
            str(exp) if exp is not None else "",
        ]
        msg = "|".join(parts).encode("utf-8")

        signer.verify(pk, msg, sig)
    except Exception:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=401, detail="bad_holder_signature")

    # 7) Nonce'i tüket, audit log yaz, sonucu döndür
    await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
    result = "revoked" if revoked else "ok"
    await db.execute(
        "INSERT INTO audit_logs(ts, action, did_issuer, did_subject, result, meta) "
        "VALUES(?,?,?,?,?,?)",
        (now, "present_verify", issuer or "", subject or "", result,
         json.dumps({"revoked": revoked})),
    )
    await db.commit()

    if revoked:
        return VerifyResp(valid=False, reason="revoked", issuer=issuer, subject=subject, revoked=True)

    return VerifyResp(valid=True, reason="ok", issuer=issuer, subject=subject, revoked=False)


# ---------- admin auth ----------
@app.post(f"{API}/admin/login", response_model=AdminLoginResp)
async def admin_login(body: AdminLoginReq):
    if not settings.ADMIN_PASS_HASH:
        raise HTTPException(status_code=400, detail="Admin password not configured. Please set ADMIN_PASS_HASH environment variable with a bcrypt hash of your admin password.")
    
    if body.username != settings.ADMIN_USER:
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    if not bcrypt.checkpw(body.password.encode(), settings.ADMIN_PASS_HASH.encode()):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    # Generate JWT token
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode = {"sub": body.username, "exp": expire}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    return AdminLoginResp(token=token)


async def _require_admin(x_token: Optional[str] = Header(None)):
    if not x_token:
        raise HTTPException(status_code=401, detail="missing_token")
    
    try:
        payload = jwt.decode(x_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username != settings.ADMIN_USER:
            raise HTTPException(status_code=401, detail="invalid_token")
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid_token")


# ---------- user register / login ----------
@app.post(f"{API}/user/register", response_model=UserRegisterResp)
@limiter.limit("5/minute")
async def user_register(request: Request, body: UserRegisterReq, db=Depends(get_db)):
    """Register a new user with secure password hashing"""
    email = body.email.lower().strip()
    
    # Check if user already exists
    existing = await db.execute_fetchone(
        "SELECT id FROM users WHERE email=?", (email,)
    )
    if existing:
        raise HTTPException(status_code=400, detail="email_already_registered")
    
    # Validate password strength
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="password_too_short")
    
    # Hash password with bcrypt
    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    
    now = int(time.time())
    
    # Create user with display_name
    display_name = f"{body.first_name} {body.last_name}".strip()
    cur = await db.execute(
        """
        INSERT INTO users(email, first_name, last_name, password_hash, did, display_name, theme, avatar, phone, lang, otp_enabled, created_at, updated_at, status)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        """,
        (email, body.first_name, body.last_name, password_hash, body.did or "", display_name, "light", "", "", "en", 0, now, now),
    )
    await db.commit()
    user_id = cur.lastrowid
    
    # Generate JWT token
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode = {"sub": email, "user_id": user_id, "exp": expire}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    # Audit log
    await db.execute(
        "INSERT INTO audit_logs(ts, action, result, meta) VALUES(?,?,?,?)",
        (now, "user_register", "ok", json.dumps({"email": email, "user_id": user_id})),
    )
    await db.commit()
    
    return UserRegisterResp(
        token=token,
        user={
            "id": user_id,
            "email": email,
            "first_name": body.first_name,
            "last_name": body.last_name,
            "did": body.did or "",
            "email_verified": False,
        }
    )


@app.post(f"{API}/user/login", response_model=UserLoginResp)
@limiter.limit("10/minute")
async def user_login(request: Request, body: UserLoginReq, db=Depends(get_db)):
    """Authenticate user and return JWT token"""
    email = body.email.lower().strip()
    
    # Find user
    user = await db.execute_fetchone(
        "SELECT id, email, first_name, last_name, password_hash, did, status, otp_enabled, otp_secret, backup_codes, email_verified FROM users WHERE email=?",
        (email,)
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    # Check password
    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    # Check status
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="account_inactive")
    
    # 2FA Check
    if user["otp_enabled"]:
        if not body.otp_code:
            raise HTTPException(status_code=403, detail="otp_required")
        
        valid_otp = False
        # 1. Try TOTP
        if user["otp_secret"]:
            totp = pyotp.TOTP(user["otp_secret"])
            if totp.verify(body.otp_code):
                valid_otp = True
        
        # 2. Try Backup Codes if TOTP failed
        if not valid_otp:
            backup_codes = json.loads(user["backup_codes"] or "[]")
            # Hash the provided code to check against stored hashes (SHA256)
            code_hash = hashlib.sha256(body.otp_code.strip().encode()).hexdigest()
            
            if code_hash in backup_codes:
                valid_otp = True
                # Consume the code
                backup_codes.remove(code_hash)
                await db.execute(
                    "UPDATE users SET backup_codes=? WHERE id=?",
                    (json.dumps(backup_codes), user["id"])
                )
                await db.commit()
        
        if not valid_otp:
            raise HTTPException(status_code=401, detail="invalid_otp")
    
    # Generate JWT token
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode = {"sub": email, "user_id": user["id"], "exp": expire}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    # Audit log
    now = int(time.time())
    await db.execute(
        "INSERT INTO audit_logs(ts, action, result, meta) VALUES(?,?,?,?)",
        (now, "user_login", "ok", json.dumps({"email": email, "user_id": user["id"]})),
    )
    await db.commit()
    
    return UserLoginResp(
        token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "did": user["did"] or "",
            "email_verified": bool(user["email_verified"]),
        }
    )


# ---------- helper to get current user from token ----------
async def _get_current_user(x_token: Optional[str] = Header(None), db=Depends(get_db)):
    """Get current authenticated user from JWT token"""
    if not x_token:
        raise HTTPException(status_code=401, detail="missing_token")
    
    try:
        payload = jwt.decode(x_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="invalid_token")
        
        user = await db.execute_fetchone(
            "SELECT id, email, first_name, last_name, did, display_name, theme, avatar, phone, lang, otp_enabled, email_verified FROM users WHERE id=?",
            (user_id,)
        )
        if not user:
            raise HTTPException(status_code=401, detail="user_not_found")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid_token")


@app.post(f"{API}/auth/2fa/setup", response_model=TwoFASetupResp)
async def setup_2fa(user=Depends(_get_current_user)):
    """Generate a new TOTP secret for 2FA setup"""
    secret = pyotp.random_base32()
    otpauth_url = pyotp.totp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name=settings.APP_NAME)
    return TwoFASetupResp(secret=secret, otpauth_url=otpauth_url)


@app.post(f"{API}/auth/2fa/enable", response_model=TwoFAEnableResp)
async def enable_2fa(body: TwoFAEnableReq, user=Depends(_get_current_user), db=Depends(get_db)):
    """Verify code and enable 2FA"""
    totp = pyotp.TOTP(body.secret)
    if not totp.verify(body.code):
        raise HTTPException(status_code=400, detail="invalid_otp")
    
    await db.execute(
        "UPDATE users SET otp_enabled=1, otp_secret=?, updated_at=? WHERE id=?",
        (body.secret, int(time.time()), user["id"])
    )
    await db.commit()
    return TwoFAEnableResp(ok=True)


@app.post(f"{API}/auth/2fa/disable", response_model=TwoFADisableResp)
async def disable_2fa(user=Depends(_get_current_user), db=Depends(get_db)):
    """Disable 2FA"""
    await db.execute(
        "UPDATE users SET otp_enabled=0, otp_secret=NULL, updated_at=? WHERE id=?",
        (int(time.time()), user["id"])
    )
    await db.commit()
    return TwoFADisableResp(ok=True)


# ---------- user VCs management ----------
@app.post(f"{API}/user/vcs/add", response_model=UserVCAddResp)
@limiter.limit("20/minute")
async def user_vc_add(request: Request, body: UserVCAddReq, user=Depends(_get_current_user), db=Depends(get_db)):
    """Add a VC to user's collection (encrypted at rest)"""
    now = int(time.time())
    vc = body.vc
    vc_id = vc.get("jti") or vc.get("id") or f"vc-{now}"
    
    # Encrypt the VC payload before storing
    try:
        encrypted_payload = vc_encryptor.encrypt_vc(vc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"encryption_failed: {str(e)}")
    
    # Check if VC already exists for this user
    existing = await db.execute_fetchone(
        "SELECT id FROM user_vcs WHERE user_id=? AND vc_id=?",
        (user["id"], vc_id)
    )
    
    if existing:
        # Update existing VC
        await db.execute(
            "UPDATE user_vcs SET vc_payload=?, updated_at=? WHERE user_id=? AND vc_id=?",
            (encrypted_payload, now, user["id"], vc_id)
        )
    else:
        # Insert new VC
        await db.execute(
            "INSERT INTO user_vcs(user_id, vc_id, vc_payload, created_at, updated_at) VALUES(?,?,?,?,?)",
            (user["id"], vc_id, encrypted_payload, now, now)
        )
    
    await db.commit()
    return UserVCAddResp(ok=True, vc_id=vc_id)



@app.get(f"{API}/user/vcs", response_model=UserVCListResp)
@limiter.limit("30/minute")
async def user_vc_list(request: Request, user=Depends(_get_current_user), db=Depends(get_db)):
    """Get all VCs for current user (decrypted from storage)"""
    rows = await db.execute_fetchall(
        "SELECT id, vc_id, vc_payload, created_at, updated_at FROM user_vcs WHERE user_id=? ORDER BY created_at DESC",
        (user["id"],)
    )
    
    vcs = []
    for row in rows:
        try:
            # Decrypt the VC payload
            # Support both encrypted (new) and plain JSON (legacy) formats
            payload_str = row["vc_payload"]
            if vc_encryptor.is_encrypted(payload_str):
                vc_payload = vc_encryptor.decrypt_vc(payload_str)
            else:
                # Legacy plain JSON format
                vc_payload = json.loads(payload_str)
            
            vcs.append(UserVCItem(
                id=row["id"],
                vc_id=row["vc_id"],
                vc_payload=vc_payload,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        except Exception:
            # Skip VCs that cannot be decrypted/parsed
            continue
    
    return UserVCListResp(vcs=vcs)


@app.post(f"{API}/user/vcs/delete", response_model=UserVCDeleteResp)
@limiter.limit("20/minute")
async def user_vc_delete(request: Request, body: UserVCDeleteReq, user=Depends(_get_current_user), db=Depends(get_db)):
    """Delete a VC from user's collection"""
    await db.execute(
        "DELETE FROM user_vcs WHERE user_id=? AND vc_id=?",
        (user["id"], body.vc_id)
    )
    await db.commit()
    return UserVCDeleteResp(ok=True)


# ---------- user profile management ----------
@app.get(f"{API}/user/profile", response_model=UserProfileResp)
@limiter.limit("30/minute")
async def user_profile_get(request: Request, user=Depends(_get_current_user)):
    """Get current user profile"""
    return UserProfileResp(user={
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "did": user["did"] or "",
        "display_name": user["display_name"] or "",
        "theme": user["theme"] or "light",
        "avatar": user["avatar"] or "" if user["avatar"] is not None else "",
        "phone": user["phone"] or "" if user["phone"] is not None else "",
        "lang": user["lang"] or "en",
        "otp_enabled": bool(user["otp_enabled"]),
        "email_verified": bool(user["email_verified"]),
    })


@app.post(f"{API}/user/profile", response_model=UserProfileResp)
@limiter.limit("20/minute")
async def user_profile_update(request: Request, body: UserProfileUpdateReq, user=Depends(_get_current_user), db=Depends(get_db)):
    """Update current user profile"""
    now = int(time.time())
    
    updates = []
    params = []

    if body.email is not None:
        new_email = body.email.lower().strip()
        if new_email != user["email"]:
            # Check if email already exists
            existing = await db.execute_fetchone(
                "SELECT id FROM users WHERE email=? AND id!=?", (new_email, user["id"])
            )
            if existing:
                raise HTTPException(status_code=400, detail="email_already_registered")
            
            updates.append("email=?")
            params.append(new_email)
    
    if body.display_name is not None:
        updates.append("display_name=?")
        params.append(body.display_name)
    
    if body.theme is not None:
        updates.append("theme=?")
        params.append(body.theme)
    
    if body.avatar is not None:
        updates.append("avatar=?")
        params.append(body.avatar)
    
    if body.phone is not None:
        updates.append("phone=?")
        params.append(body.phone)
    
    if body.lang is not None:
        updates.append("lang=?")
        params.append(body.lang)
    
    if body.otp_enabled is not None:
        updates.append("otp_enabled=?")
        params.append(1 if body.otp_enabled else 0)
    
    if updates:
        updates.append("updated_at=?")
        params.append(now)
        params.append(user["id"])
        
        sql = f"UPDATE users SET {', '.join(updates)} WHERE id=?"
        await db.execute(sql, tuple(params))
        await db.commit()
    
    # Fetch updated user
    updated_user = await db.execute_fetchone(
        "SELECT id, email, first_name, last_name, did, display_name, theme, avatar, phone, lang, otp_enabled, email_verified FROM users WHERE id=?",
        (user["id"],)
    )
    
    return UserProfileResp(user={
        "id": updated_user["id"],
        "email": updated_user["email"],
        "first_name": updated_user["first_name"],
        "last_name": updated_user["last_name"],
        "did": updated_user["did"] or "",
        "display_name": updated_user["display_name"] or "",
        "theme": updated_user["theme"] or "light",
        "avatar": updated_user["avatar"] or "",
        "phone": updated_user["phone"] or "",
        "lang": updated_user["lang"] or "en",
        "otp_enabled": bool(updated_user["otp_enabled"]),
        "email_verified": bool(updated_user["email_verified"]),
    })


@app.post(f"{API}/user/delete", response_model=UserDeleteResp)
@limiter.limit("5/minute")
async def user_delete(request: Request, user=Depends(_get_current_user), db=Depends(get_db)):
    """Delete current user account and all associated data"""
    # Delete user VCs
    await db.execute("DELETE FROM user_vcs WHERE user_id=?", (user["id"],))
    
    # Delete user templates
    await db.execute("DELETE FROM vc_templates WHERE user_id=?", (user["id"],))
    
    # Delete user
    await db.execute("DELETE FROM users WHERE id=?", (user["id"],))
    
    await db.commit()
    
    return UserDeleteResp(ok=True)


# ---------- issuer register / list / approve ----------
@app.post(f"{API}/issuer/register", response_model=IssuerRegisterResp)
async def issuer_register(body: IssuerRegisterReq, db=Depends(get_db)):
    now = int(time.time())
    
    # Check if email already exists
    existing = await db.execute_fetchone("SELECT id FROM issuers WHERE email=?", (body.email,))
    if existing:
        raise HTTPException(status_code=400, detail="email_already_registered")

    # Hash password
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="password_too_short")
    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    verification_code = secrets.token_urlsafe(32)
    meta = {"verification_code": verification_code, "domain_verified": False}
    
    cur = await db.execute(
        """
        INSERT INTO issuers(name,email,password_hash,domain,did,status,api_key_hash,created_at,updated_at,meta)
        VALUES(?,?,?,?,?, 'pending', '', ?, ?, ?)
        """,
        (body.name, body.email, password_hash, body.domain or "", body.did or "", now, now, json.dumps(meta)),
    )
    await db.commit()
    issuer_id = cur.lastrowid
    return IssuerRegisterResp(status="pending", issuer_id=issuer_id, verification_code=verification_code)


@app.post(f"{API}/issuer/login", response_model=IssuerLoginResp)
async def issuer_login(body: IssuerLoginReq, db=Depends(get_db)):
    """Authenticate issuer and return JWT token"""
    email = body.email.strip()
    
    # Find issuer
    issuer = await db.execute_fetchone(
        "SELECT * FROM issuers WHERE email=?",
        (email,)
    )
    
    if not issuer:
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    # Check password
    # Handle legacy issuers without password (if any)
    if not issuer["password_hash"]:
         raise HTTPException(status_code=401, detail="legacy_account_reset_password_required")

    if not bcrypt.checkpw(body.password.encode(), issuer["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    # Generate JWT token
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode = {"sub": email, "issuer_id": issuer["id"], "role": "issuer", "exp": expire}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    # Audit log
    now = int(time.time())
    await db.execute(
        "INSERT INTO audit_logs(ts, action, result, meta) VALUES(?,?,?,?)",
        (now, "issuer_login", "ok", json.dumps({"email": email, "issuer_id": issuer["id"]})),
    )
    await db.commit()
    
    return IssuerLoginResp(
        token=token,
        issuer={
            "id": issuer["id"],
            "name": issuer["name"],
            "email": issuer["email"],
            "domain": issuer["domain"],
            "did": issuer["did"],
            "status": issuer["status"],
            "created_at": issuer["created_at"]
        }
    )


async def _get_current_issuer(x_token: Optional[str] = Header(None), db=Depends(get_db)):
    """Get current authenticated issuer from JWT token"""
    if not x_token:
        raise HTTPException(status_code=401, detail="missing_token")
    
    try:
        payload = jwt.decode(x_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        issuer_id: int = payload.get("issuer_id")
        role: str = payload.get("role")
        
        if not issuer_id or role != "issuer":
            raise HTTPException(status_code=401, detail="invalid_token")
        
        issuer = await db.execute_fetchone(
            "SELECT * FROM issuers WHERE id=?",
            (issuer_id,)
        )
        if not issuer:
            raise HTTPException(status_code=401, detail="issuer_not_found")
        
        return issuer
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid_token")


@app.get(f"{API}/issuer/profile", response_model=IssuerProfileResp)
async def issuer_profile(issuer=Depends(_get_current_issuer)):
    return IssuerProfileResp(
        issuer={
            "id": issuer["id"],
            "name": issuer["name"],
            "email": issuer["email"],
            "domain": issuer["domain"],
            "did": issuer["did"],
            "status": issuer["status"],
            "created_at": issuer["created_at"],
            "meta": json.loads(issuer["meta"] or "{}")
        }
    )


@app.post(f"{API}/issuer/api-key", response_model=IssuerApiKeyResp)
async def issuer_rotate_api_key(issuer=Depends(_get_current_issuer), db=Depends(get_db)):
    if issuer["status"] != "approved":
        raise HTTPException(status_code=403, detail="issuer_not_approved")
        
    api_key = _gen_api_key()
    now = int(time.time())
    
    await db.execute(
        "UPDATE issuers SET api_key_hash=?, updated_at=? WHERE id=?",
        (_sha256(api_key), now, issuer["id"]),
    )
    await db.commit()
    
    return IssuerApiKeyResp(api_key=api_key)


@app.post(f"{API}/issuer/verify-domain", response_model=IssuerVerifyDomainResp)
async def issuer_verify_domain(body: IssuerVerifyDomainReq, db=Depends(get_db)):
    row = await db.execute_fetchone("SELECT * FROM issuers WHERE id=?", (body.issuer_id,))
    if not row:
        raise HTTPException(status_code=404, detail="issuer_not_found")
    
    meta = json.loads(row["meta"] or "{}")
    if meta.get("domain_verified"):
        return IssuerVerifyDomainResp(verified=True, message="already_verified")
        
    domain = row["domain"]
    if not domain:
        raise HTTPException(status_code=400, detail="issuer_has_no_domain")
        
    code = meta.get("verification_code")
    if not code:
        # Should not happen for new issuers, but for old ones generate one
        code = secrets.token_urlsafe(32)
        meta["verification_code"] = code
        await db.execute("UPDATE issuers SET meta=? WHERE id=?", (json.dumps(meta), body.issuer_id))
        await db.commit()
        raise HTTPException(status_code=400, detail="verification_code_generated_retry")

    verified = False
    error_msg = ""

    if body.method == "dns":
        try:
            # Look for TXT record at _worldpass-challenge.<domain>
            answers = dns.resolver.resolve(f"_worldpass-challenge.{domain}", "TXT")
            for rdata in answers:
                # rdata.to_text() returns quoted string like '"code"', so we check if code is in it
                if code in rdata.to_text():
                    verified = True
                    break
            if not verified:
                error_msg = "dns_record_not_found_or_mismatch"
        except Exception as e:
            error_msg = f"dns_error: {str(e)}"
            
    elif body.method == "http":
        try:
            # Look for file at https://<domain>/.well-known/worldpass.txt
            url = f"https://{domain}/.well-known/worldpass.txt"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=5.0)
                if resp.status_code == 200 and code in resp.text:
                    verified = True
                else:
                    error_msg = f"http_failed_status_{resp.status_code}"
        except Exception as e:
             error_msg = f"http_error: {str(e)}"
    
    if verified:
        meta["domain_verified"] = True
        await db.execute("UPDATE issuers SET meta=? WHERE id=?", (json.dumps(meta), body.issuer_id))
        await db.commit()
        return IssuerVerifyDomainResp(verified=True, message="verification_success")
    else:
        return IssuerVerifyDomainResp(verified=False, message=error_msg or "verification_failed")


@app.get(
    f"{API}/admin/issuers",
    response_model=list[IssuerListItem],
    dependencies=[Depends(_require_admin)],
)
async def admin_list_issuers(db=Depends(get_db)):
    rows = await db.execute_fetchall("SELECT * FROM issuers ORDER BY created_at DESC")
    return [
        IssuerListItem(
            id=r["id"],
            name=r["name"],
            email=r["email"],
            domain=r["domain"],
            did=r["did"],
            status=r["status"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@app.post(
    f"{API}/admin/issuers/approve",
    response_model=ApproveIssuerResp,
    dependencies=[Depends(_require_admin)],
)
async def admin_approve_issuer(body: ApproveIssuerReq, db=Depends(get_db)):
    api_key = _gen_api_key()
    now = int(time.time())
    row = await db.execute_fetchone("SELECT * FROM issuers WHERE id=?", (body.issuer_id,))
    if not row:
        raise HTTPException(status_code=404, detail="issuer_not_found")

    await db.execute(
        "UPDATE issuers SET status='approved', api_key_hash=?, updated_at=? WHERE id=?",
        (_sha256(api_key), now, body.issuer_id),
    )
    await db.commit()
    return ApproveIssuerResp(api_key=api_key)


async def _get_approved_issuer_by_key(db, api_key: str):
    h = _sha256(api_key)
    row = await db.execute_fetchone(
        "SELECT * FROM issuers WHERE api_key_hash=? AND status='approved'", (h,)
    )
    if not row:
        return None
    return row


# ---------- issuer /issue & /revoke ----------
@app.post(f"{API}/issuer/issue", response_model=IssuerIssueResp)
async def issuer_issue(
    body: IssuerIssueReq, 
    x_token: Optional[str] = Header(None),
    db=Depends(get_db)
):
    issuer = None
    if body.api_key:
        issuer = await _get_approved_issuer_by_key(db, body.api_key)
    elif x_token:
        try:
            payload = jwt.decode(x_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            issuer_id = payload.get("issuer_id")
            if issuer_id and payload.get("role") == "issuer":
                issuer = await db.execute_fetchone("SELECT * FROM issuers WHERE id=?", (issuer_id,))
        except:
            pass

    if not issuer:
        raise HTTPException(status_code=401, detail="authentication_required")
        
    if issuer["status"] != "approved":
         raise HTTPException(status_code=403, detail="issuer_not_approved")

    vc = body.vc
    if vc.get("issuer") != (issuer["did"] or ""):
        raise HTTPException(status_code=400, detail="issuer_did_mismatch")

    jti = vc.get("jti") or f"vc-{int(time.time())}"
    now = int(time.time())
    
    # Generate unique recipient ID for QR/NFC scanning
    recipient_id = base64.urlsafe_b64encode(secrets.token_bytes(12)).decode().rstrip("=")
    subject_did = (vc.get("credentialSubject") or {}).get("id", "")
    
    # Extract credential type for filtering
    vc_types = vc.get("type", [])
    if isinstance(vc_types, list):
        # Filter out base types, keep the specific type
        credential_type = next((t for t in vc_types if t not in ["VerifiableCredential"]), "Unknown")
    else:
        credential_type = str(vc_types) if vc_types else "Unknown"

    await db.execute(
        "INSERT INTO issued_vcs(vc_id, issuer_id, subject_did, recipient_id, payload, credential_type, created_at, updated_at) "
        "VALUES(?,?,?,?,?,?,?,?)",
        (
            jti,
            issuer["id"],
            subject_did,
            recipient_id,
            json.dumps(vc),
            credential_type,
            now,
            now,
        ),
    )

    await db.execute(
        """
        INSERT INTO vc_status(vc_id, issuer_did, subject_did, status, reason, created_at, updated_at)
        VALUES(?, ?, ?, 'valid', '', ?, ?)
        ON CONFLICT(vc_id) DO NOTHING
        """,
        (
            jti,
            vc.get("issuer", ""),
            subject_did,
            now,
            now,
        ),
    )

    # Automatically add to user's wallet if user exists
    if subject_did:
        user_row = await db.execute_fetchone("SELECT id FROM users WHERE did=?", (subject_did,))
        if user_row:
            try:
                encrypted_payload = vc_encryptor.encrypt_vc(vc)
                # Check if VC already exists for this user
                existing_vc = await db.execute_fetchone(
                    "SELECT id FROM user_vcs WHERE user_id=? AND vc_id=?",
                    (user_row["id"], jti)
                )
                if existing_vc:
                    await db.execute(
                        "UPDATE user_vcs SET vc_payload=?, updated_at=? WHERE user_id=? AND vc_id=?",
                        (encrypted_payload, now, user_row["id"], jti)
                    )
                else:
                    await db.execute(
                        "INSERT INTO user_vcs(user_id, vc_id, vc_payload, created_at, updated_at) VALUES(?,?,?,?,?)",
                        (user_row["id"], jti, encrypted_payload, now, now)
                    )
            except Exception as e:
                # Log error but don't fail the issuance
                print(f"Failed to auto-add VC to user wallet: {e}")

    await db.commit()
    return IssuerIssueResp(ok=True, vc_id=jti, recipient_id=recipient_id)



@app.post(f"{API}/issuer/revoke", response_model=IssuerRevokeResp)
async def issuer_revoke(
    body: IssuerRevokeReq, 
    x_token: Optional[str] = Header(None),
    db=Depends(get_db)
):
    issuer = None
    if body.api_key:
        issuer = await _get_approved_issuer_by_key(db, body.api_key)
    elif x_token:
        try:
            payload = jwt.decode(x_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            issuer_id = payload.get("issuer_id")
            if issuer_id and payload.get("role") == "issuer":
                issuer = await db.execute_fetchone("SELECT * FROM issuers WHERE id=?", (issuer_id,))
        except:
            pass

    if not issuer:
        raise HTTPException(status_code=401, detail="authentication_required")
        
    if issuer["status"] != "approved":
         raise HTTPException(status_code=403, detail="issuer_not_approved")

    now = int(time.time())
    row = await db.execute_fetchone(
        "SELECT * FROM issued_vcs WHERE vc_id=? AND issuer_id=?",
        (body.vc_id, issuer["id"]),
    )
    if not row:
        raise HTTPException(status_code=404, detail="vc_not_found_or_not_yours")

    await db.execute(
        "UPDATE vc_status SET status='revoked', updated_at=? WHERE vc_id=?",
        (now, body.vc_id),
    )
    await db.commit()
    return IssuerRevokeResp(status="revoked")


# ---------- public revoke & status ----------
def _sha256(s: str) -> str:
  return hashlib.sha256(s.encode()).hexdigest()


def _gen_api_key() -> str:
  return base64.urlsafe_b64encode(os.urandom(24)).decode().rstrip("=")


@app.post(f"{API}/status/revoke", response_model=RevokeResp)
async def revoke(body: RevokeReq, db=Depends(get_db)):
    now = int(time.time())
    await db.execute(
        """
        INSERT INTO vc_status(vc_id, issuer_did, subject_did, status, reason, created_at, updated_at)
        VALUES(?, '', '', 'revoked', ?, ?, ?)
        ON CONFLICT(vc_id) DO UPDATE SET status='revoked', reason=?, updated_at=?;
        """,
        (
            body.vc_id,
            body.reason or "",
            now,
            now,
            body.reason or "",
            now,
        ),
    )
    await db.execute(
        "INSERT INTO audit_logs(ts, action, result, meta) VALUES(?,?,?,?)",
        (now, "revoke", "ok", json.dumps({"vc_id": body.vc_id})),
    )
    await db.commit()
    return RevokeResp(status="revoked")


@app.get(f"{API}/status/{{vc_id}}")
async def get_status(vc_id: str, db=Depends(get_db)):
    row = await db.execute_fetchone(
        "SELECT status, updated_at FROM vc_status WHERE vc_id=?", (vc_id,)
    )
    if not row:
        return {"vc_id": vc_id, "status": "unknown"}
    return {"vc_id": vc_id, "status": row["status"], "updated_at": row["updated_at"]}


# ---------- temporary presentation hosting (for QR / NFC) ----------
@app.post(f"{API}/present/upload")
async def present_upload(payload: dict, db=Depends(get_db)):
    """Store a short-lived presentation payload and return a path that can be embedded into QR / NFC.
    Frontend should compose full URL as window.location.origin + returned path.
    """
    now = int(time.time())
    ttl = 300
    exp = now + ttl
    pid = base64.urlsafe_b64encode(secrets.token_bytes(8)).decode().rstrip("=")
    await db.execute(
        "INSERT INTO tmp_payloads(id, payload, created_at, expires_at) VALUES(?,?,?,?)",
        (pid, json.dumps(payload), now, exp),
    )
    await db.commit()
    return {"path": f"{API}/present/tmp/{pid}", "id": pid, "expires_at": exp}


@app.get(f"{API}/present/tmp/{{pid}}")
async def present_get_tmp(pid: str, db=Depends(get_db)):
    now = int(time.time())
    row = await db.execute_fetchone(
        "SELECT payload, expires_at FROM tmp_payloads WHERE id=?", (pid,)
    )
    if not row:
        raise HTTPException(status_code=404, detail="not_found")
    if row["expires_at"] < now:
        # cleanup
        await db.execute("DELETE FROM tmp_payloads WHERE id=?", (pid,))
        await db.commit()
        raise HTTPException(status_code=404, detail="expired")
    try:
        return json.loads(row["payload"])
    except Exception:
        raise HTTPException(status_code=500, detail="bad_payload")


# ---------- VC Templates management ----------
@app.post(f"{API}/user/templates", response_model=VCTemplateCreateResp)
@limiter.limit("20/minute")
async def create_template(request: Request, body: VCTemplateCreateReq, user=Depends(_get_current_user), db=Depends(get_db)):
    """Create a new VC template"""
    now = int(time.time())
    
    cur = await db.execute(
        """
        INSERT INTO vc_templates(user_id, name, description, vc_type, fields, created_at, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (user["id"], body.name, body.description or "", body.vc_type, json.dumps(body.fields), now, now)
    )
    await db.commit()
    template_id = cur.lastrowid
    
    return VCTemplateCreateResp(ok=True, template_id=template_id)


@app.get(f"{API}/user/templates", response_model=VCTemplateListResp)
@limiter.limit("30/minute")
async def list_templates(request: Request, user=Depends(_get_current_user), db=Depends(get_db)):
    """Get all templates for current user"""
    rows = await db.execute_fetchall(
        "SELECT id, name, description, vc_type, fields, created_at, updated_at FROM vc_templates WHERE user_id=? ORDER BY created_at DESC",
        (user["id"],)
    )
    
    templates = []
    for row in rows:
        try:
            fields = json.loads(row["fields"])
            templates.append(VCTemplateItem(
                id=row["id"],
                name=row["name"],
                description=row["description"] or None,
                vc_type=row["vc_type"],
                fields=fields,
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            ))
        except Exception:
            continue
    
    return VCTemplateListResp(templates=templates)


@app.put(f"{API}/user/templates/{{template_id}}", response_model=VCTemplateUpdateResp)
@limiter.limit("20/minute")
async def update_template(request: Request, template_id: int, body: VCTemplateUpdateReq, user=Depends(_get_current_user), db=Depends(get_db)):
    """Update a VC template"""
    now = int(time.time())
    
    # Check ownership
    existing = await db.execute_fetchone(
        "SELECT id FROM vc_templates WHERE id=? AND user_id=?",
        (template_id, user["id"])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="template_not_found")
    
    updates = []
    params = []
    
    if body.name is not None:
        updates.append("name=?")
        params.append(body.name)
    
    if body.description is not None:
        updates.append("description=?")
        params.append(body.description)
    
    if body.vc_type is not None:
        updates.append("vc_type=?")
        params.append(body.vc_type)
    
    if body.fields is not None:
        updates.append("fields=?")
        params.append(json.dumps(body.fields))
    
    if updates:
        updates.append("updated_at=?")
        params.append(now)
        params.append(template_id)
        
        sql = f"UPDATE vc_templates SET {', '.join(updates)} WHERE id=?"
        await db.execute(sql, tuple(params))
        await db.commit()
    
    return VCTemplateUpdateResp(ok=True)


@app.delete(f"{API}/user/templates/{{template_id}}", response_model=VCTemplateDeleteResp)
@limiter.limit("20/minute")
async def delete_template(request: Request, template_id: int, user=Depends(_get_current_user), db=Depends(get_db)):
    """Delete a VC template"""
    # Check ownership
    existing = await db.execute_fetchone(
        "SELECT id FROM vc_templates WHERE id=? AND user_id=?",
        (template_id, user["id"])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="template_not_found")
    
    await db.execute("DELETE FROM vc_templates WHERE id=?", (template_id,))
    await db.commit()
    
    return VCTemplateDeleteResp(ok=True)


# ---------- Recipient ID lookup (QR/NFC scanning) ----------
@app.get(f"{API}/recipient/{{recipient_id}}", response_model=RecipientLookupResp)
async def lookup_recipient(recipient_id: str, db=Depends(get_db)):
    """Lookup a VC by recipient ID (for QR/NFC scanning)"""
    row = await db.execute_fetchone(
        "SELECT vc_id, subject_did, payload FROM issued_vcs WHERE recipient_id=?",
        (recipient_id,)
    )
    
    if not row:
        return RecipientLookupResp(found=False)
    
    try:
        vc_payload = json.loads(row["payload"])
        return RecipientLookupResp(
            found=True,
            vc_id=row["vc_id"],
            subject_did=row["subject_did"],
            vc_payload=vc_payload
        )
    except Exception:
        return RecipientLookupResp(found=False)


# Mount OAuth router
app.include_router(oauth_router)

# Mount Issuer Console router
app.include_router(issuer_router)

# ---------- simple VC verify (no presentation) ----------
@app.post(f"{API}/vc/verify", response_model=VerifyResp)
async def vc_verify_simple(body: VerifyReq, db=Depends(get_db)):
    """
    Sadece VC imzasını ve revocation durumunu doğrular.
    Presentation (holder imzası) kontrolü yapmaz.
    Dosya yükleme ile doğrulama için kullanılır.
    """
    vc = body.vc
    
    # 1) VC imzasını doğrula
    ok, reason, issuer, subject = verify_vc(vc, signer)
    
    # 2) Revocation kontrolü
    revoked = False
    jti = vc.get("jti") or vc.get("id")
    if jti:
        r2 = await db.execute_fetchone(
            "SELECT status FROM vc_status WHERE vc_id=?", (jti,)
        )
        if r2 and r2["status"] == "revoked":
            revoked = True
            
    # Audit log (opsiyonel)
    now = int(time.time())
    await db.execute(
        "INSERT INTO audit_logs(ts, action, did_issuer, did_subject, result, meta) "
        "VALUES(?,?,?,?,?,?)",
        (now, "vc_verify_simple", issuer or "", subject or "", "revoked" if revoked else ("ok" if ok else "fail"),
         json.dumps({"reason": reason})),
    )
    await db.commit()

    if not ok:
        return VerifyResp(valid=False, reason=reason or "invalid_signature", issuer=issuer, subject=subject, revoked=False)
        
    if revoked:
        return VerifyResp(valid=False, reason="revoked", issuer=issuer, subject=subject, revoked=True)

    return VerifyResp(valid=True, reason="ok", issuer=issuer, subject=subject, revoked=False)


@app.post(f"{API}/auth/backup-codes/generate", response_model=BackupCodesResp)
async def generate_backup_codes(user=Depends(_get_current_user), db=Depends(get_db)):
    """Generate new backup codes. Invalidates old ones."""
    codes = [secrets.token_hex(4) for _ in range(10)] # 8 chars each
    hashed_codes = [hashlib.sha256(c.encode()).hexdigest() for c in codes]
    
    await db.execute(
        "UPDATE users SET backup_codes=? WHERE id=?",
        (json.dumps(hashed_codes), user["id"])
    )
    await db.commit()
    
    return BackupCodesResp(codes=codes)


@app.post(f"{API}/auth/verify-email/request", response_model=VerifyEmailResp)
@limiter.limit("3/minute")
async def request_email_verification(request: Request, user=Depends(_get_current_user), db=Depends(get_db)):
    """Request email verification link"""
    if user.get("email_verified"):
        return VerifyEmailResp(ok=True, message="already_verified")
        
    token = secrets.token_urlsafe(32)
    await db.execute(
        "UPDATE users SET verification_token=? WHERE id=?",
        (token, user["id"])
    )
    await db.commit()
    
    # Mock email sending
    print(f"EMAIL VERIFICATION LINK: {settings.APP_URL}/verify-email?token={token}")
    
    return VerifyEmailResp(ok=True, message="verification_email_sent")


@app.post(f"{API}/auth/verify-email/confirm", response_model=VerifyEmailResp)
async def confirm_email_verification(body: VerifyEmailReq, db=Depends(get_db)):
    """Confirm email verification"""
    user = await db.execute_fetchone(
        "SELECT id FROM users WHERE verification_token=?",
        (body.token,)
    )
    if not user:
        raise HTTPException(status_code=400, detail="invalid_token")
        
    await db.execute(
        "UPDATE users SET email_verified=1, verification_token=NULL WHERE id=?",
        (user["id"],)
    )
    await db.commit()
    
    return VerifyEmailResp(ok=True, message="email_verified")


@app.post(f"{API}/auth/password-reset/request", response_model=ForgotPasswordResp)
@limiter.limit("3/minute")
async def request_password_reset(request: Request, body: ForgotPasswordReq, db=Depends(get_db)):
    """Request password reset link"""
    user = await db.execute_fetchone(
        "SELECT id FROM users WHERE email=?",
        (body.email.lower().strip(),)
    )
    if not user:
        # Don't reveal user existence
        return ForgotPasswordResp(ok=True, message="reset_email_sent_if_exists")
        
    token = secrets.token_urlsafe(32)
    expires = int(time.time()) + 3600 # 1 hour
    
    await db.execute(
        "UPDATE users SET reset_token=?, reset_token_expires=? WHERE id=?",
        (token, expires, user["id"])
    )
    await db.commit()
    
    # Mock email sending
    print(f"PASSWORD RESET LINK: {settings.APP_URL}/reset-password?token={token}")
    
    return ForgotPasswordResp(ok=True, message="reset_email_sent_if_exists")


@app.post(f"{API}/auth/password-reset/confirm", response_model=ResetPasswordResp)
async def confirm_password_reset(body: ResetPasswordReq, db=Depends(get_db)):
    """Reset password with token"""
    now = int(time.time())
    user = await db.execute_fetchone(
        "SELECT id, reset_token_expires FROM users WHERE reset_token=?",
        (body.token,)
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="invalid_token")
        
    if not user["reset_token_expires"] or user["reset_token_expires"] < now:
        raise HTTPException(status_code=400, detail="token_expired")
        
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="password_too_short")
        
    password_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    
    await db.execute(
        "UPDATE users SET password_hash=?, reset_token=NULL, reset_token_expires=NULL WHERE id=?",
        (password_hash, user["id"])
    )
    await db.commit()
    
    return ResetPasswordResp(ok=True, message="password_reset_success")

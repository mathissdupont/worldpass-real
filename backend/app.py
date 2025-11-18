from fastapi import FastAPI, Depends, HTTPException, Header
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
from .settings import settings
from .db import get_db, init_db
from .schemas import (
    HealthResp, ChallengeReq, ChallengeResp,
    VerifyReq, VerifyResp,
    RevokeReq, RevokeResp,
    AdminLoginReq, AdminLoginResp,
    IssuerRegisterReq, IssuerRegisterResp,
    ApproveIssuerReq, ApproveIssuerResp,
    IssuerListItem,
    IssuerIssueReq, IssuerIssueResp,
    IssuerRevokeReq, IssuerRevokeResp,
)
from .core.crypto_ed25519 import Ed25519Signer, b64u_d
from .core.vc import verify_vc
from .oauth_endpoints import router as oauth_router

import time, secrets, base64
import hashlib, os, json
from typing import Optional


app = FastAPI(title=settings.APP_NAME)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

API = settings.API_PREFIX
signer = Ed25519Signer()

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

    # 4) Revocation kontrolü (vc_status tablosu)
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


# ---------- issuer register / list / approve ----------
@app.post(f"{API}/issuer/register", response_model=IssuerRegisterResp)
async def issuer_register(body: IssuerRegisterReq, db=Depends(get_db)):
    now = int(time.time())
    cur = await db.execute(
        """
        INSERT INTO issuers(name,email,domain,did,status,api_key_hash,created_at,updated_at,meta)
        VALUES(?,?,?,?, 'pending', '', ?, ?, '{}')
        """,
        (body.name, body.email, body.domain or "", body.did or "", now, now),
    )
    await db.commit()
    issuer_id = cur.lastrowid
    return IssuerRegisterResp(status="pending", issuer_id=issuer_id)


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
async def issuer_issue(body: IssuerIssueReq, db=Depends(get_db)):
    issuer = await _get_approved_issuer_by_key(db, body.api_key)
    if not issuer:
        raise HTTPException(status_code=401, detail="bad_api_key")

    vc = body.vc
    if vc.get("issuer") != (issuer["did"] or ""):
        raise HTTPException(status_code=400, detail="issuer_did_mismatch")

    jti = vc.get("jti") or f"vc-{int(time.time())}"
    now = int(time.time())

    await db.execute(
        "INSERT INTO issued_vcs(vc_id, issuer_id, subject_did, payload, created_at) "
        "VALUES(?,?,?,?,?)",
        (
            jti,
            issuer["id"],
            (vc.get("credentialSubject") or {}).get("id", ""),
            json.dumps(vc),
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
            (vc.get("credentialSubject") or {}).get("id", ""),
            now,
            now,
        ),
    )
    await db.commit()
    return IssuerIssueResp(ok=True, vc_id=jti)


@app.post(f"{API}/issuer/revoke", response_model=IssuerRevokeResp)
async def issuer_revoke(body: IssuerRevokeReq, db=Depends(get_db)):
    issuer = await _get_approved_issuer_by_key(db, body.api_key)
    if not issuer:
        raise HTTPException(status_code=401, detail="bad_api_key")

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


# Mount OAuth router
app.include_router(oauth_router)

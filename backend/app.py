# backend/app.py  (Railway'de /app/app.py olarak çalışıyor)

from fastapi import FastAPI, Depends, HTTPException, Header

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

import time, secrets, base64
import hashlib, os, json
from typing import Optional


app = FastAPI(title=settings.APP_NAME)
API = settings.API_PREFIX
signer = Ed25519Signer()


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


# ---------- VC verify (sadece VC, holder yok) ----------
@app.post(f"{API}/vc/verify", response_model=VerifyResp)
async def verify_vc_api(req: VerifyReq, db=Depends(get_db)):
    now = int(time.time())

    row = await db.execute_fetchone(
        "SELECT nonce, expires_at FROM used_nonces WHERE nonce=?", (req.challenge,)
    )
    if not row:
        raise HTTPException(status_code=409, detail="replay_or_invalid_nonce")
    if row["expires_at"] < now:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (req.challenge,))
        await db.commit()
        raise HTTPException(status_code=409, detail="nonce_expired")

    ok, reason, issuer, subject = verify_vc(req.vc, signer)
    if not ok:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (req.challenge,))
        await db.execute(
            "INSERT INTO audit_logs(ts, action, did_issuer, did_subject, result, meta) "
            "VALUES(?,?,?,?,?,?)",
            (now, "verify", issuer or "", subject or "", "fail", json.dumps({"reason": "sig"})),
        )
        await db.commit()
        raise HTTPException(status_code=401, detail="invalid_signature")

    jti = req.vc.get("jti")
    revoked = False
    if jti:
        row2 = await db.execute_fetchone(
            "SELECT status FROM vc_status WHERE vc_id=?", (jti,)
        )
        if row2 and row2["status"] == "revoked":
            revoked = True

    await db.execute("DELETE FROM used_nonces WHERE nonce=?", (req.challenge,))
    result = "revoked" if revoked else "ok"
    await db.execute(
        "INSERT INTO audit_logs(ts, action, did_issuer, did_subject, result, meta) "
        "VALUES(?,?,?,?,?,?)",
        (now, "verify", issuer or "", subject or "", result, json.dumps({"reason": ""})),
    )
    await db.commit()

    if revoked:
        return VerifyResp(valid=False, reason="revoked", issuer=issuer, subject=subject, revoked=True)

    return VerifyResp(valid=True, reason="ok", issuer=issuer, subject=subject, revoked=False)


# ---------- admin auth ----------
@app.post(f"{API}/admin/login", response_model=AdminLoginResp)
async def admin_login(body: AdminLoginReq):
    if body.username == settings.ADMIN_USER and body.password == settings.ADMIN_PASS:
        return AdminLoginResp(token=settings.ADMIN_JWT)
    raise HTTPException(status_code=401, detail="bad_credentials")


async def _require_admin(x_token: Optional[str] = Header(None)):
    if x_token != settings.ADMIN_JWT:
        raise HTTPException(status_code=401, detail="unauthorized_admin")


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


# ---------- /present/verify ----------
@app.post(f"{API}/present/verify", response_model=VerifyResp)
async def present_verify(payload: dict, db=Depends(get_db)):
    now = int(time.time())
    ch = payload.get("challenge")

    row = await db.execute_fetchone("SELECT nonce, expires_at FROM used_nonces WHERE nonce=?", (ch,))
    if not row:
        raise HTTPException(status_code=409, detail="replay_or_invalid_nonce")
    if row["expires_at"] < now:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=409, detail="nonce_expired")

    ok, reason, issuer, subject = verify_vc(payload["vc"], signer)
    if not ok:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=401, detail="invalid_vc_signature")

    jti = payload["vc"].get("jti")
    revoked = False
    if jti:
        r2 = await db.execute_fetchone(
            "SELECT status FROM vc_status WHERE vc_id=?", (jti,)
        )
        if r2 and r2["status"] == "revoked":
            revoked = True

    holder = payload.get("holder", {})
    holder_did = holder.get("did") or ""
    holder_pk_b64u = holder.get("pk_b64u") or ""
    holder_sig_b64u = holder.get("sig_b64u") or ""

    if (payload["vc"].get("credentialSubject") or {}).get("id", "") != holder_did:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=400, detail="subject_holder_mismatch")

    expected_did = f"did:key:z{holder_pk_b64u}"
    if expected_did != holder_did:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=400, detail="did_pk_mismatch")

    pk = b64u_d(holder_pk_b64u)
    sig = b64u_d(holder_sig_b64u)
    msg = ch.encode("utf-8")

    try:
        signer.verify(pk, msg, sig)
    except Exception:
        await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
        await db.commit()
        raise HTTPException(status_code=401, detail="bad_holder_signature")

    await db.execute("DELETE FROM used_nonces WHERE nonce=?", (ch,))
    await db.commit()

    if revoked:
        return VerifyResp(valid=False, reason="revoked", issuer=issuer, subject=subject, revoked=True)

    return VerifyResp(valid=True, reason="ok", issuer=issuer, subject=subject, revoked=False)

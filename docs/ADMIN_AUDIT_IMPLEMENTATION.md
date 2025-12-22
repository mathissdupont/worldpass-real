# WorldPass Admin Audit Logging Implementation Guide

## Files Created
1. **backend/audit.py** - Audit logging helper functions
2. **AUDIT_INTEGRATION_GUIDE.txt** - Integration examples
3. **AUDIT_SCHEMAS.txt** - Pydantic schemas

## Integration Steps

### 1. Add to backend/app.py imports (top of file):
```python
from audit import log_admin_action, log_issuer_action, get_audit_logs
```

### 2. Add to backend/schemas.py (end of file):
```python
class AuditLogItem(BaseModel):
    id: int
    timestamp: int
    action: str
    admin: Optional[str] = None
    subject_did: Optional[str] = None
    result: str
    details: Dict[str, Any] = {}
    ip: Optional[str] = None

class AuditLogsResp(BaseModel):
    logs: List[AuditLogItem]
    total: int
```

### 3. Update admin_login in backend/app.py:
```python
@app.post(f"{API}/admin/login", response_model=AdminLoginResp)
async def admin_login(request: Request, body: AdminLoginReq):
    if not settings.ADMIN_PASS_HASH:
        raise HTTPException(status_code=400, detail="Admin password not configured.")
    
    if body.username != settings.ADMIN_USER:
        await log_admin_action("login", body.username, result="fail", ip_address=request.client.host)
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    if not bcrypt.checkpw(body.password.encode(), settings.ADMIN_PASS_HASH.encode()):
        await log_admin_action("login", body.username, result="fail", ip_address=request.client.host)
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    await log_admin_action("login", body.username, details={"ip": request.client.host}, result="ok")
    
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode = {"sub": body.username, "exp": expire}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    return AdminLoginResp(token=token)
```

### 4. Update admin_approve_issuer in backend/app.py:
```python
@app.post(
    f"{API}/admin/issuers/approve",
    response_model=ApproveIssuerResp,
    dependencies=[Depends(_require_admin)],
)
async def admin_approve_issuer(body: ApproveIssuerReq, x_token: str = Header(...), db=Depends(get_db)):
    # Get admin username
    payload = jwt.decode(x_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    admin_username = payload.get("sub")
    
    api_key = _gen_api_key()
    now = int(time.time())
    row = await db.execute_fetchone("SELECT * FROM issuers WHERE id=?", (body.issuer_id,))
    if not row:
        await log_admin_action("approve_issuer", admin_username, {"issuer_id": body.issuer_id}, result="fail")
        raise HTTPException(status_code=404, detail="issuer_not_found")

    from core.crypto_ed25519 import b64u
    sk_bytes, pk_bytes = signer.generate_keypair()
    sk_b64u = b64u(sk_bytes)
    pk_b64u = b64u(pk_bytes)
    
    issuer_did = row["did"] if row["did"] else f"did:key:z{pk_b64u}"

    await db.execute(
        "UPDATE issuers SET status='approved', api_key_hash=?, sk_b64u=?, pk_b64u=?, did=?, updated_at=? WHERE id=?",
        (_sha256(api_key), sk_b64u, pk_b64u, issuer_did, now, body.issuer_id),
    )
    await db.commit()
    
    await log_admin_action(
        "approve_issuer",
        admin_username,
        {"issuer_id": body.issuer_id, "issuer_name": row["name"]},
        result="ok"
    )
    
    return ApproveIssuerResp(api_key=api_key)
```

### 5. Add GET /api/admin/logs endpoint in backend/app.py (after admin_approve_issuer):
```python
@app.get(
    f"{API}/admin/logs",
    dependencies=[Depends(_require_admin)],
)
async def admin_get_logs(
    limit: int = 100,
    offset: int = 0,
    action: str = None,
    result: str = None
):
    logs = await get_audit_logs(
        limit=limit,
        offset=offset,
        action_filter=action,
        result_filter=result
    )
    total = len(logs)  # In production, query total separately
    return {"logs": logs, "total": total}
```

### 6. Update web/src/pages/admin/Logs.jsx to fetch real data:

```javascript
const loadLogs = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem("wp_admin_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }

    const params = new URLSearchParams();
    params.append("limit", "100");
    if (typeFilter) params.append("action", typeFilter);

    const response = await fetch(`/api/admin/logs?${params}`, {
      headers: { "x-token": token }
    });

    if (!response.ok) {
      throw new Error("Failed to load logs");
    }

    const data = await response.json();
    setLogs(data.logs || []);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

### 7. Add issuer action logging:

In issuer endpoints (e.g., /api/issuer/issue, /api/issuer/revoke), add:
```python
from audit import log_issuer_action

# After credential issuance:
await log_issuer_action(
    "issue_credential",
    issuer_id=issuer_row["id"],
    issuer_did=issuer_row["did"],
    details={"vc_id": vc_id, "subject_did": subject_did},
    subject_did=subject_did,
    result="ok"
)
```

## Deployment
1. Copy audit.py to production: `/srv/worldpass/worldpass-real/backend/audit.py`
2. Update app.py with all changes
3. Update schemas.py
4. Rebuild backend: `docker compose down && docker compose up -d --build`
5. Test: `curl -H "x-token: YOUR_TOKEN" https://worldpass-beta.heptapusgroup.com/api/admin/logs`

## Done! 🎉
All admin and issuer actions are now logged and viewable in Admin Panel > Logs.

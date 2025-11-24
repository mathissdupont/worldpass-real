"""
Issuer Console API Endpoints
Modern, production-grade issuer management APIs
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import time
import json
from database import get_db
from schemas import (
    IssuerUpdateReq,
    IssuerStatsResp,
    IssuerCredentialListReq,
    IssuerCredentialListResp,
    IssuerCredentialItem,
    IssuerCredentialDetailResp,
    IssuerTemplateReq,
    IssuerTemplateItem,
    IssuerTemplateListResp,
    IssuerWebhookReq,
    IssuerWebhookItem,
    IssuerWebhookListResp,
    IssuerProfileResp,
)

router = APIRouter(prefix="/api/issuer", tags=["issuer"])


async def _get_current_issuer_from_dep(x_token: Optional[str], db):
    """Shared dependency to get current authenticated issuer"""
    # This will be imported from app.py's _get_current_issuer
    # For now, we'll import it dynamically to avoid circular imports
    from app import _get_current_issuer
    from fastapi import Header
    return await _get_current_issuer(x_token=x_token, db=db)


# ---------- Issuer Profile & Settings ----------
@router.patch("/me")
async def update_issuer_profile(
    body: IssuerUpdateReq,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Update issuer profile/settings"""
    now = int(time.time())
    updates = []
    params = []
    
    if body.name is not None:
        updates.append("name=?")
        params.append(body.name)
    
    if body.domain is not None:
        updates.append("domain=?")
        params.append(body.domain)
    
    if body.contact_email is not None:
        updates.append("contact_email=?")
        params.append(body.contact_email)
    
    if body.support_link is not None:
        updates.append("support_link=?")
        params.append(body.support_link)
    
    if body.timezone is not None:
        updates.append("timezone=?")
        params.append(body.timezone)
    
    if body.locale is not None:
        updates.append("locale=?")
        params.append(body.locale)
    
    if updates:
        updates.append("updated_at=?")
        params.append(now)
        params.append(issuer["id"])
        
        sql = f"UPDATE issuers SET {', '.join(updates)} WHERE id=?"
        await db.execute(sql, tuple(params))
        await db.commit()
    
    # Fetch updated issuer
    updated = await db.execute_fetchone(
        """
        SELECT id, name, email, domain, did, status, created_at, updated_at,
               contact_email, support_link, timezone, locale, meta
        FROM issuers WHERE id=?
        """,
        (issuer["id"],)
    )
    
    return IssuerProfileResp(issuer={
        "id": updated["id"],
        "name": updated["name"],
        "email": updated["email"],
        "domain": updated["domain"] or "",
        "did": updated["did"] or "",
        "status": updated["status"],
        "created_at": updated["created_at"],
        "updated_at": updated["updated_at"],
        "contact_email": updated["contact_email"] or "",
        "support_link": updated["support_link"] or "",
        "timezone": updated["timezone"] or "UTC",
        "locale": updated["locale"] or "en",
        "meta": json.loads(updated["meta"] or "{}")
    })


# ---------- Dashboard Stats ----------
@router.get("/stats", response_model=IssuerStatsResp)
async def get_issuer_stats(
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Get dashboard statistics for issuer"""
    # Total issued
    total_row = await db.execute_fetchone(
        "SELECT COUNT(*) as count FROM issued_vcs WHERE issuer_id=?",
        (issuer["id"],)
    )
    total_issued = total_row["count"] if total_row else 0
    
    # Active (valid) count
    active_row = await db.execute_fetchone(
        """
        SELECT COUNT(*) as count FROM issued_vcs iv
        JOIN vc_status vs ON iv.vc_id = vs.vc_id
        WHERE iv.issuer_id=? AND vs.status='valid'
        """,
        (issuer["id"],)
    )
    active_count = active_row["count"] if active_row else 0
    
    # Revoked count
    revoked_row = await db.execute_fetchone(
        """
        SELECT COUNT(*) as count FROM issued_vcs iv
        JOIN vc_status vs ON iv.vc_id = vs.vc_id
        WHERE iv.issuer_id=? AND vs.status='revoked'
        """,
        (issuer["id"],)
    )
    revoked_count = revoked_row["count"] if revoked_row else 0
    
    # Expired count (for now, we'll estimate or set to 0)
    expired_count = 0  # TODO: Add expiration logic based on VC exp field
    
    return IssuerStatsResp(
        total_issued=total_issued,
        active_count=active_count,
        revoked_count=revoked_count,
        expired_count=expired_count
    )


# ---------- Credentials Management ----------
@router.get("/credentials", response_model=IssuerCredentialListResp)
async def list_issuer_credentials(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    template_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[int] = Query(None),
    date_to: Optional[int] = Query(None),
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """List credentials issued by this issuer with pagination and filters"""
    
    # Build query
    where_clauses = ["iv.issuer_id=?"]
    params = [issuer["id"]]
    
    if status:
        where_clauses.append("vs.status=?")
        params.append(status)
    
    if template_type:
        where_clauses.append("iv.credential_type=?")
        params.append(template_type)
    
    if search:
        where_clauses.append("(iv.subject_did LIKE ? OR iv.vc_id LIKE ?)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern])
    
    if date_from:
        where_clauses.append("iv.created_at >= ?")
        params.append(date_from)
    
    if date_to:
        where_clauses.append("iv.created_at <= ?")
        params.append(date_to)
    
    where_sql = " AND ".join(where_clauses)
    
    # Count total
    count_sql = f"""
        SELECT COUNT(*) as count FROM issued_vcs iv
        LEFT JOIN vc_status vs ON iv.vc_id = vs.vc_id
        WHERE {where_sql}
    """
    total_row = await db.execute_fetchone(count_sql, tuple(params))
    total = total_row["count"] if total_row else 0
    
    # Fetch page
    offset = (page - 1) * per_page
    list_sql = f"""
        SELECT iv.id, iv.vc_id, iv.subject_did, iv.recipient_id, 
               iv.credential_type, iv.created_at, iv.updated_at,
               COALESCE(vs.status, 'unknown') as status
        FROM issued_vcs iv
        LEFT JOIN vc_status vs ON iv.vc_id = vs.vc_id
        WHERE {where_sql}
        ORDER BY iv.created_at DESC
        LIMIT ? OFFSET ?
    """
    params.extend([per_page, offset])
    
    rows = await db.execute_fetchall(list_sql, tuple(params))
    
    credentials = []
    for row in rows:
        credentials.append(IssuerCredentialItem(
            id=row["id"],
            vc_id=row["vc_id"] or "",
            subject_did=row["subject_did"] or "",
            recipient_id=row["recipient_id"],
            credential_type=row["credential_type"] or "Unknown",
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        ))
    
    return IssuerCredentialListResp(
        credentials=credentials,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/credentials/{vc_id}", response_model=IssuerCredentialDetailResp)
async def get_credential_detail(
    vc_id: str,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Get detailed view of a credential"""
    # Fetch credential
    row = await db.execute_fetchone(
        """
        SELECT iv.*, COALESCE(vs.status, 'unknown') as status
        FROM issued_vcs iv
        LEFT JOIN vc_status vs ON iv.vc_id = vs.vc_id
        WHERE iv.vc_id=? AND iv.issuer_id=?
        """,
        (vc_id, issuer["id"])
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="credential_not_found")
    
    # Parse credential payload
    try:
        credential = json.loads(row["payload"])
    except:
        credential = {}
    
    # Fetch audit log for this credential
    audit_rows = await db.execute_fetchall(
        """
        SELECT ts, action, result, meta
        FROM audit_logs
        WHERE meta LIKE ?
        ORDER BY ts DESC
        LIMIT 50
        """,
        (f'%"vc_id": "{vc_id}"%',)
    )
    
    audit_log = []
    for audit_row in audit_rows:
        audit_log.append({
            "timestamp": audit_row["ts"],
            "action": audit_row["action"],
            "result": audit_row["result"],
            "meta": json.loads(audit_row["meta"] or "{}")
        })
    
    return IssuerCredentialDetailResp(
        credential=credential,
        status=row["status"],
        audit_log=audit_log
    )


# ---------- Templates Management ----------
@router.get("/templates", response_model=IssuerTemplateListResp)
async def list_issuer_templates(
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """List all templates for this issuer"""
    rows = await db.execute_fetchall(
        """
        SELECT id, name, description, vc_type, schema_json, is_active, created_at, updated_at
        FROM issuer_templates
        WHERE issuer_id=?
        ORDER BY created_at DESC
        """,
        (issuer["id"],)
    )
    
    templates = []
    for row in rows:
        try:
            schema_json = json.loads(row["schema_json"])
        except:
            schema_json = {}
        
        templates.append(IssuerTemplateItem(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            vc_type=row["vc_type"],
            schema_data=schema_json,
            is_active=bool(row["is_active"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        ))
    
    return IssuerTemplateListResp(templates=templates)


@router.post("/templates")
async def create_issuer_template(
    body: IssuerTemplateReq,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Create a new template"""
    now = int(time.time())
    
    cur = await db.execute(
        """
        INSERT INTO issuer_templates(issuer_id, name, description, vc_type, schema_json, is_active, created_at, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            issuer["id"],
            body.name,
            body.description or "",
            body.vc_type,
            json.dumps(body.schema_data),
            1 if body.is_active else 0,
            now,
            now
        )
    )
    await db.commit()
    
    return {"ok": True, "template_id": cur.lastrowid}


@router.patch("/templates/{template_id}")
async def update_issuer_template(
    template_id: int,
    body: IssuerTemplateReq,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Update a template"""
    # Check ownership
    existing = await db.execute_fetchone(
        "SELECT id FROM issuer_templates WHERE id=? AND issuer_id=?",
        (template_id, issuer["id"])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="template_not_found")
    
    now = int(time.time())
    await db.execute(
        """
        UPDATE issuer_templates
        SET name=?, description=?, vc_type=?, schema_data=?, is_active=?, updated_at=?
        WHERE id=?
        """,
        (
            body.name,
            body.description or "",
            body.vc_type,
            json.dumps(body.schema_data),
            1 if body.is_active else 0,
            now,
            template_id
        )
    )
    await db.commit()
    
    return {"ok": True}


@router.delete("/templates/{template_id}")
async def delete_issuer_template(
    template_id: int,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Delete a template"""
    # Check ownership
    existing = await db.execute_fetchone(
        "SELECT id FROM issuer_templates WHERE id=? AND issuer_id=?",
        (template_id, issuer["id"])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="template_not_found")
    
    await db.execute("DELETE FROM issuer_templates WHERE id=?", (template_id,))
    await db.commit()
    
    return {"ok": True}


# ---------- Webhooks Management ----------
@router.get("/webhooks", response_model=IssuerWebhookListResp)
async def list_issuer_webhooks(
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """List all webhooks for this issuer"""
    rows = await db.execute_fetchall(
        """
        SELECT id, url, event_type, is_active, created_at, last_delivery, failure_count
        FROM issuer_webhooks
        WHERE issuer_id=?
        ORDER BY created_at DESC
        """,
        (issuer["id"],)
    )
    
    webhooks = []
    for row in rows:
        webhooks.append(IssuerWebhookItem(
            id=row["id"],
            url=row["url"],
            event_type=row["event_type"],
            is_active=bool(row["is_active"]),
            created_at=row["created_at"],
            last_delivery=row["last_delivery"],
            failure_count=row["failure_count"] or 0
        ))
    
    return IssuerWebhookListResp(webhooks=webhooks)


@router.post("/webhooks")
async def create_issuer_webhook(
    body: IssuerWebhookReq,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Create a new webhook"""
    now = int(time.time())
    
    cur = await db.execute(
        """
        INSERT INTO issuer_webhooks(issuer_id, url, event_type, secret, is_active, created_at, failure_count)
        VALUES(?, ?, ?, ?, ?, ?, 0)
        """,
        (
            issuer["id"],
            body.url,
            body.event_type,
            body.secret or "",
            1 if body.is_active else 0,
            now
        )
    )
    await db.commit()
    
    return {"ok": True, "webhook_id": cur.lastrowid}


@router.patch("/webhooks/{webhook_id}")
async def update_issuer_webhook(
    webhook_id: int,
    body: IssuerWebhookReq,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Update a webhook"""
    # Check ownership
    existing = await db.execute_fetchone(
        "SELECT id FROM issuer_webhooks WHERE id=? AND issuer_id=?",
        (webhook_id, issuer["id"])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="webhook_not_found")
    
    await db.execute(
        """
        UPDATE issuer_webhooks
        SET url=?, event_type=?, secret=?, is_active=?
        WHERE id=?
        """,
        (
            body.url,
            body.event_type,
            body.secret or "",
            1 if body.is_active else 0,
            webhook_id
        )
    )
    await db.commit()
    
    return {"ok": True}


@router.delete("/webhooks/{webhook_id}")
async def delete_issuer_webhook(
    webhook_id: int,
    issuer=Depends(_get_current_issuer_from_dep),
    db=Depends(get_db)
):
    """Delete a webhook"""
    # Check ownership
    existing = await db.execute_fetchone(
        "SELECT id FROM issuer_webhooks WHERE id=? AND issuer_id=?",
        (webhook_id, issuer["id"])
    )
    if not existing:
        raise HTTPException(status_code=404, detail="webhook_not_found")
    
    await db.execute("DELETE FROM issuer_webhooks WHERE id=?", (webhook_id,))
    await db.commit()
    
    return {"ok": True}

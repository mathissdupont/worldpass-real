import time
from typing import Optional
import json
from database import get_db

async def log_admin_action(
    action: str,
    admin_username: str,
    details: dict = None,
    result: str = "ok",
    ip_address: str = None
):
    """
    Log admin actions for audit trail
    
    Args:
        action: Type of action (e.g., 'approve_issuer', 'login', 'update_settings')
        admin_username: Username of admin performing the action
        details: Additional context (issuer_id, changes, etc.)
        result: 'ok' or 'fail'
        ip_address: Optional IP address of requester
    """
    async with get_db() as db:
        meta = {
            "admin": admin_username,
            "details": details or {},
            "ip": ip_address
        }
        
        await db.execute(
            """
            INSERT INTO audit_logs (ts, action, did_issuer, did_subject, result, meta)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(time.time()),
                f"admin.{action}",
                admin_username,
                None,
                result,
                json.dumps(meta)
            )
        )
        await db.commit()


async def log_issuer_action(
    action: str,
    issuer_id: int,
    issuer_did: str = None,
    details: dict = None,
    result: str = "ok",
    subject_did: str = None
):
    """
    Log issuer actions for audit trail
    
    Args:
        action: Type of action (e.g., 'issue_credential', 'update_profile', 'revoke_credential')
        issuer_id: ID of issuer performing the action
        issuer_did: DID of issuer (optional)
        details: Additional context (vc_id, recipient, etc.)
        result: 'ok' or 'fail'
        subject_did: DID of credential subject (if applicable)
    """
    async with get_db() as db:
        meta = {
            "issuer_id": issuer_id,
            "details": details or {}
        }
        
        await db.execute(
            """
            INSERT INTO audit_logs (ts, action, did_issuer, did_subject, result, meta)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(time.time()),
                f"issuer.{action}",
                issuer_did,
                subject_did,
                result,
                json.dumps(meta)
            )
        )
        await db.commit()


async def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    action_filter: str = None,
    result_filter: str = None
):
    """
    Retrieve audit logs with optional filtering
    
    Args:
        limit: Maximum number of logs to return
        offset: Number of logs to skip (for pagination)
        action_filter: Filter by action type (e.g., 'admin.login', 'issuer.issue_credential')
        result_filter: Filter by result ('ok' or 'fail')
    
    Returns:
        List of audit log entries
    """
    async with get_db() as db:
        query = "SELECT * FROM audit_logs WHERE 1=1"
        params = []
        
        if action_filter:
            query += " AND action LIKE ?"
            params.append(f"%{action_filter}%")
        
        if result_filter:
            query += " AND result = ?"
            params.append(result_filter)
        
        query += " ORDER BY ts DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        logs = []
        for row in rows:
            log_id, ts, action, did_issuer, did_subject, result, meta = row
            meta_dict = json.loads(meta) if meta else {}
            
            logs.append({
                "id": log_id,
                "timestamp": ts,
                "action": action,
                "admin": meta_dict.get("admin") or did_issuer,
                "subject_did": did_subject,
                "result": result,
                "details": meta_dict.get("details", {}),
                "ip": meta_dict.get("ip")
            })
        
        return logs

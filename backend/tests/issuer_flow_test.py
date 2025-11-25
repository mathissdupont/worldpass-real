"""Simple end-to-end issuer flow test

Run with:
    python backend/tests/issuer_flow_test.py

Prerequisites:
 - Backend server running on http://127.0.0.1:8000
 - httpx installed in virtual environment

This script will:
 1. Register a new issuer
 2. Force-approve it by direct DB update (bypassing admin)
 3. Login and obtain JWT
 4. Fetch profile and stats
 5. Issue a test credential
 6. List credentials
 7. Revoke the credential
 8. Rotate API key
 9. Print a concise summary
"""

from __future__ import annotations
import time
import json
import sqlite3
import httpx
import os
import random
import string

BASE = "http://127.0.0.1:8000/api"
# Ensure parent (backend) directory is on sys.path for module imports
import sys, pathlib
parent_dir = pathlib.Path(__file__).resolve().parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))
try:
    from settings import settings  # use same DB path as server
    DB_PATH = settings.SQLITE_PATH
except Exception as import_err:
    print(f"[WARN] Could not import settings, falling back. err={import_err}")
    # Fallback (unlikely to be correct if overridden in .env)
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "worldpass.db")

def rand_suffix():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

def db_connect():
    path = os.path.abspath(DB_PATH)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def main():
    client = httpx.Client(timeout=10.0)
    results = {}

    # 1. Register issuer
    issuer_email = f"issuer_{rand_suffix()}@example.test"
    payload = {
        "name": "Test Issuer",
        "email": issuer_email,
        "password": "StrongPass123!",
        "domain": "example.test",
        "did": f"did:test:issuer:{rand_suffix()}"
    }
    r = client.post(f"{BASE}/issuer/register", json=payload)
    results['register_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] Register:", r.text)
        return
    reg = r.json()
    issuer_id = reg['issuer_id']
    verification_code = reg['verification_code']
    results['issuer_id'] = issuer_id
    results['verification_code'] = verification_code
    print(f"[OK] Registered issuer id={issuer_id}")

    # 2. Force approve + ensure DID in DB (bypass admin)
    conn = db_connect()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE issuers SET status='approved' WHERE id=?", (issuer_id,))
    except sqlite3.OperationalError as e:
        print(f"[FAIL] DB approve step failed path={DB_PATH} error={e}")
        print("      Hint: Adjust .env SQLITE_PATH to a relative path like ./backend/data/worldpass.db and restart server.")
        return
    conn.commit()
    conn.close()
    print("[OK] Issuer status set to approved (DB override)")

    # 3. Login
    r = client.post(f"{BASE}/issuer/login", json={"email": issuer_email, "password": payload['password']})
    results['login_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] Login:", r.text)
        return
    login = r.json()
    token = login['token']
    results['token_prefix'] = token[:32] + '...'
    headers = {"X-Token": token}
    print("[OK] Logged in, token acquired")

    # 4. Profile
    r = client.get(f"{BASE}/issuer/profile", headers=headers)
    results['profile_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] Profile:", r.text); return
    profile = r.json()['issuer']
    issuer_did = profile['did']
    print(f"[OK] Profile fetched did={issuer_did or '(empty)'}")

    # 5. Stats (should be zero initially)
    r = client.get(f"{BASE}/issuer/stats", headers=headers)
    results['stats_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] Stats:", r.text); return
    stats = r.json()
    results['initial_stats'] = stats
    print(f"[OK] Initial stats: {stats}")

    # 6. Issue credential
    vc_id = f"test-vc-{int(time.time())}"
    vc = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential", "TestCredential"],
        "issuer": issuer_did,
        "issuanceDate": "2025-11-26T00:00:00Z",
        "credentialSubject": {"id": "did:test:subject:123", "name": "Alice"},
        "jti": vc_id
    }
    r = client.post(f"{BASE}/issuer/issue", json={"vc": vc}, headers=headers)
    results['issue_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] Issue:", r.text); return
    issue_resp = r.json()
    results['issued_vc_id'] = issue_resp['vc_id']
    print(f"[OK] Issued VC vc_id={issue_resp['vc_id']} recipient_id={issue_resp['recipient_id']}")

    # 7. List credentials
    r = client.get(f"{BASE}/issuer/credentials", headers=headers)
    results['list_creds_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] List creds:", r.text); return
    creds = r.json()
    results['credentials_count'] = len(creds)
    print(f"[OK] Listed credentials count={len(creds)}")

    # 8. Revoke credential
    r = client.post(f"{BASE}/issuer/revoke", json={"vc_id": vc_id}, headers=headers)
    results['revoke_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] Revoke:", r.text); return
    print(f"[OK] Revoked VC vc_id={vc_id}")

    # 9. Rotate API key
    r = client.post(f"{BASE}/issuer/api-key", headers=headers)
    results['rotate_status_code'] = r.status_code
    if r.status_code != 200:
        print("[FAIL] Rotate API key:", r.text); return
    api_key = r.json()['api_key']
    results['api_key_prefix'] = api_key[:12] + '...'
    print(f"[OK] Rotated API key prefix={results['api_key_prefix']}")

    # 10. Stats after issuance & revocation
    r = client.get(f"{BASE}/issuer/stats", headers=headers)
    if r.status_code == 200:
        results['final_stats'] = r.json()
        print(f"[OK] Final stats: {results['final_stats']}")

    print("\n=== SUMMARY ===")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()

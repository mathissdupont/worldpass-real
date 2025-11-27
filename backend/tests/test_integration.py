import sys
import os
import pytest
from fastapi.testclient import TestClient

# Fix import path to prioritize local backend modules over installed packages
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from settings import settings

# client = TestClient(app)  <-- Removed global client

def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    print("Health check passed")

def test_full_flow(client):
    # 1. Admin Login
    resp = client.post("/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    admin_token = resp.json()["token"]
    admin_headers = {"x-token": admin_token}
    print("Admin login passed")

    # 2. Register Issuer
    issuer_email = "test@univ.edu"
    issuer_pass = "issuerPass123!"
    issuer_data = {
        "name": "Test University",
        "email": issuer_email,
        "password": issuer_pass,
        "domain": "univ.edu",
        "did": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    }
    resp = client.post("/api/issuer/register", json=issuer_data)
    # If issuer already exists, we might need to handle it or just proceed if we can get the ID
    if resp.status_code == 400 and "email_already_registered" in resp.text:
        print("Issuer already registered")
        # We need to get the issuer ID to approve it, or assume it's already approved.
        # For simplicity in this test script, we might fail here if DB is not clean.
        # But let's try to login to get the ID if possible, or just skip approval.
    else:
        assert resp.status_code == 200, f"Issuer register failed: {resp.text}"
        issuer_id = resp.json()["issuer_id"]
        print(f"Issuer registered with ID: {issuer_id}")

        # 3. Approve Issuer
        resp = client.post("/api/admin/issuers/approve", 
                           headers=admin_headers,
                           json={"issuer_id": issuer_id})
        assert resp.status_code == 200, f"Issuer approval failed: {resp.text}"
        api_key = resp.json()["api_key"]
        print("Issuer approved, got API key")

    # 3.5 Issuer Login (New)
    resp = client.post("/api/issuer/login", json={
        "email": issuer_email,
        "password": issuer_pass
    })
    # If we skipped registration because it existed, we might not have the password if it was different.
    # Assuming clean DB for tests is better.
    if resp.status_code == 200:
        issuer_token = resp.json()["token"]
        print("Issuer logged in")
    else:
        print("Issuer login failed (maybe old account without password)")
        issuer_token = None

    # 4. User Register & Login
    user_email = "student@univ.edu"
    user_pass = "securePass123!"
    user_did = "did:key:z6MktWjP95fMqCMrfNhhY3M78CZQYw17ChQ4fQf7p4pM5sJ"
    resp = client.post("/api/user/register", json={
        "email": user_email,
        "password": user_pass,
        "first_name": "John",
        "last_name": "Doe",
        "did": user_did
    })
    # If user already exists from previous run, try login
    if resp.status_code == 400 and "email_already_registered" in resp.text:
        print("User already registered, proceeding to login")
    else:
        assert resp.status_code == 200, f"User register failed: {resp.text}"
    
    resp = client.post("/api/user/login", json={
        "email": user_email,
        "password": user_pass
    })
    assert resp.status_code == 200, f"User login failed: {resp.text}"
    user_token = resp.json()["token"]
    user_headers = {"x-token": user_token, "x-wallet-did": user_did}
    print("User logged in")

    # 5. Issue VC (Auto-add to user wallet)
    # Use a unique JTI to avoid collision if running multiple times
    import time
    jti = f"vc-test-{int(time.time())}"
    
    vc_payload = {
        "jti": jti,
        "issuer": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        "credentialSubject": {
            "id": "did:key:z6MktWjP95fMqCMrfNhhY3M78CZQYw17ChQ4fQf7p4pM5sJ",
            "degree": "Bachelor of Science"
        },
        "type": ["VerifiableCredential", "UniversityDegreeCredential"]
    }
    
    # Try issuing with Token if available, else API Key
    if issuer_token:
        headers = {"x-token": issuer_token}
        payload = {"vc": vc_payload} # api_key optional
    else:
        headers = {}
        payload = {"api_key": api_key, "vc": vc_payload}

    resp = client.post("/api/issuer/issue", json=payload, headers=headers)
    assert resp.status_code == 200, f"Issue VC failed: {resp.text}"
    print("VC Issued (and should be auto-added to user wallet)")

    # 6. User List VCs (Verify auto-add)
    resp = client.get("/api/user/vcs", headers=user_headers)
    assert resp.status_code == 200, f"List VCs failed: {resp.text}"
    vcs = resp.json()["vcs"]
    assert len(vcs) > 0
    # Check if we can read the degree
    found = False
    for item in vcs:
        if item["vc_payload"].get("jti") == jti:
            assert item["vc_payload"]["credentialSubject"]["degree"] == "Bachelor of Science"
            found = True
            break
    assert found, "Issued VC not found in user wallet (Auto-add failed)"
    print("VC retrieved and decrypted successfully")

if __name__ == "__main__":
    try:
        # Use context manager to ensure startup/shutdown events run
        with TestClient(app) as client:
            test_health(client)
            test_full_flow(client)
            print("ALL TESTS PASSED")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

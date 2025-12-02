"""
Integration tests for WorldPass Blockchain Proof Layer

Tests the full end-to-end flow of VC issuance, verification, and revocation
with blockchain proof layer integration.
"""

import pytest
from fastapi.testclient import TestClient


def test_blockchain_integration_full_flow(client):
    """
    Test the full blockchain integration flow:
    1. Admin approves issuer
    2. Issuer issues a VC (auto-registers on blockchain)
    3. Verify VC (checks blockchain hash)
    4. Revoke VC (marks as revoked on blockchain)
    5. Verify revoked VC fails
    """
    
    # 1. Admin login
    resp = client.post("/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert resp.status_code == 200
    admin_token = resp.json()["token"]
    admin_headers = {"x-token": admin_token}
    
    # 2. Register issuer
    issuer_email = "blockchain_test@university.edu"
    issuer_pass = "testPass123!"
    issuer_data = {
        "name": "Blockchain Test University",
        "email": issuer_email,
        "password": issuer_pass,
        "domain": "university.edu"
    }
    resp = client.post("/api/issuer/register", json=issuer_data)
    
    if resp.status_code == 400 and "email_already_registered" in resp.text:
        # Issuer already exists, just login
        pass
    else:
        assert resp.status_code == 200
        issuer_id = resp.json()["issuer_id"]
        
        # 3. Approve issuer
        resp = client.post("/api/admin/issuers/approve", 
                           headers=admin_headers,
                           json={"issuer_id": issuer_id})
        assert resp.status_code == 200
    
    # 4. Issuer login
    resp = client.post("/api/issuer/login", json={
        "email": issuer_email,
        "password": issuer_pass
    })
    assert resp.status_code == 200
    issuer_token = resp.json()["token"]
    issuer_headers = {"x-token": issuer_token}
    
    # 5. Get issuer profile
    resp = client.get("/api/issuer/profile", headers=issuer_headers)
    assert resp.status_code == 200
    profile = resp.json()
    issuer_info = profile.get("issuer", profile)
    issuer_did = issuer_info["did"]
    assert issuer_did.startswith("did:key:")
    
    # 6. Issue a VC
    import time
    import uuid
    jti = f"vc-blockchain-test-{uuid.uuid4().hex[:12]}"
    subject_did = "did:key:z6MkTestBlockchainSubject"
    
    vc_payload = {
        "jti": jti,
        "issuer": issuer_did,
        "issuanceDate": "2024-01-01T00:00:00Z",
        "credentialSubject": {
            "id": subject_did,
            "degree": "Blockchain Test Degree",
            "name": "Test Student"
        },
        "type": ["VerifiableCredential", "TestCredential"]
    }
    
    resp = client.post("/api/issuer/issue", 
                       headers=issuer_headers,
                       json={"vc": vc_payload})
    assert resp.status_code == 200
    result = resp.json()
    assert "vc" in result
    signed_vc = result["vc"]
    
    # 7. Verify the VC was registered on blockchain
    resp = client.get(f"/api/blockchain/vc/{jti}")
    assert resp.status_code == 200
    blockchain_resp = resp.json()
    assert blockchain_resp["ok"] is True
    assert blockchain_resp["record"] is not None
    assert blockchain_resp["record"]["vc_id"] == jti
    assert blockchain_resp["record"]["issuer_did"] == issuer_did
    assert blockchain_resp["record"]["revoked_at"] is None
    
    # Store the blockchain hash
    blockchain_hash = blockchain_resp["record"]["vc_hash"]
    
    # 8. Verify the VC hash using the blockchain endpoint
    from backend.blockchain.vc_hash import compute_vc_hash
    computed_hash = compute_vc_hash(signed_vc)
    
    resp = client.post("/api/blockchain/verify-vc", json={
        "vc_id": jti,
        "vc_hash": computed_hash
    })
    assert resp.status_code == 200
    verify_resp = resp.json()
    assert verify_resp["valid"] is True
    assert verify_resp["revoked"] is False
    assert verify_resp["hash_match"] is True
    
    # 9. Test verification with wrong hash
    resp = client.post("/api/blockchain/verify-vc", json={
        "vc_id": jti,
        "vc_hash": "0" * 64
    })
    assert resp.status_code == 200
    verify_resp = resp.json()
    assert verify_resp["valid"] is False
    assert verify_resp["hash_match"] is False
    
    # 10. Revoke the VC
    resp = client.post("/api/issuer/revoke",
                       headers=issuer_headers,
                       json={"vc_id": jti})
    assert resp.status_code == 200
    
    # 11. Verify the VC is now marked as revoked on blockchain
    resp = client.get(f"/api/blockchain/vc/{jti}")
    assert resp.status_code == 200
    blockchain_resp = resp.json()
    assert blockchain_resp["ok"] is True
    assert blockchain_resp["record"]["revoked_at"] is not None
    
    # 12. Verify that blockchain verification now fails for revoked VC
    resp = client.post("/api/blockchain/verify-vc", json={
        "vc_id": jti,
        "vc_hash": computed_hash
    })
    assert resp.status_code == 200
    verify_resp = resp.json()
    assert verify_resp["valid"] is False
    assert verify_resp["revoked"] is True
    assert verify_resp["hash_match"] is True  # Hash still matches, but revoked
    
    print("✅ Full blockchain integration test passed!")
    return signed_vc


def test_blockchain_api_register_vc(client):
    """Test directly registering a VC on blockchain via API"""
    from backend.blockchain.vc_hash import compute_vc_hash
    
    test_vc = {
        "jti": "test-api-vc-123",
        "issuer": "did:key:z6MkTestIssuer",
        "credentialSubject": {"id": "did:key:z6MkTestSubject", "name": "Test"}
    }
    
    vc_hash = compute_vc_hash(test_vc)
    
    resp = client.post("/api/blockchain/register-vc", json={
        "vc_id": "test-api-vc-123",
        "vc_hash": vc_hash,
        "issuer_did": "did:key:z6MkTestIssuer"
    })
    
    assert resp.status_code == 200
    result = resp.json()
    assert result["ok"] is True
    assert result["vc_id"] == "test-api-vc-123"
    assert result["vc_hash"] == vc_hash
    
    # Try to register again - should fail
    resp = client.post("/api/blockchain/register-vc", json={
        "vc_id": "test-api-vc-123",
        "vc_hash": vc_hash,
        "issuer_did": "did:key:z6MkTestIssuer"
    })
    assert resp.status_code == 409  # Conflict
    
    print("✅ Blockchain API register test passed!")


def test_blockchain_api_revoke_vc(client):
    """Test directly revoking a VC on blockchain via API"""
    from backend.blockchain.vc_hash import compute_vc_hash
    
    test_vc = {
        "jti": "test-api-revoke-vc-456",
        "issuer": "did:key:z6MkTestIssuer",
        "credentialSubject": {"id": "did:key:z6MkTestSubject", "name": "Test"}
    }
    
    vc_hash = compute_vc_hash(test_vc)
    
    # Register first
    resp = client.post("/api/blockchain/register-vc", json={
        "vc_id": "test-api-revoke-vc-456",
        "vc_hash": vc_hash,
        "issuer_did": "did:key:z6MkTestIssuer"
    })
    assert resp.status_code == 200
    
    # Now revoke
    resp = client.post("/api/blockchain/revoke-vc", json={
        "vc_id": "test-api-revoke-vc-456"
    })
    assert resp.status_code == 200
    result = resp.json()
    assert result["ok"] is True
    assert result["revoked_at"] is not None
    
    # Verify it's revoked
    resp = client.get("/api/blockchain/vc/test-api-revoke-vc-456")
    assert resp.status_code == 200
    result = resp.json()
    assert result["record"]["revoked_at"] is not None
    
    # Try to revoke non-existent VC
    resp = client.post("/api/blockchain/revoke-vc", json={
        "vc_id": "nonexistent-vc"
    })
    assert resp.status_code == 404
    
    print("✅ Blockchain API revoke test passed!")


if __name__ == "__main__":
    from fastapi.testclient import TestClient
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from app import app
    
    with TestClient(app) as test_client:
        test_blockchain_integration_full_flow(test_client)
        test_blockchain_api_register_vc(test_client)
        test_blockchain_api_revoke_vc(test_client)
        print("\n✅ All blockchain integration tests passed!")

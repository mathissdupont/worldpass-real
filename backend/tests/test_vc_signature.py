"""
Test VC signature issuance and verification
"""
import pytest
import json
from fastapi.testclient import TestClient


def test_vc_has_valid_signature(client):
    """Test that issued VCs have valid signatures that can be verified"""
    
    # 1. Setup: Admin login
    resp = client.post("/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert resp.status_code == 200
    admin_token = resp.json()["token"]
    admin_headers = {"x-token": admin_token}
    
    # 2. Register issuer
    issuer_email = "sig_test@university.edu"
    issuer_pass = "testPass123!"
    issuer_data = {
        "name": "Signature Test University",
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
        
        # 3. Approve issuer (generates keys)
        resp = client.post("/api/admin/issuers/approve", 
                           headers=admin_headers,
                           json={"issuer_id": issuer_id})
        assert resp.status_code == 200
        print(f"Issuer approved, API key generated")
    
    # 4. Issuer login
    resp = client.post("/api/issuer/login", json={
        "email": issuer_email,
        "password": issuer_pass
    })
    assert resp.status_code == 200
    issuer_token = resp.json()["token"]
    issuer_headers = {"x-token": issuer_token}
    
    # 5. Get issuer profile to check DID and keys
    resp = client.get("/api/issuer/profile", headers=issuer_headers)
    assert resp.status_code == 200
    profile = resp.json()
    issuer_info = profile.get("issuer", profile)  # Handle both wrapped and unwrapped responses
    issuer_did = issuer_info["did"]
    assert issuer_did, "Issuer should have a DID"
    assert issuer_did.startswith("did:key:"), "Issuer DID should use did:key method"
    print(f"Issuer DID: {issuer_did}")
    
    # 6. Issue a credential
    import time
    jti = f"vc-sig-test-{int(time.time())}"
    subject_did = "did:key:z6MkTestSubject123456789"
    
    vc_payload = {
        "jti": jti,
        "issuer": issuer_did,
        "issuanceDate": "2024-01-01T00:00:00Z",
        "credentialSubject": {
            "id": subject_did,
            "degree": "Test Degree",
            "name": "Test Student"
        },
        "type": ["VerifiableCredential", "TestCredential"]
    }
    
    resp = client.post("/api/issuer/issue", 
                       headers=issuer_headers,
                       json={"vc": vc_payload})
    assert resp.status_code == 200
    result = resp.json()
    
    # 7. Verify the response contains the signed VC
    assert "vc" in result, "Response should contain the signed VC"
    signed_vc = result["vc"]
    
    # 8. Check that the VC has a proof
    assert "proof" in signed_vc, "Signed VC should have a proof"
    proof = signed_vc["proof"]
    
    # 9. Validate proof structure
    assert proof["type"] == "Ed25519Signature2020", "Proof type should be Ed25519Signature2020"
    assert "jws" in proof, "Proof should have a JWS signature"
    assert "issuer_pk_b64u" in proof, "Proof should have issuer public key"
    assert "verificationMethod" in proof, "Proof should have verificationMethod"
    assert "created" in proof, "Proof should have created timestamp"
    assert proof["proofPurpose"] == "assertionMethod", "Proof purpose should be assertionMethod"
    
    print(f"✓ VC has valid proof structure")
    print(f"  Proof type: {proof['type']}")
    print(f"  Verification method: {proof['verificationMethod']}")
    print(f"  JWS signature length: {len(proof['jws'])} chars")
    
    # 10. Verify the signature using the backend's verify function
    from backend.core.vc import verify_vc
    from backend.core.crypto_ed25519 import Ed25519Signer
    
    signer = Ed25519Signer()
    valid, reason, issuer_from_vc, subject_from_vc = verify_vc(signed_vc, signer)
    
    assert valid, f"VC signature verification failed: {reason}"
    assert issuer_from_vc == issuer_did, "Issuer DID should match"
    assert subject_from_vc == subject_did, "Subject DID should match"
    
    print(f"✓ VC signature verified successfully!")
    print(f"  Issuer: {issuer_from_vc}")
    print(f"  Subject: {subject_from_vc}")
    
    # 11. Test that modifying the VC invalidates the signature
    tampered_vc = signed_vc.copy()
    tampered_vc["credentialSubject"]["degree"] = "MODIFIED"
    
    valid, reason, _, _ = verify_vc(tampered_vc, signer)
    assert not valid, "Tampered VC should fail verification"
    print(f"✓ Tampered VC correctly rejected: {reason}")
    
    # 12. Print the complete signed VC for inspection
    print("\n=== Signed VC Structure ===")
    print(json.dumps(signed_vc, indent=2))
    
    return signed_vc


def test_vc_presentation_verification(client):
    """Test that a VC can be used in a presentation and verified"""
    
    # This will be expanded to test the full presentation flow
    # For now, we've validated that the backend properly signs VCs
    pass


if __name__ == "__main__":
    from fastapi.testclient import TestClient
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from app import app
    
    with TestClient(app) as test_client:
        signed_vc = test_vc_has_valid_signature(test_client)
        print("\n✅ All VC signature tests passed!")

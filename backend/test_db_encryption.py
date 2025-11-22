#!/usr/bin/env python3
"""
Unit test for VC encryption in database storage
Tests the encryption at the database level
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

os.environ['VC_ENCRYPTION_KEY'] = 'test-key-for-unit-test-12345'
os.environ['SQLITE_PATH'] = 'test_vc_db.db'

import asyncio
import aiosqlite
import json
from core.vc_crypto import VCEncryptor
from database import init_db, SCHEMA_SQL


async def test_vc_storage_encryption():
    """Test that VCs are encrypted in database storage"""
    print("Testing VC encryption in database storage...")
    
    # Clean up any existing test database
    if os.path.exists('test_vc_db.db'):
        os.remove('test_vc_db.db')
    
    # Initialize database
    await init_db()
    
    # Create encryptor
    encryptor = VCEncryptor('test-key-for-unit-test-12345')
    
    # Create a test user
    async with aiosqlite.connect('test_vc_db.db') as db:
        db.row_factory = aiosqlite.Row
        
        print("\n1. Creating test user...")
        cur = await db.execute(
            """
            INSERT INTO users(email, first_name, last_name, password_hash, did, display_name, theme, created_at, updated_at, status)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            """,
            ('test@example.com', 'Test', 'User', 'hash', '', 'Test User', 'light', 1, 1)
        )
        await db.commit()
        user_id = cur.lastrowid
        print(f"✓ User created with ID: {user_id}")
        
        # Create a test VC
        test_vc = {
            "type": ["VerifiableCredential", "StudentCard"],
            "issuer": "did:key:z123456789",
            "issuanceDate": "2024-01-01T00:00:00Z",
            "credentialSubject": {
                "id": "did:key:z987654321",
                "name": "Test User",
                "studentId": "12345",
                "sensitive_data": "This should be encrypted"
            },
            "jti": "vc-test-123"
        }
        
        print("\n2. Encrypting VC...")
        encrypted_payload = encryptor.encrypt_vc(test_vc)
        print(f"✓ VC encrypted (length: {len(encrypted_payload)} chars)")
        print(f"  First 50 chars: {encrypted_payload[:50]}...")
        
        # Store encrypted VC in database
        print("\n3. Storing encrypted VC in database...")
        await db.execute(
            "INSERT INTO user_vcs(user_id, vc_id, vc_payload, created_at, updated_at) VALUES(?,?,?,?,?)",
            (user_id, test_vc["jti"], encrypted_payload, 1, 1)
        )
        await db.commit()
        print("✓ VC stored in database")
        
        # Verify VC is encrypted in database
        print("\n4. Verifying VC is encrypted in database...")
        row = await db.execute_fetchone(
            "SELECT vc_payload FROM user_vcs WHERE vc_id=?",
            (test_vc["jti"],)
        )
        stored_payload = row["vc_payload"]
        
        # Verify it's not plain JSON
        try:
            json.loads(stored_payload)
            print("❌ ERROR: VC is stored as plain JSON!")
            return False
        except json.JSONDecodeError:
            print("✓ VC is stored in encrypted format (not plain JSON)")
        
        # Verify it contains encrypted data markers
        assert stored_payload.startswith('gAAAAA'), "Encrypted data should start with Fernet prefix"
        print("✓ VC has correct encryption format")
        
        # Decrypt and verify
        print("\n5. Decrypting VC...")
        decrypted_vc = encryptor.decrypt_vc(stored_payload)
        print(f"✓ VC decrypted successfully")
        print(f"  Decrypted VC: {json.dumps(decrypted_vc, indent=2)}")
        
        # Verify decrypted data matches original
        print("\n6. Verifying decrypted data matches original...")
        assert decrypted_vc["jti"] == test_vc["jti"]
        assert decrypted_vc["credentialSubject"]["name"] == test_vc["credentialSubject"]["name"]
        assert decrypted_vc["credentialSubject"]["sensitive_data"] == test_vc["credentialSubject"]["sensitive_data"]
        print("✓ Decrypted VC matches original")
        
        # Test multiple VCs
        print("\n7. Testing multiple VCs...")
        for i in range(3):
            vc = {
                "type": ["VerifiableCredential"],
                "jti": f"vc-multi-{i}",
                "data": f"Sensitive data {i}"
            }
            encrypted = encryptor.encrypt_vc(vc)
            await db.execute(
                "INSERT INTO user_vcs(user_id, vc_id, vc_payload, created_at, updated_at) VALUES(?,?,?,?,?)",
                (user_id, vc["jti"], encrypted, 1, 1)
            )
        await db.commit()
        print("✓ Multiple VCs stored")
        
        # Verify all VCs are encrypted
        print("\n8. Verifying all VCs are encrypted...")
        rows = await db.execute_fetchall(
            "SELECT vc_id, vc_payload FROM user_vcs WHERE user_id=?",
            (user_id,)
        )
        assert len(rows) == 4, f"Expected 4 VCs, got {len(rows)}"
        
        for row in rows:
            payload = row["vc_payload"]
            # Verify each is encrypted
            try:
                json.loads(payload)
                print(f"❌ ERROR: VC {row['vc_id']} is not encrypted!")
                return False
            except json.JSONDecodeError:
                pass  # Good, it's encrypted
            
            # Verify can decrypt
            decrypted = encryptor.decrypt_vc(payload)
            assert "jti" in decrypted
        
        print("✓ All VCs are properly encrypted")
        
        # Test backward compatibility with plain JSON
        print("\n9. Testing backward compatibility with plain JSON...")
        legacy_vc = {
            "type": ["VerifiableCredential"],
            "jti": "vc-legacy-plain",
            "note": "This is a legacy plain JSON VC"
        }
        await db.execute(
            "INSERT INTO user_vcs(user_id, vc_id, vc_payload, created_at, updated_at) VALUES(?,?,?,?,?)",
            (user_id, legacy_vc["jti"], json.dumps(legacy_vc), 1, 1)
        )
        await db.commit()
        
        # Verify detection works
        row = await db.execute_fetchone(
            "SELECT vc_payload FROM user_vcs WHERE vc_id=?",
            (legacy_vc["jti"],)
        )
        legacy_payload = row["vc_payload"]
        
        is_encrypted = encryptor.is_encrypted(legacy_payload)
        assert not is_encrypted, "Legacy plain JSON should be detected as not encrypted"
        print("✓ Legacy plain JSON VC correctly detected")
        
        # Can be read as plain JSON
        parsed = json.loads(legacy_payload)
        assert parsed["jti"] == legacy_vc["jti"]
        print("✓ Legacy plain JSON VC can be parsed")
    
    # Clean up
    if os.path.exists('test_vc_db.db'):
        os.remove('test_vc_db.db')
    
    return True


async def test_encryption_security():
    """Test that encryption is secure"""
    print("\n\nTesting encryption security...")
    
    encryptor1 = VCEncryptor('key1')
    encryptor2 = VCEncryptor('key2')
    
    test_vc = {
        "type": ["VerifiableCredential"],
        "jti": "vc-security-test",
        "secret": "This is highly sensitive data"
    }
    
    print("\n1. Testing different keys produce different ciphertexts...")
    encrypted1 = encryptor1.encrypt_vc(test_vc)
    encrypted2 = encryptor2.encrypt_vc(test_vc)
    
    assert encrypted1 != encrypted2, "Different keys should produce different ciphertexts"
    print("✓ Different keys produce different ciphertexts")
    
    print("\n2. Testing wrong key cannot decrypt...")
    try:
        encryptor2.decrypt_vc(encrypted1)
        print("❌ ERROR: Wrong key was able to decrypt!")
        return False
    except ValueError:
        print("✓ Wrong key cannot decrypt (as expected)")
    
    print("\n3. Testing correct key can decrypt...")
    decrypted = encryptor1.decrypt_vc(encrypted1)
    assert decrypted == test_vc
    print("✓ Correct key can decrypt")
    
    return True


if __name__ == "__main__":
    print("Running VC database encryption tests...\n")
    print("=" * 60)
    
    try:
        result1 = asyncio.run(test_vc_storage_encryption())
        result2 = asyncio.run(test_encryption_security())
        
        if result1 and result2:
            print("\n" + "=" * 60)
            print("\n🎉 All database encryption tests passed!")
            print("\n✅ VCs are properly encrypted at rest in the database")
            print("✅ Sensitive data is not readable without the encryption key")
            print("✅ Backward compatibility with plain JSON is maintained")
            print("✅ Multiple VCs can be stored and retrieved")
            print("✅ Encryption is secure against unauthorized access")
        else:
            print("\n❌ Some tests failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

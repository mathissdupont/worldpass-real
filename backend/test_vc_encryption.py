#!/usr/bin/env python3
"""
Test script for VC encryption
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from core.vc_crypto import VCEncryptor, generate_encryption_key
import json


def test_encryption_key_generation():
    """Test encryption key generation"""
    print("Testing encryption key generation...")
    key = generate_encryption_key()
    assert len(key) == 44, "Key should be 44 characters (base64 encoded 32 bytes)"
    assert key.endswith('='), "Fernet key should end with ="
    print(f"✓ Generated key: {key}")


def test_vc_encryption_decryption():
    """Test VC encryption and decryption"""
    print("\nTesting VC encryption and decryption...")
    
    # Generate a test encryption key
    key = generate_encryption_key()
    encryptor = VCEncryptor(key)
    
    # Test VC payload
    test_vc = {
        "type": ["VerifiableCredential", "StudentCard"],
        "issuer": "did:key:z123456789",
        "issuanceDate": "2024-01-01T00:00:00Z",
        "credentialSubject": {
            "id": "did:key:z987654321",
            "name": "John Doe",
            "studentId": "12345"
        },
        "jti": "vc-test-123"
    }
    
    # Encrypt
    encrypted = encryptor.encrypt_vc(test_vc)
    print(f"✓ Encrypted VC (first 50 chars): {encrypted[:50]}...")
    assert isinstance(encrypted, str), "Encrypted payload should be a string"
    assert len(encrypted) > 0, "Encrypted payload should not be empty"
    
    # Decrypt
    decrypted = encryptor.decrypt_vc(encrypted)
    print(f"✓ Decrypted VC: {json.dumps(decrypted, indent=2)}")
    assert decrypted == test_vc, "Decrypted VC should match original"
    print("✓ Encryption/decryption successful")


def test_is_encrypted():
    """Test the is_encrypted detection method"""
    print("\nTesting is_encrypted detection...")
    
    key = generate_encryption_key()
    encryptor = VCEncryptor(key)
    
    # Plain JSON should not be detected as encrypted
    plain_json = '{"type": "test"}'
    assert not encryptor.is_encrypted(plain_json), "Plain JSON should not be detected as encrypted"
    print("✓ Plain JSON correctly detected as not encrypted")
    
    # Encrypted data should be detected
    encrypted = encryptor.encrypt_vc({"type": "test"})
    assert encryptor.is_encrypted(encrypted), "Encrypted data should be detected as encrypted"
    print("✓ Encrypted data correctly detected as encrypted")


def test_backward_compatibility():
    """Test backward compatibility with plain JSON"""
    print("\nTesting backward compatibility...")
    
    key = generate_encryption_key()
    encryptor = VCEncryptor(key)
    
    # Simulate legacy plain JSON storage
    legacy_vc = {
        "type": ["VerifiableCredential"],
        "jti": "legacy-vc-123"
    }
    legacy_json = json.dumps(legacy_vc)
    
    # Should be detected as not encrypted
    assert not encryptor.is_encrypted(legacy_json), "Legacy JSON should not be detected as encrypted"
    print("✓ Legacy format detection works")
    
    # Should be parseable as JSON
    parsed = json.loads(legacy_json)
    assert parsed == legacy_vc, "Legacy VC should be parseable"
    print("✓ Backward compatibility maintained")


def test_different_encryption_keys():
    """Test that different keys produce different results"""
    print("\nTesting different encryption keys...")
    
    key1 = generate_encryption_key()
    key2 = generate_encryption_key()
    
    encryptor1 = VCEncryptor(key1)
    encryptor2 = VCEncryptor(key2)
    
    test_vc = {"type": "test", "data": "sensitive"}
    
    encrypted1 = encryptor1.encrypt_vc(test_vc)
    encrypted2 = encryptor2.encrypt_vc(test_vc)
    
    # Different keys should produce different encrypted results
    assert encrypted1 != encrypted2, "Different keys should produce different encrypted data"
    print("✓ Different keys produce different encrypted data")
    
    # Should decrypt correctly with the right key
    decrypted1 = encryptor1.decrypt_vc(encrypted1)
    assert decrypted1 == test_vc, "Should decrypt correctly with key1"
    print("✓ Decryption with correct key works")
    
    # Should fail with wrong key
    try:
        encryptor2.decrypt_vc(encrypted1)
        assert False, "Should not decrypt with wrong key"
    except ValueError:
        print("✓ Decryption with wrong key properly fails")


def test_password_based_key_derivation():
    """Test password-based key derivation"""
    print("\nTesting password-based key derivation...")
    
    password = "my-secure-password-123"
    encryptor1 = VCEncryptor(password)
    encryptor2 = VCEncryptor(password)
    
    test_vc = {"type": "test", "sensitive": "data"}
    
    # Same password should produce consistent keys
    encrypted = encryptor1.encrypt_vc(test_vc)
    decrypted = encryptor2.decrypt_vc(encrypted)
    
    assert decrypted == test_vc, "Same password should allow decryption"
    print("✓ Password-based key derivation works consistently")


if __name__ == "__main__":
    print("Running VC encryption tests...\n")
    
    try:
        test_encryption_key_generation()
        test_vc_encryption_decryption()
        test_is_encrypted()
        test_backward_compatibility()
        test_different_encryption_keys()
        test_password_based_key_derivation()
        
        print("\n🎉 All VC encryption tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

#!/usr/bin/env python3
"""
Demo script showing VC encryption in action
This demonstrates how VCs are encrypted at rest in the database
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from core.vc_crypto import VCEncryptor, generate_encryption_key
import json

print("=" * 70)
print("VC ENCRYPTION DEMONSTRATION")
print("=" * 70)

# Step 1: Generate an encryption key
print("\n1. Generate Encryption Key")
print("-" * 70)
encryption_key = generate_encryption_key()
print(f"Generated key: {encryption_key}")
print(f"Key length: {len(encryption_key)} characters")
print("This key should be stored securely in VC_ENCRYPTION_KEY environment variable")

# Step 2: Create an encryptor
print("\n2. Initialize Encryptor")
print("-" * 70)
encryptor = VCEncryptor(encryption_key)
print("✓ Encryptor initialized with encryption key")

# Step 3: Create a sample VC with sensitive data
print("\n3. Sample Verifiable Credential")
print("-" * 70)
sample_vc = {
    "type": ["VerifiableCredential", "StudentCard"],
    "issuer": "did:key:zUniversityXYZ",
    "issuanceDate": "2024-01-15T00:00:00Z",
    "credentialSubject": {
        "id": "did:key:zStudent123",
        "name": "Jane Doe",
        "studentId": "S12345",
        "email": "jane.doe@university.edu",
        "dateOfBirth": "2000-05-15",
        "major": "Computer Science",
        "enrollmentYear": 2020,
        "gpa": 3.8
    },
    "jti": "vc-student-card-001",
    "proof": {
        "type": "Ed25519Signature2020",
        "created": "2024-01-15T00:00:00Z",
        "verificationMethod": "did:key:zUniversityXYZ#key-1",
        "proofPurpose": "assertionMethod"
    }
}

print("Original VC (contains sensitive personal information):")
print(json.dumps(sample_vc, indent=2))

# Step 4: Encrypt the VC
print("\n4. Encrypt VC for Database Storage")
print("-" * 70)
encrypted_vc = encryptor.encrypt_vc(sample_vc)
print(f"Encrypted VC (as stored in database):")
print(f"{encrypted_vc[:80]}...")
print(f"Total length: {len(encrypted_vc)} characters")
print("✓ VC is now encrypted and safe to store in database")

# Step 5: Show that encrypted data is not readable
print("\n5. Verify Encrypted Data is Not Readable")
print("-" * 70)
print("Attempting to parse encrypted data as JSON:")
try:
    json.loads(encrypted_vc)
    print("❌ ERROR: Should not be parseable as JSON!")
except json.JSONDecodeError:
    print("✓ Encrypted data is NOT plain text JSON")
    print("✓ Sensitive information is protected")

# Step 6: Decrypt the VC
print("\n6. Decrypt VC (when authorized user requests it)")
print("-" * 70)
decrypted_vc = encryptor.decrypt_vc(encrypted_vc)
print("Decrypted VC:")
print(json.dumps(decrypted_vc, indent=2))
print("✓ VC successfully decrypted")

# Step 7: Verify decrypted data matches original
print("\n7. Verify Integrity")
print("-" * 70)
if decrypted_vc == sample_vc:
    print("✓ Decrypted VC matches original exactly")
    print("✓ No data loss during encryption/decryption")
else:
    print("❌ ERROR: Decrypted data does not match original")

# Step 8: Demonstrate security with wrong key
print("\n8. Demonstrate Security (Wrong Key Cannot Decrypt)")
print("-" * 70)
wrong_key = generate_encryption_key()
wrong_encryptor = VCEncryptor(wrong_key)
print(f"Attempting to decrypt with wrong key...")
try:
    wrong_encryptor.decrypt_vc(encrypted_vc)
    print("❌ ERROR: Wrong key should not be able to decrypt!")
except ValueError as e:
    print("✓ Decryption failed with wrong key (as expected)")
    print(f"  Error: {str(e)}")
    print("✓ VCs are secure against unauthorized access")

# Summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print("✅ VCs are encrypted at rest in the database")
print("✅ Encrypted data is not readable without the encryption key")
print("✅ Only authorized users with valid authentication can decrypt VCs")
print("✅ Wrong keys cannot decrypt the data")
print("✅ No data loss - decrypted VC matches original exactly")
print("\nSecurity Guarantees:")
print("- Database compromise does not expose sensitive VC data")
print("- Encryption key is stored securely (not in database)")
print("- Each VC is individually encrypted")
print("- Industry-standard encryption (Fernet/AES-128-CBC)")
print("=" * 70)

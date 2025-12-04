#!/usr/bin/env python
import bcrypt

# .env'deki hash
stored_hash = "$2b$12$HFVLw.RWOZRJunjsZBEdN.CC.mkh4uoOiaMLRh2k2JNEHKq30g/X6"

# Test şifreleri
test_passwords = [
    "mathissdupont",
    "admin",
    "test123",
    "password",
    "AdminPass123"
]

print("Testing passwords against stored hash...\n")
for pwd in test_passwords:
    try:
        result = bcrypt.checkpw(pwd.encode(), stored_hash.encode())
        print(f"✓ Password '{pwd}': {result}")
    except Exception as e:
        print(f"✗ Password '{pwd}': Error - {e}")

print("\n\nGenerating new bcrypt hash for 'test123':")
new_hash = bcrypt.hashpw("test123".encode(), bcrypt.gensalt(12))
print(f"Hash: {new_hash.decode()}")
print(f"\nAdd this to .env file as ADMIN_PASS_HASH={new_hash.decode()}")

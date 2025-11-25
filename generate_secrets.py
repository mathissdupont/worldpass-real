#!/usr/bin/env python3
"""
Security Helper Script for WorldPass

This script helps generate secure values for production deployment.
"""

import secrets
import bcrypt
from cryptography.fernet import Fernet

def generate_jwt_secret():
    """Generate a secure JWT secret"""
    return secrets.token_hex(32)

def generate_admin_password_hash(password: str):
    """Generate bcrypt hash for admin password"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def generate_encryption_key():
    """Generate Fernet encryption key"""
    return Fernet.generate_key().decode()

def generate_webhook_secret():
    """Generate webhook secret"""
    return secrets.token_urlsafe(32)

def main():
    print("=" * 60)
    print("🔒 WorldPass Security Key Generator")
    print("=" * 60)
    print()
    
    # JWT Secret
    print("1. JWT_SECRET (for token signing)")
    print("-" * 60)
    jwt_secret = generate_jwt_secret()
    print(f"   {jwt_secret}")
    print()
    
    # Admin Password
    print("2. ADMIN_PASS_HASH (enter your admin password)")
    print("-" * 60)
    admin_password = input("   Enter admin password: ").strip()
    if admin_password:
        admin_hash = generate_admin_password_hash(admin_password)
        print(f"   {admin_hash}")
    else:
        print("   ⚠️  Skipped (no password entered)")
    print()
    
    # VC Encryption Key
    print("3. VC_ENCRYPTION_KEY (for database encryption)")
    print("-" * 60)
    encryption_key = generate_encryption_key()
    print(f"   {encryption_key}")
    print()
    
    # Webhook Secret
    print("4. PAYMENT_WEBHOOK_SECRET (for payment webhooks)")
    print("-" * 60)
    webhook_secret = generate_webhook_secret()
    print(f"   {webhook_secret}")
    print()
    
    # Generate .env file content
    print("=" * 60)
    print("📄 Add these to your .env file:")
    print("=" * 60)
    print()
    print(f"JWT_SECRET={jwt_secret}")
    if admin_password:
        print(f"ADMIN_PASS_HASH={admin_hash}")
    print(f"VC_ENCRYPTION_KEY={encryption_key}")
    print(f"PAYMENT_WEBHOOK_SECRET={webhook_secret}")
    print()
    print("=" * 60)
    print("✅ Done! Copy the values above to your .env file")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")

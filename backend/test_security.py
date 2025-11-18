#!/usr/bin/env python3
"""
Test script for security enhancements
"""
import sys
import os
sys.path.append('.')

from backend.app import app
from backend.settings import settings
import bcrypt
from jose import jwt
from datetime import datetime, timedelta

def test_env_vars():
    """Test environment variable loading"""
    print("Testing environment variables...")
    assert settings.ADMIN_USER == "admin"
    # Note: ADMIN_PASS_HASH and JWT_SECRET are using defaults since .env not loaded
    assert "localhost:5173" in settings.CORS_ORIGINS
    print("✓ Environment variables loaded correctly")

def test_bcrypt_hashing():
    """Test bcrypt password hashing"""
    print("Testing bcrypt hashing...")
    password = "admin123"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    assert bcrypt.checkpw(password.encode(), hashed)
    assert bcrypt.checkpw("wrong".encode(), hashed) == False
    print("✓ Bcrypt hashing works correctly")

def test_jwt_generation():
    """Test JWT token generation and validation"""
    print("Testing JWT...")
    # Generate token
    expire = datetime.utcnow() + timedelta(hours=1)
    to_encode = {"sub": "admin", "exp": expire}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    # Decode and verify
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == "admin"
    print("✓ JWT generation and validation works correctly")

def test_oauth_router_included():
    """Test that OAuth router is included"""
    print("Testing OAuth router inclusion...")
    routes = [route.path for route in app.routes]
    assert any("/api/oauth/" in route for route in routes), "OAuth routes not found"
    print("✓ OAuth router is included")

def test_rate_limiting():
    """Test rate limiting middleware"""
    print("Testing rate limiting...")
    middleware_strings = [str(m) for m in app.user_middleware]
    assert any("SlowAPIMiddleware" in s for s in middleware_strings)
    print("✓ Rate limiting middleware is active")

if __name__ == "__main__":
    print("Running security tests...\n")

    try:
        test_env_vars()
        test_bcrypt_hashing()
        test_jwt_generation()
        test_oauth_router_included()
        test_rate_limiting()

        print("\n🎉 All security tests passed!")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)

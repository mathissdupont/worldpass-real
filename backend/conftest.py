"""
Pytest configuration for backend tests

This file sets up test environment variables and fixtures for all tests.
"""
import pytest
import os
import sys

# Ensure backend modules are importable
sys.path.insert(0, os.path.dirname(__file__))

# Use a file-based database for testing to ensure consistency
TEST_DB_PATH = '/tmp/worldpass_test.db'

# Set test environment variables BEFORE any backend imports
os.environ['VC_ENCRYPTION_KEY'] = 'test-key-for-integration-test-12345'
os.environ['PROFILE_ENCRYPTION_KEY'] = 'lIwAjiHC7Rep5_Vb5vH-nXBHDWiMQnwclFUCga2CNLE='
os.environ['SQLITE_PATH'] = TEST_DB_PATH
os.environ['JWT_SECRET'] = 'test-jwt-secret-key-12345'
os.environ['ADMIN_PASS_HASH'] = '$2b$12$rV305vOf0QA17Bq1o4WrPOzsfWpI7y9cSviK5zl3JHcEXqLRjDq4u'

# Clean up any existing test database before importing anything
if os.path.exists(TEST_DB_PATH):
    os.remove(TEST_DB_PATH)

# Now import settings and patch the SQLITE_PATH
from settings import settings
settings.SQLITE_PATH = TEST_DB_PATH


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initialize the database before all tests run and clean up after"""
    # Create the database with schema
    import asyncio
    from database import init_db
    asyncio.run(init_db())
    
    yield  # Run tests
    
    # Clean up after all tests
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture(scope="module")
def client():
    """Provide a TestClient for the FastAPI app with startup/shutdown events"""
    from fastapi.testclient import TestClient
    from app import app
    with TestClient(app) as test_client:
        yield test_client


# Configure pytest-asyncio to use session scope
def pytest_configure(config):
    """Configure pytest with asyncio settings"""
    config.addinivalue_line(
        "markers", "asyncio: mark test as an async test."
    )

"""
Tests for WorldPass Blockchain Proof Store

Tests the blockchain proof layer abstraction and implementations.
"""

import pytest
import asyncio
import aiosqlite
import tempfile
import os
from datetime import datetime

from backend.blockchain.proof_store import (
    VCOnChainRecord,
    BlockchainProofStore,
    InMemoryBlockchainProofStore,
    SqliteBlockchainProofStore,
)
from backend.blockchain.vc_hash import compute_vc_hash, verify_vc_hash, canonical_json


# Test data
TEST_VC = {
    "jti": "test-vc-123",
    "issuer": "did:key:z6MkTestIssuer",
    "issuanceDate": "2024-01-01T00:00:00Z",
    "credentialSubject": {
        "id": "did:key:z6MkTestSubject",
        "degree": "Bachelor of Science",
        "name": "Alice Test"
    },
    "type": ["VerifiableCredential", "UniversityDegree"],
    "proof": {
        "type": "Ed25519Signature2020",
        "created": "2024-01-01T00:00:00Z",
        "jws": "test-signature"
    }
}


class TestVCHashing:
    """Test VC hashing utilities"""
    
    def test_canonical_json(self):
        """Test canonical JSON serialization"""
        data = {"b": 2, "a": 1, "c": 3}
        result = canonical_json(data)
        assert result == '{"a":1,"b":2,"c":3}'
    
    def test_canonical_json_nested(self):
        """Test canonical JSON with nested objects"""
        data = {
            "outer": {"z": 3, "a": 1},
            "list": [1, 2, 3]
        }
        result = canonical_json(data)
        # Keys should be sorted, no whitespace
        assert '"a":1' in result
        assert '"z":3' in result
    
    def test_compute_vc_hash_deterministic(self):
        """Test that VC hash is deterministic"""
        hash1 = compute_vc_hash(TEST_VC)
        hash2 = compute_vc_hash(TEST_VC)
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex is 64 chars
    
    def test_compute_vc_hash_different_order(self):
        """Test that VC hash is same regardless of key order"""
        vc1 = {"a": 1, "b": 2, "c": 3}
        vc2 = {"c": 3, "b": 2, "a": 1}
        hash1 = compute_vc_hash(vc1)
        hash2 = compute_vc_hash(vc2)
        assert hash1 == hash2
    
    def test_verify_vc_hash_valid(self):
        """Test verifying a valid VC hash"""
        vc_hash = compute_vc_hash(TEST_VC)
        assert verify_vc_hash(TEST_VC, vc_hash) is True
    
    def test_verify_vc_hash_invalid(self):
        """Test verifying an invalid VC hash"""
        vc_hash = "0" * 64  # Invalid hash
        assert verify_vc_hash(TEST_VC, vc_hash) is False
    
    def test_vc_hash_changes_on_modification(self):
        """Test that modifying VC changes the hash"""
        hash1 = compute_vc_hash(TEST_VC)
        
        modified_vc = TEST_VC.copy()
        modified_vc["credentialSubject"] = {**TEST_VC["credentialSubject"], "degree": "MODIFIED"}
        hash2 = compute_vc_hash(modified_vc)
        
        assert hash1 != hash2


class TestInMemoryBlockchainProofStore:
    """Test InMemoryBlockchainProofStore implementation"""
    
    @pytest.fixture
    def store(self):
        """Create a fresh in-memory store"""
        return InMemoryBlockchainProofStore()
    
    @pytest.mark.asyncio
    async def test_register_vc(self, store):
        """Test registering a VC"""
        vc_hash = compute_vc_hash(TEST_VC)
        record = await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        assert record.vc_id == "test-vc-1"
        assert record.vc_hash == vc_hash
        assert record.issuer_did == "did:key:z6MkIssuer"
        assert record.revoked_at is None
        assert isinstance(record.issued_at, datetime)
    
    @pytest.mark.asyncio
    async def test_register_vc_duplicate(self, store):
        """Test that registering duplicate VC raises error"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        with pytest.raises(ValueError, match="already exists"):
            await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
    
    @pytest.mark.asyncio
    async def test_get_vc(self, store):
        """Test getting a VC record"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        record = await store.get_vc("test-vc-1")
        assert record is not None
        assert record.vc_id == "test-vc-1"
        assert record.vc_hash == vc_hash
    
    @pytest.mark.asyncio
    async def test_get_vc_not_found(self, store):
        """Test getting non-existent VC returns None"""
        record = await store.get_vc("nonexistent")
        assert record is None
    
    @pytest.mark.asyncio
    async def test_revoke_vc(self, store):
        """Test revoking a VC"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        record = await store.revoke_vc("test-vc-1")
        assert record.revoked_at is not None
        assert isinstance(record.revoked_at, datetime)
    
    @pytest.mark.asyncio
    async def test_revoke_vc_not_found(self, store):
        """Test revoking non-existent VC raises error"""
        with pytest.raises(ValueError, match="not found"):
            await store.revoke_vc("nonexistent")
    
    @pytest.mark.asyncio
    async def test_revoke_vc_idempotent(self, store):
        """Test that revoking already-revoked VC is idempotent"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        record1 = await store.revoke_vc("test-vc-1")
        record2 = await store.revoke_vc("test-vc-1")
        
        assert record1.revoked_at is not None
        assert record2.revoked_at is not None
    
    @pytest.mark.asyncio
    async def test_is_revoked(self, store):
        """Test checking if VC is revoked"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        assert await store.is_revoked("test-vc-1") is False
        
        await store.revoke_vc("test-vc-1")
        assert await store.is_revoked("test-vc-1") is True
    
    @pytest.mark.asyncio
    async def test_is_revoked_not_found(self, store):
        """Test checking revocation for non-existent VC"""
        assert await store.is_revoked("nonexistent") is False
    
    @pytest.mark.asyncio
    async def test_verify_vc_hash_valid(self, store):
        """Test verifying valid VC hash"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        assert await store.verify_vc_hash("test-vc-1", vc_hash) is True
    
    @pytest.mark.asyncio
    async def test_verify_vc_hash_mismatch(self, store):
        """Test verifying VC with wrong hash"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        wrong_hash = "0" * 64
        assert await store.verify_vc_hash("test-vc-1", wrong_hash) is False
    
    @pytest.mark.asyncio
    async def test_verify_vc_hash_revoked(self, store):
        """Test verifying revoked VC returns False"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        await store.revoke_vc("test-vc-1")
        
        assert await store.verify_vc_hash("test-vc-1", vc_hash) is False
    
    @pytest.mark.asyncio
    async def test_verify_vc_hash_not_found(self, store):
        """Test verifying non-existent VC"""
        vc_hash = compute_vc_hash(TEST_VC)
        assert await store.verify_vc_hash("nonexistent", vc_hash) is False


class TestSqliteBlockchainProofStore:
    """Test SqliteBlockchainProofStore implementation"""
    
    @pytest.fixture
    async def db(self):
        """Create a test database"""
        # Create temporary database
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        
        conn = await aiosqlite.connect(path)
        conn.row_factory = aiosqlite.Row
        
        # Create schema
        await conn.execute("""
            CREATE TABLE worldpass_blockchain_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vc_id TEXT UNIQUE NOT NULL,
                vc_hash TEXT NOT NULL,
                issuer_did TEXT NOT NULL,
                issued_at INTEGER NOT NULL,
                revoked_at INTEGER
            )
        """)
        await conn.commit()
        
        yield conn
        
        # Cleanup
        await conn.close()
        os.unlink(path)
    
    @pytest.fixture
    async def store(self, db):
        """Create a store with test database"""
        return SqliteBlockchainProofStore(db)
    
    @pytest.mark.asyncio
    async def test_register_vc(self, store):
        """Test registering a VC in database"""
        vc_hash = compute_vc_hash(TEST_VC)
        record = await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        assert record.vc_id == "test-vc-1"
        assert record.vc_hash == vc_hash
        assert record.issuer_did == "did:key:z6MkIssuer"
        assert record.revoked_at is None
    
    @pytest.mark.asyncio
    async def test_register_vc_duplicate(self, store):
        """Test that registering duplicate VC raises error"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        with pytest.raises(ValueError, match="already exists"):
            await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
    
    @pytest.mark.asyncio
    async def test_get_vc(self, store):
        """Test getting a VC record from database"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        record = await store.get_vc("test-vc-1")
        assert record is not None
        assert record.vc_id == "test-vc-1"
        assert record.vc_hash == vc_hash
    
    @pytest.mark.asyncio
    async def test_get_vc_not_found(self, store):
        """Test getting non-existent VC returns None"""
        record = await store.get_vc("nonexistent")
        assert record is None
    
    @pytest.mark.asyncio
    async def test_revoke_vc(self, store):
        """Test revoking a VC in database"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        record = await store.revoke_vc("test-vc-1")
        assert record.revoked_at is not None
    
    @pytest.mark.asyncio
    async def test_revoke_vc_not_found(self, store):
        """Test revoking non-existent VC raises error"""
        with pytest.raises(ValueError, match="not found"):
            await store.revoke_vc("nonexistent")
    
    @pytest.mark.asyncio
    async def test_is_revoked(self, store):
        """Test checking if VC is revoked in database"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        assert await store.is_revoked("test-vc-1") is False
        
        await store.revoke_vc("test-vc-1")
        assert await store.is_revoked("test-vc-1") is True
    
    @pytest.mark.asyncio
    async def test_verify_vc_hash(self, store):
        """Test verifying VC hash in database"""
        vc_hash = compute_vc_hash(TEST_VC)
        await store.register_vc("test-vc-1", vc_hash, "did:key:z6MkIssuer")
        
        assert await store.verify_vc_hash("test-vc-1", vc_hash) is True
        
        # Wrong hash
        assert await store.verify_vc_hash("test-vc-1", "0" * 64) is False
        
        # After revocation
        await store.revoke_vc("test-vc-1")
        assert await store.verify_vc_hash("test-vc-1", vc_hash) is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

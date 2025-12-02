"""
BlockchainProofStore abstraction for WorldPass

This module defines the abstraction for the WorldPass–Blockchain proof layer.
It MUST NOT store any personal data, only hashes and minimal metadata.

The blockchain/ledger acts as a "proof layer", not a database.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel
import aiosqlite
import time


class VCOnChainRecord(BaseModel):
    """
    On-chain record for a Verifiable Credential.
    
    Contains only:
    - vc_id: Unique identifier for the VC
    - vc_hash: SHA-256 hash of the VC (canonical JSON)
    - issuer_did: DID of the issuer
    - issued_at: Timestamp when the VC was issued
    - revoked_at: Timestamp when the VC was revoked (None if not revoked)
    
    NO personal data is ever stored in this record.
    """
    vc_id: str
    vc_hash: str
    issuer_did: str
    issued_at: datetime
    revoked_at: Optional[datetime] = None


class BlockchainProofStore(ABC):
    """
    Abstraction for the WorldPass–Blockchain proof layer.
    
    This MUST NOT store any personal data, only hashes and minimal metadata.
    The blockchain/ledger is only a "proof ledger", not a database for credentials.
    
    Verification flow:
    1. Verify issuer signature over VC (off-chain)
    2. Recompute hash H(VC) and check it equals the hash on-chain
    3. Check that VC is not revoked on-chain
    4. Verify holder live signature (off-chain, DID key)
    """

    @abstractmethod
    async def register_vc(self, vc_id: str, vc_hash: str, issuer_did: str) -> VCOnChainRecord:
        """
        Store a new VC hash on-chain (or in the adapter) if not already existing.
        
        Args:
            vc_id: Unique identifier for the VC (e.g., jti field)
            vc_hash: SHA-256 hash of the VC in canonical JSON form
            issuer_did: DID of the issuer
            
        Returns:
            VCOnChainRecord with the stored data
            
        Raises:
            ValueError: If VC with this ID already exists
        """
        ...

    @abstractmethod
    async def get_vc(self, vc_id: str) -> Optional[VCOnChainRecord]:
        """
        Fetch the VC proof by ID.
        
        Args:
            vc_id: Unique identifier for the VC
            
        Returns:
            VCOnChainRecord if found, None otherwise
        """
        ...

    @abstractmethod
    async def revoke_vc(self, vc_id: str) -> VCOnChainRecord:
        """
        Mark a VC as revoked (do NOT delete it).
        
        Args:
            vc_id: Unique identifier for the VC
            
        Returns:
            Updated VCOnChainRecord with revoked_at timestamp
            
        Raises:
            ValueError: If VC with this ID does not exist
        """
        ...

    @abstractmethod
    async def is_revoked(self, vc_id: str) -> bool:
        """
        Check whether a VC is revoked.
        
        Args:
            vc_id: Unique identifier for the VC
            
        Returns:
            True if the VC is revoked, False otherwise
        """
        ...

    @abstractmethod
    async def verify_vc_hash(self, vc_id: str, vc_hash: str) -> bool:
        """
        Return True if the given vc_hash matches the stored hash and VC is not revoked.
        
        Args:
            vc_id: Unique identifier for the VC
            vc_hash: SHA-256 hash of the VC to verify
            
        Returns:
            True if hash matches and VC is not revoked, False otherwise
        """
        ...


class InMemoryBlockchainProofStore(BlockchainProofStore):
    """
    In-memory implementation of BlockchainProofStore for testing and local dev.
    
    This stores VC proofs in memory (not persistent).
    """

    def __init__(self):
        self._store: Dict[str, VCOnChainRecord] = {}

    async def register_vc(self, vc_id: str, vc_hash: str, issuer_did: str) -> VCOnChainRecord:
        """Register a new VC hash in memory."""
        if vc_id in self._store:
            raise ValueError(f"VC with id {vc_id} already exists")
        
        record = VCOnChainRecord(
            vc_id=vc_id,
            vc_hash=vc_hash,
            issuer_did=issuer_did,
            issued_at=datetime.utcnow(),
            revoked_at=None
        )
        self._store[vc_id] = record
        return record

    async def get_vc(self, vc_id: str) -> Optional[VCOnChainRecord]:
        """Fetch VC proof from memory."""
        return self._store.get(vc_id)

    async def revoke_vc(self, vc_id: str) -> VCOnChainRecord:
        """Mark a VC as revoked in memory."""
        if vc_id not in self._store:
            raise ValueError(f"VC with id {vc_id} not found")
        
        record = self._store[vc_id]
        if record.revoked_at is not None:
            # Already revoked, just return it
            return record
        
        # Create a new record with revoked_at set
        revoked_record = VCOnChainRecord(
            vc_id=record.vc_id,
            vc_hash=record.vc_hash,
            issuer_did=record.issuer_did,
            issued_at=record.issued_at,
            revoked_at=datetime.utcnow()
        )
        self._store[vc_id] = revoked_record
        return revoked_record

    async def is_revoked(self, vc_id: str) -> bool:
        """Check if a VC is revoked in memory."""
        record = self._store.get(vc_id)
        if record is None:
            return False
        return record.revoked_at is not None

    async def verify_vc_hash(self, vc_id: str, vc_hash: str) -> bool:
        """Verify VC hash matches and is not revoked."""
        record = self._store.get(vc_id)
        if record is None:
            return False
        
        # Check hash matches
        if record.vc_hash != vc_hash:
            return False
        
        # Check not revoked
        if record.revoked_at is not None:
            return False
        
        return True


class SqliteBlockchainProofStore(BlockchainProofStore):
    """
    SQLite-backed implementation of BlockchainProofStore.
    
    This stores VC proofs in a SQLite database table to simulate an on-chain ledger.
    The table structure matches what would be stored on a real blockchain.
    
    Table: worldpass_blockchain_ledger
    - id: auto-increment primary key
    - vc_id: unique VC identifier
    - vc_hash: SHA-256 hash of the VC
    - issuer_did: DID of the issuer
    - issued_at: Unix timestamp when issued
    - revoked_at: Unix timestamp when revoked (NULL if not revoked)
    """

    def __init__(self, db_connection: aiosqlite.Connection):
        """
        Initialize with an existing database connection.
        
        Args:
            db_connection: Active aiosqlite.Connection to use
        """
        self.db = db_connection

    async def register_vc(self, vc_id: str, vc_hash: str, issuer_did: str) -> VCOnChainRecord:
        """Register a new VC hash in the database."""
        # Check if already exists
        existing = await self.get_vc(vc_id)
        if existing is not None:
            raise ValueError(f"VC with id {vc_id} already exists")
        
        now = int(time.time())
        await self.db.execute(
            """
            INSERT INTO worldpass_blockchain_ledger (vc_id, vc_hash, issuer_did, issued_at, revoked_at)
            VALUES (?, ?, ?, ?, NULL)
            """,
            (vc_id, vc_hash, issuer_did, now)
        )
        await self.db.commit()
        
        return VCOnChainRecord(
            vc_id=vc_id,
            vc_hash=vc_hash,
            issuer_did=issuer_did,
            issued_at=datetime.utcfromtimestamp(now),
            revoked_at=None
        )

    async def get_vc(self, vc_id: str) -> Optional[VCOnChainRecord]:
        """Fetch VC proof from the database."""
        row = await self.db.execute_fetchone(
            """
            SELECT vc_id, vc_hash, issuer_did, issued_at, revoked_at
            FROM worldpass_blockchain_ledger
            WHERE vc_id = ?
            """,
            (vc_id,)
        )
        
        if row is None:
            return None
        
        return VCOnChainRecord(
            vc_id=row["vc_id"],
            vc_hash=row["vc_hash"],
            issuer_did=row["issuer_did"],
            issued_at=datetime.utcfromtimestamp(row["issued_at"]),
            revoked_at=datetime.utcfromtimestamp(row["revoked_at"]) if row["revoked_at"] else None
        )

    async def revoke_vc(self, vc_id: str) -> VCOnChainRecord:
        """Mark a VC as revoked in the database."""
        # Check if exists
        existing = await self.get_vc(vc_id)
        if existing is None:
            raise ValueError(f"VC with id {vc_id} not found")
        
        # If already revoked, just return it
        if existing.revoked_at is not None:
            return existing
        
        now = int(time.time())
        await self.db.execute(
            """
            UPDATE worldpass_blockchain_ledger
            SET revoked_at = ?
            WHERE vc_id = ?
            """,
            (now, vc_id)
        )
        await self.db.commit()
        
        return VCOnChainRecord(
            vc_id=existing.vc_id,
            vc_hash=existing.vc_hash,
            issuer_did=existing.issuer_did,
            issued_at=existing.issued_at,
            revoked_at=datetime.utcfromtimestamp(now)
        )

    async def is_revoked(self, vc_id: str) -> bool:
        """Check if a VC is revoked in the database."""
        record = await self.get_vc(vc_id)
        if record is None:
            return False
        return record.revoked_at is not None

    async def verify_vc_hash(self, vc_id: str, vc_hash: str) -> bool:
        """Verify VC hash matches and is not revoked."""
        row = await self.db.execute_fetchone(
            """
            SELECT vc_hash, revoked_at
            FROM worldpass_blockchain_ledger
            WHERE vc_id = ?
            """,
            (vc_id,)
        )
        
        if row is None:
            return False
        
        # Check hash matches
        if row["vc_hash"] != vc_hash:
            return False
        
        # Check not revoked
        if row["revoked_at"] is not None:
            return False
        
        return True

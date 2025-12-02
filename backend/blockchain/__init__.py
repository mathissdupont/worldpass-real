"""
WorldPass Blockchain Integration Module

This module provides the blockchain proof layer abstraction for WorldPass.
It NEVER stores personal data on-chain, only hashes and minimal metadata.
"""

from .proof_store import (
    VCOnChainRecord,
    BlockchainProofStore,
    InMemoryBlockchainProofStore,
    SqliteBlockchainProofStore,
)
from .vc_hash import compute_vc_hash, verify_vc_hash, canonical_json
from .routes import router

__all__ = [
    "VCOnChainRecord",
    "BlockchainProofStore",
    "InMemoryBlockchainProofStore",
    "SqliteBlockchainProofStore",
    "compute_vc_hash",
    "verify_vc_hash",
    "canonical_json",
    "router",
]

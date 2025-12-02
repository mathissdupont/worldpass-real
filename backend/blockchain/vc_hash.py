"""
VC Hashing Utility for WorldPass Blockchain Integration

Provides deterministic hashing of Verifiable Credentials for blockchain proof storage.
"""

import json
import hashlib
from typing import Dict


def canonical_json(data: Dict) -> str:
    """
    Convert a dictionary to canonical JSON string.
    
    Uses sorted keys and no whitespace for deterministic serialization.
    This ensures that the same VC data always produces the same hash.
    
    Args:
        data: Dictionary to serialize
        
    Returns:
        Canonical JSON string
    """
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_vc_hash(vc: Dict) -> str:
    """
    Compute SHA-256 hash of a Verifiable Credential.
    
    Uses canonical JSON serialization to ensure deterministic hashing.
    The hash includes all fields of the VC for integrity verification.
    
    Args:
        vc: Verifiable Credential as a dictionary
        
    Returns:
        Hex-encoded SHA-256 hash of the VC
    """
    # Convert to canonical JSON
    canonical = canonical_json(vc)
    
    # Compute SHA-256 hash
    hash_bytes = hashlib.sha256(canonical.encode("utf-8")).digest()
    
    # Return as hex string
    return hash_bytes.hex()


def verify_vc_hash(vc: Dict, expected_hash: str) -> bool:
    """
    Verify that a VC matches the expected hash.
    
    Args:
        vc: Verifiable Credential as a dictionary
        expected_hash: Expected hex-encoded SHA-256 hash
        
    Returns:
        True if the computed hash matches the expected hash, False otherwise
    """
    computed_hash = compute_vc_hash(vc)
    return computed_hash == expected_hash

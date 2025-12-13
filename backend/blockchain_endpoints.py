"""
Blockchain and Distributed Storage API Endpoints
=================================================

Endpoints for users/issuers to:
- Choose blockchain for credential anchoring
- View supported chains and their characteristics
- Store credentials with distributed storage
- Verify credential integrity on-chain
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional, Dict, Any
from pydantic import BaseModel
from chain_config import list_available_chains, get_chain_config, get_recommended_chain
from distributed_ledger import create_distributed_manager
import os

router = APIRouter()


# Models
class ChainSelectionRequest(BaseModel):
    """Request to select blockchain for credential storage"""
    chain_key: str
    region: Optional[str] = None


class DistributedStoreRequest(BaseModel):
    """Request to store credential on distributed storage"""
    vc_id: str
    encrypted_payload: str  # Base64 encoded
    issuer_did: str
    subject_did: str
    chain_key: Optional[str] = None  # If None, uses recommended


class VerifyIntegrityRequest(BaseModel):
    """Request to verify credential integrity"""
    vc_id: str
    ipfs_cid: str
    expected_hash: str
    tx_hash: Optional[str] = None
    chain_key: Optional[str] = None


# Endpoints
@router.get("/api/blockchains/list")
async def list_blockchains(
    include_testnets: bool = False,
    x_token: Optional[str] = Header(None)
):
    """
    List all supported blockchains with their characteristics
    
    Query params:
    - include_testnets: Include testnet chains (default: false)
    
    Returns:
    - List of chains with metadata (name, gas level, finality time, etc.)
    """
    chains = list_available_chains(include_testnets=include_testnets)
    
    return {
        "success": True,
        "chains": chains,
        "count": len(chains),
        "recommended": get_recommended_chain(use_testnet=include_testnets)
    }


@router.get("/api/blockchains/recommended")
async def get_recommended_blockchain(
    region: Optional[str] = None,
    testnet: bool = False
):
    """
    Get recommended blockchain based on region and environment
    
    Query params:
    - region: User's region ('us', 'eu', 'asia', 'global')
    - testnet: Whether to use testnet (default: false)
    
    Returns:
    - Recommended chain configuration
    """
    chain_key = get_recommended_chain(region=region, use_testnet=testnet)
    chain_config = get_chain_config(chain_key)
    
    return {
        "success": True,
        "recommended": chain_key,
        "config": chain_config,
        "reason": f"Low gas fees ({chain_config['gas_price']}), fast finality ({chain_config['finality']}s)"
    }


@router.get("/api/blockchains/{chain_key}")
async def get_blockchain_info(chain_key: str):
    """
    Get detailed information about a specific blockchain
    
    Path params:
    - chain_key: Chain identifier (e.g., 'polygon', 'base', 'bsc')
    
    Returns:
    - Chain configuration and metadata
    """
    try:
        config = get_chain_config(chain_key)
        return {
            "success": True,
            "chain": config
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Chain '{chain_key}' not supported")


@router.post("/api/distributed/store")
async def store_credential_distributed(
    request: DistributedStoreRequest,
    x_token: Optional[str] = Header(None)
):
    """
    Store encrypted credential on distributed storage (IPFS + Blockchain)
    
    Body:
    - vc_id: Credential ID
    - encrypted_payload: Base64 encoded encrypted credential
    - issuer_did: Issuer's DID
    - subject_did: Subject's DID
    - chain_key: Optional blockchain (None = recommended)
    
    Returns:
    - IPFS CID, blockchain TX hash, chain info, explorer URL
    
    NOTE: Payload must be encrypted CLIENT-SIDE before sending!
    """
    # TODO: Verify token and permissions
    
    try:
        # Decode base64 payload
        import base64
        encrypted_bytes = base64.b64decode(request.encrypted_payload)
        
        # Create manager for selected chain
        manager = create_distributed_manager(request.chain_key)
        
        # Store distributed
        result = await manager.store_credential(
            vc_id=request.vc_id,
            encrypted_payload=encrypted_bytes,
            issuer_did=request.issuer_did,
            subject_did=request.subject_did
        )
        
        return {
            "success": True,
            "message": "Credential stored on distributed storage",
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage failed: {str(e)}")


@router.get("/api/distributed/retrieve/{ipfs_cid}")
async def retrieve_credential_distributed(
    ipfs_cid: str,
    x_token: Optional[str] = Header(None)
):
    """
    Retrieve encrypted credential from IPFS
    
    Path params:
    - ipfs_cid: IPFS Content Identifier
    
    Returns:
    - Base64 encoded encrypted credential
    
    NOTE: Client must decrypt with their private key!
    """
    # TODO: Verify token and permissions
    
    try:
        manager = create_distributed_manager()
        
        encrypted_data = await manager.retrieve_credential(ipfs_cid)
        
        if not encrypted_data:
            raise HTTPException(status_code=404, detail="Credential not found on IPFS")
        
        # Encode as base64
        import base64
        encoded = base64.b64encode(encrypted_data).decode()
        
        return {
            "success": True,
            "ipfs_cid": ipfs_cid,
            "encrypted_payload": encoded,
            "message": "Decrypt client-side with your private key"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")


@router.post("/api/distributed/verify")
async def verify_credential_integrity(
    request: VerifyIntegrityRequest,
    x_token: Optional[str] = Header(None)
):
    """
    Verify credential integrity against blockchain record
    
    Body:
    - vc_id: Credential ID
    - ipfs_cid: IPFS CID
    - expected_hash: Expected content hash
    - tx_hash: Optional blockchain transaction hash
    - chain_key: Optional blockchain (None = default)
    
    Returns:
    - Verification result with chain info
    """
    try:
        manager = create_distributed_manager(request.chain_key)
        
        result = await manager.verify_credential_integrity(
            vc_id=request.vc_id,
            ipfs_cid=request.ipfs_cid,
            expected_hash=request.expected_hash,
            tx_hash=request.tx_hash
        )
        
        return {
            "success": result["verified"],
            "message": "Credential verified" if result["verified"] else "Verification failed",
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/api/distributed/stats")
async def get_distributed_storage_stats(
    x_token: Optional[str] = Header(None)
):
    """
    Get statistics about distributed storage usage
    
    Returns:
    - Count of credentials on IPFS
    - Count per blockchain
    - Storage distribution
    """
    # TODO: Query database for stats
    
    return {
        "success": True,
        "message": "Stats endpoint - TODO: implement database queries",
        "placeholder_data": {
            "total_credentials": 0,
            "ipfs_stored": 0,
            "chains": {
                "polygon": 0,
                "base": 0,
                "arbitrum": 0
            }
        }
    }

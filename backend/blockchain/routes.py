"""
Blockchain Proof Layer API Endpoints

Provides API endpoints for interacting with the WorldPass blockchain proof layer.
These endpoints allow registration and revocation of VC proofs on-chain.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from blockchain.proof_store import SqliteBlockchainProofStore, VCOnChainRecord
from blockchain.vc_hash import compute_vc_hash, verify_vc_hash

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/blockchain", tags=["blockchain"])


class RegisterVCRequest(BaseModel):
    """Request to register a VC hash on-chain."""
    vc_id: str
    vc_hash: str
    issuer_did: str


class RegisterVCResponse(BaseModel):
    """Response after registering a VC hash."""
    ok: bool
    vc_id: str
    vc_hash: str
    issuer_did: str
    issued_at: datetime


class RevokeVCRequest(BaseModel):
    """Request to revoke a VC on-chain."""
    vc_id: str


class RevokeVCResponse(BaseModel):
    """Response after revoking a VC."""
    ok: bool
    vc_id: str
    revoked_at: datetime


class VerifyVCRequest(BaseModel):
    """Request to verify a VC hash against on-chain record."""
    vc_id: str
    vc_hash: str


class VerifyVCResponse(BaseModel):
    """Response after verifying a VC hash."""
    valid: bool
    revoked: bool
    hash_match: bool
    on_chain_record: Optional[dict] = None


class GetVCProofResponse(BaseModel):
    """Response with on-chain VC proof record."""
    ok: bool
    record: Optional[dict] = None


@router.post("/register-vc", response_model=RegisterVCResponse)
async def register_vc(req: RegisterVCRequest, db=Depends(get_db)):
    """
    Register a VC hash on the blockchain proof ledger.
    
    This endpoint stores the hash of a VC on-chain for later verification.
    NO personal data is stored, only the hash and minimal metadata.
    
    Args:
        req: RegisterVCRequest with vc_id, vc_hash, and issuer_did
        db: Database connection
        
    Returns:
        RegisterVCResponse with the registered record
        
    Raises:
        HTTPException: If VC already exists (409) or other error (500)
    """
    try:
        store = SqliteBlockchainProofStore(db)
        record = await store.register_vc(req.vc_id, req.vc_hash, req.issuer_did)
        
        logger.info(f"Registered VC {req.vc_id} on blockchain ledger")
        
        return RegisterVCResponse(
            ok=True,
            vc_id=record.vc_id,
            vc_hash=record.vc_hash,
            issuer_did=record.issuer_did,
            issued_at=record.issued_at
        )
    except ValueError as e:
        logger.warning(f"VC registration conflict: {e}")
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to register VC: {e}")
        raise HTTPException(status_code=500, detail="blockchain_registration_failed")


@router.post("/revoke-vc", response_model=RevokeVCResponse)
async def revoke_vc(req: RevokeVCRequest, db=Depends(get_db)):
    """
    Revoke a VC on the blockchain proof ledger.
    
    This marks the VC as revoked on-chain. The VC hash is NOT deleted,
    only marked as revoked for audit trail purposes.
    
    Args:
        req: RevokeVCRequest with vc_id
        db: Database connection
        
    Returns:
        RevokeVCResponse with the revocation timestamp
        
    Raises:
        HTTPException: If VC not found (404) or other error (500)
    """
    try:
        store = SqliteBlockchainProofStore(db)
        record = await store.revoke_vc(req.vc_id)
        
        logger.info(f"Revoked VC {req.vc_id} on blockchain ledger")
        
        # revoked_at should always be set after successful revocation
        if record.revoked_at is None:
            raise HTTPException(status_code=500, detail="revocation_timestamp_missing")
        
        return RevokeVCResponse(
            ok=True,
            vc_id=record.vc_id,
            revoked_at=record.revoked_at
        )
    except ValueError as e:
        logger.warning(f"VC revocation failed: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to revoke VC: {e}")
        raise HTTPException(status_code=500, detail="blockchain_revocation_failed")


@router.post("/verify-vc", response_model=VerifyVCResponse)
async def verify_vc_endpoint(req: VerifyVCRequest, db=Depends(get_db)):
    """
    Verify a VC hash against the on-chain record.
    
    This checks:
    1. That the VC exists on-chain
    2. That the provided hash matches the on-chain hash
    3. That the VC is not revoked
    
    Args:
        req: VerifyVCRequest with vc_id and vc_hash
        db: Database connection
        
    Returns:
        VerifyVCResponse with verification result
    """
    try:
        store = SqliteBlockchainProofStore(db)
        
        # Check if VC exists on-chain
        record = await store.get_vc(req.vc_id)
        if record is None:
            return VerifyVCResponse(
                valid=False,
                revoked=False,
                hash_match=False,
                on_chain_record=None
            )
        
        # Check if hash matches
        hash_match = record.vc_hash == req.vc_hash
        
        # Check if revoked
        is_revoked = record.revoked_at is not None
        
        # Valid only if hash matches and not revoked
        is_valid = hash_match and not is_revoked
        
        return VerifyVCResponse(
            valid=is_valid,
            revoked=is_revoked,
            hash_match=hash_match,
            on_chain_record={
                "vc_id": record.vc_id,
                "vc_hash": record.vc_hash,
                "issuer_did": record.issuer_did,
                "issued_at": record.issued_at.isoformat(),
                "revoked_at": record.revoked_at.isoformat() if record.revoked_at else None
            }
        )
    except Exception as e:
        logger.error(f"Failed to verify VC: {e}")
        raise HTTPException(status_code=500, detail="blockchain_verification_failed")


@router.get("/vc/{vc_id}", response_model=GetVCProofResponse)
async def get_vc_proof(vc_id: str, db=Depends(get_db)):
    """
    Get the on-chain proof record for a VC.
    
    Returns the hash and metadata stored on-chain for the given VC ID.
    
    Args:
        vc_id: VC identifier
        db: Database connection
        
    Returns:
        GetVCProofResponse with the on-chain record if found
    """
    try:
        store = SqliteBlockchainProofStore(db)
        record = await store.get_vc(vc_id)
        
        if record is None:
            return GetVCProofResponse(ok=False, record=None)
        
        return GetVCProofResponse(
            ok=True,
            record={
                "vc_id": record.vc_id,
                "vc_hash": record.vc_hash,
                "issuer_did": record.issuer_did,
                "issued_at": record.issued_at.isoformat(),
                "revoked_at": record.revoked_at.isoformat() if record.revoked_at else None
            }
        )
    except Exception as e:
        logger.error(f"Failed to get VC proof: {e}")
        raise HTTPException(status_code=500, detail="blockchain_query_failed")

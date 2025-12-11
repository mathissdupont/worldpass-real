# Backend schemas for DID-based authentication
from pydantic import BaseModel
from typing import Optional

class DIDChallengeReq(BaseModel):
    did: str
    audience: str = "worldpass-web"

class DIDChallengeResp(BaseModel):
    challenge: str
    nonce: str
    expires_at: int

class DIDAuthVerifyReq(BaseModel):
    did: str
    challenge: str  # nonce
    signature: str  # base64url encoded signature
    displayName: Optional[str] = None

class DIDAuthVerifyResp(BaseModel):
    token: str
    user: dict
    message: str = "authenticated"

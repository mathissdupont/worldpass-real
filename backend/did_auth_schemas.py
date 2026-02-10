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
    challenge: str  # raw nonce or formatted challenge message
    signature: str  # base64url encoded signature
    audience: Optional[str] = "worldpass-web"
    displayName: Optional[str] = None

class DIDAuthVerifyResp(BaseModel):
    token: str
    user: dict
    message: str = "authenticated"

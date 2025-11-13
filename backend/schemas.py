from pydantic import BaseModel, Field
from typing import Optional, Any, Dict

class HealthResp(BaseModel):
    ok: bool = True

class ChallengeReq(BaseModel):
    audience: str
    exp_secs: int = Field(default=120, ge=30, le=600)

class ChallengeResp(BaseModel):
    challenge: str
    nonce: str
    expires_at: int

class VerifyReq(BaseModel):
    vc: Dict[str, Any]
    challenge: str
    presenter_did: Optional[str] = None

class VerifyResp(BaseModel):
    valid: bool
    reason: str
    issuer: Optional[str] = None
    subject: Optional[str] = None
    revoked: Optional[bool] = None

class RevokeReq(BaseModel):
    vc_id: str
    reason: Optional[str] = None

class RevokeResp(BaseModel):
    status: str
class IssuerRegisterReq(BaseModel):
    name: str
    email: str
    domain: Optional[str] = None
    did: Optional[str] = None

class IssuerRegisterResp(BaseModel):
    status: str
    issuer_id: int

class AdminLoginReq(BaseModel):
    username: str
    password: str

class AdminLoginResp(BaseModel):
    token: str

class ApproveIssuerReq(BaseModel):
    issuer_id: int

class ApproveIssuerResp(BaseModel):
    api_key: str  # sadece 1 kez gösterilir

class IssuerListItem(BaseModel):
    id: int
    name: str
    email: str
    domain: Optional[str]
    did: Optional[str]
    status: str
    created_at: int
    updated_at: int

class IssuerIssueReq(BaseModel):
    api_key: str
    vc: Dict[str, Any]  # imzalanmış VC (issuer kendi anahtarıyla imzalar) veya imzasız (ileride HSM modülü ile imzalatılabilir)

class IssuerIssueResp(BaseModel):
    ok: bool
    vc_id: Optional[str] = None

class IssuerRevokeReq(BaseModel):
    api_key: str
    vc_id: str

class IssuerRevokeResp(BaseModel):
    status: str

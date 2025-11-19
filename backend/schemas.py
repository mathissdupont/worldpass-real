from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List

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

# OAuth benzeri sistem için yeni modeller
class OAuthClientRegisterReq(BaseModel):
    name: str
    domain: str
    redirect_uris: List[str]

class OAuthClientRegisterResp(BaseModel):
    client_id: str
    client_secret: str  # sadece 1 kez gösterilir
    name: str
    domain: str

class OAuthAuthorizeReq(BaseModel):
    response_type: str = Field(..., pattern="^code$")  # sadece 'code' destekliyoruz
    client_id: str
    redirect_uri: str
    scope: str = "openid profile"
    state: Optional[str] = None

class OAuthAuthorizeResp(BaseModel):
    code: str
    state: Optional[str] = None

class OAuthTokenReq(BaseModel):
    grant_type: str = Field(..., pattern="^authorization_code$")
    code: str
    redirect_uri: str
    client_id: str
    client_secret: str

class OAuthTokenResp(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    scope: str

class OAuthUserInfo(BaseModel):
    sub: str  # DID
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None

# User registration and authentication
class UserRegisterReq(BaseModel):
    email: str
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    password: str
    did: Optional[str] = None

    class Config:
        populate_by_name = True

class UserRegisterResp(BaseModel):
    token: str
    user: Dict[str, Any]

class UserLoginReq(BaseModel):
    email: str
    password: str

class UserLoginResp(BaseModel):
    token: str
    user: Dict[str, Any]

# User VCs management
class UserVCAddReq(BaseModel):
    vc: Dict[str, Any]  # Full VC JSON

class UserVCAddResp(BaseModel):
    ok: bool
    vc_id: str

class UserVCItem(BaseModel):
    id: int
    vc_id: str
    vc_payload: Dict[str, Any]
    created_at: int
    updated_at: int

class UserVCListResp(BaseModel):
    vcs: List[UserVCItem]

class UserVCDeleteReq(BaseModel):
    vc_id: str

class UserVCDeleteResp(BaseModel):
    ok: bool

# User profile management
class UserProfileUpdateReq(BaseModel):
    display_name: Optional[str] = None
    theme: Optional[str] = None
    avatar: Optional[str] = None
    phone: Optional[str] = None
    lang: Optional[str] = None
    otp_enabled: Optional[bool] = None

class UserProfileResp(BaseModel):
    user: Dict[str, Any]

# VC Templates management
class VCTemplateCreateReq(BaseModel):
    name: str
    description: Optional[str] = None
    vc_type: str
    fields: Dict[str, Any]

class VCTemplateCreateResp(BaseModel):
    ok: bool
    template_id: int

class VCTemplateItem(BaseModel):
    id: int
    name: str
    description: Optional[str]
    vc_type: str
    fields: Dict[str, Any]
    created_at: int
    updated_at: int

class VCTemplateListResp(BaseModel):
    templates: List[VCTemplateItem]

class VCTemplateUpdateReq(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    vc_type: Optional[str] = None
    fields: Optional[Dict[str, Any]] = None

class VCTemplateUpdateResp(BaseModel):
    ok: bool

class VCTemplateDeleteResp(BaseModel):
    ok: bool

# Recipient ID lookup
class RecipientLookupResp(BaseModel):
    found: bool
    vc_id: Optional[str] = None
    subject_did: Optional[str] = None
    vc_payload: Optional[Dict[str, Any]] = None

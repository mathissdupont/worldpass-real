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
    challenge: Optional[str] = None
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

class UserProfileDataReq(BaseModel):
    profile_data: Dict[str, Any]

class UserProfileDataResp(BaseModel):
    ok: bool
    profile_data: Optional[Dict[str, Any]] = None

class IssuerRegisterReq(BaseModel):
    name: str
    email: str
    password: str
    domain: Optional[str] = None
    did: Optional[str] = None

class IssuerLoginReq(BaseModel):
    email: str
    password: str

class IssuerLoginResp(BaseModel):
    token: str
    issuer: Dict[str, Any]

class IssuerProfileResp(BaseModel):
    issuer: Dict[str, Any]

class IssuerApiKeyResp(BaseModel):
    api_key: str

class IssuerRegisterResp(BaseModel):
    status: str
    issuer_id: int
    verification_code: str

class IssuerVerifyDomainReq(BaseModel):
    issuer_id: int
    method: str = "dns"  # 'dns' or 'http'

class IssuerVerifyDomainResp(BaseModel):
    verified: bool
    message: str

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
    api_key: Optional[str] = None
    vc: Dict[str, Any]  # imzalanmış VC (issuer kendi anahtarıyla imzalar) veya imzasız (ileride HSM modülü ile imzalatılabilir)
    template_id: Optional[int] = None  # optional reference to issuer_templates for validation

class IssuerIssueResp(BaseModel):
    ok: bool
    vc_id: Optional[str] = None
    recipient_id: Optional[str] = None

class IssuerRevokeReq(BaseModel):
    api_key: Optional[str] = None
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
    otp_code: Optional[str] = None

class UserLoginResp(BaseModel):
    token: str
    user: Dict[str, Any]

# 2FA Management
class TwoFASetupResp(BaseModel):
    secret: str
    otpauth_url: str

class TwoFAEnableReq(BaseModel):
    code: str
    secret: str

class TwoFAEnableResp(BaseModel):
    ok: bool

class TwoFADisableResp(BaseModel):
    ok: bool

class BackupCodesResp(BaseModel):
    codes: List[str]

class VerifyEmailReq(BaseModel):
    token: str

class VerifyEmailResp(BaseModel):
    ok: bool
    message: str

class ForgotPasswordReq(BaseModel):
    email: str

class ForgotPasswordResp(BaseModel):
    ok: bool
    message: str

class ResetPasswordReq(BaseModel):
    token: str
    new_password: str

class ResetPasswordResp(BaseModel):
    ok: bool
    message: str

# User VCs management
class UserVCAddReq(BaseModel):
    vc: Dict[str, Any]  # Full VC JSON

class UserVCAddResp(BaseModel):
    ok: bool
    vc_id: str

class UserVCItem(BaseModel):
    id: int
    vc_id: str
    subject_did: str
    vc_payload: Dict[str, Any]
    vc_hash: Optional[str] = None
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
    email: Optional[str] = None
    display_name: Optional[str] = None
    theme: Optional[str] = None
    avatar: Optional[str] = None
    phone: Optional[str] = None
    lang: Optional[str] = None
    otp_enabled: Optional[bool] = None

class UserProfileResp(BaseModel):
    user: Dict[str, Any]

class UserDeleteResp(BaseModel):
    ok: bool

class UserDidLinkReq(BaseModel):
    did: str

class UserDidLinkResp(BaseModel):
    ok: bool
    did: str

class UserDidRotateReq(BaseModel):
    new_did: str

class UserDidRotateResp(BaseModel):
    ok: bool
    old_did: str
    new_did: str
    revoked_vc_count: int

# Extended Issuer Models for Console
class IssuerUpdateReq(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    contact_email: Optional[str] = None
    support_link: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None

class IssuerStatsResp(BaseModel):
    total_issued: int
    active_count: int
    revoked_count: int
    expired_count: int

class IssuerCredentialListReq(BaseModel):
    page: int = 1
    per_page: int = 20
    status: Optional[str] = None  # 'valid' | 'revoked'
    template_type: Optional[str] = None
    search: Optional[str] = None
    date_from: Optional[int] = None
    date_to: Optional[int] = None

class IssuerCredentialItem(BaseModel):
    id: int
    vc_id: str
    subject_did: str
    recipient_id: Optional[str] = None
    credential_type: str
    status: str
    created_at: int
    updated_at: Optional[int] = None

class IssuerCredentialListResp(BaseModel):
    credentials: List[IssuerCredentialItem]
    total: int
    page: int
    per_page: int

class IssuerCredentialDetailResp(BaseModel):
    credential: Dict[str, Any]
    status: str
    audit_log: List[Dict[str, Any]]

class IssuerTemplateReq(BaseModel):
    name: str
    description: Optional[str] = None
    vc_type: str
    schema_data: Dict[str, Any]
    is_active: bool = True

class IssuerTemplateItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    vc_type: str
    schema_data: Dict[str, Any]
    is_active: bool
    created_at: int
    updated_at: int

class IssuerTemplateListResp(BaseModel):
    templates: List[IssuerTemplateItem]

class IssuerApiKeyItem(BaseModel):
    id: int
    name: str
    key_prefix: str
    created_at: int
    last_used: Optional[int] = None

class IssuerApiKeyListResp(BaseModel):
    api_keys: List[IssuerApiKeyItem]

class IssuerWebhookReq(BaseModel):
    url: str
    event_type: str  # 'credential.issued' | 'credential.revoked' | 'credential.updated'
    is_active: bool = True
    secret: Optional[str] = None

class IssuerWebhookItem(BaseModel):
    id: int
    url: str
    event_type: str
    is_active: bool
    created_at: int
    last_delivery: Optional[int] = None
    failure_count: int

class IssuerWebhookListResp(BaseModel):
    webhooks: List[IssuerWebhookItem]

class UserDeleteResp_Legacy(BaseModel):
    ok: bool

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
    payload_hash: Optional[str] = None
    template_id: Optional[int] = None

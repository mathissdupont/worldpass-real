from pydantic import BaseModel, Field
from typing import Optional

class TransactionBase(BaseModel):
    amount_minor: int = Field(..., gt=0, description="Amount in minor units (cents/kuruş)")
    currency: str = Field(default="TRY", max_length=3, description="Currency code (ISO 4217)")
    description: Optional[str] = Field(None, description="Payment description")

class TransactionCreateIntent(TransactionBase):
    return_url: str = Field(..., description="Frontend URL to return after payment")

class TransactionRead(TransactionBase):
    id: int
    user_id: str
    status: str
    provider: str
    provider_tx_id: Optional[str] = None
    created_at: int
    updated_at: int

class PaymentIntentResponse(BaseModel):
    transaction_id: int
    redirect_url: str

class WebhookPayload(BaseModel):
    provider_tx_id: str
    internal_tx_id: int
    status: str  # "success" or "failed"

class WebhookResponse(BaseModel):
    ok: bool

class TransactionListResponse(BaseModel):
    transactions: list[TransactionRead]

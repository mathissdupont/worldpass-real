"""
Payment API Endpoints

Handles payment intent creation, webhooks, and transaction listing.
No card data is stored - all payment processing is delegated to the provider.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from typing import Optional
import time
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from payment_schemas import (
    TransactionCreateIntent,
    TransactionRead,
    PaymentIntentResponse,
    WebhookPayload,
    WebhookResponse,
    TransactionListResponse
)
from payment_provider_mock import mock_provider

router = APIRouter(prefix="/payment", tags=["payment"])
limiter = Limiter(key_func=get_remote_address)


async def _get_current_user_for_payment(x_token: Optional[str] = Header(None), db=Depends(get_db)):
    """Get current authenticated user - reuse existing auth logic"""
    if not x_token:
        raise HTTPException(status_code=401, detail="missing_token")
    
    # Import here to avoid circular dependency
    from jose import JWTError, jwt
    from settings import settings
    
    try:
        payload = jwt.decode(x_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="invalid_token")
        
        user = await db.execute_fetchone(
            "SELECT id, email, did FROM users WHERE id=?",
            (user_id,)
        )
        if not user:
            raise HTTPException(status_code=401, detail="user_not_found")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid_token")


@router.post("/intent", response_model=PaymentIntentResponse)
@limiter.limit("10/minute")  # Rate limiting: max 10 payment intents per minute
async def create_payment_intent(
    request: Request,
    body: TransactionCreateIntent,
    user=Depends(_get_current_user_for_payment),
    db=Depends(get_db)
):
    """
    Create a payment intent
    
    1. Creates a transaction record in DB with status 'pending'
    2. Generates a checkout URL from the mock provider
    3. Returns transaction_id and redirect_url to frontend
    """
    now = int(time.time())
    
    # Use DID if available, otherwise use user ID
    user_identifier = user.get("did") or str(user["id"])
    
    # Create transaction record
    cursor = await db.execute(
        """
        INSERT INTO transactions 
        (user_id, amount_minor, currency, description, status, provider, return_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_identifier,
            body.amount_minor,
            body.currency,
            body.description,
            "pending",
            "mock",
            body.return_url,
            now,
            now
        )
    )
    await db.commit()
    
    transaction_id = cursor.lastrowid
    
    # Generate checkout URL from mock provider
    redirect_url = mock_provider.create_checkout_url(
        transaction_id=transaction_id,
        amount_minor=body.amount_minor,
        currency=body.currency,
        return_url=body.return_url
    )
    
    return PaymentIntentResponse(
        transaction_id=transaction_id,
        redirect_url=redirect_url
    )


@router.post("/webhook/mock", response_model=WebhookResponse)
@limiter.limit("100/minute")  # Rate limiting: webhooks from provider
async def handle_mock_webhook(
    request: Request,
    body: WebhookPayload,
    x_webhook_secret: Optional[str] = Header(None),
    db=Depends(get_db)
):
    """
    Handle webhook from mock payment provider
    
    In production, this would verify the webhook signature and update transaction status.
    """
    # Verify webhook signature
    if not x_webhook_secret or not mock_provider.verify_webhook_signature(x_webhook_secret):
        raise HTTPException(status_code=401, detail="invalid_webhook_signature")
    
    # Validate status
    if body.status not in ["success", "failed"]:
        raise HTTPException(status_code=400, detail="invalid_status")
    
    # Look up transaction
    transaction = await db.execute_fetchone(
        "SELECT id, status FROM transactions WHERE id=?",
        (body.internal_tx_id,)
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="transaction_not_found")
    
    # Don't update if already finalized
    if transaction["status"] in ["success", "failed"]:
        return WebhookResponse(ok=True)
    
    # Update transaction
    now = int(time.time())
    await db.execute(
        """
        UPDATE transactions 
        SET status=?, provider_tx_id=?, updated_at=?
        WHERE id=?
        """,
        (body.status, body.provider_tx_id, now, body.internal_tx_id)
    )
    await db.commit()
    
    return WebhookResponse(ok=True)


@router.get("/transactions", response_model=TransactionListResponse)
@limiter.limit("30/minute")  # Rate limiting: transaction list queries
async def list_user_transactions(
    request: Request,
    status: Optional[str] = None,
    user=Depends(_get_current_user_for_payment),
    db=Depends(get_db)
):
    """
    List all transactions for the current user
    
    Optional query param:
    - status: filter by status (pending/success/failed)
    """
    user_identifier = user.get("did") or str(user["id"])
    
    # Build query
    if status:
        query = """
            SELECT id, user_id, amount_minor, currency, description, status, 
                   provider, provider_tx_id, created_at, updated_at
            FROM transactions
            WHERE user_id=? AND status=?
            ORDER BY created_at DESC
        """
        params = (user_identifier, status)
    else:
        query = """
            SELECT id, user_id, amount_minor, currency, description, status,
                   provider, provider_tx_id, created_at, updated_at
            FROM transactions
            WHERE user_id=?
            ORDER BY created_at DESC
        """
        params = (user_identifier,)
    
    rows = await db.execute_fetchall(query, params)
    
    transactions = [
        TransactionRead(
            id=row["id"],
            user_id=row["user_id"],
            amount_minor=row["amount_minor"],
            currency=row["currency"],
            description=row["description"],
            status=row["status"],
            provider=row["provider"],
            provider_tx_id=row["provider_tx_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )
        for row in rows
    ]
    
    return TransactionListResponse(transactions=transactions)

# WorldPass Pay MVP

**Minimal Payment Integration for WorldPass**

## Overview

WorldPass Pay is a minimal, license-free payment integration system built into the WorldPass decentralized identity platform. It demonstrates a clean architecture pattern for payment processing that can easily be swapped with real payment service providers (PSPs) in production.

## Key Features

- ✅ **No Card Storage**: No PCI-DSS compliance required - cards processed by provider
- ✅ **Mock Provider**: Built-in test provider for development and demos
- ✅ **Clean Architecture**: Provider abstraction layer for easy PSP swaps
- ✅ **Transaction Tracking**: Full transaction history with status management
- ✅ **Webhook Support**: Callback pattern for async status updates
- ✅ **Redirect Flow**: Standard checkout redirect pattern

## Architecture

### Components

1. **Backend API** (`payment_endpoints.py`)
   - POST `/api/payment/intent` - Create payment intent
   - POST `/api/payment/webhook/mock` - Handle provider webhooks
   - GET `/api/payment/transactions` - List user transactions

2. **Mock Provider** (`payment_provider_mock.py`)
   - Provider abstraction layer
   - Checkout URL generation
   - Webhook signature verification

3. **Mock Provider Routes** (`mock_provider_routes.py`)
   - GET `/mock-provider/checkout` - HTML checkout page
   - Simulates payment processing

4. **Frontend Pages**
   - `/pay/demo` - Payment creation form
   - `/pay/return` - Payment result page
   - `/account/payments` - Transaction history

### Database Schema

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_tx_id TEXT,
    return_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

## Payment Flow

### 1. Create Payment Intent

**User Action**: Fill payment form on `/pay/demo`

**Frontend**:
```javascript
const result = await createPaymentIntent(
  token,
  amountMinor,  // Amount in cents (e.g., 1000 = $10.00)
  'USD',
  'Payment description',
  returnUrl
);
```

**Backend**:
- Creates transaction record with status `pending`
- Generates checkout URL via provider
- Returns `transaction_id` and `redirect_url`

### 2. Redirect to Checkout

**User Action**: Automatically redirected to checkout page

**Flow**:
```
Frontend → redirect_url (mock-provider/checkout)
```

**Checkout Page**:
- Displays payment amount and details
- "Pay Now" button (success flow)
- "Cancel" button (cancel flow)

### 3. Process Payment

**User Action**: Click "Pay Now" or "Cancel"

**Success Flow**:
1. JavaScript calls webhook endpoint internally
2. Webhook updates transaction status to `success`
3. Redirect to `return_url?tx_id={id}&status=success`

**Cancel Flow**:
1. Direct redirect to `return_url?tx_id={id}&status=cancelled`

### 4. Return to Application

**Frontend**:
- Reads query params: `tx_id`, `status`
- Fetches transaction details
- Displays result (success/cancelled/failed)

## API Reference

### Create Payment Intent

**Endpoint**: `POST /api/payment/intent`

**Headers**:
```
Content-Type: application/json
X-Token: {user_jwt_token}
```

**Request Body**:
```json
{
  "amount_minor": 1000,
  "currency": "USD",
  "description": "Premium subscription",
  "return_url": "https://app.worldpass.io/pay/return"
}
```

**Response**:
```json
{
  "transaction_id": 123,
  "redirect_url": "http://localhost:8000/mock-provider/checkout?tx_id=123&amount=1000&currency=USD&return_url=..."
}
```

### Webhook Handler

**Endpoint**: `POST /api/payment/webhook/mock`

**Headers**:
```
X-Webhook-Secret: {webhook_secret}
Content-Type: application/json
```

**Request Body**:
```json
{
  "provider_tx_id": "mock_tx_abc123",
  "internal_tx_id": 123,
  "status": "success"
}
```

**Response**:
```json
{
  "ok": true
}
```

### List Transactions

**Endpoint**: `GET /api/payment/transactions?status=success`

**Headers**:
```
X-Token: {user_jwt_token}
```

**Query Params**:
- `status` (optional): Filter by status (`pending`, `success`, `failed`)

**Response**:
```json
{
  "transactions": [
    {
      "id": 123,
      "user_id": "did:key:z6Mk...",
      "amount_minor": 1000,
      "currency": "USD",
      "description": "Premium subscription",
      "status": "success",
      "provider": "mock",
      "provider_tx_id": "mock_tx_abc123",
      "created_at": 1704067200,
      "updated_at": 1704067210
    }
  ]
}
```

## Testing Guide

### End-to-End Test

1. **Start Backend**:
   ```bash
   cd backend
   python -m uvicorn app:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd web
   npm run dev
   ```

3. **Login/Register**:
   - Go to `http://localhost:5173/login`
   - Create account or login

4. **Create Payment**:
   - Click "WorldPass Pay" card on Account page
   - Or navigate to `/pay/demo`
   - Enter amount: `10.00`
   - Enter description: "Test Payment"
   - Click "Proceed to Payment"

5. **Complete Payment**:
   - Redirected to mock checkout page
   - Click "Pay Now" for success
   - Or click "Cancel Payment" to cancel

6. **View Result**:
   - Automatically redirected to result page
   - See transaction details
   - Click "View All Transactions"

7. **Transaction History**:
   - View all transactions at `/account/payments`
   - Filter by status
   - See summary stats

### Test Scenarios

**Successful Payment**:
- Amount: $10.00
- Description: "Test Success"
- Expected: Green success screen, transaction status `success`

**Cancelled Payment**:
- Amount: $5.00
- Description: "Test Cancel"
- Click "Cancel Payment" on checkout
- Expected: Grey cancelled screen, no transaction status change

**Multiple Payments**:
- Create 3-5 payments with different amounts
- Cancel some, complete others
- Check transaction list shows all
- Verify summary stats are correct

## Integration with Real PSP

### Provider Interface

The `MockPaymentProvider` class defines the interface for PSP integration:

```python
class PaymentProvider:
    def create_checkout_url(
        self,
        transaction_id: int,
        amount_minor: int,
        currency: str,
        return_url: str
    ) -> str:
        """Generate checkout URL"""
        pass
    
    def verify_webhook_signature(
        self,
        signature: str
    ) -> bool:
        """Validate webhook calls"""
        pass
    
    def generate_provider_tx_id(self) -> str:
        """Create provider transaction ID"""
        pass
```

### Swapping Providers

**1. Create Provider Implementation**:

```python
# backend/payment_provider_stripe.py
import stripe
from settings import settings

class StripeProvider:
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
    
    def create_checkout_url(self, transaction_id, amount_minor, currency, return_url):
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'unit_amount': amount_minor,
                    'product_data': {'name': 'WorldPass Payment'},
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{return_url}?tx_id={transaction_id}&status=success",
            cancel_url=f"{return_url}?tx_id={transaction_id}&status=cancelled",
            metadata={'internal_tx_id': transaction_id}
        )
        return session.url
    
    def verify_webhook_signature(self, payload, signature):
        try:
            stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
            return True
        except:
            return False
    
    def generate_provider_tx_id(self):
        return None  # Stripe provides this in webhook

stripe_provider = StripeProvider()
```

**2. Update Settings**:

```python
# backend/settings.py
STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET")
```

**3. Swap Provider in Endpoints**:

```python
# backend/payment_endpoints.py
from payment_provider_stripe import stripe_provider as provider
# Instead of: from payment_provider_mock import mock_provider as provider
```

**4. Update Webhook Endpoint**:

```python
@router.post("/webhook/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="Stripe-Signature"),
    db=Depends(get_db)
):
    payload = await request.body()
    
    if not provider.verify_webhook_signature(payload, stripe_signature):
        raise HTTPException(401, "invalid_signature")
    
    event = stripe.Event.construct_from(
        json.loads(payload), stripe.api_key
    )
    
    if event.type == 'checkout.session.completed':
        session = event.data.object
        tx_id = int(session.metadata['internal_tx_id'])
        
        await db.execute(
            "UPDATE transactions SET status=?, provider_tx_id=?, updated_at=? WHERE id=?",
            ('success', session.id, int(time.time()), tx_id)
        )
        await db.commit()
    
    return {"ok": True}
```

## Configuration

### Environment Variables

```env
# Payment Provider
PAYMENT_PROVIDER_BASE_URL=http://localhost:8000/mock-provider
PAYMENT_WEBHOOK_SECRET=mock_webhook_secret_change_in_production

# For production PSP (e.g., Stripe)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### Settings Class

```python
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Payment
    PAYMENT_PROVIDER_BASE_URL: str = "http://localhost:8000/mock-provider"
    PAYMENT_WEBHOOK_SECRET: str = "mock_webhook_secret_change_in_production"
```

## Security Considerations

### Current Implementation

✅ **No Card Storage**: Cards never touch our servers  
✅ **JWT Authentication**: All endpoints require user auth  
✅ **Webhook Signature**: Validates callback authenticity  
✅ **HTTPS Ready**: Works with TLS in production  

### Production Checklist

- [ ] Use real PSP (Stripe, PayPal, etc.)
- [ ] Enable HTTPS only
- [ ] Rotate webhook secrets
- [ ] Implement rate limiting on payment endpoints
- [ ] Add fraud detection (IP checks, velocity limits)
- [ ] Monitor for suspicious transaction patterns
- [ ] Set up webhook retry logic
- [ ] Add transaction reconciliation
- [ ] Implement refund handling
- [ ] Add detailed audit logging

## Limitations

This MVP intentionally excludes:

- ❌ Card data storage
- ❌ Recurring billing / subscriptions
- ❌ Refunds / chargebacks
- ❌ Multi-currency display
- ❌ Tax calculation
- ❌ Invoice generation
- ❌ Email notifications
- ❌ Advanced reporting
- ❌ Webhook retry mechanism
- ❌ Transaction reconciliation

These features should be implemented based on business requirements when integrating a real PSP.

## Future Enhancements

### Phase 2: Production PSP

- Integrate Stripe/PayPal/Square
- Add webhook retry logic
- Implement proper error handling
- Add transaction reconciliation

### Phase 3: Enhanced Features

- Email receipts
- Refund support
- Subscription billing
- Multi-currency support
- Invoice generation

### Phase 4: Enterprise

- Multi-merchant support
- Advanced fraud detection
- Detailed analytics dashboard
- Export transactions (CSV/PDF)
- Accounting system integration

## Troubleshooting

### Payment Intent Fails

**Symptom**: Error on payment creation  
**Check**:
- User is authenticated (valid JWT token)
- Amount is positive integer (minor units)
- Return URL is valid format
- Database connection is working

### Webhook Not Received

**Symptom**: Transaction stays `pending`  
**Check**:
- Mock provider routes are mounted
- Webhook secret matches
- Browser console for JavaScript errors
- Network tab shows webhook call

### Redirect Doesn't Work

**Symptom**: Stuck on checkout page  
**Check**:
- Return URL is properly encoded
- Frontend route `/pay/return` exists
- App.jsx has PaymentResult route

### Transaction List Empty

**Symptom**: No transactions shown  
**Check**:
- User is logged in
- Created transactions under this user's DID
- Database query is working
- Filter is not excluding all results

## License

This payment integration code is provided as-is for demonstration purposes. No third-party payment libraries are included - integration with real PSPs is left to the implementer's choice and licensing requirements.

---

**Documentation Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: WorldPass Team

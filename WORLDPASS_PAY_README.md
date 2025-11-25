# 💳 WorldPass Pay MVP

> Minimal, secure payment integration for WorldPass decentralized identity platform

## ✨ Overview

WorldPass Pay is a demonstration of clean payment system architecture with:
- **No card storage** - PCI-DSS compliant by design
- **Mock provider** - Built-in test provider for development
- **Clean architecture** - Easy to swap with real PSPs
- **Full transaction tracking** - Complete payment history

## 🚀 Quick Start

### 1. Start Backend
```bash
cd backend
python -m uvicorn app:app --reload
```

### 2. Start Frontend
```bash
cd web
npm run dev
```

### 3. Test Payment Flow
1. Open http://localhost:5173
2. Login or register
3. Click "WorldPass Pay" card
4. Enter amount: `10.00`
5. Click "Proceed to Payment"
6. Click "Pay Now" on checkout
7. ✅ View success result!

## 📁 Project Structure

```
backend/
├── payment_schemas.py          # Pydantic models
├── payment_endpoints.py        # API endpoints
├── payment_provider_mock.py    # Provider abstraction
└── mock_provider_routes.py     # Checkout HTML

web/src/pages/pay/
├── WorldPassPayDemo.jsx        # Payment form
├── PaymentResult.jsx           # Result page
└── TransactionsPage.jsx        # Transaction history
```

## 🔌 API Endpoints

### Create Payment Intent
```bash
POST /api/payment/intent
Headers: X-Token: {jwt_token}
Body: {
  "amount_minor": 1000,      # $10.00 in cents
  "currency": "USD",
  "description": "Test",
  "return_url": "http://..."
}
Response: {
  "transaction_id": 123,
  "redirect_url": "http://..."
}
```

### List Transactions
```bash
GET /api/payment/transactions?status=success
Headers: X-Token: {jwt_token}
Response: {
  "transactions": [...]
}
```

### Mock Provider Checkout
```bash
GET /mock-provider/checkout?tx_id=1&amount=1000&currency=USD&return_url=...
Response: HTML checkout page
```

## 🎯 Payment Flow

```
User fills form
     ↓
POST /api/payment/intent
     ↓
Transaction created (status: pending)
     ↓
Redirect to checkout page
     ↓
User clicks "Pay Now"
     ↓
POST /api/payment/webhook/mock
     ↓
Transaction updated (status: success)
     ↓
Redirect to result page
     ↓
Display success ✅
```

## 🧪 Testing

### Automated Test
```bash
python test_payment_endpoints.py
```

### Manual Test Scenarios

**Success Flow:**
1. Amount: $10.00
2. Description: "Test Success"
3. Click "Pay Now"
4. Verify green success screen
5. Check transaction status = `success`

**Cancel Flow:**
1. Amount: $5.00
2. Description: "Test Cancel"
3. Click "Cancel Payment"
4. Verify grey cancelled screen
5. Transaction stays `pending`

**Multiple Payments:**
1. Create 5 payments
2. Complete 3, cancel 2
3. View transaction list
4. Verify filters work
5. Check summary stats

## 🔄 Integration with Real PSP

### Stripe Example

```python
# backend/payment_provider_stripe.py
import stripe

class StripeProvider:
    def create_checkout_url(self, tx_id, amount, currency, return_url):
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'unit_amount': amount,
                    'product_data': {'name': 'Payment'},
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{return_url}?tx_id={tx_id}&status=success",
            cancel_url=f"{return_url}?tx_id={tx_id}&status=cancelled",
        )
        return session.url

stripe_provider = StripeProvider()
```

Then swap in `payment_endpoints.py`:
```python
from payment_provider_stripe import stripe_provider as provider
```

## 🔐 Security

- ✅ JWT authentication on all endpoints
- ✅ Webhook signature verification
- ✅ No card data storage
- ✅ DID-based user tracking
- ✅ HTTPS ready

## 📊 Database Schema

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,          -- pending/success/failed
    provider TEXT NOT NULL,         -- mock/stripe/paypal
    provider_tx_id TEXT,
    return_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

## 🎨 UI Components

### Payment Demo Page
- Gradient background
- Amount input with validation
- Description field
- "Proceed to Payment" button
- Loading states

### Checkout Page
- Mock provider branding
- Amount display
- Pay/Cancel buttons
- Auto redirect

### Result Page
- Status-based colors
- Transaction details
- Navigation buttons

### Transactions Page
- Filter by status
- Responsive table
- Summary stats
- Empty state

## 📚 Documentation

Full documentation: [`docs/worldpass_pay_mvp.md`](docs/worldpass_pay_mvp.md)

Covers:
- Architecture details
- API reference
- Testing guide
- PSP integration
- Security considerations
- Troubleshooting

## 🛠️ Configuration

Environment variables:
```env
PAYMENT_PROVIDER_BASE_URL=http://localhost:8000/mock-provider
PAYMENT_WEBHOOK_SECRET=mock_webhook_secret_change_in_production
```

For production (Stripe example):
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🎯 Features

### Implemented ✅
- [x] Payment intent creation
- [x] Mock provider checkout
- [x] Webhook handling
- [x] Transaction tracking
- [x] Status updates
- [x] Transaction list
- [x] Status filtering
- [x] Responsive design
- [x] Error handling
- [x] Loading states

### Future Enhancements 🚀
- [ ] Real PSP integration (Stripe/PayPal)
- [ ] Refund support
- [ ] Recurring billing
- [ ] Email notifications
- [ ] Invoice generation
- [ ] CSV export
- [ ] Multi-currency
- [ ] Analytics dashboard

## 🐛 Troubleshooting

**Backend not starting?**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app:app --reload
```

**Frontend errors?**
```bash
cd web
npm install
npm run dev
```

**Checkout page not loading?**
- Check backend is running on port 8000
- Verify mock_provider_router is mounted in app.py

**Webhook not working?**
- Check browser console for errors
- Verify PAYMENT_WEBHOOK_SECRET matches in settings

**Transactions not showing?**
- Verify user is logged in
- Check browser network tab
- Confirm transactions exist in database

## 📝 License

Demo implementation provided as-is. Integration with real PSPs subject to their terms.

## 🤝 Contributing

This is a demo MVP. For production use:
1. Replace mock provider with real PSP
2. Add webhook retry logic
3. Implement proper error handling
4. Add monitoring and alerts
5. Set up transaction reconciliation

## 📞 Support

For questions about this implementation:
- Check [`docs/worldpass_pay_mvp.md`](docs/worldpass_pay_mvp.md)
- Review [`PAYMENT_IMPLEMENTATION.md`](PAYMENT_IMPLEMENTATION.md)
- Run `python test_payment_endpoints.py` for diagnostics

---

**Version**: 1.0 MVP  
**Status**: ✅ Complete and Ready for Testing  
**Last Updated**: 2024

"""
Mock Payment Provider

This module simulates a payment provider (like Stripe, iyzico, etc.)
In production, replace this with real payment provider integration.
"""

from typing import Dict, Any
from urllib.parse import urlencode
import secrets
from settings import settings


class MockPaymentProvider:
    """Mock payment provider for MVP testing"""
    
    def __init__(self):
        self.base_url = settings.PAYMENT_PROVIDER_BASE_URL
    
    def create_checkout_url(self, transaction_id: int, amount_minor: int, currency: str, return_url: str) -> str:
        """
        Generate a mock checkout URL
        
        In production, this would call the real provider's API to create a session/intent
        and return their hosted checkout URL.
        """
        params = {
            "tx_id": transaction_id,
            "amount": amount_minor,
            "currency": currency,
            "return_url": return_url
        }
        query_string = urlencode(params)
        return f"{self.base_url}/checkout?{query_string}"
    
    def generate_provider_tx_id(self) -> str:
        """Generate a fake provider transaction ID"""
        return f"mock_tx_{secrets.token_urlsafe(16)}"
    
    def verify_webhook_signature(self, signature: str) -> bool:
        """
        Verify webhook signature from provider
        
        In production, this would verify HMAC signature or similar
        """
        return signature == settings.PAYMENT_WEBHOOK_SECRET


# Singleton instance
mock_provider = MockPaymentProvider()

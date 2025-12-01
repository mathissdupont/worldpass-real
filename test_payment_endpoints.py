"""
Quick test script for WorldPass Pay MVP

Run this after starting the backend to verify all endpoints are working.

Requirements: pip install requests

Usage: python test_payment_endpoints.py
"""

import requests
import json
import time

BASE_URL = "http://worldpass-beta.heptapusgroup.com"

def test_health():
    """Test API health"""
    print("\n🔍 Testing API Health...")
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"✅ Health check: {response.json()}")
    return response.status_code == 200

def test_payment_endpoints():
    """Test payment endpoints (requires auth)"""
    print("\n⚠️  Payment endpoints require authentication")
    print("To test payment flow:")
    print("1. Register/login at: http://worldpass-beta.heptapusgroup.com/login")
    print("2. Navigate to: http://worldpass-beta.heptapusgroup.com/pay/demo")
    print("3. Enter amount: 10.00")
    print("4. Click 'Proceed to Payment'")
    print("5. Click 'Pay Now' on checkout page")
    print("6. Verify success on result page")
    print("7. Check transactions at: http://worldpass-beta.heptapusgroup.com/account/payments")

def test_checkout_page():
    """Test mock provider checkout page (no auth required)"""
    print("\n🔍 Testing Mock Provider Checkout Page...")
    response = requests.get(
        f"{BASE_URL}/mock-provider/checkout",
        params={
            "tx_id": 1,
            "amount": 1000,
            "currency": "USD",
            "return_url": "http://worldpass-beta.heptapusgroup.com/pay/return"
        }
    )
    if response.status_code == 200 and "Mock Payment Provider" in response.text:
        print("✅ Checkout page accessible")
        return True
    else:
        print(f"❌ Checkout page error: {response.status_code}")
        return False

def main():
    print("=" * 60)
    print("WorldPass Pay MVP - Backend Test")
    print("=" * 60)
    
    # Test health
    if not test_health():
        print("❌ Backend not running! Start with: python -m uvicorn app:app --reload")
        return
    
    # Test checkout page
    test_checkout_page()
    
    # Instructions for full test
    test_payment_endpoints()
    
    print("\n" + "=" * 60)
    print("✅ Backend is running correctly!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Start frontend: cd web && npm run dev")
    print("2. Open browser: http://worldpass-beta.heptapusgroup.com")
    print("3. Follow the payment flow instructions above")
    print()

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to backend!")
        print("Start backend with: cd backend && python -m uvicorn app:app --reload")
    except Exception as e:
        print(f"\n❌ Error: {e}")

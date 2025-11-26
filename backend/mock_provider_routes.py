"""
Mock Payment Provider Routes

Simple HTML checkout page that simulates a payment provider.
In production, this would be replaced by a real PSP integration.
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import Optional

from backend.settings import settings
from backend.payment_provider_mock import mock_provider

router = APIRouter(prefix="/mock-provider", tags=["mock-provider"])


@router.get("/checkout", response_class=HTMLResponse)
async def mock_checkout_page(
    tx_id: int,
    amount: int,
    currency: str,
    return_url: str
):
    """
    Mock payment checkout page
    
    Displays a simple form with Pay and Cancel buttons.
    On Pay: triggers webhook internally, then redirects to return_url
    """
    # Format amount for display (convert minor units to major)
    display_amount = amount / 100
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mock Payment Checkout</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .checkout-card {{
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 420px;
                width: 100%;
                padding: 40px;
            }}
            .logo {{
                text-align: center;
                margin-bottom: 32px;
            }}
            .logo h1 {{
                font-size: 28px;
                color: #667eea;
                font-weight: 700;
            }}
            .logo p {{
                color: #64748b;
                font-size: 14px;
                margin-top: 8px;
            }}
            .amount-display {{
                text-align: center;
                margin-bottom: 32px;
                padding: 24px;
                background: #f8fafc;
                border-radius: 12px;
            }}
            .amount-label {{
                font-size: 14px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }}
            .amount-value {{
                font-size: 48px;
                font-weight: 700;
                color: #1e293b;
            }}
            .currency {{
                font-size: 24px;
                color: #64748b;
                margin-left: 8px;
            }}
            .transaction-id {{
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
                margin-bottom: 24px;
            }}
            .button-group {{
                display: flex;
                flex-direction: column;
                gap: 12px;
            }}
            button {{
                padding: 16px 24px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }}
            .btn-pay {{
                background: #667eea;
                color: white;
            }}
            .btn-pay:hover {{
                background: #5568d3;
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            }}
            .btn-cancel {{
                background: #f1f5f9;
                color: #64748b;
            }}
            .btn-cancel:hover {{
                background: #e2e8f0;
            }}
            .security-badge {{
                text-align: center;
                margin-top: 24px;
                color: #94a3b8;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }}
            .loading {{
                display: none;
                text-align: center;
                padding: 24px;
            }}
            .loading.active {{
                display: block;
            }}
            .spinner {{
                border: 3px solid #f1f5f9;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
    </head>
    <body>
        <div class="checkout-card">
            <div class="logo">
                <h1>🔐 Mock Payment Provider</h1>
                <p>Test Payment Gateway</p>
            </div>
            
            <div class="amount-display">
                <div class="amount-label">Amount to Pay</div>
                <div class="amount-value">{display_amount:.2f}<span class="currency">{currency.upper()}</span></div>
            </div>
            
            <div class="transaction-id">
                Transaction ID: #{tx_id}
            </div>
            
            <div id="form-container">
                <div class="button-group">
                    <button class="btn-pay" onclick="handlePay()">
                        💳 Pay Now
                    </button>
                    <button class="btn-cancel" onclick="handleCancel()">
                        ✕ Cancel Payment
                    </button>
                </div>
                
                <div class="security-badge">
                    🔒 Secured by WorldPass Mock Provider
                </div>
            </div>
            
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <div>Processing payment...</div>
            </div>
        </div>
        
        <script>
            const txId = {tx_id};
            const returnUrl = "{return_url}";
            
            async function handlePay() {{
                showLoading();
                
                try {{
                    // Generate mock provider transaction ID
                    const providerTxId = "mock_tx_" + Math.random().toString(36).substr(2, 9);
                    
                    // Call webhook to update transaction status
                    const webhookUrl = "{settings.APP_URL}/api/payment/webhook/mock";
                    const webhookSecret = "{settings.PAYMENT_WEBHOOK_SECRET}";
                    
                    const response = await fetch(webhookUrl, {{
                        method: "POST",
                        headers: {{
                            "Content-Type": "application/json",
                            "X-Webhook-Secret": webhookSecret
                        }},
                        body: JSON.stringify({{
                            provider_tx_id: providerTxId,
                            internal_tx_id: txId,
                            status: "success"
                        }})
                    }});
                    
                    if (!response.ok) {{
                        throw new Error("Webhook call failed");
                    }}
                    
                    // Redirect back to app with success status
                    window.location.href = returnUrl + "?tx_id=" + txId + "&status=success";
                }} catch (error) {{
                    console.error("Payment error:", error);
                    alert("Payment processing failed. Please try again.");
                    hideLoading();
                }}
            }}
            
            function handleCancel() {{
                // Redirect back with cancelled status
                window.location.href = returnUrl + "?tx_id=" + txId + "&status=cancelled";
            }}
            
            function showLoading() {{
                document.getElementById("form-container").style.display = "none";
                document.getElementById("loading").classList.add("active");
            }}
            
            function hideLoading() {{
                document.getElementById("form-container").style.display = "block";
                document.getElementById("loading").classList.remove("active");
            }}
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)

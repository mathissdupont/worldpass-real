import html
from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from .db import get_db
from .oauth import register_oauth_client, authorize_oauth, token_oauth, get_user_info
from .schemas import (
    OAuthClientRegisterReq, OAuthClientRegisterResp,
    OAuthAuthorizeReq, OAuthAuthorizeResp,
    OAuthTokenReq, OAuthTokenResp,
    OAuthUserInfo,
)
from .settings import settings

router = APIRouter()
API = settings.API_PREFIX

# ---------- OAuth Client Registration ----------
@router.post(f"{API}/oauth/clients", response_model=OAuthClientRegisterResp)
async def oauth_register_client(body: OAuthClientRegisterReq, db=Depends(get_db)):
    return await register_oauth_client(body, db)

# ---------- OAuth Authorization (Web sayfası için) ----------
@router.post(f"{API}/oauth/authorize", response_model=OAuthAuthorizeResp)
async def oauth_authorize(body: OAuthAuthorizeReq, user_did: str = Header(None), db=Depends(get_db)):
    if not user_did:
        raise HTTPException(status_code=401, detail="user_did_required")
    return await authorize_oauth(body, user_did, db)


# Simple interactive authorization page for third-party integrations
@router.get(f"{API}/oauth/authorize_page", response_class=HTMLResponse)
async def oauth_authorize_page(request: Request, client_id: str | None = None, redirect_uri: str | None = None, scope: str | None = None, state: str | None = None):
        # Show a tiny consent form. In a full implementation this should check session/authentication and
        # show the logged-in user and a proper consent UI. For now we provide a form where a user can paste
        # their DID to approve the request.
        # XSS protection: HTML escape all user inputs
        safe_client_id = html.escape(client_id or 'unknown')
        safe_redirect_uri = html.escape(redirect_uri or '')
        safe_scope = html.escape(scope or '')
        safe_state = html.escape(state or '')
        html_content = f"""
        <html>
            <head><meta charset="utf-8"><title>Worldpass Authorization</title></head>
            <body style="font-family:system-ui,Segoe UI,Helvetica,Arial;max-width:720px;margin:40px auto;">
                <h2>Worldpass ile giriş</h2>
                <p>İzin verilecek istemci: <b>{safe_client_id}</b></p>
                <p>Yönlendirme: <code>{safe_redirect_uri}</code></p>
                <form method="post" action="{API}/oauth/authorize_page">
                    <input type="hidden" name="client_id" value="{safe_client_id}" />
                    <input type="hidden" name="redirect_uri" value="{safe_redirect_uri}" />
                    <input type="hidden" name="scope" value="{safe_scope}" />
                    <input type="hidden" name="state" value="{safe_state}" />
                    <label for="user_did">Your DID (ör: did:key:z...):</label><br/>
                    <input id="user_did" name="user_did" style="width:100%;padding:8px;margin-top:6px;margin-bottom:12px" placeholder="did:key:z..." />
                    <div style="display:flex;gap:8px">
                        <button type="submit" style="padding:10px 14px">Approve</button>
                        <button type="button" onclick="window.history.back()" style="padding:10px 14px">Cancel</button>
                    </div>
                </form>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)


@router.post(f"{API}/oauth/authorize_page")
async def oauth_authorize_page_post(client_id: str = Form(...), redirect_uri: str = Form(...), scope: str = Form(None), state: str = Form(None), user_did: str = Form(None), db=Depends(get_db)):
        # Basic validation
        if not client_id or not redirect_uri:
                raise HTTPException(status_code=400, detail="missing_parameters")

        # Build a body object like OAuthAuthorizeReq
        body = OAuthAuthorizeReq(client_id=client_id, redirect_uri=redirect_uri, scope=scope or "", state=state or "")

        # Create auth code using existing logic
        resp = await authorize_oauth(body, user_did, db)

        # Redirect to client's redirect_uri with code and state
        sep = '&' if '?' in redirect_uri else '?'
        to = f"{redirect_uri}{sep}code={resp.code}"
        if resp.state:
                to += f"&state={resp.state}"
        return RedirectResponse(url=to)

# ---------- OAuth Token Exchange ----------
@router.post(f"{API}/oauth/token", response_model=OAuthTokenResp)
async def oauth_token(body: OAuthTokenReq, db=Depends(get_db)):
    return await token_oauth(body, db)

# ---------- OAuth User Info ----------
@router.get(f"{API}/oauth/userinfo", response_model=OAuthUserInfo)
async def oauth_userinfo(authorization: str = Header(None), db=Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="invalid_token")
    token = authorization[7:]  # Remove "Bearer "
    return await get_user_info(token, db)

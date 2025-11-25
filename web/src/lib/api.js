import { getToken } from './auth';

// Helper to get issuer token
function getIssuerToken() {
  return localStorage.getItem('issuer_token');
}

export async function apiHealth(){
  const r = await fetch('/api/health');
  return r.json();
}

export async function newChallenge(audience='localhost', exp_secs=120){
  const r = await fetch('/api/challenge/new',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({audience, exp_secs})
  });
  if(!r.ok) throw new Error('challenge_failed');
  return r.json(); // {challenge, nonce, expires_at}
}

export async function verifyVC(vcObj, challenge, presenter_did=null){
  const r = await fetch('/api/vc/verify',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ vc: vcObj, challenge, presenter_did })
  });
  if(!r.ok){
    const detail = (await r.json())?.detail ?? 'verify_failed';
    throw new Error(detail);
  }
  return r.json(); // {valid, reason, issuer, subject, revoked}
}

// Template management API
export async function createTemplate(template) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  const r = await fetch('/api/user/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(template)
  });
  if (!r.ok) throw new Error('create_template_failed');
  return r.json();
}

export async function listTemplates() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  const r = await fetch('/api/user/templates', {
    method: 'GET',
    headers: {
      'X-Token': token
    }
  });
  if (!r.ok) throw new Error('list_templates_failed');
  return r.json();
}

export async function updateTemplate(token, templateId, updates) {
  const r = await fetch(`/api/user/templates/${templateId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(updates)
  });
  if (!r.ok) throw new Error('update_template_failed');
  return r.json();
}

export async function deleteTemplate(token, templateId) {
  const r = await fetch(`/api/user/templates/${templateId}`, {
    method: 'DELETE',
    headers: {
      'X-Token': token
    }
  });
  if (!r.ok) throw new Error('delete_template_failed');
  return r.json();
}

export async function lookupRecipient(recipientId) {
  const r = await fetch(`/api/recipient/${recipientId}`);
  if (!r.ok) throw new Error('recipient_lookup_failed');
  return r.json();
}

// Issuer API
export async function registerIssuer(data) {
  const r = await fetch('/api/issuer/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'register_failed');
  }
  return r.json();
}

export async function loginIssuer(data) {
  const r = await fetch('/api/issuer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'login_failed');
  }
  return r.json();
}

export async function getIssuerProfile() {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/profile', {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('get_profile_failed');
  return r.json();
}

export async function updateIssuerProfile(data) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error('update_profile_failed');
  return r.json();
}

export async function getIssuerStats() {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/stats', {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('get_stats_failed');
  return r.json();
}

export async function listIssuerCredentials(params = {}) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page);
  if (params.per_page) searchParams.set('per_page', params.per_page);
  if (params.status) searchParams.set('status', params.status);
  if (params.template_type) searchParams.set('template_type', params.template_type);
  if (params.search) searchParams.set('search', params.search);
  if (params.date_from) searchParams.set('date_from', params.date_from);
  if (params.date_to) searchParams.set('date_to', params.date_to);
  
  const r = await fetch(`/api/issuer/credentials?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('list_credentials_failed');
  return r.json();
}

export async function getIssuerCredentialDetail(vcId) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch(`/api/issuer/credentials/${vcId}`, {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('get_credential_detail_failed');
  return r.json();
}

export async function listIssuerTemplates() {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/templates', {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('list_templates_failed');
  return r.json();
}

export async function createIssuerTemplate(template) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(template)
  });
  if (!r.ok) throw new Error('create_template_failed');
  return r.json();
}

export async function updateIssuerTemplate(templateId, updates) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch(`/api/issuer/templates/${templateId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(updates)
  });
  if (!r.ok) throw new Error('update_template_failed');
  return r.json();
}

export async function deleteIssuerTemplate(templateId) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch(`/api/issuer/templates/${templateId}`, {
    method: 'DELETE',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('delete_template_failed');
  return r.json();
}

export async function listIssuerWebhooks() {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/webhooks', {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('list_webhooks_failed');
  return r.json();
}

export async function createIssuerWebhook(webhook) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(webhook)
  });
  if (!r.ok) throw new Error('create_webhook_failed');
  return r.json();
}

export async function updateIssuerWebhook(webhookId, updates) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch(`/api/issuer/webhooks/${webhookId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(updates)
  });
  if (!r.ok) throw new Error('update_webhook_failed');
  return r.json();
}

export async function deleteIssuerWebhook(webhookId) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch(`/api/issuer/webhooks/${webhookId}`, {
    method: 'DELETE',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('delete_webhook_failed');
  return r.json();
}

export async function testIssuerWebhook(webhookId) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch(`/api/issuer/webhooks/${webhookId}/test`, {
    method: 'POST',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('test_webhook_failed');
  return r.json();
}

export async function verifyIssuerDomain(issuerId, method) {
  const r = await fetch('/api/issuer/verify-domain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issuer_id: issuerId, method })
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'verify_failed');
  }
  return r.json();
}

export async function rotateIssuerApiKey() {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/issuer/api-key/rotate', {
    method: 'POST',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('rotate_key_failed');
  return r.json();
}

export async function issueCredential(api_key, vc, token, template_id) {
  const authToken = token || getIssuerToken();
  if (!authToken && !api_key) throw new Error('Not authenticated');
  
  const body = { vc };
  if (api_key) body.api_key = api_key;
  if (template_id) body.template_id = template_id;
  
  const r = await fetch('/api/issuer/issue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': authToken
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'issue_failed');
  }
  return r.json();
}

export async function getIssuedCredentials() {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  
  const r = await fetch('/api/issuer/credentials', {
    method: 'GET',
    headers: {
      'X-Token': token
    }
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'fetch_failed');
  }
  return r.json();
}

export async function revokeCredential(vcId) {
  const token = getIssuerToken();
  if (!token) throw new Error('Not authenticated');
  
  const r = await fetch('/api/issuer/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify({ vc_id: vcId })
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'revoke_failed');
  }
  return r.json();
}

export async function setup2FA() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/auth/2fa/setup', {
    method: 'POST',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('setup_2fa_failed');
  return r.json();
}

export async function enable2FA(secret, code) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/auth/2fa/enable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Token': token },
    body: JSON.stringify({ secret, code })
  });
  if (!r.ok) throw new Error('enable_2fa_failed');
  return r.json();
}

export async function disable2FA() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/auth/2fa/disable', {
    method: 'POST',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('disable_2fa_failed');
  return r.json();
}

// User Profile Data API
export async function getUserProfileData() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/user/profile-data', {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('get_profile_data_failed');
  return r.json();
}

export async function saveUserProfileData(profileData) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/user/profile-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify({ profile_data: profileData })
  });
  if (!r.ok) {
    const errorText = await r.text();
    console.error('Profile save error:', errorText);
    throw new Error(`save_profile_data_failed: ${errorText}`);
  }
  return r.json();
}

// Payment API
export async function createPaymentIntent(amount_minor, currency, description, return_url) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const r = await fetch('/api/payment/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify({ amount_minor, currency, description, return_url })
  });
  if (!r.ok) throw new Error('create_payment_intent_failed');
  return r.json();
}

export async function listTransactions(status = null) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const url = status 
    ? `/api/payment/transactions?status=${status}`
    : '/api/payment/transactions';
    
  const r = await fetch(url, {
    method: 'GET',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('list_transactions_failed');
  return r.json();
}

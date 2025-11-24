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
export async function createTemplate(token, template) {
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

export async function listTemplates(token) {
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

export async function getIssuerProfile(token) {
  const r = await fetch('/api/issuer/profile', {
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('profile_failed');
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

export async function rotateIssuerApiKey(token) {
  const r = await fetch('/api/issuer/api-key', {
    method: 'POST',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('rotate_key_failed');
  return r.json();
}

export async function issueCredential(apiKey, vc, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Token'] = token;
  
  const r = await fetch('/api/issuer/issue', {
    method: 'POST',
    headers,
    body: JSON.stringify({ api_key: apiKey, vc })
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'issue_failed');
  }
  return r.json();
}

export async function revokeCredential(apiKey, vcId, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Token'] = token;
  
  const r = await fetch('/api/issuer/revoke', {
    method: 'POST',
    headers,
    body: JSON.stringify({ api_key: apiKey, vc_id: vcId })
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || 'revoke_failed');
  }
  return r.json();
}

export async function setup2FA(token) {
  const r = await fetch('/api/auth/2fa/setup', {
    method: 'POST',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('setup_2fa_failed');
  return r.json();
}

export async function enable2FA(token, secret, code) {
  const r = await fetch('/api/auth/2fa/enable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Token': token },
    body: JSON.stringify({ secret, code })
  });
  if (!r.ok) throw new Error('enable_2fa_failed');
  return r.json();
}

export async function disable2FA(token) {
  const r = await fetch('/api/auth/2fa/disable', {
    method: 'POST',
    headers: { 'X-Token': token }
  });
  if (!r.ok) throw new Error('disable_2fa_failed');
  return r.json();
}

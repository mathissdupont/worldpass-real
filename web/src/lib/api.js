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

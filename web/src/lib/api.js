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

// src/lib/api.ts
export async function apiHealth() {
  try{
    const r = await fetch('/api/health');
    return await r.json();
  }catch{ return { ok:false }; }
}

/** İçerik her şartta metin çekilir; sonra güvenli parse edilir */
function parseJsonSafe(text: string){
  try { return JSON.parse(text); }
  catch {
    // Sunucu HTML / metin dönderdiyse kibar bir hata yükselt
    const brief = (text || "").slice(0, 200);
    throw new Error(brief || "Non-JSON response from server");
  }
}

export async function newChallenge(host?: string, ttlSec = 90){
  const r = await fetch('/api/challenge', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ host, ttl: ttlSec })
  });
  const text = await r.text();
  return parseJsonSafe(text); // {nonce, expires_at}
}

export async function verifyVC(vcObj: any, challenge: string, subjectDid?: string){
  const r = await fetch('/api/verify', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ vc: vcObj, challenge, subjectDid })
  });
  const text = await r.text();
  return parseJsonSafe(text);
}

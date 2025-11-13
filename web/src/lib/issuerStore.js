// src/lib/issuerStore.js
const KEY = "wp_orgs";

function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||"{}"); }catch{ return {}; } }
function write(x){ localStorage.setItem(KEY, JSON.stringify(x)); }
const rid = () => crypto.randomUUID();

export function listOrgs(){ return Object.values(read()); }
export function getOrg(id){ return read()[id] || null; }

export function createOrg({ name, domain, ownerEmail, did, pk_b64u }) {
  const db = read();
  const id = rid();
  const token = btoa(crypto.getRandomValues(new Uint8Array(12)).toString()); // demo
  db[id] = {
    id, name, domain, ownerEmail,
    did, pk_b64u,
    status: "pending",
    verify_token: token,
    operators: [ { email: ownerEmail, role: "org_admin" } ],
    templates: {},
    revocations: {},
    createdAt: Date.now()
  };
  write(db);
  return db[id];
}

export function verifyOrg(id, providedToken){
  const db = read(); const o = db[id]; if(!o) throw new Error("Org not found");
  if (o.verify_token === providedToken) { o.status = "verified"; write(db); return true; }
  return false;
}

export function addOperator(id, email, role="issuer_operator"){
  const db = read(); const o = db[id]; if(!o) throw new Error("Org not found");
  if (!o.operators.find(x=>x.email===email)) o.operators.push({email, role});
  write(db); return o;
}

export function putTemplate(id, key, tpl){
  const db = read(); const o = db[id]; if(!o) throw new Error("Org not found");
  o.templates[key] = tpl; write(db); return o.templates[key];
}

export function revoke(id, jti){
  const db = read(); const o = db[id]; if(!o) throw new Error("Org not found");
  o.revocations[jti] = true; write(db);
}

export function statusOf(jti){
  const all = listOrgs();
  for (const o of all) if (o.revocations[jti]) return { revoked: true, orgId:o.id };
  return { revoked:false };
}


//bunu kaldırmayı unutma
export function markVerified(id){
  const db = read(); 
  if(!db[id]) throw new Error("Org not found");
  db[id].status = "verified";
  write(db);
  return db[id];
}

export function removeTemplate(orgId, key) {
  const all = loadOrgs(); // kendi getter’ınız (örnek: localStorage'dan org listesi çekiyor)
  const org = all.find(o => o.id === orgId);
  if (!org) return;
  if (org.templates && org.templates[key]) {
    delete org.templates[key];
  }
  saveOrgs(all);
}
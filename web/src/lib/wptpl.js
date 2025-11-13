// src/lib/wptpl.js
// WorldPass Markup (WPM v0): tek dosyada "meta" + "vc".
// meta.fields tipleri: "text", "did", "number", "date" + "!" = required
// Örn: { "name":"text!", "subjectDid":"did!", "studentNo":"text" }

export function normalizeTemplate(raw) {
  // raw: object (JSON parse edilmiş)
  const meta = raw?.meta || {};
  const fields = meta.fields || {};
  const name = meta.name || "Untitled";

  if (!raw?.vc || typeof raw.vc !== "object") {
    throw new Error("Template invalid: missing 'vc' object");
  }
  return { meta: { name, fields }, vc: raw.vc };
}

export function requiredKeys(fields) {
  return Object.entries(fields)
    .filter(([, t]) => String(t).endsWith("!"))
    .map(([k]) => k);
}

export function fieldType(fieldSpec) {
  const s = String(fieldSpec || "text").replace("!", "");
  return s; // "text" | "did" | "number" | "date" ...
}

function interpolate(obj, ctx) {
  // basit {{var}} enjeksiyonu + {{now}} {{uuid}}
  const s = JSON.stringify(obj);
  const out = s
    .replaceAll("{{now}}", new Date().toISOString().replace(/\.\d{3}Z$/, "Z"))
    .replaceAll("{{uuid}}", (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)));
  // kalan {{key}}’leri ctx ile değiştir
  return JSON.parse(
    out.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
      const v = key.split('.').reduce((acc,k)=>acc?.[k], ctx);
      return v != null ? String(v) : "";
    })
  );
}

export function renderWPM(wpmObj, { org, form }) {
  // org: {did, ...}, form: kullanıcı inputları
  const { meta, vc } = normalizeTemplate(wpmObj);
  // required kontrol
  for (const rk of requiredKeys(meta.fields)) {
    if (!form?.[rk] || String(form[rk]).trim() === "") {
      throw new Error(`Missing required field: ${rk}`);
    }
  }

  // gövdeyi doldur
  const body = interpolate(vc, { org, ...form });

  // zorunlu alanları otomatik dolduralım
  const issuance = new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  const jti = `vc-${Math.floor(Date.now()/1000)}-${Math.random().toString(36).slice(2,7)}`;

  body.issuer = org.did;
  if (!body["@context"]) body["@context"] = ["https://www.w3.org/2018/credentials/v1"];
  if (!body.issuanceDate) body.issuanceDate = issuance;
  if (!body.jti) body.jti = jti;

  return { meta, body };
}

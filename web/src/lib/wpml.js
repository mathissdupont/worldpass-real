// src/lib/wpml.js
// WPML v0 — çok basit parser + injector

function parseHeaderLines(lines) {
  const meta = {};
  const fields = [];
  let section = "meta"; // meta | fields | body
  let bodyLines = [];

  for (let raw of lines) {
    const line = raw.trimRight();
    if (!line.trim()) continue;
    if (line.startsWith("[fields]")) { section = "fields"; continue; }
    if (line.startsWith("[body]"))   { section = "body";   continue; }

    if (section === "meta") {
      if (line.startsWith("@")) {
        const m = line.match(/^@([^:]+)\s*:\s*(.+)$/);
        if (m) meta[m[1].trim()] = m[2].trim();
      }
    } else if (section === "fields") {
      // id:type:Label[:required][,values=a|b|c]
      // örn: status:select:Status:required,values=active|inactive|graduated
      const mainAndRest = line.split(",");
      const main = mainAndRest[0].split(":");
      if (main.length < 3) continue;
      const id = main[0].trim();
      const type = main[1].trim();
      const label = main[2].trim();
      const required = (main[3] && main[3].trim().toLowerCase() === "required") || false;

      const field = { id, type, label, required };
      // opsiyonel values
      if (mainAndRest.length > 1) {
        for (let i=1;i<mainAndRest.length;i++){
          const kv = mainAndRest[i].split("=");
          if (kv.length === 2 && kv[0].trim()==="values") {
            field.values = kv[1].split("|").map(s=>s.trim()).filter(Boolean);
          }
        }
      }
      fields.push(field);
    } else if (section === "body") {
      bodyLines.push(line);
    }
  }

  const bodyStr = bodyLines.join("\n").trim();
  if (!meta.key || !meta.name) throw new Error("WPML: @key ve @name zorunlu.");
  if (!bodyStr) throw new Error("WPML: [body] boş olamaz.");

  // $context'i body içinde kullanabilmek için meta.context'i $context olarak enjekte edeceğiz
  const context = meta.context || meta["@context"] || null;

  return { meta: { key: meta.key, name: meta.name, context }, fields, bodyStr };
}

export function parseWPML(text) {
  const lines = String(text).split(/\r?\n/);
  return parseHeaderLines(lines);
}

// basit mustache ({{var}}) + hazır helper'lar
function simpleInject(str, ctx) {
  return str
    .replaceAll("{{org.did}}", ctx.org?.did || "")
    .replaceAll("{{now}}", new Date().toISOString().replace(/\.\d{3}Z$/,'Z'))
    .replaceAll("{{uuid}}", (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)))
    // dinamik alanlar
    .replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_, key) => {
      const v = ctx[key];
      return (v === undefined || v === null) ? "" : String(v);
    });
}

// WPML body'yi JSON'a çevir + $context yerini doldur
export function renderWPML(wpmlObj, ctx) {
  const map = { ...(ctx || {}) };
  if (wpmlObj?.meta?.context) {
    map["$context"] = wpmlObj.meta.context;
  }
  const injected = simpleInject(wpmlObj.bodyStr, map);
  try {
    return JSON.parse(injected);
  } catch (e) {
    // hata konumunu daha okunur yapalım
    throw new Error("WPML body JSON parse error: " + e.message);
  }
}

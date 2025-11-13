// src/lib/wpt.js
// Basit WPT (WorldPass Template) parser & renderer

const NOW = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function parseHeaderLine(line) {
  // @field subjectDid: did required label="Subject DID" values=a|b|c
  if (line.startsWith("@field ")) {
    const rest = line.slice(7).trim();
    const [lhs, rhsRaw] = rest.split(":");
    if (!rhsRaw) throw new Error("Malformed @field line");
    const id = lhs.trim();
    const rhs = rhsRaw.trim();

    // kind (ilk token)
    const tokens = rhs.split(/\s+/);
    const kind = tokens[0];
    const tail = rhs.slice(kind.length).trim();

    const f = { id, type: kind, required: false, label: id };

    // required?
    if (/\brequired\b/.test(tail)) f.required = true;

    // label="...":
    const mLabel = tail.match(/label="([^"]*)"/);
    if (mLabel) f.label = mLabel[1];

    // values=a|b|c
    const mValues = tail.match(/values=([^\s]+)/);
    if (mValues) f.values = mValues[1].split("|");

    return { _kind: "field", value: f };
  }

  // @key: val , @name: val , @context: url , @type+: T
  const mKV = line.match(/^@([a-zA-Z+]+)\s*:\s*(.+)$/);
  if (mKV) {
    const k = mKV[1].trim();
    const v = mKV[2].trim();
    if (k === "type+") return { _kind: "typePlus", value: v };
    return { _kind: "kv", key: k, value: v };
  }

  // @default id: value
  const mDef = line.match(/^@default\s+([a-zA-Z0-9._-]+)\s*:\s*(.+)$/);
  if (mDef) {
    return { _kind: "default", id: mDef[1].trim(), value: mDef[2].trim() };
  }

  throw new Error("Unknown directive: " + line);
}

export function parseWPT(text) {
  const lines = (text || "").split(/\r?\n/);
  let header = [];
  let bodyStr = "";
  let inBody = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!inBody) {
      if (!line || line.startsWith("#")) continue;
      if (line === "---") { inBody = true; continue; }
      header.push(line);
    } else {
      bodyStr += raw + "\n";
    }
  }

  // parse header
  const meta = { key: "", name: "", context: "https://www.w3.org/2018/credentials/v1", types: [] };
  const fields = [];
  const defaults = {};

  for (const h of header) {
    const parsed = parseHeaderLine(h);
    if (parsed._kind === "kv") {
      if (parsed.key === "key") meta.key = parsed.value;
      else if (parsed.key === "name") meta.name = parsed.value;
      else if (parsed.key === "context") meta.context = parsed.value;
      else throw new Error("Unknown @ key: " + parsed.key);
    } else if (parsed._kind === "typePlus") {
      meta.types.push(parsed.value);
    } else if (parsed._kind === "field") {
      fields.push(parsed.value);
    } else if (parsed._kind === "default") {
      defaults[parsed.id] = parsed.value;
    }
  }

  if (!meta.key) throw new Error("@key missing");
  if (!meta.name) meta.name = meta.key;

  // Eğer body yoksa otomatik üretilebilir
  const trimmedBody = bodyStr.trim();
  const finalBodyStr = trimmedBody ? trimmedBody : ""; // boş bırakıp render’da üretiriz

  return { meta, fields, defaults, bodyStr: finalBodyStr };
}

// basit mustache: s içindeki {{var}} yerlerine ctx[var] doldur.
function injectPlaceholders(objOrStr, ctx) {
  const s = typeof objOrStr === "string" ? objOrStr : JSON.stringify(objOrStr);
  const out = s.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim();
    if (k === "now") return NOW();
    if (k === "uuid") return (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    // nested (org.did)
    const parts = k.split(".");
    let val = ctx;
    for (const p of parts) val = (val && val[p] !== undefined) ? val[p] : "";
    return String(val ?? "");
  });
  return JSON.parse(out);
}

export function renderWPT(parsed, ctx) {
  // ctx: { org, ...fieldValues }
  // 1) Gövde varsa ondan
  if (parsed.bodyStr && parsed.bodyStr.trim()) {
    const withDefaults = { ...parsed.defaults, ...ctx }; // defaults < user
    // $context kısayolu destekle
    const body = parsed.bodyStr.replace(/"\$context"/g, `"${parsed.meta.context}"`);
    return injectPlaceholders(body, { ...withDefaults, org: ctx.org });
  }

  // 2) Gövde yoksa otomatik iskelet
  const subject = {};
  for (const f of parsed.fields) {
    subject[f.id] = `{{${f.id}}}`;
  }
  if (!subject.subjectDid) subject.subjectDid = "{{subjectDid}}";

  const auto = {
    "@context": [ parsed.meta.context ],
    "type": ["VerifiableCredential", ...parsed.meta.types],
    "issuer": "{{org.did}}",
    "credentialSubject": {
      id: "{{subjectDid}}",
      ...subject
    },
    "issuanceDate": "{{now}}",
    "jti": "{{uuid}}"
  };

  const withDefaults = { ...parsed.defaults, ...ctx };
  return injectPlaceholders(auto, { ...withDefaults, org: ctx.org });
}

// src/lib/wpt_lite2.ts
// Daha toleranslı, insan-dostu WPT-Lite normalizer
// "gevşek" sözdizimini katı @-format'a çevirir.

export function normalizeLite2(input: string): string {
  const out: string[] = [];
  const lines = (input || "").split(/\r?\n/);
  let inBody = false;

  for (let raw of lines) {
    // Satır sonu yorumlarını temizle (body dışında)
    if (!inBody) raw = raw.replace(/\s+(#|\/\/).*/g, "");

    if (inBody) { out.push(raw); continue; }

    let line = raw.trim();
    if (!line) continue;

    // Madde imi gibi görünen ön ekleri yut (örn. "- field ...")
    line = line.replace(/^\-\s+/, "");

    // Body sınırı
    if (line === "---") { out.push("---"); inBody = true; continue; }

    // Eski @-format satırlarını geç
    if (/^@/.test(line)) { out.push(line); continue; }

    // vc / vc!
    if (/^vc!?$/i.test(line)) { out.push("@vc: true"); continue; }

    // key/name/context => ":" opsiyonel
    if (/^(key|name|context)\b/i.test(line)) {
      const [lhs, ...rhsArr] = line.split(/\s*[:\s]\s*/); // hem ':' hem boşluk
      const rhs = rhsArr.join(" ").trim();
      const tag = lhs.toLowerCase();
      if (tag === "key")      { if (rhs) out.push("@key: " + rhs); continue; }
      if (tag === "name")     { if (rhs) out.push("@name: " + rhs); continue; }
      if (tag === "context")  { if (rhs) out.push("@context: " + rhs); continue; }
    }

    // type veya type+
    if (/^type\+?\b/i.test(line)) {
      const rhs = line.replace(/^type\+?\s*[:\s]\s*/i, "").trim();
      if (rhs) out.push("@type+: " + rhs);
      continue;
    }

    // default satırı:  default k v  |  default k: v
    if (/^default\b/i.test(line)) {
      const rest = line.replace(/^default\s+/i, "");
      // "k: v" veya "k v"
      const m = rest.match(/^([^\s:]+)\s*[:\s]\s*(.+)$/);
      if (m) { out.push(`@default ${m[1]}: ${m[2]}`); continue; }
    }

    // "yalın default" k= v (kısa yazım)
    // not: bu mod sadece explicit "default" yazmayan ama "foo= bar"
    // şeklinde varsayılan atamaya niyet eden satırları destekler.
    if (/^[A-Za-z0-9_.:-]+\s*=/.test(line)) {
      const m = line.match(/^([A-Za-z0-9_.:-]+)\s*=\s*(.+)$/);
      if (m) { out.push(`@default ${m[1]}: ${m[2]}`); continue; }
    }

    // FIELD — gevşek sözdizimi
    if (/^field\b/i.test(line)) {
      const rest = line.replace(/^field\s+/i, "");
      const parts = tokenizeLoose(rest);

      const id = (parts.shift() || "fieldId").trim();
      const kind = ((parts.shift() || "text") + "").toLowerCase();

      // Durum bayrakları/alanları
      let required = false;
      let label: string | null = null;
      let valuesRaw: string | null = null;
      let inlineDefault: string | null = null;

      // Yardımcılar
      const takeAfter = (arr: string[], sym: string) => {
        const i = arr.findIndex(x => x.toLowerCase() === sym || x.toLowerCase().startsWith(sym + ":") || x.toLowerCase().startsWith(sym + "="));
        if (i >= 0) {
          const tok = arr[i];
          let val = tok.split(/[:=]/).slice(1).join("=");
          if (!val && i + 1 < arr.length) {
            val = arr[i + 1]; // sym [value] formu
            arr.splice(i, 2);
          } else {
            arr.splice(i, 1);
          }
          return val || "";
        }
        return null;
      };

      // Ana döngü — yumuşak kurallar
      for (let i = 0; i < parts.length; i++) {
        const tok = parts[i];

        // Required eşanlamlıları
        if (tok === "*" || /^req(uired)?$/i.test(tok)) { required = true; continue; }

        // label= / label:
        if (/^label\s*[:=]/i.test(tok)) { label = stripQuotes(tok.split(/[:=]/).slice(1).join("=")); continue; }

        // values= / values: / [a,b] / (a,b) / a|b|c / a,b,c
        if (/^values\s*[:=]/i.test(tok)) {
          valuesRaw = tok.split(/[:=]/).slice(1).join("=");
          continue;
        }
        if (/^\[[^\]]*\]$/.test(tok) || /^\([^\)]*\)$/.test(tok)) {
          // köşeli ya da parantezli liste
          const inner = tok.slice(1, -1);
          if (!valuesRaw) valuesRaw = inner;
          continue;
        }

        // inline default tarzları
        if (tok.startsWith("=")) { inlineDefault = stripQuotes(tok.slice(1)); continue; }
        if (/^default\s*[:=]/i.test(tok)) { inlineDefault = stripQuotes(tok.split(/[:=]/).slice(1).join("=")); continue; }

        // çıplak label yakalama (etiket tırnaksız, çok kelimeli)
        // anahtar kelimelerden (values/default/*) birine çarpana kadar biriktir
        if (!label && !/^(values|default)$/i.test(tok)) {
          const chunk: string[] = [tok];
          let j = i + 1;
          while (
            j < parts.length &&
            !/^\*/.test(parts[j]) &&
            !/^(values|default|req|required)$/i.test(parts[j]) &&
            !/^label\s*[:=]/i.test(parts[j]) &&
            !/^[A-Za-z0-9_.:-]+\s*[:=]/.test(parts[j]) &&
            !/^\[[^\]]*\]$/.test(parts[j]) &&
            !/^\([^\)]*\)$/.test(parts[j])
          ) {
            chunk.push(parts[j]);
            j++;
          }
          label = stripQuotes(chunk.join(" "));
          i = j - 1;
          continue;
        }
      }

      // values normalize: virgülü pipe'a çevir
      let valuesPipe: string | null = null;
      if (valuesRaw) {
        const inner = stripBrackets(valuesRaw);
        const items = inner.split(/[|,]/).map(s => s.trim()).filter(Boolean);
        if (items.length) valuesPipe = items.join("|");
      }

      // @field hattı
      const bits: string[] = [`@field ${id}: ${kind}`];
      if (required) bits.push("required");
      if (label) bits.push(`label="${label}"`);
      if (valuesPipe) bits.push(`values=${valuesPipe}`);
      out.push(bits.join(" "));

      if (inlineDefault) out.push(`@default ${id}: ${inlineDefault}`);
      continue;
    }

    // tanınmayan satır: yut (şimdilik no-op)
  }

  return out.join("\n");
}

/* ---------------- helpers ---------------- */

function tokenizeLoose(s: string): string[] {
  // "..." veya '...' bloklarını korur; [,],(,) tek parça; label çıplak kelimeler kalır
  const out: string[] = [];
  let cur = "";
  let q: '"' | "'" | null = null;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (q) {
      cur += c;
      if (c === q) { push(); q = null; }
      continue;
    }

    if (c === '"' || c === "'") { push(); cur = c; q = c as any; continue; }

    // liste/parantez bloklarını tek tokende tut
    if (c === "[" || c === "(") {
      push();
      const close = c === "[" ? "]" : ")";
      let j = i, buf = "";
      while (j < s.length) {
        const cc = s[j];
        buf += cc;
        if (cc === close) break;
        j++;
      }
      out.push(buf);
      i = j;
      continue;
    }

    if (/\s/.test(c)) { push(); continue; }

    cur += c;
  }
  push();
  return out;

  function push() {
    const t = cur.trim();
    if (t) out.push(t);
    cur = "";
  }
}

function stripQuotes(s: string) {
  return s.replace(/^["']|["']$/g, "");
}

function stripBrackets(s: string) {
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("(") && s.endsWith(")"))) {
    return s.slice(1, -1);
  }
  return s;
}

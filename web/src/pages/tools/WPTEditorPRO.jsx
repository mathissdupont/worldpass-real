// src/pages/tools/WPTEditorPRO.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";


import { normalizeLite2 } from "@/lib/wpt_lite2";
import { parseWPT, renderWPT } from "@/lib/wpt";
import { t } from "@/lib/i18n";

/* ------------ TEMPLATES ------------- */
const TEMPLATES = {
  blank: `# Start typing your WPT here
# Örnek WPT şablonunu buraya yazın
# Örnek:
# key myTemplate
# name Örnek Şablon
# context https://www.w3.org/2018/credentials/v1
# type+ VerifiableCredential
# field subjectDid did * "Konu DID'i"
`,
  studentCard: `key studentCard
name Öğrenci Kartı
context https://www.w3.org/2018/credentials/v1
type+ VerifiableCredential
type+ StudentCard

field subjectDid did * "Konu DID'i"
field name text * "Tam İsim"
field department select "Bölüm" values=CENG|EEE|ME|CE
field validUntil date * "Geçerlilik Tarihi (YYYY-MM-DD)"
field studentNo number "Öğrenci No"

default issuerName WorldPass University

---
{
  "@context": ["$context"],
  "type": ["VerifiableCredential","StudentCard"],
  "id": "urn:uuid:{{uuid}}",
  "issuer": "{{org.did}}",
  "issuanceDate": "{{now}}",
  "credentialSubject": {
    "id": "\${subjectDid}",
    "name": "\${name}",
    "department": "\${department}",
    "validUntil": "\${validUntil}",
    "studentNo": "\${studentNo}"
  }
}
`,
  attendance: `key attendanceCert
name Katılım Sertifikası
context https://www.w3.org/2018/credentials/v1
type+ VerifiableCredential
type+ Attendance

field subjectDid did * "Konu DID'i"
field event text * "Etkinlik Adı"
field date date * "Etkinlik Tarihi (YYYY-MM-DD)"

default issuerName WorldPass Events

---
{
  "@context": ["$context"],
  "type": ["VerifiableCredential","Attendance"],
  "id": "urn:uuid:{{uuid}}",
  "issuer": "{{org.did}}",
  "issuanceDate": "{{now}}",
  "credentialSubject": {
    "id": "\${subjectDid}",
    "event": "\${event}",
    "date": "\${date}"
  }
}
`,
};

/* ------------ HELP TEXT ------------- */
const HELP_TEXT = `
WPT (WorldPass Template) — Hızlı Rehber

1) Üst Bilgiler
   key <kısa_ad>
   name <görünen ad>
   context <VCDM URL>
   type+ <Tür>          # birden çok satır olabilir

2) Alanlar
   field <id> <kind> [*] ["Etiket"] [values=a|b|c]
   kinds: text, number, date, did, select, textarea
   * zorunlu alan

3) Varsayılanlar
   default <anahtar> <değer>

4) Gövde JSON (--- çizgisinden sonra)
   "\${alanId}" ile alanları gövdeye yerleştir.
   Özel yer tutucular: {{now}}, {{uuid}}, {{org.did}}, $context

İpuçları
• select için seçenekleri a|b|c biçiminde yaz (virgül değil).
• date => etikete (YYYY-MM-DD) yazmak iyi pratik.
• did => "did:" ile başlamalı.
 • Hatalar sağ panelde "Kontroller" listesinde ve editörde kırmızı işaretlenir.
`;

/* ------------ LINT & AUTOFIX ------------- */
function lintWptLite(raw) {
  const issues = [];
  const lines = raw.split(/\r?\n/);

  // select values virgül uyarısı
  lines.forEach((ln, idx) => {
    if (/^\s*field\s+/i.test(ln) && /select/i.test(ln) && /values\s*=\s*[^|\s]+,[^|\s]+/.test(ln)) {
      issues.push({ level: "warn", line: idx + 1, msg: "select values virgül değil '|' ile ayrılmalı" });
    }
  });

  // field id kontrolü
  const ids = new Map();
  lines.forEach((ln, idx) => {
    const m = ln.match(/^\s*field\s+([A-Za-z0-9_:-]+)?\s+(\w+)/);
    if (m) {
      const id = m[1];
      if (!id) issues.push({ level: "err", line: idx + 1, msg: "field id boş" });
      else ids.set(id, (ids.get(id) || 0) + 1);
    }
  });
  for (const [id, cnt] of ids.entries()) {
    if (cnt > 1) issues.push({ level: "err", line: 0, msg: `field id tekrarı: ${id}` });
  }

  // başlık hatırlatmaları
  if (!/^\s*key\s+/m.test(raw)) issues.push({ level: "note", line: 1, msg: "key yazman önerilir" });
  if (!/^\s*name\s+/m.test(raw)) issues.push({ level: "note", line: 1, msg: "name yazman önerilir" });
  if (!/^\s*type\+\s+/m.test(raw)) issues.push({ level: "note", line: 1, msg: "en az bir type+ önerilir" });

  return issues;
}

function autoFixCommon(raw) {
  // values=a,b,c → values=a|b|c
  return raw.replace(/(values\s*=\s*)([^\s|]+,[^\s].*?)(?=\s|$)/g, (_, p1, p2) => p1 + p2.replace(/,/g, "|"));
}

/* ------------ COMPONENT ------------- */
export default function WPTEditorPro() {
  // SSR guard (Next.js kullanıyorsan güvenli)
  if (typeof window === "undefined") return null;

  const edRef = useRef(null);
  const editorRef = useRef(null);

  const [tab, setTab] = useState("build"); // build | help | preview
  const [templateKey, setTemplateKey] = useState("blank"); // blank ile başlıyoruz
  const [preview, setPreview] = useState("");
  const [markers, setMarkers] = useState([]);
  const [lintList, setLintList] = useState([]);

  /* Monaco kurulumu */
  useEffect(() => {
    if (!edRef.current) return;

    monaco.languages.register({ id: "wpt" });
    monaco.languages.setMonarchTokensProvider("wpt", {
      tokenizer: {
        root: [
          [/^#.*$/, "comment"],
          // type ve vc'nin gevşek varyantlarını da renklendir
          [/^\s*(key|name|context|type\+?|field|default|vc!?)(?=\s|$)/, "keyword"],
          [/"[^"]*"/, "string"],
          [/'[^']*'/, "string"],
          [/\bvalues\s*=\s*[^\s]+/, "type"],
          [/\*/, "operator"]
        ]
      }
    });

    monaco.languages.registerCompletionItemProvider("wpt", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        const kws = [
          "key ", "name ", "context ", "type+ ", "type ",
          'field id text "Label"',
          'field id number "Label"',
          'field id date "YYYY-MM-DD"',
          'field subjectDid did * "Subject DID"',
          'field id select "Label" values=a|b|c',
          "default key value",
          "vc!", "vc"
        ];
        return {
          suggestions: kws.map(k => ({
            label: k, kind: monaco.languages.CompletionItemKind.Keyword, insertText: k, range
          }))
        };
      }
    });

    const editor = monaco.editor.create(edRef.current, {
      value: TEMPLATES.blank, // BLANK başlat
      language: "wpt",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      theme: "vs-dark"
    });
    editorRef.current = editor;

    const sub = editor.onDidChangeModelContent(() => validate());
    validate();

    return () => {
      sub && sub.dispose();
      editorRef.current && editorRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sekme build'e dönünce preview/göstergeler tazelensin
  useEffect(() => {
    if (tab === "build") validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* Doğrulama + Önizleme */
  function validate() {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const raw = model.getValue();
    const fixed = autoFixCommon(raw);
    const lint = lintWptLite(fixed);
    setLintList(lint);

    try {
      const atText = normalizeLite2(fixed);
      const parsed = parseWPT(atText);
      const bodyObj = renderWPT(parsed, { org: { did: "did:worldpass:demo" } });
      setPreview(JSON.stringify(bodyObj, null, 2));
      setMarkers([]);
      monaco.editor.setModelMarkers(model, "wpt", []);
    } catch (e) {
      setPreview("");
      const msg = (e && e.message) ? e.message : String(e);

      let startLine = 1, startCol = 1;
      const posMatch = msg.match(/position\s+(\d+)/i);
      if (posMatch) {
        const idx = Number(posMatch[1]);
        const upto = fixed.slice(0, idx);
        const lines = upto.split(/\r?\n/);
        startLine = lines.length;
        startCol = (lines[lines.length - 1] || "").length + 1;
      }

      const marker = {
        severity: monaco.MarkerSeverity.Error,
        message: msg,
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: startLine,
        endColumn: startCol + 1
      };
      setMarkers([marker]);
      monaco.editor.setModelMarkers(model, "wpt", [marker]);
    }
  }

  /* UI helpers */
  const loadTemplate = (key) => {
    const editor = editorRef.current;
    if (!editor) return;
    const txt = TEMPLATES[key] || TEMPLATES.blank;
    editor.getModel().setValue(txt);
    setTemplateKey(key);
    validate();
  };

  const onDownload = () => {
    const txt = editorRef.current?.getModel()?.getValue() || "";
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template.wpt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    editorRef.current?.getModel()?.setValue(txt);
    e.target.value = "";
    setTemplateKey("custom");
    validate();
  };

  const fixAll = () => {
    const m = editorRef.current?.getModel();
    if (!m) return;
    const raw = m.getValue();
    const fixed = autoFixCommon(raw);
    if (fixed !== raw) m.setValue(fixed);
    validate();
  };

  const onPreviewClick = () => {
    validate();
    setTab("preview");
  };

  const checks = useMemo(() => {
    if (!lintList.length && !markers.length) return [{ level: "ok", msg: "Sorun görünmüyor." }];
    const mm = markers.map(m => ({ level: "err", msg: m.message }));
    return [...lintList, ...mm];
  }, [lintList, markers]);

  /* ------------ UI ------------- */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border bg-gradient-to-r from-zinc-50 to-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div className="inline-flex rounded-full border bg-white overflow-hidden">
            {["build","help","preview"].map((tb) => (
              <button
                key={tb}
                onClick={()=>setTab(tb)}
                className={`px-3 py-1.5 text-sm transition ${
                  tab===tb ? "bg-black text-white" : "hover:bg-zinc-100"
                }`}
              >
                {tb==="build"? t("wpt.tab_build") : tb==="help"? t("wpt.tab_help") : t("wpt.tab_preview")}
              </button>
            ))}
          </div>

          {/* Templates */}
          <div className="flex items-center gap-2 ml-1">
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={templateKey}
              onChange={(e)=>loadTemplate(e.target.value)}
              title="Start with a template"
            >
              <option value="blank">📝 {t("wpt.template_blank")}</option>
              <option value="studentCard">🎓 {t("wpt.template_student_card")}</option>
              <option value="attendance">🪪 {t("wpt.template_attendance")}</option>
            </select>
            <button onClick={onPreviewClick} className="px-3 py-1.5 rounded-lg bg-black text-white text-sm">{t("wpt.preview_button")}</button>
            <button onClick={onDownload} className="px-3 py-1.5 rounded-lg border text-sm">{t("wpt.download_wpt")}</button>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer">
              {t("wpt.load_wpt")}
              <input type="file" accept=".wpt,text/plain" className="hidden" onChange={onUpload} />
            </label>
            <button onClick={fixAll} className="px-3 py-1.5 rounded-lg border text-sm">{t("wpt.fix_commas")}</button>
          </div>

          <div className="ml-auto text-xs text-gray-500">WPT · Monaco</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[74vh]">
        {/* LEFT: Editor + Help (switch by tab) */}
        <section className="md:col-span-2 rounded-2xl border overflow-hidden flex flex-col shadow-sm">
          {tab!=="help" && (
            <>
              <div className="px-3 py-2 border-b bg-white text-sm text-gray-600">
                {templateKey==="blank" ? t("wpt.start_typing") : t("wpt.edit_template")}
              </div>
              <div ref={edRef} className="flex-1 bg-[#0b0b0c]" />
            </>
          )}
          {tab==="help" && (
            <div className="p-5 overflow-auto">
                <h2 className="text-lg font-semibold">{t("wpt.help_title")}</h2>
                <p className="text-sm text-gray-600 mb-3">{t("wpt.help_subtitle")}</p>
              <pre className="text-xs whitespace-pre-wrap bg-zinc-50 border rounded p-3">{HELP_TEXT}</pre>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <button
                  onClick={()=>loadTemplate("studentCard")}
                  className="rounded-xl border p-3 text-left hover:bg-zinc-50"
                >
                  <div className="font-medium">🎓 {t("wpt.template_student_card")}</div>
                  <div className="text-xs text-gray-600">{t("wpt.template_student_card_desc")}</div>
                </button>
                <button
                  onClick={()=>loadTemplate("attendance")}
                  className="rounded-xl border p-3 text-left hover:bg-zinc-50"
                >
                  <div className="font-medium">🪪 {t("wpt.template_attendance")}</div>
                  <div className="text-xs text-gray-600">{t("wpt.template_attendance_desc")}</div>
                </button>
              </div>
            </div>
          )}
            <div className="px-3 py-2 border-t bg-white text-xs text-gray-500">
            {tab==="help" ? t("wpt.tip_help") : t("wpt.tip_build")}
          </div>
        </section>

        {/* RIGHT: Checks + Preview */}
        <aside className="rounded-2xl border overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 border-b bg-white">
            <div className="font-semibold">{t("wpt.checks")}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {checks.map((c, i) => (
                <li key={i}
                    className={{
                      ok: "text-emerald-700",
                      err: "text-rose-700",
                      warn: "text-amber-700",
                      note: "text-slate-700"
                    }[c.level] || "text-slate-700"}>
                  {c.level.toUpperCase()}: {c.msg}{("line" in c && c.line ? ` (line ${c.line})` : "")}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-[#0b0b0c] text-gray-100 overflow-auto">
            <div className="text-xs text-gray-400 mb-2">{t("wpt.preview_json")}</div>
            <pre className="text-xs whitespace-pre-wrap">{preview}</pre>
          </div>
        </aside>
      </div>
    </div>
  );
}

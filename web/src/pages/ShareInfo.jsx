import { useState, useRef } from "react";
import QRCode from "qrcode.react";

export default function ShareInfo() {
  const [vcText, setVcText] = useState("");
  const [vcObj, setVcObj] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [shareJson, setShareJson] = useState("");
  const [nfcStatus, setNfcStatus] = useState("");
  const ndefRef = useRef(null);
  async function handleNfcShare() {
    if (!('NDEFWriter' in window)) {
      setNfcStatus("Bu tarayıcıda NFC desteklenmiyor.");
      window.dispatchEvent(new CustomEvent('nfc-share', { detail: { success: false, error: 'unsupported' } }));
      return;
    }
    try {
      setNfcStatus("NFC ile aktarılıyor...");
      const writer = new window.NDEFWriter();
      ndefRef.current = writer;
      await writer.write(shareJson);
      setNfcStatus("NFC ile başarıyla paylaşıldı!");
      window.dispatchEvent(new CustomEvent('nfc-share', { detail: { success: true, data: shareJson } }));
    } catch (e) {
      setNfcStatus("NFC aktarım hatası: " + e.message);
      window.dispatchEvent(new CustomEvent('nfc-share', { detail: { success: false, error: e.message } }));
    }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        setVcObj(obj);
        setVcText(ev.target.result);
        setSelectedFields([]);
        setShareJson("");
      } catch {
        alert("Geçersiz JSON dosyası");
      }
    };
    reader.readAsText(file);
  }

  function handleFieldToggle(field) {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  }

  function handleShare() {
    if (!vcObj) return;
    const subject = vcObj.credentialSubject || {};
    const shared = {};
    selectedFields.forEach((f) => {
      shared[f] = subject[f];
    });
    setShareJson(JSON.stringify(shared, null, 2));
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Bilgi Paylaş</h2>
      <input type="file" accept=".json,.wpvc" onChange={handleFile} className="mb-4" />
      {vcObj && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Paylaşmak istediğin alanları seç:</h3>
          <div className="flex flex-wrap gap-3 mb-2">
            {Object.keys(vcObj.credentialSubject || {}).map((field) => (
              <label key={field} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => handleFieldToggle(field)}
                />
                <span>{field}</span>
              </label>
            ))}
          </div>
          <button
            className="px-4 py-2 bg-[color:var(--brand)] text-white rounded-lg"
            onClick={handleShare}
            disabled={selectedFields.length === 0}
          >
            Paylaşılacak Bilgileri Oluştur
          </button>
        </div>
      )}
      {shareJson && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Paylaşılacak JSON</h4>
          <pre className="bg-[color:var(--panel-2)] p-2 rounded text-xs font-mono border border-[color:var(--border)] overflow-x-auto mb-2">{shareJson}</pre>
          <h4 className="font-semibold mb-2">QR ile Paylaş</h4>
          <QRCode value={shareJson} size={180} />
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              onClick={handleNfcShare}
              disabled={!shareJson}
            >
              NFC ile Paylaş
            </button>
            {nfcStatus && <div className="mt-2 text-sm">{nfcStatus}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

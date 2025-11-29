import { useState } from "react";

export default function ReceiveInfo() {
  const [jsonText, setJsonText] = useState("");
  const [info, setInfo] = useState(null);

  function handlePaste(e) {
    setJsonText(e.target.value);
    try {
      setInfo(JSON.parse(e.target.value));
    } catch {
      setInfo(null);
    }
  }

  // QR ve NFC entegrasyonu eklenebilir (şimdilik manuel yapıldı)

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Bilgi Al</h2>
      <textarea
        className="w-full p-2 border rounded mb-4 font-mono text-xs"
        rows={6}
        placeholder="Paylaşılan JSON'u buraya yapıştır veya QR/NFC ile al..."
        value={jsonText}
        onChange={handlePaste}
      />
      {info && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Alınan Bilgiler</h4>
          <ul className="list-disc pl-6">
            {Object.entries(info).map(([k, v]) => (
              <li key={k}><b>{k}:</b> {String(v)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

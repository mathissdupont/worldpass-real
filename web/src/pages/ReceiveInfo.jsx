
import { useState, useRef } from "react";

export default function ReceiveInfo() {
  const [jsonText, setJsonText] = useState("");
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const videoRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const ndefRef = useRef(null);

  function handlePaste(e) {
    setJsonText(e.target.value);
    try {
      setInfo(JSON.parse(e.target.value));
      setMsg({ type: "ok", text: "Bilgi başarıyla alındı." });
    } catch {
      setInfo(null);
      setMsg({ type: "err", text: "Geçersiz JSON." });
    }
  }

  // QR SCAN
  async function startQrScan() {
    setMsg(null);
    if (!('BarcodeDetector' in window)) {
      setMsg({ type: 'err', text: 'Tarayıcı QR kod taramayı desteklemiyor.' });
      return;
    }
    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      scanIntervalRef.current = setInterval(async () => {
        try {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          const w = videoRef.current.videoWidth, h = videoRef.current.videoHeight;
          if (!w || !h) return;
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          const bitmap = await createImageBitmap(canvas);
          const codes = await detectorRef.current.detect(bitmap);
          if (codes && codes.length) {
            handleScanned(codes[0].rawValue);
            stopQrScan();
          }
        } catch {}
      }, 500);
    } catch (e) {
      setMsg({ type: 'err', text: e?.message || String(e) });
    }
  }

  async function stopQrScan() {
    try {
      if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch {}
    setScanning(false);
  }

  // NFC SCAN
  async function startNfcScan() {
    setMsg(null);
    if (!('NDEFReader' in window)) {
      setMsg({ type: 'err', text: 'Tarayıcı NFC okumayı desteklemiyor.' });
      return;
    }
    try {
      const reader = new window.NDEFReader();
      ndefRef.current = reader;
      await reader.scan();
      setNfcActive(true);
      reader.onreading = (ev) => {
        try {
          for (const record of ev.message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              const txt = textDecoder.decode(record.data);
              handleScanned(txt);
              stopNfcScan();
              break;
            }
            if (record.recordType === 'url') {
              const url = new TextDecoder().decode(record.data);
              handleScanned(url);
              stopNfcScan();
              break;
            }
          }
        } catch (e) {
          setMsg({ type: 'err', text: 'NFC okuma hatası.' });
        }
      };
      reader.onreadingerror = () => setMsg({ type: 'err', text: 'NFC okuma hatası.' });
      setMsg({ type: 'ok', text: 'NFC bekleniyor...' });
    } catch (e) {
      setMsg({ type: 'err', text: e?.message || String(e) });
    }
  }

  async function stopNfcScan() {
    try { if (ndefRef.current && ndefRef.current.onreading) ndefRef.current.onreading = null; ndefRef.current = null; } catch {}
    setNfcActive(false);
  }

  // Ortak: QR/NFC/Manuel payload işleme
  function handleScanned(raw) {
    setJsonText(raw);
    try {
      setInfo(JSON.parse(raw));
      setMsg({ type: "ok", text: "Bilgi başarıyla alındı." });
    } catch {
      setInfo(null);
      setMsg({ type: "err", text: "Geçersiz JSON." });
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Bilgi Al</h2>
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded-lg font-medium border ${scanning ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-white border-gray-300'}`}
          onClick={scanning ? stopQrScan : startQrScan}
        >
          {scanning ? 'QR Tarama Durdur' : 'QR ile Al'}
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-medium border ${nfcActive ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300'}`}
          onClick={nfcActive ? stopNfcScan : startNfcScan}
        >
          {nfcActive ? 'NFC Durdur' : 'NFC ile Al'}
        </button>
      </div>
      {scanning && (
        <div className="mb-4 flex flex-col items-center">
          <video ref={videoRef} className="rounded-lg border shadow w-full max-w-xs" autoPlay playsInline muted style={{ minHeight: 180 }} />
          <div className="text-xs text-gray-500 mt-1">Kameradan QR kodu okutun...</div>
        </div>
      )}
      <textarea
        className="w-full p-2 border rounded mb-4 font-mono text-xs"
        rows={6}
        placeholder="Paylaşılan JSON'u buraya yapıştır veya QR/NFC ile al..."
        value={jsonText}
        onChange={handlePaste}
        disabled={scanning || nfcActive}
      />
      {msg && (
        <div className={`mb-2 rounded px-3 py-2 text-sm border ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text}</div>
      )}
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

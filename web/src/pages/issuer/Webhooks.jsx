import { useState, useEffect } from "react";
import { listIssuerWebhooks, createIssuerWebhook, updateIssuerWebhook, deleteIssuerWebhook, testIssuerWebhook } from "@/lib/api";

function Badge({ children, variant = "default" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700 border-gray-200",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}

function WebhookModal({ webhook, onClose, onSave }) {
  const [formData, setFormData] = useState(webhook || {
    url: "",
    events: [],
    active: true,
    secret: "",
  });
  const [loading, setLoading] = useState(false);

  const availableEvents = [
    { value: "credential.issued", label: "Credential Issued" },
    { value: "credential.revoked", label: "Credential Revoked" },
    { value: "credential.verified", label: "Credential Verified" },
    { value: "credential.presented", label: "Credential Presented" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (webhook?.id) {
        await updateIssuerWebhook(webhook.id, formData);
      } else {
        await createIssuerWebhook(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      alert(error.message || "İşlem başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (event) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[color:var(--panel)] rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[color:var(--panel)] border-b border-[color:var(--border)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[color:var(--text)]">
            {webhook ? "Webhook Düzenle" : "Yeni Webhook"}
          </h2>
          <button onClick={onClose} className="text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://your-domain.com/webhook"
              required
              className="w-full px-4 py-2.5 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
              Events
            </label>
            <div className="space-y-2">
              {availableEvents.map((event) => (
                <label key={event.value} className="flex items-center gap-3 p-3 rounded-xl bg-[color:var(--panel-2)] border border-[color:var(--border)] cursor-pointer hover:bg-[color:var(--panel-3)] transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-[color:var(--text)] font-medium">{event.label}</span>
                  <code className="ml-auto text-xs text-[color:var(--muted)] font-mono">{event.value}</code>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
              Secret (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={formData.secret}
              onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
              placeholder="Webhook imzalama için gizli anahtar"
              className="w-full px-4 py-2.5 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="mt-1.5 text-xs text-[color:var(--muted)]">
              HMAC-SHA256 ile webhook isteklerini imzalamak için kullanılır
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-[color:var(--panel-2)] border border-[color:var(--border)] cursor-pointer hover:bg-[color:var(--panel-3)] transition-colors">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-[color:var(--text)]">Aktif</div>
                <div className="text-xs text-[color:var(--muted)]">Webhook'u hemen aktif et</div>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[color:var(--panel-2)] text-[color:var(--text)] rounded-xl hover:bg-[color:var(--panel-3)] transition-colors font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Kaydediliyor..." : webhook ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WebhookCard({ webhook, onEdit, onDelete, onTest }) {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testIssuerWebhook(webhook.id);
      alert(`Test başarılı!\nDurum: ${result.status}\nSüre: ${result.response_time}ms`);
    } catch (error) {
      alert(`Test başarısız: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-xl p-6 hover:border-[color:var(--brand)] transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <code className="text-sm font-mono text-[color:var(--text)] truncate">{webhook.url}</code>
            <Badge variant={webhook.active ? "active" : "inactive"}>
              {webhook.active ? "Aktif" : "Pasif"}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {webhook.events.map((event) => (
              <span key={event} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200">
                {event}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[color:var(--border)]">
        <div className="text-xs text-[color:var(--muted)]">
          {webhook.last_triggered ? (
            <>Son tetikleme: {new Date(webhook.last_triggered).toLocaleDateString("tr")}</>
          ) : (
            <>Henüz tetiklenmedi</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            {testing ? "Test ediliyor..." : "Test Et"}
          </button>
          <button
            onClick={() => onEdit(webhook)}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Düzenle
          </button>
          <button
            onClick={() => onDelete(webhook.id)}
            className="px-3 py-1.5 text-sm bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IssuerWebhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);

  const loadWebhooks = async () => {
    try {
      const data = await listIssuerWebhooks();
      setWebhooks(data);
    } catch (error) {
      console.error("Webhooks yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Bu webhook'u silmek istediğinizden emin misiniz?")) return;
    
    try {
      await deleteIssuerWebhook(id);
      loadWebhooks();
    } catch (error) {
      alert(error.message || "Silme işlemi başarısız oldu");
    }
  };

  const handleEdit = (webhook) => {
    setEditingWebhook(webhook);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWebhook(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[color:var(--muted)]">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--text)] mb-2">Webhooks</h1>
            <p className="text-[color:var(--muted)]">Credential olaylarını gerçek zamanlı takip edin</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-blue-500/30"
          >
            + Yeni Webhook
          </button>
        </div>

        {webhooks.length === 0 ? (
          <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-12 text-center">
            <svg className="h-16 w-16 mx-auto mb-4 text-[color:var(--muted)] opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="text-xl font-semibold text-[color:var(--text)] mb-2">Henüz webhook yok</h3>
            <p className="text-[color:var(--muted)] mb-6">
              İlk webhook'unuzu oluşturarak credential olaylarını gerçek zamanlı takip etmeye başlayın
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
            >
              İlk Webhook'u Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTest={() => {}}
              />
            ))}
          </div>
        )}

        {showModal && (
          <WebhookModal
            webhook={editingWebhook}
            onClose={handleCloseModal}
            onSave={loadWebhooks}
          />
        )}
      </div>
    </div>
  );
}

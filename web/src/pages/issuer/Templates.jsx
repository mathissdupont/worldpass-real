// src/pages/issuer/Templates.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listIssuerTemplates, createIssuerTemplate, deleteIssuerTemplate } from "@/lib/api";

function TemplateCard({ template, onDelete, onEdit }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-[color:var(--text)] text-lg">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-[color:var(--muted)] mt-1">{template.description}</p>
          )}
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          template.is_active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-gray-50 text-gray-700"
        }`}>
          {template.is_active ? "Aktif" : "Pasif"}
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-[color:var(--panel-2)] text-[color:var(--text)]">
          {template.vc_type}
        </span>
        <span className="text-xs text-[color:var(--muted)]">
          {Object.keys(template.schema_data || {}).length} alan
        </span>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(template)}
          className="flex-1 px-3 py-1.5 rounded-lg border border-[color:var(--border)] text-sm hover:bg-[color:var(--panel-2)]"
        >
          Düzenle
        </button>
        <button
          onClick={() => onDelete(template.id)}
          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-sm hover:bg-rose-50"
        >
          Sil
        </button>
      </div>
    </div>
  );
}

function TemplateModal({ isOpen, onClose, onSave, initialData }) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [vcType, setVcType] = useState(initialData?.vc_type || "");
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [schemaJson, setSchemaJson] = useState(
    initialData?.schema_data ? JSON.stringify(initialData.schema_data, null, 2) : "{}"
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const schemaData = JSON.parse(schemaJson);
      onSave({
        name,
        description,
        vc_type: vcType,
        schema_data: schemaData,
        is_active: isActive,
      });
    } catch (err) {
      alert("Geçersiz JSON formatı: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[color:var(--panel)] rounded-2xl border border-[color:var(--border)] w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
        <div className="sticky top-0 bg-[color:var(--panel)] border-b border-[color:var(--border)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[color:var(--text)]">
            {initialData ? "Şablonu Düzenle" : "Yeni Şablon"}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-[color:var(--panel-2)] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
              Şablon Adı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
              placeholder="Öğrenci Kartı Şablonu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
              placeholder="Bu şablon öğrenci kimlik kartları için kullanılır..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
              Kimlik Bilgisi Tipi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={vcType}
              onChange={(e) => setVcType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
              placeholder="StudentCard"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
              Şema (JSON) <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={schemaJson}
              onChange={(e) => setSchemaJson(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] font-mono text-xs outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
              placeholder='{"name": "string", "studentId": "string"}'
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--brand)]"
            />
            <label htmlFor="is-active" className="text-sm text-[color:var(--text)]">
              Aktif şablon
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[color:var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--panel-2)]"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IssuerTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const loadTemplates = async () => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    try {
      setLoading(true);
      const response = await listIssuerTemplates(token);
      setTemplates(response.templates);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (templateData) => {
    const token = localStorage.getItem("issuer_token");
    try {
      if (editingTemplate) {
        // TODO: Update template
        alert("Şablon güncelleme henüz uygulanmadı");
      } else {
        await createIssuerTemplate(token, templateData);
        alert("Şablon oluşturuldu");
      }
      setModalOpen(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm("Bu şablonu silmek istediğinize emin misiniz?")) return;

    const token = localStorage.getItem("issuer_token");
    try {
      await deleteIssuerTemplate(token, templateId);
      alert("Şablon silindi");
      loadTemplates();
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text)]">
            Şablonlar
          </h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            Kimlik bilgisi şablonlarınızı yönetin
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 transition-opacity font-medium"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Yeni Şablon
        </button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--brand)] border-r-transparent"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-12 text-center">
          <svg className="h-16 w-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
            <path d="M3 9h18M9 21V9" strokeWidth="2"/>
          </svg>
          <h3 className="text-lg font-semibold text-[color:var(--text)] mb-2">
            Henüz şablon yok
          </h3>
          <p className="text-sm text-[color:var(--muted)] mb-4">
            Kimlik bilgisi oluşturmayı hızlandırmak için şablon oluşturun
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90"
          >
            İlk Şablonunuzu Oluşturun
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <TemplateModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSave}
        initialData={editingTemplate}
      />
    </div>
  );
}

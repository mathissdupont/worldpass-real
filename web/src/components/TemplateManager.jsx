// src/components/TemplateManager.jsx
import { useState, useEffect } from "react";
import { createTemplate, listTemplates, deleteTemplate, updateTemplate } from "../lib/api";
import { getSession } from "../lib/auth";
import { t } from "../lib/i18n";

function Button({ children, onClick, variant = "secondary", className = "", disabled = false, title }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-[color:var(--brand)] text-white shadow-md hover:bg-[color:var(--brand)]/90 hover:shadow-lg ring-offset-2 focus:ring-2 ring-[color:var(--brand)]",
    secondary: "bg-[color:var(--panel-2)] border border-[color:var(--border)] text-[color:var(--fg)] hover:bg-[color:var(--panel)] hover:border-[color:var(--brand-2)]",
    outline: "border-2 border-[color:var(--border)] hover:border-[color:var(--brand)] text-[color:var(--muted)] hover:text-[color:var(--brand)] bg-transparent",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`} title={title}>
      {children}
    </button>
  );
}

export default function TemplateManager({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vc_type: "StudentCard",
    fields: {}
  });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const session = getSession();
      if (!session?.token) {
        setMsg({ type: "error", text: "Oturum bulunamadı" });
        return;
      }
      const data = await listTemplates(session.token);
      setTemplates(data.templates || []);
    } catch (e) {
      setMsg({ type: "error", text: "Şablonlar yüklenemedi: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    
    try {
      const session = getSession();
      if (!session?.token) throw new Error("Oturum bulunamadı");

      if (editingTemplate) {
        await updateTemplate(session.token, editingTemplate.id, formData);
        setMsg({ type: "success", text: "Şablon güncellendi" });
      } else {
        await createTemplate(session.token, formData);
        setMsg({ type: "success", text: "Şablon oluşturuldu" });
      }
      
      setShowCreateForm(false);
      setEditingTemplate(null);
      setFormData({ name: "", description: "", vc_type: "StudentCard", fields: {} });
      loadTemplates();
    } catch (e) {
      setMsg({ type: "error", text: "Hata: " + e.message });
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm("Bu şablonu silmek istediğinizden emin misiniz?")) return;
    
    try {
      const session = getSession();
      if (!session?.token) throw new Error("Oturum bulunamadı");
      
      await deleteTemplate(session.token, templateId);
      setMsg({ type: "success", text: "Şablon silindi" });
      loadTemplates();
    } catch (e) {
      setMsg({ type: "error", text: "Silme hatası: " + e.message });
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      vc_type: template.vc_type,
      fields: template.fields
    });
    setShowCreateForm(true);
  };

  const handleUseTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    setMsg({ type: "success", text: "Şablon kullanılıyor" });
  };

  return (
    <div className="space-y-3">
      {/* Header with info */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[color:var(--fg)] flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Şablonlar
          </h3>
          <p className="text-xs text-[color:var(--muted)] mt-1">Sık kullanılan kimlik tiplerini kaydedin</p>
        </div>
        <Button 
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingTemplate(null);
            setFormData({ name: "", description: "", vc_type: "StudentCard", fields: {} });
          }} 
          variant="primary"
          className="shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {showCreateForm ? (
              <path d="M18 6L6 18M6 6l12 12"/>
            ) : (
              <><path d="M12 5v14M5 12h14"/></>
            )}
          </svg>
          {showCreateForm ? "İptal" : "Yeni"}
        </Button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top ${
          msg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
          msg.type === "error" ? "bg-rose-50 text-rose-800 border border-rose-200" :
          "bg-blue-50 text-blue-800 border border-blue-200"
        }`}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {msg.type === "success" ? (
              <path d="M20 6L9 17l-5-5"/>
            ) : msg.type === "error" ? (
              <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
            ) : (
              <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>
            )}
          </svg>
          {msg.text}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-[color:var(--panel)] to-[color:var(--panel-2)] border border-[color:var(--brand)]/30 rounded-xl p-4 space-y-3 animate-in slide-in-from-top">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[color:var(--brand)]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <h4 className="font-semibold text-[color:var(--fg)]">
              {editingTemplate ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}
            </h4>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 7h16M4 12h16M4 17h10"/>
                </svg>
                Şablon Adı *
              </label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none transition-all"
                placeholder="Örn: Öğrenci Kartı"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                Kart Tipi *
              </label>
              <select 
                value={formData.vc_type}
                onChange={(e) => setFormData({...formData, vc_type: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none transition-all"
              >
                <option value="StudentCard">🎓 Öğrenci Kartı</option>
                <option value="Membership">🎫 Üyelik Kartı</option>
                <option value="KYC">🔐 Kimlik Doğrulama</option>
                <option value="EmployeeCard">👔 Çalışan Kartı</option>
                <option value="AccessCard">🚪 Erişim Kartı</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--muted)] mb-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Açıklama
            </label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none transition-all resize-none"
              placeholder="Şablon hakkında kısa açıklama..."
              rows="2"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" onClick={() => setShowCreateForm(false)} variant="secondary" className="text-xs">
              İptal
            </Button>
            <Button type="submit" variant="primary" className="text-xs">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {editingTemplate ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-[color:var(--muted)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--brand)] mb-2"></div>
          <p className="text-sm">Şablonlar yükleniyor...</p>
        </div>
      ) : templates.length === 0 && !showCreateForm ? (
        <div className="text-center py-10 border border-dashed border-[color:var(--border)] rounded-xl bg-[color:var(--panel-2)]/50">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[color:var(--panel)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[color:var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <p className="text-sm text-[color:var(--muted)] mb-1">Henüz şablon yok</p>
          <p className="text-xs text-[color:var(--muted)] mb-4">İlk şablonunuzu oluşturarak başlayın</p>
          <Button 
            onClick={() => setShowCreateForm(true)} 
            variant="primary"
            className="text-xs"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            İlk Şablonu Oluştur
          </Button>
        </div>
      ) : templates.length > 0 ? (
        <div>
          <div className="text-xs text-[color:var(--muted)] mb-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Kullanmak istediğiniz şablonu seçin
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {templates.map((template) => (
              <div 
                key={template.id}
                className="group bg-[color:var(--panel)] border border-[color:var(--border)] rounded-xl p-3 hover:border-[color:var(--brand)]/50 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => handleUseTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded bg-[color:var(--brand)]/10 flex items-center justify-center text-xs">
                        {template.vc_type === 'StudentCard' ? '🎓' :
                         template.vc_type === 'Membership' ? '🎫' :
                         template.vc_type === 'KYC' ? '🔐' :
                         template.vc_type === 'EmployeeCard' ? '👔' :
                         template.vc_type === 'AccessCard' ? '🚪' : '📄'}
                      </div>
                      <h4 className="font-semibold text-sm text-[color:var(--fg)] truncate">
                        {template.name}
                      </h4>
                    </div>
                    {template.description && (
                      <p className="text-xs text-[color:var(--muted)] line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(template);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] transition-colors"
                      title="Düzenle"
                    >
                      <svg className="w-3.5 h-3.5 text-[color:var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Sil"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[color:var(--border)]/50">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--panel-2)] text-[color:var(--muted)] font-medium">
                    {template.vc_type}
                  </span>
                  <span className="text-[10px] text-[color:var(--brand)] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Kullan
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

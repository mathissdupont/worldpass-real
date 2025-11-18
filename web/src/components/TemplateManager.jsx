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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[color:var(--fg)]">Şablonlar</h3>
        <Button 
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingTemplate(null);
            setFormData({ name: "", description: "", vc_type: "StudentCard", fields: {} });
          }} 
          variant="primary"
        >
          {showCreateForm ? "İptal" : "+ Yeni Şablon"}
        </Button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${
          msg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
          msg.type === "error" ? "bg-rose-50 text-rose-800 border border-rose-200" :
          "bg-blue-50 text-blue-800 border border-blue-200"
        }`}>
          {msg.text}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-xl p-4 space-y-4">
          <h4 className="font-semibold text-[color:var(--fg)]">
            {editingTemplate ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}
          </h4>
          
          <div>
            <label className="block text-xs font-medium text-[color:var(--muted)] uppercase mb-2">Şablon Adı</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none"
              placeholder="Örn: Öğrenci Kartı"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--muted)] uppercase mb-2">Açıklama</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none"
              placeholder="Şablon açıklaması"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--muted)] uppercase mb-2">Kart Tipi</label>
            <select 
              value={formData.vc_type}
              onChange={(e) => setFormData({...formData, vc_type: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none"
            >
              <option value="StudentCard">Öğrenci Kartı (StudentCard)</option>
              <option value="Membership">Üyelik Kartı (Membership)</option>
              <option value="KYC">Kimlik Doğrulama (KYC)</option>
              <option value="EmployeeCard">Çalışan Kartı (EmployeeCard)</option>
              <option value="AccessCard">Erişim Kartı (AccessCard)</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" onClick={() => setShowCreateForm(false)} variant="secondary">
              İptal
            </Button>
            <Button type="submit" variant="primary">
              {editingTemplate ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-[color:var(--muted)]">Yükleniyor...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-[color:var(--muted)] border border-dashed border-[color:var(--border)] rounded-xl">
          Henüz şablon yok. Yeni bir şablon oluşturun.
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <div 
              key={template.id}
              className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-xl p-4 hover:border-[color:var(--brand)]/40 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-[color:var(--fg)]">{template.name}</h4>
                  {template.description && (
                    <p className="text-xs text-[color:var(--muted)] mt-1">{template.description}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded bg-[color:var(--panel-2)] text-[color:var(--muted)]">
                  {template.vc_type}
                </span>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button onClick={() => handleUseTemplate(template)} variant="primary" className="flex-1 text-xs">
                  Kullan
                </Button>
                <Button onClick={() => handleEdit(template)} variant="secondary" className="text-xs">
                  Düzenle
                </Button>
                <Button onClick={() => handleDelete(template.id)} variant="danger" className="text-xs">
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from "react-icons/fi";

export default function IssuerTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vc_type: "VerifiableCredential",
    fields: []
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("issuer_token");
      const response = await fetch("/api/issuer/templates", {
        headers: { "X-Token": token }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error("Template loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCreating(true);
    setFormData({
      name: "",
      description: "",
      vc_type: "VerifiableCredential",
      fields: [{ name: "", type: "text", required: true }]
    });
  };

  const handleEdit = (template) => {
    setEditing(template.id);
    setFormData({
      name: template.name,
      description: template.description,
      vc_type: template.vc_type,
      fields: template.fields || []
    });
  };

  const handleCancel = () => {
    setCreating(false);
    setEditing(null);
    setFormData({ name: "", description: "", vc_type: "VerifiableCredential", fields: [] });
  };

  const handleSave = async () => {
    const token = localStorage.getItem("issuer_token");
    
    try {
      if (creating) {
        // Create new template
        const response = await fetch("/api/issuer/templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Token": token
          },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          await loadTemplates();
          handleCancel();
        } else {
          const error = await response.json();
          console.error("Create failed:", error);
          alert("Şablon oluşturulamadı: " + (error.detail || "Bilinmeyen hata"));
        }
      } else if (editing) {
        // Update existing template
        const response = await fetch(`/api/issuer/templates/${editing}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Token": token
          },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          await loadTemplates();
          handleCancel();
        } else {
          const error = await response.json();
          console.error("Update failed:", error);
          alert("Şablon güncellenemedi: " + (error.detail || "Bilinmeyen hata"));
        }
      }
    } catch (e) {
      console.error("Save error:", e);
      alert("İşlem başarısız: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu şablonu silmek istediğinizden emin misiniz?")) return;
    
    const token = localStorage.getItem("issuer_token");
    try {
      const response = await fetch(`/api/issuer/templates/${id}`, {
        method: "DELETE",
        headers: { "X-Token": token }
      });
      
      if (response.ok) {
        await loadTemplates();
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const addField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, { name: "", type: "text", required: true }]
    });
  };

  const updateField = (index, key, value) => {
    const newFields = [...formData.fields];
    newFields[index][key] = value;
    setFormData({ ...formData, fields: newFields });
  };

  const removeField = (index) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VC Şablonları</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Kimlik kartları için şablon oluşturun ve yönetin
          </p>
        </div>
        {!creating && !editing && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Yeni Şablon
          </button>
        )}
      </div>

      {(creating || editing) && (
        <div className="mb-6 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Şablon Adı *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Örn: Öğrenci Kartı"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                rows={2}
                placeholder="Şablon hakkında kısa açıklama"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                VC Tipi *
              </label>
              <input
                type="text"
                value={formData.vc_type}
                onChange={(e) => setFormData({ ...formData, vc_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Örn: StudentCard, EmployeeCard"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Field'lar *
                </label>
                <button
                  onClick={addField}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Field Ekle
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.fields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, "name", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Field adı (örn: studentId, department)"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, "type", e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="email">Email</option>
                    </select>
                    <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, "required", e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Zorunlu</span>
                    </label>
                    <button
                      onClick={() => removeField(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.vc_type || formData.fields.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiSave className="w-4 h-4" />
                Kaydet
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <FiX className="w-4 h-4" />
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Henüz şablon oluşturulmamış</p>
          <button
            onClick={handleCreate}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            İlk şablonunuzu oluşturun
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {template.vc_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {template.fields?.length || 0} field
                    </span>
                  </div>
                  {template.fields && template.fields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.fields.map((field, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {field.name} ({field.type})
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

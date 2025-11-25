import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import IssuerLayout from "@/components/issuer/IssuerLayout";
import { 
  getIssuerProfile, 
  listIssuerTemplates,
  createIssuerTemplate,
  updateIssuerTemplate,
  deleteIssuerTemplate
} from "@/lib/api";
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiX, FiCode } from "react-icons/fi";

export default function IssuerTemplates() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vc_type: "",
    schema_data: "{}",
    is_active: true
  });
  const [formError, setFormError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [jsonError, setJsonError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    loadData(token);
  }, [navigate]);

  const loadData = async (token) => {
    try {
      setLoading(true);
      setError(null);

      const [profileResp, templatesResp] = await Promise.all([
        getIssuerProfile(),
        listIssuerTemplates()
      ]);

      setIssuer(profileResp.issuer);
      setTemplates(templatesResp.templates || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (err.message.includes("401") || err.message.includes("token")) {
        localStorage.removeItem("issuer_token");
        navigate("/issuer/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      vc_type: "",
      schema_data: "{\n  \"fields\": []\n}",
      is_active: true
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    
    // Parse schema data safely
    let schemaData = "{}";
    try {
      if (typeof template.schema_data === 'string') {
        schemaData = template.schema_data;
      } else if (template.schema_json) {
        schemaData = typeof template.schema_json === 'string' 
          ? template.schema_json 
          : JSON.stringify(template.schema_json, null, 2);
      } else if (template.schema_data) {
        schemaData = JSON.stringify(template.schema_data, null, 2);
      }
      // Validate it's proper JSON
      JSON.parse(schemaData);
    } catch (e) {
      console.error('Error parsing template schema:', e);
      schemaData = "{}";
    }
    
    setFormData({
      name: template.name,
      description: template.description || "",
      vc_type: template.vc_type,
      schema_data: schemaData,
      is_active: template.is_active
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setJsonError(null);
    setSaving(true);

    try {
      // Validate JSON
      const parsedSchema = JSON.parse(formData.schema_data);

      const payload = {
        name: formData.name,
        description: formData.description,
        vc_type: formData.vc_type,
        schema_data: parsedSchema,
        is_active: formData.is_active
      };

      if (editingTemplate) {
        await updateIssuerTemplate(editingTemplate.id, payload);
      } else {
        await createIssuerTemplate(payload);
      }

      closeModal();
      const token = localStorage.getItem("issuer_token");
      await loadData(token);
    } catch (err) {
      console.error(err);
      if (err instanceof SyntaxError) {
        setJsonError("Geçersiz JSON formatı: " + err.message);
        setFormError("JSON şeması geçersiz");
      } else {
        setFormError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(formData.schema_data);
      setFormData({ ...formData, schema_data: JSON.stringify(parsed, null, 2) });
      setJsonError(null);
    } catch (err) {
      setJsonError("Geçersiz JSON: " + err.message);
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(formData.schema_data);
      setFormData({ ...formData, schema_data: JSON.stringify(parsed) });
      setJsonError(null);
    } catch (err) {
      setJsonError("Geçersiz JSON: " + err.message);
    }
  };

  const handleToggleActive = async (template) => {
    try {
      await updateIssuerTemplate(template.id, {
        is_active: !template.is_active
      });
      const token = localStorage.getItem("issuer_token");
      await loadData(token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleDelete = async (template) => {
    setDeleteConfirm(template);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteIssuerTemplate(deleteConfirm.id);
      setDeleteConfirm(null);
      const token = localStorage.getItem("issuer_token");
      await loadData(token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (!issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <IssuerLayout issuer={issuer}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Şablonlar</h1>
            <p className="text-gray-600 mt-1">Kimlik bilgisi şablonlarınızı yönetin</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tablo
              </button>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
            >
              <FiPlus className="h-4 w-4" />
              Yeni Şablon
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : templates.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <FiCode className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Henüz şablon yok
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              Kimlik bilgisi oluşturmayı hızlandırmak için şablon oluşturun. Şablonlar, tutarlı ve tekrar kullanılabilir kimlik bilgisi formatları sağlar.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <FiPlus className="h-4 w-4" />
              İlk Şablonunuzu Oluşturun
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all duration-200 group cursor-pointer"
                onClick={() => openEditModal(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg truncate">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                    template.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}>
                    {template.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200">
                    {template.vc_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Object.keys(template.schema_data || template.schema_json || {}).length} alan
                  </span>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(template);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center gap-1.5"
                    title={template.is_active ? "Devre Dışı Bırak" : "Aktif Et"}
                  >
                    {template.is_active ? <FiToggleRight className="h-4 w-4" /> : <FiToggleLeft className="h-4 w-4" />}
                    {template.is_active ? "Pasif" : "Aktif"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(template);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                    title="Düzenle"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(template);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-sm hover:bg-rose-50"
                    title="Sil"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şablon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr 
                    key={template.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openEditModal(template)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-700">{template.vc_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        template.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {template.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(() => {
                        const timestamp = template.created_at;
                        const date = timestamp > 10000000000 
                          ? new Date(timestamp)
                          : new Date(timestamp * 1000);
                        return date.toLocaleDateString('tr-TR');
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(template);
                          }}
                          className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                          title={template.is_active ? "Devre Dışı Bırak" : "Aktif Et"}
                        >
                          {template.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(template);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Düzenle"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template);
                          }}
                          className="p-1.5 text-rose-600 hover:text-rose-800 transition-colors"
                          title="Sil"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                  <svg className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-rose-700">{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şablon Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="örn: Öğrenci Kimlik Kartı"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Bu şablon hakkında kısa bir açıklama..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kimlik Bilgisi Tipi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vc_type}
                    onChange={(e) => setFormData({ ...formData, vc_type: e.target.value })}
                    placeholder="StudentCard, EmployeeID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kimlik bilgisinin teknik tipi (camelCase önerilir)
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Şablon Aktif
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Aktif şablonlar kimlik bilgisi oluştururken kullanılabilir
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Şema Yapısı (JSON) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={formatJson}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Formatla
                    </button>
                    <button
                      type="button"
                      onClick={minifyJson}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Küçült
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    required
                    value={formData.schema_data}
                    onChange={(e) => {
                      setFormData({ ...formData, schema_data: e.target.value });
                      setJsonError(null);
                    }}
                    rows={12}
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 ${
                      jsonError ? 'border-rose-300' : 'border-gray-300'
                    }`}
                    placeholder={`{
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "studentId": {"type": "string"},
    "program": {"type": "string"}
  },
  "required": ["name", "studentId"]
}`}
                  />
                  {jsonError && (
                    <div className="absolute bottom-2 left-2 right-2 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                      <p className="text-xs text-rose-700">{jsonError}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-2 mt-2 text-xs text-gray-500">
                  <svg className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>
                    Geçerli JSON olmalı. Bu şema kimlik bilgisi oluşturulurken validation için kullanılır.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-5 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                  disabled={saving}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Kaydediliyor...
                    </span>
                  ) : (
                    editingTemplate ? 'Şablonu Güncelle' : 'Şablon Oluştur'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                <FiTrash2 className="h-5 w-5 text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Şablonu Sil</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              "<span className="font-medium text-gray-900">{deleteConfirm.name}</span>" şablonunu silmek istediğinize emin misiniz? 
              Bu işlem geri alınamaz.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium transition-colors shadow-sm"
              >
                Şablonu Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </IssuerLayout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import IssuerLayout from "@/components/issuer/IssuerLayout";
import DataTable from "@/components/issuer/DataTable";
import { 
  getIssuerProfile, 
  listIssuerTemplates,
  createIssuerTemplate,
  updateIssuerTemplate,
  deleteIssuerTemplate
} from "@/lib/api";
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiX } from "react-icons/fi";

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
        getIssuerProfile(token),
        listIssuerTemplates(token)
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
    setSaving(true);

    try {
      // Validate JSON
      JSON.parse(formData.schema_data);

      const token = localStorage.getItem("issuer_token");
      const payload = {
        name: formData.name,
        description: formData.description,
        vc_type: formData.vc_type,
        schema_data: JSON.parse(formData.schema_data),
        is_active: formData.is_active
      };

      if (editingTemplate) {
        await updateIssuerTemplate(token, editingTemplate.id, payload);
      } else {
        await createIssuerTemplate(token, payload);
      }

      closeModal();
      await loadData(token);
    } catch (err) {
      console.error(err);
      if (err instanceof SyntaxError) {
        setFormError("Invalid JSON in schema data");
      } else {
        setFormError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template) => {
    try {
      const token = localStorage.getItem("issuer_token");
      await updateIssuerTemplate(token, template.id, {
        is_active: !template.is_active
      });
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
      const token = localStorage.getItem("issuer_token");
      await deleteIssuerTemplate(token, deleteConfirm.id);
      setDeleteConfirm(null);
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

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          {row.description && (
            <div className="text-xs text-gray-500 mt-0.5">{row.description}</div>
          )}
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'vc_type',
      render: (row) => (
        <span className="text-sm text-gray-700">{row.vc_type}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          row.is_active 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (row) => {
        const timestamp = row.created_at;
        const date = timestamp > 10000000000 
          ? new Date(timestamp)
          : new Date(timestamp * 1000);
        return date.toLocaleDateString();
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(row);
            }}
            className="p-1.5 text-gray-600 hover:text-gray-900"
            title={row.is_active ? "Deactivate" : "Activate"}
          >
            {row.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="p-1.5 text-rose-600 hover:text-rose-800"
            title="Delete"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <IssuerLayout issuer={issuer}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="text-gray-600 mt-1">Manage credential templates</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <FiPlus className="h-4 w-4" />
            Create Template
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Templates Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Templates ({templates.length})
            </h2>
          </div>
          <DataTable
            columns={columns}
            data={templates}
            loading={loading}
            emptyMessage="No templates created yet. Create your first template to get started."
            onRowClick={(row) => openEditModal(row)}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <p className="text-sm text-rose-700">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Student ID Card"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.vc_type}
                  onChange={(e) => setFormData({ ...formData, vc_type: e.target.value })}
                  placeholder="e.g., StudentCard, EmployeeID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schema Data (JSON) *
                </label>
                <textarea
                  required
                  value={formData.schema_data}
                  onChange={(e) => setFormData({ ...formData, schema_data: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='{"fields": ["name", "id", "date"]}'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be valid JSON. Example: {`{"fields": ["name", "studentId"]}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (available for use)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Delete Template</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "<span className="font-medium text-gray-900">{deleteConfirm.name}</span>"? 
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </IssuerLayout>
  );
}

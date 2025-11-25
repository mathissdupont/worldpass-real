// Modern Issuer Console - Clean & Responsive
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssuerProfile, issueCredential, getIssuedCredentials, listIssuerTemplates } from '../../lib/api';

export default function IssuerConsole() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('issue'); // 'issue' | 'issued' | 'templates'
  
  // Issue form
  const [recipientDID, setRecipientDID] = useState('');
  const [credentialType, setCredentialType] = useState('');
  const [credentialData, setCredentialData] = useState('{}');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');
  
  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Issued credentials
  const [issuedVCs, setIssuedVCs] = useState([]);
  const [loadingVCs, setLoadingVCs] = useState(false);

  useEffect(() => {
    loadProfile();
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoadingTemplates(true);
      const data = await listIssuerTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Load templates error:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await getIssuerProfile();
      setProfile(data);
    } catch (err) {
      console.error('Load profile error:', err);
      if (err.message?.includes('401') || err.message?.includes('403')) {
        navigate('/issuer/login');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadIssuedCredentials() {
    try {
      setLoadingVCs(true);
      const data = await getIssuedCredentials();
      setIssuedVCs(data.credentials || []);
    } catch (err) {
      console.error('Load issued VCs error:', err);
    } finally {
      setLoadingVCs(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'issued' && issuedVCs.length === 0) {
      loadIssuedCredentials();
    }
  }, [activeTab]);

  async function handleIssueCredential(e) {
    e.preventDefault();
    setIssueError('');
    setIssueSuccess('');

    // Validation
    if (!recipientDID.trim()) {
      setIssueError('Recipient DID is required');
      return;
    }
    if (!credentialType.trim()) {
      setIssueError('Credential type is required');
      return;
    }

    // Parse credential data
    let parsedData;
    try {
      parsedData = JSON.parse(credentialData);
    } catch (err) {
      setIssueError('Invalid JSON in credential data');
      return;
    }

    try {
      setIssuing(true);

      // Build VC
      const vc = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', credentialType],
        issuer: issuer.did,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: recipientDID,
          ...parsedData
        },
        jti: `vc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const token = localStorage.getItem('issuer_token');
      await issueCredential(null, vc, token, selectedTemplate?.id || null);
      
      setIssueSuccess('Credential issued successfully!');
      setRecipientDID('');
      setCredentialType('');
      setCredentialData('{}');
      setSelectedTemplate(null);
      
      // Reload issued credentials if on that tab
      if (activeTab === 'issued') {
        loadIssuedCredentials();
      }
    } catch (err) {
      console.error('Issue error:', err);
      setIssueError(err.message || 'Failed to issue credential');
    } finally {
      setIssuing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--brand)] mx-auto mb-4"></div>
          <p className="text-[color:var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[color:var(--text)] mb-4">Not authenticated</p>
          <button 
            onClick={() => navigate('/issuer/login')}
            className="px-4 py-2 bg-[color:var(--brand)] text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* Header */}
      <div className="bg-[color:var(--panel)] border-b border-[color:var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[color:var(--text)]">Issuer Console</h1>
              <p className="text-sm text-[color:var(--muted)] mt-1">{profile.org_name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-xs text-emerald-400 font-medium">Active</span>
              </div>
              <button
                onClick={() => navigate('/account')}
                className="px-4 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] hover:bg-[color:var(--panel)] transition-colors text-sm"
              >
                Back to Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[color:var(--panel)] border-b border-[color:var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('issue')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'issue'
                  ? 'text-[color:var(--brand)] border-b-2 border-[color:var(--brand)]'
                  : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
              }`}
            >
              Issue Credential
            </button>
            <button
              onClick={() => setActiveTab('issued')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'issued'
                  ? 'text-[color:var(--brand)] border-b-2 border-[color:var(--brand)]'
                  : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
              }`}
            >
              Issued Credentials
            </button>
            <button
              onClick={() => navigate('/issuer/templates')}
              className="px-4 py-3 text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors whitespace-nowrap"
            >
              Manage Templates →
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'issue' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-[color:var(--panel)] rounded-xl border border-[color:var(--border)] p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-[color:var(--text)] mb-6">Issue New Credential</h2>
              
              <form onSubmit={handleIssueCredential} className="space-y-6">
                {/* Template Selection */}
                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                      Use Template (Optional)
                    </label>
                    <select
                      value={selectedTemplate?.id || ''}
                      onChange={(e) => {
                        const template = templates.find(t => t.id === parseInt(e.target.value));
                        setSelectedTemplate(template || null);
                        if (template) {
                          setCredentialType(template.vc_type);
                          // Pre-fill with template schema if available
                          if (template.schema_json || template.schema_data) {
                            const schema = template.schema_json || template.schema_data;
                            const example = {};
                            if (schema.properties) {
                              Object.keys(schema.properties).forEach(key => {
                                example[key] = '';
                              });
                            }
                            setCredentialData(JSON.stringify(example, null, 2));
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-[color:var(--text)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all"
                    >
                      <option value="">No template (manual entry)</option>
                      {templates.filter(t => t.is_active).map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} - {template.vc_type}
                        </option>
                      ))}
                    </select>
                    {selectedTemplate && (
                      <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs text-blue-400">
                          ✓ Using template: <span className="font-semibold">{selectedTemplate.name}</span>
                          {selectedTemplate.description && ` - ${selectedTemplate.description}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Recipient DID */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                    Recipient DID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientDID}
                    onChange={(e) => setRecipientDID(e.target.value)}
                    placeholder="did:key:z6Mk..."
                    className="w-full px-4 py-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    The DID of the credential recipient
                  </p>
                </div>

                {/* Credential Type */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                    Credential Type <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={credentialType}
                    onChange={(e) => setCredentialType(e.target.value)}
                    placeholder="UniversityDegree"
                    className="w-full px-4 py-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    Examples: UniversityDegree, DriversLicense, EmployeeID
                  </p>
                </div>

                {/* Credential Data */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                    Credential Data (JSON)
                  </label>
                  <textarea
                    value={credentialData}
                    onChange={(e) => setCredentialData(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all font-mono text-sm"
                    placeholder='{\n  "name": "John Doe",\n  "degree": "Bachelor of Science",\n  "graduationDate": "2024-05-15"\n}'
                  />
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    Additional data to include in credentialSubject
                  </p>
                </div>

                {/* Error/Success Messages */}
                {issueError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                    <p className="text-sm text-rose-400">{issueError}</p>
                  </div>
                )}

                {issueSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-sm text-emerald-400">{issueSuccess}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={issuing}
                  className="w-full py-3 bg-[color:var(--brand)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {issuing ? 'Issuing...' : 'Issue Credential'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'issued' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--text)]">Issued Credentials</h2>
              <button
                onClick={loadIssuedCredentials}
                disabled={loadingVCs}
                className="px-4 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] hover:bg-[color:var(--panel-2)] transition-colors text-sm disabled:opacity-50"
              >
                {loadingVCs ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loadingVCs ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--brand)] mx-auto mb-4"></div>
                <p className="text-[color:var(--muted)]">Loading credentials...</p>
              </div>
            ) : issuedVCs.length === 0 ? (
              <div className="text-center py-12 bg-[color:var(--panel)] rounded-xl border border-[color:var(--border)]">
                <p className="text-[color:var(--muted)]">No credentials issued yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {issuedVCs.map((vc) => (
                  <div
                    key={vc.vc_id}
                    className="bg-[color:var(--panel)] rounded-xl border border-[color:var(--border)] p-6 hover:border-[color:var(--brand)] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-[color:var(--text)]">
                            {vc.credential_type || 'Unknown Type'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                            Valid
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-[color:var(--muted)]">
                            <span className="font-medium">ID:</span> {vc.vc_id}
                          </p>
                          <p className="text-[color:var(--muted)]">
                            <span className="font-medium">Subject:</span> {vc.subject_did || 'N/A'}
                          </p>
                          <p className="text-[color:var(--muted)]">
                            <span className="font-medium">Issued:</span>{' '}
                            {new Date(vc.created_at * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] hover:bg-[color:var(--panel)] transition-colors text-sm">
                          View
                        </button>
                        <button className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm">
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

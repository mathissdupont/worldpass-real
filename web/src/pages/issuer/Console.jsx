// Modern Issuer Console - Clean & Responsive
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getIssuerProfile,
  issueCredential,
  getIssuedCredentials,
  listIssuerTemplates,
} from '../../lib/api';

export default function IssuerConsole() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('issue'); // 'issue' | 'issued'

  // Issue form
  const [recipientDID, setRecipientDID] = useState('');
  const [credentialType, setCredentialType] = useState('');
  // Dinamik credential fields
  const [credentialFields, setCredentialFields] = useState([
    { key: '', value: '', type: 'text', required: false },
  ]);
  // JSON string for backend
  const [credentialData, setCredentialData] = useState('{}');
  // Autocomplete için field isimleri
  const [fieldSuggestions, setFieldSuggestions] = useState([]);
  // Credential type dropdown için örnekler
  const credentialTypeOptions = [
    'UniversityDegree',
    'DriversLicense',
    'EmployeeID',
    'MembershipCard',
    'StudentCard',
    'CustomType',
  ];
  // JSON kopyalama için ref
  const jsonPreviewRef = useRef(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function handleIssueCredential(e) {
    e.preventDefault();
    setIssueError('');
    setIssueSuccess('');

    if (!recipientDID.trim()) {
      setIssueError('Recipient DID is required');
      return;
    }
    if (!credentialType.trim()) {
      setIssueError('Credential type is required');
      return;
    }

    // credentialFields'i objeye çevir
    const parsedData = {};
    for (const field of credentialFields) {
      if (field.key) {
        // Tipine göre dönüştür
        let val = field.value;
        if (field.type === 'number') {
          val = val === '' ? '' : Number(val);
        } else if (field.type === 'date') {
          val = val;
        }
        parsedData[field.key] = val;
      }
    }

    // issuer DID'i profilden çek
    const issuerDid =
      profile?.issuer_did || profile?.did || profile?.issuer?.did || null;

    if (!issuerDid) {
      setIssueError('Issuer DID not found in profile');
      return;
    }

    try {
      setIssuing(true);

      const vc = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', credentialType],
        issuer: issuerDid,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: recipientDID,
          ...parsedData,
        },
        jti: `vc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const token = localStorage.getItem('issuer_token');
      await issueCredential(null, vc, token, selectedTemplate?.id || null);

      setIssueSuccess('Credential issued successfully!');
      setRecipientDID('');
      setCredentialType('');
      setCredentialFields([{ key: '', value: '', type: 'text', required: false }]);
      setCredentialData('{}');
      setSelectedTemplate(null);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--brand)] mx-auto mb-4" />
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
              <h1 className="text-2xl font-bold text-[color:var(--text)]">
                Issuer Console
              </h1>
              <p className="text-sm text-[color:var(--muted)] mt-1">
                {profile.org_name}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-xs text-emerald-400 font-medium">
                  Active
                </span>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'issue' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-[color:var(--panel)] rounded-xl border border-[color:var(--border)] p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-[color:var(--text)] mb-6">
                Issue New Credential
              </h2>

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
                        const id = e.target.value;
                        const template = templates.find((t) => String(t.id) === id);
                        setSelectedTemplate(template || null);
                        if (template) {
                          setCredentialType(template.vc_type);
                          // Alanları template'e göre doldur
                          const schema = template.schema_json || template.schema_data;
                          if (schema && schema.properties) {
                            const newFields = Object.keys(schema.properties).map((key) => {
                              const prop = schema.properties[key];
                              return {
                                key,
                                value: prop.example || '',
                                type: prop.type === 'number' ? 'number' : prop.format === 'date' ? 'date' : 'text',
                                required: schema.required?.includes(key) || false,
                              };
                            });
                            setCredentialFields(newFields.length ? newFields : [{ key: '', value: '', type: 'text', required: false }]);
                            setFieldSuggestions(Object.keys(schema.properties));
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-[color:var(--text)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all"
                    >
                      <option value="">No template (manual entry)</option>
                      {templates
                        .filter((t) => t.is_active)
                        .map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} - {template.vc_type}
                          </option>
                        ))}
                    </select>
                    {selectedTemplate && (
                      <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs text-blue-400">
                          ✓ Using template:{' '}
                          <span className="font-semibold">
                            {selectedTemplate.name}
                          </span>
                          {selectedTemplate.description &&
                            ` - ${selectedTemplate.description}`}
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
                    className={`w-full px-4 py-3 bg-[color:var(--panel-2)] border rounded-lg text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all ${!recipientDID ? 'border-rose-500' : 'border-[color:var(--border)]'}`}
                  />
                  {!recipientDID && <p className="text-xs text-rose-500 mt-1">Recipient DID is required</p>}
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    The DID of the credential recipient
                  </p>
                </div>

                {/* Credential Type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                    Credential Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={credentialType}
                    onChange={e => setCredentialType(e.target.value)}
                    className={`w-full px-4 py-3 bg-[color:var(--panel-2)] border rounded-lg text-[color:var(--text)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all ${!credentialType ? 'border-rose-500' : 'border-[color:var(--border)]'}`}
                  >
                    <option value="">Select type...</option>
                    {credentialTypeOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {!credentialType && <p className="text-xs text-rose-500 mt-1">Credential type is required</p>}
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    Examples: UniversityDegree, DriversLicense, EmployeeID
                  </p>
                </div>

                {/* Dinamik Credential Fields - tip, autocomplete, required, validasyon */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                    Credential Fields
                  </label>
                  {credentialFields.map((field, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center">
                      <input
                        type="text"
                        placeholder="Field Name"
                        value={field.key}
                        list="field-suggestions"
                        onChange={e => {
                          const newFields = [...credentialFields];
                          newFields[idx].key = e.target.value;
                          setCredentialFields(newFields);
                        }}
                        className={`flex-1 px-3 py-2 border rounded-lg bg-[color:var(--panel-2)] text-[color:var(--text)] ${field.required && !field.value ? 'border-rose-500' : 'border-[color:var(--border)]'}`}
                        autoComplete="off"
                      />
                      <datalist id="field-suggestions">
                        {fieldSuggestions.map(s => <option key={s} value={s} />)}
                      </datalist>
                      <input
                        type={field.type || 'text'}
                        placeholder="Field Value"
                        value={field.value}
                        onChange={e => {
                          const newFields = [...credentialFields];
                          newFields[idx].value = e.target.value;
                          setCredentialFields(newFields);
                        }}
                        className={`flex-1 px-3 py-2 border rounded-lg bg-[color:var(--panel-2)] text-[color:var(--text)] ${field.required && !field.value ? 'border-rose-500' : 'border-[color:var(--border)]'}`}
                        autoComplete="off"
                      />
                      <select
                        value={field.type}
                        onChange={e => {
                          const newFields = [...credentialFields];
                          newFields[idx].type = e.target.value;
                          setCredentialFields(newFields);
                        }}
                        className="px-2 py-2 border rounded-lg bg-[color:var(--panel-2)] text-[color:var(--text)] border-[color:var(--border)] text-xs"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => {
                            const newFields = [...credentialFields];
                            newFields[idx].required = e.target.checked;
                            setCredentialFields(newFields);
                          }}
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = credentialFields.filter((_, i) => i !== idx);
                          setCredentialFields(newFields.length ? newFields : [{ key: '', value: '', type: 'text', required: false }]);
                        }}
                        className="px-2 py-1 text-xs bg-rose-500 text-white rounded-lg"
                        title="Remove field"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCredentialFields([...credentialFields, { key: '', value: '', type: 'text', required: false }])}
                    className="mt-2 px-3 py-2 bg-[color:var(--brand)] text-white rounded-lg text-sm"
                  >
                    + Add Field
                  </button>
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    Her alan credentialSubject'a otomatik eklenir. Alan tipi ve zorunluluğu seçebilirsin.
                  </p>
                  {/* JSON preview + kopyala butonu */}
                  <div className="flex items-center gap-2 mt-2">
                    <pre ref={jsonPreviewRef} className="bg-[color:var(--panel-2)] p-2 rounded text-xs font-mono border border-[color:var(--border)] overflow-x-auto flex-1">
                      {JSON.stringify(
                        credentialFields.reduce((acc, cur) => {
                          if (cur.key) acc[cur.key] = cur.value;
                          return acc;
                        }, {}),
                        null,
                        2
                      )}
                    </pre>
                    <button
                      type="button"
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                      onClick={() => {
                        if (jsonPreviewRef.current) {
                          const text = jsonPreviewRef.current.textContent;
                          navigator.clipboard.writeText(text);
                        }
                      }}
                    >
                      JSON Kopyala
                    </button>
                  </div>
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
              <h2 className="text-xl font-semibold text-[color:var(--text)]">
                Issued Credentials
              </h2>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--brand)] mx-auto mb-4" />
                <p className="text-[color:var(--muted)]">
                  Loading credentials...
                </p>
              </div>
            ) : issuedVCs.length === 0 ? (
              <div className="text-center py-12 bg-[color:var(--panel)] rounded-xl border border-[color:var(--border)]">
                <p className="text-[color:var(--muted)]">
                  No credentials issued yet
                </p>
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
                            <span className="font-medium">Subject:</span>{' '}
                            {vc.subject_did || 'N/A'}
                          </p>
                          <p className="text-[color:var(--muted)]">
                            <span className="font-medium">Issued:</span>{' '}
                            {new Date(
                              vc.created_at * 1000,
                            ).toLocaleDateString()}
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


function Input({ id, name, type="text", value, onChange, placeholder, error, autoComplete }) {
  return (
    <input
      id={id}
      name={name || id}
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={[
        "w-full px-3 py-2 rounded-xl",
        "bg-[color:var(--panel)] text-[color:var(--text)] border outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]",
        error ? "border-rose-300" : "border-[color:var(--border)]"
      ].join(" ")}
      aria-invalid={!!error}
    />
  );
}

function TextArea({ id, name, rows=4, value, onChange, error, disabled, onKeyDown }) {
  return (
    <textarea
      id={id}
      name={name || id}
      rows={rows}
      value={value ?? ""}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className={[
        "w-full px-3 py-2 rounded-xl font-mono text-xs",
        "bg-[color:var(--panel)] text-[color:var(--text)] border outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        error ? "border-rose-300" : "border-[color:var(--border)]"
      ].join(" ")}
      aria-invalid={!!error}
    />
  );
}

function Field({ f, value, onChange, error }) {
  const fieldId = `issuer-field-${f.id}`;
  if (f.type === "textarea") {
    return (
      <div className="col-span-2">
        <Label text={f.label} required={f.required} htmlFor={fieldId}/>
        <TextArea id={fieldId} name={f.id} rows={5} value={value} onChange={e=>onChange(e.target.value)} error={error}/>
      </div>
    );
  }
  if (f.type === "select") {
    return (
      <div>
        <Label text={f.label} required={f.required} htmlFor={fieldId}/>
        <Select id={fieldId} name={f.id} value={value} onChange={e=>onChange(e.target.value)} options={Array.isArray(f.values)?f.values:[]} error={error}/>
      </div>
    );
  }
  const mapType = (t)=> (t==="number"||t==="date") ? t : "text";
  return (
    <div>
      <Label text={f.label} required={f.required} htmlFor={fieldId}/>
      <Input id={fieldId} name={f.id} type={mapType(f.type)} value={value} onChange={e=>onChange(e.target.value)} placeholder={f.id} error={error}/>
    </div>
  );
}

/* ---------- Main ---------- */
export default function IssuerConsole(){
  const navigate = useNavigate();
  const { identity } = useIdentity();
  
  // Auth & Profile
  const [issuer, setIssuer] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }
    
    getIssuerProfile()
      .then(resp => {
        setIssuer(resp.issuer);
        setLoadingProfile(false);
        
        // Load templates
        setLoadingTemplates(true);
        return listIssuerTemplates();
      })
      .then(resp => {
        setAvailableTemplates(resp.templates || []);
        setLoadingTemplates(false);
      })
      .catch(err => {
        console.error(err);
        if (err.message.includes('authenticated')) {
          localStorage.removeItem("issuer_token");
          navigate("/issuer/login");
        } else {
          setLoadingTemplates(false);
        }
      });
  }, [navigate]);

  const handleRotateKey = async () => {
    if (!confirm("API anahtarını değiştirmek istediğinize emin misiniz? Eski anahtar geçersiz olacak.")) return;
    try {
      const resp = await rotateIssuerApiKey();
      setApiKey(resp.api_key);
      alert("Yeni API Anahtarı oluşturuldu. Lütfen güvenli bir yere kaydedin, tekrar gösterilmeyecek.");
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("issuer_token");
    localStorage.removeItem("issuer_info");
    navigate("/issuer/login");
  };

  // org (Legacy local storage support - might need to migrate to backend)
  // For now, we use the fetched issuer as the "org"
  const org = useMemo(() => issuer ? {
    id: issuer.id,
    name: issuer.name,
    did: issuer.did,
    domain: issuer.domain,
    templates: {} // TODO: Fetch templates from backend
  } : null, [issuer]);

  // modlar
  const [mode, setMode] = useState("wpml"); // "wpml" | "wpt" | "manual"
  const [wptParsed, setWptParsed] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  
  // template selection (issuer_templates integration)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // template meta
  const [tplKey,setTplKey] = useState("studentCard");
  const [tplName,setTplName] = useState("StudentCard");

  // sadece advanced’te
  const [tplBody,setTplBody] = useState(JSON.stringify({
    "@context":["https://www.w3.org/2018/credentials/v1"],
    "type":["VerifiableCredential","StudentCard"],
    "issuer":"{{org.did}}",
    "credentialSubject": { "id":"{{subjectDid}}","name":"{{name}}" }
  },null,2));
  const [tplErr,setTplErr] = useState("");

  // presetler
  const PRESETS = useMemo(()=>listPresetTexts() || [],[]);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(-1);
  const [presetFields, setPresetFields] = useState([]); // [{id,type,label,required,values?}]
  const [fieldValues, setFieldValues] = useState({});   // id->value

  // preview & output
  const [preview,setPreview] = useState("");
  const [out,setOut] = useState("");
  const [flash, setFlash] = useState(null); // {tone,text}
  const [recipientId, setRecipientId] = useState(null);

  const templateInputIds = useMemo(() => ({
    tplKey: "issuer-template-key",
    tplName: "issuer-template-name",
    templateSelector: "issuer-template-selector",
    tplBody: "issuer-template-body",
    presetSelector: "issuer-preset-selector"
  }), []);

  // helpers
  const copyToClipboard = (txt) => navigator.clipboard.writeText(txt).catch(()=>{});

  const requiredMissing = useMemo(()=>{
    if (mode === "manual") return [];
    return (presetFields||[]).filter(f => f.required && !String(fieldValues[f.id]||"").trim());
  }, [presetFields, fieldValues, mode]);

  const canIssue = useMemo(()=>{
    if (!org || !identity?.sk_b64u) return false;
    if (mode !== "manual") return requiredMissing.length === 0;
    return true;
  },[org, identity?.sk_b64u, mode, requiredMissing.length]);

  const updateField = (id, val)=> setFieldValues(s=>({ ...s, [id]: val }));

  const loadPreset = (idx)=>{
    setSelectedPresetIdx(idx);
    setWptParsed(null);
    setMode(idx >= 0 ? "wpml" : "manual");

    setPresetFields([]);
    setFieldValues({});
    if (idx < 0) return;

    try{
      const txt = PRESETS[idx];
      if (!txt) throw new Error("Preset bulunamadı.");
      const parsed = parseWPML(txt);
      setTplKey(parsed.meta.key || "template");
      setTplName(parsed.meta.name || "Template");
      setPresetFields(parsed.fields || []);
      const fv = {};
      (parsed.fields||[]).forEach(f => { fv[f.id] = ""; });
      setFieldValues(fv);
      setTplErr("");
      setPreview("");
      setFlash({tone:"ok", text:`Hazır taslak yüklendi: ${parsed.meta.name || `#${idx+1}`}`});
      setTimeout(()=>setFlash(null), 1500);
    }catch(e){
      setTplErr(e.message || "Preset parse failed.");
    }
  };

  async function onUploadWPT(e){
    const f = e.target.files?.[0];
    if(!f) return;
    try{
      const raw = await f.text();
      const txt = normalizeLite2(raw); // kısa DSL’yi @-formatına çevir
      const parsed = parseWPT(txt);

      setMode("wpt");
      setWptParsed(parsed);

      setTplKey(parsed.meta.key || "template");
      setTplName(parsed.meta.name || "Template");

      const fields = parsed.fields || [];
      setPresetFields(fields);
      const fv = {};
      fields.forEach(x => fv[x.id] = parsed.defaults?.[x.id] ?? "");
      if (fv.subjectDid === undefined) fv.subjectDid = "";
      setFieldValues(fv);

      setSelectedPresetIdx(-1);
      setTplErr(""); setPreview("");
      setFlash({tone:"ok", text:`WPT taslağı yüklendi: ${parsed.meta.name || "Template"}`});
      setTimeout(()=>setFlash(null), 1500);
    }catch(err){
      setTplErr(err.message || "WPT parse failed");
    } finally {
      e.target.value = "";
    }
  }

  const buildBodyFromMode = ()=>{
    if (mode === "wpt" && wptParsed) {
      return renderWPT(wptParsed, { org, ...fieldValues });
    }
    if (mode === "wpml" && selectedPresetIdx >= 0) {
      const txt = PRESETS[selectedPresetIdx];
      const parsed = parseWPML(txt);
      return renderWPML(parsed, { org, ...fieldValues });
    }
    const p = tryParse(tplBody);        // manual (advanced)
    if (!p.ok) throw new Error(p.error);
    return p.value;
  };

  const doPreview = ()=>{
    try{
      setTplErr(""); setPreview("");
      if (!org) throw new Error("Önce bir kurum seç.");

      let body = buildBodyFromMode();
      const issuance = new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
      const jti = `vc-${Math.floor(Date.now()/1000)}-${Math.random().toString(36).slice(2,7)}`;

      body = { ...body, issuer: org.did, issuanceDate: issuance, jti };

      setPreview(JSON.stringify(body,null,2));
    }catch(e){
      setTplErr(e.message || String(e));
    }
  };

  const buildSignedCredential = useCallback(() => {
    if (!org) throw new Error("Kurum seçili değil.");
    if (!identity?.sk_b64u) throw new Error("Kurumsal imza anahtarı bulunamadı.");

    const src = buildBodyFromMode();
    const issuance = new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
    const jti = `vc-${Math.floor(Date.now()/1000)}-${Math.random().toString(36).slice(2,7)}`;
    const vcBody = { ...src, issuer: org.did, issuanceDate: issuance, jti };

    const subjectDid = (vcBody?.credentialSubject?.id || "").trim();
    if (!subjectDid) throw new Error("Subject DID alanı boş bırakılamaz.");
    if (!subjectDid.startsWith("did:")) throw new Error("Subject DID formatı geçersiz (did: ile başlamalı).");

    const header = { alg:"EdDSA", typ:"JWT" };
    const msg = `${b64uJson(header)}.${b64uJson(vcBody)}`;
    const skBytes = b64uToBytes(identity.sk_b64u);
    const sigBytes = ed25519Sign(skBytes, enc.encode(msg));
    const signed = {
      ...vcBody,
      proof:{
        type:"Ed25519Signature2020",
        created: issuance,
        proofPurpose:"assertionMethod",
        verificationMethod:`${org.did}#key-1`,
        jws: b64u(sigBytes),
        issuer_pk_b64u: identity.pk_b64u
      }
    };
    return { signed, jti };
  }, [buildBodyFromMode, identity, org]);

  const issue = useCallback(async () => {
    try {
      setTplErr("");
      setOut("");
      setRecipientId(null);
      setFlash(null);
      const { signed } = buildSignedCredential();
      const token = localStorage.getItem("issuer_token");
      if (!token) throw new Error("Issuer token bulunamadı. Tekrar giriş yap.");

      const response = await issueCredential(null, signed, token, selectedTemplateId);

      const pretty = JSON.stringify(signed,null,2);
      setOut(pretty);
      const newRecipientId = response?.recipient_id || null;
      setRecipientId(newRecipientId);

      const successMessage = newRecipientId
        ? t('org_console.credential_issued_success', { recipient_id: newRecipientId })
        : t('org_console.credential_issued_simple');
      setFlash({tone:"ok", text: successMessage});
      setTimeout(()=>setFlash(null), 5000);
    } catch(e) {
      setTplErr(e.message || String(e));
    }
  }, [buildSignedCredential, selectedTemplateId]);

  const saveTpl = ()=>{
    // TODO: Implement backend save
    alert("Backend template saving not implemented yet for issuers.");
  };

  // textarea kısayolları: Ctrl+S kaydet / Ctrl+Enter preview
  const onTplKeyDown = useCallback((e)=>{
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){
      e.preventDefault(); if (mode==="manual") saveTpl(); else doPreview();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter"){
      e.preventDefault(); doPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tplBody, org, tplKey, tplName]);

  // modal ESC ile kapansın
  useEffect(()=>{
    if(!editorOpen) return;
    const onEsc = (e)=>{ if(e.key==="Escape") setEditorOpen(false); };
    window.addEventListener("keydown", onEsc);
    return ()=> window.removeEventListener("keydown", onEsc);
  },[editorOpen]);

  if (loadingProfile) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER / PROFILE */}
      <div className="bg-white dark:bg-[color:var(--panel)] rounded-2xl border border-[color:var(--border)] p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[color:var(--text)]">{issuer.name}</h1>
          <div className="text-xs md:text-sm text-[color:var(--muted)] flex flex-wrap items-center gap-2 md:gap-3 mt-1">
            <span>{issuer.domain}</span>
            <span className="w-1 h-1 rounded-full bg-[color:var(--border)]"></span>
            <span className="break-all">{issuer.email}</span>
            <span className="w-1 h-1 rounded-full bg-[color:var(--border)]"></span>
            <span className={issuer.status === "approved" ? "text-emerald-600" : "text-amber-600"}>
              {issuer.status === "approved" ? "Onaylı" : "Beklemede"}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleRotateKey}
            className="px-4 py-2 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--panel-2)] text-sm font-medium text-[color:var(--text)] transition-colors"
          >
            API Anahtarı Oluştur
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-[color:var(--panel-2)] hover:bg-[color:var(--panel-3)] text-sm font-medium text-[color:var(--text)] transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </div>

      {apiKey && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <h3 className="text-emerald-800 dark:text-emerald-300 font-medium mb-2">Yeni API Anahtarınız</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <code className="flex-1 bg-white dark:bg-black p-3 rounded border border-emerald-200 dark:border-emerald-800 font-mono text-xs sm:text-sm break-all text-[color:var(--text)]">
              {apiKey}
            </code>
            <button
              onClick={() => copyToClipboard(apiKey)}
              className="px-3 py-3 rounded bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-700 font-medium transition-colors"
            >
              Kopyala
            </button>
          </div>
          <p className="text-xs text-emerald-700 mt-2">
            Bu anahtarı güvenli bir yerde saklayın. Sayfayı yenilediğinizde kaybolacaktır.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* LEFT */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 md:p-6 shadow-sm relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-base md:text-lg font-semibold text-[color:var(--text)]">{t('org_console.title')}</h2>
            {flash && <Pill tone={flash.tone}>{flash.text}</Pill>}
          </div>

          {/* TEMPLATE SOURCE */}
          <div className="mt-4 md:mt-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm md:text-base font-semibold text-[color:var(--text)]">{t('org_console.template_format_label')}</h3>
              <Badge tone="info">{mode==="wpt" ? "WPT" : mode==="wpml" ? "WPML" : "JSON"}</Badge>
            </div>
            <p className="text-xs text-[color:var(--muted)] mt-1">{t('org_console.template_format_desc')}</p>

            {/* meta + template selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div>
                <Label htmlFor={templateInputIds.tplKey} text={t('org_console.template_key')}/>
                <Input id={templateInputIds.tplKey} name="template_key" value={tplKey} onChange={e=>setTplKey(e.target.value)} autoComplete="off" />
              </div>
              <div>
                <Label htmlFor={templateInputIds.tplName} text={t('org_console.template_name')}/>
                <Input id={templateInputIds.tplName} name="template_name" value={tplName} onChange={e=>setTplName(e.target.value)} autoComplete="off" />
              </div>
            </div>
            
            {/* Template Selector */}
            {availableTemplates.length > 0 && (
              <div className="mt-2">
                <Label htmlFor={templateInputIds.templateSelector} text="Select Template (Optional)" />
                <Select 
                  id={templateInputIds.templateSelector}
                  name="issuer_template_id"
                  value={selectedTemplateId || ""} 
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedTemplateId(val ? parseInt(val) : null);
                    // Optionally load template schema into tplBody
                    if (val) {
                      const tpl = availableTemplates.find(t => t.id === parseInt(val));
                      if (tpl && tpl.schema_json) {
                        try {
                          const schema = JSON.parse(tpl.schema_json);
                          setTplBody(JSON.stringify(schema, null, 2));
                          setTplName(tpl.name);
                          setMode("manual");
                        } catch (e) {
                          console.error("Failed to parse template schema:", e);
                        }
                      }
                    }
                  }}
                  options={availableTemplates.map(t => ({ value: t.id, label: t.name }))}
                  placeholder="No template (manual mode)"
                />
              </div>
            )}
            {loadingTemplates && <p className="text-xs text-[color:var(--muted)] mt-2">Loading templates...</p>}

            {/* toolbar */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <button onClick={()=>setEditorOpen(true)} className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm text-[color:var(--text)] transition-colors">{t('org_console.design_in_editor')}</button>

              <label className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer text-center text-sm text-[color:var(--text)] transition-colors">
                {t('org_console.load_wpt')}
                <input type="file" accept=".wpt,text/plain" onChange={onUploadWPT} className="hidden" />
              </label>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]">
                <span className="text-sm text-[color:var(--text)]">{t('org_console.advanced_json')}</span>
                <button
                  onClick={()=>setShowAdvanced(v=>!v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${showAdvanced?"bg-[color:var(--brand)]":"bg-[color:var(--border)]"}`}
                  aria-label="Advanced JSON toggle"
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${showAdvanced?"translate-x-5":"translate-x-1"}`} />
                </button>
              </div>
            </div>

            {/* advanced JSON editor */}
            {showAdvanced && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={templateInputIds.tplBody} text={selectedPresetIdx>=0 ? "Hazır taslak gövdesi (salt-okunur)" : "Taslak içeriği (JSON)"} />
                  <div className="flex items-center gap-2">
                    {preview && (
                      <>
                        <button
                          onClick={()=>copyToClipboard(preview)}
                          className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                        >
                          Önizlemeyi Kopyala
                        </button>
                        <button
                          onClick={()=>{
                            const blob = new Blob([preview], {type:"application/json"});
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = `preview-${tplKey||"vc"}.wpvc`;
                            a.click();
                            URL.revokeObjectURL(a.href);
                          }}
                          className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                        >
                          Önizlemeyi İndir
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <TextArea
                  id={templateInputIds.tplBody}
                  name="template_body"
                  rows={12}
                  value={tplBody}
                  onChange={e=>setTplBody(e.target.value)}
                  error={!!tplErr}
                  disabled={mode !== "manual"}
                  onKeyDown={onTplKeyDown}
                />
                {tplErr && <div className="mt-2"><Pill tone="err">{tplErr}</Pill></div>}

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPresetIdx<0
                    ? (<>
                        <button onClick={saveTpl} className="px-3 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90">Taslağı Kaydet (Ctrl+S)</button>
                        <button onClick={doPreview} className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]">Önizleme (Ctrl+Enter)</button>
                      </>)
                    : (<button onClick={doPreview} className="px-3 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90">Önizleme</button>)
                  }
                </div>

                {preview && (
                  <div className="mt-3">
                    <div className="text-sm text-[color:var(--text)] mb-1">Önizleme (salt-okunur)</div>
                    <pre className="text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded p-2 max-h-64 overflow-auto">{preview}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRESET & WPT SEÇİMİ */}
          <div className="mt-6">
            <Label htmlFor={templateInputIds.presetSelector} text="Hazır Taslak (WPML)"/>
            <div className="relative">
              <select
                id={templateInputIds.presetSelector}
                name="preset_template"
                value={selectedPresetIdx}
                onChange={e=>loadPreset(Number(e.target.value))}
                className="w-full appearance-none px-3 py-2 rounded-xl bg-[color:var(--panel)] text-[color:var(--text)] border border-[color:var(--border)] focus:ring-2 focus:ring-[color:var(--brand-2)] outline-none">
                <option value={-1}>— Elle JSON yaz —</option>
                {PRESETS.map((_,i)=> <option key={i} value={i}>Hazır Taslak #{i+1}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <p className="text-xs text-[color:var(--muted)] mt-1">Hazır taslak veya WPT yüklersen sağda doldurulabilir form otomatik oluşur.</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-0 shadow-sm flex flex-col">
          {/* sticky header */}
          <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-[color:var(--border)] bg-[color:var(--panel)]/95 backdrop-blur">
            <div>
              <h3 className="text-sm md:text-base font-semibold text-[color:var(--text)]">Sertifika Oluştur</h3>
              <div className="text-xs text-[color:var(--muted)] mt-0.5">
                Kaynak: {mode==="wpt" && wptParsed ? `WPT – ${wptParsed.meta.name}` :
                         mode==="wpml" && selectedPresetIdx>=0 ? `Hazır Taslak #${selectedPresetIdx+1}` :
                         "Elle yazılmış JSON"}
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                disabled={!canIssue}
                onClick={issue}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 hover:opacity-90 text-sm transition-opacity"
                title={canIssue ? t('org_console.issue_and_send') : "Eksik alanlar veya imza anahtarı yok"}
              >
                {t('org_console.issue_and_send')}
              </button>
            </div>
          </div>
          <p className="px-4 md:px-6 text-xs text-[color:var(--muted)] pb-2">{t('org_console.auto_issue_hint')}</p>

          <div className="p-4 md:p-6">
            {mode !== "manual" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {presetFields.map(f=>{
                    const missing = f.required && !String(fieldValues[f.id]||"").trim();
                    return (
                      <Field
                        key={f.id}
                        f={f}
                        value={fieldValues[f.id]}
                        onChange={(v)=>updateField(f.id, v)}
                        error={missing}
                      />
                    );
                  })}
                </div>
                {requiredMissing.length>0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Pill tone="warn">Eksik alan(lar): {requiredMissing.map(f=>f.id).join(", ")}</Pill>
                    <span className="text-xs text-[color:var(--muted)]">Tüm * işaretli alanlar zorunlu.</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-[color:var(--muted)]">
                Elle JSON modunda form alanları otomatik oluşmaz. Hazır taslak seç veya .wpt yükle.
              </div>
            )}

            {out && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-[color:var(--text)]">Son oluşturulan sertifika</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={()=>navigator.clipboard.writeText(out)}
                      className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                    >
                      JSON’u Kopyala
                    </button>
                    <button
                      onClick={()=>{
                        const blob = new Blob([out], {type:"application/json"});
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `${(safeJ(out)?.jti) || "credential"}.wpvc`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                      className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                    >
                      JSON’u İndir
                    </button>
                  </div>
                </div>
                {recipientId && (
                  <div className="mt-3 p-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] text-sm text-[color:var(--text)]">
                    <div className="text-xs text-[color:var(--muted)] mb-2">{t('org_console.share_code_hint')}</div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{t('org_console.share_code_title')}</div>
                        <div className="font-mono text-base">{recipientId}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={()=>copyToClipboard(recipientId)}
                          className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                        >
                          {t('copy')}
                        </button>
                        <button
                          onClick={() => {
                            const shareUrl = `${window.location.origin}/api/recipient/${recipientId}`;
                            copyToClipboard(shareUrl);
                          }}
                          className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                        >
                          {t('org_console.copy_link')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded p-2 max-h-64 overflow-auto">{out}</pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={()=>{
                      const j = safeJ(out)?.jti;
                      if (j) {
                        const token = localStorage.getItem("issuer_token");
                        revokeCredential(null, j, token)
                          .then(() => {
                            setFlash({tone:"ok", text:"Sertifika iptal edildi."});
                            setTimeout(()=>setFlash(null), 1500);
                          })
                          .catch(e => alert(e.message));
                      }
                      else alert("Bu sertifikaya ait kod (jti) bulunamadı.");
                    }}
                    className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                  >
                    Son sertifikayı iptal et
                  </button>
                  <button
                    onClick={()=>{
                      const j = prompt("İptal etmek istediğin sertifikanın kodu (jti)?");
                      if(j) {
                        const token = localStorage.getItem("issuer_token");
                        revokeCredential(null, j, token)
                          .then(() => {
                            setFlash({tone:"ok", text:"Sertifika iptal edildi."});
                            setTimeout(()=>setFlash(null), 1500);
                          })
                          .catch(e => alert(e.message));
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                  >
                    Koda göre iptal et…
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* WPT Editor Modal */}
        {editorOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex">
            <div className="bg-[color:var(--panel)] border border-[color:var(--border)] w-[95vw] h-[90vh] m-auto rounded-2xl overflow-hidden relative shadow-2xl">
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-[color:var(--border)] bg-[color:var(--panel)]/95 backdrop-blur">
                <div className="text-sm font-medium text-[color:var(--text)]">WPT Editörü</div>
                <button onClick={()=>setEditorOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]">
                  Kapat (Esc)
                </button>
              </div>
              <div className="h-full pt-10">
                <WPTEditorPro />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------ local helpers ------ */
function safeJ(s){ try{ return JSON.parse(s); }catch{ return null; } }

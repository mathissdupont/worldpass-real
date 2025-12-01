import React, { useState, useEffect } from 'react';

const CredentialIssuerForm = () => {
  const [form, setForm] = useState({
    holderDid: '',
    credentialType: 'StudentCard',
    name: '',
    surname: '',
    email: '',
  });
  const [issuerProfile, setIssuerProfile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Get issuer token from localStorage
  const getIssuerToken = () => {
    return localStorage.getItem('issuer_token');
  };

  // Load issuer profile on mount to get issuer DID
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const token = getIssuerToken();
        if (!token) {
          setError('Not authenticated as issuer');
          return;
        }

        const response = await fetch('/api/issuer/profile', {
          method: 'GET',
          headers: { 'X-Token': token }
        });

        if (!response.ok) {
          throw new Error('Failed to load issuer profile');
        }

        const data = await response.json();
        setIssuerProfile(data.issuer);
      } catch (err) {
        setError(`Profile error: ${err.message}`);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const token = getIssuerToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      if (!issuerProfile?.did) {
        throw new Error('Issuer DID not found');
      }

      // Build VC payload according to backend expectations
      const vcPayload = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1"
        ],
        "type": ["VerifiableCredential", form.credentialType],
        "issuer": issuerProfile.did,
        "issuanceDate": new Date().toISOString(),
        "credentialSubject": {
          "id": form.holderDid,
          "name": form.name,
          "surname": form.surname,
          "email": form.email
        },
        "jti": `vc-${Date.now()}`
      };

      // Send to backend
      const response = await fetch('/api/issuer/issue', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Token': token
        },
        body: JSON.stringify({ vc: vcPayload }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Issue error:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 border rounded shadow-lg bg-white">
      <h2 className="text-2xl font-bold mb-6">Credential Ver</h2>
      
      {loadingProfile ? (
        <div className="text-center py-4">Yükleniyor...</div>
      ) : !issuerProfile ? (
        <div className="text-center py-4 text-red-600">
          Issuer profili yüklenemedi. Lütfen giriş yapın.
        </div>
      ) : (
        <>
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              <strong>Issuer:</strong> {issuerProfile.name} ({issuerProfile.email})
            </p>
            <p className="text-sm text-gray-600 break-all">
              <strong>DID:</strong> {issuerProfile.did}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Holder DID *</label>
              <input
                type="text"
                name="holderDid"
                placeholder="did:key:z..."
                value={form.holderDid}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Credential'ı alacak kişinin DID'si
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Credential Tipi *</label>
              <select
                name="credentialType"
                value={form.credentialType}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              >
                <option value="StudentCard">Student Card</option>
                <option value="UniversityDegree">University Degree</option>
                <option value="EmployeeID">Employee ID</option>
                <option value="DriversLicense">Driver's License</option>
                <option value="MembershipCard">Membership Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ad *</label>
              <input
                type="text"
                name="name"
                placeholder="Ad"
                value={form.name}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Soyad *</label>
              <input
                type="text"
                name="surname"
                placeholder="Soyad"
                value={form.surname}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">E-posta *</label>
              <input
                type="email"
                name="email"
                placeholder="E-posta"
                value={form.email}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || loadingProfile}
            >
              {loading ? 'Credential Veriliyor...' : 'Credential Ver'}
            </button>
          </form>

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-800 mb-2">✓ Başarılı!</h3>
              <div className="text-sm space-y-1">
                <p><strong>VC ID:</strong> {result.vc_id}</p>
                {result.recipient_id && (
                  <p><strong>Recipient ID:</strong> {result.recipient_id}</p>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    Credential Detayları
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(result.vc, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800 mb-2">✗ Hata</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CredentialIssuerForm;

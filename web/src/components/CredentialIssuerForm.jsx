import React, { useState } from 'react';

const CredentialIssuerForm = () => {
  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    // Gerekirse ek alanlar ekleyin
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Backend endpoint adresini güncelleyin
      const response = await fetch('/api/issue-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Sunucu hatası');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Credential Oluştur</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          placeholder="Ad"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          name="surname"
          placeholder="Soyad"
          value={form.surname}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="E-posta"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        {/* Gerekirse ek alanlar ekleyin */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Oluşturuluyor...' : 'Credential Ver'}
        </button>
      </form>
      {result && (
        <div className="mt-4 p-2 bg-green-100 rounded">
          <strong>Başarılı!</strong> Credential oluşturuldu.
        </div>
      )}
      {error && (
        <div className="mt-4 p-2 bg-red-100 rounded">
          <strong>Hata:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default CredentialIssuerForm;

# WorldPass Teknik Dokümantasyonu (MVP)

Bu doküman, WorldPass dijital kimlik platformunun MVP sürümüne ait teknik mimariyi, bileşenleri, veri akışlarını, API uç noktalarını, güvenlik varsayımlarını ve bilinen sınırlamaları açıklar. Amaç; projenin mevcut durumunu netleştirmek, geliştiricilerin sisteme hızla hakim olmasını sağlamak ve ilerleyen aşamalara referans oluşturmaktır.

WorldPass henüz erken aşamadadır. Bazı özellikler değişebilir, eksik olabilir veya kararsız çalışabilir.

---

## 1. Sistemin Amacı

WorldPass, kullanıcıların kimlik bilgilerini:

- Cihaz üzerinde güvenli şekilde saklamasını,
- Kurumlar tarafından verilen dijital kimlikleri almasını,
- QR veya benzeri yöntemlerle paylaşmasını,
- Doğrulanabilir kimlik sunumlarını basit bir API üzerinden iletmesini

sağlayan **kimlik merkezli bir platformdur**.

---

## 2. Genel Mimarî

WorldPass şu bileşenlerden oluşur:

Frontend (React Web / RN Mobile)
↓
Backend API (FastAPI)
↓
Verifiable Credential oluşturma / doğrulama
↓
Cihaz üzerinde yerel saklama (Wallet)

yaml
Kodu kopyala

İleri aşamada (**Stage-2 EAS**), bu yapıya opsiyonel bir zincir üstü attestation katmanı eklenir.

---

## 3. Bileşenler

### 3.1 Frontend

**Teknoloji:** React + TailwindCSS (web), React Native + Expo (mobil)

Görevler:

- Kayıt / giriş ekranları
- Issuer Console (kimlik verme arayüzü)
- Wallet (kimlik görüntüleme ve yerel saklama)
- QR tabanlı paylaşım ve doğrulama akışları

Veri Saklama (MVP):

- Web: `localStorage` / `IndexedDB`
- Mobil: `SecureStore`

---

### 3.2 Backend (FastAPI)

**Roller:**

- Auth (JWT)
- DID anahtar yönetimi
- Verifiable Credential üretme ve imzalama
- Credential doğrulama
- Meta veri saklama (SQLite)

**Not:** Backend, kimlik içeriğini saklamaz — sadece minimal meta veri tutar.

---

## 4. Veri Akışları

### 4.1 Kayıt / Giriş

[User] → /api/auth/register
[User] → /api/auth/login → JWT → Frontend local storage

shell
Kodu kopyala

### 4.2 Issuer → Credential Oluşturma

Issuer Console
↓ form doldur
↓ POST /api/issuer/issue
↓ Ed25519 imzalı VC JSON üret
↓ Wallet’a aktar / QR paylaş

shell
Kodu kopyala

### 4.3 Wallet → Credential Saklama

VC → AES ile cihazda şifreli saklama (MVP)
Backend → hiçbir kişisel veri saklamaz

shell
Kodu kopyala

### 4.4 Verifier → Doğrulama

Verifier → QR Tara → POST /api/verify
Backend → imza doğrulama + geçerlilik kontrolü
Result → valid / invalid

yaml
Kodu kopyala

---

## 5. API Referansı

### 5.1 Auth

| Method | Path | Body | Açıklama |
|--------|------|------|----------|
| POST | `/api/auth/register` | `{ email, password }` | Hesap oluşturur |
| POST | `/api/auth/login` | `{ email, password }` | JWT döner |
| POST | `/api/auth/change-password` | `{ oldPassword, newPassword }` | Parola günceller |

---

### 5.2 Issuer

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/issuer/register` | Issuer kaydı |
| POST | `/api/issuer/login` | Issuer oturumu |
| GET  | `/api/issuer/templates` | Şablon listesi |
| POST | `/api/issuer/templates` | Yeni VC şablonu |
| POST | `/api/issuer/issue` | VC oluştur ve imzala |
| GET  | `/api/issuer/credentials` | Verilen VC listesi |

---

### 5.3 Wallet

| Method | Path | Açıklama |
|--------|------|----------|
| GET  | `/api/wallet/credentials` | Wallet içerikleri |
| POST | `/api/wallet/import` | VC import |

---

### 5.4 Verify

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/verify` | VC doğrulama |
| POST | `/api/present` | Selective disclosure akışı |

---

## 6. Veri Modelleri

### 6.1 Verifiable Credential (MVP JSON)

```json
{
  "id": "vc:wp:uuid",
  "type": ["VerifiableCredential", "WorldPassCredential"],
  "issuer": "did:key:zIssuer",
  "subject": "did:key:zUser",
  "claims": { "name": "Ahmet Kaya", "studentId": "20251234" },
  "issuedAt": "2025-01-01T12:00:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "signature": "base58..."
  }
}
7. Güvenlik Modeli
Varsayımlar (MVP)
Kimlikler cihazda saklanır

Backend kimlik içeriklerini görmez

İmzalama anahtarları Ed25519’dur

JWT ile oturum doğrulaması yapılır

Eksikler
MFA yok

Key rotation yok

Revocation tam değil

DoS ve rate limiting ilkel

8. Bilinen Sınırlamalar

| Alan | Durum |
|------|-------|
| Veri saklama | Yerel, sınırlı |
| Offline doğrulama | Yok |
| Wallet kurtarma | Deneysel |
| Güvenlik denetimi | Yapılmadı |
| On-chain entegrasyon | Stage-2'de |

9. Stage-2 EAS Planı (Opsiyonel Modül)
Polygon Amoy test ağı

Attestation + revocation kayıtları zincirde tutulur

Issuance akışına aşağıdaki ek gelir:

bash
Kodu kopyala
VC → hash → EAS attestation → txHash DB kaydı
EAS, MVP’nin yerini almaz — güçlendirir.

10. Yol Haritası

| Aşama | İçerik |
|-------|--------|
| MVP | Issuer → Wallet → Verify akışı |
| Stage-2 | On-chain attestation (EAS) |
| Stage-3 | Multi-issuer trust registry |
| Stage-4 | Mobil wallet production |

11. Ek Belgeler
PRIVACY_POLICY.md

TERMS_OF_USE.md

SECURITY_MODEL_AND_LIMITATIONS.md


# WorldPass Özellikleri, Veri Yapısı ve JSON Kullanımı

## 1. Tamamlanan Feature'lar
- Dijital kimlik kartı (DID) oluşturma, yükleme, indirme
- Kimlik bilgisi (VC) oluşturma, indirme, paylaşma (QR/NFC/dosya)
- Kimlik doğrulama ve sunum (presentation)
- Hesap oluşturma, giriş, çıkış, profil yönetimi
- Şifreli veri saklama (AES-256 ile, keystore)
- Çoklu kimlik desteği (ehliyet, öğrenci kartı, üyelik vs.)
- Sunucu tarafında minimum meta veri tutma (credential ID, tip, zaman)
- Sertifika/credential verme ve doğrulama (issuer/verifier konsolu)
- Mobil ve web uygulaması, offline çalışma
- Hızlı paylaşım (QR kod, NFC, dosya)
- Tema ve bildirim yönetimi
- Admin ve kuruluş yönetimi (issuer register, admin konsolu)
- API ve backend ile entegrasyon (blockchain, ödeme, OAuth, distributed ledger)

## 2. Veri Yapısı
### Kimlik Verileri
- DID (Decentralized Identifier)
- Private key, public key
- Keystore dosyası: şifreli anahtarlar
- Profil bilgileri: ad, e-posta, avatar

### Credential/VC Verileri
- type: Kimlik türü (Öğrenci Kartı, Üyelik, KYC, vs.)
- subject: Kimlik sahibi (DID)
- issuer: Veren kuruluş (DID)
- jti: Unique ID
- validity: Geçerlilik tarihi
- body: Alanlar (ad, kurum, tarih, vs.)
- signature: İmza

### Presentation Verileri
- Paylaşılacak alanlar
- İmza
- Metadata

### Sunucu Tarafı
- Minimum meta veri: credential ID, tip, oluşturulma zamanı
- Transaction logları (şifreli)
- Kullanıcı verileri: ad, kurum, geçerlilik tarihi, DID, ödeme işlemleri (şifreli)
- Kullanım verileri (isteğe bağlı): ziyaret edilen sayfalar, hata logları, performans metrikleri

## 3. JSON Dosyalarında Tutulanlar
### Kimlik (Keystore) JSON
```json
{
  "did": "did:key:z...",
  "keys": {
    "private": "...",
    "public": "..."
  },
  "encrypted": true
}
```

### Credential/VC JSON
```json
{
  "type": ["VerifiableCredential", "StudentCard"],
  "subject": {
    "did": "did:key:z...",
    "name": "Ali Veli",
    "school": "Üniversite"
  },
  "issuer": "did:key:z...",
  "jti": "unique-id-123",
  "validity": "2026-12-31",
  "body": {
    "fields": {
      "department": "Bilgisayar Mühendisliği",
      "year": "4"
    }
  },
  "signature": "..."
}
```

### Presentation JSON
```json
{
  "presentation": {
    "verifiableCredential": [ ... ],
    "selectedFields": ["name", "school"],
    "signature": "..."
  },
  "meta": {
    "created": "2026-01-14",
    "challenge": "..."
  }
}
```

### WPT (Template) JSON
```json
{
  "template": "StudentCard",
  "fields": ["name", "school", "department", "year"],
  "body": {
    "department": "...",
    "year": "..."
  }
}
```

### Ayarlar ve Tema
```json
{
  "theme": "dark",
  "notifications": true
}
```

## 4. Güvenlik ve Gizlilik
- Tüm veriler cihazda ve sunucuda şifreli tutulur (AES-256, TLS)
- Kullanıcı hangi bilgiyi paylaşacağını seçer
- Veri silme ve hesap kapatma imkanı
- Veri paylaşımı yok, üçüncü taraflara aktarım yok
- Transaction logları ve backup verileri kullanıcı kontrolünde

## 5. Kullanım Verileri
- Ziyaret edilen sayfalar
- Hata logları
- Performans metrikleri
- Varsayılan olarak kapalı, analiz amaçlı kullanılabilir

## 6. Diğer Detaylar
- Mobil ve web uygulaması, offline çalışma desteği
- Blockchain entegrasyonu (backend)
- OAuth, ödeme, distributed ledger API'leri
- Admin ve kuruluş yönetimi

---
Daha fazla teknik detay veya dosya bazında örnek istersen belirt.

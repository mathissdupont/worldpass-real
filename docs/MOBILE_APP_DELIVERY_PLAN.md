# WorldPass Mobile — Uçtan Uca Teslim Planı

## 1. Amaç ve Başarı Kriterleri
- **Ana Amaç:** Web cüzdanındaki temel yetenekleri (DID yönetimi, VC saklama/ibraz, doğrulama) mobilde çevrimdışı dostu şekilde sunmak.
- **Başarı Kriterleri:**
  - Kullanıcı ilk açılışta onboarding → DID oluşturma veya keystore import akışlarını tamamlayabilmeli.
  - En az bir VC’yi saklayıp QR/link/NFC ile paylaşabilmeli ve doğrulama isteğine yanıt verebilmeli.
  - Tema (light/dark/system) ve güvenlik ayarları (biometrik, 2FA bağlama) uygulama genelinde çalışmalı.
  - Offline senaryoda mevcut VC’ler görüntülenebilmeli, QR üretimi internet olmadan da yapılabilmeli.

## 2. Kullanıcı Senaryoları (MVP)
1. **Onboarding & Güvenlik**
   - Giriş/Kayıt → MFA (opsiyonel) → DID oluştur veya mevcut keystore import et → keystore şifrele & yedekle.
2. **Wallet Yönetimi**
   - VC listesi: filtre, arama, durum rozetleri.
   - VC detay: JSON önizleme, güvenlik durumu, paylaş butonları.
   - Paylaşım: QR, link, dosya (.wpvc) ve paylaşım geçmişi.
3. **Sunum (Present) Akışı**
   - Verifier talebi QR/NFC okut → istenen alanları seç → Ed25519 imza → QR/link çıktı.
4. **Doğrulama (Verify) Akışı**
   - Bir VC veya sunumu tarayıp doğrulama sonucunu göster; offline doğrulama modu.
5. **Ayarlar & Profil**
   - Tema, dil, bildirim tercihleri, 2FA yönetimi, cihaz temizleme.
   - Keystore dışa aktarma, parola reset, cihaz yetkileri.

## 3. Mimari Temeller
- **Paylaşılan Tasarım Token’ları:** `shared/design-tokens.js` → RN + Web ortak renk/spacing.
- **Durum Katmanları:**
  - `ThemeContext`, `ToastContext`, `AuthContext`, `WalletContext`, `PresentationContext`.
  - Offline queue için `TaskQueue` helper (AsyncStorage tabanlı).
- **Navigasyon:** Bottom tabs (Wallet, Present, Verify, Settings) + Stack alt akışları.
- **Depolama:**
  - DID ve özel anahtarlar: `expo-secure-store` + PBKDF2.
  - VC cache + offline kuyruk: `AsyncStorage`.
- **Servisler:** API client (`/api/user/*`, `/api/status/*`, `/api/present/*`), Firebase push (ilerisi).

## 4. Adım Adım Yol Haritası
1. **Temel Kurulum (Foundations)**
   - Tasarım token’larını uygulamaya yay, tema/toast context, global navigation shell, hata izleme (Sentry opsiyonel).
2. **Kimlik & Onboarding**
   - DID oluştur/import, keystore backup/restore, QR gösterimi, keystore paylaşımı.
3. **Wallet & VC Özellikleri**
   - Liste/filtre, detay kartı, revocation, paylaşım kanalları, offline QR üretimi, VC import.
4. **Sunum Builder**
   - Verifier request parse, alan seçici, imzalama, QR/link çıktısı, geçmiş.
5. **Verify Araçları**
   - VC veya presentation doğrulama, offline kontrol, sonuç raporu ve paylaşım.
6. **Ayarlar & Güvenlik**
   - Tema/dil, 2FA bağlama/ayırma, biyometrik kilit, cihaz temizleme, log export.
7. **Ek Modüller (Opsiyonel)**
   - NFC entegrasyonu, ödemeler/demo işlemler, admin/issuer görüntüleme, push notifications.

Her adım bittiğinde: kod + dokümantasyon + manuel test check listesi + gerekirse ekran kayıtları.

### 4.1 Artımlı Feature Roadmap (1 haftalık iterasyonlar)
| Sprint | Amaç | Öne Çıkan Modüller | Çıkış Kriterleri |
| --- | --- | --- | --- |
| 0 (Hazırlık) | Ortak tasarım token’ları ve navigation shell’i oturtmak | Theme/Toast/Wallet context, Expo ayarları, QA check-list | Wallet ekranı yeni tema + context ile açılıyor, credential CRUD lokal çalışıyor |
| 1 | Kimlik onboarding’ini tamamlamak | DID oluştur/import ekranları, keystore backup, Settings → Identity alanı, QR gösterimi | Yeni kullanıcı DID yaratıp şifreli keystore’u kopyalayabiliyor, `linkDid` otomatik işliyor |
| 2 | Wallet deneyimini derinleştirmek | Liste filtreleri, issuer/tag chip’leri, status badge, revoke/refresh aksiyonları, VC import ekranı | En az bir filtre çalışıyor, revoke çağrısı backend’den 200 aldığında UI güncelleniyor |
| 3 | Present builder v1 | Verifier isteği okuma (QR/NFC placeholder), claim seçici wizard, imzalama + QR output, paylaşım geçmişi | Demo isteği okutulup seçili alanlarla imzalı sunum QR’ı üretilebiliyor |
| 4 | Verify araçlarını güçlendirmek | Offline doğrulama, request builder (manual), log export, scanner hata akışları | İnternet yokken önceden alınmış sunum doğrulanıyor, kullanıcıya detaylı sonuç ekranı gösteriliyor |
| 5 | Güvenlik & Ayarlar genişlemesi | 2FA ekranı, biometrik kilit zorunlu modu, dil seçimi, credential backup/export | Kullanıcı biometrik kilidi açmadan wallet içeriğini göremiyor, i18n seçimi AsyncStorage’da saklanıyor |
| 6 | NFC + Pay + Bildirimler | `expo-nfc` ile tap-to-present, payment demo tamamlama, push opt-in ayarları | NFC destekli cihazda isteği yaz/oku yapılabiliyor, payment ekranı gerçek veriyi çekiyor |

## 5. Gereksinimler & Bağımlılıklar
- React Native/Expo SDK 51+, Reanimated 3, React Navigation 6.
- `@noble/ed25519`, `expo-crypto`, `react-native-qrcode-svg`, `expo-sharing`, `expo-secure-store`, `expo-file-system`.
- Backend API’lerde gerekli endpoint’ler (profile, status, present, payments vb.) hazır olmalı.
- Firebase project (push, analytics) → konfigürasyon dosyaları `.env` veya `app.config.js` içinde.

## 6. Çıktılar
- Çalışan Expo projesi + EAS build (iOS + Android) beta iç dağıtımı.
- Yolculuk dökümü: onboarding → wallet → present/verify → settings ekran akış diyagramı.
- QA checklist + regression test listesi.

---
Bu dokümanı, her büyük modül tamamlandıkça güncelleyip ilerlemeyi takip edeceğiz.

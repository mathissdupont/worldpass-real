# WorldPass Mobile - Play Store Yükleme Rehberi

Bu rehber WorldPass mobil uygulamasını Google Play Store'a yüklemek için gerekli adımları içerir.

## Ön Hazırlık

### 1. Google Play Console Hesabı
- [Google Play Console](https://play.google.com/console) hesabınız olmalı
- 25 USD tek seferlik kayıt ücreti gerekli
- Developer account doğrulaması (1-2 gün sürebilir)

### 2. Expo Hesabı ve EAS CLI
```powershell
# EAS CLI'yi global olarak yükleyin
npm install -g eas-cli

# Expo hesabınızla giriş yapın
eas login
```

### 3. Proje Konfigürasyonu
```powershell
cd worldpass-mobile

# Projenizi Expo'ya bağlayın
eas init --id 032ee3a8-98e5-4e73-bcfd-79c50c7880e2
```

## Build Oluşturma

### 1. İlk Production Build
```powershell
# Android AAB (App Bundle) formatında build oluştur
eas build --platform android --profile production
```

Bu komut:
- Cloud'da Android App Bundle (.aab) oluşturur
- Otomatik olarak version code increment eder
- Yaklaşık 10-15 dakika sürer
- Build tamamlandığında link verecek

### 2. Build'i İndirme
Build tamamlandıktan sonra:
1. Verilen link'ten .aab dosyasını indirin
2. Veya `eas build:list` ile build'leri listeleyin
3. `eas build:download --id [BUILD_ID]` ile indirin

## Play Store'a Yükleme

### 1. Uygulama Oluşturma
1. [Play Console](https://play.google.com/console)'a gidin
2. "Create app" butonuna tıklayın
3. Bilgileri doldurun:
   - **App name:** WorldPass
   - **Default language:** Turkish
   - **App or game:** App
   - **Free or paid:** Free

### 2. Store Listing (Mağaza Sayfası)
**App details:**
- **App name:** WorldPass
- **Short description:** Merkezi olmayan dijital kimlik ve ödeme cüzdanınız
- **Full description:**
```
WorldPass, dijital kimliğinizi ve ödeme bilgilerinizi güvenli bir şekilde yönetmenizi sağlayan merkezi olmayan bir cüzdan uygulamasıdır.

ÖZELLİKLER:
• 🔐 DID tabanlı güvenli kimlik doğrulama
• 📱 QR kod ile hızlı bilgi paylaşımı
• 💳 Verifiable Credentials (VC) desteği
• 🔒 Cihazınızdan hiç ayrılmayan private key
• 📲 NFC ile yakın mesafe iletişimi
• 🌐 Çevrimdışı doğrulama
• 💰 WorldPass Pay ödeme entegrasyonu

GÜVENLİK:
Şifreler yerine kriptografik imzalar kullanır. Private key'iniz asla sunucuya gönderilmez.

KULLANIM:
1. Yeni bir DID kimliği oluşturun
2. Keystore dosyanızı güvenli yedekleyin
3. Verifiable credentials alın ve paylaşın
4. QR veya NFC ile anında bilgi aktarın
```

- **App icon:** 512x512 PNG (assets/icon.png'den oluşturulacak)
- **Feature graphic:** 1024x500 PNG oluşturun
- **Screenshots:** En az 2, en fazla 8 adet
  - Minimum: 320px
  - Maximum: 3840px
  - Aspect ratio: 16:9 veya 9:16

**Contact details:**
- **Email:** support@worldpass.com (veya sizin email'iniz)
- **Website:** https://worldpass-beta.heptapusgroup.com
- **Privacy policy:** https://worldpass-beta.heptapusgroup.com/privacy

**Category:**
- **App:** Tools
- **Tags:** identity, wallet, credentials, payment

### 3. App Content
**Privacy Policy:**
- URL girin: https://worldpass-beta.heptapusgroup.com/privacy
- Play Console'da privacy policy sayfası zorunlu

**Data Safety:**
- Veri toplama durumunu belirtin
- WorldPass için önerilen ayarlar:
  - ✅ Collects data: Personal info (DID), Payment info
  - ✅ Shares data: No
  - ✅ Data encrypted in transit: Yes
  - ✅ Users can request deletion: Yes

**App access:**
- "All functionality is available without restrictions"

**Ads:**
- "No, my app does not contain ads"

**Content rating:**
- Questionare'i doldurun (genelde PEGI 3 / Everyone alır)

**Target audience:**
- Age: 18+
- Children: Not designed for children

### 4. Production Release

**1. Internal Testing (Önce bu adımı yapın):**
```powershell
# Preview build ile test edin
eas build --platform android --profile preview
```

Play Console'da:
1. Testing → Internal testing → Create new release
2. Upload'a .aab dosyasını yükleyin
3. Release name: 1.0.0
4. Release notes:
```
İlk sürüm:
- DID tabanlı kimlik doğrulama
- QR kod ile bilgi paylaşımı
- NFC desteği
- Verifiable Credentials yönetimi
- WorldPass Pay entegrasyonu
```
5. Test kullanıcıları ekleyin
6. "Review release" → "Start rollout"

**2. Production Release:**
Internal testing başarılı olduktan sonra:
1. Production → Create new release
2. .aab dosyasını upload edin
3. Aynı release notes'u kullanın
4. "Review release" → "Start rollout to Production"

### 5. Review Süreci
- Google'ın review süreci 1-7 gün sürebilir
- İlk uygulama için genelde 3-5 gün
- Approved olunca otomatik olarak yayına girer

## Güncelleme Yükleme

Yeni versiyon için:

```powershell
# 1. app.json'da version'ı güncelleyin (örn: "1.0.1")

# 2. Yeni build oluşturun
eas build --platform android --profile production

# 3. Play Console'da yeni release oluşturun
# Production → Create new release → Upload new .aab
```

## Otomatik Submit (İsteğe Bağlı)

Google Play Service Account key oluşturarak otomatik upload:

```powershell
# Build ve submit işlemini birlikte yap
eas build --platform android --profile production --auto-submit
```

Bunun için:
1. Google Cloud Console'da service account oluşturun
2. Play Console'da API access verin
3. JSON key'i indirin
4. eas.json'da `serviceAccountKeyPath` ekleyin

## Troubleshooting

**"App not signed" hatası:**
```powershell
# EAS otomatik signing yapar, tekrar build deneyin
eas build --platform android --profile production --clear-cache
```

**"Version code conflict":**
- `app.json`'da version'ı güncelleyin
- Veya `eas.json`'da `autoIncrement: true` zaten var

**"Insufficient permissions":**
- Google Play Console'da hesap rolünüzü kontrol edin
- En az "Release Manager" rolü gerekli

## Faydalı Komutlar

```powershell
# Build durumunu kontrol et
eas build:list

# Belirli bir build'i indir
eas build:download --id [BUILD_ID]

# Android credentials'ları görüntüle
eas credentials

# Submit durumunu kontrol et
eas submit:list
```

## Store Assets Checklist

Hazırlanması gerekenler:

- [ ] App icon 512x512 PNG
- [ ] Feature graphic 1024x500 PNG
- [ ] Screenshots (en az 2 adet)
  - Login screen
  - Wallet screen
  - QR sharing screen
  - Settings screen
- [ ] Privacy policy URL
- [ ] Short description (80 karakter max)
- [ ] Full description (4000 karakter max)
- [ ] Contact email
- [ ] Website URL

## İletişim

Sorularınız için:
- Email: support@worldpass.com
- Documentation: https://worldpass-beta.heptapusgroup.com/docs

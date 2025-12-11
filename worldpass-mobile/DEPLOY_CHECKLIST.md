# 📋 Play Store Deployment Checklist

Bu checklist'i Play Store'a yüklemeden önce kontrol edin.

## 🔧 Pre-Build Checklist

### App Configuration
- [ ] `app.json` version güncellendi (örn: "1.0.0")
- [ ] `app.json` bundleIdentifier/package doğru: `com.worldpass.mobile`
- [ ] App name doğru: "WorldPass"
- [ ] Icons hazır ve doğru boyutta:
  - [ ] `assets/icon.png` (1024x1024)
  - [ ] `assets/adaptive-icon.png` (1024x1024)
  - [ ] `assets/splash-icon.png` (1284x2778+)
- [ ] Permissions kontrol edildi (Camera, Biometric, NFC)

### Code Quality
- [ ] Tüm console.log'lar kaldırıldı veya production'da disabled
- [ ] API_BASE_URL production'a işaret ediyor
- [ ] Error handling tüm kritik flow'larda mevcut
- [ ] Loading states doğru çalışıyor
- [ ] No critical bugs or crashes

### Testing
- [ ] Login flow test edildi (Create DID + Import)
- [ ] Credential list görüntüleniyor
- [ ] QR share/receive çalışıyor
- [ ] NFC share/receive çalışıyor
- [ ] Offline mode test edildi
- [ ] Settings açılıyor ve çalışıyor
- [ ] Payment işlemleri çalışıyor (varsa)
- [ ] Biometric auth çalışıyor (varsa enabled)

## 🏗️ Build Process

### EAS Build
```powershell
# 1. Preview build ile final test
eas build --platform android --profile preview

# Build tamamlandığında APK'yı indirin ve test edin
# En az 2-3 farklı cihazda test edin

# 2. Production build
eas build --platform android --profile production

# AAB dosyası indirilecek
```

### Build Checklist
- [ ] Preview build başarılı
- [ ] APK test cihazlarına yüklendi
- [ ] Test senaryoları preview build'de passed
- [ ] Production build başarılı
- [ ] AAB dosyası indirildi

## 📦 Store Assets

### Required Assets
- [ ] App icon 512x512 PNG
- [ ] Feature graphic 1024x500 PNG
- [ ] En az 2 screenshot (1080x1920 veya 1920x1080)
- [ ] Privacy policy URL hazır
- [ ] Short description (80 char max)
- [ ] Full description (4000 char max)
- [ ] App category seçildi: Tools

### Screenshots Needed
Önerilen screenshots:
- [ ] Login screen (DID load)
- [ ] Wallet screen with credentials
- [ ] QR sharing screen
- [ ] Settings screen
- [ ] (Optional) Dark theme showcase
- [ ] (Optional) NFC sharing

Screenshot boyutları:
- Portrait: 1080x1920 (9:16)
- Landscape: 1920x1080 (16:9)

## 🎨 Visual Assets Creation

### Feature Graphic (1024x500)
İçermesi gerekenler:
- WorldPass logo (büyük, merkezi)
- Tagline: "Merkezi Olmayan Dijital Kimlik"
- Background gradient veya solid color
- QR code veya mobile device visual (optional)
- Modern, clean design

### Icon Guidelines
- Clean, simple design
- Recognizable at small sizes
- No text (sadece logo)
- Transparent background (adaptive icon)
- Consistent branding

## 📝 Play Console Setup

### App Details
- [ ] App name: WorldPass
- [ ] Default language: Turkish
- [ ] Category: Tools
- [ ] Tags: identity, wallet, credentials, payment

### Store Listing
- [ ] Short description paste edildi (STORE_LISTING.md'den)
- [ ] Full description paste edildi
- [ ] Screenshots upload edildi
- [ ] Feature graphic upload edildi
- [ ] App icon (512x512) upload edildi

### Privacy & Content
- [ ] Privacy policy URL eklendi
- [ ] Data safety questionnaire dolduruldu
  - [ ] Data collected: Personal info, Financial info
  - [ ] Data encrypted: Yes
  - [ ] Data shared: No
  - [ ] User can delete: Yes
- [ ] Content rating tamamlandı (PEGI 3)
- [ ] Target audience: 18+
- [ ] Ads declaration: No ads

### Pricing & Distribution
- [ ] Free app
- [ ] Countries seçildi (Turkey + others)
- [ ] Content rating: Everyone / PEGI 3
- [ ] Distributed to: All eligible devices

## 🚀 Release Process

### Internal Testing (First)
- [ ] Internal testing track oluşturuldu
- [ ] AAB upload edildi
- [ ] Release notes yazıldı
- [ ] Test user emails eklendi
- [ ] Released to internal testing
- [ ] Internal testers test etti (1-2 gün)
- [ ] Kritik bug yok

### Production Release
- [ ] Production track'e yeni release oluşturuldu
- [ ] AAB upload edildi (internal test'ten promote de olabilir)
- [ ] Release notes yazıldı:
```
İlk sürüm:
- DID tabanlı kimlik doğrulama
- QR kod ile bilgi paylaşımı
- NFC desteği
- Verifiable Credentials yönetimi
- WorldPass Pay entegrasyonu
```
- [ ] Countries & regions seçildi
- [ ] Rollout percentage: 100% (veya staged rollout)
- [ ] "Review and release" clicked
- [ ] Google review bekleniyor (1-7 gün)

## 📊 Post-Release

### Monitoring
- [ ] Google Play Console'da crash reports kontrol et
- [ ] User reviews izle
- [ ] Installation funnel analizi
- [ ] First-day metrics:
  - Install count
  - Crash-free users percentage
  - ANR (App Not Responding) rate

### Marketing
- [ ] App link paylaş: `https://play.google.com/store/apps/details?id=com.worldpass.mobile`
- [ ] Social media announcement
- [ ] Website'e link ekle
- [ ] Press release (optional)

## 🐛 Common Issues

### "App bundle upload failed"
- Version code conflict → `app.json` version'ı artır
- Signing issue → `eas credentials` kontrol et

### "Review rejected"
Muhtemel sebepler:
- Privacy policy missing/broken
- Permissions açıklaması eksik
- Store listing incomplete
- App crashes on launch
- Misleading screenshots

Fix ve yeniden submit et.

### "Low priority review"
İlk app genelde 3-5 gün sürer. Updates 1-2 gün.

## ✅ Final Sign-Off

Checklist tamamlandıysa:

```
✅ App tested and working
✅ Build successful (AAB)
✅ Store listing complete
✅ Privacy policy ready
✅ Screenshots uploaded
✅ Released to production
✅ Monitoring active

🎉 WorldPass is live on Play Store!
```

## 📞 Support

Deploy sırasında sorun olursa:
- Expo Docs: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- Play Console Help: https://support.google.com/googleplay/android-developer

---

**Next Steps After Launch:**
1. Monitor first 24h metrics
2. Respond to user reviews
3. Plan v1.1 features based on feedback
4. iOS App Store release (optional)

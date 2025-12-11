# 🚀 WorldPass Mobile - Hızlı Başlangıç

## Şu An Neredeyiz?

✅ **Mobile app DID authentication'a migrate edildi**
- Email/password kaldırıldı
- Challenge-response authentication eklendi
- LoginScreen UI güncellendi
- RegisterScreen kaldırıldı
- Navigation güncellendir

✅ **Play Store deployment dosyaları hazırlandı**
- PLAY_STORE_GUIDE.md - Detaylı yükleme rehberi
- STORE_LISTING.md - Store listing içeriği
- DEPLOY_CHECKLIST.md - Deployment checklist
- eas.json - Build configuration

## 📱 Hemen Test Et

```powershell
# 1. Mobile dizinine git
cd worldpass-mobile

# 2. Dependencies yükle (ilk kez)
npm install

# 3. Development server başlat
npm start

# 4. QR code ile telefondan bağlan (Expo Go app gerekli)
# veya emulator kullan:
npm run android  # Android
npm run ios      # iOS (Mac only)
```

## 🔑 Test Senaryosu

1. **Create DID**: Login screen'de "Create new DID" butonuna bas
2. **Keystore kaydet**: Oluşan .wpkeystore dosyasını kaydet
3. **Login**: Login screen'de "Sign in with DID" ile giriş yap
4. **Wallet**: Credentials listesini gör
5. **QR Share**: Bir credential'ı QR ile paylaş

## 🏗️ Play Store'a Yükle

### Hızlı Yol (3 adım)

```powershell
# 1. EAS CLI kur
npm install -g eas-cli

# 2. Login ol
eas login

# 3. Production build yap
cd worldpass-mobile
eas build --platform android --profile production
```

Build tamamlandığında (.aab dosyası) Play Console'a yükle.

### Detaylı Rehber
**[PLAY_STORE_GUIDE.md](./PLAY_STORE_GUIDE.md)** dosyasına bakın.

## 📋 Yapılması Gerekenler

### Öncelikli
1. [ ] Test et - Development mode'da tüm flow'ları test et
2. [ ] Screenshots çek - En az 2 adet (login, wallet)
3. [ ] Feature graphic hazırla - 1024x500 PNG
4. [ ] Preview build yap - Test için APK
5. [ ] Internal test - 2-3 test kullanıcısı ile

### Play Console Setup
1. [ ] Google Play Console'da app oluştur
2. [ ] Store listing doldur (STORE_LISTING.md'den kopyala)
3. [ ] Privacy policy ekle
4. [ ] Screenshots ve feature graphic yükle
5. [ ] Content rating tamamla

### Production Release
1. [ ] Production build (.aab)
2. [ ] Play Console'a yükle
3. [ ] Release notes yaz
4. [ ] Submit for review
5. [ ] 3-5 gün bekle

## 📂 Önemli Dosyalar

- **app.json** - Expo configuration
- **eas.json** - Build profiles
- **src/lib/api.js** - API endpoint configuration
- **src/screens/LoginScreen.js** - DID authentication UI
- **src/context/AuthContext.jsx** - Authentication logic

## 🐛 Sorun Giderme

### Backend'e bağlanamıyor
```powershell
# Backend'in çalıştığından emin ol
cd ../backend
python -m uvicorn app:app --reload

# Mobile'da API_BASE kontrol et
# src/lib/api.js dosyasında
```

### Build hatası
```powershell
# Cache temizle
npm start -- --clear

# node_modules yeniden yükle
rm -rf node_modules
npm install
```

### Expo Go çalışmıyor
Custom native modules (NFC, biometric) Expo Go'da çalışmaz.
Development build gerekli:
```powershell
eas build --platform android --profile development
```

## 🔗 Faydalı Linkler

- **Expo Docs**: https://docs.expo.dev/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **Play Console**: https://play.google.com/console
- **Backend**: http://localhost:8000 (development)

## 📞 İletişim

Sorun olursa:
- GitHub Issues: https://github.com/mathissdupont/worldpass-real/issues
- Email: support@worldpass.com

---

## 🎯 Sonraki Adımlar

1. **Test et** - Tüm features'ı kontrol et
2. **Build yap** - Preview build ile son test
3. **Assets hazırla** - Screenshots, feature graphic
4. **Play Store'a yükle** - Production build
5. **Bekle** - Google review (3-5 gün)
6. **Yayınla** - 🎉

**Detaylı adımlar için: [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)**

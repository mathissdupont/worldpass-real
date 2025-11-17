# NFC/QR Entegrasyonu ve Sistem Basitleştirmesi

## 1. NFC/QR Entegrasyonunu Genişlet
- [x] IssueVC.jsx'e QR kod üretim ekle (VC oluşturduktan sonra göster)
- [x] IssueVC.jsx'e NFC yazma özelliği ekle
- [x] Present.jsx'teki QR/NFC kontrollerini iyileştir (büyük düğmeler, ikonlar)
- [x] VerifyVC.jsx'teki QR/NFC taramayı iyileştir

## 2. Rol Bazlı Sistem
- [x] Sayfaları yeniden adlandır: Öğrenci (Göster), Doğrulayıcı (Doğrula), Yayıncı (Oluştur)
- [x] Navigasyon menüsünü güncelle
- [x] Terminolojiyi basitleştir (VC -> Kimlik Bilgisi)

## 3. Kalıcılık
- [x] Kimlik ve VC'leri localStorage'a kaydet
- [x] RAM tabanlı depolamayı kaldır
- [x] identityContext.jsx'i güncelle

## 4. UI İyileştirmeleri
- [x] Büyük, belirgin düğmeler
- [x] İkonlar ekle (QR kamera, NFC anten)
- [x] İpuçları ve basit açıklamalar
- [x] Çevirileri tr.json'a ekle

## 5. Selective Disclosure (Yeni Özellik)
- [x] Verifier (VerifyVC.jsx): İstenen alanları seçmek için UI ekle (örneğin EmployeeID gibi)
- [x] Request formatını genişlet: type: "present", challenge, aud, exp, fields: ["EmployeeID"] gibi
- [ ] Holder (Present.jsx): Request'i parse et, sadece istenen alanları göster
  - [ ] Update req parsing to include 'fields' array
  - [ ] Add filtering logic for VC credentialSubject based on fields
  - [ ] Modify VC display to show filtered VC
  - [ ] Update buildPayload to use filtered VC in payload
- [ ] Backend: Selective presentation'ı doğrula
- [ ] Roller: Öğrenci (Göster), Doğrulayıcı (Doğrula), Yayıncı (Oluştur) – ayrımı netleştir

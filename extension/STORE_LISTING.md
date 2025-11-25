# Chrome Web Store Listing

## Store Listing (Türkçe)

### Başlık
WorldPass AutoFill - Güvenli Şifre Yöneticisi

### Kısa Açıklama (132 karakter max)
Instagram, Twitter, GitHub ve daha fazla sitede şifrelerinizi güvenle saklayın ve otomatik doldurun. Uçtan uca şifreli.

### Detaylı Açıklama

WorldPass AutoFill, şifrelerinizi güvenli bir şekilde saklayan ve desteklenen web sitelerinde otomatik olarak dolduran modern bir şifre yöneticisidir.

🔐 **Özellikler:**

✅ **Otomatik Şifre Doldurma**
- Instagram, Twitter, GitHub, Facebook, LinkedIn gibi popüler sitelerde çalışır
- Giriş formlarını otomatik algılar
- Tek tıkla şifre doldurma

✅ **Maksimum Güvenlik**
- Tüm şifreler Fernet şifreleme ile korunur
- Uçtan uca şifreleme
- Sunucuda bile şifreler şifreli saklanır
- Üçüncü taraflara veri paylaşımı YOK

✅ **Kolay Kullanım**
- Temiz ve modern arayüz
- Otomatik senkronizasyon (15 dakikada bir)
- Tüm cihazlarınızda çalışır
- Tek tıkla şifre kopyalama

✅ **Gizlilik Odaklı**
- Gezinme geçmişinizi kaydetmez
- Reklam göstermez
- Analitik toplamaz
- Açık kaynak kodlu

🎯 **Nasıl Kullanılır:**

1. WorldPass hesabı oluşturun (worldpass.io)
2. Profil sayfasından şifrelerinizi ekleyin
3. Extension'ı yükleyin ve sync yapın
4. Desteklenen sitelerde giriş yaparken 🔐 butonuna tıklayın!

📱 **Desteklenen Platformlar:**
- Instagram
- Twitter / X
- GitHub
- Facebook
- LinkedIn
- (Daha fazlası yakında!)

🔒 **Güvenlik:**
- Chrome'un güvenli storage API'sini kullanır
- Tüm API çağrıları HTTPS üzerinden
- Uzaktan kod yükleme YOK
- Şifreler hiçbir zaman düz metin olarak saklanmaz

⚡ **Neden WorldPass?**
- Hafif ve hızlı
- Açık kaynak
- Ücretsiz
- Gizlilik öncelikli
- Modern tasarım

📝 **İzinler:**
- activeTab: Giriş formlarını algılamak için
- storage: Şifreleri güvenle saklamak için
- tabs: WorldPass uygulamasını açmak için
- alarms: Otomatik senkronizasyon için
- Host permissions: Sadece desteklenen sitelerde çalışmak için

🆘 **Destek:**
- Email: support@worldpass.io
- GitHub: github.com/mathissdupont/worldpass-real
- Website: worldpass.io

---

## Store Listing (English)

### Title
WorldPass AutoFill - Secure Password Manager

### Short Description (132 chars max)
Securely store and auto-fill passwords on Instagram, Twitter, GitHub & more. End-to-end encrypted password manager.

### Detailed Description

WorldPass AutoFill is a modern password manager that securely stores your passwords and automatically fills them on supported websites.

🔐 **Features:**

✅ **Auto-Fill Passwords**
- Works on Instagram, Twitter, GitHub, Facebook, LinkedIn
- Automatically detects login forms
- One-click password fill

✅ **Maximum Security**
- All passwords protected with Fernet encryption
- End-to-end encryption
- Passwords encrypted even on server
- NO third-party data sharing

✅ **Easy to Use**
- Clean and modern interface
- Auto-sync every 15 minutes
- Works across all your devices
- One-click password copy

✅ **Privacy-Focused**
- Does not track your browsing
- No advertisements
- No analytics collection
- Open source code

🎯 **How to Use:**

1. Create a WorldPass account (worldpass.io)
2. Add your passwords from profile page
3. Install extension and sync
4. Click the 🔐 button when logging in!

📱 **Supported Platforms:**
- Instagram
- Twitter / X
- GitHub
- Facebook
- LinkedIn
- (More coming soon!)

🔒 **Security:**
- Uses Chrome's secure storage API
- All API calls over HTTPS
- NO remote code execution
- Passwords never stored in plain text

⚡ **Why WorldPass?**
- Lightweight and fast
- Open source
- Free
- Privacy-first
- Modern design

📝 **Permissions:**
- activeTab: To detect login forms
- storage: To securely store passwords
- tabs: To open WorldPass app
- alarms: For auto-sync
- Host permissions: To work only on supported sites

🆘 **Support:**
- Email: support@worldpass.io
- GitHub: github.com/mathissdupont/worldpass-real
- Website: worldpass.io

---

## Chrome Web Store Fields

### Category
**Productivity**

### Language
**Turkish (Türkçe)** - Primary
**English** - Secondary

### Single Purpose
This extension serves a single purpose: to securely store and automatically fill passwords on supported websites. It does not track browsing, show ads, or perform any other functions.

### Permission Justifications

**activeTab:**
Required to detect login forms on the currently active tab and insert the auto-fill button next to password fields. Only activates on user-visited pages.

**storage:**
Required to securely cache encrypted passwords locally using Chrome's storage API for quick access and offline availability.

**tabs:**
Required to open the WorldPass web application when user clicks "Open WorldPass" button in the extension popup.

**alarms:**
Required to automatically sync passwords from WorldPass server every 15 minutes to keep credentials up-to-date.

**Host Permissions (instagram.com, twitter.com, etc.):**
Required to detect login forms and inject auto-fill functionality ONLY on explicitly listed supported websites. Does not access or collect data from these sites.

### Remote Code
**Justification:** This extension does NOT use remote code. All JavaScript is bundled within the extension package and no external scripts are loaded at runtime.

### Data Usage
This extension collects and stores:
- Encrypted passwords (Fernet encryption)
- Account authentication tokens
- Website usernames
- Last sync timestamp

Data is NOT sold, NOT used for ads, and NOT shared with third parties. Used ONLY for the extension's core password management functionality.

## Screenshots Needed

1. **Popup Interface** - Extension popup showing sync status
2. **Auto-Fill Button** - Instagram login page with 🔐 button
3. **WorldPass Profile** - Profile page showing password fields
4. **Settings Page** - Extension settings in WorldPass
5. **Success State** - Successfully filled password

## Icon Needed

Create 128x128, 48x48, and 16x16 PNG icons with:
- Purple gradient background (#667eea to #764ba2)
- White lock emoji 🔐 or lock icon
- "WP" letters optional
- Transparent or rounded corners

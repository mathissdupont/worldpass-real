# Gizlilik Politikası (MVP Taslağı)

Bu belge, WorldPass projesinin MVP (Minimum Viable Product) aşamasına ait gizlilik politikasını açıklar. Proje geliştikçe, özellikler olgunlaştıkça ve güvenlik süreçleri netleştikçe bu politika da güncellenecektir. Bu taslak, mevcut durumu dürüst ve sade bir şekilde yansıtmayı amaçlar.

## Kapsam

Bu politika aşağıdaki bileşenler için geçerlidir:

- WorldPass web uygulaması
- WorldPass mobil uygulaması (varsa)
- Kimlik oluşturma, saklama ve doğrulama işlemlerini sunan backend API’leri

Bu politika; WorldPass’in deneysel, ticari olmayan ve erken aşamada bulunan sürümü için hazırlanmıştır. Projenin ilerleyen aşamalarında, kapsam genişletilebilir.

---

## Topladığımız Veriler

WorldPass, hizmetin çalışması için zorunlu olan asgari verileri toplamayı hedefler.

### 1. Hesap Verileri
- E-posta adresi
- Kimlik doğrulama için gereken temel bilgiler
- Hesabın oluşturulma ve giriş zamanları (log amaçlı)

Bu veriler, hesabınızı doğrulamak ve giriş işlemlerini gerçekleştirmek için gereklidir.

### 2. Kimlik / Credential Verileri
- Dijital kimlik kartlarında yer alan alanlar (ör. ad, kurum, geçerlilik tarihi vb.)
- Bu veriler, kartın size ait olduğunu göstermek için kullanılır

> **Not:** MVP aşamasında hedef, bu verilerin çoğunu cihaz üzerinde ve şifreli biçimde tutmaktır. Sunucu tarafında yalnızca minimum meta veri tutulur (ör. credential ID, tip bilgisi, oluşturulma zamanı).

### 3. Kullanım Verileri (İsteğe Bağlı)
- Hangi sayfaların ziyaret edildiği
- Hata kayıtları (log’lar)
- Basit performans metrikleri

Bu veriler, `evt.js` üzerinden toplanabilir ancak **varsayılan olarak kapalıdır**. Analiz amaçlı kullanım, proje geliştikçe şekillenecektir.

---

## Verilerin Saklanması

- Kimlik verileri **mümkün olduğunca cihaz üzerinde** saklanır.
- Sunucuda saklanan veriler yalnızca minimum düzeyde meta veri ve yapılandırma amaçlıdır.
- Veritabanı SQLite veya benzeri hafif bir sistem olabilir; üretim ortamına geçildiğinde bu yapı güncellenebilir.

Saklama süreleri, MVP aşamasında net değildir. Proje büyüdükçe veri saklama ve silme politikaları daha ayrıntılı şekilde tanımlanacaktır.

---

## Verilerin Paylaşımı

- **Verileriniz satılmaz.**
- Dijital kimlik kartlarınız, yalnızca siz paylaştığınızda veya QR kod ile sunduğunuzda başka taraflarca görülebilir.
- Kimlik doğrulaması yapılırken yalnızca doğrulama için gerekli bilgiler paylaşılır.

WorldPass, üçüncü taraf entegrasyonları kullanıyorsa (ör. e-posta sağlayıcıları, barındırma hizmetleri), bu sağlayıcılarla yalnızca hizmetin çalışması için gerekli veriler paylaşılır.

---

## Güvenlik

- WorldPass MVP aşamasındadır; henüz **resmi bir güvenlik denetimi yapılmamıştır**.
- Temel güvenlik prensipleri (ör. şifreleme, erişim kontrolü, minimal veri saklama) uygulanmaktadır.
- Dünya standartlarında bir güvenlik garantisi bu aşamada verilemez.
- Kullanıcılar, kritik verileri veya geri dönüşü olmayan işlemleri yalnızca WorldPass’e güvenerek gerçekleştirmemelidir.

Gelecekte:
- Cihaz tarafında anahtar yönetimi
- Gelişmiş şifreleme yöntemleri
- On-chain güvenlik katmanları (ör. EAS entegrasyonu)
planlanmaktadır.

---

## Kullanıcı Hakları

Aşağıdaki haklara sahip olabilirsiniz:

- Hesap verilerinizin silinmesini talep etme
- Kimlik kartlarınızı cihazdan kaldırma
- Kullanım analizlerinin kapatılmasını talep etme (MVP’de varsayılan olarak kapalıdır)

Bu talepler, projenin topluluk yapısı gereği e-posta veya GitHub Issue üzerinden iletilebilir.

---

## Değişiklikler

Bu gizlilik politikası zamanla değişebilir. Önemli güncellemeler:

- Repository sürüm notlarında
- Uygulama içi bildirimlerde
- Resmî web sayfasında

duyurulacaktır.

Belgenin üst kısmındaki tarih, güncel sürümü belirtir.

---

## İletişim

Gizlilikle ilgili tüm sorular, geri bildirimler veya talepler için:

contact@heptapusgroup.com
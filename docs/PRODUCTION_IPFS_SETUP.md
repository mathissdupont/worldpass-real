# Üretim Sunucusunda IPFS Kurulumu

worldpass-beta.heptapusgroup.com üzerinde IPFS entegrasyonu için adım adım kılavuz.

## 1. Sunucuya Bağlan

```bash
ssh root@worldpass-beta.heptapusgroup.com
```

## 2. Proje Dizinine Git

```bash
cd /root/worldpass
# veya projenin bulunduğu dizin
```

## 3. Git'ten Güncel Değişiklikleri Çek

```bash
git pull origin main
```

**Güncellenen dosyalar:**
- `docker-compose.yml` (IPFS servisi eklendi)
- `backend/database.py` (IPFS kolonları için migrasyon)
- `backend/.env.production` (IPFS URL'leri)
- `README.md` (dokümantasyon)

## 4. Mevcut Servisleri Durdur

```bash
docker compose down
```

## 5. IPFS İmajını Çek

```bash
docker compose pull ipfs
```

## 6. IPFS Servisini Başlat

```bash
docker compose up -d ipfs
```

**IPFS başlatma kontrolü:**
```bash
docker compose ps ipfs
docker compose logs ipfs --tail=50
```

IPFS düğümü başladığında şuna benzer log görmelisin:
```
Daemon is ready
```

## 7. IPFS Veri Klasörlerini Kontrol Et

```bash
ls -la data/ipfs
ls -la data/ipfs-staging
```

## 8. Backend Servisini Yeniden Başlat (Migration için)

```bash
docker compose up -d backend
```

**Migration loglarını kontrol et:**
```bash
docker compose logs backend --tail=100 | grep -i "migration\|ipfs"
```

Şu mesajları görmelisin:
- `Migration: Added column ipfs_cid to issued_vcs table`
- `Migration: Added column blockchain_tx to issued_vcs table`
- `Migration: Added column storage_type to issued_vcs table`
- `Migration: Added column ipfs_cid to user_vcs table`

## 9. Frontend ve Caddy'yi Yeniden Başlat

```bash
docker compose up -d frontend
docker compose up -d caddy
```

## 10. Tüm Servislerin Durumunu Kontrol Et

```bash
docker compose ps
```

Çıktıda 4 servis çalışıyor olmalı:
- `backend` (up)
- `frontend` (up)
- `caddy` (up)
- `ipfs` (up)

## 11. IPFS API Testleri

**Container içinden IPFS API sürümünü kontrol et:**
```bash
docker compose exec backend sh -c "curl -X POST http://ipfs:5001/api/v0/version"
```

Beklenen yanıt:
```json
{"Version":"0.x.x","Commit":"...","Repo":"..."}
```

**Basit dosya yükleme testi:**
```bash
echo "test worldpass ipfs" | docker compose exec -T ipfs ipfs add
```

Beklenen çıktı:
```
added Qm... test worldpass ipfs
```

## 12. Backend Distributed Storage Endpoint Testi

**Sağlık kontrolü:**
```bash
curl https://worldpass-beta.heptapusgroup.com/health
```

**IPFS saklama testi (örnek payload):**
```bash
curl -X POST https://worldpass-beta.heptapusgroup.com/api/distributed/store \
  -H "Content-Type: application/json" \
  -d '{
    "vc_id": "test-vc-123",
    "encrypted_payload": "dGVzdC1lbmNyeXB0ZWQtcGF5bG9hZA==",
    "issuer_did": "did:test:issuer",
    "subject_did": "did:test:subject",
    "chain_key": "polygon"
  }'
```

Beklenen yanıt:
```json
{
  "success": true,
  "message": "Credential stored on distributed storage",
  "ipfs_cid": "Qm...",
  "tx_hash": "0x...",
  "chain": "polygon",
  "storage": "distributed"
}
```

## 13. DB Kolonlarını Doğrula

**Backend container'ına bağlan:**
```bash
docker compose exec backend sh
```

**SQLite'ta kolonları kontrol et:**
```bash
sqlite3 /data/worldpass.db "PRAGMA table_info(issued_vcs);" | grep -E "ipfs_cid|blockchain_tx|storage_type"
```

veya Python ile:
```bash
python -c "
import sqlite3
conn = sqlite3.connect('/data/worldpass.db')
cursor = conn.execute('PRAGMA table_info(issued_vcs)')
cols = [c[1] for c in cursor.fetchall()]
print('IPFS columns:', [c for c in cols if 'ipfs' in c or 'blockchain' in c or 'storage' in c])
"
```

Çıkış:
```
IPFS columns: ['blockchain_chain', 'ipfs_cid', 'blockchain_tx', 'storage_type']
```

Container'dan çık:
```bash
exit
```

## 14. IPFS Gateway Dış Erişim (Opsiyonel - Sadece Okuma İçin)

**ÖNEMLİ GÜVENLİK NOTU:**
- **IPFS API (port 5001) asla dışarıya açılmamalı** - yazma erişimi sağlar, güvenlik riski
- **Gateway (port 8080)** sadece okuma için açılabilir (public CID'leri paylaşmak için)

Eğer IPFS gateway'i public erişime açmak istersen (örn: kullanıcılar CID linklerini paylaşacaksa):

**Caddyfile'a ekle:**
```
# IPFS Gateway (Sadece Okuma - Public CID erişimi)
ipfs.worldpass-beta.heptapusgroup.com {
    reverse_proxy ipfs:8080
}
```

Sonra Caddy'yi yeniden yükle:
```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

**Not:** Varsayılan kurulumda gateway internal kalır, bu da yeterlidir.

## 15. Log Takibi (Sorun Giderme)

**IPFS logları:**
```bash
docker compose logs -f ipfs
```

**Backend logları:**
```bash
docker compose logs -f backend
```

**Tüm servisler:**
```bash
docker compose logs -f
```

## Sorun Giderme

### IPFS bağlantı hatası

**Semptom:** Backend "IPFS storage failed" hatası veriyor.

**Çözüm:**
1. IPFS container'ının çalıştığını doğrula: `docker compose ps ipfs`
2. Backend env değişkenlerini kontrol et: `docker compose exec backend printenv | grep IPFS`
3. Network bağlantısını test et: `docker compose exec backend ping ipfs`

### Migration çalışmadı

**Semptom:** Kolonlar eklenmedi.

**Çözüm:**
Backend'i yeniden başlat ve logları izle:
```bash
docker compose restart backend
docker compose logs backend --tail=200 | grep -i migration
```

### IPFS veri yolu hataları

**Semptom:** "permission denied" veya volume mount hatası.

**Çözüm:**
```bash
mkdir -p data/ipfs data/ipfs-staging
chmod 777 data/ipfs data/ipfs-staging
docker compose restart ipfs
```

## Sonraki Adımlar

1. **Blockchain Entegrasyonu:** Polygon Mumbai testnet'te kontrat deploy
2. **Web3 Bağlantısı:** Backend'de gerçek `anchor_hash()` implementasyonu
3. **Frontend Güncelleme:** Blockchain seçici build/deploy
4. **Test:** End-to-end IPFS + blockchain akışı

## Notlar

- IPFS verileri `./data/ipfs` klasöründe kalıcı olarak saklanır
- **IPFS API (port 5001) sadece internal network'te erişilebilir - ASLA dışarı açılmamalı (güvenlik)**
- Gateway (port 8080) varsayılan olarak internal; gerekirse Caddy ile public read-only erişim verilebilir
- Production'da gerçek blockchain çağrıları için `ANCHOR_MODE=real` ve kontrat adresleri gerekli

## Güvenlik Kontrol Listesi

✅ IPFS API (5001) sadece internal network  
✅ Backend IPFS'ye internal hostname ile bağlanıyor (http://ipfs:5001)  
✅ Gateway opsiyonel ve sadece okuma erişimi sağlıyor  
✅ Kimlik bilgileri ve şifreli VC'ler IPFS'ye client-side encryption ile yükleniyor

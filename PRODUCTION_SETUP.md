# Production/Sunucu Kurulum Rehberi - Multi-Chain Blockchain

## 1. .env Dosyası Oluştur

Backend klasöründe `.env` dosyası oluştur:

```bash
cd /srv/worldpass/worldpass-real/backend
nano .env
```

Şu içeriği ekle:

```env
# App Settings
APP_NAME=WorldPass
ENV=production
API_PREFIX=/api

# CORS (sunucu domainini ekle)
CORS_ORIGINS=https://worldpass-beta.heptapusgroup.com,http://worldpass-beta.heptapusgroup.com,http://localhost:3000

# Database (Docker mount path)
DATABASE_PATH=/data/worldpass.db

# JWT Secret (değiştir!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# VC Encryption Key (değiştir!)
VC_ENCRYPTION_KEY=your-vc-encryption-key-change-this-32-chars-min

# Profile Encryption Key (değiştir!)
PROFILE_ENCRYPTION_KEY=your-profile-encryption-key-32-chars-min

# Admin Password Hash (mevcut, değiştirme)
ADMIN_PASS_HASH='$2b$12$s8HVp8LFhgsNCsM6BoprbeswPtmMlwcVq6f5X5aRt/mc99Ee/WGa6'

# Challenge TTL
CHALLENGE_TTL_SECONDS=300

# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY=https://ipfs.io/ipfs

# Blockchain - Default (Production kullanım için)
# Şu an simulated mode, gerçek kullanım için contract adresleri eklenecek

# Polygon (Recommended for Production)
# CONTRACT_POLYGON=0x...  # Deploy edince ekle

# Base
# CONTRACT_BASE=0x...  # Deploy edince ekle

# Arbitrum
# CONTRACT_ARBITRUM=0x...  # Deploy edince ekle

# Test için (optional, varsayılan polygon_mumbai olacak)
# BLOCKCHAIN_DEFAULT=polygon_mumbai
```

**Önemli:** JWT_SECRET, VC_ENCRYPTION_KEY, PROFILE_ENCRYPTION_KEY değerlerini değiştir!

## 2. Güvenli Key Oluştur (Opsiyonel)

```bash
# Random secure keys oluştur
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_hex(32))"
python3 -c "import secrets; print('VC_ENCRYPTION_KEY=' + secrets.token_hex(32))"
python3 -c "import secrets; print('PROFILE_ENCRYPTION_KEY=' + secrets.token_hex(32))"
```

Çıktıları .env dosyasına kopyala.

## 3. Python Paketlerini Kur

```bash
cd /srv/worldpass/worldpass-real/backend

# Virtual env varsa aktif et
source .venv/bin/activate  # Linux
# ya da
.\.venv\Scripts\Activate.ps1  # Windows

# Yeni paketleri kur
pip install aiohttp web3 ipfshttpclient
```

## 4. Backend'i Başlat (Production Mode)

### Option A: Direkt Python (Test için)

```bash
cd /srv/worldpass/worldpass-real/backend

# Production mode ile başlat
ENV=production uvicorn app:app --host 0.0.0.0 --port 8000
```

### Option B: Docker ile (Önerilen)

Eğer Docker kullanıyorsan, docker-compose.yml'i güncelle:

```yaml
backend:
  environment:
    - ENV=production
  # ... diğer ayarlar
```

Sonra:
```bash
cd /srv/worldpass/worldpass-real
docker-compose restart backend
```

## 5. Test Et (Sunucu Üzerinden)

Backend başladıktan sonra başka terminalde test et:

### A. Sağlık Kontrolü
```bash
curl https://worldpass-beta.heptapusgroup.com/api/health
```

**Beklenen:**
```json
{"status":"ok"}
```

### B. Blockchain Listesi
```bash
curl https://worldpass-beta.heptapusgroup.com/api/blockchains/list
```

**Beklenen:**
```json
{
  "success": true,
  "chains": [
    {
      "key": "polygon",
      "name": "Polygon",
      "gas_price": "very_low",
      ...
    }
  ],
  "count": 9,
  "recommended": "polygon"
}
```

### C. Testnet Listesi (Development Test)
```bash
curl "https://worldpass-beta.heptapusgroup.com/api/blockchains/list?include_testnets=true"
```

**Beklenen:**
```json
{
  "success": true,
  "chains": [..., 
    {
      "key": "polygon_mumbai",
      "name": "Polygon Mumbai (Testnet)",
      ...
    }
  ],
  "count": 11,
  "recommended": "polygon_mumbai"
}
```

### D. Önerilen Chain
```bash
curl https://worldpass-beta.heptapusgroup.com/api/blockchains/recommended
```

**Beklenen:**
```json
{
  "success": true,
  "recommended": "polygon",
  "config": {
    "name": "Polygon",
    "chain_id": 137,
    "gas_price": "very_low",
    "finality": 2
  },
  "reason": "Low gas fees (very_low), fast finality (2s)"
}
```

### E. Spesifik Chain Bilgisi
```bash
curl https://worldpass-beta.heptapusgroup.com/api/blockchains/polygon
```

**Beklenen:**
```json
{
  "success": true,
  "chain": {
    "key": "polygon",
    "name": "Polygon",
    "chain_id": 137,
    "rpc": "https://polygon-rpc.com",
    "gas_price": "very_low",
    "finality": 2,
    "native_token": "MATIC",
    "explorer": "https://polygonscan.com"
  }
}
```

## 6. Frontend Test (Browser Console)

Browser'da `worldpass-beta.heptapusgroup.com`'u aç ve console'da:

```javascript
// Chain listesi al
fetch('/api/blockchains/list')
  .then(r => r.json())
  .then(d => console.table(d.chains));

// Önerilen chain
fetch('/api/blockchains/recommended')
  .then(r => r.json())
  .then(d => console.log('Recommended:', d.recommended, d.config));

// Testnet listesi
fetch('/api/blockchains/list?include_testnets=true')
  .then(r => r.json())
  .then(d => console.log('Testnets:', d.chains.filter(c => c.key.includes('_'))));
```

## 7. Distributed Storage Test (Simulated)

Şu an IPFS ve blockchain **simulated mode**'da çalışıyor (gerçek node bağlantısı yok).

Test için:

```bash
# Token al (admin olarak login ol)
TOKEN="your-admin-token"

# Credential store et (simulated)
curl -X POST https://worldpass-beta.heptapusgroup.com/api/distributed/store \
  -H "Content-Type: application/json" \
  -H "x-token: $TOKEN" \
  -d '{
    "vc_id": "test-vc-001",
    "encrypted_payload": "SGVsbG8gV29ybGQgVGVzdA==",
    "issuer_did": "did:key:z6MkTestIssuer",
    "subject_did": "did:key:z6MkTestUser",
    "chain_key": "polygon"
  }'
```

**Beklenen (Simulated):**
```json
{
  "success": true,
  "message": "Credential stored on distributed storage",
  "ipfs_cid": "Qm...",
  "storage": "distributed",
  "tx_hash": "0xabc123...",
  "chain": "polygon",
  "chain_id": 137,
  "chain_name": "Polygon",
  "explorer_url": "https://polygonscan.com/tx/0xabc123...",
  "status": "simulated",
  "merkle_root": "..."
}
```

## 8. Logs Kontrol

Backend loglarını kontrol et:

```bash
# Direkt Python çalıştırıyorsan
# Terminal çıktısını izle

# Docker kullanıyorsan
docker-compose logs -f backend

# Blockchain initialization mesajını gör:
# [BlockchainLedger] Initialized with Polygon (chain_id: 137)
```

## 9. Database'e Column Ekle (İlerisi İçin)

Distributed storage için database şemasını güncelle:

```bash
cd /srv/worldpass/worldpass-real/backend

sqlite3 /data/worldpass.db << 'EOF'
-- issued_vcs tablosuna distributed storage columnları ekle
ALTER TABLE issued_vcs ADD COLUMN ipfs_cid TEXT;
ALTER TABLE issued_vcs ADD COLUMN blockchain_tx TEXT;
ALTER TABLE issued_vcs ADD COLUMN storage_type TEXT DEFAULT 'centralized';
ALTER TABLE issued_vcs ADD COLUMN blockchain_chain TEXT DEFAULT 'polygon';

-- user_vcs tablosuna da ekle
ALTER TABLE user_vcs ADD COLUMN ipfs_cid TEXT;
ALTER TABLE user_vcs ADD COLUMN storage_type TEXT DEFAULT 'centralized';

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_issued_vcs_ipfs ON issued_vcs(ipfs_cid);
CREATE INDEX IF NOT EXISTS idx_issued_vcs_chain ON issued_vcs(blockchain_chain);

.quit
EOF
```

## 10. Frontend'i Güncelle (İsteğe Bağlı)

BlockchainSelector component'ini kullanmak için:

```bash
cd /srv/worldpass/worldpass-real/web

# BlockchainSelector component zaten oluşturuldu
# src/components/BlockchainSelector.jsx

# Kullanım örneği - IssueVC.jsx gibi sayfalara ekle:
```

```jsx
import BlockchainSelector from '../components/BlockchainSelector';

function IssueVC() {
  const [selectedChain, setSelectedChain] = useState('polygon');
  
  return (
    <div>
      <BlockchainSelector
        onSelect={(chain) => {
          setSelectedChain(chain);
          console.log('Selected chain:', chain);
        }}
        defaultChain="polygon"
        showTestnets={false}
      />
      
      {/* Issue credential button */}
      <button onClick={() => {
        // selectedChain'i kullan
        console.log('Issuing on chain:', selectedChain);
      }}>
        Issue Credential
      </button>
    </div>
  );
}
```

## 11. Production Checklist

- [x] .env dosyası oluşturuldu
- [x] JWT_SECRET değiştirildi
- [x] VC_ENCRYPTION_KEY değiştirildi
- [x] CORS_ORIGINS sunucu domainine ayarlandı
- [x] ENV=production set edildi
- [x] Paketler kuruldu (aiohttp, web3, ipfshttpclient)
- [x] Backend başlatıldı
- [x] API endpointleri test edildi
- [ ] Database columnları eklendi (optional, ilerisi için)
- [ ] Frontend rebuild edildi (npm run build)
- [ ] Nginx/Caddy reverse proxy ayarlandı

## 12. Sorun Giderme

### Backend başlamıyor?

```bash
# Log kontrol
cd /srv/worldpass/worldpass-real/backend
python app.py  # Hata mesajını gör

# Import hataları varsa
pip install -r requirements.txt
pip install aiohttp web3 ipfshttpclient
```

### CORS hatası?

.env dosyasında CORS_ORIGINS'e sunucu domainini ekle:
```env
CORS_ORIGINS=https://worldpass-beta.heptapusgroup.com,http://worldpass-beta.heptapusgroup.com
```

### 404 Not Found?

Backend routing kontrol:
```bash
curl https://worldpass-beta.heptapusgroup.com/api/health
```

Eğer 404 alıyorsan, backend doğru çalışmıyor. Logs kontrol et.

### Module not found: chain_config?

```bash
cd /srv/worldpass/worldpass-real/backend
ls -la chain_config.py  # Dosya var mı?
ls -la blockchain_endpoints.py  # Dosya var mı?
ls -la distributed_ledger.py  # Dosya var mı?
```

Yoksa tekrar oluştur (bana söyle).

## Özet - Hızlı Başlatma

```bash
# 1. Backend'e git
cd /srv/worldpass/worldpass-real/backend

# 2. .env oluştur (yukarıdaki içerikle)
nano .env

# 3. Paketleri kur
pip install aiohttp web3 ipfshttpclient

# 4. Backend başlat
ENV=production uvicorn app:app --host 0.0.0.0 --port 8000

# 5. Başka terminalde test et
curl https://worldpass-beta.heptapusgroup.com/api/blockchains/list
```

Hepsi bu! 🚀

Şu an **simulated mode** çalışıyor (IPFS ve blockchain gerçek değil ama API flow tamamen test edilebilir).

Gerçek IPFS ve blockchain için sonra Web3 entegrasyonu yapacağız.

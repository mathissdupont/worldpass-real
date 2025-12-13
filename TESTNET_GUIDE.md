# Multi-Chain Blockchain Testi - Basit Rehber

## Ne Yaptık? (Basitçe)

Credential'ların veritabanında saklanması yerine **şifreli olarak IPFS'te** saklanması ve **blockchain'e hash olarak** yazılması için sistem kurduk. Böylece:

1. ✅ Kullanıcı datası veritabanında gözükmüyor (privacy)
2. ✅ Credential değiştirilemez (blockchain'de hash var)
3. ✅ Herhangi bir blockc hain seçilebilir (maliyet/hız optimizasyonu)

**Basit Akış:**
```
1. User credential alıyor
2. Credential şifreleniyor (client-side)
3. IPFS'e yükleniyor → CID alıyor (örn: Qm1234...)
4. Blockchain'e hash yazılıyor → TX hash alıyor (örn: 0xabcd...)
5. Database'de sadece CID ve TX hash saklanıyor (credential yokken!)
```

## Test Endpointleri

### 1. Blockchain Listesini Göster
```bash
curl http://localhost:8000/api/blockchains/list
```

**Sonuç:**
```json
{
  "success": true,
  "chains": [
    {
      "key": "polygon",
      "name": "Polygon",
      "chain_id": 137,
      "gas_price": "very_low",
      "finality": 2,
      "native_token": "MATIC",
      "explorer": "https://polygonscan.com"
    },
    {
      "key": "base",
      "name": "Base",
      ...
    }
  ],
  "recommended": "polygon"
}
```

### 2. Önerilen Blockchain'i Al
```bash
curl http://localhost:8000/api/blockchains/recommended
```

**Sonuç:**
```json
{
  "success": true,
  "recommended": "polygon",
  "config": {
    "name": "Polygon",
    "gas_price": "very_low",
    "finality": 2
  },
  "reason": "Low gas fees (very_low), fast finality (2s)"
}
```

### 3. Spesifik Chain Bilgisi Al
```bash
curl http://localhost:8000/api/blockchains/polygon
```

**Sonuç:**
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

### 4. Testnet Listesi (Geliştirme İçin)
```bash
curl "http://localhost:8000/api/blockchains/list?include_testnets=true"
```

**Sonuç:**
```json
{
  "success": true,
  "chains": [
    ...normal chains...,
    {
      "key": "polygon_mumbai",
      "name": "Polygon Mumbai (Testnet)",
      "chain_id": 80001,
      "gas_price": "very_low",
      "finality": 2
    },
    {
      "key": "base_sepolia",
      "name": "Base Sepolia (Testnet)",
      "chain_id": 84532,
      ...
    }
  ],
  "recommended": "polygon_mumbai"
}
```

## Distributed Storage Test

### 5. Credential Store Et (Polygon'da)
```bash
curl -X POST http://localhost:8000/api/distributed/store \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_TOKEN" \
  -d '{
    "vc_id": "test-vc-123",
    "encrypted_payload": "SGVsbG8gV29ybGQh",
    "issuer_did": "did:key:z6MkTest",
    "subject_did": "did:key:z6MkUser",
    "chain_key": "polygon"
  }'
```

**Sonuç:**
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
  "status": "pending"
}
```

### 6. Credential Retrieve Et
```bash
curl http://localhost:8000/api/distributed/retrieve/Qm... \
  -H "x-token: YOUR_TOKEN"
```

**Sonuç:**
```json
{
  "success": true,
  "ipfs_cid": "Qm...",
  "encrypted_payload": "SGVsbG8gV29ybGQh",
  "message": "Decrypt client-side with your private key"
}
```

### 7. Credential Integrity Verify Et
```bash
curl -X POST http://localhost:8000/api/distributed/verify \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_TOKEN" \
  -d '{
    "vc_id": "test-vc-123",
    "ipfs_cid": "Qm...",
    "expected_hash": "abc123...",
    "tx_hash": "0xabc123...",
    "chain_key": "polygon"
  }'
```

**Sonuç:**
```json
{
  "success": true,
  "message": "Credential verified",
  "verified": true,
  "ipfs_hash": "abc123...",
  "expected_hash": "abc123...",
  "hash_matches": true,
  "chain": "polygon",
  "chain_name": "Polygon",
  "confirmations": 12,
  "explorer_url": "https://polygonscan.com/tx/0xabc123..."
}
```

## Frontend'te Kullanım

### Blockchain Seçici Component
```jsx
import BlockchainSelector from './components/BlockchainSelector';

function IssueCredentialForm() {
  const [selectedChain, setSelectedChain] = useState('polygon');
  
  return (
    <form>
      {/* Diğer form alanları */}
      
      <BlockchainSelector
        onSelect={(chain) => setSelectedChain(chain)}
        defaultChain="polygon"
        showTestnets={false}
      />
      
      <button onClick={async () => {
        // 1. Credential'ı şifrele (client-side)
        const encrypted = encryptCredential(credential, userPublicKey);
        
        // 2. Store et
        const response = await fetch('/api/distributed/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-token': token
          },
          body: JSON.stringify({
            vc_id: 'vc-123',
            encrypted_payload: btoa(encrypted),
            issuer_did: issuerDID,
            subject_did: userDID,
            chain_key: selectedChain  // <- seçilen chain
          })
        });
        
        const result = await response.json();
        console.log('Stored on chain:', result.chain);
        console.log('IPFS CID:', result.ipfs_cid);
        console.log('TX Hash:', result.tx_hash);
        console.log('Explorer:', result.explorer_url);
      }}>
        Issue Credential
      </button>
    </form>
  );
}
```

## Şu An Hangi Chainler Destekleniyor?

### Mainnet (Production)
1. **Polygon** ⭐ (ÖNERİLEN)
   - Gas: Çok Düşük ($0.0001/tx)
   - Hız: 2 saniye finality
   - Maliyet: ~$0.01/ay (100 tx)

2. **Base** (Coinbase L2)
   - Gas: Çok Düşük
   - Hız: 2 saniye
   - Maliyet: ~$0.01/ay

3. **Arbitrum** (Ethereum L2)
   - Gas: Düşük
   - Hız: 2 saniye

4. **Optimism** (Ethereum L2)
   - Gas: Düşük
   - Hız: 2 saniye

5. **BSC** (Binance Smart Chain)
   - Gas: Düşük
   - Hız: 3 saniye
   - Asya bölgesi için optimize

6. **Avalanche**
   - Gas: Düşük
   - Hız: 1 saniye (çok hızlı!)

7. **Gnosis**
   - Gas: Çok Düşük
   - Hız: 5 saniye
   - Topluluk projeleri için

8. **Celo**
   - Gas: Çok Düşük
   - Hız: 5 saniye
   - Mobil odaklı

9. **Ethereum**
   - Gas: Çok Yüksek ($2-20/tx)
   - Hız: 12 saniye
   - Maksimum güvenlik

### Testnet (Development)
1. **Polygon Mumbai** ⭐ (ÖNERİLEN)
   - Ücretsiz test MATIC: https://faucet.polygon.technology/

2. **Base Sepolia**
   - Ücretsiz test ETH: https://www.coinbase.com/faucets/base-sepolia-faucet

## Testnet'te Nasıl Test Ederiz?

### 1. Backend'i Testnet Moduna Al
```bash
# .env dosyasına ekle
ENV=development

# Ya da
export ENV=development
```

### 2. Testnet Chain Listesini Al
```bash
curl "http://localhost:8000/api/blockchains/list?include_testnets=true"
```

### 3. Polygon Mumbai'yi Kullan
```bash
curl -X POST http://localhost:8000/api/distributed/store \
  -H "Content-Type: application/json" \
  -d '{
    "vc_id": "test-vc-123",
    "encrypted_payload": "SGVsbG8gV29ybGQh",
    "issuer_did": "did:key:z6MkTest",
    "subject_did": "did:key:z6MkUser",
    "chain_key": "polygon_mumbai"
  }'
```

### 4. Transaction'ı Explorer'da Gör
Response'daki `explorer_url`'i aç:
```
https://mumbai.polygonscan.com/tx/0xabc123...
```

## Maliyet Karşılaştırması (Aylık)

**Senaryo: 100 credential/ay**

| Chain        | Gas/TX     | Aylık Maliyet |
|-------------|-----------|---------------|
| Polygon     | $0.0001   | **$0.01**     |
| Base        | $0.0001   | **$0.01**     |
| Arbitrum    | $0.0005   | $0.05         |
| Optimism    | $0.0005   | $0.05         |
| BSC         | $0.005    | $0.50         |
| Avalanche   | $0.01     | $1.00         |
| Gnosis      | $0.0001   | $0.01         |
| Celo        | $0.0001   | $0.01         |
| Ethereum    | $5-50     | **$500-5000** |

**Öneri:** Production'da **Polygon** kullan (düşük maliyet + hızlı)

## Sırada Ne Var?

### Şu An Çalışıyor:
- ✅ Multi-chain configuration
- ✅ API endpoints
- ✅ Frontend blockchain selector
- ✅ Chain comparison ve recommendation

### Eksik (Simulated):
- ⏳ IPFS node bağlantısı (şu an local hash dönüyor)
- ⏳ Web3.py entegrasyonu (şu an simulated TX)
- ⏳ Smart contract deployment (her chain için ayrı)

### Web3 Entegrasyonu İçin:
```bash
pip install web3 ipfshttpclient

# IPFS node başlat (ya da Infura/Pinata kullan)
docker run -d -p 5001:5001 ipfs/go-ipfs

# .env'e ekle
IPFS_API_URL=http://localhost:5001
BLOCKCHAIN_RPC_POLYGON=https://polygon-rpc.com
CONTRACT_POLYGON=0x...  # Deploy edilecek
```

## Özet

**Ne Yaptık:**
- 10+ blockchain desteği ekledik
- Her chain için maliyet, hız, finality bilgileri
- API endpointleri (/api/blockchains/*)
- Frontend selector component
- Testnet desteği

**Nasıl Test Ederiz:**
1. Backend başlat: `uvicorn app:app --reload`
2. Testnet modunu aç: `ENV=development`
3. Chain listesini çek: `GET /api/blockchains/list?include_testnets=true`
4. Polygon Mumbai seç (ücretsiz)
5. Store endpoint test et (simulated TX dönecek)

**Production'da Kullanım:**
1. Smart contract deploy et (her chain için)
2. IPFS node ayarla (ya da Infura/Pinata)
3. Web3.py entegre et
4. Polygon mainnet kullan (düşük maliyet)

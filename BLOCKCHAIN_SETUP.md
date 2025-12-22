# Blockchain Entegrasyonu - Sıfırdan Kurulum Rehberi

WorldPass için Polygon testnet üzerinde VC anchor kontratı deployment ve backend entegrasyonu.

## Önkoşullar - Kurulması Gerekenler

### 1. Node.js ve npm Kurulumu

**Windows için:**
1. [Node.js İndirme Sayfası](https://nodejs.org/) - LTS versiyonu indir (v20 veya üzeri)
2. İndirdiğin `.msi` dosyasını çalıştır
3. Kurulum sırasında "Automatically install the necessary tools" seçeneğini işaretle
4. Kurulum bitince PowerShell'i yeniden başlat

**Kurulum kontrolü:**
```powershell
node --version
npm --version
```

Çıktı: `v20.x.x` ve `10.x.x` gibi versiyonlar görmelisin.

### 2. Git Kurulumu (Eğer yoksa)

**Windows için:**
1. [Git İndirme](https://git-scm.com/download/win) - Git for Windows indir
2. Kurulum yap (varsayılan ayarlarla)
3. PowerShell'i yeniden başlat

**Kontrol:**
```powershell
git --version
```

### 3. MetaMask Wallet Kurulumu

**Tarayıcı Extension:**
1. [MetaMask Chrome Extension](https://metamask.io/download/)
2. Yeni wallet oluştur veya var olanı import et
3. **Recovery phrase'i güvenli bir yere yaz** (12 kelime)

**Polygon Testnet Ekleme (Önerilen: Amoy):**

> Not: 2025 itibarıyla Polygon Mumbai testnet pratikte deprecated/sunset sayılıyor. Yeni testnet olarak **Polygon Amoy** kullanman daha sağlıklı.

**Polygon Amoy (Önerilen) Network Bilgileri:**

```
Network Name: Polygon Amoy
RPC URL: https://rpc-amoy.polygon.technology
Chain ID: 80002
Currency Symbol: MATIC
Block Explorer: https://amoy.polygonscan.com
```

**Polygon Mumbai (Legacy) Network Bilgileri:**
1. MetaMask'ta Networks dropdown → "Add Network"
2. Aşağıdaki bilgileri gir:

```
Network Name: Polygon Mumbai
RPC URL: https://rpc-mumbai.maticvigil.com
Chain ID: 80001
Currency Symbol: MATIC
Block Explorer: https://mumbai.polygonscan.com
```

3. "Save" butonuna tıkla

### 4. Test MATIC Alma (Faucet)

Mumbai testnet'te işlem yapmak için ücretsiz test MATIC lazım:

1. MetaMask'ta Mumbai network'üne geç
2. Wallet adresini kopyala (0x... ile başlayan)
3. [Polygon Mumbai Faucet](https://faucet.polygon.technology/) - buraya git
4. Adresini yapıştır ve "Submit" butonuna bas
5. 1-2 dakika içinde 0.5 test MATIC gelecek

**Alternatif faucetler:**
- https://mumbaifaucet.com/
- https://faucet.quicknode.com/polygon/mumbai

**Balance kontrolü:** MetaMask'ta Mumbai network'ündeyken bakiyeni görebilirsin.

---

## Proje Kurulumu

### 1. Hardhat Projesi

Bu repoda deploy için hazır minimal bir Hardhat projesi var: `worldpass/blockchain/`.

İstersen sıfırdan kurmak yerine direkt onu kullan:

```powershell
cd C:\Users\samet\OneDrive\Masaüstü\worldpass\blockchain
npm install
copy .env.example .env
```

`.env` içine `PRIVATE_KEY` girmen yeterli.

> Not: Kontrat dosyası repo root'ta: `worldpass/contracts/VCAnchor.sol`

---

### 1 (Alternatif). Hardhat Projesi Oluşturma (Sıfırdan)

Workspace içinde blockchain klasörü oluştur:

```powershell
cd C:\Users\samet\OneDrive\Masaüstü\worldpass
mkdir blockchain
cd blockchain
```

**Hardhat kurulumu:**
```powershell
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

Sorulara cevaplar:
- "Create a JavaScript project" seç
- ".gitignore" ekle → Yes
- Dependencies yükle → Yes

**Ek paketler:**
```powershell
npm install --save-dev @openzeppelin/contracts
npm install dotenv
```

### 2. Proje Yapısı

Hardhat init sonrası şu yapı oluşacak:

```
blockchain/
├── contracts/          # Solidity kontratları
├── scripts/           # Deployment scriptleri
├── test/              # Test dosyaları
├── hardhat.config.js  # Hardhat konfigürasyonu
├── .env               # Private keys (GİT'E EKLENMEMELİ!)
└── package.json
```

### 3. Environment Variables Ayarlama

**`.env` dosyası oluştur:**
```powershell
cd C:\Users\samet\OneDrive\Masaüstü\worldpass\blockchain
New-Item .env -ItemType File
```

**`.env` içeriği:**
```env
# MetaMask private key (GÜVENLİ TUT! - Git'e ekleme)
PRIVATE_KEY=buraya_metamask_private_key_yapistir

# Amoy RPC URL (Önerilen)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# Mumbai RPC URL (Legacy)
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# PolygonScan API Key (contract verify için - opsiyonel)
POLYGONSCAN_API_KEY=
```

**Private key nasıl alınır (MetaMask):**
1. MetaMask'ı aç
2. Sağ üstteki 3 nokta → Account details
3. "Export Private Key" → Şifreni gir
4. Private key'i kopyala (0x ile başlayan 64 karakterlik hex)
5. `.env` dosyasına yapıştır

**⚠️ GÜVENLİK NOTU:** Private key'i asla kimseyle paylaşma ve Git'e ekleme!

### 4. Hardhat Konfigürasyonu

**`hardhat.config.js` dosyasını düzenle:**

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gasPrice: 20000000000, // 20 gwei
    },
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY || "",
  },
};
```

### 5. .gitignore Güncelleme

**`blockchain/.gitignore` dosyasına ekle:**
```
node_modules
.env
coverage
coverage.json
typechain
typechain-types

# Hardhat files
cache
artifacts
```

**Ana proje `.gitignore`'a da ekle:**
```
# Blockchain
blockchain/.env
blockchain/node_modules/
blockchain/cache/
blockchain/artifacts/
```

---

## Smart Contract Yazma

### 1. VCAnchor Kontratı

**`contracts/VCAnchor.sol` dosyası oluştur:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VCAnchor
 * @dev Verifiable Credential hash anchoring on Polygon
 * @notice Stores VC hashes and IPFS CIDs on-chain for immutability
 */
contract VCAnchor {
    // Struct for anchored VC metadata
    struct AnchorRecord {
        bytes32 vcHash;      // SHA256 hash of VC payload
        string ipfsCid;      // IPFS content identifier
        address issuer;      // Issuer wallet address
        uint256 timestamp;   // Block timestamp
        bool revoked;        // Revocation status
    }
    
    // Mapping: vcHash => AnchorRecord
    mapping(bytes32 => AnchorRecord) public anchors;
    
    // Events
    event VCAnchored(
        bytes32 indexed vcHash,
        string ipfsCid,
        address indexed issuer,
        uint256 timestamp
    );
    
    event VCRevoked(
        bytes32 indexed vcHash,
        address indexed revoker,
        uint256 timestamp
    );
    
    /**
     * @notice Anchor a VC hash on-chain
     * @param vcHash SHA256 hash of the VC payload
     * @param ipfsCid IPFS content identifier
     */
    function anchorVC(bytes32 vcHash, string memory ipfsCid) external {
        require(vcHash != bytes32(0), "Invalid VC hash");
        require(bytes(ipfsCid).length > 0, "Invalid IPFS CID");
        require(anchors[vcHash].timestamp == 0, "VC already anchored");
        
        anchors[vcHash] = AnchorRecord({
            vcHash: vcHash,
            ipfsCid: ipfsCid,
            issuer: msg.sender,
            timestamp: block.timestamp,
            revoked: false
        });
        
        emit VCAnchored(vcHash, ipfsCid, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Revoke an anchored VC
     * @param vcHash SHA256 hash of the VC to revoke
     */
    function revokeVC(bytes32 vcHash) external {
        AnchorRecord storage record = anchors[vcHash];
        require(record.timestamp != 0, "VC not found");
        require(record.issuer == msg.sender, "Only issuer can revoke");
        require(!record.revoked, "VC already revoked");
        
        record.revoked = true;
        emit VCRevoked(vcHash, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Check if a VC is anchored and valid
     * @param vcHash SHA256 hash of the VC
     * @return exists Whether VC is anchored
     * @return revoked Whether VC is revoked
     * @return ipfsCid IPFS CID
     * @return issuer Issuer address
     * @return timestamp Anchor timestamp
     */
    function getAnchor(bytes32 vcHash) 
        external 
        view 
        returns (
            bool exists,
            bool revoked,
            string memory ipfsCid,
            address issuer,
            uint256 timestamp
        ) 
    {
        AnchorRecord memory record = anchors[vcHash];
        exists = record.timestamp != 0;
        revoked = record.revoked;
        ipfsCid = record.ipfsCid;
        issuer = record.issuer;
        timestamp = record.timestamp;
    }
}
```

### 2. Kontratı Derleme

```powershell
cd C:\Users\samet\OneDrive\Masaüstü\worldpass\blockchain
npx hardhat compile
```

Başarılı olursa:
```
Compiled 1 Solidity file successfully
```

`artifacts/` klasöründe ABI ve bytecode oluşacak.

---

## Deployment

### 1. Deploy Script Oluşturma

**`scripts/deploy.js` dosyası oluştur:**

```javascript
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying VCAnchor contract to Polygon Mumbai...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MATIC\n");

  if (balance === 0n) {
    console.error("❌ No MATIC balance! Get test MATIC from faucet first.");
    process.exit(1);
  }

  // Deploy contract
  const VCAnchor = await hre.ethers.getContractFactory("VCAnchor");
  const vcAnchor = await VCAnchor.deploy();

  await vcAnchor.waitForDeployment();
  const contractAddress = await vcAnchor.getAddress();

  console.log("✅ VCAnchor deployed to:", contractAddress);
  console.log("🔗 Explorer:", `https://mumbai.polygonscan.com/address/${contractAddress}\n`);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: "mumbai",
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: 80001,
  };

  fs.writeFileSync(
    "deployment-mumbai.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📄 Deployment info saved to: deployment-mumbai.json");
  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("1. Copy contract address to backend .env:");
  console.log(`   CONTRACT_POLYGON_MUMBAI=${contractAddress}`);
  console.log("2. Update backend/distributed_ledger.py to use this address");
  console.log("3. Set ANCHOR_MODE=real in backend environment");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 2. Amoy'a Deploy Etme (Önerilen)

```powershell
cd C:\Users\samet\OneDrive\Masaüstü\worldpass\blockchain
npm run deploy:amoy
```

### 2 (Alternatif). Mumbai'ye Deploy Etme (Legacy)

**Deploy komutu:**
```powershell
cd C:\Users\samet\OneDrive\Masaüstü\worldpass\blockchain
npm run deploy:mumbai
```

**Beklenen çıktı:**
```
🚀 Deploying VCAnchor contract to Polygon Mumbai...

📝 Deploying with account: 0xYourAddress...
💰 Account balance: 0.5 MATIC

✅ VCAnchor deployed to: 0xContractAddress...
🔗 Explorer: https://mumbai.polygonscan.com/address/0xContractAddress...

📄 Deployment info saved to: deployment-mumbai.json

🎉 Deployment complete!
```

### 3. Kontrat Doğrulama (Opsiyonel)

PolygonScan'de kaynak kodunu yayınlamak için:

```powershell
npx hardhat verify --network mumbai 0xContractAddress
```

---

## Backend Entegrasyonu

Kontrat deploy olduktan sonra backend'de kullanmak için:

**1. Backend `.env` dosyasına ekle:**
```env
# Blockchain Anchor Settings
ANCHOR_MODE=real
DEPLOYER_PRIVATE_KEY=0xYourPrivateKey

# Eğer Amoy'a deploy ettiysen:
CONTRACT_POLYGON_AMOY=0xYourContractAddress

# Eğer Mumbai'ye deploy ettiysen (legacy):
CONTRACT_POLYGON_MUMBAI=0xYourContractAddress
```

**2. Backend'de `web3.py` kullanımı:**
- `distributed_ledger.py` güncellemesi
- Real tx gönderme
- Gas estimation ve tx tracking

Bu kısım sonraki adımda detaylandırılacak.

---

## Kontrol Listesi

Kurulumun tamamlandığından emin olmak için:

- [ ] Node.js kurulu (`node --version`)
- [ ] npm kurulu (`npm --version`)
- [ ] Git kurulu (`git --version`)
- [ ] MetaMask extension kurulu
- [ ] Mumbai network eklendi
- [ ] Test MATIC alındı (0.5 MATIC yeterli)
- [ ] Private key `.env` dosyasında
- [ ] Hardhat projesi oluşturuldu
- [ ] VCAnchor kontratı yazıldı
- [ ] Kontrat derlendi (`npx hardhat compile`)
- [ ] Kontrat Mumbai'ye deploy edildi
- [ ] Contract address kaydedildi

---

## Sorun Giderme

### "Insufficient funds" hatası
- Mumbai faucet'ten test MATIC al
- MetaMask'ta Mumbai network'ünde olduğundan emin ol

### "Private key" hatası
- `.env` dosyasında `PRIVATE_KEY` doğru mu kontrol et
- Private key'in başında `0x` olmalı

### RPC timeout
- Farklı RPC provider dene:
  - https://polygon-mumbai.g.alchemy.com/v2/demo
  - https://rpc-mumbai.maticvigil.com

### Contract verify hatası
- PolygonScan API key al: https://polygonscan.com/apis
- `.env` dosyasına ekle

---

## Kaynaklar

- [Hardhat Dokümantasyon](https://hardhat.org/docs)
- [Polygon Mumbai Faucet](https://faucet.polygon.technology/)
- [Mumbai Explorer](https://mumbai.polygonscan.com/)
- [Solidity Dokümantasyon](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

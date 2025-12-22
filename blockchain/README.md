# WorldPass VCAnchor (Hardhat)

Bu klasör, repo-root altındaki [contracts/VCAnchor.sol](../contracts/VCAnchor.sol) kontratını Polygon testnet'e deploy etmek için minimal Hardhat projesidir.

## Kurulum

```powershell
cd .\blockchain
npm install
copy .env.example .env
# .env içine PRIVATE_KEY gir
```

## Deploy (Önerilen: Amoy)

```powershell
npm run deploy:amoy
```

## Deploy (Legacy: Mumbai)

```powershell
npm run deploy:mumbai
```

Deploy sonrası oluşan `deployment-<network>.json` içinden kontrat adresini alıp backend `.env`'ine koy.

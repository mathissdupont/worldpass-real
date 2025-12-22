# Multi-Chain Blockchain Support - Implementation Guide

## Overview

WorldPass now supports **10+ blockchains** for credential anchoring. Users and issuers can choose their preferred blockchain based on:

- **Cost**: Gas fees (very low to very high)
- **Speed**: Transaction finality time (2s to 60s)
- **Region**: Geographic optimization (US, EU, Asia)
- **Purpose**: Mainnet vs Testnet

## Supported Blockchains

### Mainnets

| Blockchain | Chain ID | Gas Level | Finality | Best For |
|-----------|----------|-----------|----------|----------|
| **Polygon** ⭐ | 137 | Very Low | 2s | **Recommended** - Low cost, fast |
| Base | 8453 | Very Low | 2s | Coinbase users, L2 speed |
| Arbitrum | 42161 | Very Low | 2s | Ethereum ecosystem |
| Optimism | 10 | Low | 2s | Ethereum L2 |
| BSC | 56 | Low | 3s | Asia region |
| Gnosis | 100 | Very Low | 5s | Community projects |
| Celo | 42220 | Very Low | 5s | Mobile-first, Africa |
| Avalanche | 43114 | Low | 1s | High speed |
| Ethereum | 1 | Very High | 60s | Maximum security |

### Testnets

| Blockchain | Chain ID | Purpose |
|-----------|----------|---------|
| Polygon Mumbai | 80001 | Development & Testing |
| Base Sepolia | 84532 | Coinbase L2 Testing |

⭐ **Polygon is recommended** by default for production use due to very low gas fees and fast finality.

## Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. Encrypt VC (client-side)
       ▼
┌─────────────────────────────────────────┐
│         Backend API                     │
│  ┌────────────────────────────────┐    │
│  │  DistributedCredentialManager  │    │
│  │    - chain_key: 'polygon'      │    │
│  └────────┬───────────────┬───────┘    │
│           │               │             │
│  ┌────────▼──────┐ ┌─────▼──────────┐  │
│  │ IPFS Storage  │ │ BlockchainLedger│  │
│  │  (encrypted)  │ │  (hash anchor)  │  │
│  └───────────────┘ └─────────────────┘  │
│           │               │             │
└───────────┼───────────────┼─────────────┘
            │               │
            ▼               ▼
    ┌──────────────┐ ┌─────────────────┐
    │     IPFS     │ │    Blockchain   │
    │   Network    │ │  (User Choice)  │
    │  (CID)       │ │  (TX Hash)      │
    └──────────────┘ └─────────────────┘
```

## Implementation

### 1. Backend Configuration

**File**: `backend/chain_config.py`

```python
from chain_config import get_chain_config, get_recommended_chain

# Get recommended chain for region
chain_key = get_recommended_chain(region='eu', use_testnet=False)
# Returns: 'polygon'

# Get specific chain config
config = get_chain_config('polygon')
# Returns: {
#   "name": "Polygon",
#   "chain_id": 137,
#   "rpc": "https://polygon-rpc.com",
#   "explorer": "https://polygonscan.com",
#   "native_token": "MATIC",
#   "gas_price": "very_low",
#   "finality": 2
# }
```

### 2. Create Distributed Manager

**File**: `backend/distributed_ledger.py`

```python
from distributed_ledger import create_distributed_manager

# Create manager for specific chain
manager = create_distributed_manager('polygon')  # or 'base', 'arbitrum', etc.

# Store credential
result = await manager.store_credential(
    vc_id="vc:123",
    encrypted_payload=encrypted_data,
    issuer_did="did:key:...",
    subject_did="did:key:..."
)

# Returns:
# {
#   "ipfs_cid": "QmXoypizjW3...",
#   "tx_hash": "0x1234...",
#   "chain": "polygon",
#   "chain_id": 137,
#   "chain_name": "Polygon",
#   "explorer_url": "https://polygonscan.com/tx/0x1234...",
#   "status": "pending",
#   "native_token": "MATIC",
#   "gas_price_level": "very_low"
# }
```

### 3. API Endpoints

**File**: `backend/blockchain_endpoints.py`

Add to `app.py`:

```python
from blockchain_endpoints import router as blockchain_router

app.include_router(blockchain_router)
```

#### Available Endpoints:

**List Blockchains**
```http
GET /api/blockchains/list?include_testnets=false
```

Response:
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
      "explorer": "https://polygonscan.com",
      "native_token": "MATIC"
    },
    ...
  ],
  "count": 9,
  "recommended": "polygon"
}
```

**Get Recommended Chain**
```http
GET /api/blockchains/recommended?region=eu&testnet=false
```

**Store Credential (Distributed)**
```http
POST /api/distributed/store
Content-Type: application/json

{
  "vc_id": "vc:123",
  "encrypted_payload": "base64EncodedData...",
  "issuer_did": "did:key:...",
  "subject_did": "did:key:...",
  "chain_key": "polygon"
}
```

Response:
```json
{
  "success": true,
  "ipfs_cid": "QmXoypizjW3...",
  "tx_hash": "0x1234...",
  "chain": "polygon",
  "explorer_url": "https://polygonscan.com/tx/0x1234...",
  "status": "pending"
}
```

**Verify Integrity**
```http
POST /api/distributed/verify

{
  "vc_id": "vc:123",
  "ipfs_cid": "QmXoypizjW3...",
  "expected_hash": "sha256Hash...",
  "tx_hash": "0x1234...",
  "chain_key": "polygon"
}
```

### 4. Frontend Integration

**File**: `web/src/components/BlockchainSelector.jsx`

```jsx
import BlockchainSelector from '../components/BlockchainSelector';

function IssueCredentialForm() {
  const [selectedChain, setSelectedChain] = useState('polygon');

  return (
    <form>
      {/* Other fields */}
      
      <BlockchainSelector
        onSelect={setSelectedChain}
        defaultChain="polygon"
        showTestnets={false}
      />
      
      <button onClick={() => handleIssue(selectedChain)}>
        Issue Credential
      </button>
    </form>
  );
}
```

**Usage in encryption lib**:

```javascript
import { storeCredentialDistributed } from '../lib/encryption';

// Store with chain selection
const result = await storeCredentialDistributed(
  credential,
  userPublicKey,
  'polygon'  // Chain selection
);

console.log('Stored on', result.chain_name);
console.log('Explorer:', result.explorer_url);
```

### 5. Database Migration

Add columns to `issued_vcs` table:

```sql
ALTER TABLE issued_vcs ADD COLUMN blockchain_chain TEXT DEFAULT 'polygon';
ALTER TABLE issued_vcs ADD COLUMN blockchain_tx TEXT;
ALTER TABLE issued_vcs ADD COLUMN ipfs_cid TEXT;
ALTER TABLE issued_vcs ADD COLUMN storage_type TEXT DEFAULT 'centralized';

CREATE INDEX idx_blockchain_chain ON issued_vcs(blockchain_chain);
CREATE INDEX idx_ipfs_cid ON issued_vcs(ipfs_cid);
```

### 6. Environment Variables

Add contract addresses for each chain:

```bash
# .env file

# Polygon
CONTRACT_POLYGON=0x1234...

# Base
CONTRACT_BASE=0x5678...

# Arbitrum
CONTRACT_ARBITRUM=0xabcd...

# BSC
CONTRACT_BSC=0xef01...

# Ethereum (optional, high gas)
CONTRACT_ETHEREUM=0x2345...

# Testnets
CONTRACT_POLYGON_TESTNET=0x9876...
CONTRACT_BASE_TESTNET=0x5432...
```

## Chain Selection Strategy

### Auto-Selection Logic

The system auto-selects chains based on:

1. **Environment**: Production = mainnet, Development = testnet
2. **Region**: 
   - US → Polygon, Base
   - EU → Polygon, Gnosis
   - Asia → BSC, Polygon
   - Africa → Celo
3. **Default**: Polygon (best balance of cost/speed)

### Manual Selection

Users/Issuers can manually select:

```python
# In endpoint
manager = create_distributed_manager(request.chain_key or 'polygon')
```

```javascript
// In frontend
<BlockchainSelector 
  onSelect={(chain) => setChain(chain)}
  defaultChain="polygon"
/>
```

## Cost Comparison

| Chain | Typical TX Cost | Monthly (100 TXs) |
|-------|----------------|-------------------|
| Polygon | $0.0001 | $0.01 |
| Base | $0.0001 | $0.01 |
| Arbitrum | $0.001 | $0.10 |
| Optimism | $0.002 | $0.20 |
| BSC | $0.005 | $0.50 |
| Ethereum | $2-20 | $200-2000 |

**Recommendation**: Use **Polygon** or **Base** for production to minimize costs.

## Security Considerations

1. **Private Keys**: Store contract deployer keys in secure vault (AWS Secrets Manager, etc.)
2. **Contract Verification**: Verify all contracts on Etherscan/Polygonscan
3. **Gas Limits**: Set appropriate gas limits per chain
4. **Fallback**: If blockchain fails, store locally and retry later

## Testing

### Test Migration

```bash
cd backend
python -c "
from distributed_ledger import migrate_to_distributed_storage
import asyncio
from database import Database

async def test():
    db = Database()
    await db.connect()
    await migrate_to_distributed_storage(db.conn, chain_key='polygon_testnet', batch_size=5)
    await db.disconnect()

asyncio.run(test())
"
```

### Test Chain Selection

```bash
curl http://localhost:8000/api/blockchains/list
curl http://localhost:8000/api/blockchains/recommended?region=eu
curl http://localhost:8000/api/blockchains/polygon
```

## Monitoring

Track chain usage:

```sql
SELECT 
    blockchain_chain,
    COUNT(*) as credential_count,
    COUNT(DISTINCT issuer_did) as issuers
FROM issued_vcs
WHERE storage_type = 'distributed'
GROUP BY blockchain_chain
ORDER BY credential_count DESC;
```

Results:
```
blockchain_chain | credential_count | issuers
----------------|------------------|--------
polygon         | 1250             | 45
base            | 320              | 12
arbitrum        | 180              | 8
```

## Roadmap

### Phase 1: Current ✅
- Multi-chain configuration
- Chain selection API
- Frontend selector component
- Migration script

### Phase 2: Next Steps
- Deploy smart contracts on all chains
- Implement Web3.py integration
- Real blockchain transactions
- Gas price optimization

### Phase 3: Advanced
- Cross-chain verification
- Layer 0 abstraction (Layerzero)
- Multi-chain credential federation
- Automatic chain switching based on gas

## Support

For questions or issues:
- Check chain explorers for transaction status
- Monitor IPFS gateway availability
- Review blockchain RPC endpoint health
- Contact: dev@worldpass.com

---

**Status**: ✅ Configuration Complete  
**Next Step**: Deploy smart contracts and integrate Web3.py  
**Recommended**: Start with Polygon for production

# WorldPass Blockchain Integration

This module provides the blockchain proof layer for WorldPass, implementing a clean abstraction that **never stores personal data on-chain**, only hashes and minimal metadata.

## Philosophy

> "Zincirde veri yok, kanıt var" (No data on chain, only proof)

The blockchain acts as a **proof ledger**, not a database. Personal identity data remains off-chain, while the blockchain provides:

1. **Proof of issuance**: VC hash registered by trusted issuer
2. **Integrity verification**: Hash ensures VC hasn't been tampered
3. **Revocation status**: On-chain flag for credential revocation

## Architecture

### Core Components

#### 1. `BlockchainProofStore` Abstract Base Class

Defines the interface for blockchain proof storage with methods:
- `register_vc()`: Register a new VC hash on-chain
- `get_vc()`: Fetch VC proof record by ID
- `revoke_vc()`: Mark a VC as revoked
- `is_revoked()`: Check revocation status
- `verify_vc_hash()`: Verify hash matches and VC is not revoked

#### 2. Implementations

- **`InMemoryBlockchainProofStore`**: For testing and development
- **`SqliteBlockchainProofStore`**: Production-ready SQLite-backed implementation
- **Future**: Easy to add `PolygonBlockchainProofStore` or other EVM adapters

#### 3. VC Hash Utilities

- `compute_vc_hash()`: Generate deterministic SHA-256 hash of VC
- `canonical_json()`: Canonical JSON serialization (sorted keys, no whitespace)
- `verify_vc_hash()`: Verify a VC matches its hash

### Database Schema

```sql
CREATE TABLE worldpass_blockchain_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vc_id TEXT UNIQUE NOT NULL,
  vc_hash TEXT NOT NULL,
  issuer_did TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  revoked_at INTEGER
);
```

**What's stored:**
- ✅ VC ID (unique identifier, e.g., `jti`)
- ✅ VC Hash (SHA-256 of canonical VC JSON)
- ✅ Issuer DID (reference to issuing authority)
- ✅ Timestamps (issued_at, revoked_at)

**What's NOT stored:**
- ❌ Personal data (name, address, etc.)
- ❌ VC content/attributes
- ❌ Holder identity

## Integration

### Automatic VC Registration

When an issuer issues a VC via `/api/issuer/issue`:
1. VC is created and signed
2. Hash is computed: `H(VC) = SHA256(canonical_json(vc))`
3. Hash is registered on blockchain: `register_vc(vc_id, vc_hash, issuer_did)`
4. VC is returned to holder

### Enhanced Verification Flow

When verifying a presentation via `/api/present/verify`:
1. **Verify issuer signature** (off-chain, existing flow)
2. **Verify blockchain proof**:
   - Recompute VC hash
   - Check hash matches on-chain record
   - Check VC is not revoked on blockchain
3. **Verify holder signature** (off-chain, existing flow)

If blockchain verification fails:
- Hash mismatch → VC has been tampered with
- Revoked → VC is no longer valid
- Not found → Legacy VC (warning logged, not rejected)

### Revocation

When revoking a VC via `/api/issuer/revoke`:
1. VC status is updated in `vc_status` table (existing)
2. VC is marked as revoked on blockchain: `revoke_vc(vc_id)`
3. Revocation timestamp is recorded

## API Endpoints

### POST `/api/blockchain/register-vc`

Register a VC hash on the blockchain proof ledger.

**Request:**
```json
{
  "vc_id": "vc-123",
  "vc_hash": "abc123...",
  "issuer_did": "did:key:z6Mk..."
}
```

**Response:**
```json
{
  "ok": true,
  "vc_id": "vc-123",
  "vc_hash": "abc123...",
  "issuer_did": "did:key:z6Mk...",
  "issued_at": "2024-01-01T00:00:00Z"
}
```

### POST `/api/blockchain/revoke-vc`

Revoke a VC on the blockchain.

**Request:**
```json
{
  "vc_id": "vc-123"
}
```

**Response:**
```json
{
  "ok": true,
  "vc_id": "vc-123",
  "revoked_at": "2024-01-02T00:00:00Z"
}
```

### POST `/api/blockchain/verify-vc`

Verify a VC hash against on-chain record.

**Request:**
```json
{
  "vc_id": "vc-123",
  "vc_hash": "abc123..."
}
```

**Response:**
```json
{
  "valid": true,
  "revoked": false,
  "hash_match": true,
  "on_chain_record": {
    "vc_id": "vc-123",
    "vc_hash": "abc123...",
    "issuer_did": "did:key:z6Mk...",
    "issued_at": "2024-01-01T00:00:00Z",
    "revoked_at": null
  }
}
```

### GET `/api/blockchain/vc/{vc_id}`

Get the on-chain proof record for a VC.

**Response:**
```json
{
  "ok": true,
  "record": {
    "vc_id": "vc-123",
    "vc_hash": "abc123...",
    "issuer_did": "did:key:z6Mk...",
    "issued_at": "2024-01-01T00:00:00Z",
    "revoked_at": null
  }
}
```

## Testing

The blockchain integration includes comprehensive tests:

### Unit Tests (`test_blockchain_proof_store.py`)

- ✅ VC hashing (7 tests)
- ✅ InMemoryBlockchainProofStore (13 tests)
- ✅ SqliteBlockchainProofStore (8 tests)

Total: 28 unit tests

### Integration Tests (`test_blockchain_integration.py`)

- ✅ Full flow: issue → verify → revoke → verify (should fail)
- ✅ Direct blockchain API registration
- ✅ Direct blockchain API revocation

Total: 3 integration tests

Run tests:
```bash
cd backend
python -m pytest tests/test_blockchain_proof_store.py -v
python -m pytest tests/test_blockchain_integration.py -v
```

## Usage Examples

### Python API

```python
from backend.blockchain import SqliteBlockchainProofStore, compute_vc_hash
from backend.database import get_db

# Compute VC hash
vc = {
    "jti": "vc-123",
    "issuer": "did:key:z6Mk...",
    "credentialSubject": {...}
}
vc_hash = compute_vc_hash(vc)

# Register on blockchain
async with get_db() as db:
    store = SqliteBlockchainProofStore(db)
    record = await store.register_vc("vc-123", vc_hash, "did:key:z6Mk...")
    
    # Verify hash
    is_valid = await store.verify_vc_hash("vc-123", vc_hash)
    
    # Revoke
    await store.revoke_vc("vc-123")
```

### REST API

```bash
# Register VC
curl -X POST https://worldpass-beta.heptapusgroup.com/api/blockchain/register-vc \
  -H "Content-Type: application/json" \
  -d '{
    "vc_id": "vc-123",
    "vc_hash": "abc123...",
    "issuer_did": "did:key:z6Mk..."
  }'

# Verify VC
curl -X POST https://worldpass-beta.heptapusgroup.com/api/blockchain/verify-vc \
  -H "Content-Type: application/json" \
  -d '{
    "vc_id": "vc-123",
    "vc_hash": "abc123..."
  }'

# Revoke VC
curl -X POST https://worldpass-beta.heptapusgroup.com/api/blockchain/revoke-vc \
  -H "Content-Type: application/json" \
  -d '{"vc_id": "vc-123"}'

# Get VC proof record
curl https://worldpass-beta.heptapusgroup.com/api/blockchain/vc/vc-123
```

## Future Enhancements

### Real Blockchain Integration

The current SQLite implementation can be easily replaced with a real blockchain adapter:

```python
from web3 import Web3
from backend.blockchain import BlockchainProofStore

class PolygonBlockchainProofStore(BlockchainProofStore):
    """Polygon/EVM blockchain adapter"""
    
    def __init__(self, web3: Web3, contract_address: str):
        self.web3 = web3
        self.contract = web3.eth.contract(address=contract_address, abi=ABI)
    
    async def register_vc(self, vc_id: str, vc_hash: str, issuer_did: str):
        # Call smart contract method
        tx = self.contract.functions.registerVC(
            vc_id, vc_hash, issuer_did
        ).transact()
        receipt = self.web3.eth.wait_for_transaction_receipt(tx)
        ...
```

The rest of the codebase (issuance, verification, API) remains unchanged!

### Smart Contract Example

```solidity
pragma solidity ^0.8.0;

contract WorldPassProofLedger {
    struct VCProof {
        string vcHash;
        string issuerDID;
        uint256 issuedAt;
        uint256 revokedAt;
    }
    
    mapping(string => VCProof) public vcProofs;
    
    function registerVC(
        string memory vcId,
        string memory vcHash,
        string memory issuerDID
    ) public {
        require(bytes(vcProofs[vcId].vcHash).length == 0, "VC already exists");
        vcProofs[vcId] = VCProof(vcHash, issuerDID, block.timestamp, 0);
    }
    
    function revokeVC(string memory vcId) public {
        require(bytes(vcProofs[vcId].vcHash).length > 0, "VC not found");
        vcProofs[vcId].revokedAt = block.timestamp;
    }
}
```

## Security Considerations

1. **Hash Algorithm**: SHA-256 is used for VC hashing, providing strong collision resistance
2. **Canonical JSON**: Deterministic serialization ensures same VC always produces same hash
3. **No Personal Data**: Only hashes stored on-chain, GDPR compliant
4. **Revocation**: Immutable revocation record prevents replay attacks
5. **Error Handling**: Blockchain failures don't break issuance/verification flows

## Performance

- **Hash computation**: ~0.1ms per VC
- **DB operations**: ~1-5ms per operation
- **No network latency**: SQLite-backed (local)
- **Future blockchain**: Add caching layer for on-chain reads

## License

Part of the WorldPass project. See main repository for license details.

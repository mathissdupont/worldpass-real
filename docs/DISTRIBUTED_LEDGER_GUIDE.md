# WorldPass Distributed Ledger Implementation Guide
## Zero-Knowledge Decentralized Credential Storage

### Architecture Overview

```
┌─────────────┐
│   User      │
│  (Client)   │
└──────┬──────┘
       │ 1. Encrypt VC with public key
       │    (Client-side encryption)
       ▼
┌─────────────────┐
│   Backend API   │
│  (Orchestrator) │
└────────┬────────┘
         │ 2. Store encrypted VC
         ▼
┌─────────────────┐       ┌──────────────────┐
│      IPFS       │◄──────┤   Blockchain     │
│  (Storage)      │       │  (Hash Anchor)   │
└─────────────────┘       └──────────────────┘
         │                         │
         │ 3. Return CID + TxHash  │
         ▼                         ▼
┌─────────────────┐       ┌──────────────────┐
│  Local SQLite   │       │  User Wallet     │
│  (References)   │       │  (Keys)          │
└─────────────────┘       └──────────────────┘
```

### Privacy Guarantees

1. **Client-Side Encryption**: Credentials encrypted before leaving user's device
2. **IPFS Storage**: Encrypted data stored on distributed filesystem
3. **Blockchain Anchoring**: Only content hash stored on-chain (no PII)
4. **Zero-Knowledge**: Backend never sees plaintext credentials
5. **User Owns Keys**: Decryption keys stored locally, never on server

---

## Implementation Steps

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
pip install aiohttp web3
```

#### Add to requirements.txt
```
aiohttp==3.9.1
web3==6.11.3
```

#### Run IPFS Node (Optional - for local testing)
```bash
# Install IPFS Desktop or run docker
docker run -d --name ipfs_host \
  -v /path/to/ipfs:/data/ipfs \
  -p 4001:4001 -p 5001:5001 -p 8080:8080 \
  ipfs/go-ipfs:latest

# Or use public IPFS gateway (not recommended for production)
export IPFS_API_URL="https://ipfs.infura.io:5001"
export IPFS_GATEWAY="https://ipfs.io/ipfs"
```

#### Configure Blockchain (Polygon Mumbai Testnet)
```bash
export BLOCKCHAIN_RPC="https://rpc-mumbai.maticvigil.com"
export BLOCKCHAIN_CONTRACT="0x..."  # Deploy contract first
```

### 2. Database Migrations

Add to `backend/database.py` in `init_db()` function after `issued_vcs_migrations`:

```python
# Distributed storage migrations
distributed_storage_migrations = [
    ("ipfs_cid", "ALTER TABLE issued_vcs ADD COLUMN ipfs_cid TEXT"),
    ("blockchain_tx", "ALTER TABLE issued_vcs ADD COLUMN blockchain_tx TEXT"),
    ("storage_type", "ALTER TABLE issued_vcs ADD COLUMN storage_type TEXT DEFAULT 'centralized'"),
    ("encryption_key_ref", "ALTER TABLE issued_vcs ADD COLUMN encryption_key_ref TEXT"),
]

for column_name, alter_sql in distributed_storage_migrations:
    if column_name not in issued_vcs_column_names:
        try:
            await conn.execute(alter_sql)
            print(f"Migration: Added {column_name} to issued_vcs")
        except Exception as e:
            print(f"Migration warning: {e}")

await conn.execute("CREATE INDEX IF NOT EXISTS idx_issued_vcs_ipfs_cid ON issued_vcs(ipfs_cid)")
```

### 3. Backend API Endpoints

Add to `backend/app.py`:

```python
from distributed_ledger import distributed_manager

# Store credential (distributed)
@app.post(f"{API}/credentials/store-distributed")
async def store_credential_distributed(
    request: Request,
    body: dict,
    db=Depends(get_db)
):
    # Verify user authentication
    token = request.headers.get("x-token")
    # ... auth logic ...
    
    # Store encrypted VC on IPFS + blockchain
    result = await distributed_manager.store_credential(
        vc_id=body["vc_id"],
        encrypted_payload=body["encrypted_payload"].encode(),
        issuer_did=body["issuer_did"],
        subject_did=body["subject_did"]
    )
    
    # Save reference in database (no plaintext!)
    await db.execute(
        """
        INSERT INTO issued_vcs (vc_id, subject_did, ipfs_cid, blockchain_tx, storage_type, created_at)
        VALUES (?, ?, ?, ?, 'distributed', ?)
        """,
        (body["vc_id"], body["subject_did"], result["ipfs_cid"], result["tx_hash"], int(time.time()))
    )
    await db.commit()
    
    return result

# Retrieve credential (distributed)
@app.get(f"{API}/credentials/retrieve-distributed/{{ipfs_cid}}")
async def retrieve_credential_distributed(ipfs_cid: str):
    encrypted_data = await distributed_manager.retrieve_credential(ipfs_cid)
    
    if not encrypted_data:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    return {"encrypted_data": encrypted_data.decode()}

# Verify integrity
@app.post(f"{API}/credentials/verify-integrity")
async def verify_integrity(body: dict):
    verified = await distributed_manager.verify_credential_integrity(
        vc_id=body["vc_id"],
        ipfs_cid=body["ipfs_cid"],
        expected_hash=body.get("expected_hash", "")
    )
    
    return {"verified": verified}
```

### 4. Frontend Integration

#### Install Dependencies
```bash
cd web
npm install elliptic crypto-js
```

#### Usage Example

```javascript
import {
  getUserEncryptionKeys,
  storeCredentialDistributed,
  retrieveCredentialDistributed,
  verifyCredentialIntegrity
} from './lib/encryption';

// When user receives a credential
async function saveCredential(credential, userDID) {
  // Get user's encryption keys
  const { publicKey, privateKey } = getUserEncryptionKeys(userDID);
  
  // Store encrypted on IPFS + blockchain
  const { ipfs_cid, tx_hash } = await storeCredentialDistributed(
    credential,
    publicKey
  );
  
  console.log('Stored on IPFS:', ipfs_cid);
  console.log('Blockchain TX:', tx_hash);
  
  // Save reference locally
  localStorage.setItem(`vc_${credential.id}`, JSON.stringify({
    ipfs_cid,
    tx_hash,
    storage: 'distributed'
  }));
}

// When user wants to view credential
async function viewCredential(vcId, userDID) {
  const ref = JSON.parse(localStorage.getItem(`vc_${vcId}`));
  const { privateKey } = getUserEncryptionKeys(userDID);
  
  // Retrieve and decrypt
  const credential = await retrieveCredentialDistributed(
    ref.ipfs_cid,
    privateKey
  );
  
  // Verify integrity
  const verified = await verifyCredentialIntegrity(vcId, ref.ipfs_cid);
  
  if (!verified) {
    alert('Warning: Credential integrity check failed!');
  }
  
  return credential;
}
```

### 5. Migration from Centralized to Distributed

Run migration to move existing credentials:

```python
# backend/app.py - Add admin endpoint
@app.post(f"{API}/admin/migrate-to-distributed", dependencies=[Depends(_require_admin)])
async def migrate_to_distributed(db=Depends(get_db)):
    from distributed_ledger import migrate_to_distributed_storage
    await migrate_to_distributed_storage(db)
    return {"ok": True, "message": "Migration started"}
```

---

## Deployment Checklist

- [ ] Set up IPFS node or use Infura/Pinata
- [ ] Deploy smart contract to Polygon/Ethereum
- [ ] Configure environment variables (IPFS_API_URL, BLOCKCHAIN_RPC, CONTRACT_ADDRESS)
- [ ] Run database migrations
- [ ] Test encryption/decryption flow
- [ ] Update frontend to use distributed storage
- [ ] Migrate existing credentials (optional)
- [ ] Monitor IPFS pins and blockchain confirmations

---

## Benefits

✅ **Zero-Knowledge**: Backend never sees plaintext credentials  
✅ **Decentralized**: No single point of failure  
✅ **Immutable**: Blockchain guarantees data integrity  
✅ **User-Controlled**: Users own their encryption keys  
✅ **Verifiable**: Anyone can verify credentials on-chain  
✅ **GDPR Compliant**: No PII stored centrally  

---

## Next Steps

1. Deploy to testnet first (Polygon Mumbai)
2. Test with real credentials
3. Optimize IPFS pinning strategy
4. Add Web3 wallet integration (MetaMask)
5. Implement credential sharing with re-encryption
6. Add multi-sig for revocation

"""
WorldPass Multi-Chain Distributed Ledger System
================================================

Decentralized credential storage using IPFS + Multi-Chain Blockchain anchoring.
User credentials are encrypted client-side and stored on IPFS.
Only hashes are stored on-chain for verification.

Features:
- IPFS storage for encrypted credentials
- Multi-chain blockchain support (10+ chains)
- Zero-knowledge verification
- Client-side encryption (user holds keys)
- No PII in central database
- User/Issuer chooses blockchain based on cost, speed, region

Supported Chains:
- Mainnet: Ethereum, Polygon, Base, Arbitrum, Optimism, BSC, Avalanche, Gnosis, Celo
- Testnet: Polygon Mumbai, Base Sepolia
"""

import hashlib
import json
import time
from typing import Optional, Dict, Any
import aiohttp
import os
import asyncio
from chain_config import get_chain_config, get_recommended_chain

# IPFS Configuration
IPFS_API_URL = os.getenv("IPFS_API_URL", "http://localhost:5001")
IPFS_GATEWAY = os.getenv("IPFS_GATEWAY", "https://ipfs.io/ipfs")


class DistributedStorage:
    """Handle IPFS storage operations"""
    
    def __init__(self):
        self.ipfs_api = IPFS_API_URL
        self.gateway = IPFS_GATEWAY
    
    async def store_credential(self, encrypted_vc: bytes) -> str:
        """
        Store encrypted credential on IPFS
        
        Args:
            encrypted_vc: Encrypted VC data (already encrypted client-side)
        
        Returns:
            IPFS CID (Content Identifier)
        """
        try:
            async with aiohttp.ClientSession() as session:
                data = aiohttp.FormData()
                data.add_field('file', encrypted_vc, filename='credential.enc')
                
                async with session.post(
                    f"{self.ipfs_api}/api/v0/add",
                    data=data
                ) as resp:
                    # IPFS often replies with JSON but content-type can be text/plain.
                    text = await resp.text()
                    try:
                        result = json.loads(text)
                    except Exception:
                        # Some IPFS gateways may stream newline-delimited JSON
                        result = json.loads(text.strip().splitlines()[-1])
                    return result["Hash"]
        except Exception as e:
            # Fallback: Return hash-based ID if IPFS not available
            print(f"IPFS storage failed: {e}, using local hash")
            return hashlib.sha256(encrypted_vc).hexdigest()
    
    async def retrieve_credential(self, cid: str) -> Optional[bytes]:
        """
        Retrieve encrypted credential from IPFS
        
        Args:
            cid: IPFS Content Identifier
        
        Returns:
            Encrypted credential data
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.gateway}/{cid}") as resp:
                    return await resp.read()
        except Exception as e:
            print(f"IPFS retrieval failed: {e}")
            return None


class BlockchainLedger:
    """Handle multi-chain blockchain interactions for hash anchoring"""
    
    def __init__(self, chain_key: str = None):
        """
        Initialize blockchain ledger with specific chain
        
        Args:
            chain_key: Chain identifier (e.g., 'polygon', 'base', 'arbitrum')
                      If None, uses recommended chain based on environment
        """
        # Auto-select chain if not specified
        if not chain_key:
            is_testnet = os.getenv("ENV", "development") != "production"
            chain_key = get_recommended_chain(use_testnet=is_testnet)
        
        self.chain_key = chain_key
        self.chain_config = get_chain_config(chain_key)
        self.rpc_url = self.chain_config["rpc"]
        self.chain_id = self.chain_config["chain_id"]
        self.explorer = self.chain_config["explorer"]
        
        # Contract address per chain (would be deployed separately on each)
        env_chain_key = chain_key.upper().replace("-", "_")
        self.contract = os.getenv(f"CONTRACT_{env_chain_key}", None)

        # Anchor mode:
        # - simulated: never sends tx, always returns a deterministic fake tx hash
        # - real: uses web3 to send tx when CONTRACT_* and DEPLOYER_PRIVATE_KEY are set
        self.anchor_mode = os.getenv("ANCHOR_MODE", "simulated").lower().strip() or "simulated"
        self.deployer_private_key = os.getenv("DEPLOYER_PRIVATE_KEY", "").strip()
        
        print(f"[BlockchainLedger] Initialized with {self.chain_config['name']} (chain_id: {self.chain_id})")

    @staticmethod
    def _bytes32_from_hex(hexstr: str) -> bytes:
        s = (hexstr or "").strip().lower()
        if s.startswith("0x"):
            s = s[2:]
        if len(s) != 64:
            raise ValueError("Expected 32-byte hex (64 chars)")
        return bytes.fromhex(s)

    async def _send_anchor_tx(self, vc_hash_hex: str, ipfs_cid: str) -> str:
        """Send anchor transaction via web3 in a background thread."""
        from web3 import Web3
        from web3.middleware import geth_poa_middleware

        if not self.contract:
            raise ValueError("contract_not_configured")
        if not self.deployer_private_key:
            raise ValueError("DEPLOYER_PRIVATE_KEY_not_set")

        abi = [
            {
                "inputs": [
                    {"internalType": "bytes32", "name": "vcHash", "type": "bytes32"},
                    {"internalType": "string", "name": "ipfsCid", "type": "string"},
                ],
                "name": "anchorVC",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
            },
            {
                "inputs": [{"internalType": "bytes32", "name": "vcHash", "type": "bytes32"}],
                "name": "revokeVC",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
            },
            {
                "inputs": [{"internalType": "bytes32", "name": "vcHash", "type": "bytes32"}],
                "name": "getAnchor",
                "outputs": [
                    {"internalType": "bool", "name": "exists", "type": "bool"},
                    {"internalType": "bool", "name": "revoked", "type": "bool"},
                    {"internalType": "string", "name": "ipfsCid", "type": "string"},
                    {"internalType": "address", "name": "issuer", "type": "address"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
                ],
                "stateMutability": "view",
                "type": "function",
            },
        ]

        def _do_send() -> str:
            w3 = Web3(Web3.HTTPProvider(self.rpc_url, request_kwargs={"timeout": 30}))
            if not w3.is_connected():
                raise RuntimeError(f"rpc_not_reachable: {self.rpc_url}")

            if self.chain_config.get("poa"):
                w3.middleware_onion.inject(geth_poa_middleware, layer=0)

            account = w3.eth.account.from_key(self.deployer_private_key)
            contract = w3.eth.contract(address=Web3.to_checksum_address(self.contract), abi=abi)

            vc_hash_bytes = self._bytes32_from_hex(vc_hash_hex)
            nonce = w3.eth.get_transaction_count(account.address)

            base_tx = {
                "chainId": self.chain_id,
                "from": account.address,
                "nonce": nonce,
            }

            # Prefer EIP-1559 when available
            try:
                latest = w3.eth.get_block("latest")
                base_fee = latest.get("baseFeePerGas")
            except Exception:
                base_fee = None

            if base_fee is not None:
                max_priority = w3.to_wei(1, "gwei")
                max_fee = int(base_fee) * 2 + int(max_priority)
                base_tx.update({
                    "maxFeePerGas": max_fee,
                    "maxPriorityFeePerGas": max_priority,
                })
            else:
                base_tx["gasPrice"] = w3.eth.gas_price

            tx = contract.functions.anchorVC(vc_hash_bytes, ipfs_cid).build_transaction(base_tx)

            # Gas estimation (and safety buffer)
            try:
                estimated = w3.eth.estimate_gas(tx)
                tx["gas"] = int(estimated * 1.2)
            except Exception:
                tx.setdefault("gas", 250000)

            signed = w3.eth.account.sign_transaction(tx, private_key=self.deployer_private_key)
            raw_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            return raw_hash.hex()

        return await asyncio.to_thread(_do_send)
    
    async def anchor_hash(
        self,
        vc_id: str,
        ipfs_cid: str,
        issuer_did: str,
        subject_did: str,
        vc_hash_hex: str
    ) -> Dict[str, Any]:
        """
        Anchor credential hash on blockchain
        
        Args:
            vc_id: Credential ID
            ipfs_cid: IPFS Content Identifier
            issuer_did: Issuer's DID
            subject_did: Subject's DID
        
        Returns:
            Dict with transaction hash, chain info, and explorer URL
        """
        # We anchor the SHA-256 hash of the encrypted payload (or canonical VC hash).
        # This keeps verification consistent: retrieve from IPFS => sha256(payload) => compare.
        vc_hash_hex = (vc_hash_hex or "").lower().strip()
        if vc_hash_hex.startswith("0x"):
            vc_hash_hex = vc_hash_hex[2:]
        if len(vc_hash_hex) != 64:
            raise ValueError("vc_hash_hex_must_be_32_bytes")
        
        # If blockchain is not enabled, store in local ledger
        if self.anchor_mode != "real" or not self.contract or not self.deployer_private_key:
            simulated_tx_hash = f"0x{vc_hash_hex}"
            return {
                "tx_hash": simulated_tx_hash,
                "chain": self.chain_key,
                "chain_id": self.chain_id,
                "chain_name": self.chain_config["name"],
                "explorer_url": f"{self.explorer}/tx/{simulated_tx_hash}",
                "vc_hash": vc_hash_hex,
                "status": "simulated",
                "native_token": self.chain_config["native_token"],
                "gas_price_level": self.chain_config.get("avg_gas_price"),
            }

        # Real chain tx
        tx_hash = await self._send_anchor_tx(vc_hash_hex=vc_hash_hex, ipfs_cid=ipfs_cid)

        return {
            "tx_hash": tx_hash,
            "chain": self.chain_key,
            "chain_id": self.chain_id,
            "chain_name": self.chain_config["name"],
            "explorer_url": f"{self.explorer}/tx/{tx_hash}",
            "vc_hash": vc_hash_hex,
            "status": "pending",
            "native_token": self.chain_config["native_token"],
            "gas_price_level": self.chain_config.get("avg_gas_price"),
        }
    
    async def verify_hash(self, vc_id: str, expected_hash: str, tx_hash: str = None) -> Dict[str, Any]:
        """
        Verify credential hash on blockchain
        
        Args:
            vc_id: Credential ID
            expected_hash: Expected hash value
            tx_hash: Optional transaction hash to verify
        
        Returns:
            Dict with verification status and chain info
        """
        expected = (expected_hash or "").lower().strip()
        if expected.startswith("0x"):
            expected = expected[2:]

        # If real mode is not configured, return simulated verification
        if self.anchor_mode != "real" or not self.contract:
            return {
                "verified": True,
                "chain": self.chain_key,
                "chain_name": self.chain_config["name"],
                "tx_hash": tx_hash,
                "on_chain_hash": expected,
                "matches": True,
                "confirmations": 0,
                "explorer_url": f"{self.explorer}/tx/{tx_hash}" if tx_hash else None,
                "status": "simulated",
            }

        from web3 import Web3
        from web3.middleware import geth_poa_middleware

        def _do_call() -> Dict[str, Any]:
            w3 = Web3(Web3.HTTPProvider(self.rpc_url, request_kwargs={"timeout": 30}))
            if self.chain_config.get("poa"):
                w3.middleware_onion.inject(geth_poa_middleware, layer=0)

            abi = [
                {
                    "inputs": [{"internalType": "bytes32", "name": "vcHash", "type": "bytes32"}],
                    "name": "getAnchor",
                    "outputs": [
                        {"internalType": "bool", "name": "exists", "type": "bool"},
                        {"internalType": "bool", "name": "revoked", "type": "bool"},
                        {"internalType": "string", "name": "ipfsCid", "type": "string"},
                        {"internalType": "address", "name": "issuer", "type": "address"},
                        {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
                    ],
                    "stateMutability": "view",
                    "type": "function",
                }
            ]

            contract = w3.eth.contract(address=Web3.to_checksum_address(self.contract), abi=abi)
            vc_hash_bytes = self._bytes32_from_hex(expected)
            exists, revoked, ipfs_cid, issuer, ts = contract.functions.getAnchor(vc_hash_bytes).call()

            is_verified = bool(exists) and (not bool(revoked))
            return {
                "verified": is_verified,
                "exists": bool(exists),
                "revoked": bool(revoked),
                "issuer_address": issuer,
                "timestamp": int(ts) if ts is not None else None,
                "ipfs_cid": ipfs_cid,
            }

        info = await asyncio.to_thread(_do_call)
        return {
            "verified": info["verified"],
            "chain": self.chain_key,
            "chain_name": self.chain_config["name"],
            "tx_hash": tx_hash,
            "on_chain_hash": expected,
            "matches": info["exists"],
            "confirmations": None,
            "explorer_url": f"{self.explorer}/tx/{tx_hash}" if tx_hash else None,
            **info,
        }


class DistributedCredentialManager:
    """High-level manager for distributed credential operations with multi-chain support"""
    
    def __init__(self, chain_key: str = None):
        """
        Initialize manager with specific blockchain
        
        Args:
            chain_key: Blockchain to use (e.g., 'polygon', 'base', 'bsc')
                      If None, uses recommended chain
        """
        self.storage = DistributedStorage()
        self.ledger = BlockchainLedger(chain_key)
        self.chain_key = self.ledger.chain_key
    
    async def store_credential(
        self,
        vc_id: str,
        encrypted_payload: bytes,
        issuer_did: str,
        subject_did: str
    ) -> Dict[str, Any]:
        """
        Store credential in distributed system
        
        Flow:
        1. Store encrypted VC on IPFS
        2. Anchor IPFS CID + metadata hash on blockchain
        3. Return references (no PII stored centrally)
        
        Args:
            vc_id: Credential ID
            encrypted_payload: Client-side encrypted credential
            issuer_did: Issuer's DID
            subject_did: Subject's DID
        
        Returns:
            Dict with IPFS CID, blockchain tx hash, and chain info
        """
        # Hash payload (encrypted bytes) so verification can re-compute from IPFS
        vc_hash_hex = hashlib.sha256(encrypted_payload).hexdigest()

        # Store on IPFS
        ipfs_cid = await self.storage.store_credential(encrypted_payload)
        
        # Anchor on blockchain
        blockchain_result = await self.ledger.anchor_hash(
            vc_id=vc_id,
            ipfs_cid=ipfs_cid,
            issuer_did=issuer_did,
            subject_did=subject_did,
            vc_hash_hex=vc_hash_hex
        )
        
        return {
            "ipfs_cid": ipfs_cid,
            "storage": "distributed",
            "payload_hash": vc_hash_hex,
            **blockchain_result
        }
    
    async def retrieve_credential(self, ipfs_cid: str) -> Optional[bytes]:
        """
        Retrieve encrypted credential from IPFS
        Client must decrypt with their keys
        """
        return await self.storage.retrieve_credential(ipfs_cid)
    
    async def verify_credential_integrity(
        self,
        vc_id: str,
        ipfs_cid: str,
        expected_hash: str,
        tx_hash: str = None
    ) -> Dict[str, Any]:
        """
        Verify credential hasn't been tampered with
        Checks IPFS content hash against blockchain record
        
        Args:
            vc_id: Credential ID
            ipfs_cid: IPFS CID
            expected_hash: Expected content hash
            tx_hash: Optional blockchain transaction hash
        
        Returns:
            Dict with verification results and chain info
        """
        # Retrieve from IPFS
        data = await self.storage.retrieve_credential(ipfs_cid)
        if not data:
            return {
                "verified": False,
                "reason": "ipfs_retrieval_failed",
                "chain": self.chain_key
            }
        
        # Verify content hash
        content_hash = hashlib.sha256(data).hexdigest()
        
        # Verify against blockchain
        blockchain_verification = await self.ledger.verify_hash(vc_id, expected_hash, tx_hash)
        
        return {
            "verified": blockchain_verification["verified"] and content_hash == expected_hash,
            "ipfs_hash": content_hash,
            "expected_hash": expected_hash,
            "hash_matches": content_hash == expected_hash,
            **blockchain_verification
        }


# Factory function to create manager for specific chain
def create_distributed_manager(chain_key: str = None) -> DistributedCredentialManager:
    """
    Create distributed credential manager for specific chain
    
    Args:
        chain_key: Chain to use (None = auto-select recommended)
    
    Returns:
        DistributedCredentialManager instance
    """
    return DistributedCredentialManager(chain_key)


# Default instance (backward compatibility)
distributed_manager = DistributedCredentialManager()


async def migrate_to_distributed_storage(db, chain_key: str = None, batch_size: int = 10):
    """
    Migration helper: Move existing credentials to distributed storage
    
    Args:
        db: Database connection
        chain_key: Target blockchain (None = auto-select recommended)
        batch_size: Number of credentials to migrate in one batch
    
    WARNING: This encrypts and moves credentials to IPFS
    Original database records are updated with IPFS CIDs
    """
    manager = create_distributed_manager(chain_key)
    
    print(f"Starting migration to distributed storage on {manager.chain_key}...")
    print(f"Chain: {manager.ledger.chain_config['name']} (ID: {manager.ledger.chain_id})")
    
    rows = await db.execute_fetchall(
        "SELECT vc_id, payload, issuer_did, subject_did FROM issued_vcs WHERE ipfs_cid IS NULL LIMIT ?",
        (batch_size,)
    )
    
    migrated = 0
    for row in rows:
        try:
            vc_id = row["vc_id"]
            payload = row["payload"]
            issuer_did = row["issuer_did"] or ""
            subject_did = row["subject_did"] or ""
            
            # Encrypt payload (in production, use user's public key)
            encrypted = payload.encode()  # TODO: Add real encryption
            
            # Store distributed
            result = await manager.store_credential(
                vc_id=vc_id,
                encrypted_payload=encrypted,
                issuer_did=issuer_did,
                subject_did=subject_did
            )
            
            # Update database with IPFS reference
            await db.execute(
                """
                UPDATE issued_vcs 
                SET ipfs_cid=?, blockchain_tx=?, storage_type='distributed', blockchain_chain=?
                WHERE vc_id=?
                """,
                (result["ipfs_cid"], result["tx_hash"], result["chain"], vc_id)
            )
            
            migrated += 1
            print(f"Migrated {vc_id} to IPFS: {result['ipfs_cid']} on {result['chain']}")
            print(f"  TX: {result['tx_hash']}")
            print(f"  Explorer: {result.get('explorer_url', 'N/A')}")
            
        except Exception as e:
            print(f"Failed to migrate {vc_id}: {e}")
    
    await db.commit()
    print(f"\nMigration complete!")
    print(f"  Migrated: {migrated} credentials")
    print(f"  Blockchain: {manager.ledger.chain_config['name']}")
    print(f"  Gas Level: {manager.ledger.chain_config['avg_gas_price']}")
    print(f"  Finality: {manager.ledger.chain_config['finality']}")

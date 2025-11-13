import os, json, base64
from typing import Dict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from argon2.low_level import hash_secret_raw, Type

def _kdf(password: str, salt: bytes) -> bytes:
    return hash_secret_raw(
        password.encode(), salt,
        time_cost=3, memory_cost=64*1024, parallelism=2,
        hash_len=32, type=Type.ID
    )

def encrypt_keystore(password: str, payload: Dict) -> bytes:
    salt = os.urandom(16)
    key = _kdf(password, salt)
    nonce = os.urandom(12)
    aes = AESGCM(key)
    ct = aes.encrypt(nonce, json.dumps(payload).encode(), None)
    blob = {
        "kty":"wpks","version":1,
        "salt": base64.b64encode(salt).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "ct": base64.b64encode(ct).decode()
    }
    return json.dumps(blob, indent=2).encode()

def decrypt_keystore(password: str, blob_bytes: bytes) -> Dict:
    blob = json.loads(blob_bytes.decode())
    salt = base64.b64decode(blob["salt"])
    nonce = base64.b64decode(blob["nonce"])
    ct = base64.b64decode(blob["ct"])
    key = _kdf(password, salt)
    aes = AESGCM(key)
    pt = aes.decrypt(nonce, ct, None)
    return json.loads(pt.decode())

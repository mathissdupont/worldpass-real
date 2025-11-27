import os
import json
import base64
from typing import Dict

from argon2.low_level import hash_secret_raw, Type
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

PBKDF2_ITERATIONS = 300_000


def _argon2_key(password: str, salt: bytes) -> bytes:
    return hash_secret_raw(
        password.encode(),
        salt,
        time_cost=3,
        memory_cost=64 * 1024,
        parallelism=2,
        hash_len=32,
        type=Type.ID,
    )


def _pbkdf2_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
    )
    return kdf.derive(password.encode())


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _from_b64u(value: str) -> bytes:
    pad = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + pad)


def encrypt_keystore(password: str, payload: Dict, preferred_kdf: str = "pbkdf2-sha256") -> bytes:
    salt = os.urandom(16)
    nonce = os.urandom(12)

    normalized = (preferred_kdf or "pbkdf2-sha256").lower()
    if normalized not in {"argon2id", "pbkdf2-sha256"}:
        raise ValueError("unsupported_kdf")

    if normalized == "argon2id":
        key = _argon2_key(password, salt)
    else:
        key = _pbkdf2_key(password, salt)
    used_kdf = normalized

    aes = AESGCM(key)
    ciphertext = aes.encrypt(nonce, json.dumps(payload).encode(), None)
    blob = {
        "kty": "wpks",
        "version": 2,
        "kdf": used_kdf,
        "salt": _b64u(salt),
        "nonce": _b64u(nonce),
        "ct": _b64u(ciphertext),
    }
    return json.dumps(blob, indent=2).encode()


def decrypt_keystore(password: str, blob_bytes: bytes) -> Dict:
    blob = json.loads(blob_bytes.decode())
    version = blob.get("version", 1)

    if version == 1:
        # Legacy Argon2 blobs used standard base64
        salt = base64.b64decode(blob["salt"])
        nonce = base64.b64decode(blob["nonce"])
        ciphertext = base64.b64decode(blob["ct"])
        key = _argon2_key(password, salt)
    else:
        salt = _from_b64u(blob["salt"])
        kdf = (blob.get("kdf") or "argon2id").lower()
        if kdf == "argon2id":
            key = _argon2_key(password, salt)
        elif kdf == "pbkdf2-sha256":
            key = _pbkdf2_key(password, salt)
        else:
            raise ValueError("unsupported_kdf")
        nonce = _from_b64u(blob["nonce"])
        ciphertext = _from_b64u(blob["ct"])

    aes = AESGCM(key)
    plaintext = aes.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode())

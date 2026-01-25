import os
import json
import base64
from typing import Dict

from argon2.low_level import hash_secret_raw, Type
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

PBKDF2_ITERATIONS = 300_000


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _from_b64u(value: str) -> bytes:
    pad = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + pad)


def _ensure_seed_b64u(payload: Dict) -> Dict:
    """
    payload içine 'seed_b64u' ekler.
    Beklenen: payload has either:
      - seed (bytes) length=32
      - seed_b64u (str)
      - sk_b64u (str) length=32 bytes => seed say
    """
    import base58
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.hazmat.primitives import serialization
    MULTICODEC_ED25519_HEADER = b"\xed\x01"

    p = dict(payload)

    # seed_b64u zorunlu
    seed_b64u = p.get("seed_b64u")
    if not (isinstance(seed_b64u, str) and seed_b64u):
        # bytes seed given
        seed = p.get("seed")
        if isinstance(seed, (bytes, bytearray)):
            if len(seed) != 32:
                raise ValueError(f"seed must be 32 bytes, got {len(seed)}")
            seed_b64u = _b64u(bytes(seed))
            p["seed_b64u"] = seed_b64u
            p.pop("seed", None)
        else:
            # fallback: sk_b64u is actually a seed (32 bytes)
            sk_b64u = p.get("sk_b64u")
            if isinstance(sk_b64u, str) and sk_b64u:
                raw = _from_b64u(sk_b64u)
                if len(raw) == 32:
                    seed_b64u = sk_b64u
                    p["seed_b64u"] = seed_b64u
            if not seed_b64u:
                raise ValueError(
                    "payload must contain ed25519 seed. Provide payload['seed']=32 bytes or payload['seed_b64u']"
                )

    # seed'den pk ve did üret
    seed = _from_b64u(seed_b64u)
    sk = ed25519.Ed25519PrivateKey.from_private_bytes(seed)
    pk = sk.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    # W3C multicodec+base58btc DID
    multicodec = MULTICODEC_ED25519_HEADER + pk
    did = "did:key:z" + base58.b58encode(multicodec).decode()
    p["pk_b64u"] = _b64u(pk)
    p["did"] = did
    return p


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


def encrypt_keystore(password: str, payload: Dict, preferred_kdf: str = "pbkdf2-sha256") -> bytes:
    salt = os.urandom(16)
    nonce = os.urandom(12)

    normalized = (preferred_kdf or "pbkdf2-sha256").lower()
    if normalized not in {"argon2id", "pbkdf2-sha256"}:
        raise ValueError("unsupported_kdf")

    key = _argon2_key(password, salt) if normalized == "argon2id" else _pbkdf2_key(password, salt)

    # ✅ ensure seed is present in plaintext payload
    payload = _ensure_seed_b64u(payload)

    aes = AESGCM(key)
    ciphertext = aes.encrypt(nonce, json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"), None)

    blob = {
        "kty": "wpks",
        "version": 2,
        "kdf": normalized,
        "salt": _b64u(salt),
        "nonce": _b64u(nonce),
        "ct": _b64u(ciphertext),
        "rounds": PBKDF2_ITERATIONS if normalized == "pbkdf2-sha256" else None,
    }

    # rounds None ise yazma
    blob = {k: v for k, v in blob.items() if v is not None}

    return json.dumps(blob, indent=2, ensure_ascii=False).encode("utf-8")


def decrypt_keystore(password: str, blob_bytes: bytes) -> Dict:
    blob = json.loads(blob_bytes.decode("utf-8"))
    version = blob.get("version", 1)

    if version == 1:
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
            # ✅ rounds varsa onu kullan
            rounds = int(blob.get("rounds") or PBKDF2_ITERATIONS)
            global PBKDF2_ITERATIONS
            PBKDF2_ITERATIONS = rounds
            key = _pbkdf2_key(password, salt)
        else:
            raise ValueError("unsupported_kdf")

        nonce = _from_b64u(blob["nonce"])
        ciphertext = _from_b64u(blob["ct"])

    aes = AESGCM(key)
    plaintext = aes.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))

import base58
import base64
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

MULTICODEC_ED25519_HEADER = b"\xed\x01"

def pk_from_seed(seed: bytes) -> bytes:
    sk = ed25519.Ed25519PrivateKey.from_private_bytes(seed)
    pk = sk.public_key()
    return pk.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )

def w3c_did_from_pk(pk: bytes) -> str:
    multicodec = MULTICODEC_ED25519_HEADER + pk
    return "did:key:z" + base58.b58encode(multicodec).decode()

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def pk_b64u_from_seed(seed_b64u: str) -> str:
    seed = base64.urlsafe_b64decode(seed_b64u + "==")
    pk = pk_from_seed(seed)
    return b64u(pk)

def did_from_seed_b64u(seed_b64u: str) -> str:
    seed = base64.urlsafe_b64decode(seed_b64u + "==")
    pk = pk_from_seed(seed)
    return w3c_did_from_pk(pk)

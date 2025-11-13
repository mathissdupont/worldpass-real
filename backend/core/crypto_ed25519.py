import base64
from typing import Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from .crypto_base import Signer

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")
def b64u_d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "==")

class Ed25519Signer(Signer):
    def generate_keypair(self) -> Tuple[bytes, bytes]:
        sk = ed25519.Ed25519PrivateKey.generate()
        pk = sk.public_key()
        sk_bytes = sk.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )
        pk_bytes = pk.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        return sk_bytes, pk_bytes

    def sign(self, sk_bytes: bytes, msg: bytes) -> bytes:
        sk = ed25519.Ed25519PrivateKey.from_private_bytes(sk_bytes)
        return sk.sign(msg)

    def verify(self, pk_bytes: bytes, msg: bytes, sig: bytes) -> bool:
        pk = ed25519.Ed25519PublicKey.from_public_bytes(pk_bytes)
        pk.verify(sig, msg)  # exception fırlatırsa geçersiz
        return True

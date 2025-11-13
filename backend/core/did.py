import base64
def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def did_from_pk(pk: bytes) -> str:
    # Gerçek did:key çok daha karmaşık (multibase + multicodec).
    # MVP: pk base64url ile basit bir did:key gösterimi yapıyoruz.
    return f"did:key:z{b64u(pk)}"

def pk_from_simple_did(did: str) -> bytes | None:
    # Yalnızca bizim "did:key:z<base64url(pk)>" basit formatımız için.
    try:
        prefix = "did:key:z"
        if not did.startswith(prefix):
            return None
        b64 = did[len(prefix):]
        return base64.urlsafe_b64decode(b64 + "==")
    except Exception:
        return None

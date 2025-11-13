import os, base64
from getpass import getpass
from backend.core.crypto_ed25519 import Ed25519Signer, b64u
from backend.core.keystore import encrypt_keystore
from backend.core.did import did_from_pk

def main():
    signer = Ed25519Signer()
    sk, pk = signer.generate_keypair()
    did = did_from_pk(pk)
    password = getpass("Keystore password: ")

    payload = {
        "did": did,
        "sk_b64u": b64u(sk),
        "pk_b64u": b64u(pk),
    }
    blob = encrypt_keystore(password, payload)
    os.makedirs("backend/data/keystore", exist_ok=True)
    path = f"backend/data/keystore/{did.replace(':','_')}.wpkeystore"
    with open(path, "wb") as f:
        f.write(blob)
    print("DID:", did)
    print("PublicKey (b64u):", b64u(pk))
    print("Saved:", path)

if __name__ == "__main__":
    main()

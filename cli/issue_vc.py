import json, base64
from getpass import getpass
from backend.core.crypto_ed25519 import Ed25519Signer, b64u_d
from backend.core.keystore import decrypt_keystore
from backend.core.vc import sign_vc
from backend.core.did import did_from_pk

"""
Kullanım (örnek):
python cli/issue_vc.py backend/data/keystore/did_key_z....wpkeystore vc_out.json "Samet Ünsal" "did:key:zHolder"
"""

import sys, time, os

def main():
    if len(sys.argv) < 5:
        print("usage: python cli/issue_vc.py <keystore_path> <out_vc_json> <name> <subject_did>")
        sys.exit(1)

    ks_path, out_path, name, subject_did = sys.argv[1:5]
    password = getpass("Keystore password: ")
    blob = open(ks_path, "rb").read()
    data = decrypt_keystore(password, blob)

    sk = b64u_d(data["sk_b64u"])
    pk_b64u = data["pk_b64u"]
    issuer_did = data["did"]

    signer = Ed25519Signer()
    vc_body = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential","StudentCard"],
        "issuer": issuer_did,
        "issuanceDate": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "jti": f"vc-{int(time.time())}",
        "expirationDate": None,
        "credentialSubject": {
            "id": subject_did,
            "name": name
        }
    }
    vm = f"{issuer_did}#key-1"
    signed = sign_vc(vc_body, signer, sk, pk_b64u, vm)

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(signed, f, ensure_ascii=False, indent=2)
    print("Wrote VC:", out_path)

if __name__ == "__main__":
    main()

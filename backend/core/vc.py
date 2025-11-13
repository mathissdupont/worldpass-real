import json, base64, time
from typing import Dict, Tuple
from crypto_ed25519 import b64u, b64u_d
from crypto_base import Signer

def jws_message(header: dict, payload: dict) -> bytes:
    return (b64u(json.dumps(header, separators=(",",":")).encode()) + "." +
            b64u(json.dumps(payload, separators=(",",":")).encode())).encode()

def sign_vc(vc_body: Dict, signer: Signer, sk: bytes, issuer_pk_b64u: str, verification_method: str) -> Dict:
    header = {"alg":"EdDSA","typ":"JWT"}
    payload = {**vc_body}
    msg = jws_message(header, payload)
    sig = signer.sign(sk, msg)

    proof = {
        "type": "Ed25519Signature2020",
        "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "proofPurpose": "assertionMethod",
        "verificationMethod": verification_method,
        "jws": b64u(sig),
        "issuer_pk_b64u": issuer_pk_b64u  # doğrulayıcı bunu kullanacak
    }
    payload["proof"] = proof
    return payload

def verify_vc(vc_signed: Dict, signer: Signer) -> Tuple[bool, str, str | None, str | None]:
    try:
        proof = vc_signed.get("proof", {})
        jws = proof.get("jws")
        issuer_pk_b64u = proof.get("issuer_pk_b64u")
        if not (jws and issuer_pk_b64u):
            return False, "missing_proof", None, None

        header = {"alg":"EdDSA","typ":"JWT"}
        payload = {k:v for k,v in vc_signed.items() if k != "proof"}
        msg = jws_message(header, payload)
        sig = b64u_d(jws)
        pk = b64u_d(issuer_pk_b64u)
        signer.verify(pk, msg, sig)

        issuer = vc_signed.get("issuer")
        subject = (vc_signed.get("credentialSubject") or {}).get("id")
        return True, "ok", issuer, subject
    except Exception as e:
        return False, "invalid_signature", None, None

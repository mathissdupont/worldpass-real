import os
import hashlib
import json
import requests

EAS_SERVICE_URL = os.getenv('EAS_SERVICE_URL', 'https://worldpass-beta.heptapusgroup.com:5055')


def canonicalize_vc(vc: dict) -> str:
    """Produce a stable JSON string for hashing.
    Remove volatile fields (e.g., proof) before hashing, and sort keys.
    """
    vc_copy = dict(vc)
    vc_copy.pop('proof', None)
    return json.dumps(vc_copy, separators=(',', ':'), sort_keys=True)


def vc_hash(vc: dict) -> str:
    """Return hex string of sha256 hash."""
    c = canonicalize_vc(vc)
    h = hashlib.sha256(c.encode('utf-8')).hexdigest()
    return h


def _bytes32(hexstr: str) -> str:
    """Convert hex string to 0x-prefixed 32-byte string."""
    s = hexstr.lower()
    if not s.startswith('0x'):
        s = '0x' + s
    if len(s) != 66:
        # left pad
        s = '0x' + s[2:].rjust(64, '0')
    return s


def eas_attest(vc: dict, issuer_did: str, subject_did: str):
    """Call EAS service to attest VC hash."""
    h = vc_hash(vc)
    data = {
        'vcHash': _bytes32(h),
        'issuerDid': issuer_did,
        'subjectDid': subject_did,
        'active': True,
    }
    r = requests.post(f'{EAS_SERVICE_URL}/attest', json=data, timeout=20)
    r.raise_for_status()
    return r.json()


def eas_revoke(uid: str):
    r = requests.post(f'{EAS_SERVICE_URL}/revoke', json={'uid': uid}, timeout=20)
    r.raise_for_status()
    return r.json()


def eas_resolve(uid: str):
    r = requests.get(f'{EAS_SERVICE_URL}/resolve/{uid}', timeout=20)
    r.raise_for_status()
    return r.json()

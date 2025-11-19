"""
VC Encryption Module
Provides encryption and decryption for VCs stored in the database.
Uses Fernet (symmetric encryption with AES-128 in CBC mode).
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
import json
from typing import Dict, Any


class VCEncryptor:
    """Handles encryption and decryption of VC payloads"""
    
    def __init__(self, encryption_key: str):
        """
        Initialize the encryptor with an encryption key.
        
        Args:
            encryption_key: Base64-encoded encryption key or a password to derive key from
        """
        # If key looks like a Fernet key (44 chars base64), use it directly
        if len(encryption_key) == 44 and encryption_key.endswith('='):
            try:
                self.fernet = Fernet(encryption_key.encode())
            except Exception:
                # If it fails, derive key from it
                self.fernet = self._derive_fernet_key(encryption_key)
        else:
            # Derive a proper Fernet key from the provided password
            self.fernet = self._derive_fernet_key(encryption_key)
    
    def _derive_fernet_key(self, password: str) -> Fernet:
        """
        Derive a Fernet key from a password using PBKDF2.
        Uses a fixed salt since we need the same key across server restarts.
        """
        # Use a fixed salt - this is acceptable since the encryption key itself is secret
        salt = b'worldpass_vc_encryption_salt_v1'
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return Fernet(key)
    
    def encrypt_vc(self, vc_payload: Dict[str, Any]) -> str:
        """
        Encrypt a VC payload for storage.
        
        Args:
            vc_payload: The VC as a dictionary
            
        Returns:
            Encrypted VC as a base64-encoded string
        """
        try:
            # Convert to JSON string
            json_str = json.dumps(vc_payload, separators=(',', ':'), sort_keys=True)
            
            # Encrypt
            encrypted = self.fernet.encrypt(json_str.encode('utf-8'))
            
            # Return as string (already base64 encoded by Fernet)
            return encrypted.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Failed to encrypt VC: {str(e)}")
    
    def decrypt_vc(self, encrypted_payload: str) -> Dict[str, Any]:
        """
        Decrypt a VC payload from storage.
        
        Args:
            encrypted_payload: The encrypted VC as a base64-encoded string
            
        Returns:
            The decrypted VC as a dictionary
        """
        try:
            # Decrypt
            decrypted = self.fernet.decrypt(encrypted_payload.encode('utf-8'))
            
            # Parse JSON
            return json.loads(decrypted.decode('utf-8'))
        except Exception as e:
            raise ValueError(f"Failed to decrypt VC: {str(e)}")
    
    def is_encrypted(self, payload: str) -> bool:
        """
        Check if a payload appears to be encrypted (for migration support).
        
        Args:
            payload: The payload string to check
            
        Returns:
            True if encrypted, False if plain JSON
        """
        try:
            # Try to parse as JSON - if it works, it's not encrypted
            json.loads(payload)
            return False
        except (json.JSONDecodeError, ValueError):
            # If JSON parsing fails, assume it's encrypted
            return True


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.
    
    Returns:
        A base64-encoded Fernet key suitable for use as VC_ENCRYPTION_KEY
    """
    return Fernet.generate_key().decode('utf-8')

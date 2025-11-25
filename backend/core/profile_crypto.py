"""
Profile data encryption utilities
Encrypts sensitive profile fields (passwords, tokens, etc.) at rest
"""
from cryptography.fernet import Fernet
from typing import Dict, Any, List
import json

# Fields that should be encrypted (passwords, tokens, sensitive data)
ENCRYPTED_FIELDS = [
    "instagram_password",
    "twitter_password", 
    "github_password",
    "facebook_password",
    "linkedin_password",
    "tiktok_password",
    "youtube_password",
    "discord_password",
    "telegram_password",
    "whatsapp_password",
    # Add more as needed
]

class ProfileEncryptor:
    """Handles encryption/decryption of sensitive profile fields"""
    
    def __init__(self, encryption_key: str):
        """
        Initialize encryptor with a Fernet key
        
        Args:
            encryption_key: Base64-encoded Fernet key
        """
        self.cipher = Fernet(encryption_key.encode())
    
    def encrypt_profile_data(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Encrypt sensitive fields in profile data
        
        Args:
            profile_data: Raw profile data dictionary
            
        Returns:
            Profile data with sensitive fields encrypted
        """
        if not profile_data:
            return profile_data
        
        encrypted_data = profile_data.copy()
        
        for field in ENCRYPTED_FIELDS:
            if field in encrypted_data and encrypted_data[field]:
                # Encrypt the value
                plaintext = str(encrypted_data[field]).encode()
                encrypted_value = self.cipher.encrypt(plaintext).decode()
                encrypted_data[field] = f"enc:{encrypted_value}"
        
        return encrypted_data
    
    def decrypt_profile_data(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt sensitive fields in profile data
        
        Args:
            profile_data: Profile data with encrypted fields
            
        Returns:
            Profile data with sensitive fields decrypted
        """
        if not profile_data:
            return profile_data
        
        decrypted_data = profile_data.copy()
        
        for field in ENCRYPTED_FIELDS:
            if field in decrypted_data and decrypted_data[field]:
                value = str(decrypted_data[field])
                # Check if it's encrypted (starts with "enc:")
                if value.startswith("enc:"):
                    try:
                        encrypted_value = value[4:].encode()  # Remove "enc:" prefix
                        decrypted_bytes = self.cipher.decrypt(encrypted_value)
                        decrypted_data[field] = decrypted_bytes.decode()
                    except Exception as e:
                        # If decryption fails, leave as is (might be old unencrypted data)
                        print(f"Warning: Failed to decrypt {field}: {e}")
        
        return decrypted_data
    
    def is_field_encrypted(self, field_name: str) -> bool:
        """Check if a field should be encrypted"""
        return field_name in ENCRYPTED_FIELDS


def get_profile_encryptor(encryption_key: str) -> ProfileEncryptor:
    """Factory function to create ProfileEncryptor instance"""
    return ProfileEncryptor(encryption_key)

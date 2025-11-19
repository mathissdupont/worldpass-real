# VC Encryption Documentation

## Overview

Virtual Credentials (VCs) are now encrypted at rest in the database for enhanced security. This ensures that sensitive credential data cannot be accessed without the proper encryption key, even if the database is compromised.

## Encryption Method

- **Algorithm**: Fernet (symmetric encryption)
  - AES-128 in CBC mode
  - HMAC for authentication
  - Base64-encoded output
- **Key Derivation**: PBKDF2-HMAC-SHA256 with 100,000 iterations
- **Security**: Cryptographically secure encryption that meets industry standards

## Configuration

### Setting the Encryption Key

The encryption key must be configured via the `VC_ENCRYPTION_KEY` environment variable:

```bash
# Generate a new encryption key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Set the environment variable
export VC_ENCRYPTION_KEY="your-generated-key-here=="
```

**Important**: 
- Keep this key secure and backed up
- Do not commit it to version control
- Use the same key across all server instances
- If the key is lost, encrypted VCs cannot be recovered

### Development Mode

If `VC_ENCRYPTION_KEY` is not set, the system will:
1. Generate a temporary key for the session
2. Display a warning in the logs
3. VCs will be encrypted but won't persist across restarts

This is acceptable for development but **NOT for production**.

## How It Works

### Storing a VC

1. User submits a VC via the API
2. The VC payload (JSON) is encrypted using Fernet
3. The encrypted data (base64 string) is stored in the database
4. The original VC data is never stored in plain text

### Retrieving a VC

1. User requests their VCs via the API
2. Encrypted data is fetched from the database
3. The data is decrypted using the encryption key
4. The decrypted VC (JSON) is returned to the user

### User Experience

- **Transparent**: Encryption/decryption is automatic
- **Cross-device**: VCs are accessible from any device the user logs into
- **Secure**: VCs are encrypted at rest in the database
- **Fast**: Encryption adds minimal overhead

## Backward Compatibility

The system supports both encrypted and plain JSON VCs:

- **New VCs**: Automatically encrypted when stored
- **Legacy VCs**: Plain JSON VCs from before encryption was added
- **Detection**: System automatically detects format and handles accordingly
- **Migration**: Legacy VCs will be encrypted when next updated

## Security Benefits

1. **Data at Rest Protection**: VCs are encrypted in the database
2. **Breach Mitigation**: Stolen database dumps are useless without the key
3. **Compliance**: Helps meet data protection regulations (GDPR, etc.)
4. **Defense in Depth**: Additional security layer beyond access controls

## API Endpoints

The following endpoints handle encrypted VCs:

- `POST /api/user/vcs/add` - Add/update a VC (encrypts before storage)
- `GET /api/user/vcs` - List all user VCs (decrypts before returning)
- `POST /api/user/vcs/delete` - Delete a VC

## Testing

Run the encryption tests to verify the implementation:

```bash
cd backend

# Test encryption module
python3 test_vc_encryption.py

# Test database storage
python3 test_db_encryption.py
```

## Production Deployment

1. Generate a secure encryption key:
   ```bash
   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. Store the key securely (e.g., AWS Secrets Manager, HashiCorp Vault)

3. Set the environment variable:
   ```bash
   export VC_ENCRYPTION_KEY="your-secure-key-here=="
   ```

4. Deploy the application

5. Back up the encryption key in a secure location

## Key Rotation

To rotate the encryption key:

1. Deploy a new instance with the new key
2. Implement a migration script that:
   - Fetches all VCs
   - Decrypts with old key
   - Re-encrypts with new key
   - Updates database
3. Remove instances using the old key
4. Securely destroy the old key

## Troubleshooting

### "encryption_failed" Error

- Check that `VC_ENCRYPTION_KEY` is set correctly
- Verify the VC payload is valid JSON

### "Failed to decrypt VC" Error

- Verify you're using the correct encryption key
- Check if the VC was encrypted with a different key
- For legacy plain JSON VCs, they should be detected automatically

### VCs Not Accessible After Restart

- Ensure `VC_ENCRYPTION_KEY` is set in environment (not using temporary key)
- Verify the key is the same across all instances

## Security Considerations

1. **Key Management**: The encryption key is the most critical secret
2. **Key Storage**: Never commit keys to version control
3. **Access Control**: Limit who can access the encryption key
4. **Monitoring**: Log encryption/decryption failures
5. **Backups**: Include encrypted data in backups (it's useless without the key)

## Implementation Details

- **Module**: `backend/core/vc_crypto.py`
- **Encryptor Class**: `VCEncryptor`
- **Key Storage**: Environment variable `VC_ENCRYPTION_KEY`
- **Database Field**: `user_vcs.vc_payload` (TEXT)
- **Format Detection**: Automatic via `is_encrypted()` method

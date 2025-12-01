# Testing Guide: VC Import/Export Features

## Overview
This guide covers testing the new Verifiable Credential import/export functionality across all platforms.

## Features Implemented

### Backend API
- `/api/user/vcs/export` - Export all user credentials
- `/api/issuer/credentials/{vc_id}/download` - Download single credential  
- `/api/issuer/credentials/export/all` - Export all issuer credentials

### Web Application
- User Credentials page: Import & Export buttons
- Issuer Console: Download & Export All buttons

### Mobile Application
- Import/Export quick actions in Wallet screen
- QR code scanning for imports (existing)
- File sharing for exports

## Test Scenarios

### 1. Web - User Credential Export/Import

#### Test Export
1. Login to web application as a regular user
2. Navigate to "My Credentials" page
3. Click "Export All" button
4. Verify:
   - File downloads with name format: `credentials-export-{timestamp}.json`
   - File contains JSON with structure:
     ```json
     {
       "version": "1.0",
       "exported_at": "...",
       "user_did": "did:...",
       "credentials": [...]
     }
     ```
   - All credentials are included in the array

#### Test Import
1. On "My Credentials" page, click "Import" button
2. Select a credential JSON file:
   - Single credential file (`.json` or `.wpvc`)
   - OR exported bundle from Export All
3. Verify:
   - Success toast shows number imported
   - Credentials appear in the list
   - Duplicates are replaced, not duplicated
4. Test error handling:
   - Invalid JSON → shows error message
   - Missing required fields → shows validation error
   - Partial failures → shows count of successful/failed

### 2. Web - Issuer Console Features

#### Test Single Credential Download
1. Login to web as issuer
2. Navigate to Issuer Console → Credentials
3. Click on a credential to view details
4. Click "Download" button
5. Verify:
   - File downloads with name: `{vc_id}.wpvc`
   - File contains the complete signed credential
   - JSON is properly formatted

#### Test Bulk Export
1. On Issuer Console → Credentials list
2. Click "Export All" button
3. Verify:
   - File downloads with name: `issuer-credentials-{issuer_id}-{timestamp}.json`
   - File contains:
     ```json
     {
       "version": "1.0",
       "exported_at": "...",
       "issuer_did": "did:...",
       "issuer_name": "...",
       "total_credentials": N,
       "credentials": [
         {
           "credential": {...},
           "status": "valid|revoked",
           "issued_at": timestamp
         }
       ]
     }
     ```
   - All issued credentials are included

### 3. Mobile - Import/Export

#### Test Export
1. Open mobile app, navigate to Wallet tab
2. Ensure you have some credentials in wallet
3. Tap "Dışa Aktar" (Export) quick action
4. Verify:
   - Native share dialog appears
   - File name: `credentials-export-{timestamp}.json`
   - Can share via email, messaging, file manager
   - File structure matches web export format

#### Test Import
1. In Wallet tab, tap "İçe Aktar" (Import) quick action
2. Paste JSON text in the prompt
3. Test with:
   - Single credential JSON
   - Exported bundle
4. Verify:
   - Success message shows count imported
   - Credentials appear in wallet list
   - Can view imported credentials

#### Test QR Scanning
1. Generate a QR code containing a credential
2. Navigate to Scanner tab
3. Scan the QR code
4. Verify:
   - Credential is validated
   - Added to wallet automatically
   - Success message appears

### 4. Cross-Platform Testing

#### Export from Web, Import to Mobile
1. Export credentials from web application
2. Transfer file to mobile device
3. Copy JSON content to clipboard
4. Import via mobile app
5. Verify credentials appear correctly

#### Export from Mobile, Import to Web
1. Export credentials from mobile app
2. Share file to email or cloud storage
3. Download on web device
4. Import via web application
5. Verify credentials appear correctly

### 5. Edge Cases & Error Handling

#### Invalid Data
- Empty JSON object → Error message
- Malformed JSON → Parse error
- Missing required fields → Validation error
- Non-credential JSON → Format error

#### Duplicate Handling
- Import same credential twice → Should update, not duplicate
- Verify by checking credential count

#### Large Datasets
- Export/Import 50+ credentials
- Verify performance is acceptable
- Check for memory issues

#### Network Issues
- Test offline mode (mobile)
- Export should work offline
- Import should work offline

## Expected Results

### Success Criteria
✅ All exports create valid JSON files
✅ All imports parse and validate correctly
✅ No data loss during export/import cycle
✅ Proper error messages for invalid data
✅ Cross-platform compatibility works
✅ UI is responsive and shows progress
✅ Files are properly named and formatted

### Performance Targets
- Export 100 credentials: < 2 seconds
- Import 100 credentials: < 5 seconds
- File size: ~500 bytes per credential
- UI remains responsive during operations

## Troubleshooting

### Import Fails
1. Check JSON structure matches expected format
2. Verify required fields present: `@context` or `type`, `issuer`
3. Check console/logs for specific error

### Export Produces Empty File
1. Verify user has credentials in wallet
2. Check authentication/session
3. Review server logs

### Mobile Share Not Working
1. Check file system permissions
2. Verify sharing is available on device
3. Try alternate share target

## Security Considerations

⚠️ **Important**: Exported credentials contain sensitive information
- Store exported files securely
- Use encrypted channels for transfer
- Delete temporary files after import
- Don't share credentials publicly

## Test Data

### Sample Credential (for testing)
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "TestCredential"],
  "issuer": "did:example:issuer123",
  "issuanceDate": "2024-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:example:holder456",
    "name": "Test User"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-01T00:00:00Z"
  }
}
```

### Sample Export Bundle
```json
{
  "version": "1.0",
  "exported_at": "2024-01-01T00:00:00Z",
  "user_did": "did:example:user123",
  "credentials": [
    {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential", "TestCredential"],
      "issuer": "did:example:issuer123",
      "issuanceDate": "2024-01-01T00:00:00Z",
      "credentialSubject": {
        "id": "did:example:holder456"
      }
    }
  ]
}
```

## Reporting Issues

If you encounter issues during testing:
1. Note the exact steps to reproduce
2. Capture error messages/screenshots
3. Check browser/mobile console logs
4. Document expected vs actual behavior
5. Include file samples if applicable

## Sign-off Checklist

- [ ] Backend endpoints tested and working
- [ ] Web UI flows tested (user & issuer)
- [ ] Mobile flows tested (export & import)
- [ ] QR scanning verified
- [ ] Cross-platform transfers work
- [ ] Error handling validated
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Documentation complete

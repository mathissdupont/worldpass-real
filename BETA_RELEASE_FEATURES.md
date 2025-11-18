# Beta Release Features - WorldPass

## Overview
This document describes the new features added for the beta release of WorldPass, focusing on the Issue section enhancements.

## New Features

### 1. VC Templates System
Users can now create, manage, and reuse Verifiable Credential templates.

#### Features:
- **Create Templates**: Define reusable templates with credential type and field definitions
- **Template Management**: Full CRUD operations (Create, Read, Update, Delete)
- **Quick Apply**: Apply templates when issuing new credentials
- **Per-User Templates**: Each user manages their own template library

#### API Endpoints:
- `POST /api/user/templates` - Create a new template
- `GET /api/user/templates` - List all user's templates
- `PUT /api/user/templates/{id}` - Update a template
- `DELETE /api/user/templates/{id}` - Delete a template

#### Usage:
1. Navigate to the Issue page
2. Click "Şablonları Göster" (Show Templates)
3. Create a new template or use an existing one
4. Templates automatically populate credential type when selected

### 2. Recipient ID System
Each issued credential now includes a unique Recipient ID for tracking and verification.

#### Features:
- **Unique IDs**: Each credential gets a cryptographically random recipient ID
- **QR Code Support**: Recipient ID embedded in QR codes for easy scanning
- **NFC Support**: Write both VC and recipient lookup URL to NFC tags
- **Lookup Endpoint**: Retrieve credential information by recipient ID

#### Implementation:
- Recipient ID is stored in `issued_vcs.recipient_id` database field
- ID is also embedded in the credential subject: `credentialSubject.recipientId`
- Length: 16 characters (base64url encoded from 12 random bytes)

#### API Endpoints:
- `GET /api/recipient/{recipient_id}` - Lookup credential by recipient ID

#### QR/NFC Integration:
When a credential is issued:
1. A unique recipient ID is generated
2. QR code contains URL: `{origin}/api/recipient/{recipientId}`
3. NFC tag can store:
   - Full VC JSON (for offline verification)
   - Lookup URL (for online verification)

### 3. Enhanced Issue UI

#### Improvements:
- Template selector integrated into issue workflow
- Recipient ID prominently displayed after issuance
- QR code now points to recipient lookup URL
- Enhanced NFC writing with dual-record support
- Better visual feedback and step indicators

#### Workflow:
1. **Step 1**: Enter recipient details
   - Manual entry or scan QR/file
   - Template selection option
2. **Step 2**: Review and issue
   - Preview credential details
   - Confirm and generate
3. **Step 3**: Success
   - Display recipient ID
   - Show scannable QR code
   - NFC write option
   - Download VC JSON

## Database Changes

### New Table: `vc_templates`
```sql
CREATE TABLE vc_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  vc_type TEXT NOT NULL,
  fields TEXT NOT NULL,  -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Updated Table: `issued_vcs`
```sql
-- Added column:
recipient_id TEXT  -- Unique identifier for credential recipient

-- Added index:
CREATE INDEX idx_issued_vcs_recipient_id ON issued_vcs(recipient_id);
```

## Security Considerations

### Recipient ID Security:
- **Random Generation**: Uses cryptographically secure random number generator
- **Uniqueness**: 12-byte random value provides sufficient entropy (2^96 possible values)
- **URL-Safe**: Base64url encoding for safe use in URLs
- **No PII**: ID itself contains no personal information

### Template Security:
- **User Isolation**: Users can only access their own templates
- **Input Validation**: All template data validated on backend
- **No Injection**: JSON fields properly escaped and validated

### API Security:
- **Authentication**: Template endpoints require valid JWT token
- **Rate Limiting**: All endpoints have rate limits (20-30 req/min)
- **Authorization**: Users can only modify their own templates

## Testing

### Manual Testing Checklist:
- [ ] Create a new template
- [ ] Apply template when issuing credential
- [ ] Verify recipient ID is generated
- [ ] Scan QR code to lookup credential
- [ ] Test NFC writing (if NFC-capable device)
- [ ] Edit existing template
- [ ] Delete template
- [ ] Verify recipient lookup works

### Database Verification:
```bash
# Check templates table exists
sqlite3 worldpass.db "SELECT name FROM sqlite_master WHERE type='table' AND name='vc_templates';"

# Check recipient_id column exists
sqlite3 worldpass.db "PRAGMA table_info(issued_vcs);"

# List all templates
sqlite3 worldpass.db "SELECT id, name, vc_type FROM vc_templates;"
```

## Backward Compatibility

### Existing Credentials:
- Old credentials without recipient IDs will continue to work
- Lookup endpoint returns `not found` for missing recipient IDs
- No migration needed for existing data

### API Compatibility:
- All existing endpoints remain unchanged
- New endpoints are additive only
- Frontend gracefully handles missing recipient IDs

## Future Enhancements

### Potential Improvements:
1. Template sharing between users
2. Template marketplace/library
3. Bulk credential issuance using templates
4. Template versioning
5. Advanced field validation in templates
6. Recipient ID history/tracking
7. Analytics on credential usage by recipient ID

## Troubleshooting

### Common Issues:

**Templates not loading:**
- Check authentication token is valid
- Verify database connection
- Check browser console for errors

**Recipient ID not generated:**
- Ensure latest version of IssueVC component
- Check crypto.getRandomValues is available
- Verify database has recipient_id column

**QR code not working:**
- Verify base URL is correct
- Check recipient_id is in database
- Test lookup endpoint directly

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoint responses
3. Check database integrity
4. Review server logs

## Version Information

- **Feature Version**: 1.0.0
- **Release Date**: 2025-11-18
- **Status**: Beta
- **Compatible With**: WorldPass Backend v2.0+

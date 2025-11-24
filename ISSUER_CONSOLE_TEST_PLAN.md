# WorldPass Issuer Console - Testing & Verification Plan

## Overview
This document outlines the new issuer console features and how to test them.

## Backend API Testing

### Prerequisites
```bash
cd backend
python3 -m uvicorn app:app --host 127.0.0.1 --port 8000
```

### 1. Test Issuer Login & Authentication
```bash
# Register new issuer
curl -X POST http://127.0.0.1:8000/api/issuer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test University",
    "email": "admin@testuniv.edu",
    "password": "securepass123",
    "domain": "testuniv.edu",
    "did": "did:key:z6MkTest123"
  }'

# Login to get token
curl -X POST http://127.0.0.1:8000/api/issuer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testuniv.edu",
    "password": "securepass123"
  }'
# Save the token for subsequent requests
```

### 2. Test Dashboard Stats
```bash
TOKEN="<your-token-here>"

curl -X GET http://127.0.0.1:8000/api/issuer/stats \
  -H "X-Token: $TOKEN"
```

### 3. Test Credentials Management
```bash
# List credentials with pagination
curl -X GET "http://127.0.0.1:8000/api/issuer/credentials?page=1&per_page=20" \
  -H "X-Token: $TOKEN"

# List with filters
curl -X GET "http://127.0.0.1:8000/api/issuer/credentials?status=valid&search=john" \
  -H "X-Token: $TOKEN"

# Get credential detail
curl -X GET "http://127.0.0.1:8000/api/issuer/credentials/<vc_id>" \
  -H "X-Token: $TOKEN"
```

### 4. Test Templates Management
```bash
# List templates
curl -X GET http://127.0.0.1:8000/api/issuer/templates \
  -H "X-Token: $TOKEN"

# Create template
curl -X POST http://127.0.0.1:8000/api/issuer/templates \
  -H "Content-Type: application/json" \
  -H "X-Token: $TOKEN" \
  -d '{
    "name": "Student ID Card",
    "description": "Standard student identification",
    "vc_type": "StudentCard",
    "schema_data": {
      "fields": ["studentId", "name", "program", "year"]
    },
    "is_active": true
  }'

# Update template
curl -X PATCH "http://127.0.0.1:8000/api/issuer/templates/1" \
  -H "Content-Type: application/json" \
  -H "X-Token: $TOKEN" \
  -d '{
    "name": "Updated Student ID",
    "is_active": false
  }'

# Delete template
curl -X DELETE "http://127.0.0.1:8000/api/issuer/templates/1" \
  -H "X-Token: $TOKEN"
```

### 5. Test Webhooks Management
```bash
# List webhooks
curl -X GET http://127.0.0.1:8000/api/issuer/webhooks \
  -H "X-Token: $TOKEN"

# Create webhook
curl -X POST http://127.0.0.1:8000/api/issuer/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Token: $TOKEN" \
  -d '{
    "url": "https://example.com/webhook",
    "event_type": "credential.issued",
    "is_active": true,
    "secret": "webhook_secret_123"
  }'

# Update webhook
curl -X PATCH "http://127.0.0.1:8000/api/issuer/webhooks/1" \
  -H "Content-Type: application/json" \
  -H "X-Token: $TOKEN" \
  -d '{
    "is_active": false
  }'

# Delete webhook
curl -X DELETE "http://127.0.0.1:8000/api/issuer/webhooks/1" \
  -H "X-Token: $TOKEN"
```

### 6. Test Profile Update
```bash
curl -X PATCH http://127.0.0.1:8000/api/issuer/me \
  -H "Content-Type: application/json" \
  -H "X-Token: $TOKEN" \
  -d '{
    "name": "Updated University Name",
    "contact_email": "support@testuniv.edu",
    "support_link": "https://testuniv.edu/support",
    "timezone": "America/New_York",
    "locale": "en"
  }'
```

## Frontend Testing

### Prerequisites
```bash
cd web
npm run dev
```
Visit: http://localhost:5173

### 1. Issuer Login Flow
1. Navigate to `/issuer/login`
2. Enter credentials
3. Should redirect to `/issuer/console` (new dashboard)

### 2. Dashboard Page Tests
URL: `/issuer/console`

**Expected Elements:**
- [x] Sidebar navigation with 5 menu items
- [x] Top bar with WorldPass branding and logout button
- [x] 4 stat cards showing:
  - Total Issued credentials
  - Active credentials count
  - Revoked credentials count
  - Expired credentials count
- [x] Recent Credentials table with:
  - Credential ID (truncated)
  - Type
  - Subject DID (truncated)
  - Status badge (with icon)
  - Issue date
- [x] Quick action cards:
  - Issue Credential
  - Manage Templates
  - API Keys
- [x] Loading states when fetching data
- [x] Empty state if no credentials exist

**Interactions to Test:**
- Click on a credential row → should navigate to detail page
- Click "View All" button → should navigate to credentials page
- Click quick action cards → should navigate to respective pages
- Click sidebar navigation items → should navigate to pages
- Click logout → should show confirmation modal, then logout

### 3. Components Visual Testing

**StatCard Component:**
- Shows loading skeleton when data is loading
- Displays value, title, subtitle correctly
- Icon appears in top right
- Hover effect works

**DataTable Component:**
- Shows loading skeleton rows when loading
- Displays empty state message when no data
- Renders all columns correctly
- Pagination controls appear when data exceeds per_page
- Row click triggers onRowClick callback
- Hover effect on clickable rows

**IssuerSidebar:**
- Active route is highlighted
- Issuer info displayed correctly
- Status badge shows "Approved" or "Pending"

**IssuerLayout:**
- Sidebar is fixed on left (64 units wide)
- Content area is offset by sidebar width
- Top bar is fixed and spans full width
- Logout modal works

## Database Schema Verification

Run these queries to verify new tables and columns:

```sql
-- Check issuer table has new columns
PRAGMA table_info(issuers);
-- Should show: contact_email, support_link, timezone, locale

-- Check issued_vcs table
PRAGMA table_info(issued_vcs);
-- Should show: credential_type, updated_at

-- Check new tables exist
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('issuer_templates', 'issuer_webhooks');

-- Verify indexes
SELECT name FROM sqlite_master WHERE type='index' AND (name LIKE 'idx_issuer%' OR name LIKE 'idx_issued_vcs%');
```

## Edge Cases & Error Handling

### Backend
1. **Unauthorized access:** Try accessing endpoints without X-Token → should return 401
2. **Invalid pagination:** Try page=0 or per_page=1000 → should validate properly
3. **Non-existent resources:** Try getting credential/template/webhook with invalid ID → should return 404
4. **Cross-issuer access:** Try accessing another issuer's resources → should be blocked
5. **Invalid filters:** Try invalid status, date_from > date_to → should handle gracefully

### Frontend
1. **Token expiration:** Remove token from localStorage → should redirect to login
2. **Network errors:** Disconnect network → should show error message
3. **Empty states:** Login with new issuer (no data) → should show friendly empty states
4. **Long text:** Test with very long credential IDs, names → should truncate properly
5. **Responsive design:** Test on mobile viewport → should be usable

## Performance Considerations

1. **Pagination:** Test with 1000+ credentials to verify pagination works efficiently
2. **Parallel requests:** Dashboard makes 3 parallel API calls → should complete quickly
3. **Large payloads:** Test with credentials containing large claim objects

## Security Checklist

- [ ] All issuer endpoints require authentication
- [ ] Issuer can only access their own data
- [ ] API keys are hashed in database
- [ ] Webhook secrets are stored securely
- [ ] Audit logs capture all critical operations
- [ ] Rate limiting is applied
- [ ] Input validation prevents injection attacks

## Known Limitations

1. **Legacy Console:** Old console moved to `/issuer/console-legacy` for reference
2. **Incomplete Pages:** Only Dashboard implemented; Credentials, Templates, API, Settings pages need to be built
3. **Mobile UX:** Sidebar should collapse to hamburger menu on mobile (not yet implemented)
4. **Real-time Updates:** No websocket support for live credential status updates
5. **Batch Operations:** No bulk revoke/update functionality yet

## Next Steps

1. Implement remaining pages:
   - Credentials list page with filters
   - Credentials detail page
   - Templates CRUD page
   - API & Webhooks page
   - Settings page

2. Add more UX improvements:
   - Toast notifications for success/error
   - Confirmation modals for destructive actions
   - Better mobile responsiveness
   - Dark mode support

3. Performance optimizations:
   - Implement custom hooks (useIssuerCredentials, useIssuerStats, etc.)
   - Add request caching
   - Optimize bundle size

4. Testing:
   - Unit tests for components
   - Integration tests for API endpoints
   - E2E tests for critical flows

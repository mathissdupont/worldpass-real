# 🚀 WorldPass Deployment Guide

## Latest Updates (Nov 25, 2025)

### 🔐 Password Manager & Encryption
- Profile data encryption added (Fernet)
- Browser extension for auto-fill
- New endpoint: `GET /api/issuer/credentials`

### 🎨 Issuer Console Overhaul
- Complete UI/UX redesign
- Server-side credential issuance
- Responsive design (mobile-first)

### 🐛 Bug Fixes
- WorldPass Pay token issue fixed
- Profile save error handling improved
- Detailed error messages added

## 📋 Deployment Steps

### 1. Pull Latest Code
```bash
cd /srv/worldpass/worldpass-real
git pull origin main
```

### 2. Check for New Dependencies
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend (if package.json changed)
cd ../web
npm install
```

### 3. Rebuild Docker Containers
```bash
cd /srv/worldpass/worldpass-real
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 4. Check Container Status
```bash
docker compose ps
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

### 5. Test Critical Endpoints
```bash
# Health check
curl http://localhost:8000/api/health

# Issuer credentials (replace TOKEN)
curl -H "X-Token: YOUR_TOKEN" http://localhost:8000/api/issuer/credentials

# Profile save test (after login)
# Check browser console for detailed errors
```

## 🔍 Troubleshooting

### Profile Save 500 Error

**Symptoms:** 
- `save_profile_data_failed` error in console
- 500 status on `/api/user/profile-data` POST

**Diagnosis:**
```bash
# Check backend logs
docker compose logs backend | grep -i "profile"

# Check if cryptography is installed
docker compose exec backend python -c "from cryptography.fernet import Fernet; print('OK')"

# Check if profile_crypto module loads
docker compose exec backend python -c "from core.profile_crypto import ProfileEncryptor; print('OK')"
```

**Solutions:**
1. **Module not found**: Rebuild containers with `--no-cache`
2. **Encryption key issue**: Check `PROFILE_ENCRYPTION_KEY` in `.env`
3. **Database schema**: Check if `user_profiles` table exists

### Issuer Console Not Loading

**Check:**
```bash
# Verify issuer authentication
docker compose logs backend | grep -i "issuer"

# Check if new endpoint exists
curl -H "X-Token: TOKEN" http://localhost:8000/api/issuer/credentials
```

### WorldPass Pay Not Working

**Verify:**
```bash
# Check payment provider config
docker compose logs backend | grep -i "payment"

# Test payment intent creation
curl -X POST http://localhost:8000/api/payment/intent \
  -H "Content-Type: application/json" \
  -H "X-Token: TOKEN" \
  -d '{"amount_minor": 1000, "currency": "USD", "description": "Test", "return_url": "http://localhost:5173"}'
```

## 📝 Environment Variables

### Required in `.env`
```bash
# JWT Secret (generate with: python -c 'import secrets; print(secrets.token_hex(32))')
JWT_SECRET=your_secret_here

# Profile Encryption (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
PROFILE_ENCRYPTION_KEY=your_key_here

# VC Encryption (already exists, can reuse for profile)
VC_ENCRYPTION_KEY=your_key_here

# Admin password hash (bcrypt)
ADMIN_PASS_HASH=$2b$12$...

# Payment provider
PAYMENT_PROVIDER_BASE_URL=http://localhost:8000/mock-provider
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

## 🔐 Security Checklist

- [ ] Change default `ADMIN_PASS_HASH`
- [ ] Set unique `JWT_SECRET`
- [ ] Set unique `PROFILE_ENCRYPTION_KEY`
- [ ] Set unique `VC_ENCRYPTION_KEY`
- [ ] Change `PAYMENT_WEBHOOK_SECRET`
- [ ] Update `CORS_ORIGINS` for production
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `APP_URL` to production domain

## 📊 Post-Deployment Verification

### 1. Frontend
- [ ] Login works
- [ ] Profile page loads
- [ ] Profile save works (no 500 error)
- [ ] Password fields show/hide correctly
- [ ] Credentials page works

### 2. Issuer Console
- [ ] Login works
- [ ] Console loads with tabs
- [ ] Issue credential form works
- [ ] Issued credentials list loads
- [ ] Can revoke credentials

### 3. WorldPass Pay
- [ ] Payment demo page loads
- [ ] Can create payment intent
- [ ] Redirects to checkout
- [ ] Payment completion works

### 4. Browser Extension
- [ ] Extension installs
- [ ] Popup loads
- [ ] Sync credentials works
- [ ] Auto-fill appears on login pages

## 🆘 Emergency Rollback

If deployment causes issues:

```bash
cd /srv/worldpass/worldpass-real
git log --oneline -5  # Find previous commit
git checkout PREVIOUS_COMMIT_HASH
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 📞 Support

If issues persist:
1. Check Docker logs: `docker compose logs --tail=100`
2. Check browser console for frontend errors
3. Test API endpoints manually with curl
4. Verify environment variables are set correctly
5. Check database schema: `docker compose exec backend sqlite3 worldpass.db ".schema"`

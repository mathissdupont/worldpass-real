# 🔒 WorldPass Production Security Checklist

Bu dosyayı production'a deploy etmeden önce kontrol edin.

## 📋 Pre-Deployment Checklist

### 🔴 Kritik (Mutlaka Yapılmalı)

- [ ] **Environment Variables**
  ```bash
  # .env dosyası oluştur ve doldur
  cp .env.example .env
  
  # Güvenli değerler generate et
  python generate_secrets.py
  ```

- [ ] **JWT_SECRET**
  - [ ] Yeni bir secret generate edildi
  - [ ] .env dosyasına eklendi
  - [ ] Minimum 64 karakter

- [ ] **ADMIN_PASS_HASH**
  - [ ] Güçlü bir password seçildi
  - [ ] bcrypt hash'i generate edildi
  - [ ] .env dosyasına eklendi

- [ ] **VC_ENCRYPTION_KEY**
  - [ ] Yeni bir key generate edildi
  - [ ] .env dosyasına eklendi
  - [ ] Backup alındı (kaybolursa VCs decrypt edilemez!)

- [ ] **HTTPS/SSL**
  - [ ] SSL sertifikası kuruldu (Let's Encrypt önerilir)
  - [ ] HTTP → HTTPS redirect aktif
  - [ ] HTTPS enforce edildi

- [ ] **CORS_ORIGINS**
  - [ ] Sadece production domain(ler) eklendi
  - [ ] localhost kaldırıldı
  - [ ] Wildcard (*) kullanılmadı

- [ ] **Database**
  - [ ] Production database path set edildi
  - [ ] Database backup stratejisi kuruldu
  - [ ] Backup test edildi

### 🟡 Önemli (Şiddetle Önerilir)

- [ ] **Firewall**
  - [ ] Sadece 443 (HTTPS) ve 80 (HTTP redirect) portları açık
  - [ ] SSH erişimi kısıtlandı (sadece specific IP'ler)
  - [ ] Database portları kapalı (external access yok)

- [ ] **Monitoring & Logging**
  - [ ] Error tracking kuruldu (Sentry, etc.)
  - [ ] Log aggregation (CloudWatch, ELK, etc.)
  - [ ] Uptime monitoring (UptimeRobot, Pingdom)
  - [ ] Alert sistemi kuruldu

- [ ] **Backup**
  - [ ] Automated database backup (günlük)
  - [ ] Backup retention policy (30 gün)
  - [ ] Backup restore test edildi
  - [ ] Off-site backup storage

- [ ] **Rate Limiting**
  - [ ] Rate limit değerleri production için ayarlandı
  - [ ] IP-based rate limiting aktif
  - [ ] DDoS protection (Cloudflare, AWS Shield)

- [ ] **Security Headers**
  ```python
  # app.py'ye ekle
  @app.middleware("http")
  async def add_security_headers(request, call_next):
      response = await call_next(request)
      response.headers["X-Content-Type-Options"] = "nosniff"
      response.headers["X-Frame-Options"] = "DENY"
      response.headers["X-XSS-Protection"] = "1; mode=block"
      response.headers["Strict-Transport-Security"] = "max-age=31536000"
      return response
  ```

### 🟢 İsteğe Bağlı (Nice to Have)

- [ ] **WAF (Web Application Firewall)**
  - [ ] Cloudflare WAF
  - [ ] AWS WAF
  - [ ] ModSecurity

- [ ] **Security Scanning**
  - [ ] OWASP ZAP scan
  - [ ] Dependency vulnerability scan
  - [ ] Container security scan (if using Docker)

- [ ] **Compliance**
  - [ ] GDPR checklist (if EU users)
  - [ ] KVKK checklist (if Turkish users)
  - [ ] Privacy policy updated
  - [ ] Terms of service updated

- [ ] **Testing**
  - [ ] Penetration testing
  - [ ] Load testing
  - [ ] Security audit by third party

## 🧪 Post-Deployment Validation

Deploy ettikten sonra bu kontrolleri yap:

### Immediate Tests
```bash
# 1. HTTPS çalışıyor mu?
curl -I https://your-domain.com

# 2. HTTP → HTTPS redirect çalışıyor mu?
curl -I http://your-domain.com

# 3. Health check çalışıyor mu?
curl https://your-domain.com/api/health

# 4. CORS doğru mu?
curl -H "Origin: https://unauthorized-domain.com" \
     https://your-domain.com/api/health
```

### Security Headers Check
```bash
# Security header'ları kontrol et
curl -I https://your-domain.com | grep -E "X-|Strict"
```

### Rate Limiting Test
```bash
# Rate limiting çalışıyor mu? (429 döndürmeli)
for i in {1..15}; do 
  curl https://your-domain.com/api/user/login
done
```

## 🚨 Security Incident Response Plan

Eğer bir güvenlik problemi tespit edersen:

1. **Immediate Actions**
   - [ ] Sistemleri offline al (gerekirse)
   - [ ] Affected kullanıcıları belirle
   - [ ] Token'ları invalidate et (JWT_SECRET değiştir)
   - [ ] Password reset gerekiyorsa zorla

2. **Investigation**
   - [ ] Log'ları analiz et
   - [ ] Breach scope'unu belirle
   - [ ] Root cause analysis yap

3. **Remediation**
   - [ ] Vulnerability'yi patch'le
   - [ ] Security test et
   - [ ] Sistemleri tekrar online al

4. **Communication**
   - [ ] Affected kullanıcıları bilgilendir
   - [ ] Public disclosure (gerekirse)
   - [ ] Post-mortem yaz

## 📞 Emergency Contacts

Production'da sorun olursa:
- **DevOps**: [contact info]
- **Security Team**: [contact info]
- **On-call**: [phone number]

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: 25 Kasım 2025  
**Version**: 1.0  
**Maintainer**: WorldPass Security Team

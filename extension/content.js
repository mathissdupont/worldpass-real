// WorldPass AutoFill - Content Script
// Detects login forms and auto-fills credentials

(function() {
  'use strict';

  // --- Ortak helper: sayfadan token çıkar ---
  function extractTokenFromPage() {
    try {
      // 1) Bilinen key'ler
      const knownKeys = ['worldpass_token', 'token', 'auth_token', 'access_token'];
      let token = null;

      for (const key of knownKeys) {
        const val = window.localStorage.getItem(key);
        if (val && typeof val === 'string' && val.length > 20) {
          token = val;
          console.log('[WorldPass] Token found in localStorage with key:', key);
          break;
        }
      }

      // 2) Bulamazsak tüm localStorage'ı tara, JWT gibi duran ilk şeyi yakala
      if (!token) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          const v = window.localStorage.getItem(k);
          if (typeof v === 'string' && v.length > 20 && v.split('.').length === 3) {
            token = v;
            console.log('[WorldPass] JWT-like token found in localStorage key:', k);
            break;
          }
        }
      }

      // 3) Cookie'lerden dene
      if (!token && document.cookie) {
        const cookies = document.cookie.split(';').map(c => c.trim());
        for (const c of cookies) {
          const [name, val] = c.split('=');
          if (!val) continue;
          if (['token', 'worldpass_token', 'auth_token', 'access_token'].includes(name)) {
            if (val.length > 20) {
              token = decodeURIComponent(val);
              console.log('[WorldPass] Token found in cookie:', name);
              break;
            }
          }
          if (!token && val.split('.').length === 3 && val.length > 20) {
            token = decodeURIComponent(val);
            console.log('[WorldPass] JWT-like token found in cookie:', name);
            break;
          }
        }
      }

      return token || null;
    } catch (e) {
      console.error('[WorldPass] Error while extracting token from page:', e);
      return null;
    }
  }

  // --- Ortak helper: sayfadan DID (wallet_did) çıkar ---
  function extractDidFromPage() {
    try {
      // 1) Bilinen key'ler
      const knownKeys = ['wallet_did', 'did', 'user', 'profile', 'worldpass_profile'];
      let did = null;

      for (const key of knownKeys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;

        // Düz DID string'i olabilir
        if (typeof raw === 'string' && raw.startsWith('did:')) {
          console.log('[WorldPass] DID found in localStorage key:', key);
          return raw.trim();
        }

        // JSON içinde gömülü olabilir
        if (raw.startsWith('{') || raw.startsWith('[')) {
          try {
            const parsed = JSON.parse(raw);
            const found = findDidInObject(parsed);
            if (found) {
              console.log('[WorldPass] DID found inside JSON value of key:', key);
              return found.trim();
            }
          } catch (_) {
            // parse edemediysek geç
          }
        }
      }

      // 2) Cookie'lerde arayalım
      if (document.cookie) {
        const cookies = document.cookie.split(';').map(c => c.trim());
        for (const c of cookies) {
          const [name, val] = c.split('=');
          if (!val) continue;
          const dec = decodeURIComponent(val);
          if (dec.startsWith('did:')) {
            console.log('[WorldPass] DID found in cookie:', name);
            return dec.trim();
          }
        }
      }

      return did;
    } catch (e) {
      console.error('[WorldPass] Error while extracting DID from page:', e);
      return null;
    }
  }

  // Yardımcı: nesne içinde did: geçen string ara
  function findDidInObject(obj) {
    if (!obj) return null;

    if (typeof obj === 'string' && obj.startsWith('did:')) {
      return obj;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = findDidInObject(item);
        if (found) return found;
      }
    } else if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string' && val.startsWith('did:')) {
          return val;
        }
        const found = findDidInObject(val);
        if (found) return found;
      }
    }

    return null;
  }

  // worldpass-beta sayfasında otomatik token + DID gönder
  if (window.location.hostname === 'worldpass-beta.heptapusgroup.com') {
    try {
      const token = extractTokenFromPage();
      const walletDid = extractDidFromPage();

      if (token || walletDid) {
        chrome.runtime.sendMessage({
          action: 'setWorldpassTokenAndDid',
          token,
          walletDid
        });
        console.log('[WorldPass] Sent token/did to background from content script (auto)', {
          hasToken: !!token,
          walletDid
        });
      } else {
        console.warn('[WorldPass] No token or DID found on WorldPass page (auto)');
      }
    } catch (e) {
      console.warn('[WorldPass] Error while auto-sending token/did:', e);
    }
  }

  // Platform-specific selectors for login forms
  const SELECTORS = {
    instagram: {
      username: 'input[name="username"]',
      password: 'input[name="password"]',
      form: 'form'
    },
    twitter: {
      username: 'input[autocomplete="username"]',
      password: 'input[name="password"]',
      form: 'form'
    },
    github: {
      username: 'input[name="login"]',
      password: 'input[name="password"]',
      form: 'form'
    },
    facebook: {
      username: 'input[name="email"]',
      password: 'input[name="pass"]',
      form: 'form'
    },
    linkedin: {
      username: 'input[name="session_key"]',
      password: 'input[name="session_password"]',
      form: 'form'
    }
  };

  // Hangi platformda olduğumuzu algıla
  function detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('facebook.com')) return 'facebook';
    if (hostname.includes('linkedin.com')) return 'linkedin';

    return null;
  }

  // Check if we have credentials for this platform
  async function getCredentials(platform) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getCredentials', platform },
        (response) => {
          resolve(response);
        }
      );
    });
  }

  // Auto-fill the form
  async function autoFillForm(platform, credentials) {
    const selectors = SELECTORS[platform];
    if (!selectors) return;

    const passwordInput = document.querySelector(selectors.password);
    if (!passwordInput) return;

    // Only auto-fill if field is empty
    if (passwordInput.value) return;

    // Show WorldPass indicator
    showAutoFillIndicator(passwordInput, async () => {
      if (!credentials || !credentials.password) return;

      // Fill the password
      passwordInput.value = credentials.password;

      // Trigger input events so the page recognizes the change
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('[WorldPass] Auto-filled password');
    });
  }

  // Show WorldPass icon next to password field
  function showAutoFillIndicator(passwordInput, onFill) {
    // Check if indicator already exists
    if (passwordInput.nextElementSibling &&
        passwordInput.nextElementSibling.classList.contains('worldpass-autofill-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.className = 'worldpass-autofill-btn';
    button.innerHTML = '🔐';
    button.title = 'Auto-fill with WorldPass';
    button.type = 'button';

    // Style the button
    Object.assign(button.style, {
      position: 'absolute',
      right: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '6px',
      padding: '6px 10px',
      cursor: 'pointer',
      fontSize: '16px',
      zIndex: '10000',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      transition: 'all 0.2s ease'
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-50%) scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(-50%) scale(1)';
    });

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await onFill();

      // Animate success
      button.innerHTML = '✓';
      button.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';

      setTimeout(() => {
        button.innerHTML = '🔐';
        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }, 2000);
    });

    // Position relative to input
    const parent = passwordInput.parentElement;
    if (parent && window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    if (passwordInput.parentElement) {
      passwordInput.parentElement.insertBefore(button, passwordInput.nextSibling);
    }
  }

  // Initialize
  async function init() {
    const platform = detectPlatform();
    if (!platform) return;

    console.log('[WorldPass] Detected platform:', platform);

    // Get credentials from background script
    const credentials = await getCredentials(platform);

    if (credentials && credentials.password) {
      console.log('[WorldPass] Credentials found for', platform);

      // Wait for form to load
      const observer = new MutationObserver(() => {
        autoFillForm(platform, credentials);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Try immediately in case form is already loaded
      autoFillForm(platform, credentials);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // === WorldPass Token Extractor (manual connect için) ===
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getWorldpassToken') {
      try {
        if (window.location.hostname !== 'worldpass-beta.heptapusgroup.com') {
          sendResponse({ token: null, walletDid: null, error: 'Not on WorldPass domain' });
          return true;
        }

        const token = extractTokenFromPage();
        const walletDid = extractDidFromPage();

        if (!token && !walletDid) {
          console.warn('[WorldPass] Token/DID not found in page storage (manual connect)');
          sendResponse({ token: null, walletDid: null, error: 'Token/DID not found in page storage' });
        } else {
          console.log('[WorldPass] Token/DID extracted from page (manual connect)', {
            hasToken: !!token,
            walletDid
          });
          sendResponse({ token, walletDid });
        }
      } catch (e) {
        console.error('[WorldPass] Error reading token/DID from page storage', e);
        sendResponse({ token: null, walletDid: null, error: e.message });
      }

      return true;
    }
  });
})();

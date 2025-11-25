// WorldPass AutoFill - Content Script
// Detects login forms and auto-fills credentials

(function() {
  'use strict';

  // Detect which platform we're on
  function detectPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('facebook.com')) return 'facebook';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    
    return null;
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
    if (passwordInput.nextElementSibling?.classList.contains('worldpass-autofill-btn')) {
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
    
    passwordInput.parentElement?.insertBefore(button, passwordInput.nextSibling);
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
})();

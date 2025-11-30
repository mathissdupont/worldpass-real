// WorldPass AutoFill - Background Service Worker
// Manages credentials and communicates with WorldPass API

// PROD ve LOCAL API ayarları
const API_BASE = 'https://worldpass-beta.heptapusgroup.com/api'; // Production
const LOCAL_API = 'http://localhost:8000/api'; // Development
const USE_LOCAL = false; // true yaparsan local backend'e vurur

function getApiBase() {
  return USE_LOCAL ? LOCAL_API : API_BASE;
}

// Listen for messages from popup & content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Şifre çekme (content.js bu endpoint'i kullanıyor)
  if (request.action === 'getCredentials') {
    getCredentialsForPlatform(request.platform)
      .then(sendResponse)
      .catch(err => {
        console.error('[WorldPass] Error getting credentials:', err);
        sendResponse(null);
      });
    return true; // async response için channel açık kalsın
  }

  // Popup'tan manuel sync
  if (request.action === 'syncCredentials') {
    syncCredentialsFromAPI()
      .then(() => sendResponse({ success: true }))
      .catch(err => {
        console.error('[WorldPass] Error syncing credentials:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  // worldpass-beta.heptapusgroup.com'dan token + DID otomatik geldiğinde kaydet
  if (request.action === 'setWorldpassTokenAndDid') {
    const toStore = {};
    if (request.token) {
      toStore.worldpass_token = request.token;
    }
    if (request.walletDid) {
      toStore.worldpass_wallet_did = request.walletDid;
    }

    if (Object.keys(toStore).length > 0) {
      chrome.storage.local.set(toStore, () => {
        if (chrome.runtime.lastError) {
          console.error('[WorldPass] Error saving token/did:', chrome.runtime.lastError);
        } else {
          console.log('[WorldPass] worldpass_token/worldpass_wallet_did set from content script');
        }
      });
    }
  }

  // Eski akışla sadece token gelirse geriye uyum için destekle
  if (request.action === 'setWorldpassToken' && request.token) {
    chrome.storage.local.set({ worldpass_token: request.token }, () => {
      if (chrome.runtime.lastError) {
        console.error('[WorldPass] Error saving worldpass_token:', chrome.runtime.lastError);
      } else {
        console.log('[WorldPass] worldpass_token set from content script (legacy)');
      }
    });
  }
});

// Get credentials for a specific platform
async function getCredentialsForPlatform(platform) {
  const credentials = await chrome.storage.local.get('worldpass_credentials');

  if (!credentials.worldpass_credentials) {
    return null;
  }

  const data = credentials.worldpass_credentials;
  const passwordField = `${platform}_password`;

  if (data[passwordField]) {
    return {
      platform,
      password: data[passwordField],
      username: data[platform] || null
    };
  }

  return null;
}

// Sync credentials from WorldPass API
async function syncCredentialsFromAPI() {
  // Get auth token + wallet_did
  const { worldpass_token, worldpass_wallet_did } = await chrome.storage.local.get([
    'worldpass_token',
    'worldpass_wallet_did'
  ]);

  if (!worldpass_token) {
    throw new Error('Not logged in to WorldPass (missing token)');
  }

  const apiUrl = `${getApiBase()}/user/profile-data`;
  console.log('[WorldPass] Fetching credentials from:', apiUrl);
  console.log('[WorldPass] Using wallet_did:', worldpass_wallet_did);

  const headers = {
    'X-Token': worldpass_token,
    'Content-Type': 'application/json'
  };

  // Backend _get_current_user wallet_did istiyorsa header ekle
  if (worldpass_wallet_did && typeof worldpass_wallet_did === 'string') {
    headers['X-Wallet-Did'] = worldpass_wallet_did.trim();
  }

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers
  });

  const text = await response.text();
  if (!response.ok) {
    console.error('[WorldPass] API error body:', text);
    throw new Error(`API error: ${response.status} - ${text || 'no body'}`);
  }

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error('[WorldPass] Failed to parse JSON:', e, text);
    throw new Error(`API error: ${response.status} - invalid JSON`);
  }

  if (data.ok && data.profile_data) {
    await chrome.storage.local.set({
      worldpass_credentials: data.profile_data,
      last_sync: Date.now()
    });

    console.log('[WorldPass] Credentials synced successfully');
  } else {
    console.warn('[WorldPass] API response did not contain profile_data:', data);
    throw new Error('API response missing profile_data');
  }
}

// Auto-sync on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('[WorldPass] Extension installed/updated');

  // Set up periodic sync (every 15 minutes)
  chrome.alarms.create('sync_credentials', {
    periodInMinutes: 15
  });
});

// Handle alarm for periodic sync
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_credentials') {
    syncCredentialsFromAPI()
      .catch(err => console.error('[WorldPass] Background sync failed:', err));
  }
});

// Sync when browser starts
chrome.runtime.onStartup.addListener(() => {
  syncCredentialsFromAPI()
    .catch(err => console.error('[WorldPass] Startup sync failed:', err));
});

// WorldPass AutoFill - Background Service Worker
// Manages credentials and communicates with WorldPass API

const API_BASE = 'https://worldpass.io/api'; // Change to your production URL
const LOCAL_API = 'http://localhost:8000/api'; // For development

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCredentials') {
    getCredentialsForPlatform(request.platform)
      .then(sendResponse)
      .catch(err => {
        console.error('Error getting credentials:', err);
        sendResponse(null);
      });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'syncCredentials') {
    syncCredentialsFromAPI()
      .then(() => sendResponse({ success: true }))
      .catch(err => {
        console.error('Error syncing credentials:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
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
  // Get auth token
  const { worldpass_token } = await chrome.storage.local.get('worldpass_token');
  
  if (!worldpass_token) {
    throw new Error('Not logged in to WorldPass');
  }
  
  // Fetch profile data from API
  const apiUrl = `${LOCAL_API}/user/profile-data`; // Use LOCAL_API for dev, API_BASE for prod
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Token': worldpass_token,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.ok && data.profile_data) {
    // Store credentials locally
    await chrome.storage.local.set({
      worldpass_credentials: data.profile_data,
      last_sync: Date.now()
    });
    
    console.log('[WorldPass] Credentials synced successfully');
  }
}

// Auto-sync on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('[WorldPass] Extension installed');
  
  // Set up periodic sync (every 15 minutes)
  chrome.alarms.create('sync_credentials', {
    periodInMinutes: 15
  });
});

// Handle alarm for periodic sync
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_credentials') {
    syncCredentialsFromAPI()
      .catch(err => console.error('Background sync failed:', err));
  }
});

// Sync when browser starts
chrome.runtime.onStartup.addListener(() => {
  syncCredentialsFromAPI()
    .catch(err => console.error('Startup sync failed:', err));
});

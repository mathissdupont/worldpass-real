// WorldPass AutoFill - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Update status
  await updateStatus();
  
  // Sync button
  document.getElementById('sync-btn').addEventListener('click', syncCredentials);
  
  // Open WorldPass button
  document.getElementById('open-worldpass').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/account' }); // Change to production URL
  });
});

async function updateStatus() {
  try {
    const { worldpass_token, worldpass_credentials, last_sync } = 
      await chrome.storage.local.get(['worldpass_token', 'worldpass_credentials', 'last_sync']);
    
    // Update status badge
    const statusBadge = document.getElementById('status-badge');
    if (worldpass_token) {
      statusBadge.textContent = 'Connected';
      statusBadge.className = 'badge badge-success';
    } else {
      statusBadge.textContent = 'Not Logged In';
      statusBadge.className = 'badge badge-warning';
    }
    
    // Update last sync time
    const lastSyncEl = document.getElementById('last-sync');
    if (last_sync) {
      const date = new Date(last_sync);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 1000 / 60);
      
      if (diffMinutes < 1) {
        lastSyncEl.textContent = 'Just now';
      } else if (diffMinutes < 60) {
        lastSyncEl.textContent = `${diffMinutes}m ago`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        lastSyncEl.textContent = `${diffHours}h ago`;
      }
    } else {
      lastSyncEl.textContent = 'Never';
    }
    
    // Count credentials (password fields)
    let credCount = 0;
    if (worldpass_credentials) {
      for (const key in worldpass_credentials) {
        if (key.endsWith('_password')) {
          credCount++;
        }
      }
    }
    document.getElementById('cred-count').textContent = credCount;
    
  } catch (error) {
    console.error('Error updating status:', error);
    showError('Failed to load status');
  }
}

async function syncCredentials() {
  const syncBtn = document.getElementById('sync-btn');
  const loading = document.getElementById('loading');
  const container = document.querySelector('.status');
  
  try {
    // Show loading
    syncBtn.disabled = true;
    container.style.display = 'none';
    loading.style.display = 'block';
    hideError();
    
    // Send sync message to background script
    const response = await chrome.runtime.sendMessage({ action: 'syncCredentials' });
    
    if (response.success) {
      // Update status
      await updateStatus();
      showSuccess();
    } else {
      throw new Error(response.error || 'Sync failed');
    }
    
  } catch (error) {
    console.error('Sync error:', error);
    showError(error.message || 'Failed to sync. Please login to WorldPass first.');
  } finally {
    syncBtn.disabled = false;
    container.style.display = 'block';
    loading.style.display = 'none';
  }
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function hideError() {
  const errorEl = document.getElementById('error');
  errorEl.style.display = 'none';
}

function showSuccess() {
  const syncBtn = document.getElementById('sync-btn');
  const originalText = syncBtn.textContent;
  
  syncBtn.textContent = '✓ Synced!';
  syncBtn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
  
  setTimeout(() => {
    syncBtn.textContent = originalText;
    syncBtn.style.background = '';
  }, 2000);
}

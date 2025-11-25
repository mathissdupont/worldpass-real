# WorldPass Browser Extension

## 🚀 Features

- **Auto-Fill Passwords**: Automatically detect login forms and fill passwords from WorldPass
- **Secure Sync**: Credentials are encrypted on the server and synced to your browser
- **Multi-Platform**: Works on Instagram, Twitter, GitHub, Facebook, LinkedIn and more
- **Beautiful UI**: Clean, modern interface matching WorldPass design

## 📦 Installation

### For Development

1. **Build the extension:**
   ```bash
   # The extension is ready to use, no build needed
   ```

2. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `extension` folder

3. **Load in Firefox:**
   - Open Firefox and go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the `extension` folder (like `manifest.json`)

### For Production

1. **Configure API URL:**
   - Edit `background.js`
   - Change `API_BASE` to your production URL
   - Change `LOCAL_API` to your production URL

2. **Create extension icons:**
   ```bash
   # Create icons folder
   mkdir extension/icons
   
   # Add 16x16, 48x48, and 128x128 PNG icons
   # Use WorldPass logo with transparent background
   ```

3. **Package extension:**
   - **Chrome**: Zip the extension folder and upload to Chrome Web Store
   - **Firefox**: Zip the extension folder and upload to Firefox Add-ons

## 🔐 How It Works

1. **User adds credentials in WorldPass** (Profile page)
2. **Backend encrypts passwords** using Fernet encryption
3. **Extension syncs credentials** from WorldPass API
4. **Content script detects login forms** on supported sites
5. **Shows WorldPass button** next to password fields
6. **User clicks to auto-fill** their password

## 🔧 Configuration

### Adding More Platforms

Edit `content.js` and add selectors:

```javascript
const SELECTORS = {
  // Add your platform
  tiktok: {
    username: 'input[name="username"]',
    password: 'input[type="password"]',
    form: 'form'
  }
};
```

Then add the platform to `manifest.json`:

```json
"host_permissions": [
  "https://tiktok.com/*"
],
"content_scripts": [{
  "matches": [
    "https://tiktok.com/*"
  ]
}]
```

### Token Storage

The extension needs a WorldPass auth token. Users must:

1. Login to WorldPass in the browser
2. Extension will need to extract token from localStorage or you can add a "Connect" flow

**TODO**: Add proper OAuth flow or token export from WorldPass web app

## 📝 Files

- `manifest.json` - Extension configuration
- `background.js` - Background service worker (syncs credentials)
- `content.js` - Injected into web pages (detects forms, auto-fills)
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic (sync button, status)

## 🔒 Security

- ✅ Passwords encrypted on server (Fernet encryption)
- ✅ Credentials synced over HTTPS
- ✅ Stored in Chrome's secure storage API
- ✅ Extension only runs on whitelisted domains
- ✅ No external dependencies

## 📱 Future Features

- [ ] Fingerprint/Face ID unlock
- [ ] Password generator
- [ ] Auto-fill for more sites
- [ ] Form detection improvements
- [ ] Cross-browser sync
- [ ] 2FA code auto-fill

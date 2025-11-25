# WorldPass Extension - Installation Guide

## 🚀 Quick Start

### Step 1: Install Extension

#### Chrome/Edge:
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the extension folder

### Step 2: Connect to WorldPass

1. **Login to WorldPass**: Open http://localhost:5173 (or your WorldPass URL)
2. **Go to Settings**: Click Settings from the menu
3. **Copy Token**: In the "Browser Extension" section, click "Copy Token"
4. **Open Extension**: Click the WorldPass icon in your browser toolbar
5. **Manual Setup** (temporary):
   - Open browser console (F12)
   - Run: `chrome.storage.local.set({ worldpass_token: 'PASTE_TOKEN_HERE' })`
   - Close console

### Step 3: Add Passwords

1. Go to WorldPass → Profile page
2. Add your social media accounts:
   - Instagram username + password
   - Twitter username + password
   - GitHub username + password
   - etc.
3. Click "Save" for each

### Step 4: Sync & Test

1. Click the WorldPass extension icon
2. Click "Sync Now"
3. Should show "Connected" and credential count
4. Visit Instagram.com (or another supported site)
5. Look for the 🔐 button next to the password field
6. Click it to auto-fill!

## 🔧 Troubleshooting

### Extension shows "Not Logged In"
- Make sure you copied the token correctly
- Token might have expired - get a fresh one from Settings

### No 🔐 button on login page
- Make sure you synced credentials in the extension popup
- Check that you saved a password for that platform in your Profile
- Try refreshing the page

### Auto-fill not working
- Open browser DevTools Console (F12)
- Look for `[WorldPass]` messages
- May need to add that site's selectors to `content.js`

### Sync fails
- Check that WorldPass backend is running
- Verify the API URL in `background.js` matches your setup
- Check browser console for errors

## 📱 Supported Sites (Currently)

- ✅ Instagram
- ✅ Twitter/X
- ✅ GitHub
- ✅ Facebook
- ✅ LinkedIn

Want more? Edit `content.js` and `manifest.json` to add new platforms!

## 🔐 Security Notes

- Passwords are encrypted on the WorldPass server (Fernet encryption)
- Extension stores credentials in Chrome's secure storage API
- Credentials sync over HTTPS only
- Extension only runs on whitelisted domains
- No third-party services or analytics

## 🎨 Branding

Don't forget to add icon files to `icons/` folder:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

See `icons/README.md` for details.

## 📝 Production Deployment

Before publishing to Chrome Web Store or Firefox Add-ons:

1. Update API URLs in `background.js`:
   ```javascript
   const API_BASE = 'https://your-production-domain.com/api';
   ```

2. Add proper icons (see `icons/README.md`)

3. Test thoroughly on all supported sites

4. Create a privacy policy page

5. Prepare screenshots and promotional images

6. Submit to browser stores!

## 🐛 Development

To modify the extension:

1. Edit files in the `extension/` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the WorldPass extension
4. Test your changes

No build step required - it's vanilla JavaScript!

## 📧 Support

Issues? Questions? 
- Check WorldPass main documentation
- Open a GitHub issue
- Join our Discord (link TBD)

Happy auto-filling! 🔐✨

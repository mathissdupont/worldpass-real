# WorldPass AutoFill - Privacy Policy

**Last Updated: November 25, 2025**

## Overview

WorldPass AutoFill is a secure password manager extension that helps you automatically fill your passwords on supported websites. Your privacy and security are our top priorities.

## Data Collection and Storage

### What Data We Collect

- **Encrypted Passwords**: Your passwords are encrypted on our server using Fernet encryption before being stored
- **Account Credentials**: Your WorldPass account email and authentication token
- **Website Usernames**: Usernames associated with your saved passwords (Instagram, Twitter, GitHub, etc.)
- **Sync Timestamps**: Last sync time for credential updates

### What Data We DO NOT Collect

- ❌ Browsing history
- ❌ Website content
- ❌ Search queries
- ❌ Unrelated personal information
- ❌ Credit card information
- ❌ Location data

### How Data is Stored

1. **Server Storage**: All passwords are encrypted using Fernet (symmetric encryption) on the WorldPass server
2. **Local Storage**: Encrypted credentials are cached locally in Chrome's secure storage API for offline access
3. **No Third Parties**: We never share your data with third parties

## Permission Justifications

### activeTab
**Why needed**: To detect login forms on the current tab and insert the auto-fill button next to password fields.

**How used**: Only activates when you visit supported websites (Instagram, Twitter, GitHub, etc.). Does not access tabs you don't actively use.

### storage
**Why needed**: To securely store your encrypted passwords locally for quick auto-fill without re-downloading from the server each time.

**How used**: Stores encrypted credential data in Chrome's secure storage API. Only accessible by this extension.

### tabs
**Why needed**: To open the WorldPass web app when you click "Open WorldPass" button in the extension popup.

**How used**: Only creates new tabs when you explicitly click a button. Does not monitor or track your tabs.

### alarms
**Why needed**: To automatically sync your passwords from the WorldPass server every 15 minutes, keeping your credentials up-to-date.

**How used**: Creates a background timer that fetches updated credentials from your WorldPass account. You can disable auto-sync in the extension popup.

### Host Permissions (instagram.com, twitter.com, etc.)
**Why needed**: To detect login forms and inject the auto-fill button on supported websites.

**How used**: 
- Detects password input fields on login pages
- Inserts a small button next to the password field
- Only activates on explicitly listed domains
- Does not collect any data from these websites

## Data Security

- **End-to-End Encryption**: Passwords encrypted with Fernet before leaving your device
- **Secure Communication**: All API calls use HTTPS
- **No Remote Code**: Extension does not load any external JavaScript
- **Open Source**: Code is publicly available for security audit

## Single Purpose

This extension has ONE purpose: **Securely store and auto-fill your passwords on supported websites.**

We do not:
- Track your browsing
- Show advertisements
- Collect analytics
- Sell your data
- Inject ads or affiliate links

## Remote Code

**Justification**: This extension does NOT use remote code. All JavaScript is bundled in the extension package and does not load external scripts.

The extension only communicates with the WorldPass API (worldpass.io) to sync your encrypted credentials.

## User Control

You have full control:
- ✅ Delete all credentials anytime from WorldPass settings
- ✅ Disable auto-sync
- ✅ Uninstall the extension to remove all local data
- ✅ Revoke access from WorldPass account settings

## Data Retention

- Credentials are stored as long as your WorldPass account is active
- Deleting credentials from WorldPass removes them from all devices
- Uninstalling the extension removes all local data
- We do not retain deleted data

## Contact

For privacy concerns or questions:
- Email: support@worldpass.io
- Website: https://worldpass.io
- GitHub: https://github.com/mathissdupont/worldpass-real

## Changes to This Policy

We will notify users of any privacy policy changes through the extension update notes and our website.

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)

---

By using WorldPass AutoFill, you agree to this privacy policy.

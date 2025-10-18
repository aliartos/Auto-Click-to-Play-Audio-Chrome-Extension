# Privacy Policy for Auto Click to Play Audio

**Last Updated:** October 18, 2025

## Overview

Auto Click to Play Audio ("the Extension") is committed to protecting your privacy. This privacy policy explains how the Extension handles data and what information, if any, is collected or processed.

## Data Collection

**The Extension does NOT collect, store, or transmit any personal data or browsing information to any external servers.**

### What We Don't Collect

- ❌ Browsing history
- ❌ Personal information
- ❌ Website content or URLs visited
- ❌ User credentials or login information
- ❌ Payment information
- ❌ Analytics or usage statistics
- ❌ Cookies or tracking data
- ❌ Device information
- ❌ Location data

## Data Storage

The Extension stores configuration settings **locally on your device only** using Chrome's built-in storage API (`chrome.storage.sync`). This data includes:

### Settings Stored Locally

1. **Extension State** - Whether the extension is enabled or disabled
2. **Silence Duration** - The time threshold (in milliseconds) before triggering a click
3. **Button Selector** - The CSS selector you specify for the button to click
4. **Retry Interval** - Optional retry timing configuration
5. **Randomization** - Optional timing randomization settings
6. **Tab Preferences** - Whether to monitor all tabs or a specific tab
7. **Tab ID** - ID of specific tab if monitoring a single tab

### Storage Characteristics

- **Location:** All data is stored locally on your device
- **Synchronization:** Settings may sync across your Chrome browsers if you're signed into Chrome sync
- **Control:** You can clear all settings at any time through the extension popup or by uninstalling the extension
- **Persistence:** Settings persist until you modify or clear them
- **Size:** Total storage used is less than 1KB

## Permissions Usage

The Extension requires certain permissions to function. Here's exactly how each permission is used:

### Host Permissions (`<all_urls>`)

**Purpose:** Access web pages to monitor audio and click buttons

**Usage:**
- Detects when audio starts or stops playing on web pages
- Injects content script to click user-specified buttons
- Only activates on tabs where you enable the extension

**Data Handling:** No data from web pages is collected or stored

### Scripting Permission

**Purpose:** Execute button clicks on web pages

**Usage:**
- Injects content script to simulate clicking the button you specify
- Shows visual confirmation when a click occurs
- Only interacts with elements matching your CSS selector

**Data Handling:** No page content is read, stored, or transmitted

### Storage Permission

**Purpose:** Save your configuration settings

**Usage:**
- Stores the settings listed above locally on your device
- Allows settings to persist between browser sessions

**Data Handling:** Only your configuration is stored; no website data is stored

### Tabs Permission

**Purpose:** Monitor audio playback status

**Usage:**
- Reads the `audible` property to detect audio playback
- Identifies which tab is playing audio
- Filters out restricted pages for security

**Data Handling:** No URLs, page titles, or browsing history is collected

### TabGroups Permission

**Purpose:** Display tab organization in the extension popup

**Usage:**
- Shows tab groups when selecting which tab to monitor
- Provides better user experience for tab selection

**Data Handling:** Read-only access; no modifications to tab groups

## Third-Party Services

**The Extension does NOT use any third-party services, including:**

- ❌ No analytics services (Google Analytics, etc.)
- ❌ No crash reporting services
- ❌ No advertising networks
- ❌ No external APIs or web services
- ❌ No content delivery networks (CDNs)
- ❌ No remote code execution

All code is bundled within the extension package and runs entirely locally on your device.

## Data Sharing

**The Extension does NOT share any data with third parties** because it doesn't collect any data in the first place.

- No data is transmitted to developers
- No data is sold or monetized
- No data is shared with advertisers
- No data is used for profiling or tracking

## Children's Privacy

The Extension does not knowingly collect any information from children under 13 (or applicable age in your jurisdiction). The Extension does not collect information from anyone.

## Security

Since no data is collected or transmitted:

- There is no data at risk of breach
- All settings are stored using Chrome's secure storage API
- The extension follows Chrome's security best practices
- Code is minified but not obfuscated for transparency

## Your Rights and Control

You have complete control over the Extension:

### You Can:

- ✅ View all settings in the extension popup
- ✅ Modify any setting at any time
- ✅ Clear all settings by resetting the extension
- ✅ Disable the extension temporarily
- ✅ Uninstall the extension completely
- ✅ Review the source code (open source)

### Data Deletion

To delete all data stored by the Extension:

1. **Reset Settings:** Click the reset button in the extension popup, or
2. **Uninstall:** Remove the extension from Chrome (Settings > Extensions > Remove)

Upon uninstalling, all locally stored settings are automatically deleted.

## Open Source

The Extension is open source, which means:

- ✅ Full source code is available for review on GitHub
- ✅ Anyone can audit the code for privacy concerns
- ✅ Community can verify no data collection occurs
- ✅ Transparent development process

**GitHub Repository:** [https://github.com/aliartos/chrome-extension](https://github.com/aliartos/chrome-extension)

## Changes to This Privacy Policy

If the Extension's privacy practices change in future versions:

- This document will be updated with a new "Last Updated" date
- Changes will be noted in the CHANGELOG.md file
- Users will be notified through the Chrome Web Store update description

## Compliance

This Extension complies with:

- ✅ Chrome Web Store Developer Program Policies
- ✅ General Data Protection Regulation (GDPR)
- ✅ California Consumer Privacy Act (CCPA)
- ✅ Children's Online Privacy Protection Act (COPPA)

**Compliance Statement:** Since the Extension does not collect any personal data, there is no personal data to process, store, or transmit under any privacy regulation.

## Contact Information

If you have questions or concerns about this privacy policy:

**Developer:** Auto Click to Play Audio Team  
**Email:** [Your contact email]  
**GitHub Issues:** [https://github.com/aliartos/Auto-Click-to-Play-Audio-Chrome-Extension/issues](https://github.com/aliartos/Auto-Click-to-Play-Audio-Chrome-Extension/issues)

## Consent

By installing and using the Extension, you acknowledge that:

1. The Extension does not collect personal data
2. Settings are stored locally on your device
3. You can delete all data by uninstalling the extension
4. You have read and understood this privacy policy

## Summary (TL;DR)

- ✅ **Zero data collection** - No personal data, browsing history, or analytics
- ✅ **Local storage only** - Settings saved on your device, never transmitted
- ✅ **No third parties** - No external services, APIs, or tracking
- ✅ **Full control** - You can view, modify, or delete all settings anytime
- ✅ **Open source** - Code is publicly available for review
- ✅ **Privacy-first** - Designed with privacy as the top priority

---

**Version:** 1.0.0  
**Last Updated:** October 18, 2025  
**Effective Date:** October 18, 2025

# Auto Click to Play Audio - Build Guide

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Setup

Install dependencies:

```bash
npm install
```

## Development

To work on the extension during development:

1. Make changes to the source files
2. Open `chrome://extensions/` in Chrome
3. Click the refresh icon on the extension card to reload
4. Test your changes

## Building for Production

### Standard Build

Run the build script to create a production-ready version:

```bash
npm run build
```

This will:
- Create a `dist/` directory with all necessary files
- Generate a ZIP file ready for Chrome Web Store submission

### Production Build (Remove Debug Logs)

For a cleaner production build without console logs:

```bash
npm run build:prod
```

This removes all `console.log()`, `console.warn()`, and `console.error()` statements from the code.

### Clean Build

To remove the dist directory:

```bash
npm run clean
```

## Build Output

After building, you'll find:
- `dist/` - Directory with all extension files
- `dist/auto-click-audio-v1.0.0.zip` - ZIP archive ready for publishing

## Testing the Build

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory
5. Test all functionality

## Publishing to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item"
3. Upload `dist/auto-click-audio-v1.0.0.zip`
4. Fill in store listing details:
   - Name: Auto Click to Play Audio
   - Description: Automatically clicks a button to resume audio playback when silence is detected
   - Category: Productivity
   - Add screenshots of the extension popup
5. Submit for review

## Version Updates

To release a new version:

1. Update version number in `manifest.json`
2. Update `CHANGELOG.md` with new features/fixes
3. Run `npm run build:prod`
4. Upload new ZIP to Chrome Web Store

## Files Included in Build

- `manifest.json` - Extension configuration
- `background.js` - Service worker (audio monitoring)
- `content.js` - Content script (page interaction)
- `popup.html` - Settings interface
- `popup.js` - Settings logic
- `styles.css` - UI styling
- `icon16.png`, `icon48.png`, `icon128.png` - Extension icons
- `README.md` - Documentation

## Excluded from Build

- `build.js` - Build script
- `package.json` - npm configuration
- `BUILD.md` - This file
- `.gitignore` - Git ignore rules
- `.git/` - Git repository
- `node_modules/` - npm dependencies
- `dist/` - Previous builds

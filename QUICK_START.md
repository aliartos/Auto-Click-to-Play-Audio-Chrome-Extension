# Quick Start Guide

## For Developers

### Initial Setup
```bash
npm install
```

### Development Commands

**Build for testing:**
```bash
npm run build
```

**Build for production (removes console logs):**
```bash
npm run build:prod
```

**Clean build directory:**
```bash
npm run clean
```

### Load Extension in Chrome

1. Run `npm run build`
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` folder

### Making Changes

1. Edit source files (don't edit files in `dist/`)
2. Run `npm run build` to rebuild
3. Go to `chrome://extensions/` and click the refresh icon
4. Test your changes

## Project Structure

```
chrome-extension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker (audio monitoring)
├── content.js         # Content script (page interaction)
├── popup.html         # Settings UI
├── popup.js           # Settings logic
├── styles.css         # UI styling
├── icon*.png          # Extension icons
├── package.json       # npm configuration
├── build.js           # Build script
└── dist/              # Build output (generated)
```

## Publishing

1. Build for production: `npm run build:prod`
2. Upload `dist/auto-click-audio-v1.0.0.zip` to Chrome Web Store
3. Follow Chrome Web Store submission process

## Version Bump

1. Update version in `manifest.json`
2. Update `CHANGELOG.md`
3. Run `npm run build:prod`
4. Commit changes
5. Tag release: `git tag v1.0.1`
6. Upload new ZIP to store

# Audio Monitor & Auto-Clicker Chrome Extension

A Chrome extension that monitors audio playback on web pages and automatically clicks a specified button when audio stops playing for a configurable duration.

## Features

- 🔊 **Audio Monitoring**: Automatically detects when audio starts and stops playing on any tab
- ⏱️ **Configurable Timeout**: Set custom silence duration (default: 3 seconds) before triggering the button click
- � **Timing Randomization**: Add random variation to silence duration for more human-like behavior
- �🎯 **Flexible Button Selection**: Target any button using CSS selectors (ID, class, or element selector)
- 🔁 **Retry Mechanism**: Optionally retry clicking the button at regular intervals if audio doesn't resume
- 🧪 **Test Mode**: Test your button selector before saving to ensure it works correctly
- 📊 **Real-time Status**: View current audio status and extension configuration
- 🌐 **All Tabs Support**: Works across all open tabs simultaneously

## Installation

### Load Unpacked Extension (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" button
4. Select the `chrome-extension` folder
5. The extension should now appear in your extensions list

### Using the Extension

1. Click the extension icon in your Chrome toolbar to open the settings popup
2. Configure your settings in the **Basic** tab:
   - **Enable Extension**: Toggle the extension on/off
   - **Silence Duration**: Set how many seconds to wait after audio stops before clicking the button
   - **Button Selector**: Enter the CSS selector for the button you want to click
   - **Retry Interval**: Set retry interval in seconds (0 to disable) to keep clicking if audio doesn't resume

3. Configure advanced settings in the **Advanced** tab:
   - **Timing Randomization**: Add random variation (in milliseconds) to make timing more human-like
     - Example: Setting 1000ms adds ±500ms variation to the silence duration
     - This prevents predictable timing patterns

4. Click "Save Settings" to save your configuration
5. Use "Test Click" to verify your button selector works on the current page

## Configuration

### Button Selector Examples

The button selector uses CSS selector syntax. Here are some examples:

- `#playButton` - Select button with ID "playButton"
- `.play-btn` - Select button with class "play-btn"
- `button.resume` - Select `<button>` element with class "resume"
- `[aria-label="Play"]` - Select element with aria-label "Play"
- `div.player button.play` - Select button with class "play" inside a div with class "player"

### How to Find the Right Selector

1. Right-click on the button you want to click
2. Select "Inspect" or "Inspect Element"
3. Look for the button's ID (e.g., `id="playButton"`) or class (e.g., `class="play-btn"`)
4. Use the appropriate selector format:
   - For ID: `#buttonId`
   - For class: `.className`

## How It Works

1. **Audio Detection**: The extension monitors Chrome's native audio indicators for each tab
2. **Silence Timer**: When audio stops, a countdown timer starts based on your configured duration
3. **Button Click**: If audio doesn't resume before the timer expires, the extension clicks the specified button
4. **Reset**: If audio starts playing again, the timer is reset

## File Structure

```
chrome-extension/
├── manifest.json       # Extension configuration
├── background.js       # Background service worker (audio monitoring)
├── content.js         # Content script (page interaction)
├── popup.html         # Settings UI
├── popup.js           # Settings logic
├── styles.css         # UI styling
└── README.md          # This file
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**:
  - `storage`: Save user settings
  - `tabs`: Monitor tab audio state
  - `scripting`: Click buttons on web pages
  - `<all_urls>`: Access all websites (only when extension is active)

## Use Cases

- **Music/Video Players**: Auto-play next track when current one ends
- **Language Learning**: Continue lessons automatically when audio pauses
- **Podcasts**: Resume playback after ads or interruptions
- **Any scenario where you want automatic interaction after audio stops**

## Troubleshooting

### Button not clicking?

1. Make sure your button selector is correct using the "Test Click" button
2. Check if the button exists on the page when audio stops
3. Try using a more specific selector if multiple elements match

### Extension not working?

1. Verify the extension is enabled in the popup
2. Check that you've entered a button selector
3. Make sure the page has audio elements (audio/video tags)
4. Check the browser console for any error messages

## Privacy

This extension:
- Only runs when you enable it
- Stores settings locally in your browser
- Does not collect or transmit any data
- Only interacts with pages you visit

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## License

This project is open source and available for personal and commercial use.

## Support

For issues, questions, or contributions, please create an issue in the project repository.

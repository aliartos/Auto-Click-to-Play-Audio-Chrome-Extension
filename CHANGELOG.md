# Changelog

All notable changes to the Auto Click to Play Audio extension will be documented in this file.

## [1.0.0] - 2025-10-18

### Added
- Initial release
- Audio monitoring across all tabs or specific tab
- Configurable silence duration before triggering button click
- Flexible CSS selector-based button targeting
- Timing randomization for human-like behavior
- Retry mechanism for persistent clicking if audio doesn't resume
- Smart CSS selector suggestions for pasted class names
- Real-time validation and error handling
- Visual confirmation notifications when button is clicked
- Extension status badge (ON/OFF/!)
- Test click functionality from popup
- Support for buttons in iframes
- Advanced tab with additional configuration options

### Features
- **Basic Settings**
  - Enable/disable extension toggle
  - Silence duration (1-60 seconds)
  - Button selector (CSS)
  - Retry interval (0-300 seconds)

- **Advanced Settings**
  - Timing randomization (0-silence duration in ms)
  - Monitor all tabs or specific tab selection
  - Tab list with refresh capability

### Technical
- Manifest V3 support
- Chrome APIs: storage, tabs, scripting, tabGroups
- Service worker for background processing
- Content scripts for page interaction
- Comprehensive error handling for restricted pages
- Dynamic validation for configuration values

### Security
- Only accesses pages with proper permissions
- Skips restricted Chrome pages automatically
- Local storage only - no data collection
- No external network requests

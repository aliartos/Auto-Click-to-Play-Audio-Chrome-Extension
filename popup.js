// Popup script for managing settings

const DEFAULT_CONFIG = {
  enabled: true,
  timespan: 3000,
  buttonSelector: '',
  monitorAllTabs: true
};

// DOM elements
const enabledCheckbox = document.getElementById('enabled');
const timespanInput = document.getElementById('timespan');
const buttonSelectorInput = document.getElementById('buttonSelector');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const statusDiv = document.getElementById('status');
const audioStatusDiv = document.getElementById('audioStatus');

// Load saved settings
chrome.storage.sync.get('config', (data) => {
  const config = data.config || DEFAULT_CONFIG;
  
  enabledCheckbox.checked = config.enabled;
  timespanInput.value = config.timespan / 1000; // Convert ms to seconds
  buttonSelectorInput.value = config.buttonSelector;
  
  updateAudioStatus();
});

// Save settings
saveBtn.addEventListener('click', () => {
  const config = {
    enabled: enabledCheckbox.checked,
    timespan: parseInt(timespanInput.value) * 1000, // Convert seconds to ms
    buttonSelector: buttonSelectorInput.value.trim(),
    monitorAllTabs: true
  };

  // Validate button selector
  if (config.enabled && !config.buttonSelector) {
    showStatus('Please enter a button selector', 'error');
    return;
  }

  // Validate selector format
  if (config.buttonSelector && !isValidSelector(config.buttonSelector)) {
    showStatus('Invalid CSS selector format', 'error');
    return;
  }

  chrome.storage.sync.set({ config }, () => {
    showStatus('Settings saved successfully!', 'success');
    updateAudioStatus();
  });
});

// Test button click
testBtn.addEventListener('click', async () => {
  const buttonSelector = buttonSelectorInput.value.trim();
  
  if (!buttonSelector) {
    showStatus('Please enter a button selector first', 'error');
    return;
  }

  if (!isValidSelector(buttonSelector)) {
    showStatus('Invalid CSS selector format', 'error');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selector) => {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          return { 
            success: true, 
            selector: selector,
            buttonText: button.textContent?.trim() || button.value || 'No text'
          };
        }
        return { success: false, selector: selector, error: 'Button not found' };
      },
      args: [buttonSelector]
    });

    if (results && results[0]) {
      const result = results[0].result;
      if (result.success) {
        showStatus(`✓ Button clicked successfully! (Text: "${result.buttonText}")`, 'success');
      } else {
        showStatus(`✗ ${result.error}: "${result.selector}"`, 'error');
      }
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// Validate CSS selector
function isValidSelector(selector) {
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch (e) {
    return false;
  }
}

// Show status message
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

// Update audio status display
async function updateAudioStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const config = await chrome.storage.sync.get('config');
    const settings = config.config || DEFAULT_CONFIG;
    
    let statusHTML = '<div class="status-item">';
    
    if (!settings.enabled) {
      statusHTML += '<span class="status-badge disabled">Disabled</span>';
      statusHTML += '<p>Extension is currently disabled</p>';
    } else if (!settings.buttonSelector) {
      statusHTML += '<span class="status-badge warning">Not Configured</span>';
      statusHTML += '<p>Please set a button selector</p>';
    } else {
      statusHTML += '<span class="status-badge active">Active</span>';
      statusHTML += `<p>Monitoring: ${settings.timespan / 1000}s silence threshold</p>`;
      statusHTML += `<p>Target: <code>${settings.buttonSelector}</code></p>`;
    }
    
    if (tab.audible) {
      statusHTML += '<p class="audio-playing">🔊 Audio is currently playing</p>';
    } else {
      statusHTML += '<p class="audio-silent">🔇 No audio detected</p>';
    }
    
    statusHTML += '</div>';
    audioStatusDiv.innerHTML = statusHTML;
  } catch (error) {
    audioStatusDiv.innerHTML = '<p class="error">Error loading status</p>';
  }
}

// Update status periodically
setInterval(updateAudioStatus, 2000);

// Update status when inputs change
enabledCheckbox.addEventListener('change', updateAudioStatus);
buttonSelectorInput.addEventListener('input', updateAudioStatus);
timespanInput.addEventListener('input', updateAudioStatus);

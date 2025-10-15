// Popup script for managing settings

const DEFAULT_CONFIG = {
  enabled: true,
  timespan: 3000,
  buttonSelector: '',
  retryInterval: 0,
  monitorAllTabs: true
};

// DOM elements
const enabledCheckbox = document.getElementById('enabled');
const timespanInput = document.getElementById('timespan');
const buttonSelectorInput = document.getElementById('buttonSelector');
const retryIntervalInput = document.getElementById('retryInterval');
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
  retryIntervalInput.value = (config.retryInterval || 0) / 1000; // Convert ms to seconds
  
  updateAudioStatus();
});

// Save settings
saveBtn.addEventListener('click', () => {
  const config = {
    enabled: enabledCheckbox.checked,
    timespan: parseInt(timespanInput.value) * 1000, // Convert seconds to ms
    buttonSelector: buttonSelectorInput.value.trim(),
    retryInterval: parseInt(retryIntervalInput.value) * 1000, // Convert seconds to ms
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
    const statusMsg = config.enabled ? 
      'Settings saved! Extension is now active.' : 
      'Settings saved! Extension is now disabled.';
    showStatus(statusMsg, 'success');
    updateAudioStatus();
  });
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
    
    showStatus('Searching for button...', 'info');
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: (selector) => {
        // Function to simulate realistic user click
        function simulateUserClick(element) {
          const rect = element.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          // Dispatch multiple events as a real user would
          const events = [
            new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y })
          ];
          
          events.forEach(event => element.dispatchEvent(event));
          
          // Also call native click as fallback
          element.click();
        }
        
        // Only search in current frame's document (since allFrames runs this in each frame)
        let button = document.querySelector(selector);
        if (button) {
          simulateUserClick(button);
          return { 
            success: true, 
            selector: selector,
            buttonText: button.textContent?.trim() || button.value || button.getAttribute('aria-label') || 'No text',
            classes: button.className,
            location: window === window.top ? 'main page' : 'iframe',
            immediate: true
          };
        }
        
        // Not found in this frame
        return { 
          success: false, 
          selector: selector, 
          error: 'Button not found in this frame'
        };
      },
      args: [buttonSelector]
    });

    if (results && results.length > 0) {
      // Check all frames for success
      const successResults = results.filter(r => r.result && r.result.success);
      
      if (successResults.length > 0) {
        const result = successResults[0].result;
        showStatus(`✓ Button clicked successfully in ${result.location}! - "${result.buttonText}"`, 'success');
      } else {
        const result = results[0].result;
        let errorMsg = `✗ Button not found in any frame`;
        showStatus(errorMsg, 'error');
        console.log('Checked frames:', results.length);
      }
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
});

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
      if (settings.retryInterval > 0) {
        statusHTML += `<p>Retry: Every ${settings.retryInterval / 1000}s if no audio</p>`;
      }
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
retryIntervalInput.addEventListener('input', updateAudioStatus);

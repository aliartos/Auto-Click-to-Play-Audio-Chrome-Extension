// Popup script for managing settings

const DEFAULT_CONFIG = {
  enabled: true,
  timespan: 3000,
  buttonSelector: '',
  retryInterval: 0,
  randomization: 0,
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

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    
    // Update active button
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Update active content
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Load saved settings
chrome.storage.sync.get('config', (data) => {
  const config = data.config || DEFAULT_CONFIG;
  document.getElementById('enabled').checked = config.enabled;
  document.getElementById('timespan').value = config.timespan / 1000; // Convert ms to seconds
  document.getElementById('buttonSelector').value = config.buttonSelector || '';
  document.getElementById('retryInterval').value = config.retryInterval / 1000; // Convert ms to seconds
  document.getElementById('randomization').value = config.randomization || 0;
});

// Enable/Disable toggle - immediate effect without saving
enabledCheckbox.addEventListener('change', async () => {
  chrome.storage.sync.get('config', async (data) => {
    const config = data.config || DEFAULT_CONFIG;
    config.enabled = enabledCheckbox.checked;
    
    chrome.storage.sync.set({ config }, async () => {
      const statusMsg = config.enabled ? 
        '✓ Extension enabled' : 
        '✗ Extension disabled';
      showStatus(statusMsg, config.enabled ? 'success' : 'info');
      updateAudioStatus();
      
      // If enabling, check current tab's audio state
      if (config.enabled) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          // Notify background to check audio state for all tabs
          chrome.runtime.sendMessage({ action: 'recheckAudio' });
        }
      }
    });
  });
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.get('config', (data) => {
    const config = data.config || DEFAULT_CONFIG;
    
    config.enabled = document.getElementById('enabled').checked;
    config.timespan = parseInt(document.getElementById('timespan').value) * 1000; // Convert to ms
    config.buttonSelector = document.getElementById('buttonSelector').value.trim();
    config.retryInterval = parseInt(document.getElementById('retryInterval').value) * 1000; // Convert to ms
    config.randomization = parseInt(document.getElementById('randomization').value) || 0;

    chrome.storage.sync.set({ config }, () => {
      // Show save confirmation
      const saveBtn = document.getElementById('save');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 2000);
    });
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
          
          // Try focus if it's a focusable element
          if (typeof element.focus === 'function') {
            try {
              element.focus();
            } catch (e) {
              // Ignore focus errors
            }
          }
          
          // Use minimal event sequence to avoid passive listener issues
          try {
            const eventOptions = { 
              bubbles: true, 
              cancelable: true, 
              view: window, 
              clientX: x, 
              clientY: y,
              composed: true
            };
            
            element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
            element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
            element.dispatchEvent(new MouseEvent('click', eventOptions));
          } catch (e) {
            // Ignore event dispatch errors
          }
          
          // Native click as the most reliable method
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

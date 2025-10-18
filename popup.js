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
const monitorAllTabsCheckbox = document.getElementById('monitorAllTabs');
const specificTabGroup = document.getElementById('specificTabGroup');
const specificTabSelect = document.getElementById('specificTabId');
const refreshTabsBtn = document.getElementById('refreshTabs');
const saveBtn = document.getElementById('save');
const testBtn = document.getElementById('test');
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

// Function to load tabs list
async function loadTabsList() {
  const tabs = await chrome.tabs.query({});
  specificTabSelect.innerHTML = '<option value="">-- Select a tab --</option>';
  
  tabs.forEach(tab => {
    const option = document.createElement('option');
    option.value = tab.id;
    const title = tab.title || 'Untitled';
    const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
    option.textContent = `${truncatedTitle}${tab.audible ? ' 🔊' : ''}`;
    specificTabSelect.appendChild(option);
  });
}

// Monitor All Tabs toggle handler
monitorAllTabsCheckbox.addEventListener('change', () => {
  if (monitorAllTabsCheckbox.checked) {
    specificTabGroup.classList.remove('visible');
  } else {
    specificTabGroup.classList.add('visible');
    loadTabsList();
  }
});

// Refresh tabs button
refreshTabsBtn.addEventListener('click', () => {
  loadTabsList();
  showStatus('Tabs list refreshed', 'success');
});

// Load saved settings
chrome.storage.sync.get('config', (data) => {
  const config = data.config || DEFAULT_CONFIG;
  document.getElementById('enabled').checked = config.enabled;
  document.getElementById('timespan').value = config.timespan / 1000; // Convert ms to seconds
  document.getElementById('buttonSelector').value = config.buttonSelector || '';
  document.getElementById('retryInterval').value = config.retryInterval / 1000; // Convert ms to seconds
  document.getElementById('randomization').value = config.randomization || 0;
  document.getElementById('monitorAllTabs').checked = config.monitorAllTabs !== false;
  
  // Show/hide specific tab selection based on monitorAllTabs
  if (!config.monitorAllTabs) {
    specificTabGroup.classList.add('visible');
    loadTabsList().then(() => {
      if (config.specificTabId) {
        specificTabSelect.value = config.specificTabId;
      }
    });
  }
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
    config.monitorAllTabs = document.getElementById('monitorAllTabs').checked;
    config.specificTabId = config.monitorAllTabs ? null : parseInt(document.getElementById('specificTabId').value) || null;

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

// Smart selector suggestion for class names
function checkAndSuggestSelector(input) {
  const value = input.trim();
  
  // Skip if empty or already has CSS selector syntax
  if (!value || value.includes('.') || value.includes('#') || value.includes('[') || value.includes('>')) {
    return null;
  }
  
  // Check if it looks like multiple class names (space-separated words)
  const words = value.split(/\s+/);
  
  // If we have 2+ words, likely copied class names
  if (words.length >= 2) {
    // Check if words look like class names (alphanumeric, hyphens, underscores)
    const looksLikeClasses = words.every(word => /^[a-zA-Z0-9_-]+$/.test(word));
    
    if (looksLikeClasses) {
      return '.' + words.join('.');
    }
  }
  
  // Check if single word without dot (might be a class name)
  if (words.length === 1 && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
    // Could be ID or class - suggest both options
    return {
      class: '.' + value,
      id: '#' + value
    };
  }
  
  return null;
}

// Add input handler for button selector with smart suggestions
buttonSelectorInput.addEventListener('input', (e) => {
  const value = e.target.value;
  const suggestion = checkAndSuggestSelector(value);
  
  // Remove any existing suggestion
  const existingSuggestion = document.getElementById('selectorSuggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }
  
  if (suggestion) {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.id = 'selectorSuggestion';
    suggestionDiv.className = 'selector-suggestion';
    
    if (typeof suggestion === 'string') {
      suggestionDiv.innerHTML = `
        <span class="suggestion-text">💡 Did you mean: <code>${suggestion}</code>?</span>
        <button class="btn-suggestion" data-value="${suggestion}">Use this</button>
      `;
    } else {
      suggestionDiv.innerHTML = `
        <span class="suggestion-text">💡 Did you mean:</span>
        <button class="btn-suggestion" data-value="${suggestion.class}">Class: <code>${suggestion.class}</code></button>
        <button class="btn-suggestion" data-value="${suggestion.id}">ID: <code>${suggestion.id}</code></button>
      `;
    }
    
    buttonSelectorInput.parentNode.insertBefore(suggestionDiv, buttonSelectorInput.nextSibling);
    
    // Add click handlers to suggestion buttons
    suggestionDiv.querySelectorAll('.btn-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        buttonSelectorInput.value = btn.getAttribute('data-value');
        suggestionDiv.remove();
        // Trigger input event to revalidate
        buttonSelectorInput.dispatchEvent(new Event('input'));
      });
    });
  }
});

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

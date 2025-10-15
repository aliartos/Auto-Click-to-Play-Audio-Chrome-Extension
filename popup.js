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
        
        // Try immediate query first in current context
        let button = document.querySelector(selector);
        if (button) {
          simulateUserClick(button);
          return { 
            success: true, 
            selector: selector,
            buttonText: button.textContent?.trim() || button.value || button.getAttribute('aria-label') || 'No text',
            classes: button.className,
            location: 'main page',
            immediate: true
          };
        }
        
        // Try to find in iframes
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          try {
            const iframe = iframes[i];
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              const buttonInIframe = iframeDoc.querySelector(selector);
              if (buttonInIframe) {
                simulateUserClick(buttonInIframe);
                return {
                  success: true,
                  selector: selector,
                  buttonText: buttonInIframe.textContent?.trim() || buttonInIframe.value || buttonInIframe.getAttribute('aria-label') || 'No text',
                  classes: buttonInIframe.className,
                  location: `iframe ${i + 1}`,
                  immediate: true
                };
              }
            }
          } catch (e) {
            // Cross-origin iframe, can't access
          }
        }
        
        // If not found, return detailed debug info
        const allElements = document.querySelectorAll('*');
        const similarClasses = [];
        const selectorParts = selector.match(/\.[\w-]+/g) || [];
        
        allElements.forEach(el => {
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ');
            classes.forEach(cls => {
              selectorParts.forEach(part => {
                const className = part.substring(1); // Remove the dot
                if (cls.includes(className) || className.includes(cls)) {
                  similarClasses.push(cls);
                }
              });
            });
          }
        });
        
        return { 
          success: false, 
          selector: selector, 
          error: 'Button not found in main page or iframes',
          debug: {
            totalElements: allElements.length,
            iframeCount: document.querySelectorAll('iframe').length,
            similarClasses: [...new Set(similarClasses)].slice(0, 10),
            readyState: document.readyState,
            selectorParsed: selectorParts
          }
        };
      },
      args: [buttonSelector]
    });

    if (results && results.length > 0) {
      // Check all frames for success
      const successResult = results.find(r => r.result && r.result.success);
      
      if (successResult) {
        const result = successResult.result;
        showStatus(`✓ Button clicked successfully in ${result.location}! - "${result.buttonText}"`, 'success');
      } else {
        const result = results[0].result;
        let errorMsg = `✗ ${result.error}: "${result.selector}"`;
        if (result.debug) {
          if (result.debug.iframeCount > 0) {
            errorMsg += ` | Found ${result.debug.iframeCount} iframe(s)`;
          }
          if (result.debug.similarClasses.length > 0) {
            errorMsg += ` | Similar: ${result.debug.similarClasses.slice(0, 3).join(', ')}`;
          }
        }
        showStatus(errorMsg, 'error');
        console.log('Full debug info:', result.debug);
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

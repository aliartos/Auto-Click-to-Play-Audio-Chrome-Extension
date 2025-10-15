// Background service worker for monitoring audio across tabs

const DEFAULT_CONFIG = {
  enabled: true,
  timespan: 3000, // 3 seconds in milliseconds
  buttonSelector: '', // CSS selector for the button (class or id)
  monitorAllTabs: true
};

// Store audio state for each tab
const tabAudioState = new Map();

// Update extension badge based on config
function updateBadge(config) {
  if (config.enabled && config.buttonSelector) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else if (config.buttonSelector) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#999' });
  } else {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF9800' });
  }
}

// Initialize configuration
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('config', (data) => {
    if (!data.config) {
      chrome.storage.sync.set({ config: DEFAULT_CONFIG });
      updateBadge(DEFAULT_CONFIG);
    } else {
      updateBadge(data.config);
    }
  });
});

// Listen for config changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.config) {
    const newConfig = changes.config.newValue;
    updateBadge(newConfig);
    
    // Clear all pending timeouts if extension is disabled
    if (!newConfig.enabled) {
      console.log('[Audio Monitor] Extension disabled, clearing all timers');
      tabAudioState.forEach((state, tabId) => {
        if (state.timeoutId) {
          clearTimeout(state.timeoutId);
          state.timeoutId = null;
        }
      });
    }
  }
});

// Monitor tab audio state changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.audible !== undefined) {
    handleAudioChange(tabId, changeInfo.audible, tab);
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabAudioState.has(tabId)) {
    const state = tabAudioState.get(tabId);
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    tabAudioState.delete(tabId);
  }
});

// Handle audio state changes
function handleAudioChange(tabId, isAudible, tab) {
  chrome.storage.sync.get('config', (data) => {
    const config = data.config || DEFAULT_CONFIG;
    
    // Get or create tab state
    let state = tabAudioState.get(tabId);
    if (!state) {
      state = {
        isAudible: false,
        timeoutId: null,
        lastAudioTime: null
      };
      tabAudioState.set(tabId, state);
    }

    // Always clear existing timeout
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
    
    // If disabled or no selector, stop here
    if (!config.enabled || !config.buttonSelector) {
      console.log(`[Audio Monitor] Tab ${tabId}: Extension disabled or no selector configured`);
      return;
    }

    if (isAudible) {
      // Audio is playing
      state.isAudible = true;
      state.lastAudioTime = Date.now();
      console.log(`[Audio Monitor] Tab ${tabId}: Audio started playing`);
    } else {
      // Audio stopped
      state.isAudible = false;
      console.log(`[Audio Monitor] Tab ${tabId}: Audio stopped, waiting ${config.timespan}ms`);
      
      // Set timeout to click button after configured timespan
      state.timeoutId = setTimeout(() => {
        clickButtonInTab(tabId, config.buttonSelector);
      }, config.timespan);
    }
  });
}

// Click button in the specified tab
async function clickButtonInTab(tabId, buttonSelector) {
  try {
    // Check if tab still exists
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) {
      console.log(`[Audio Monitor] Tab ${tabId} no longer exists`);
      tabAudioState.delete(tabId);
      return;
    }

    // Execute content script to click the button with retry logic (all frames)
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: (selector) => {
        // Function to wait for element with retries (only in current frame)
        function waitForElement(selector, maxAttempts = 10, interval = 500) {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const check = () => {
              // Only search in current frame's document
              let button = document.querySelector(selector);
              if (button) {
                resolve(button);
                return;
              }
              
              attempts++;
              if (attempts >= maxAttempts) {
                reject(new Error('Button not found after retries'));
                return;
              }
              
              setTimeout(check, interval);
            };
            
            check();
          });
        }
        
        // Function to simulate realistic user click
        function simulateUserClick(element) {
          const rect = element.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          // Scroll element into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Dispatch multiple events as a real user would
          const events = [
            new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
            new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y })
          ];
          
          events.forEach(event => element.dispatchEvent(event));
          
          // Also call native click as fallback
          element.click();
          
          // Try focus if it's a focusable element
          if (typeof element.focus === 'function') {
            element.focus();
          }
        }
        
        // Try to find and click the button
        return waitForElement(selector)
          .then((button) => {
            simulateUserClick(button);
            
            const location = window === window.top ? 'main page' : 'iframe';
            
            // Log to page console for confirmation
            console.log('[Audio Monitor Extension] Button clicked:', {
              selector: selector,
              location: location,
              timestamp: new Date().toISOString(),
              buttonText: button.textContent?.trim() || button.getAttribute('aria-label') || 'N/A'
            });
            
            return { 
              success: true, 
              selector: selector,
              location: location,
              buttonInfo: {
                tag: button.tagName,
                classes: button.className,
                ariaLabel: button.getAttribute('aria-label'),
                timestamp: new Date().toISOString()
              }
            };
          })
          .catch(error => {
            return { 
              success: false, 
              selector: selector, 
              error: error.message || 'Button not found'
            };
          });
      },
      args: [buttonSelector]
    });

    if (results && results.length > 0) {
      // Check all frames for success (but only take the first success to avoid double-clicking)
      const successResults = results.filter(r => r.result && r.result.success);
      
      if (successResults.length > 0) {
        const result = successResults[0].result;
        console.log(`[Audio Monitor] Tab ${tabId}: ✓ Successfully clicked button in ${result.location} with selector "${buttonSelector}"`, result.buttonInfo);
        
        if (successResults.length > 1) {
          console.warn(`[Audio Monitor] Tab ${tabId}: Warning - Button found in ${successResults.length} frames, clicked only once`);
        }
        
        // Send notification to content script for visual confirmation (only to main frame)
        chrome.tabs.sendMessage(tabId, {
          action: 'buttonClicked',
          selector: buttonSelector,
          location: result.location,
          timestamp: result.buttonInfo.timestamp
        }).catch(() => {
          // Content script might not be ready, ignore error
        });
      } else {
        console.warn(`[Audio Monitor] Tab ${tabId}: ✗ Button not found in any frame (checked ${results.length} frames) for selector "${buttonSelector}"`);
      }
    }
  } catch (error) {
    console.error(`[Audio Monitor] Error clicking button in tab ${tabId}:`, error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAudioState') {
    const state = Array.from(tabAudioState.entries()).map(([tabId, data]) => ({
      tabId,
      isAudible: data.isAudible,
      lastAudioTime: data.lastAudioTime
    }));
    sendResponse({ state });
  }
  return true;
});

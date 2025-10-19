// Background service worker for monitoring audio across tabs

const DEFAULT_CONFIG = {
  enabled: true,
  timespan: 1000, // 1 seconds in milliseconds
  buttonSelector: '', // CSS selector for the button (class or id)
  retryInterval: 10000, // Retry interval in milliseconds (0 = disabled)
  randomization: 0, // Timing randomization in milliseconds (0 = disabled)
  monitorAllTabs: true,
  specificTabId: null, // Specific tab ID to monitor (when monitorAllTabs is false)
  alwaysSearchAllTabs: false, // When false, auto-lock to tab after first successful click
  lockedTabId: null // Tab that was auto-locked after successful click
};

// Store audio state for each tab
const tabAudioState = new Map();

// Auto-lock to tab after successful button click (optimization)
async function autoLockToTab(tabId) {
  const { config } = await chrome.storage.sync.get('config');
  const currentConfig = config || DEFAULT_CONFIG;
  
  // Only auto-lock if:
  // 1. alwaysSearchAllTabs is false (optimization enabled)
  // 2. Currently monitoring all tabs
  // 3. Not already locked to a specific tab
  if (currentConfig.alwaysSearchAllTabs || !currentConfig.monitorAllTabs || currentConfig.lockedTabId) {
    return;
  }
  
  console.log(`[Auto-Lock] Locking to tab ${tabId} after successful button click`);
  
  // Get tab info for logging
  try {
    const tab = await chrome.tabs.get(tabId);
    console.log(`[Auto-Lock] Locked tab: ${tab.title} (${tab.url})`);
  } catch (e) {
    console.log(`[Auto-Lock] Could not get tab info: ${e.message}`);
  }
  
  // Update config to lock to this tab
  const updatedConfig = {
    ...currentConfig,
    monitorAllTabs: false,
    specificTabId: tabId,
    lockedTabId: tabId // Track that this was auto-locked
  };
  
  await chrome.storage.sync.set({ config: updatedConfig });
  
  // Notify user about auto-lock
  console.log(`[Auto-Lock] Extension now monitoring only tab ${tabId}`);
  console.log('[Auto-Lock] You can change this in the Advanced settings tab');
}

// Reset auto-lock when locked tab is closed
async function handleLockedTabClosed(tabId) {
  const { config } = await chrome.storage.sync.get('config');
  const currentConfig = config || DEFAULT_CONFIG;
  
  // Check if this was the auto-locked tab
  if (currentConfig.lockedTabId === tabId) {
    console.log(`[Auto-Lock] Locked tab ${tabId} was closed, reverting to monitor all tabs`);
    
    const updatedConfig = {
      ...currentConfig,
      monitorAllTabs: true,
      specificTabId: null,
      lockedTabId: null
    };
    
    await chrome.storage.sync.set({ config: updatedConfig });
  }
}

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
        if (state.retryIntervalId) {
          clearInterval(state.retryIntervalId);
          state.retryIntervalId = null;
        }
      });
    } else {
      // Extension was just enabled, check current audio state of all tabs
      console.log('[Audio Monitor] Extension enabled, checking audio state of all tabs');
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.audible !== undefined) {
            console.log(`[Audio Monitor] Tab ${tab.id}: Checking audio state - audible: ${tab.audible}`);
            handleAudioChange(tab.id, tab.audible, tab);
          }
        });
      });
    }
  }
});

// Monitor tab audio state changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.audible !== undefined) {
    // Check if we should monitor this tab
    chrome.storage.sync.get('config', (data) => {
      const config = data.config || DEFAULT_CONFIG;
      
      // Skip restricted pages
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
                      tab.url.startsWith('about:') || tab.url.startsWith('edge://') || 
                      tab.url.startsWith('devtools://'))) {
        console.log(`[Audio Monitor] Tab ${tabId}: Skipping restricted page: ${tab.url}`);
        return;
      }
      
      // If monitoring all tabs or this is the specific tab to monitor
      if (config.monitorAllTabs || config.specificTabId === tabId) {
        handleAudioChange(tabId, changeInfo.audible, tab);
      } else {
        console.log(`[Audio Monitor] Tab ${tabId}: Skipping - not the monitored tab (monitoring tab ${config.specificTabId})`);
      }
    });
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabAudioState.has(tabId)) {
    const state = tabAudioState.get(tabId);
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    if (state.retryIntervalId) {
      clearInterval(state.retryIntervalId);
    }
    tabAudioState.delete(tabId);
    console.log(`[Audio Monitor] Tab ${tabId}: Closed, cleaned up state`);
  }
  
  // Check if this was an auto-locked tab and reset if needed
  handleLockedTabClosed(tabId);
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
        retryIntervalId: null,
        lastAudioTime: null
      };
      tabAudioState.set(tabId, state);
    }

    // Always clear existing timers
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
    if (state.retryIntervalId) {
      clearInterval(state.retryIntervalId);
      state.retryIntervalId = null;
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
      
      // Apply randomization if configured
      const randomization = config.randomization || 0;
      const variation = randomization > 0 ? (Math.random() - 0.5) * randomization : 0;
      const effectiveTimespan = config.timespan + variation;
      
      console.log(`[Audio Monitor] Tab ${tabId}: Audio stopped, waiting ${config.timespan}ms` + 
                 (randomization > 0 ? ` (±${randomization/2}ms variation, effective: ${effectiveTimespan.toFixed(0)}ms)` : ''));
      console.log(`[Audio Monitor] Tab ${tabId}: Config - Retry Interval: ${config.retryInterval}ms`);
      
      // Set timeout to click button after configured timespan
      state.timeoutId = setTimeout(() => {
        console.log(`[Audio Monitor] Tab ${tabId}: Initial timeout fired, clicking button`);
        clickButtonInTab(tabId, config.buttonSelector, config);
      }, effectiveTimespan);
    }
  });
}

// Click button in the specified tab
async function clickButtonInTab(tabId, buttonSelector, config = null) {
  try {
    // Get config if not provided
    if (!config) {
      const data = await chrome.storage.sync.get('config');
      config = data.config || DEFAULT_CONFIG;
    }
    
    // Check if tab still exists
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) {
      console.log(`[Audio Monitor] Tab ${tabId} no longer exists`);
      tabAudioState.delete(tabId);
      return;
    }
    
    // Check if tab URL is accessible (not a restricted page)
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('about:') || tab.url.startsWith('edge://') || tab.url.startsWith('devtools://')) {
      console.log(`[Audio Monitor] Tab ${tabId}: Skipping restricted page: ${tab.url || 'unknown'}`);
      return;
    }
    
    // Check if page is fully loaded
    if (tab.status !== 'complete') {
      console.log(`[Audio Monitor] Tab ${tabId}: Page not fully loaded yet, waiting...`);
      // Wait for page to load and try again
      setTimeout(() => clickButtonInTab(tabId, buttonSelector, config), 1000);
      return;
    }
    
    console.log(`[Audio Monitor] Tab ${tabId}: Attempting to click button "${buttonSelector}"`);
    console.log(`[Audio Monitor] Tab ${tabId}: Current audio state - audible: ${tab.audible}`);

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
          
          // Try focus first if it's a focusable element
          if (typeof element.focus === 'function') {
            try {
              element.focus();
            } catch (e) {
              // Ignore focus errors
            }
          }
          
          // Use a more minimal event sequence to avoid passive listener issues
          try {
            // Dispatch events with passive-safe configuration
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
            // If event dispatch fails, ignore
          }
          
          // Always call native click as the most reliable method
          element.click();
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
        
        // Auto-lock to this tab (if optimization enabled)
        autoLockToTab(tabId);
        
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
        
        // Set up retry interval if configured
        const state = tabAudioState.get(tabId);
        if (config.retryInterval > 0 && state) {
          console.log(`[Audio Monitor] Tab ${tabId}: 🔄 Setting up retry interval - will retry every ${config.retryInterval}ms if no audio`);
          
          // Clear any existing retry interval
          if (state.retryIntervalId) {
            clearInterval(state.retryIntervalId);
          }
          
          state.retryIntervalId = setInterval(async () => {
            console.log(`[Audio Monitor] Tab ${tabId}: ⏰ Retry interval fired, checking audio status...`);
            
            // Check if audio is still not playing before retrying
            const currentTab = await chrome.tabs.get(tabId).catch(() => null);
            if (!currentTab) {
              console.log(`[Audio Monitor] Tab ${tabId}: Tab no longer exists, clearing retry interval`);
              clearInterval(state.retryIntervalId);
              state.retryIntervalId = null;
              tabAudioState.delete(tabId);
              return;
            }
            
            console.log(`[Audio Monitor] Tab ${tabId}: Current audio state - audible: ${currentTab.audible}`);
            
            if (!currentTab.audible) {
              console.log(`[Audio Monitor] Tab ${tabId}: 🔁 No audio detected, retrying button click...`);
              await clickButtonInTab(tabId, buttonSelector, config);
            } else {
              console.log(`[Audio Monitor] Tab ${tabId}: ✓ Audio detected, stopping retry interval`);
              clearInterval(state.retryIntervalId);
              state.retryIntervalId = null;
            }
          }, config.retryInterval);
        }
      } else {
        console.warn(`[Audio Monitor] Tab ${tabId}: ✗ Button not found in any frame (checked ${results.length} frames) for selector "${buttonSelector}"`);
      }
    }
  } catch (error) {
    // Handle specific error cases
    if (error.message && error.message.includes('Cannot access contents')) {
      console.log(`[Audio Monitor] Tab ${tabId}: Cannot access page (restricted or not loaded). Skipping.`);
    } else if (error.message && error.message.includes('No tab with id')) {
      console.log(`[Audio Monitor] Tab ${tabId}: Tab no longer exists`);
      tabAudioState.delete(tabId);
    } else {
      console.error(`[Audio Monitor] Error clicking button in tab ${tabId}:`, error);
    }
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
  } else if (request.action === 'recheckAudio') {
    console.log('[Audio Monitor] Recheck audio requested from popup');
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.audible !== undefined) {
          console.log(`[Audio Monitor] Tab ${tab.id}: Checking audio state - audible: ${tab.audible}`);
          handleAudioChange(tab.id, tab.audible, tab);
        }
      });
    });
    sendResponse({ success: true });
  }
  return true;
});

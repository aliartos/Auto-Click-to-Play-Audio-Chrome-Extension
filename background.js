// Background service worker for monitoring audio across tabs

const DEFAULT_CONFIG = {
  enabled: true,
  timespan: 3000, // 3 seconds in milliseconds
  buttonSelector: '', // CSS selector for the button (class or id)
  monitorAllTabs: true
};

// Store audio state for each tab
const tabAudioState = new Map();

// Initialize configuration
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('config', (data) => {
    if (!data.config) {
      chrome.storage.sync.set({ config: DEFAULT_CONFIG });
    }
  });
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
    
    if (!config.enabled || !config.buttonSelector) {
      return;
    }

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

    // Clear existing timeout
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
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

    // Execute content script to click the button
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (selector) => {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          return { success: true, selector: selector };
        }
        return { success: false, selector: selector, error: 'Button not found' };
      },
      args: [buttonSelector]
    });

    if (results && results[0]) {
      const result = results[0].result;
      if (result.success) {
        console.log(`[Audio Monitor] Tab ${tabId}: Successfully clicked button with selector "${buttonSelector}"`);
      } else {
        console.warn(`[Audio Monitor] Tab ${tabId}: ${result.error} for selector "${buttonSelector}"`);
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

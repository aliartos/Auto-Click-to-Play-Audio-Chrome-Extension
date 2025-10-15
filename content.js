// Content script for detecting audio elements and monitoring playback

console.log('[Audio Monitor] Content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkAudio') {
    const hasAudio = checkForAudioPlayback();
    sendResponse({ hasAudio });
  } else if (request.action === 'buttonClicked') {
    // Show visual confirmation
    showClickConfirmation(request.selector, request.location);
    console.log('[Audio Monitor] Button auto-clicked:', {
      selector: request.selector,
      location: request.location,
      timestamp: request.timestamp
    });
    sendResponse({ received: true });
  }
  return true;
});

// Show visual confirmation of button click
function showClickConfirmation(selector, location) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = `🔊 Audio Monitor: Button clicked (${location})`;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 3000);
}

// Check if any audio/video elements are playing
function checkForAudioPlayback() {
  const mediaElements = document.querySelectorAll('audio, video');
  
  for (const element of mediaElements) {
    if (!element.paused && !element.muted) {
      return true;
    }
  }
  
  return false;
}

// Monitor for new media elements added to the page
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
        console.log('[Audio Monitor] New media element detected:', node.nodeName);
      }
    }
  }
});

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true
});

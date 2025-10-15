// Content script for detecting audio elements and monitoring playback

console.log('[Audio Monitor] Content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkAudio') {
    const hasAudio = checkForAudioPlayback();
    sendResponse({ hasAudio });
  }
  return true;
});

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

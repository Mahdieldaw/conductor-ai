console.log('--- CONTENT.JS VERSION CHECK --- THIS IS THE NEWEST VERSION --- ' + Date.now());
console.log("✅ Conductor AI: content.js SCRIPT LOADED.");

// Import the providers and other utilities
import { ChatGPTAsk } from './providers/ChatGPT.js';
import { ClaudeAsk } from './providers/Claude.js';
import { ContentStateDetector } from './primitives/ContentStateDetector.js';

// This is the map of all possible actions.
// It now correctly points to the 'broadcast' function on each provider.
const actions = {
  'chatgpt': { 
    broadcast: ChatGPTAsk.broadcast, 
    harvest: () => ContentStateDetector.waitForComplete('chatGPT') 
  },
  'claude': { 
    broadcast: ClaudeAsk.broadcast, 
    harvest: () => ContentStateDetector.waitForComplete('claude') 
  }
};

// This function correctly identifies the platform from the URL.
function identifyCurrentPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('chatgpt.com')) return 'chatgpt';
  if (hostname.includes('claude.ai')) return 'claude';
  return null;
}

const platformKey = identifyCurrentPlatform();

if (platformKey) {
  // The listener for messages from the background script.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const platformActions = actions[platformKey];

    const handleMessage = async () => {
      try {
        if (message.type === 'EXECUTE_BROADCAST') {
          console.log(`CONTENT SCRIPT: Broadcasting to ${platformKey}`);
          // THE FIX: We now call the 'broadcast' function that actually exists.
          await platformActions.broadcast(message.payload.prompt);
          sendResponse({ status: 'broadcast_complete' });

        } else if (message.type === 'EXECUTE_HARVEST') {
          console.log(`CONTENT SCRIPT: Harvesting from ${platformKey}`);
          const response = await platformActions.harvest();
          sendResponse({ status: 'completed', data: response });
        }
      } catch (error) {
        console.error("Content script error:", error);
        sendResponse({ status: 'failed', error: error.message });
      }
    };

    handleMessage();
    return true; // Keep the message channel open for the async response.
  });

  console.log(`✅ Conductor AI: Listener setup complete for ${platformKey}.`);
} else {
  console.log("✅ Conductor AI: Listener setup skipped for unsupported page.");
}


// src/content/content.js
import { ProviderFactory } from './providers/ProviderFactory.js';
import { ContentStateDetector } from './primitives/ContentStateDetector.js';

function identifyCurrentPlatform() {
  const { hostname } = window.location;
  if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) return 'chatgpt';
  if (hostname.includes('claude.ai') || hostname.includes('console.anthropic.com')) return 'claude';
  return null;
}

const platformKey = identifyCurrentPlatform();

if (platformKey) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handle = async () => {
      try {
        if (message.type === 'EXECUTE_BROADCAST') {
          // The new, simpler, and more robust way to broadcast
          await ProviderFactory.broadcast(window.location.hostname, message.payload.prompt);
          sendResponse({ status: 'broadcast_complete' });

        } else if (message.type === 'EXECUTE_HARVEST') {
          // Harvesting logic remains the same, as it's already robust
          const data = await ContentStateDetector.waitForComplete(platformKey);
          sendResponse({ status: 'completed', data });
        }
      } catch (error) {
        console.error(`Conductor AI Error on ${platformKey}:`, error);
        sendResponse({ status: 'failed', error: error.message });
      }
    };
    handle();
    return true; // Keep channel open for async response
  });
  console.log(`✅ Conductor AI: Listener setup complete for "${platformKey}" using ProviderFactory.`);
}
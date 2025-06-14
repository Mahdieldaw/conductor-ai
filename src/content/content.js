// src/content/content.js (REPLACE the whole file)

import { ChatGPTAsk } from './providers/ChatGPT.js';
import { ClaudeAsk } from './providers/Claude.js';
import { ContentStateDetector } from './primitives/ContentStateDetector.js';

function identifyCurrentPlatform() {
  const { hostname } = window.location;
  // FIX: Now correctly identifies 'chatgpt.com' OR 'openai.com'
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
    return 'chatgpt';
  }
  if (hostname.includes('claude.ai')) {
    return 'claude';
  }
  return null;
}

const platformKey = identifyCurrentPlatform();

const actions = {
  chatgpt: {
    broadcast: (prompt) => ChatGPTAsk.broadcast(prompt),
    harvest: () => ContentStateDetector.waitForComplete('chatgpt'),
  },
  claude: {
    broadcast: (prompt) => ClaudeAsk.broadcast(prompt),
    harvest: () => ContentStateDetector.waitForComplete('claude'),
  },
};

if (platformKey) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handle = async () => {
      try {
        const handler = actions[platformKey];
        if (message.type === 'EXECUTE_BROADCAST') {
          await handler.broadcast(message.payload.prompt);
          sendResponse({ status: 'broadcast_complete' });
        } else if (message.type === 'EXECUTE_HARVEST') {
          const data = await handler.harvest();
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
  console.log(`✅ Conductor AI: Listener setup complete for "${platformKey}".`);
}
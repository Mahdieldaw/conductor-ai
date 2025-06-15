// src/content/content.js
import { ProviderFactory } from './providers/ProviderFactory.js';
import { ContentStateDetector } from './primitives/ContentStateDetector.js';

// This helper is cited in the blueprint from the old content.js
function identifyCurrentPlatform() {
  const { hostname } = window.location;
  if (hostname.includes('chatgpt.com')) return 'chatgpt';
  if (hostname.includes('claude.ai')) return 'claude';
  return null;
}

// Expose a clean interface on the window object for the service worker to call
window.sidecar = {
  broadcast: async (prompt) => {
    console.log('SIDECAR-CONTENT: broadcast called.');
    try {
      await ProviderFactory.broadcast(window.location.hostname, prompt);
      return { status: 'ok', message: 'Prompt sent successfully.' };
    } catch (error) {
      console.error('SIDECAR-CONTENT: broadcast error:', error);
      return { status: 'error', message: error.message };
    }
  },

  harvest: async () => {
    console.log('SIDECAR-CONTENT: harvest called.');
    const platformKey = identifyCurrentPlatform();
    if (!platformKey) {
      const msg = 'Could not identify platform for harvesting.';
      console.error('SIDECAR-CONTENT: ' + msg);
      return { status: 'error', message: msg };
    }
    try {
      const content = await ContentStateDetector.waitForComplete(platformKey);
      return { status: 'ok', content };
    } catch (error) {
      console.error('SIDECAR-CONTENT: harvest error:', error);
      return { status: 'error', message: error.message };
    }
  },
};

console.log('✅ SIDE-CAR: Content script loaded and window.sidecar interface exposed.');
// src/content/primitives/ContentStateDetector.js
import { waitForElement } from './helpers.js';

export class ContentStateDetector {
  static getDetector(platform) {
    const detectors = {
      // FIX: Use lowercase 'chatgpt' to match the rest of the system.
      chatgpt: () => {
        // A better signal for completion is the regeneration button disappearing
        // and the stop button being gone.
        const isGenerating = !!document.querySelector('[data-testid="stop-generating-button"]');
        const lastResponse = [...document.querySelectorAll('[data-message-author-role="assistant"]')].pop();
        return {
          isComplete: !isGenerating && !!lastResponse,
          content: lastResponse?.innerText || '',
        };
      },
      claude: () => {
        const isGenerating = !!document.querySelector('button[aria-label="Stop generating"]');
        const lastResponse = document.querySelector('.font-claude-message:last-of-type');
        return {
          isComplete: !isGenerating && !!lastResponse,
          content: lastResponse?.innerText || '',
        };
      },
    };
    return detectors[platform];
  }

  static async waitForComplete(platform, timeout = 45000) {
    const detector = this.getDetector(platform);
    if (!detector) throw new Error(`No detector for ${platform}`);

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const { isComplete, content } = detector();
        if (isComplete && content.trim().length > 1) {
          return content.trim();
        }
      } catch (e) { /* Ignore errors during polling */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Timeout waiting for a complete response from ${platform}`);
  }
}
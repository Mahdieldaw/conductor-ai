/**
 * A class responsible for detecting the state of content on an AI platform's page,
 * specifically for determining when a response has finished generating.
 */
export class ContentStateDetector {
  /**
   * A simple promise-based sleep utility.
   * @param {number} ms - Milliseconds to wait.
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * A factory method that returns the correct state detection logic
   * based on the target platform.
   * @param {string} platform - The key for the platform (e.g., 'chatGPT', 'claude').
   * @returns {function(): {isComplete: boolean, content: string}} A function that, when called, returns the current completion state and content.
   */
  static getDetector(platform) {
    const detectors = {
      chatGPT: () => {
        const isGenerating = !document.querySelector('button[data-testid="send-button"]');
        const lastResponseContainer = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]')).pop();
        const responseText = lastResponseContainer?.querySelector('.markdown')?.innerText || '';
        return { isComplete: !isGenerating && responseText.length > 5, content: responseText };
      },
      claude: () => {
        const isGenerating = !!document.querySelector('button[aria-label="Stop generating"]');
        const lastResponseContainer = Array.from(document.querySelectorAll('[data-message-id]:last-of-type .font-claude-message')).pop();
        const responseText = lastResponseContainer?.innerText || '';
        return { isComplete: !isGenerating && responseText.length > 5, content: responseText };
      }
    };
    return detectors[platform];
  }
  
  /**
   * A utility to perform basic cleaning of extracted text.
   * @param {string} raw - The raw text content from the page.
   * @returns {string} - The cleaned text.
   */
  static cleanContent(raw) {
    return raw.trim().replace(/\s+/g, ' ');
  }

  /**
   * Polls the page using the platform-specific detector until the AI response
   * is complete or a timeout is reached.
   * @param {string} platform - The key for the platform ('chatGPT' or 'claude').
   * @param {number} [timeout=30000] - Max time to wait in milliseconds.
   * @returns {Promise<string>} - A promise that resolves with the clean response content.
   */
  static async waitForComplete(platform, timeout = 30000) {
    const detector = this.getDetector(platform);
    if (!detector) throw new Error(`No detector for ${platform}`);
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const { isComplete, content } = detector();
        if (isComplete) {
          return this.cleanContent(content);
        }
      } catch (e) {
        // Ignore errors during polling
      }
      await this.sleep(500);
    }
    throw new Error(`Timeout waiting for a complete response from ${platform}`);
  }
}


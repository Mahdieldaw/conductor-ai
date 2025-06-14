// File: /src/providers/ChatGPT.js

export class ChatGPTAsk {
  /**
   * This is now an ASYNCHRONOUS function that returns a Promise.
   * It actively polls for the textarea's existence for 3 seconds.
   * It only resolves the promise once the text has been successfully set.
   * @param {string} prompt The text to input.
   * @returns {Promise<void>}
   */
  static async sync(prompt) {
    return new Promise((resolve, reject) => {
      const interval = 200; // Check every 200ms
      const timeout = 3000; // Give up after 3 seconds
      let elapsedTime = 0;

      const tryToSync = () => {
        const inputElement = document.querySelector('textarea[placeholder="Ask anything"]');

        if (inputElement) {
          // Found it! Do the work.
          const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          nativeTextareaSetter.call(inputElement, prompt);
          const inputEvent = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(inputEvent);
          
          console.log("Conductor AI (ChatGPT): SYNC successful.");
          clearInterval(syncInterval);
          resolve(); // Signal success
          return;
        }

        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          clearInterval(syncInterval);
          console.error("Conductor AI (ChatGPT): SYNC failed. Timed out waiting for textarea.");
          reject(new Error("Textarea not found")); // Signal failure
        }
      };

      const syncInterval = setInterval(tryToSync, interval);
    });
  }

  /**
   * Submits the prompt. This function no longer needs a delay, as it will only
   * be called after the async sync() has successfully completed.
   */
  static submit() {
    // Strategy 1: Find the button by its test ID (most reliable)
    const submitButton = document.querySelector('button[data-testid="send-button"]');
    if (submitButton) {
      console.log("Conductor AI (ChatGPT): Submitting via Send Button.");
      submitButton.disabled = false;
      submitButton.click();
      return;
    }

    // Strategy 2: Fallback to "Enter" key press
    const inputElement = document.querySelector('textarea[placeholder="Ask anything"]');
    if (inputElement) {
      console.log("Conductor AI (ChatGPT): Submitting via Enter Key.");
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(enterEvent);
      return;
    }
    
    console.error("Conductor AI (ChatGPT): SUBMIT failed. Could not find a method to submit the prompt.");
  }
}


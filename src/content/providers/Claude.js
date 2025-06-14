// File: /src/providers/Claude.js

export class ClaudeAsk {
  /**
   * Finds Claude's contenteditable div, focuses it, and inserts the prompt text.
   * @param {string} prompt The text to input.
   */
  static async sync(prompt) {
    return new Promise((resolve, reject) => {
      const interval = 200;
      const timeout = 3000;
      let elapsedTime = 0;

      const tryToSync = () => {
        // We poll for the live element, which is correct.
        const inputElement = document.querySelector('div.ProseMirror');

        if (inputElement) {
          inputElement.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, prompt);
          
          console.log("Conductor AI (Claude): SYNC successful.");
          clearInterval(syncInterval);
          resolve();
          return;
        }

        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          clearInterval(syncInterval);
          console.error("Conductor AI (Claude): SYNC failed. Timed out waiting for input area.");
          reject(new Error("Claude input not found"));
        }
      };
      const syncInterval = setInterval(tryToSync, interval);
    });
  }

  /**
   * Submits the prompt by finding the button with the specific aria-label.
   */
  static submit() {
    // This selector is stable and correct for the live page.
    const submitButton = document.querySelector('button[aria-label="Send Message"]');
    if (submitButton) {
      submitButton.click();
    } else {
      console.error("Conductor AI (Claude): SUBMIT failed. Could not find the 'Send Message' button.");
    }
  }
}


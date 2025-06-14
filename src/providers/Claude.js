export class ClaudeAsk {
  /**
   * A single, robust function to handle both typing and submitting.
   * @param {string} prompt The text to input.
   * @returns {Promise<void>}
   */
  static async broadcast(prompt) {
    const inputElement = await this.findTextarea();
    
    // Use execCommand for Claude's rich text editor
    inputElement.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, prompt);
    console.log("Conductor AI (Claude): SYNC successful.");

    // Give the UI a moment to enable the button after typing
    await new Promise(resolve => setTimeout(resolve, 200)); 

    await this.submit();
  }

  /**
   * Helper function to reliably find the textarea using polling.
   */
  static findTextarea() {
    return new Promise((resolve, reject) => {
      const interval = 200;
      const timeout = 3000;
      let elapsedTime = 0;
      const tryToFind = () => {
        const element = document.querySelector('div.ProseMirror');
        if (element) {
          clearInterval(findInterval);
          resolve(element);
          return;
        }
        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          clearInterval(findInterval);
          reject(new Error("Claude input area not found."));
        }
      };
      const findInterval = setInterval(tryToFind, interval);
    });
  }

  /**
   * Private submit helper that now also polls.
   */
  static submit() {
    return new Promise((resolve, reject) => {
      const interval = 200;
      const timeout = 3000;
      let elapsedTime = 0;
      const tryToSubmit = () => {
        const button = document.querySelector('button[aria-label="Send Message"]');
        if (button && !button.disabled) {
          button.click();
          clearInterval(submitInterval);
          resolve();
          return;
        }
        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          clearInterval(submitInterval);
          reject(new Error("Claude submit button not found or not enabled."));
        }
      };
      const submitInterval = setInterval(tryToSubmit, interval);
    });
  }
}

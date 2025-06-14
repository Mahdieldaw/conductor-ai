export class ChatGPTAsk {
  /**
   * A single, robust function to handle both typing and submitting.
   * @param {string} prompt The text to input.
   * @returns {Promise<void>}
   */
  static async broadcast(prompt) {
    const inputElement = await this.findTextarea();
    
    // Use the forceful 'insertText' command.
    inputElement.focus();
    document.execCommand('insertText', false, prompt);
    console.log("Conductor AI (ChatGPT): SYNC attempted with execCommand.");
    
    // Give the UI a moment to enable the button after typing
    await new Promise(resolve => setTimeout(resolve, 200)); 

    this.submit();
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
        const element = document.querySelector('textarea[placeholder="Ask anything"]');
        if (element) {
          clearInterval(findInterval);
          resolve(element);
          return;
        }
        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          clearInterval(findInterval);
          reject(new Error("ChatGPT textarea not found."));
        }
      };
      const findInterval = setInterval(tryToFind, interval);
    });
  }

  /**
   * Private submit helper.
   */
  static submit() {
    const submitButton = document.querySelector('button[data-testid="send-button"]');
    if (submitButton && !submitButton.disabled) {
      submitButton.click();
      return;
    }

    const inputElement = document.querySelector('textarea[placeholder="Ask anything"]');
    if (inputElement) {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      inputElement.dispatchEvent(enterEvent);
      return;
    }
    throw new Error("Could not find a method to submit for ChatGPT.");
  }
}






/**
 * A base class representing the primitive action of "asking" an AI.
 * It provides a standard interface for interacting with different AI platform UIs.
 * This class is designed to be extended by platform-specific implementations.
 */
export class NoiAsk {
  /**
   * @param {object} selectors - CSS selectors for the platform's UI elements.
   * @param {string} selectors.input - The selector for the prompt input area.
   * @param {string} selectors.submit - The selector for the submit button.
   */
  constructor(selectors) {
    this.selectors = selectors;
  }

  /**
   * Synchronizes the provided prompt text with the platform's input area.
   * @param {string} prompt - The text to place in the input area.
   */
  sync(prompt) {
    const input = document.querySelector(this.selectors.input);
    if (input) {
      input.value = prompt;
      // Dispatch an input event to ensure frameworks like React recognize the change
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Clicks the platform's submit button to send the prompt.
   */
  submit() {
    const button = document.querySelector(this.selectors.submit);
    // Some platforms disable the button, so we check for that attribute.
    if (button && !button.disabled) {
      button.click();
    }
  }
}


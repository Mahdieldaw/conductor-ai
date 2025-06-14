// src/content/providers/ChatGPT.js (REPLACE the whole file)

import { waitForElement } from '../primitives/helpers.js';

export class ChatGPTAsk {
  static async broadcast(prompt) {
    // We still use our robust selector to find the input element
    const input = await waitForElement('textarea#prompt-textarea, textarea[placeholder="Ask anything"]');
    
    // --- THE CORE FIX ---
    // 1. Focus the element to make it the active target for commands.
    input.focus();
    // 2. Clear any existing text.
    input.value = ''; 
    // 3. Use execCommand to visually insert the new text. This is much more reliable
    //    for triggering the site's own event listeners.
    document.execCommand('insertText', false, prompt);
    // --- END OF CORE FIX ---

    // Give the UI a moment to process the input and enable the button
    await new Promise(resolve => setTimeout(resolve, 500)); 

    try {
      // Now, try to find the newly enabled button and click it
      const button = await waitForElement('button[data-testid="send-button"]:not(:disabled)', 3000);
      button.click();
    } catch (e) {
      // Fallback to the Enter key press if the button isn't found
      console.warn("Could not click send button, falling back to Enter key press.");
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
        shiftKey: false, 
      });
      input.dispatchEvent(enterEvent);
    }
  }
}
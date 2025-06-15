// src/content/providers/ChatGPT.js
import { waitForElement } from '../primitives/helpers.js';
import { BaseProvider } from './BaseProvider.js';

export class ChatGPTAsk extends BaseProvider {
  constructor() {
    super({ baseTimeout: 10000 });
  }

  static async broadcast(prompt) {
    const instance = new ChatGPTAsk();
    return instance._broadcast(prompt);
  }

  async _broadcast(prompt) {
    const input = await waitForElement(
      '#prompt-textarea, p[data-placeholder="Ask anything"]',
      this.baseTimeout
    );
    
    const editableContainer = input.id === 'prompt-textarea' ? input : input.parentElement;
    editableContainer.focus();
    editableContainer.textContent = prompt;
    editableContainer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    // Give the UI a moment to enable the button
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // --- THE CORE FIX: A MORE RELIABLE SUBMISSION STRATEGY ---
    const button = document.querySelector('button[data-testid="send-button"]');
    if (button && !button.disabled) {
      button.click();
    } else {
      // If the button isn't immediately available, fallback to the Enter key
      console.warn("ChatGPT button not immediately clickable, falling back to Enter key press.");
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, shiftKey: false });
      editableContainer.dispatchEvent(enterEvent);
    }

    // --- NEW VALIDATION STEP ---
    // Instead of waiting for the send button, we now wait for proof of submission:
    // the "Stop generating" button's appearance.
    await this.waitForCondition(() => {
      return !!document.querySelector('[data-testid="stop-generating-button"]');
    }, 5000, "Waiting for submission confirmation");
    
    // If we reach here, it means the prompt was successfully sent and the AI is processing.
  }
}
// src/content/providers/ChatGPT.js
import { waitForElement } from '../primitives/helpers.js';

export class ChatGPTAsk {
  static async broadcast(prompt) {
    const input = await waitForElement('textarea#prompt-textarea');
    input.focus();
    input.value = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true })); // Trigger React event listener

    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for button to enable

    const button = await waitForElement('button[data-testid="send-button"]:not(:disabled)');
    button.click();
  }
}
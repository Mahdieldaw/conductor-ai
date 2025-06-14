// src/content/providers/Claude.js
import { waitForElement } from '../primitives/helpers.js';

export class ClaudeAsk {
  static async broadcast(prompt) {
    const input = await waitForElement('div.ProseMirror');
    input.focus();
    // Use execCommand for contenteditable divs
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, prompt);

    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for button to enable

    const button = await waitForElement('button[aria-label="Send Message"]:not(:disabled)');
    button.click();
  }
}
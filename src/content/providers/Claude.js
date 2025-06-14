// src/content/providers/Claude.js
import { waitForElement } from '../primitives/helpers.js';

export class ClaudeAsk {
  static async broadcast(prompt) {
    const input = await waitForElement('div.ProseMirror');
    input.focus();
    
    // Use execCommand for Claude's rich text editor
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, prompt);

    // Give the UI a moment to enable the button
    await new Promise(resolve => setTimeout(resolve, 500));

    // For Claude, the button is generally reliable, we just need to wait for it.
    // We will increase the timeout here to be more patient.
    const button = await waitForElement('button[aria-label="Send Message"]:not(:disabled)', 7000); // Be more patient (7s)
    button.click();
  }
}
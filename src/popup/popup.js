import { MSG } from '../shared/messaging.js';

document.addEventListener('DOMContentLoaded', () => {
  const runButton = document.getElementById('run-button');
  const promptInput = document.getElementById('prompt-input');
  const statusDisplay = document.getElementById('status-display');
  const resultsDisplay = document.getElementById('results-display');

  /**
   * Listener for the 'Run Workflow' button. Gathers user input
   * and sends it to the background service worker to start the process.
   */
  runButton.addEventListener('click', () => {
    const prompt = promptInput.value;
    const platformNodes = document.querySelectorAll(
      'input[name="platform"]:checked'
    );
    const platforms = Array.from(platformNodes).map((node) => node.value);

    if (prompt && platforms.length > 0) {
      // Update UI to reflect starting state
      statusDisplay.textContent = 'Starting workflow...';
      resultsDisplay.textContent = '';
      runButton.disabled = true;
      runButton.textContent = 'Running...';

      // Send message to background script to kick off orchestration
      chrome.runtime.sendMessage({
        type: MSG.START_WORKFLOW,
        payload: { prompt, platforms },
      });
    } else {
      statusDisplay.textContent = 'Please enter a prompt and select a platform.';
    }
  });

  /**
   * Listener for messages from the background script, specifically for
   * updates about the workflow's status and results.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === MSG.WORKFLOW_UPDATE) {
      const { payload } = message;

      // Update UI with the final status and results
      statusDisplay.textContent = `Workflow ${payload.status}!`;
      resultsDisplay.textContent = JSON.stringify(payload.results, null, 2);

      // Re-enable the button
      runButton.disabled = false;
      runButton.textContent = 'Run Workflow';
    }
  });
});


// src/popup/popup.js (REPLACE the whole file)

import { MSG } from '../shared/messaging.js';

document.addEventListener('DOMContentLoaded', () => {
  const runButton = document.getElementById('run-button');
  const promptInput = document.getElementById('prompt-input');
  const statusDisplay = document.getElementById('status-display');
  const resultsDisplay = document.getElementById('results-display');
  const copyButton = document.getElementById('copy-button');

  // --- NEW: Function to update the UI from a payload ---
  const updateUI = (payload) => {
    if (!payload) return;

    statusDisplay.textContent = `Workflow ${payload.status}!`;
    resultsDisplay.textContent = JSON.stringify(payload.results, null, 2);

    runButton.disabled = false;
    runButton.textContent = 'Run Workflow';

    if (payload.results) {
      copyButton.style.display = 'block';
      copyButton.disabled = false;
    }
  };

  // --- NEW: Function to restore state on load ---
  const restoreLastState = () => {
    chrome.storage.local.get(['lastWorkflowResult'], (storage) => {
      if (storage.lastWorkflowResult) {
        console.log('Restoring last workflow result.', storage.lastWorkflowResult);
        updateUI(storage.lastWorkflowResult);
      }
    });
  };

  // The main 'click' listener for starting a workflow
  runButton.addEventListener('click', () => {
    const prompt = promptInput.value;
    const platformNodes = document.querySelectorAll('input[name="platform"]:checked');
    const platforms = Array.from(platformNodes).map((node) => node.value);

    if (prompt && platforms.length > 0) {
      statusDisplay.textContent = 'Starting workflow...';
      resultsDisplay.textContent = '';
      runButton.disabled = true;
      runButton.textContent = 'Running...';
      copyButton.style.display = 'none';

      chrome.runtime.sendMessage({
        type: MSG.START_WORKFLOW,
        payload: { prompt, platforms },
      });
    } else {
      statusDisplay.textContent = 'Please enter a prompt and select a platform.';
    }
  });

  // The listener for live updates from the background script
  chrome.runtime.onMessage.addListener((message) => {
    // --- UPDATE THIS BLOCK ---
    if (message.type === MSG.STATUS_UPDATE) {
      // This is an intermediate status update.
      statusDisplay.textContent = message.payload.message;
      // We don't touch the results or the button here.
    } else if (message.type === MSG.WORKFLOW_UPDATE) {
      // This is the final update with all the results.
      updateUI(message.payload);
    }
  });

  // The listener for the copy button
  copyButton.addEventListener('click', () => {
    const resultsText = resultsDisplay.textContent;
    navigator.clipboard.writeText(resultsText).then(() => {
      copyButton.textContent = 'Copied!';
      setTimeout(() => { copyButton.textContent = 'Copy Results'; }, 2000);
    });
  });

  // --- NEW: Call restore function when the popup opens ---
  restoreLastState();
});


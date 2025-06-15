1. Update popup.html:
Add a button specifically for copying the results.
<!-- In src/popup/popup.html -->

<!-- ... inside the <main> tag, after the <pre> element ... -->
<button id="copy-button" class="button-primary" style="display: none; margin-top: 8px; background-color: #6c757d;">Copy Results</button>
Use code with caution.
Html
2. Update popup.js:
We'll add logic to show this button only when there are results, and wire it up to the clipboard API.
// In src/popup/popup.js

// At the top with the other element selectors
const copyButton = document.getElementById('copy-button');

// ... inside the 'click' listener for runButton ...
// Add this line to hide the copy button when a new workflow starts
copyButton.style.display = 'none';

// ... inside the 'onMessage' listener for WORKFLOW_UPDATE ...
if (payload.results) {
  // Show the copy button and make sure it's enabled
  copyButton.style.display = 'block';
  copyButton.disabled = false;
}

// Add this new event listener at the end of the file
copyButton.addEventListener('click', () => {
  const resultsText = resultsDisplay.textContent;
  navigator.clipboard.writeText(resultsText).then(() => {
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = 'Copy Results';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy results: ', err);
  });
});
Use code with caution.
JavaScript
Problem #2: Losing State When the Popup Closes
The Current Situation:
You are 100% correct. The browser action popup is ephemeral. When it loses focus, the browser completely destroys its HTML document and JavaScript state. When you click it again, a brand new, fresh instance is created. This is fundamental to how extensions work.
The Solution:
We must persist the state in a location that survives the popup's lifecycle. The perfect tool for this is chrome.storage.local.
The workflow will be:
Background Script: After a workflow successfully completes, it saves the entire final result object to chrome.storage.local.
Popup Script: When the popup opens, it immediately tries to load the last result from chrome.storage.local. If it finds one, it populates the UI with that data.
This ensures that the last successful result is always available, no matter how many times the user opens and closes the popup.
Action Plan #2: Implement State Persistence
1. Update src/background/service-worker.js:
Add one line to save the final state after the workflow is complete.
// src/background/service-worker.js (Just one change needed)

// ... inside handleStartWorkflow, right before sending the final message ...

  const finalState = { id: workflowId, status: 'complete', results };
  console.log(`BACKGROUND: Workflow ${workflowId} complete.`, finalState);

  // --- ADD THIS LINE ---
  // Save the final result to local storage for persistence.
  await chrome.storage.local.set({ 'lastWorkflowResult': finalState });
  // --- END OF ADDITION ---

  chrome.runtime.sendMessage({ type: MSG.WORKFLOW_UPDATE, payload: finalState });
Use code with caution.
JavaScript
2. Update src/popup/popup.js:
We'll refactor this file to load the state on startup.
Replace the entire contents of src/popup/popup.js with this new, state-aware version:
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
    if (message.type === MSG.WORKFLOW_UPDATE) {
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
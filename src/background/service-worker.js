// src/background/service-worker.js
import { MSG } from '../shared/messaging.js';

// Maps the key from the popup to the URL pattern needed for tab queries.
const platformURLPatterns = {
  'chatgpt': '*://chatgpt.com/*',
  'claude': '*://claude.ai/*'
};

// A robust, promise-based function to send messages to content scripts.
const sendMessageToTab = (tabId, message) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response && response.status === 'failed') {
        return reject(new Error(response.error || 'Content script reported a failure.'));
      }
      resolve(response);
    });
  });
};

async function handleStartWorkflow({ prompt, platforms }) {
  const workflowId = `wf_${Date.now()}`;
  console.log(`BACKGROUND: Starting workflow ${workflowId}`);

  const allPlatformPromises = platforms.map(async (platformKey) => {
    // This part remains the same: we try to run the workflow for each platform.
    // It will return a result on success or throw an error on failure.
    const urlPattern = platformURLPatterns[platformKey];
    if (!urlPattern) {
      throw new Error(`Unknown platform key '${platformKey}'`);
    }

    const tabs = await chrome.tabs.query({ url: urlPattern, status: 'complete' });
    if (tabs.length === 0) {
      throw new Error('Tab not found. Please open and log in.');
    }
    const tabId = tabs[0].id;

    await sendMessageToTab(tabId, { type: 'EXECUTE_BROADCAST', payload: { prompt } });
    const harvestResponse = await sendMessageToTab(tabId, { type: 'EXECUTE_HARVEST' });
    return harvestResponse.data;
  });

  // --- THE CORE UPGRADE ---
  // Use Promise.allSettled to wait for all promises to complete, regardless of success or failure.
  const settledResults = await Promise.allSettled(allPlatformPromises);
  
  const finalResults = {};

  // Loop through the settled results and process them.
  settledResults.forEach((result, index) => {
    const platformKey = platforms[index]; // Get the platform key corresponding to this result.

    if (result.status === 'fulfilled') {
      // It succeeded! Save the value.
      console.log(`BACKGROUND: ${platformKey} succeeded.`);
      finalResults[platformKey] = result.value;
    } else {
      // It failed. Save the error message.
      console.error(`BACKGROUND: ${platformKey} failed:`, result.reason);
      finalResults[platformKey] = `Failed: ${result.reason.message}`;
    }
  });
  // --- END OF UPGRADE ---

  const finalState = { id: workflowId, status: 'complete', results: finalResults };
  console.log(`BACKGROUND: Workflow ${workflowId} complete.`, finalState);

  // --- ADD THIS LINE ---
  // Save the final result to local storage for persistence.
  await chrome.storage.local.set({ 'lastWorkflowResult': finalState });
  // --- END OF ADDITION ---

  chrome.runtime.sendMessage({ type: MSG.WORKFLOW_UPDATE, payload: finalState });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.START_WORKFLOW) {
    handleStartWorkflow(message.payload);
    return true; // Keep channel open for async response
  }
});
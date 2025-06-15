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

  // --- NEW: Send an initial "working" message ---
  chrome.runtime.sendMessage({
    type: MSG.STATUS_UPDATE,
    payload: { message: `Broadcasting to ${platforms.length} platform(s)...` }
  });

  const allPlatformPromises = platforms.map(async (platformKey) => {
    const urlPattern = platformURLPatterns[platformKey];
    if (!urlPattern) throw new Error(`Unknown platform key '${platformKey}'`);

    const tabs = await chrome.tabs.query({ url: urlPattern, status: 'complete' });
    if (tabs.length === 0) throw new Error('Tab not found.');
    const tabId = tabs[0].id;
    
    // Broadcast...
    await sendMessageToTab(tabId, { type: 'EXECUTE_BROADCAST', payload: { prompt } });
    
    // --- NEW: Send a "harvesting" message for this specific platform ---
    chrome.runtime.sendMessage({
      type: MSG.STATUS_UPDATE,
      payload: { message: `Harvesting from ${platformKey}...` }
    });

    // Harvest...
    const harvestResponse = await sendMessageToTab(tabId, { type: 'EXECUTE_HARVEST' });
    return harvestResponse.data;
  });

  const settledResults = await Promise.allSettled(allPlatformPromises);
  const finalResults = {};

  settledResults.forEach((result, index) => {
    const platformKey = platforms[index];
    if (result.status === 'fulfilled') {
      finalResults[platformKey] = result.value;
    } else {
      finalResults[platformKey] = `Failed: ${result.reason.message}`;
    }
  });

  const finalState = { id: workflowId, status: 'complete', results: finalResults };
  console.log(`BACKGROUND: Workflow ${workflowId} complete.`, finalState);

  await chrome.storage.local.set({ 'lastWorkflowResult': finalState });
  // Send the FINAL update, which will replace the status message with the results.
  chrome.runtime.sendMessage({ type: MSG.WORKFLOW_UPDATE, payload: finalState });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.START_WORKFLOW) {
    handleStartWorkflow(message.payload);
    return true; // Keep channel open for async response
  }
});
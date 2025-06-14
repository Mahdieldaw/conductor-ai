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
  const results = {};

  const allPlatformPromises = platforms.map(async (platformKey) => {
    const urlPattern = platformURLPatterns[platformKey];
    if (!urlPattern) {
      results[platformKey] = `Failed: Unknown platform key '${platformKey}'`;
      return;
    }

    const tabs = await chrome.tabs.query({ url: urlPattern, status: 'complete' });
    if (tabs.length === 0) {
      results[platformKey] = 'Failed: Tab not found. Please open and log in.';
      return;
    }
    const tabId = tabs[0].id;

    try {
      // 1. Broadcast the prompt
      await sendMessageToTab(tabId, { type: 'EXECUTE_BROADCAST', payload: { prompt } });

      // 2. Harvest the result
      const harvestResponse = await sendMessageToTab(tabId, { type: 'EXECUTE_HARVEST' });
      results[platformKey] = harvestResponse.data;
    } catch (e) {
      console.error(`Error processing ${platformKey}:`, e);
      results[platformKey] = `Failed: ${e.message}`;
    }
  });

  await Promise.all(allPlatformPromises);

  const finalState = { id: workflowId, status: 'complete', results };
  console.log(`BACKGROUND: Workflow ${workflowId} complete.`, finalState);
  chrome.runtime.sendMessage({ type: MSG.WORKFLOW_UPDATE, payload: finalState });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.START_WORKFLOW) {
    handleStartWorkflow(message.payload);
    return true; // Keep channel open for async response
  }
});
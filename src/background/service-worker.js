chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_WORKFLOW') {
    handleStartWorkflow(message.payload);
    return true; // Indicates we will respond asynchronously.
  }
});

async function handleStartWorkflow({ prompt, platforms }) {
  const workflowId = `wf_${Date.now()}`;
  const workflowState = { id: workflowId, prompt, platforms, results: {}, status: 'running' };
  console.log(`BACKGROUND: Starting workflow ${workflowId}`);

  const platformURLPatterns = {
    'chatgpt': '*://chatgpt.com/*',
    'claude': '*://claude.ai/*'
  };

  const sendMessageToTab = (tabId, message) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Connection failed. The tab might have closed or reloaded.'));
        } else if (response && response.status === 'failed') {
          reject(new Error(response.error || 'Content script reported a failure.'));
        } else {
          resolve(response);
        }
      });
    });
  };

  const allPlatformPromises = platforms.map(async (platformKey) => {
    const urlPattern = platformURLPatterns[platformKey];
    const tabs = await chrome.tabs.query({ url: urlPattern, status: 'complete' });

    if (tabs.length === 0) {
      return { platform: platformKey, status: 'rejected', reason: 'Tab not found' };
    }
    const tabId = tabs[0].id;

    try {
      console.log(`BACKGROUND: Broadcasting to ${platformKey} (Tab ID: ${tabId})`);
      await sendMessageToTab(tabId, { type: 'EXECUTE_BROADCAST', payload: { prompt } });
      
      console.log(`BACKGROUND: Harvesting from ${platformKey} (Tab ID: ${tabId})`);
      const harvestResponse = await sendMessageToTab(tabId, { type: 'EXECUTE_HARVEST' });

      return { platform: platformKey, status: 'fulfilled', value: harvestResponse.data };
    } catch (e) {
      return { platform: platformKey, status: 'rejected', reason: e.message };
    }
  });

  const results = await Promise.all(allPlatformPromises);
  console.log("BACKGROUND: All platform workflows have settled.", results);

  results.forEach(result => {
    const key = result.platform;
    if (result.status === 'fulfilled') {
      workflowState.results[key] = result.value;
    } else {
      workflowState.results[key] = `Failed: ${result.reason}`;
    }
  });

  workflowState.status = 'complete';
  console.log(`BACKGROUND: Workflow ${workflowId} complete.`, workflowState);
  chrome.runtime.sendMessage({ type: 'WORKFLOW_UPDATE', payload: workflowState });
}

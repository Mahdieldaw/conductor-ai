// src/background/service-worker.js
import { MSG_TYPE } from '../shared/messaging.js';

// Phase 3: Tab Registry and Lifecycle Management
const tabRegistry = new Map(); // e.g., 'chatgpt' -> { tabId: 123, status: 'ready' }
const platformURLPatterns = {
  chatgpt: '*://chatgpt.com/*',
  claude: '*://claude.ai/*',
};
const platformKeys = Object.keys(platformURLPatterns);

async function findAndRegisterTabs() {
  console.log('SIDE-CAR: Initializing tab registry...');
  for (const platform of platformKeys) {
    const urlPattern = platformURLPatterns[platform];
    try {
      const tabs = await chrome.tabs.query({ url: urlPattern, status: 'complete' });
      if (tabs.length > 0) {
        const tab = tabs[0]; // Assume first found tab is the target
        tabRegistry.set(platform, { tabId: tab.id, status: 'ready' });
        console.log(`SIDE-CAR: Registered ${platform} tab: ${tab.id}`);
      }
    } catch (e) {
      console.error(`Error querying for ${platform}:`, e.message);
    }
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    for (const platform of platformKeys) {
      if (platform === 'chatgpt' && tab.url.includes('chatgpt.com')) {
        tabRegistry.set(platform, { tabId, status: 'ready' });
        console.log(`SIDE-CAR: Registered/Updated ${platform} tab: ${tabId}`);
      }
      if (platform === 'claude' && tab.url.includes('claude.ai')) {
        tabRegistry.set(platform, { tabId, status: 'ready' });
        console.log(`SIDE-CAR: Registered/Updated ${platform} tab: ${tabId}`);
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [platform, registryEntry] of tabRegistry.entries()) {
    if (registryEntry.tabId === tabId) {
      tabRegistry.delete(platform);
      console.log(`SIDE-CAR: Unregistered ${platform} tab: ${tabId}`);
      break;
    }
  }
});

// Run registration on startup
chrome.runtime.onStartup.addListener(findAndRegisterTabs);
// And when the extension is installed/reloaded
findAndRegisterTabs();

// Phase 0: External Message Listener
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('SIDE-CAR: Received message from:', sender.origin, message);

  if (message.type === MSG_TYPE.PING) {
    sendResponse({
      status: 'PONG',
      version: '0.1.0',
      registeredTabs: Object.fromEntries(tabRegistry),
    });
    return; // Synchronous response
  }

  if (message.type === MSG_TYPE.EXECUTE_PROMPT) {
    const { platform, prompt } = message.payload;
    handleExecutePrompt(platform, prompt)
      .then(sendResponse)
      .catch((error) => {
        console.error('SIDE-CAR: Error in handleExecutePrompt:', error);
        sendResponse({ status: 'failed', error: error.message });
      });
    return true; // Indicate async response
  }
});

// Phase 1 & 2: Prompt Execution and Harvesting
async function handleExecutePrompt(platform, prompt) {
  const registryEntry = tabRegistry.get(platform);
  if (!registryEntry) {
    throw new Error(`Tab for platform '${platform}' not found or registered.`);
  }
  const { tabId } = registryEntry;

  console.log(`SIDE-CAR: Executing prompt on ${platform} (tab: ${tabId})`);

  // 1. Broadcast the prompt
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (promptToBroadcast) => window.sidecar.broadcast(promptToBroadcast),
    args: [prompt],
  });

  console.log(`SIDE-CAR: Prompt sent to ${platform}, now harvesting...`);

  // 2. Harvest the result
  const harvestResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.sidecar.harvest(),
  });

  // executeScript returns an array of results, we want the main frame's.
  const result = harvestResults[0].result;
  console.log(`SIDE-CAR: Harvest complete from ${platform}.`, result);

  return { status: 'complete', response: result };
}
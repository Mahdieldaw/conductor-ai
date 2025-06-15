Here is the complete set of files for the new extension, refactored for the Sidecar architecture.
Directory Structure
.
├── .eslintrc.json
├── .prettierrc
├── manifest.v3.json
├── package.json
├── src
│   ├── background
│   │   └── service-worker.js
│   ├── content
│   │   ├── content.js
│   │   ├── primitives
│   │   │   ├── ContentStateDetector.js
│   │   │   └── helpers.js
│   │   └── providers
│   │       ├── BaseProvider.js
│   │       ├── ChatGPT.js
│   │       ├── Claude.js
│   │       └── ProviderFactory.js
│   └── shared
│       └── messaging.js
├── test-harness.html
└── webpack.config.js
Use code with caution.
manifest.v3.json
This manifest removes the popup action and adds the critical externally_connectable key, allowing your web app to communicate with the extension.
{
  "manifest_version": 3,
  "name": "Sidecar Extension MVP",
  "version": "0.1.0",
  "description": "Sidecar extension to connect a web app with LLMs.",
  "background": {
    "service_worker": "background.js"
  },
  "permissions": ["storage", "tabs", "scripting"],
  "host_permissions": ["*://chatgpt.com/*", "*://claude.ai/*"],
  "content_scripts": [
    {
      "matches": ["*://chatgpt.com/*", "*://claude.ai/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "externally_connectable": {
    "matches": [
      "*://localhost/*",
      "*://your-hybrid-thinking-domain.com/*"
    ]
  }
}
Use code with caution.
Json
webpack.config.js
The build configuration is simplified to only handle the background and content scripts, as the popup is no longer part of this architecture.
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  // Define entry points for background and content scripts
  entry: {
    background: './src/background/service-worker.js',
    content: './src/content/content.js',
  },
  // Output the bundled files to the 'dist' directory
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true, // Clean the dist folder before each build
  },
  // Configure plugins
  plugins: [
    // Copy manifest.v3.json to dist/manifest.json
    new CopyWebpackPlugin({
      patterns: [{ from: 'manifest.v3.json', to: 'manifest.json' }],
    }),
  ],
  // Development tools
  devtool: 'cheap-module-source-map',
  // Module resolution rules
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  // Configure how modules are resolved
  resolve: {
    extensions: ['.js'],
  },
};
Use code with caution.
JavaScript
src/background/service-worker.js
This is the new heart of the extension. It manages tab state, listens for external messages from your web app, and orchestrates the command-and-harvest loop using chrome.scripting.executeScript.
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
      // A simple includes check is often sufficient and more reliable
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
Use code with caution.
JavaScript
src/content/content.js
This script is now much simpler. It no longer listens for messages. Instead, it attaches a sidecar object to the window, exposing broadcast and harvest functions that the service worker can call directly.
// src/content/content.js
import { ProviderFactory } from './providers/ProviderFactory.js';
import { ContentStateDetector } from './primitives/ContentStateDetector.js';

// This helper is cited in the blueprint from the old content.js
function identifyCurrentPlatform() {
  const { hostname } = window.location;
  if (hostname.includes('chatgpt.com')) return 'chatgpt';
  if (hostname.includes('claude.ai')) return 'claude';
  return null;
}

// Expose a clean interface on the window object for the service worker to call
window.sidecar = {
  broadcast: async (prompt) => {
    console.log('SIDECAR-CONTENT: broadcast called.');
    try {
      await ProviderFactory.broadcast(window.location.hostname, prompt);
      return { status: 'ok', message: 'Prompt sent successfully.' };
    } catch (error) {
      console.error('SIDECAR-CONTENT: broadcast error:', error);
      return { status: 'error', message: error.message };
    }
  },

  harvest: async () => {
    console.log('SIDECAR-CONTENT: harvest called.');
    const platformKey = identifyCurrentPlatform();
    if (!platformKey) {
      const msg = 'Could not identify platform for harvesting.';
      console.error('SIDECAR-CONTENT: ' + msg);
      return { status: 'error', message: msg };
    }
    try {
      const content = await ContentStateDetector.waitForComplete(platformKey);
      return { status: 'ok', content };
    } catch (error) {
      console.error('SIDECAR-CONTENT: harvest error:', error);
      return { status: 'error', message: error.message };
    }
  },
};

console.log('✅ SIDE-CAR: Content script loaded and window.sidecar interface exposed.');
Use code with caution.
JavaScript
src/shared/messaging.js
A simplified messaging constant file for the new communication pattern.
// src/shared/messaging.js
export const MSG_TYPE = {
  // From external app to extension
  PING: 'PING',
  EXECUTE_PROMPT: 'EXECUTE_PROMPT',
};
Use code with caution.
JavaScript
test-harness.html
This new file acts as a simulator for your main web application, allowing for rapid testing of the core extension functionality without needing to integrate it fully.
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sidecar Extension Test Harness</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          sans-serif;
        max-width: 800px;
        margin: 2em auto;
        line-height: 1.6;
      }
      textarea {
        width: 100%;
        min-height: 150px;
        box-sizing: border-box;
      }
      pre {
        background-color: #f4f4f4;
        padding: 1em;
        border-radius: 4px;
        white-space: pre-wrap;
        word-wrap: break-word;
        border: 1px solid #ddd;
      }
      .controls,
      fieldset {
        border: 1px solid #ccc;
        padding: 1em;
        border-radius: 4px;
        margin-bottom: 1em;
      }
      button {
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid transparent;
        cursor: pointer;
      }
      #ping-btn {
        background-color: #6c757d;
        color: white;
      }
      #execute-btn {
        background-color: #007bff;
        color: white;
      }
    </style>
  </head>
  <body>
    <h1>Sidecar Extension Test Harness</h1>
    <p>This page simulates your web app. To use it:</p>
    <ol>
      <li>Load the unpacked extension in your browser.</li>
      <li>
        Go to <code>chrome://extensions</code>, find the "Sidecar Extension MVP",
        and copy its ID.
      </li>
      <li>Paste the ID into the input field below.</li>
      <li>Open tabs for ChatGPT and Claude and log in.</li>
      <li>Use the buttons to interact with the extension.</li>
    </ol>
    <hr />

    <div class="controls">
      <label>Extension ID: <input type="text" id="extension-id" size="40" /></label>
      <button id="ping-btn">Ping Extension</button>
    </div>

    <fieldset>
      <legend>Execute Prompt</legend>
      <label for="platform-select">Target Platform:</label>
      <select id="platform-select">
        <option value="chatgpt">ChatGPT</option>
        <option value="claude">Claude</option>
      </select>
      <br /><br />
      <label for="prompt-input">Prompt:</label>
      <textarea id="prompt-input">
Write a short story about a brave toaster.</textarea
      >
      <br /><br />
      <button id="execute-btn">Execute Prompt</button>
    </fieldset>

    <h3>Last Response:</h3>
    <pre id="response-output">No response yet.</pre>

    <script>
      const extensionIdInput = document.getElementById('extension-id');
      const pingBtn = document.getElementById('ping-btn');
      const executeBtn = document.getElementById('execute-btn');
      const responseOutput = document.getElementById('response-output');
      const platformSelect = document.getElementById('platform-select');
      const promptInput = document.getElementById('prompt-input');

      // Try to load from local storage
      extensionIdInput.value = localStorage.getItem('sidecarExtensionId') || '';

      function logResponse(data) {
        console.log('Response from extension:', data);
        responseOutput.textContent = JSON.stringify(data, null, 2);
      }

      pingBtn.addEventListener('click', () => {
        const extensionId = extensionIdInput.value.trim();
        if (!extensionId) {
          alert('Please enter the Extension ID.');
          return;
        }
        localStorage.setItem('sidecarExtensionId', extensionId);

        responseOutput.textContent = 'Pinging...';
        chrome.runtime.sendMessage(
          extensionId,
          { type: 'PING' },
          (response) => {
            if (chrome.runtime.lastError) {
              logResponse({ error: chrome.runtime.lastError.message });
            } else {
              logResponse(response);
            }
          }
        );
      });

      executeBtn.addEventListener('click', () => {
        const extensionId = extensionIdInput.value.trim();
        if (!extensionId) {
          alert('Please enter the Extension ID.');
          return;
        }
        localStorage.setItem('sidecarExtensionId', extensionId);

        const payload = {
          platform: platformSelect.value,
          prompt: promptInput.value,
        };

        responseOutput.textContent = `Executing on ${payload.platform}...`;
        chrome.runtime.sendMessage(
          extensionId,
          { type: 'EXECUTE_PROMPT', payload },
          (response) => {
            if (chrome.runtime.lastError) {
              logResponse({ error: chrome.runtime.lastError.message });
            } else {
              logResponse(response);
            }
          }
        );
      });
    </script>
  </body>
</html>
Use code with caution.
Html
Provider & Primitive Logic
These files are copied directly from your original codebase as their DOM interaction logic is robust and perfectly reusable for this new architecture. They are located in src/content/primitives/ and src/content/providers/.
(The content of ContentStateDetector.js, helpers.js, BaseProvider.js, ChatGPT.js, Claude.js, and ProviderFactory.js would be identical to the files provided in the prompt, so they are omitted here for brevity.)
Project Configuration
The package.json, .eslintrc.json, and .prettierrc files remain the same as in your original project to maintain build tooling and code standards.
(These files are also identical to the prompt's input.)onductor 

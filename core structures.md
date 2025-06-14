/src/content/primitives/ContentStateDetector.js






/**
 * A class responsible for detecting the state of content on an AI platform's page,
 * specifically for determining when a response has finished generating.
 */
export class ContentStateDetector {
  /**
   * A simple promise-based sleep utility.
   * @param {number} ms - Milliseconds to wait.
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * A factory method that returns the correct state detection logic
   * based on the target platform.
   * @param {string} platform - The key for the platform (e.g., 'chatGPT', 'claude').
   * @returns {function(): {isComplete: boolean, content: string}} A function that, when called, returns the current completion state and content.
   */
  static getDetector(platform) {
    const detectors = {
      chatGPT: () => {
        // Completion signal: The "send" button becomes available again.
        const isStreaming = !document.querySelector('[data-testid="send-button"]');
        // Find the last message from the assistant.
        const lastResponse = Array.from(
          document.querySelectorAll('[data-message-author-role="assistant"]')
        ).pop();
        return {
          isComplete: !isStreaming && !!lastResponse,
          content: lastResponse?.innerText || '',
        };
      },
      claude: () => {
        // Completion signal: The "stop generating" button disappears.
        const isStreaming = !!document.querySelector(
          'button[aria-label="Stop generating"]'
        );
        // Find the last message from the model.
        const lastResponse = Array.from(
          document.querySelectorAll('.font-claude-message')
        ).pop();
        return {
          isComplete: !isStreaming && !!lastResponse,
          content: lastResponse?.innerText || '',
        };
      },
    };
    return detectors[platform];
  }

  /**
   * A utility to perform basic cleaning of extracted text.
   * @param {string} raw - The raw text content from the page.
   * @returns {string} - The cleaned text.
   */
  static cleanContent(raw) {
    return raw.trim().replace(/\s+/g, ' ');
  }

  /**
   * Polls the page using the platform-specific detector until the AI response
   * is complete or a timeout is reached.
   * @param {string} platform - The key for the platform ('chatGPT' or 'claude').
   * @param {number} [timeout=30000] - Max time to wait in milliseconds.
   * @param {number} [interval=500] - Time between checks in milliseconds.
   * @returns {Promise<string>} - A promise that resolves with the clean response content.
   */
  static async waitForComplete(platform, timeout = 30000, interval = 500) {
    const detector = this.getDetector(platform);
    if (!detector) throw new Error(`No detector configured for ${platform}`);

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const { isComplete, content } = detector();
      // We check for some content length as a basic validation.
      if (isComplete && content.length > 5) {
        return this.cleanContent(content);
      }
      await this.sleep(interval);
    }
    throw new Error(`Timeout waiting for a complete response from ${platform}`);
  }
}



---


/src/content/providers/Claude.js




import { NoiAsk } from '../primitives/NoiAsk.js';

// CSS selectors specific to the Claude interface.
const selectors = {
  input: 'div[contenteditable="true"].ProseMirror',
  submit: 'button[aria-label="Send Message"]',
};

/**
 * Extends the base NoiAsk class to handle Claude's specific input mechanism.
 * Claude uses a contenteditable div instead of a standard textarea,
 * so we need to override the sync method to use `textContent`.
 */
class ClaudeAsk extends NoiAsk {
  sync(prompt) {
    const input = document.querySelector(this.selectors.input);
    if (input) {
      // For contenteditable divs, setting textContent is the correct approach.
      input.textContent = prompt;
    }
  }
}

// Create a new instance of our specialized ClaudeAsk class.
export const claudeAsk = new ClaudeAsk(selectors);


---


/src/content/providers/ChatGPT.js

import { NoiAsk } from '../primitives/NoiAsk.js';

// CSS selectors specific to the ChatGPT interface.
const selectors = {
  input: '#prompt-textarea',
  submit: '[data-testid="send-button"]',
};

// Create a new instance of NoiAsk configured for ChatGPT.
export const chatGPTAsk = new NoiAsk(selectors);


---

/src/content/primitives/NoiAsk.js




/**
 * A base class representing the primitive action of "asking" an AI.
 * It provides a standard interface for interacting with different AI platform UIs.
 * This class is designed to be extended by platform-specific implementations.
 */
export class NoiAsk {
  /**
   * @param {object} selectors - CSS selectors for the platform's UI elements.
   * @param {string} selectors.input - The selector for the prompt input area.
   * @param {string} selectors.submit - The selector for the submit button.
   */
  constructor(selectors) {
    this.selectors = selectors;
  }

  /**
   * Synchronizes the provided prompt text with the platform's input area.
   * @param {string} prompt - The text to place in the input area.
   */
  sync(prompt) {
    const input = document.querySelector(this.selectors.input);
    if (input) {
      input.value = prompt;
      // Dispatch an input event to ensure frameworks like React recognize the change
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Clicks the platform's submit button to send the prompt.
   */
  submit() {
    const button = document.querySelector(this.selectors.submit);
    // Some platforms disable the button, so we check for that attribute.
    if (button && !button.disabled) {
      button.click();
    }
  }
}



---


/src/shared/messaging.js




/**
 * Defines a centralized set of constants for message types used throughout
 * the extension. This prevents typos and makes the communication protocol
 * explicit and easier to manage.
 */
export const MSG = {
  // Message from Popup -> Background to start the orchestration
  START_WORKFLOW: 'START_WORKFLOW',

  // Message from Background -> Popup to provide a final update
  WORKFLOW_UPDATE: 'WORKFLOW_UPDATE',
};



---


/src/popup/popup.css


body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f4f4f9;
  color: #333;
  margin: 0;
  width: 380px;
}

.container {
  padding: 16px;
}

header {
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

header h3 {
  margin: 0;
  font-size: 18px;
  color: #1a1a1a;
}

textarea#prompt-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  resize: vertical;
}

fieldset {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

fieldset legend {
  padding: 0 5px;
  font-size: 14px;
  font-weight: 500;
}

.checkbox-group {
    display: flex;
    gap: 20px;
}

.checkbox-group label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.button-primary {
  width: 100%;
  padding: 12px;
  background-color: #4a4aef;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button-primary:hover {
  background-color: #3a3ad6;
}

.button-primary:disabled {
  background-color: #9e9ed4;
  cursor: not-allowed;
}

.status {
  margin-top: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.results {
  margin-top: 8px;
  background-color: #e9e9f3;
  border: 1px solid #d1d1e0;
  border-radius: 6px;
  padding: 10px;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
}
---

/src/popup/popup.js




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



---

/src/popup/popup.html



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div class="container">
        <header>
            <h3>Conductor AI</h3>
        </header>

        <main>
            <textarea id="prompt-input" rows="6" placeholder="Enter your prompt to orchestrate..."></textarea>
            
            <fieldset>
                <legend>Target Platforms</legend>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" name="platform" value="chat.openai.com" checked>
                        <span>ChatGPT</span>
                    </label>
                    <label>
                        <input type="checkbox" name="platform" value="claude.ai" checked>
                        <span>Claude</span>
                    </label>
                </div>
            </fieldset>
            
            <button id="run-button" class="button-primary">Run Workflow</button>

            <div id="status-display" class="status"></div>
            <pre id="results-display" class="results"></pre>
        </main>
    </div>
    <!-- Webpack will inject the script tag here -->
</body>
</html>


---


/src/content/content.js



import { chatGPTAsk } from './providers/ChatGPT.js';
import { claudeAsk } from './providers/Claude.js';
import { ContentStateDetector } from './primitives/ContentStateDetector.js';

// Expose a single, namespaced object on the window for the background script
// to interact with. This is the bridge between the extension's background
// and the web page's DOM.
window.conductor = {
  ...window.conductor,
  primitives: {
    chatGPT: chatGPTAsk,
    claude: claudeAsk,
  },
  detector: ContentStateDetector,
};

console.log('Conductor AI primitives injected.');



---


/src/background/service-worker.js


import { MSG } from '../shared/messaging.js';

/**
 * Main listener for incoming messages from other parts of the extension.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.START_WORKFLOW) {
    handleStartWorkflow(message.payload);
    return true; // Indicates that the response will be sent asynchronously.
  }
});

/**
 * Maps a platform hostname to the key used for our primitives.
 * @param {string} hostname - e.g., 'chat.openai.com'
 * @returns {string} - e.g., 'chatGPT'
 */
function getPrimitiveKey(hostname) {
  if (hostname.includes('openai.com')) return 'chatGPT';
  if (hostname.includes('claude.ai')) return 'claude';
  return null;
}

/**
 * Orchestrates the entire workflow of broadcasting a prompt and harvesting the results.
 * @param {object} payload - The workflow details from the popup.
 * @param {string} payload.prompt - The user's prompt.
 * @param {string[]} payload.platforms - Array of hostnames like 'chat.openai.com'.
 */
async function handleStartWorkflow({ prompt, platforms }) {
  const workflowId = `wf_${Date.now()}`;
  const workflowState = {
    id: workflowId,
    prompt,
    platforms,
    results: {},
    status: 'running',
  };

  // Initial state save
  await chrome.storage.local.set({ [workflowId]: workflowState });
  console.log(`Starting workflow ${workflowId} for platforms:`, platforms);

  // Process each platform in parallel
  const processingPromises = platforms.map(async (hostname) => {
    const primitiveKey = getPrimitiveKey(hostname);
    if (!primitiveKey) {
      workflowState.results[hostname] = 'Error: Unknown platform.';
      return;
    }

    try {
      const tabs = await chrome.tabs.query({ url: `*://${hostname}/*` });
      if (tabs.length === 0) {
        throw new Error(`No active tab found for ${hostname}.`);
      }
      const tabId = tabs[0].id;

      // 1. Broadcast: Inject and submit the prompt.
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (key, p) => {
          // This function runs in the content script's context
          const primitive = window.conductor.primitives[key];
          primitive.sync(p);
          primitive.submit();
        },
        args: [primitiveKey, prompt],
      });

      // 2. Harvest: Wait for the response to be complete and extract it.
      const harvestResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: (key) => window.conductor.detector.waitForComplete(key),
        args: [primitiveKey],
      });
      
      // The result of executeScript is an array of results, one for each frame. We want the main frame's result.
      workflowState.results[hostname] = harvestResults[0].result;
    } catch (e) {
      console.error(`Error processing ${hostname}:`, e);
      workflowState.results[hostname] = `Error: ${e.message}`;
    }
  });

  await Promise.all(processingPromises);

  // Final state update
  workflowState.status = 'complete';
  await chrome.storage.local.set({ [workflowId]: workflowState });
  console.log(`Workflow ${workflowId} complete.`, workflowState);

  // Notify the popup UI that the workflow is finished
  chrome.runtime.sendMessage({
    type: MSG.WORKFLOW_UPDATE,
    payload: workflowState,
  });
}

---

/manifest.v3.json

{
  "manifest_version": 3,
  "name": "Conductor AI MVP",
  "version": "0.1.0",
  "description": "Orchestrate prompts across multiple AI platforms.",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Conductor AI"
  },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "storage",
    "tabs",
    "scripting"
  ],
  "host_permissions": [
    "*://chat.openai.com/*",
    "*://claude.ai/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "*://chat.openai.com/*",
        "*://claude.ai/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}


---

/prettierrc

{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "arrowParens": "always",
  "printWidth": 80
}


---

/.eslintrc.json




{
  "env": {
    "browser": true,
    "es2021": true,
    "webextensions": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:prettier/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "prettier/prettier": "error"
  }
}


---
/webpack.config.js





const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Define three entry points, one for each major part of the extension
  entry: {
    background: './src/background/service-worker.js',
    content: './src/content/content.js',
    popup: './src/popup/popup.js',
  },
  // Output the bundled files to the 'dist' directory
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true, // Clean the dist folder before each build
  },
  // Configure plugins
  plugins: [
    // Copy static assets like the manifest and popup HTML to the dist directory
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.v3.json', to: 'manifest.v3.json' },
        { from: 'src/popup/popup.css', to: 'popup.css' }
      ],
    }),
    // Generate the popup.html file, injecting the popup.js script
    new HtmlWebpackPlugin({
      template: 'src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'], // Only include the popup chunk
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
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  // Configure how modules are resolved
  resolve: {
    extensions: ['.js'],
  },
};







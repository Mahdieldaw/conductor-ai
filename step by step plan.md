Phase 0: Repository & CI Foundation

Objective:

To establish a clean, scalable, and maintainable project structure with essential build and linting tools, ensuring a solid foundation for all subsequent development.

Key Files to Create/Modify:



/package.json

/webpack.config.js (or similar bundler config)

/.eslintrc.json

/.prettierrc

/manifest.v3.json (initial stub)

/src/background/service-worker.js

/src/content/content.js

/src/popup/popup.html

/src/popup/popup.js

/src/shared/messaging.js

Step-by-Step Implementation Details:



Task 1: Initialize Project & Dependencies.

Run npm init -y.

Install core dependencies: npm install --save-dev webpack webpack-cli copy-webpack-plugin html-webpack-plugin.

Install linting/formatting: npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-prettier.

Task 2: Configure Webpack.

In webpack.config.js, create three entry points: background (for service-worker.js), content (for content.js), and popup (for popup.js).

Configure CopyWebpackPlugin to move manifest.v3.json and the popup.html to the dist directory.

Configure HtmlWebpackPlugin for the popup.

Task 3: Scaffold Directory Structure.

Create the /src directory with subdirectories: background, content, popup, and shared.

Create empty placeholder files in each directory as listed above.

Task 4: Create Initial Manifest.

In manifest.v3.json, define the basic structure:

{

"manifest_version": 3,

"name": "Conductor AI MVP",

"version": "0.1.0",

"action": { "default_popup": "popup.html" },

"background": { "service_worker": "background.js" }

}


Task 5: Add Build Scripts.

In package.json, add "build": "webpack --mode=production" and "dev": "webpack --mode=development --watch" scripts.

Acceptance Criteria (Definition of Done):



Running npm run build successfully creates a /dist directory.

The /dist directory contains background.js, content.js, popup.js, popup.html, and manifest.v3.json.

The extension can be loaded into a Chromium-based browser from the /dist directory without errors.

Opening the extension popup shows a blank page (from the empty popup.html).

Phase 1: Core Injection Primitives (NoiAsk)

Objective:

To develop the fundamental, reusable code that can programmatically interact with the UI of target AI platforms, enabling prompt injection and submission.

Key Files to Create/Modify:



/src/content/content.js

/src/content/primitives/NoiAsk.js (New)

/src/content/providers/ChatGPT.js (New)

/src/content/providers/Claude.js (New)

Step-by-Step Implementation Details:



Task 1: Define the Base NoiAsk Class.

In /src/content/primitives/NoiAsk.js, create the base class.

export class NoiAsk {

constructor(selectors) {

this.selectors = selectors;

}

sync(prompt) {

const input = document.querySelector(this.selectors.input);

if (input) input.value = prompt;

}

submit() {

const button = document.querySelector(this.selectors.submit);

if (button) button.click();

}

}


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 2: Implement the ChatGPT Provider.

In /src/content/providers/ChatGPT.js, extend NoiAsk.

import { NoiAsk } from '../primitives/NoiAsk.js';const selectors = {

input: '#prompt-textarea',

submit: '[data-testid="send-button"]',

};export const chatGPTAsk = new NoiAsk(selectors);


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 3: Implement the Claude Provider.

In /src/content/providers/Claude.js, extend NoiAsk.

import { NoiAsk } from '../primitives/NoiAsk.js';const selectors = {

input: 'div[contenteditable="true"].ProseMirror',

submit: 'button[aria-label="Send Message"]',

};// Claude's input is a div, not a textarea, so we override sync.class ClaudeAsk extends NoiAsk {

sync(prompt) {

const input = document.querySelector(this.selectors.input);

if (input) input.textContent = prompt;

}

}export const claudeAsk = new ClaudeAsk(selectors);


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 4: Create the Global Registry.

In /src/content/content.js, import and attach the providers to the window object for direct console testing.

import { chatGPTAsk } from './providers/ChatGPT.js';import { claudeAsk } from './providers/Claude.js';// Expose a single, namespaced object for testing and executionwindow.conductor = {

...window.conductor,

primitives: {

chatGPT: chatGPTAsk,

claude: claudeAsk,

}

};console.log("Conductor AI primitives injected.");


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Acceptance Criteria (Definition of Done):



On a chat.openai.com tab, opening the developer console and running window.conductor.primitives.chatGPT.sync('Hello world'); correctly populates the prompt textarea.

Following up with window.conductor.primitives.chatGPT.submit(); successfully sends the message.

On a claude.ai tab, the same test sequence using window.conductor.primitives.claude works as expected.

Phase 2: Robust Response Extraction

Objective:

To implement a reliable mechanism for detecting when an AI model has finished generating a response and extracting the clean text content.

Key Files to Create/Modify:



/src/content/content.js

/src/content/primitives/ContentStateDetector.js (New)

Step-by-Step Implementation Details:



Task 1: Create the ContentStateDetector Class.

In /src/content/primitives/ContentStateDetector.js, create the class with a waitForComplete method stub.

export class ContentStateDetector {

static sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// ... other methods will go here

}


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 2: Implement Platform-Specific Detectors.

Add a static getDetector(platform) method to ContentStateDetector. This method will return a function that checks the DOM for completion signals.

static getDetector(platform) {

const detectors = {

chatGPT: () => {

const streaming = !document.querySelector('[data-testid="send-button"]');

const lastResponse = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]')).pop();

return { isComplete: !streaming && !!lastResponse, content: lastResponse?.innerText || '' };

},

claude: () => {

const streaming = !!document.querySelector('button[aria-label="Stop generating"]');

const lastResponse = Array.from(document.querySelectorAll('.font-claude-message')).pop();

return { isComplete: !streaming && !!lastResponse, content: lastResponse?.innerText || '' };

}

};

return detectors[platform];

}


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 3: Implement the waitForComplete Polling Loop.

Flesh out the waitForComplete method to use the detector in a polling loop with a timeout.

static async waitForComplete(platform, timeout = 30000, interval = 500) {

const detector = this.getDetector(platform);

if (!detector) throw new Error(`No detector for ${platform}`);


const startTime = Date.now();

while (Date.now() - startTime < timeout) {

const { isComplete, content } = detector();

if (isComplete && content.length > 10) { // Basic validation

return this.cleanContent(content);

}

await this.sleep(interval);

}

throw new Error(`Timeout waiting for response from ${platform}`);

}


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 4: Implement cleanContent Utility.

Add a basic static cleanContent method to remove extra whitespace.

static cleanContent(raw) {

return raw.trim().replace(/\s+/g, ' ');

}


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 5: Expose the Detector for Testing.

In /src/content/content.js, add the new class to the global namespace.

import { ContentStateDetector } from './primitives/ContentStateDetector.js';window.conductor = {

...window.conductor,

detector: ContentStateDetector

};


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Acceptance Criteria (Definition of Done):



After a message is sent on a chat.openai.com tab, running await window.conductor.detector.waitForComplete('chatGPT') in the console resolves with the clean text of the AI's response.

The same test on a claude.ai tab using await window.conductor.detector.waitForComplete('claude') successfully returns the response.

If a response doesn't arrive, the promise rejects with a timeout error after 30 seconds.

Phase 3: Background Orchestration Logic

Objective:

To create the "brain" of the extension in the background script, capable of receiving a workflow request and coordinating the broadcast/harvest actions across multiple tabs.

Key Files to Create/Modify:



/src/background/service-worker.js

/src/shared/messaging.js (for defining message types)

Step-by-Step Implementation Details:



Task 1: Define Message Types.

In /src/shared/messaging.js, define constants for message types to avoid typos.

export const MSG = {

START_WORKFLOW: 'START_WORKFLOW',

WORKFLOW_UPDATE: 'WORKFLOW_UPDATE',

// Internal messages for content script

EXECUTE_BROADCAST: 'EXECUTE_BROADCAST',

EXECUTE_HARVEST: 'EXECUTE_HARVEST',

};


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 2: Set up the Main Message Listener.

In /src/background/service-worker.js, set up the primary listener for messages from the popup.

import { MSG } from '../shared/messaging.js';



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

if (message.type === MSG.START_WORKFLOW) {

handleStartWorkflow(message.payload);

return true; // Indicates async response

}

});


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 3: Implement the handleStartWorkflow Orchestrator.

This is the core logic. It will find tabs, execute scripts, and manage state.

async function handleStartWorkflow({ prompt, platforms }) {

const workflowId = `wf_${Date.now()}`;

const workflowState = { id: workflowId, prompt, platforms, results: {}, status: 'running' };

await chrome.storage.local.set({ [workflowId]: workflowState });



for (const platform of platforms) {

// Find the tab for the platform (simplified for now)

const tabs = await chrome.tabs.query({ url: `*://${platform}.*/*` }); // e.g., *.openai.com/*

if (tabs.length > 0) {

const tabId = tabs[0].id;

try {

// 1. Broadcast

await chrome.scripting.executeScript({

target: { tabId },

func: (p, prompt) => window.conductor.primitives[p].sync(prompt) && window.conductor.primitives[p].submit(),

args: [platform.replace('.openai.com', 'chatGPT').replace('.claude.ai', 'claude'), prompt]

});



// 2. Harvest

const results = await chrome.scripting.executeScript({

target: { tabId },

func: (p) => window.conductor.detector.waitForComplete(p),

args: [platform.replace('.openai.com', 'chatGPT').replace('.claude.ai', 'claude')]

});



workflowState.results[platform] = results[0].result;

} catch (e) {

workflowState.results[platform] = `Error: ${e.message}`;

}

}

}

workflowState.status = 'complete';

await chrome.storage.local.set({ [workflowId]: workflowState });

// Notify popup

chrome.runtime.sendMessage({ type: MSG.WORKFLOW_UPDATE, payload: workflowState });

}


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Note: The platform name mapping (e.g., claude.ai -> claude) is simplified here and should be made more robust. For the MVP, we'll hardcode chat.openai.com and claude.ai.

Acceptance Criteria (Definition of Done):



With ChatGPT and Claude tabs open, opening the service worker console and running chrome.runtime.sendMessage({ type: 'START_WORKFLOW', payload: { prompt: 'test', platforms: ['chat.openai.com', 'claude.ai'] } }) triggers the prompt submission on both tabs.

After both platforms respond, an object containing the workflow results is saved to chrome.storage.local.

The service worker console logs the final workflowState object.

Phase 4: Manifest & Communication Wiring

Objective:

To correctly configure the manifest.json with all necessary permissions and content script definitions, ensuring all parts of the extension can communicate securely.

Key Files to Create/Modify:



/manifest.v3.json

Step-by-Step Implementation Details:



Task 1: Add Core Permissions.

In manifest.v3.json, add the storage, tabs, and scripting permissions.

"permissions": [

"storage",

"tabs",

"scripting"

],


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. Json

IGNORE_WHEN_COPYING_END

Task 2: Define Host Permissions and Content Scripts.

Specify which sites the extension needs to access and inject scripts into.

"host_permissions": [

"*://chat.openai.com/*",

"*://claude.ai/*"

],"content_scripts": [

{

"matches": [

"*://chat.openai.com/*",

"*://claude.ai/*"

],

"js": ["content.js"],

"run_at": "document_idle"

}

]


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. Json

IGNORE_WHEN_COPYING_END

Task 3: Finalize Manifest.

Ensure all sections (name, version, action, background, permissions, etc.) are present and correctly formatted for Manifest V3.

Acceptance Criteria (Definition of Done):



The extension loads into the browser without any manifest-related errors.

Navigating to chat.openai.com or claude.ai successfully injects content.js, verified by the "Conductor AI primitives injected" message in the page's console.

The background script has the necessary permissions to query tabs and execute scripts on these domains, which was functionally tested in Phase 3.

Phase 5: Popup UI

Objective:

To build the user-facing interface that allows a user to input a prompt, select target platforms, initiate the orchestration workflow, and view the results.

Key Files to Create/Modify:



/src/popup/popup.html

/src/popup/popup.js

/src/popup/popup.css (Optional, for basic styling)

Step-by-Step Implementation Details:



Task 1: Create the Popup HTML Structure.

In /src/popup/popup.html, create the UI elements.

<!DOCTYPE html><html><head><link rel="stylesheet" href="popup.css"></head><body>

<h3>Conductor AI</h3>

<textarea id="prompt-input" rows="5" placeholder="Enter your prompt..."></textarea>

<fieldset>

<legend>Platforms</legend>

<label><input type="checkbox" name="platform" value="chat.openai.com" checked> ChatGPT</label>

<label><input type="checkbox" name="platform" value="claude.ai" checked> Claude</label>

</fieldset>

<button id="run-button">Run Workflow</button>

<div id="status-display"></div>

<pre id="results-display"></pre>

<script src="popup.js"></script></body></html>


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. Html

IGNORE_WHEN_COPYING_END

Task 2: Implement Popup Logic for Sending Messages.

In /src/popup/popup.js, add the event listener for the run button.

import { MSG } from '../shared/messaging.js';document.getElementById('run-button').addEventListener('click', () => {

const prompt = document.getElementById('prompt-input').value;

const platformNodes = document.querySelectorAll('input[name="platform"]:checked');

const platforms = Array.from(platformNodes).map(node => node.value);



if (prompt && platforms.length > 0) {

document.getElementById('status-display').textContent = 'Starting workflow...';

document.getElementById('run-button').disabled = true;


chrome.runtime.sendMessage({

type: MSG.START_WORKFLOW,

payload: { prompt, platforms }

});

}

});


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Task 3: Implement Popup Logic for Receiving Results.

In /src/popup/popup.js, add a listener to handle updates from the background script.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

if (message.type === MSG.WORKFLOW_UPDATE) {

const { payload } = message;

document.getElementById('status-display').textContent = `Workflow ${payload.status}!`;

document.getElementById('results-display').textContent = JSON.stringify(payload.results, null, 2);

document.getElementById('run-button').disabled = false;

}

});


IGNORE_WHEN_COPYING_START

content_copy download

Use code with caution. JavaScript

IGNORE_WHEN_COPYING_END

Acceptance Criteria (Definition of Done):



The extension popup renders correctly with a textarea, two checkboxes, and a button.

Entering a prompt, selecting both platforms, and clicking "Run" disables the button and sends the correct START_WORKFLOW message to the service worker.

The entire broadcast-and-harvest workflow from Phase 3 is successfully executed.

When the workflow is complete, the status text updates to "Workflow complete!" and the results from both platforms are displayed as a formatted JSON string in the results area.

The MVP is functionally complete.
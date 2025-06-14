Generate an Actionable MVP Implementation Plan for Conductor AI

Role: You are a Principal Software Engineer and Technical Project Manager. Your expertise lies in translating architectural blueprints into actionable, phased development plans for browser-based applications.

Core Context: You are given two documents that define a project called "Conductor AI".

The Vision & Architecture Document: This describes the "what" and the "how" of the system, including its core principles (local-first, no backend) and high-level code architecture (SynthesisOrchestrator, ContentStateDetector).

The Phased Execution Blueprint: This provides a high-level, 8-phase project roadmap.

Your task is to synthesize these documents into a granular, step-by-step implementation plan for the Minimum Viable Product (MVP).

Primary Task: Generate a detailed, developer-focused implementation plan for the Conductor AI MVP. The MVP is defined as Phases 0 through 5 of the provided blueprint, culminating in a functional browser extension with a popup UI that can successfully execute a broadcast-and-harvest workflow on at least two platforms (e.g., ChatGPT and Claude).

Key Directives & Constraints:

Actionable Granularity: Do not just list the phases. For each phase, break it down into specific, numbered tasks. These tasks should be small enough for a developer to complete in a single session. Include file names, function/class names, and key method signatures to implement.

Architectural Purity: The plan must strictly adhere to the core principles:

Local-First: All state (session history, user prompts) must be managed within the browser using chrome.storage or IndexedDB. No server-side components.

Browser-Native Runtime: The extension's background script is the central nervous system. Content scripts are the remote hands and eyes.

Event-Driven Communication: Components (popup, background script, content scripts) must communicate via chrome.runtime.sendMessage and chrome.tabs.sendMessage. Avoid direct function calls across these boundaries.

Standalone Value & Testability: Structure each phase so that it delivers a testable, demonstrable outcome. For each phase, define clear "Acceptance Criteria" or a "Definition of Done" that can be verified manually from the browser console or through interaction.

Focus on the MVP Core: Prioritize the core workflow: Prompt -> Broadcast -> Extract -> Display. Defer advanced features like synthesis, power-user shortcuts, and a full dashboard SPA for post-MVP. The goal is to get the fundamental loop working reliably.

Code-Level Specificity: Where appropriate, suggest the structure of key data objects (e.g., the workflowState object) and the flow of data through the system (e.g., "Popup sends message -> Background script receives -> Background script dispatches to content scripts").

Output Structure:

Please format your response using the following structure for each phase of the MVP (Phases 0-5).

Phase [Number]: [Phase Title]

Objective:
A one-sentence summary of the goal for this phase.

Key Files to Create/Modify:

/path/to/file.js

/path/to/another/file.json

Step-by-Step Implementation Details:

Task 1: (e.g., "In src/primitives/NoiAsk.js, define the base NoiAsk class with stubs for sync() and submit().")

Task 2: (e.g., "Create src/providers/ClaudeAsk.js. Extend the base NoiAsk class and implement the sync() method by selecting the chat input element with the selector ... and setting its value.")

Task 3: (e.g., "Implement the submit() method by selecting the submit button with the selector ... and dispatching a click event.")

...

Acceptance Criteria (Definition of Done):

A bulleted list of verifiable outcomes.

(e.g., "From the browser's developer console on a Claude.ai tab, running window.NoiAsk.claudeAsk.sync('test'); window.NoiAsk.claudeAsk.submit(); successfully inputs 'test' into the chat box and sends the message.")

(e.g., "Unit tests for the cleanContent() utility function pass successfully.")

Begin with Phase 0: Repository & CI Foundation and proceed sequentially through Phase 5: Popup UI. Ensure the final output is a complete, end-to-end guide that a developer can follow to build the Conductor AI MVP from scratch.



Below is a layered, phase‑driven blueprint that orders every artifact—from low‑level primitives to end‑user UIs—so you can execute with surgical precision. Each phase builds on the last and clearly indicates dependencies.

Phase 0 ▶︎ Repository & CI Foundation

Repo scaffolding

/src/

primitives/ (NoiAsk base, helper utils)

providers/ (one file per platform)

engine/ (orchestrator, detector, validator)

ui/ (popup, HUD, dashboard)

manifest.json, package.json, tsconfig.json

Build tool

Rollup/Webpack config to bundle content‑script and UI assets separately.

Linting & Testing

ESLint + Prettier

Jest for unit tests on detectors and validators

Phase 1 ▶︎ Core Injection Primitives (NoiAsk)

Base class (src/primitives/NoiAsk.js)

sync(), autoClick(), simulateUserInput(), autoFocus()

Provider stubs (src/providers/)

One file per new platform (e.g. GrokAsk.js, GAIStudioAsk.js) extending NoiAsk

Exported registry in index.js → window.NoiAsk = { … }

Manifest updates

Add host‑matches for each new platform

Deliverable: single “type & click” injection bundle that works on every target URL.

Phase 2 ▶︎ Robust Extraction Engine

ContentStateDetector (src/engine/ContentStateDetector.js)

Polling loop with interval/back‑off

Per‑platform detectors (getDetector())

validateResponse(), cleanContent()

Unit tests to simulate sample HTML snippets

Fallback hooks

Export points for HTML→MD converter or clipper

Deliverable: module that reliably returns clean text for any supported platform.

Phase 3 ▶︎ Synthesis Orchestrator Core

SynthesisOrchestrator (src/engine/SynthesisOrchestrator.js)

broadcast(), harvestResponses(), filterByQuality()

synthesize() → builds meta‑prompt and reinjects

OrchestrationDashboard (src/engine/OrchestrationDashboard.js)

Workflow state management

Tab‑management APIs (create/focus)

Integration tests

Mock window.NoiAsk and ContentStateDetector

Deliverable: headless engine that can run via method calls.

Phase 4 ▶︎ Extension Manifest & Permissions

manifest.json

Permissions: tabs, storage, notifications, scripting, commands

Content‑script matches for all platforms

Background/service worker (for commands & tab control)

Commands section

Bind keyboard shortcuts (Run Orchestration, Repeat Last)

Deliverable: extension config that allows code to inject, open tabs, send messages, and store state.

Phase 5 ▶︎ Popup UI

src/ui/popup.html + popup.js

Textarea for prompt

Platform checkboxes (dynamically read from window.NoiAsk registry)

“Run” button → chrome.runtime.sendMessage({ type: 'START_WORKFLOW', prompt, platforms })

Link to Dashboard

Styling

Tailwind or minimal CSS for clarity

Deliverable: one‑click entry point for users.

Phase 6 ▶︎ In‑Page HUD & Notifications

HUD component (src/ui/hud.js)

Injected via content‑script on each tab

Listens for events (WORKFLOW_UPDATE)

Renders per‑platform status dots + progress bar

Chrome notifications

Background script handles chrome.notifications.create() at key milestones

Deliverable: real‑time in‑context feedback.

Phase 7 ▶︎ Orchestration Dashboard

src/ui/dashboard.html + dashboard.js

Reads workflowState from chrome.storage or via messaging

Renders Current Workflow panel, Results Preview, History & Replay, Settings

“Re‑run” buttons wired to initializeWorkflow()

State persistence

Save workflowState on every transition

Deliverable: full‑featured SPA for deep inspection, history, and user preferences.

Phase 8 ▶︎ Power‑User Shortcuts & KB Integration

Keyboard commands

Register chrome.commands.onCommand handlers in background script

Obsidian/Notion export

“Send to Vault” button in Dashboard → chrome.downloads.download() a .md file or use native messaging

Optional: Vault folder‑watcher helper for auto‑import

Deliverable: frictionless record‑keeping and lightning‑fast re‑runs.

Summary Blueprint Map
Phase 0 ─► Setup repo & CI
Phase 1 ─► Build injection primitives & provider registry
Phase 2 ─► Build extraction engine (polling + validation)
Phase 3 ─► Build headless orchestrator + dashboard logic
Phase 4 ─► Flesh out manifest & permissions (tabs, commands)
Phase 5 ─► Build popup UI (entry point)
Phase 6 ─► Inject in‑page HUD & notifications
Phase 7 ─► Build standalone Dashboard SPA
Phase 8 ─► Add shortcuts & KB integrations


Follow that order, and you’ll layer each capability cleanly—minimizing rework and ensuring that every piece (from low‑level DOM hacks to high‑level user workflows) slots neatly into place.
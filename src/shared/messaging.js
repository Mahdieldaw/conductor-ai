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


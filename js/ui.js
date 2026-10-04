// ============================================
// js/ui.js - Display messages in status banner
// ============================================
import { state } from './state.js';

/** @type {string[]} */
let messageQueue = [];
let isDisplaying = false;
let previousMessage = ''; // Store prior message before interrupts (i.e. Resign/Cube)
let currentMessage = '';  // Track active message in status bar

/** @type {ReturnType<typeof setTimeout> | null} */
let temporaryMessageTimer = null;
const DISPLAY_DELAY_MS = 1500;  // Delay in milliseconds

/**
 * Save current active message so it can be restored if prompt cancelled.
 */
export function saveCurrentStatus() {
  if (state.isRolling) return;  // Prevent saving mid roll status text

  const statusBar = document.getElementById('game-status-bar');
  if (statusBar && statusBar.textContent) {
    previousMessage = statusBar.textContent;
  } else {
    previousMessage = currentMessage;
  }
}

/**
 * Restore message that was active prior to a cancelled prompt.
 */
export function restorePreviousStatus() {
  if (previousMessage) {
    setStatus(previousMessage);
  }
}

/**
 * Helper function to capitalize 'white' or 'black'
 * @param {string} message 
 * @returns {string}
 */
function formatPlayerNames(message) {
  if (typeof message !== 'string') return message;
  // Match 'white' or 'black' as whole words (case insensitive)
  return message.replace(/\b(white|black)\b/gi, (match) => {
    return match.charAt(0).toUpperCase() + match.slice(1);
  });
}

/**
 * Log message to status bar and console
 * @param {string} message
 * @param {number} [timeout=0]
 */
export function logStatus(message, timeout = 0) {    
  const formattedMessage = formatPlayerNames(message);  // Capitalize player names

  // Capture caller stack trace
  const stack = new Error().stack;
  let origin = 'unknown';

  if (stack) {
    const lines = stack.split('\n');
    // Find first line in call stack that did not originate from ui.js
    const callerLine = lines.find(line => {
      return line.includes('.js') && !line.includes('ui.js')
    });

    if (callerLine) {
      // Extract filename.js:line:col
      const match = callerLine.match(/([\w-]+\.js:\d+:\d+)/);
      if (match) {
        origin = match[1];
      }
    }
  }
  // Log message to developer console with call origin details
  console.log(`${formattedMessage} [${origin}]`);

  // Console-only message: Skip status bar display if timeout is explicitly -1
  if (timeout === -1) return;

  // Temporary/interrupting message with a specified duration
  if (timeout > 0) {
    showTemporaryStatus(formattedMessage, timeout);
    return;
  }
  // Override/clear out any previous temporary message with persistent message
  if (temporaryMessageTimer) {
    clearTimeout(temporaryMessageTimer);
    temporaryMessageTimer = null;
  }
  // Display normal persistent status message
  messageQueue.push(formattedMessage);    
  if (!isDisplaying) {
    processQueue(); // Start queue if not currently running
  }
}

/**
 * @param {string} tempMessage 
 * @param {number} duration 
 * @returns 
 */
function showTemporaryStatus(tempMessage, duration) {
  const statusBar = document.getElementById('game-status-bar');
  if (!statusBar) return;
  // Clear any active temporary message timer
  if (temporaryMessageTimer) {
    clearTimeout(temporaryMessageTimer);
    temporaryMessageTimer = null;
  }
  // Display temporary message immediately
  statusBar.textContent = tempMessage;
  // Restore previous message (or resume queue) after timeout
  temporaryMessageTimer = setTimeout(() => {
    temporaryMessageTimer = null;
    if (messageQueue.length > 0) {
        processQueue();
    } else {
        statusBar.textContent = currentMessage;
    }
  }, duration);
}

/**
 * @param {number} [delay=400]
 */
export function resetStatusToDefault(delay = 400) {
  // Leave last message on board if game is over (don't reset it)
  if (state.gamePhase === 'game_over') return;

  // Allow immediate revert on events like mouseleave
  if (temporaryMessageTimer) {
    clearTimeout(temporaryMessageTimer);
    temporaryMessageTimer = null;
  }
  // Add a slight delay so tempMessage doesn't snap away immediately
  temporaryMessageTimer = setTimeout(() => {
    temporaryMessageTimer = null;        
    const statusBar = document.getElementById('game-status-bar');
    if (statusBar) {
        statusBar.textContent = currentMessage;
    }
  }, delay);
}

function processQueue() {
  // If temp message displayed, pause queue
  if (temporaryMessageTimer) {
    isDisplaying = false;
    return;
  }
  // Stop loop and keep displaying last message when done
  if (messageQueue.length === 0) {
    isDisplaying = false;
    return;
  }
  isDisplaying = true;
  // Grab first message and save as first persistent message
  const nextMessage = messageQueue.shift();
  if (nextMessage) {
    currentMessage = nextMessage;    
  }
  // Update the DOM
  const statusBar = document.getElementById('game-status-bar');
  if (statusBar) {
    statusBar.textContent = currentMessage;
  }
  // Wait for delay, then process next message (if any)
  setTimeout(() => {
    processQueue();
  }, DISPLAY_DELAY_MS);
}

/**
 *  Update interactive legend button visibility based on game state
 */
export function updateLegendUI() {
  const rollBtn = /** @type {HTMLButtonElement | null} */
    (document.getElementById('action-roll-btn'));
  const resignBtn =  /** @type {HTMLButtonElement | null} */
    (document.getElementById('action-resign-btn'));
  const undoBtn = /** @type {HTMLButtonElement | null} */
    (document.getElementById('action-undo-btn'));
  const doneBtn = /** @type {HTMLButtonElement | null} */
    (document.getElementById('action-done-btn'));

  if (!rollBtn || !resignBtn || !undoBtn || !doneBtn) return;

  // Disable legend buttons during prompts (Cube, Resign, Game Over, etc.)
  if (
    state.isCubeOffered || state.isResignOffered ||
    state.gamePhase === 'game_over' || state.isInputLocked
  ) {
    rollBtn.disabled;
    resignBtn.disabled;
    undoBtn.disabled;
    doneBtn.disabled;
    return;
  }

// During active gameplay keep all four buttons visible
  if (state.gamePhase === 'turns' || state.gamePhase === 'opening_roll') {
    rollBtn.classList.remove('hidden');
    resignBtn.classList.remove('hidden');
    undoBtn.classList.remove('hidden');
    doneBtn.classList.remove('hidden');

    // Disable buttons if a resignation confirmation prompt is active
    const isPendingPrompt = state.isResignOffered;

    rollBtn.disabled = isPendingPrompt || state.hasRolled;    
    undoBtn.disabled = isPendingPrompt || !state.hasRolled || state.moveHistory.length === 0;
    doneBtn.disabled = isPendingPrompt || !state.hasRolled || state.currentRoll.length > 0;
    resignBtn.disabled = isPendingPrompt || state.gamePhase === 'opening_roll';

    return;
  }

  // Opening roll phase
  // if (state.gamePhase === 'opening_roll') {
  //   const isOpeningRollPending =
  //     state.openingRolls.white === null || state.openingRolls.black === null;

  //   rollBtn.classList.toggle('hidden', !isOpeningRollPending);
  //   resignBtn.classList.add('hidden');
  //   undoBtn.classList.add('hidden');
  //   doneBtn.classList.add('hidden');
  // }
}

/**
 *  Clear any pending queued messages when a cube offer is initiated.
 *  The doubling prompt will overwrite the status bar immediately.
 */
export function clearStatusQueue() {
  messageQueue = [];  // Empty any pending messages
  isDisplaying = false;
  currentMessage = '';  // Clear any stale persistent message reference
  if (temporaryMessageTimer) {
    clearTimeout(temporaryMessageTimer);
    temporaryMessageTimer = null;
  }
}

/**
 * Directly set and display a persistent status message (useful for undo/restore).
 * @param {string} message 
 */
export function setStatus(message) {
  if (temporaryMessageTimer) {
    clearTimeout(temporaryMessageTimer);
    temporaryMessageTimer = null;
  }
  messageQueue = []; // Clear queue
  isDisplaying = false;
  
  currentMessage = formatPlayerNames(message);
  
  const statusBar = document.getElementById('game-status-bar');
  if (statusBar) {
    statusBar.textContent = currentMessage;
  }
}

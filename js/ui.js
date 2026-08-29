// ============================================
// js/ui.js - Display messages in status banner
// ============================================
import { state } from './state.js';

let messageQueue = [];
let isDisplaying = false;
let currentMessage = '';    // Track active message in status bar
let temporaryMessageTimer = null;
const DISPLAY_DELAY_MS = 1500;  // Delay in milliseconds

// Helper function to capitalize 'white' or 'black'
function formatPlayerNames(message) {
    if (typeof message !== 'string') return message;
    // Match 'white' or 'black' as whole words (case insensitive)
    return message.replace(/\b(white|black)\b/gi, (match) => {
        return match.charAt(0).toUpperCase() + match.slice(1);
    });
}

export function logStatus(message, timeout = 0) {    
    const formattedMessage = formatPlayerNames(message);  // Capitalize player names in the text    
    console.log(formattedMessage);  // Log message to developer console with no delay
    // Temporary/interrupting message with a specified duration
    if (timeout > 0) {
        showTemporaryStatus(formattedMessage, timeout);
        return;
    }
    // Normal persistent status message
    messageQueue.push(formattedMessage);    
    if (!isDisplaying) {
        processQueue(); // Start queue if not currently running
    }
}

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

export function resetStatusToDefault(delay = 400) {
    // Leave last message on board if game is over (i.e. don't reset message)
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
    currentMessage = nextMessage;    
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
 *  Update the dice control legend dynamically between regular play and cube decisions
 */
export function updateLegendUI() {
    const legendEl = document.querySelector('.dice-legend');
    if (!legendEl) return;

    if (state.gamePhase === 'game_over') {
      legendEl.innerHTML = '';  // Clear legend controls on game over
      return;
    }

    if (state.isResignOffered) {
        legendEl.innerHTML = `
          <span><strong>Y</strong> : Resign</span>
          <span><strong>N</strong> : Cancel</span>
        `;
    } else if (state.isCubeOffered) {
        legendEl.innerHTML = `
          <span><strong>Y</strong> : Accept</span>
          <span><strong>N</strong> : Resign</span>
      `;
    } else if (!state.hasRolled && state.gamePhase === 'turns') {
        legendEl.innerHTML = `
          <span><strong>R</strong> : Roll</span>
          <span><strong>Q</strong> : Resign</span>
        `;
    } else {
        legendEl.innerHTML = `
          <span><strong>R</strong> : Roll</span>
          <span><strong>U</strong> : Undo</span>
          <span><strong>D</strong> : Done</span>
        `;
    }
}

/**
 *  Clear any pending queued messages when a cube offer is initiated.
 *  The doubling prompt will overwrite the status bar immediately.
 */
export function clearStatusQueue() {
    messageQueue = [];  // Empty any pending messages
    isDisplaying = false;
    if (temporaryMessageTimer) {
        clearTimeout(temporaryMessageTimer);
        temporaryMessageTimer = null;
    }
}

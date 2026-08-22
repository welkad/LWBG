// ============================================
// js/ui.js - Display messages in status banner
// ============================================
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

// =======================================================
//  DECLINE OR ACCEPT DOUBLES
// =======================================================

/**
 * Renders an inline modal/banner allowing the opponent to Accept or Decline a cube offer.
 */
export function renderCubeOfferModal(offeringPlayer, targetValue, onRespond) {
  const opponent = offeringPlayer === 'white' ? 'black' : 'white';
  
  // Remove existing prompt if present
  const existing = document.getElementById('cube-offer-modal');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'cube-offer-modal';
  container.className = 'cube-offer-modal';
  container.innerHTML = `
    <div class="cube-offer-content">
      <p><strong>${offeringPlayer.toUpperCase()}</strong> offers to double the cube to <strong>${targetValue}</strong>.</p>
      <p>${opponent.toUpperCase()}, do you accept or decline?</p>
      <div class="cube-offer-actions">
        <button id="btn-accept-cube" class="btn-cube-accept">Accept</button>
        <button id="btn-decline-cube" class="btn-cube-decline">Decline (Resign)</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  document.getElementById('btn-accept-cube').addEventListener('click', () => {
    container.remove();
    onRespond(true);
  });

  document.getElementById('btn-decline-cube').addEventListener('click', () => {
    container.remove();
    onRespond(false);
  });
}

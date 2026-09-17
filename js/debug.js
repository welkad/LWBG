// js/debug.js - Developer utilities and trace logging toggleable via keypress ('T')
import { state } from './state.js';
import { renderBoard, renderBar } from './board.js';
import { runMoveTests } from './test-moves.js';

/**
 * Global debug flag. Toggle on or off by pressing 'T'.
 * @type {boolean}
 */
export let DEBUG_MODE = false;

/**
 * Global DOM click listener ref for cleanup.
 * @type {((e: MouseEvent) => void) | null}
 */
let clickDebugHandler = null;

/**
 * Initialize keydown listener ('T') and attach debug helper functions to window.
 */
export function initDebugModule() {
  // Listen for 'T' keypress to toggle debug mode
  window.addEventListener('keydown', (e) =>{
    // Ignore input if user is typing in a textarea/input element
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.key === 't' || e.key === 'T') {
      DEBUG_MODE = !DEBUG_MODE;
      console.log(`%c[DEBUG MODULE] ${DEBUG_MODE ? 'ENABLED' : 'DISABLED'}`,
        `color: ${DEBUG_MODE 
          ? '#4caf50' : '#f44336'}; font-weight: bold; font-size: 14px;`);

      if (DEBUG_MODE) {
        attachClickTracker();
      } else {
        detachClickTracker();
      }
    }
  });
  // Attach window helpers
  attachWindowDebugHelpers();
}

/**
 * Capture raw DOM clicks during capture phase when DEBUG_MODE is active.
 */
function attachClickTracker() {
  if (clickDebugHandler) return;

  clickDebugHandler = (e) => {
    if (!DEBUG_MODE) return;

    const targetEl = e.target;
    if (targetEl instanceof HTMLElement) {        
      const pointEl = targetEl.closest('[data-point]');  
    
      /** @type {HTMLElement|null} */
      const htmlPointEl = pointEl instanceof HTMLElement ? pointEl : null;
      
      console.group('%c[=== DOM CLICK DETECTED ===]',
         'color: #ffeb3b; font-weight: bold;');
      console.log('Raw Clicked Element:', targetEl);
      console.log("Raw Clicked Element:", targetEl);
      console.log("Closest [data-point] Element:", htmlPointEl);
      console.log("data-point value:", htmlPointEl
        ? htmlPointEl.dataset.point : "NONE");
      console.groupEnd();
    }    
  };
  document.body.addEventListener('click', clickDebugHandler, true);
}

/**
 * Remove click tracker when debup mode is toggled off.
 */
function detachClickTracker() {
  if (clickDebugHandler) {
    document.body.removeEventListener('click', clickDebugHandler, true);
    clickDebugHandler = null;
  }
}

/** 
 * Attach state-manipulation debug functions to the window object.
 */
function attachWindowDebugHelpers() {
  // Expose the unit test harness on window
  /** @type {any} */ (window).runMoveTests = runMoveTests;

  // debugSetBearOff(); // Instantly loads black and white checkers in pockets
  /** @type {any} */ (window).debugSetBearOff = function(blackCount = 5, whiteCount = 5) {
    state.borneOff.black = blackCount;
    state.borneOff.white = whiteCount;

    // Mock active game state
    state.currentPlayer = state.currentPlayer || 'black';
    state.hasRolled = true;
    state.currentRoll = [6, 4];
    state.selectedPoint = 5; // Mock selected point
    state.validMoves = ['off'];

    // Force re-render
    if (typeof renderBoard === 'function') {
      renderBoard();
    }

    // Force class fallback if re-render clears it
    const playerPocket = document.getElementById(`bear-off-${state.currentPlayer}`);
    if (playerPocket) {
      playerPocket.classList.add('valid-target');
    }

    console.log(`%c[DEBUG] Bear-off set -> Black: ${blackCount}, White: ${whiteCount}`,
      'color: #00bcd4;');
  };

  // debugSetBar(); // Instantly loads black and white checkers onto the Bar
  /** @type {any} */ (window).debugSetBar = function(blackCount = 3, whiteCount = 3) {
    state.bar.black = blackCount;
    state.bar.white = whiteCount;
    renderBar();
    console.log(`%c[DEBUG] Bar set -> Black: ${blackCount}, White: ${whiteCount}`,
      'color: #00bcd4;');
  };
}
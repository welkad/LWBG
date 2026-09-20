// js/debug.js - Developer utilities and trace logging toggleable via keypress ('T')
import { renderBoard, renderBar, updatePointLabels } from './board.js';
import { runMoveTests } from './test-moves.js';
import { renderDiceUI } from './dice-renderer.js';
import { state } from './state.js';

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
         'color: orange; font-weight: bold;');
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
  // Expose state globally for browser console debugging
  /** @type {any} */(window).state = state;

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

  /**
   * Prepare an endgame state where all 15 checkers for both players 
   * are positioned within their respective home boards ready to bear off.
   */
  /** @type {any} */ (window).debugSetupEndgame = function() {
    // Clear all 24 points on the board
    for (let i = 0; i < 24; i++) {
      state.boardState[i] = { player: null, count: 0 };
    }

    // Clear bar and borne-off counts
    state.bar.white = 0;
    state.bar.black = 0;
    state.borneOff.white = 0;
    state.borneOff.black = 0;

    // Set White in Home Board (Points 0-5) -> 15 checkers total
    // E.g., distributed evenly: 3 checkers on points 0 through 4
    state.boardState[0] = { player: 'black', count: 3 };
    state.boardState[1] = { player: 'black', count: 3 };
    state.boardState[2] = { player: 'black', count: 3 };
    state.boardState[3] = { player: 'black', count: 3 };
    state.boardState[4] = { player: 'black', count: 3 };

    // Set Black in Home Board (Points 18-23) -> 15 checkers total
    // E.g., distributed evenly: 3 checkers on points 19 through 23
    state.boardState[19] = { player: 'white', count: 3 };
    state.boardState[20] = { player: 'white', count: 3 };
    state.boardState[21] = { player: 'white', count: 3 };
    state.boardState[22] = { player: 'white', count: 3 };
    state.boardState[23] = { player: 'white', count: 3 };

    // Configure active turn state
    state.gamePhase = 'turns';
    state.currentPlayer = 'black';
    state.hasRolled = true;
    state.currentRoll = [6, 4];    
    state.selectedPoint = null;
    state.validMoves = [];

    // Refresh the board display & UI
    if (typeof updatePointLabels === 'function') updatePointLabels(state.currentPlayer);
    if (typeof renderBoard === 'function') renderBoard();
    if (typeof renderDiceUI === 'function') renderDiceUI();

    console.log(
      '%c[DEBUG] Endgame set: Both players in home board ready to bear off!',
      'color: #4caf50; font-weight: bold;'
    );
  };
}
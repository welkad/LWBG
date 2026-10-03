// js/keyboard.js - Global keyboard shortcuts for game actions.
import { renderDiceUI } from './dice-renderer.js';
import { handlePostGameDieClick } from './dice.js';
import { clearStatusQueue, logStatus, restorePreviousStatus, saveCurrentStatus } from './ui.js';
import { handleResignation, state, switchTurn } from './state.js';
import { handleCubeClick, resolveCubeOffer, updateCubePositionUI } from './doubling-cube.js';
import { handleDiceRoll, toggleDiceOrder } from './dice-rolling.js';
import { undoLastMove } from './moves.js';
import { clearHoverHighlights, renderBoard } from './board.js';

/** 
 * - Space / R : Roll dice
 * - Space / S : Swap dice order
 * - C         : Offer doubling cube
 * - U         : Undo last move
 * - Space / D : Complete turn
 * - Q         : Prompt resignation
 * - H         : Toggle move highlighting on or off
 * - Y / N     : Confirm / cancel active prompt (Resign or Doubling Cube)
 */

export function setupKeyboardListeners() {
  document.addEventListener('keydown', (event) => {
    const activeEl = document.activeElement;
    if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)
      || state.isInputLocked) {
      return;
    }

    const key = event.code;

    // Check active prompt conditions
    const isPlayAgainActive = state.gamePhase === 'game_over';
    const isResignActive = state.isResignOffered;
    const isCubeActive = state.isCubeOffered;
    const isChoiceActive = isPlayAgainActive || isResignActive || isCubeActive;

    if (isChoiceActive) {
      if (key === 'KeyY' || key === 'KeyN') {
        event.preventDefault();
        const choice = key === 'KeyY' ? 'yes' : 'no';

        // Play again prompt (end of game)
        if (isPlayAgainActive) {
          // Ignore any key press during intial post-game delay
          if (state.awaitingPlayAgainPrompt) return;

          // Delegate directly to dice.js post-game handler
          handlePostGameDieClick(null, choice, null);         
          return;
        }

        // Resignation prompt
        if (isResignActive) {
          if (choice == 'yes') {
            handleResignation(state.resignOfferedBy);
            renderDiceUI();
          } else {
            const player = state.resignOfferedBy;
            state.isResignOffered = false;
            state.resignOfferedBy = null;
            clearStatusQueue();

            // Restore prompt based on previous message
            restorePreviousStatus();

            updateCubePositionUI();
            renderDiceUI();
          }
          return;
        }

        // Doubling cube prompt
        if (isCubeActive) {
          const targetValue = state.cubeValue === 1 ? 2 : state.cubeValue * 2;
          resolveCubeOffer(choice === 'yes', targetValue);
          return;
        }
      }
    }

    switch (key) {
      // SPACEBAR: Roll, Swap Dice or Complete turn
      case 'Space':      
        event.preventDefault();
        if (state.gamePhase === 'opening_roll') {
          // Identify who needs to roll
          if (!state.openingRolls?.black) {
            handleDiceRoll('black');
          } else if (!state.openingRolls?.white) {
            handleDiceRoll('white');
          }
        } else if (state.gamePhase === 'turns' && !state.hasRolled) {
          // Roll dice
          handleDiceRoll(state.currentPlayer);
        } else if (state.gamePhase === 'turns' && state.hasRolled) {
          if (state.currentRoll.length === 0) {
            // All dice played: switch turn (same as 'D')
            switchTurn();
          } else {
            // Unplayed dice remain: swap dice order (same as 'S')
            toggleDiceOrder(state.currentPlayer); 
          }
        }
        break;
      // KEY R: Roll or Swap Dice
      case 'KeyR':
        event.preventDefault();
        if (state.gamePhase === 'opening_roll') {
          // Identify who needs to roll
          if (!state.openingRolls?.black) {
            handleDiceRoll('black');
          } else if (!state.openingRolls?.white) {
            handleDiceRoll('white');
          }
        } else if (state.gamePhase === 'turns' && !state.hasRolled) {
          // Roll dice
          handleDiceRoll(state.currentPlayer);
        } else if (state.gamePhase === 'turns' && state.hasRolled) {  
          // Unplayed dice remain: swap dice order (same as 'S')
          toggleDiceOrder(state.currentPlayer);           
        }
        break;

      // SWAP DICE
      case 'KeyS':
        event.preventDefault();
        toggleDiceOrder(state.currentPlayer);
        break;

      // OFFER CUBE
      case 'KeyC':
        event.preventDefault();
        if (!state.hasRolled && !state.isCubeOffered && state.gamePhase !== 'game_over') {
          handleCubeClick(state.currentPlayer);
        }
        break;

      // UNDO LAST MOVE
      case 'KeyU':
        event.preventDefault();
        if (state.gamePhase !== 'game_over') {
          undoLastMove();
          renderDiceUI();          
        }
        break;

      // DONE MOVING
      case 'KeyD':
        event.preventDefault();
        if (state.gamePhase !== 'game_over' 
          && state.hasRolled && state.currentRoll.length === 0) {
            switchTurn();
        }
        break;

      // RESIGN or QUIT
      case 'KeyQ':
        event.preventDefault();
        // Prevent resignation during active roll animations or pending prompts
        if (
          state.gamePhase === 'turns' &&
          !state.isRolling &&
          !state.isResignOffered &&
          !state.isCubeOffered
        ) {
          saveCurrentStatus();  // Store current prompt if needed again later
          state.isResignOffered = true;
          state.resignOfferedBy = state.currentPlayer;
          clearStatusQueue();
          logStatus("Are you sure you want to resign?");
          renderDiceUI();
        }
        break;

      // HIGHLIGHT TOGGLE
      case 'KeyH':
        event.preventDefault();
        state.showHoverHighlights = !state.showHoverHighlights;

        // Toggle the CSS class on the board container
        const boardEl = document.querySelector('.master-board');
        if (boardEl) {
          boardEl.classList.toggle('show-highlights', state.showHoverHighlights);
        }

        const highlightStatus = state.showHoverHighlights ? "enabled" : "disabled";
        logStatus(`Hover highlights ${highlightStatus}. Press 'H' to toggle.`, 2000);
        
        // Clear or refresh active hover effects immediately
        if(!state.showHoverHighlights && typeof clearHoverHighlights === 'function') {
          clearHoverHighlights();
        }

        // Re-render board to update active target points
        if (typeof renderBoard === 'function') {
          renderBoard();
        }
        break;

      default:
        break;
    }
  });
}
// js/keyboard.js - Global keyboard shortcuts for game actions.
import { handleResignation, initBoardState, state, switchTurn } from './state.js';
import { renderDiceUI } from './dice-renderer.js';
import { clearStatusQueue, logStatus } from './ui.js';
import { handleCubeClick, resolveCubeOffer, updateCubePositionUI } from './doubling-cube.js';
import { handleDiceRoll, toggleDiceOrder } from './dice-rolling.js';
import { undoLastMove } from './moves.js';
import { renderBoard } from './board.js';
/** 
 * - Space / R : Roll dice
 * - S         : Swap dice order
 * - C         : Offer doubling cube
 * - U         : Undo last move
 * - D         : Complete turn
 * - Q         : Prompt resignation
 * - Y / N     : Confirm / cancel active prompt (Resign or Doubling Cube)
 */

export function setupKeyboardListeners() {
  document.addEventListener('keydown', (event) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
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
          if (choice === 'yes') {
            // Restart game / reset board state
            initBoardState();
            renderBoard();
            renderDiceUI();
            updateTurnUI();
            logStatus("New game started! Highest roll moves first.")
          } else {
            // User declined to play again
            logStatus("Game ended. Thanks for playing!")
            renderDiceUI(); // Hide Y/N dice buttons
          }
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
            logStatus(`${player}'s turn. Cube, roll or resign.`);
            updateCubePositionUI();
            renderDiceUI();
          }
          return;
        }

        // Doubling cube prompt
        if (isCubeActive) {
          const targetValue = state.cubeValue * 2;
          resolveCubeOffer(choice === 'yes', targetValue);
          return;
        }
      }
    }

    switch (key) {
      // ROLL
      case 'Space':
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
          // Regular turn roll
          handleDiceRoll(state.currentPlayer);
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
        if (!state.hasRolled && !state.isResignOffered && state.gamePhase !== 'game_over') {
          state.isResignOffered = true;
          state.resignOfferedBy = state.currentPlayer;
          clearStatusQueue();
          logStatus("Are you sure you want to resign?");
          renderDiceUI();
        }
        break;

      default:
        break;
    }
  });
}
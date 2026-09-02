// ==========================================
// GAME STATE MANAGEMENT
// ==========================================
// js/state.js - Centralizes all global mutable game state in one place so modules can import and modify it predictably.

import { updateTurnUI, refreshDiceForNewTurn } from './dice.js';
import { renderBoard, updatePointLabels, updateScoreBoardUI } from './board.js';
import { updateCubePositionUI } from './doubling-cube.js';
import { logStatus, clearStatusQueue, updateLegendUI } from './ui.js';
import { renderDiceUI } from './dice-renderer.js';

export const state = {
    boardState: Array(24).fill(null).map(() => ({ player: null, count: 0 })),
    bar: { white: 0, black: 0 },                    // Checkers waiting on the bar
    borneOff: { white: 0, black: 0 },               // Checkers safely borne off
    scores: { white: 0, black: 0 },                 // How many games won
    selectedPoint: null,                            // Point index (0-23) or 'bar'
    validMoves: [],                                 // Target indices (0-23 or 'off') for selected pieces
    moveHistory:[],                                 // Holds snapshots of boardState, bar, and currentRoll

    cubeValue: 1,                                   // Default starting multiplier
    cubeOwner: 'center',                            // 'center', 'white', of 'black'
    isCubeOffered: false,                           // True when decision is pending
    cubeOfferedBy: null,                            // Cube offered by 'black' or 'white'
    gamePhase:  'opening_roll',                     // 'opening_roll', 'turns', or 'game_over'
    losingPlayer: null,                             // Tracks who lost for post game Y/N prompt
    currentPlayer: null,                            // Set dynamically by opening roll
    isResignOffered: false,                         // Resignation state
    resignOfferedBy: null,                          // Resigning player
    playAgainChoices: { black: null, white: null }, // Track Y/N decision for each player
    awaitingPlayAgainPrompt: false,                 // Delay displaying play again prompt

    openingRolls: { white: null, black: null },
    currentRoll: [],                                // e.g., [5, 3] or [4, 4, 4, 4]
    isDouble: false,                                // Track if current turn started with double dice
    activeRoller: null,
    isRolling: false,
    hasRolled: false,
};

export function initBoardState() {
    state.boardState = Array(24).fill(null).map(() => ({ player: null, count: 0 }));    
    updatePointLabels(null);
    updateCubePositionUI();

    // Reset board states
    state.bar = { white: 0, black: 0 };
    state.borneOff = { white: 0, black: 0 };
    state.selectedPoint = null;
    state.validMoves = [];
    state.moveHistory = [];

    // Reset opening roll state
    state.gamePhase = 'opening_roll';
    state.currentPlayer = null;
    state.losingPlayer = null;
    state.openingRolls = { white: null, black: null };
    state.isRolling = false;
    state.hasRolled = false;
    state.isDouble = false;

    // Reset doubling cube and resignation state
    state.cubeValue = 1;
    state.cubeOwner = 'center';
    state.isCubeOffered = false;
    state.cubeOfferedBy = null;
    state.isResignOffered = false;
    state.resignOfferedBy = null;
    state.playAgainChoices = { black: null, white: null };
    state.awaitingPlayAgainPrompt = false;

    // Official Standard Backgammon Starting Setup
    state.boardState[0]  = { player: 'white', count: 2 }; // Point 1
    state.boardState[5]  = { player: 'black', count: 5 }; // Point 6
    state.boardState[7]  = { player: 'black', count: 3 }; // Point 8
    state.boardState[11] = { player: 'white', count: 5 }; // Point 12
    state.boardState[12] = { player: 'black', count: 5 }; // Point 13
    state.boardState[16] = { player: 'white', count: 3 }; // Point 17
    state.boardState[18] = { player: 'white', count: 5 }; // Point 19
    state.boardState[23] = { player: 'black', count: 2 }; // Point 24
}

// Call handleGameEnd function if player resigns
export function handleResignation(resigningPlayer) {
  const winner = resigningPlayer === 'black' ? 'white' : 'black';
  handleGameEnd(winner, resigningPlayer);
}

// Reset board for new game but preserve match scores
export function resetGame() {
  clearStatusQueue();
  initBoardState();     // Restore board, bar, cube and opening roll state

  // Refresh UI for opening roll phase
  renderBoard();
  updateScoreBoardUI(); // Display current score and reset pip counts
  updateTurnUI();       // Display both dice zones
  renderDiceUI();       // Render opening 'R' die for both players
  updateLegendUI();     // Update legend back to standard controls  

  logStatus("New game started! Highest roll plays first.");  
}

// Reset hasRolled on Turn Change
export function switchTurn() {
    if (state.gamePhase === 'game_over') return;

    // Toggle active player
    state.currentPlayer = state.currentPlayer === 'black' ? 'white' : 'black';
    updatePointLabels(state.currentPlayer);

    // Reset turn flags so new active player can double BEFORE rolling
    state.hasRolled = false;    // Keep track for doubling situations
    state.currentRoll = [];
    state.selectedPoint = null;
    state.validMoves = [];
    state.isDouble = false;
    state.isCubeOffered = false;
    state.cubeOfferedBy = null;
    state.isResignOffered = false;
    state.resignOfferedBy = null;

    logStatus(`Turn switched. It is now ${state.currentPlayer}'s turn.`);

    // Clear dice DOM elements, update status, and re-render board
    updateCubePositionUI(); // Refresh cube UI based on currentPlayer & ownership    
    updateTurnUI();
    refreshDiceForNewTurn();
    updateLegendUI();
    renderBoard();
}

/**
 *  Calculate the total PIP count for a given player.
 *  White moves from index 0 -> 23 (bears off past 23).
 *  Black moves from index 23 -> 0 (bears off past 0).
 */
export function calculatePipCount(player) {
    let pips = 0;
    // Checkers on the board
    state.boardState.forEach((point, index) => {
        if (point.player === player && point.count > 0) {
            // Distance to bear off:
            // White point 0 needs 24 pips to bear off, point 23 needs 1 pip.
            // Black point 23 needs 24 pips to bear off, point 0 needs 1 pip.
            const distance = player === 'white' ? (24 - index) : (index + 1);
            pips += distance * point.count;
        }
    });
    // Checkers on the bar (max distance = 25 pips)
    if (state.bar[player] > 0) {
        pips += state.bar[player] * 25;
    }
    return pips;
}

/**
 * Handle end-of-game state when bearing off all checkers or resigning game.
 * @param {'black'|'white'} winner - The winning player.
 * @param {'black'|'white'|null} [resigningPlayer = null] - The resigning player.
 */
export function handleGameEnd(winner, resigningPlayer = null) {
  // Calculate points won (defaults to cube value <- expand for Gammon/Backgammon)
  const pointsWon = state.cubeValue;
  state.scores[winner] += pointsWon;

  // Lock game state and reset flags
  state.gamePhase = 'game_over';
  state.losingPlayer = resigningPlayer || (winner === 'black' ? 'white' : 'black');
  state.isResignOffered = false;
  state.resignOfferedBy = null;
  state.hasRolled = false;
  state.awaitingPlayAgainPrompt = true; // Temporary flag to delay Y/N display

  clearStatusQueue(); // Clear any pending messages

  // Craft victory status message
  const cube = state.cubeValue;
  const message = cube > 1 ? `${cube} points` : 'the game';
  let winMessage = '';
  if (resigningPlayer) {
    winMessage = `${resigningPlayer} resigned. ${winner} wins ${message}!`;
  } else {
    winMessage = `${winner} bore off all checkers and wins ${message}!`;
  }

  logStatus(winMessage, 2000);  // log initial victory message

  // Update UI components
  renderBoard();            // Ensure entire DOM enters game_over state
  updatePointLabels(null);  // Remove point numbers from the board
  updateScoreBoardUI();     // Update score displayed on the page
  updateCubePositionUI();   // Visually disable doubling cube
  renderDiceUI();           // Trigger renderChoiceDice

  // 2 second delay before prompting to play again
  setTimeout(() => {
    if (state.playAgainChoices.black === 'no' || state.playAgainChoices.white === 'no') {
      return;  // Do not display play again prompt if either player declined.
    }

    state.awaitingPlayAgainPrompt = false;  // Allow Y/N choice dice to render
    clearStatusQueue();
    logStatus(
      "The score is now Black: " + state.scores.black +
      " and White: " + state.scores.white + ". Play again?"
    );
    renderDiceUI(); // Display Y/N dice and update legend
  }, 2000);  
}
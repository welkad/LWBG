// ==========================================
// GAME STATE MANAGEMENT
// ==========================================
// js/state.js - Centralizes all global mutable game state in one place so modules can import and modify it predictably.

import { updateTurnUI, refreshDiceForNewTurn } from './dice.js';
import { renderBoard, updatePointLabels, updateScoreBoardUI } from './board.js';
import { updateCubePositionUI } from './doubling-cube.js';
import { logStatus, clearStatusQueue } from './ui.js';

export const state = {
    boardState: Array(24).fill(null).map(() => ({ player: null, count: 0 })),
    bar: { white: 0, black: 0 },                // Checkers waiting on the bar
    borneOff: { white: 0, black: 0 },           // Checkers safely borne off
    scores: { white: 0, black: 0 },             // How many games won
    selectedPoint: null,                        // Point index (0-23) or 'bar'
    validMoves: [],                             // Target indices (0-23 or 'off') for selected pieces
    moveHistory:[],                             // Holds snapshots of boardState, bar, and currentRoll

    cubeValue: 1,                               // Default starting multiplier
    cubeOwner: 'center',                        // 'center', 'white', of 'black'
    isCubeOffered: false,                       // True when decision is pending
    cubeOfferedBy: null,                        // Cube offered by 'black' or 'white'
    gamePhase:  'opening_roll',                 // 'opening_roll', 'turns', or 'game_over'
    currentPlayer: null,                        // Set dynamically by opening roll
    isResignOffered: false,                     // Resignation state
    resignOfferedBy: null,                      // Resigning player

    openingRolls: { white: null, black: null },
    currentRoll: [],                            // e.g., [5, 3] or [4, 4, 4, 4]
    isDouble: false,                            // Track if current turn started with double dice
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

// Game victory by resignation
export function handleResignation(resigningPlayer) {
  const winner = resigningPlayer === 'black' ? 'white' : 'black';

  // Points won equal current doubling cube value
  state.scores[winner] += state.cubeValue;

  // Lock down phase and reset flags
  state.gamePhase = 'game_over';
  state.isResignOffered = false;
  state.resignOfferedBy = null;
  state.hasRolled = false;

  // Update DOM display elements
  updatePointLabels(null);  // Remove point numbers from the board
  updateScoreBoardUI();     // Update score displayed on the page
  // calculatePipCount();      // Reset the pip count
  
  clearStatusQueue();  
  const cube = state.cubeValue;
  const message = cube > 1 ? `${cube} points` : 'the game';
  logStatus(`${resigningPlayer} resigned. ${winner} wins ${message}!`);
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
    renderBoard();
}

/**
 *  Calculate the total PIP count for a given player.
 *  White moves from index 0 -> 23 (bears off past 23).
 *  Black moves from index 23 -> 0 (bears off past 0).
 */
export function calculatePipCount(player) {
    if (state.gamePhase === 'game_over') {
      return 167; // Reset pip count when game ends
    }

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
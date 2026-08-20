// ==========================================
// GAME STATE MANAGEMENT
// ==========================================
// js/state.js - Centralizes all global mutable game state in one place so modules can import and modify it predictably.

import { updateTurnUI, resetDiceUI } from "./dice.js";
import { renderBoard, updatePointLabels } from './board.js';
import { logStatus } from './ui.js';

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
    gamePhase:  'opening_roll',                 // 'opening_roll' or 'turns'
    currentPlayer: null,                        // Set dynamically by opening roll
    openingRolls: { white: null, black: null },
    currentRoll: [],                            // e.g., [5, 3] or [4, 4, 4, 4]
    activeRoller: null,
    isRolling: false,
    hasRolled: false,
};

export function initBoardState() {
    state.boardState = Array(24).fill(null).map(() => ({ player: null, count: 0 }));
    updatePointLabels(null);

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

// Reset hasRolled on Turn Change
export function switchTurn() {
    // Toggle active player
    state.currentPlayer = state.currentPlayer === 'white' ? 'black' : 'white';
    updatePointLabels(state.currentPlayer);

    // Reset turn flags so new active player can double BEFORE rolling
    state.hasRolled = false;    // Keep track for doubling situations
    state.currentRoll = [];
    state.selectedPoint = null;
    state.validMoves = [];

    logStatus(`Turn switched. It is now ${state.currentPlayer}'s turn.`);

    // Clear dice DOM elements, update status, and re-render board
    resetDiceUI();
    updateTurnUI();
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
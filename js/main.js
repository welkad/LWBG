// js/main.js - The application entry point. Imports functions, sets up event listeners on DOM elements, and triggers initial renders.
import { initBoardState } from './state.js';
import { renderBoard } from './board.js';
import { updateTurnUI, initDiceListeners } from './dice.js';
import { setupKeyboardListeners } from './keyboard.js';
import { renderDiceUI } from './dice-renderer.js';
import { logStatus } from './ui.js';

// test-moves.js
// import { runMoveTests } from './test-moves.js';
// window.runMoveTests = runMoveTests;

function initApp() {
    // Initialize data
    initBoardState();

    // Log game instructions at start
    const statusBar = document.getElementById('game-status-bar');
    if (statusBar && statusBar.textContent.trim()) {
        logStatus(statusBar.textContent.trim());
    }

    // Initial UI render
    renderBoard();
    renderDiceUI();
    updateTurnUI();

    // Attach click handlers and keyboard listeners
     initDiceListeners();
     setupKeyboardListeners();
}

// Run setup after DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
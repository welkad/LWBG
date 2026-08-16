// js/board.js - Handles DOM creation for points and rendering checkers onto the board layout.
import { state, calculatePipCount } from './state.js';
import { handlePointClick} from './moves.js';

export function renderBoard() {
    const topLeft = document.getElementById('top-left');
    const topRight = document.getElementById('top-right');
    const bottomLeft = document.getElementById('bottom-left');
    const bottomRight = document.getElementById('bottom-right');
    
    topLeft.innerHTML = ''; 
    topRight.innerHTML = '';
    bottomLeft.innerHTML = ''; 
    bottomRight.innerHTML = '';

    // Top Left: Points 12 to 17
    for (let i = 12; i <= 17; i++) topLeft.appendChild(createPointDOM(i));    
    // Top Right: Points 18 to 23
    for (let i = 18; i <= 23; i++) topRight.appendChild(createPointDOM(i));    
    // Bottom Left: Points 11 down to 6
    for (let i = 11; i >= 6; i--) bottomLeft.appendChild(createPointDOM(i));    
    // Bottom Right: Points 5 down to 0
    for (let i = 5; i >= 0; i--) bottomRight.appendChild(createPointDOM(i));

    // Render bar sections
    renderBar('white');
    renderBar('black');

    // Update PIP count and Scors in the header
    updateScoreBoardUI();
}

// Refresh scoreboard elements in DOM when invoking renderBoard()
function updateScoreBoardUI() {
    const blackPipEl = document.getElementById('pip-black');
    const whitePipEl = document.getElementById('pip-white');
    const blackScoreEl = document.getElementById('score-black');
    const whiteScoreEl = document.getElementById('score-white');

    if (blackPipEl) blackPipEl.textContent = calculatePipCount('black');
    if (whitePipEl) whitePipEl.textContent = calculatePipCount('white');
    if (blackScoreEl) blackScoreEl.textContent = state.scores.black;
    if (whiteScoreEl) whiteScoreEl.textContent = state.scores.white;
}

// Update point and checker listeners
function createPointDOM(index) {
    const pointEl = document.createElement('div');

    // Global index 0, 2, 4... -> even | 1, 3, 5... -> odd
    const pointColorClass = (index % 2 === 0) ? 'point-even' : 'point-odd';
    pointEl.className = `point ${pointColorClass}`; // Board triangle color class
    pointEl.dataset.index = index;

    // Apply selection and valid move target highlights
    if (state.selectedPoint === index) {
        pointEl.classList.add('selected');
    }
    if (state.validMoves && state.validMoves.includes(index)) {
        pointEl.classList.add('valid-target');
    }

    const pointData = state.boardState[index];
    if (pointData && pointData.count > 0) {
        // Checker piece color class
        const pieceColorClass = pointData.player === 'white' ? 'white-piece' : 'black-piece';
        
        let piecesHTML = '';
        for (let i = 0; i < pointData.count; i++) {
            piecesHTML += `<div class="checker ${pieceColorClass}"></div>`;
        }
        pointEl.innerHTML = piecesHTML;
    }

    // Direct event listener invoking move handling logic
    pointEl.addEventListener('click', () => handlePointClick(index));
    return pointEl;
}

// Show checkers on the BAR point
function renderBar(player) {
    const barEl = document.getElementById(`bar-${player}`);
    if (!barEl) return;

    barEl.innerHTML = '';

    // Highlight bar if selected
    if (state.selectedPoint === 'bar' && state.currentPlayer === player) {
        barEl.classList.add('selected');
    } else {
        barEl.classList.remove('selected');
    }

    const count = state.bar[player] || 0;
    const colorClass = player === 'white' ? 'white-piece' : 'black-piece';

    for (let i = 0; i < count; i++) {
        const checker = document.createElement('div');
        checker.className = `checker ${colorClass}`;
        barEl.appendChild(checker);
    }

    // Allow clicking the active player's bar section
    barEl.onclick = () => {
        if (state.currentPlayer === player && state.bar[player] > 0) {
            handlePointClick('bar');
        }
    };
}
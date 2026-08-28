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

    // Update PIP count and Scores in the header
    updateScoreBoardUI();
}

// Refresh scoreboard elements in DOM when invoking renderBoard()
export function updateScoreBoardUI() {
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

    // Adjust Z-Index so point stacks overflow on top of adjacent triangles
    // Top row (12-23) & bottom row (11-0) layering order
    pointEl.style.zIndex = index >= 12 ? (30 - index) : (index + 10);

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
        const isTopRow = index >= 12; // Top points: 12-23, Bottom points: 0-11
        
        for (let i = 0; i < pointData.count; i++) {
          const checkerEl = document.createElement('div');
          checkerEl.className = `checker ${pieceColorClass}`;

          // Mini-column overflow logic (up to 5 checkers per column)
          if (i >= 5) {
            const colIndex = Math.floor(i / 5); // Col 1 for pieces 5-9, Col 2 for pieces 10-14
            const rowIndex = i % 5;             // Row height position (0 to 4) inside new column

            // Horizontal shift: 12px right per extra column (tune as needed)
            const offsetX = colIndex * 6;

            // Staggered vertical base offset + standard spacing
            const colStaggerY = colIndex * 10;  // up/down PX per column
            const rowSpacingY = rowIndex * 36;   // overlap per checker
            const totalOffsetY = colStaggerY + rowSpacingY;

            checkerEl.classList.add('stacked');
            checkerEl.style.transform = `translateX(calc(-50% + ${offsetX}px))`;

            if (isTopRow) {
              // Top triangles: Shift down away from top board frame
              checkerEl.style.top = `${totalOffsetY}px`;
            } else {
              // Bottom triangles: Shift up away from bottom board frame
              checkerEl.style.bottom = `${totalOffsetY}px`;
            }
            // Keep layered  checkers above the base stack
            checkerEl.style.zIndex = 10 + i;
          }
          pointEl.appendChild(checkerEl);
        }
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

/**
 * Updates or clears the border point numbers depending on game state and current player.
 * @param {string|null} currentPlayer - 'black', 'white', or null/undefined for opening roll.
 */
export function updatePointLabels(currentPlayer) {
    const topLeft = document.querySelector('.top-left-numbers');
    const topRight = document.querySelector('.top-right-numbers');
    const bottomLeft = document.querySelector('.bottom-left-numbers');
    const bottomRight = document.querySelector('.bottom-right-numbers');

    // Clear numbers if opening roll (no turn assigned yet)
    if (!currentPlayer || state.gamePhase === 'game_over') {
        topLeft.innerHTML = '';
        topRight.innerHTML = '';
        bottomLeft.innerHTML = '';
        bottomRight.innerHTML = '';
        return;
    }

    // Helper to build span HTML array
    const createSpans = (arr) => arr.map(n => `<span>${n}</span>`).join('');

    if (currentPlayer === 'black') {  // Counter-clockwise
        // Black moves top-right (19-24) -> top-left (13-18) 
        topRight.innerHTML = createSpans([19, 20, 21, 22, 23, 24]);
        topLeft.innerHTML = createSpans([13, 14, 15, 16, 17, 18]);
        // Black moves bottom-left (12-7) -> bottom-right (6-1)
        bottomLeft.innerHTML = createSpans([12, 12, 10, 9, 8, 7]);
        bottomRight.innerHTML = createSpans([6, 5, 4, 3, 2, 1]);
    } else if (currentPlayer === 'white') {  // Clockwise
        // White moves bottom-right (19-24) -> bottom-left (13-18)
        bottomRight.innerHTML = createSpans([19, 20, 21, 22, 23, 24]);
        bottomLeft.innerHTML = createSpans([13, 14, 15, 16, 17, 18]);
        // White moves top-left (12-7) -> top-right (6-1)
        topLeft.innerHTML = createSpans([12, 12, 10, 9, 8, 7]);
        topRight.innerHTML = createSpans([6, 5, 4, 3, 2, 1]);
    }
}
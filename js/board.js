// js/board.js - Handles DOM creation for points and rendering checkers onto the board layout.
import { state, calculatePipCount } from './state.js';
import { handlePointClick} from './moves.js';
import { getValidMovesForPoint } from './rules.js';

export function renderBoard() {
  const topLeft = document.getElementById('top-left');
  const topRight = document.getElementById('top-right');
  const bottomLeft = document.getElementById('bottom-left');
  const bottomRight = document.getElementById('bottom-right');
  
  topLeft && (topLeft.innerHTML = ''); 
  topRight && (topRight.innerHTML = '');
  bottomLeft && (bottomLeft.innerHTML = '');
  bottomRight && (bottomRight.innerHTML = '');

  // Top Left: Points 12 to 17
  for (let i = 12; i <= 17; i++) topLeft?.appendChild(createPointDOM(i));    
  // Top Right: Points 18 to 23
  for (let i = 18; i <= 23; i++) topRight?.appendChild(createPointDOM(i));    
  // Bottom Left: Points 11 down to 6
  for (let i = 11; i >= 6; i--) bottomLeft?.appendChild(createPointDOM(i));    
  // Bottom Right: Points 5 down to 0
  for (let i = 5; i >= 0; i--) bottomRight?.appendChild(createPointDOM(i));

  // Render bar sections
  renderBar();

  // Render home/bear-off tray sections
  renderBearOff('black');
  renderBearOff('white');

  // Update PIP count and Scores in the header
  updateScoreBoardUI();
}

// Refresh scoreboard elements in DOM when invoking renderBoard()
export function updateScoreBoardUI() {
  const blackPipEl = document.getElementById('pip-black');
  const whitePipEl = document.getElementById('pip-white');
  const blackScoreEl = document.getElementById('score-black');
  const whiteScoreEl = document.getElementById('score-white');

  if (blackPipEl) blackPipEl.textContent = `${calculatePipCount('black')}`;
  if (whitePipEl) whitePipEl.textContent = `${calculatePipCount('white')}`;
  if (blackScoreEl) blackScoreEl.textContent = `${state.scores.black}`;
  if (whiteScoreEl) whiteScoreEl.textContent = `${state.scores.white}`;
}

// Update point and checker listeners
/**
 * @param {number} index
 */
function createPointDOM(index) {
  const pointEl = document.createElement('div');

  // Global index 0, 2, 4... -> even | 1, 3, 5... -> odd
  const pointColorClass = (index % 2 === 0) ? 'point-even' : 'point-odd';
  pointEl.className = `point ${pointColorClass}`; // Board triangle color class
  pointEl.dataset.point = String(index);
  pointEl.dataset.index = String(index);

  // Adjust Z-Index so point stacks overflow on top of adjacent triangles
  // Top row (12-23) & bottom row (11-0) layering order
  pointEl.style.zIndex = String(index >= 12 ? (30 - index) : (index + 10));

  const pointData = state.boardState[index];
  const isOwner = pointData && pointData.player === state.currentPlayer && pointData.count > 0;
  const isValidTarget = state.validMoves && state.validMoves.includes(index);

  // Only allow clickable cursor during turns, after rolling, and on valid pieces/targets
  const isCickable = state.gamePhase === 'turns' && 
                      state.hasRolled &&
                      (isOwner || isValidTarget);

  if (isCickable) {
    pointEl.classList.add('clickable');
  }

  // Apply selection and valid move target highlights
  if (state.selectedPoint === index) {
    pointEl.classList.add('selected');
  }
  if (state.validMoves && state.validMoves.includes(index)) {
    pointEl.classList.add('valid-target');
  }
  
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
        checkerEl.style.zIndex = String(10 + i);
      }
      pointEl.appendChild(checkerEl);
    }
  }
  // Direct event listener invoking move handling logic
  pointEl.addEventListener('click', () => handlePointClick(index));
  attachPointHoverListeners(pointEl, index);
  return pointEl;
}

/**
 *  Shared renderer for vertical trays (bar & bear-off pockets) 
 */
/**
 * @param {HTMLElement | null} containerEl
 * @param {number} count
 * @param {string} colorClass
 * @param {boolean} isTop
 */
function renderTrayCheckers(containerEl, count, colorClass, isTop) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const checker = document.createElement('div');
    checker.className = `checker ${colorClass}`;

    // Apply stacking/staggering logic once for both Bar & Home Pockets
    if (i >= 5) {
      const colIndex = Math.floor(i / 5);
      const rowIndex = i % 5;

      const offsetX = colIndex * 4;       // Slight horizontal offset
      const colStaggerY = colIndex * 8;   // Vertical shift per column
      const rowSpacingY = rowIndex * 32;  // Overlap spacing
      const totalOffsetY = colStaggerY + rowSpacingY;

      checker.classList.add('stacked');
      checker.style.transform = `translateX(calc(-50% + ${offsetX}px))`;

      if (isTop) {
        checker.style.top = `${totalOffsetY}px`;
      } else {
        checker.style.bottom = `${totalOffsetY}px`;
      }
      checker.style.zIndex = String(10 + i);
    }
    containerEl.appendChild(checker);
  }
}

// Show checkers on the BAR point
export function renderBar() {
  const blackBarEl = document.getElementById('bar-black');
  const whiteBarEl = document.getElementById('bar-white');
  const blackCount = state.bar.black || 0;
  const whiteCount = state.bar.white || 0;

  // Ensure data-point="bar" is set for event delegation
  if (blackBarEl) {
    blackBarEl.dataset.point = 'bar';
    attachPointHoverListeners(blackBarEl, 'bar');
  }
  if (whiteBarEl) {
    whiteBarEl.dataset.point = 'bar';
    attachPointHoverListeners(whiteBarEl, 'bar');
  }

  // Top tray for Black player, bottom tray for White player
  renderTrayCheckers(blackBarEl, blackCount|| 0, 'black-piece', true);
  renderTrayCheckers(whiteBarEl, whiteCount || 0, 'white-piece', false);

  // Attach interactivity states & click handlers for Bar pieces
  if (blackBarEl) {
    const isBlackActive = state.currentPlayer === 'black' && blackCount > 0;
    const isSelected = state.selectedPoint === 'bar' && state.currentPlayer === 'black';

    blackBarEl.classList.toggle('selected', isSelected);
    blackBarEl.classList.toggle('clickable', isBlackActive);
    blackBarEl.onclick = isBlackActive ? () => handlePointClick('bar') : null;
  }
  if (whiteBarEl) {
    const isWhiteActive = state.currentPlayer === 'white' && whiteCount > 0;
    const isSelected = state.selectedPoint === 'bar' && state.currentPlayer === 'white';

    whiteBarEl.classList.toggle('selected', isSelected);
    whiteBarEl.classList.toggle('clickable', isWhiteActive);
    whiteBarEl.onclick = isWhiteActive ? () => handlePointClick('bar') : null;
  }
}

// Show borne-off checkers and enable bear-off targets
/**
 * @param {Player} player
 */
export function renderBearOff(player) {
  const pocketId = player === 'black' ? 'home-bottom-pocket' : 'home-top-pocket';
  const bearOffEl = document.getElementById(pocketId);
  if (!bearOffEl) return;

  const count = state.borneOff[player] || 0;
  const colorClass = player === 'black' ? 'black-piece' : 'white-piece';
  const isTop = player === 'white';

  // Delegate rendering to shared function
  renderTrayCheckers(bearOffEl, count, colorClass, isTop);

  // Clean up any existing overlay element
  const existingOverlay = bearOffEl.querySelector('.bear-off-target-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Handle interactivity state for bearing off
  const isCurrentPlayer = state.currentPlayer === player;
  const isValidTarget = isCurrentPlayer &&
    state.validMoves && state.validMoves.includes('off');
  
  if (isValidTarget) {
    bearOffEl.classList.add('valid-target', 'clickable');

    // Inject dedicated target overlay element
    const overlay = document.createElement('div');
    overlay.className = 'bear-off-target-overlay';

    // Three height steps
    let overlayHeight = 160;
    if (count >= 11) {
      overlayHeight = 180;
    } else if (count >= 6) {
      overlayHeight = 170;
    }
    overlay.style.height = `${overlayHeight}px`;

    bearOffEl.appendChild(overlay);
  } else {
    bearOffEl.classList.remove('valid-target', 'clickable');
  }

  bearOffEl.onclick = () => {
    if (isCurrentPlayer && state.validMoves && state.validMoves.includes('off')) {
      handlePointClick('off');
    }
  };
}

/**
 * Update or clear the border point numbers depending on game state and current player.
 * @param {PlayerColor} currentPlayer - 'black', 'white', or null/undefined for opening roll.
 */
export function updatePointLabels(currentPlayer) {
    const topLeft = document.querySelector('.top-left-numbers');
    const topRight = document.querySelector('.top-right-numbers');
    const bottomLeft = document.querySelector('.bottom-left-numbers');
    const bottomRight = document.querySelector('.bottom-right-numbers');

    // Clear numbers if opening roll (no turn assigned yet)
    if (!currentPlayer || state.gamePhase === 'game_over') {
        topLeft && (topLeft.innerHTML = '');
        topRight && (topRight.innerHTML = '');
        bottomLeft && (bottomLeft.innerHTML = '');
        bottomRight && (bottomRight.innerHTML = '');
        return;
    }

    // Helper to build span HTML array
    /** @param {Array<number | string>} arr */
    const createSpans = (arr) => arr.map(n => `<span>${n}</span>`).join('');

    if (currentPlayer === 'black') {  // Counter-clockwise
        // Black moves top-right (19-24) -> top-left (13-18) 
        topRight && (topRight.innerHTML = createSpans([19, 20, 21, 22, 23, 24]));
        topLeft && (topLeft.innerHTML = createSpans([13, 14, 15, 16, 17, 18]));
        // Black moves bottom-left (12-7) -> bottom-right (6-1)
        bottomLeft && (bottomLeft.innerHTML = createSpans([12, 11, 10, 9, 8, 7]));
        bottomRight && (bottomRight.innerHTML = createSpans([6, 5, 4, 3, 2, 1]));
    } else if (currentPlayer === 'white') {  // Clockwise
        // White moves bottom-right (19-24) -> bottom-left (13-18)
        bottomRight && (bottomRight.innerHTML = createSpans([19, 20, 21, 22, 23, 24]));
        bottomLeft && (bottomLeft.innerHTML = createSpans([13, 14, 15, 16, 17, 18]));
        // White moves top-left (12-7) -> top-right (6-1)
        topLeft && (topLeft.innerHTML = createSpans([12, 11, 10, 9, 8, 7]));
        topRight && (topRight.innerHTML = createSpans([6, 5, 4, 3, 2, 1]));
    }
}

/** @type {ReturnType<typeof setTimeout> | null} */
let hoverTimer = null;
const DWELL_DELAY_MS = 600; // millisecond threshold for hover highlights

/**
 * Attach dwell-hover preview logic to point elements.
 *  @param {HTMLElement} pointEl
 *  @param {number | 'bar'} pointIndex
 */
export function attachPointHoverListeners(pointEl, pointIndex) {
  pointEl.addEventListener('mouseenter', () => {
    // Ensure player has rolled and still has remaining dice to play
    const hasRemainingRolls = state.hasRolled
      && Array.isArray(state.currentRoll) && state.currentRoll.length > 0;
    if (!hasRemainingRolls) return;

    // Check if point contains pieces owned by current player
    let isOwner = false;
    if (pointIndex === 'bar') {
      const barCount = state.currentPlayer === 'black'
        ? state.bar.black : state.bar.white;
      isOwner = barCount > 0;
    } else if (typeof pointIndex === 'number') {
      const pointData = state.boardState[pointIndex];
      isOwner = pointData && pointData.player === state.currentPlayer
        && pointData.count > 0;
    }

    if (!isOwner || !state.hasRolled) return;

    // Start threshold countdown
    hoverTimer = setTimeout(() => {
      // Calculate potential valid target points for this piece
      const rawTargets = getValidMovesForPoint(pointIndex);
      /** @type {Array<number|'off'>} */
      const targets = Array.isArray(rawTargets) ? rawTargets : [rawTargets];

      // Do not highlight origin in yellow if no valid targets available
      if (targets.length === 0) return;

      // Highlight origin point or bar half (yellow)
      pointEl.classList.add('hover-selected');

      // Higlight valid targets (green)
      targets.forEach((targetIndex) => {
        if (targetIndex === 'off') {
          const pocketId = state.currentPlayer === 'black'
            ? 'home-bottom-pocket' : 'home-top-pocket';
          const pocketEl = document.getElementById(pocketId);        
          if (pocketEl) {
            pocketEl.classList.add('hover-target');
            // Inject overlay container if missing
            if (!pocketEl.querySelector('.bear-off-target-overlay')) {
              const overlay = document.createElement('div');
              overlay.className = 'bear-off-target-overlay';
              pocketEl.appendChild(overlay);
            }
          }
        } else {
          // Query data-point attribute to match board HTML template
          const targetEl = document.querySelector(`[data-point="${targetIndex}"],
            [data-index="${targetIndex}"]`);
          targetEl?.classList.add('hover-target');
        }
      });
    }, DWELL_DELAY_MS);
  });

  pointEl.addEventListener('mouseleave', () => {
    // Cancel timer and remove highlight classes if mouse leaves early
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    clearHoverHighlights();
  });
}

export function clearHoverHighlights() {
  document.querySelectorAll('.hover-selected, .hover-target').forEach((el) => {
    el.classList.remove('hover-selected', 'hover-target');
  });
  // Clean up injected bear-off overlays
  document.querySelectorAll('.bear-off-target-overlay').forEach((el) => el.remove());
}
// js/moves.js
import { state, handleGameEnd } from './state.js';
import { renderBoard, updateScoreBoardUI } from './board.js';
import { renderDiceUI } from './dice-renderer.js';
import { logStatus } from './ui.js';

// Direction vectors
const DIRECTIONS = {
  white: 1, // Increasing index (0 to 23)
  black: -1 // Decreasing index (23 to 0)
};

/**
 * Checks if all checkers of a given player are in their home board or borne off.
 * Black home board: indices 0-5
 * White home board: indices 18-23
 */
export function canPlayerBearOff(player) {
  if (state.bar[player] > 0) return false;

  const outsideHomeRange = player === 'black'
    ? { start: 6, end: 23 }
    : { start: 0, end: 17 };

  for (let i = outsideHomeRange.start; i <= outsideHomeRange.end; i++) {
    if (state.boardState[i].player === player) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a specific point-index is open for the current player to land on.
 */
function isPointOpen(targetIndex, player) {
  if (targetIndex < 0 || targetIndex > 23) return false;

  const point = state.boardState[targetIndex];
  const isUnoccupied = point.player === null;
  const isSelf = point.player === player;
  const isBlot = point.player !== player && point.count === 1;

  return isUnoccupied || isSelf || isBlot;
}

/**
 * Calculates valid destinations for a selected point or bar piece.
 * @param {number|string} fromIndex - Index (0-23) or 'bar'
 * @returns {Array<number>} Array of valid target indices
 */
export function getValidMovesForPoint(fromIndex) {
  if (!state.hasRolled || state.currentRoll.length === 0) return [];

  const player = state.currentPlayer;
  const dir = DIRECTIONS[player];

  // Rule: Must enter from bar first if checkers are hit
  if (state.bar[player] > 0 && fromIndex !== 'bar') {
    return [];
  }

  const validTargets = new Set();
  const availableDice = [...state.currentRoll]; // Unique die values available
  const isBearOffEligible = canPlayerBearOff(player);  // Check if bear-off possible

  // Helper function to recursively traverse possible die paths
  function findPaths(currentIndex, remainingDice) {
    if (remainingDice.length === 0) return;

    // Use a Set of remaining dice values to avoid duplicate
    // branch evaluation (e.g. non-doubles permutations)
    const uniqueDice = [...new Set(remainingDice)];

    uniqueDice.forEach(dieValue => {
      let nextIndex;

      if (currentIndex === 'bar') {
        nextIndex = player === 'white' ? dieValue - 1 : 24 - dieValue;
      } else {
        nextIndex = currentIndex + (dieValue * dir);
      }

      // If the intermediate or final step is open, add it and explore other steps
      if (isPointOpen(nextIndex, player)) {
        validTargets.add(nextIndex);

        // Remove one instance of dieValue for subsequent step calculations
        const nextRemaining = [...remainingDice];
        nextRemaining.splice(nextRemaining.indexOf(dieValue), 1);

        // Bar pieces must move onto the board first before other steps
        if (nextRemaining.length > 0 && nextIndex >= 0 && nextIndex <= 23) {
          findPaths(nextIndex, nextRemaining);
        }
      }
      // Handle bear-off logic
      else if (isBearOffEligible && currentIndex !== 'bar') {
        const isExactBearOff = (player === 'black' && nextIndex === -1)
          || (player === 'white' && nextIndex === 24);
        const isOverShootBearOff = (player === 'black' && nextIndex < -1)
          || (player === 'white' && nextIndex > 24)

        if (isExactBearOff) {
          validTargets.add('off');
        } else if (isOverShootBearOff) {
          // Can only bear-off with higher die if no checkers exist on higher point
          const isHighestChecker = isCheckerOnHighestPoint(fromIndex, player);
          if (isHighestChecker) {
            validTargets.add('off');
          }
        }
      }
    });
  }
  findPaths(fromIndex, availableDice);
  return Array.from(validTargets);
}

/**
 * Helper: Check if on furthest active point in the home board.
 */
function isCheckerOnHighestPoint(fromIndex, player) {
  if (player === 'black') {
    for (let i = 23; i > fromIndex; i--) {
      if (state.boardState[i].player === 'black') {
        return false;
      }
    }
  } else {
    for (let i = 18; i < fromIndex; i++) {
      if (state.boardState[i].player === 'white') {
        return false;
      }
    }
  }
  return true;
}

/**
 * Find sequence of individual die values required based on toIndex and fromIndex.
 * @param {number|string} fromIndex - Starting position (0-23 or 'bar')
 * @param {number|string} toIndex - Ending destination (0-23 or 'off')
 * @param {Array<number>} availableDice - Active roll values remaining in state
 * @param {string} player - Current player ('black' | 'white')
 * @returns {Array<number>|null} Ordered array of dice used or null if invalid.
 */
function findDiceSequenceForMove(fromIndex, toIndex, availableDice, player) {
  const dir = DIRECTIONS[player];
  const isBearOffEligible = canPlayerBearOff(player);

  function search(currentIndex, remainingDice, path) {
    // Base condition: Check if current step matches the desired destination
    if (path.length > 0) {
      if (toIndex === 'off') {
        if (currentIndex < 0 || currentIndex > 23) return path;
      } else if (currentIndex === toIndex) {
        return path;
      }
    }

    if (remainingDice.length === 0) return null;

    // Evaluate unique dice values to avoid duplicate path checking
    const uniqueDice = [...new Set(remainingDice)];

    for (const dieValue of uniqueDice) {
      let nextIndex;

      // Calculat the intermediate point index after applying current dieValue
      if (currentIndex === 'bar') {
        nextIndex = player === 'white' ? dieValue - 1 : 24 - dieValue;
      } else {
        nextIndex = currentIndex + (dieValue * dir);
      }

      // Standard board move: Continue if intermediate point is open
      if (toIndex !== 'off' && isPointOpen(nextIndex, player)) {
        const nextRemaining = [...remainingDice];
        nextRemaining.splice(nextRemaining.indexOf(dieValue), 1);
        const result = search(nextIndex, nextRemaining, [...path, dieValue]);
        if (result) return result;        
      }
      // Bear-off path: Check exact or overshoot conditions
      else if (toIndex === 'off' && isBearOffEligible && currentIndex !== 'bar') {
        const isExact = (player === 'black' && nextIndex === -1)
          || (player === 'white' && nextIndex === 24);
        const isOvershoot = (player === 'black' && nextIndex < -1)
          || (player === 'white' && nextIndex > 24);
        
        if (isExact || (isOvershoot && isCheckerOnHighestPoint(currentIndex, player))) {
          return [...path, dieValue];
        }
        // If not bearing off directly, ensure interemediate point is open
        if (nextIndex >= 0 && nextIndex <=23 && isPointOpen(nextIndex, player)) {
          const nextRemaining = [...remainingDice];
          nextRemaining.splice(nextRemaining.indexOf(dieValue), 1);
          const result = search(nextIndex, nextRemaining, [...path, dieValue]);
          if (result) return result;
        }
      }
    }
    return null;  // Return null if no valid sequence leads to target
  }
  return search(fromIndex, [...availableDice], []);
}

/**
 * Selects a point, deselects, or triggers a move execution if valid target is clicked.
 * @param {number|string} pointIndex - 0-23 or 'bar'
 */
export function handlePointClick(pointIndex) {
  if (!state.hasRolled || state.currentRoll.length === 0) return;

  // Deselect if clicking the same point again
  if (state.selectedPoint === pointIndex) {
    state.selectedPoint = null;
    state.validMoves = [];
    logStatus("Selection cleared.");
    renderBoard();
    return;
  }

  // If piece selected and clicked point is valid target, execute the move
  if (state.selectedPoint !== null && state.validMoves.includes(pointIndex)) {
    executeMove(state.selectedPoint, pointIndex);
    return;
  }

  // Otherwise, determine ownership and select a new piece
  let pointOwner = null;
  let pointCount = 0;

  if (pointIndex === 'bar') {
    pointOwner = state.currentPlayer;
    pointCount = state.bar[state.currentPlayer];
  } else {
    const pt = state.boardState[pointIndex];
    pointOwner = pt.player;
    pointCount = pt.count;
  }

  // Allow selecting only own pieces
  if (pointOwner === state.currentPlayer && pointCount > 0) {
    state.selectedPoint = pointIndex;
    state.validMoves = getValidMovesForPoint(pointIndex);

    // Extract valid point numbers, sort them smallest to largest, and handle 'off'
    const sortedMoves = state.validMoves
      .map(idx => (idx === 'off' ? 'OFF' : idx + 1))
      .sort((a, b) => {
        if (a === 'OFF') return 1;  // Keep 'OFF' at the end of the list
        if (b === 'OFF') return -1;
        return a - b; // Numeric sort from smallest -> largest
      });

    const formattedMoves = sortedMoves.length > 0
      ? sortedMoves.join(', ') : 'None';

    // Log move options to console only
    console.log(`Point selected ${pointIndex === 'bar'
      ? 'BAR' : pointIndex + 1}. Valid moves: [ ${ formattedMoves } ]`);
  }

  // Apply .selected and .valid-target classes to DOM
  renderBoard();
}

/**
 * Execute a single step, hitting any blots if present
 */
function applySingleStep (fromIndex, toIndex, player) {
  // Remove checker from source (bar or point)
  if (fromIndex === 'bar') {
    state.bar[player]--;
  } else {
    state.boardState[fromIndex].count--;
    if (state.boardState[fromIndex].count === 0) {
      state.boardState[fromIndex].player = null;
    }
  }
  // Place checker at target destination (bear-off or point)
  if (toIndex === 'off') {
    state.borneOff[player]++;
    logStatus(`${player} bore off a checker! (${state.borneOff[player]}/15)`);
  } else {
    const targetPoint = state.boardState[toIndex];
    // HIT LOGIC: If landing on an opponent's single checker (blot)
    if (targetPoint.player && targetPoint.player !== player 
        && targetPoint.count === 1) {
      const opponent = targetPoint.player;
      state.bar[opponent]++;  // Send opponent to bar
      logStatus(`${player} hit ${opponent}'s blot on the ${toIndex + 1} point!`);
      targetPoint.player = player;
      targetPoint.count = 1;
    } else {
      // Regular placement on friendly or empty point
      targetPoint.player = player;
      targetPoint.count++;
    }
  }
}

/** 
 * Executes a checker move, handles hits, bear-offs, consumed dice,
 * updates board state and turn flow, including win checking. Refactored to ensure
 * all blots on intermediate points are hit as the checker moves along the board.
 */
export function executeMove(fromIndex, toIndex) {
  const player = state.currentPlayer;  
  const dir = DIRECTIONS[player];

  // Resolve exact sequence of individual dice needed for this move
  const dieSequence =
    findDiceSequenceForMove(fromIndex, toIndex, state.currentRoll, player);
  if (!dieSequence) return;

  // Assign a unique checker ID to track this specific piece across multi-step moves
  const checkerId = `${player}-${fromIndex}`; 
  // Record single snapshot for undo history before executing step sequence
  recordMoveSnapshot(checkerId, dieSequence);

  let currentStepIndex = fromIndex;

  // Process each die step individually so intermediate points trigger hit logic
  dieSequence.forEach(dieValue => {
    let nextStepIndex;
    if (toIndex === 'off') {
      const distanceToOff = player === 'black'
        ? currentStepIndex + 1 : 24 - currentStepIndex;
      if (dieValue >= distanceToOff) {
        nextStepIndex = 'off';
      } else {
        nextStepIndex = currentStepIndex + (dieValue * dir);
      }
    } else {
      if (currentStepIndex === 'bar') {
        nextStepIndex = player === 'white' ? dieValue - 1 : 24 - dieValue;
      } else {
        nextStepIndex = currentStepIndex + (dieValue * dir);
      }
    }
    // Apply board state changes and hit detection for this specific step
    applySingleStep(currentStepIndex, nextStepIndex, player);

    // Consume the corresponding die value form the current roll pool
    const idx = state.currentRoll.indexOf(dieValue);
    if (idx !== -1) {
      state.currentRoll.splice(idx, 1);
    }
    // Advance tracker index for next step in multi-die move
    currentStepIndex = nextStepIndex;
  });  

  // Clear selections
  state.selectedPoint = null;
  state.validMoves = [];

  // Check for victory condition (15 checkers borne off)
  if (state.borneOff[player] === 15) {
    handleGameEnd(player);
    return;
  }

  // Refresh UI
  renderBoard();
  renderDiceUI();
  updateScoreBoardUI(); // Refresh pip count immediately
}

// ==================================
//  MOVE HISTORY / DONE / UNDO LOGIC
// ==================================

/**
 * Save a pre-move state snapshot so each individual step can be reverted independently
 */
function recordMoveSnapshot(checkerId, consumedDice) {
  state.moveHistory.push({    
    consumedDice: consumedDice,
    boardState: JSON.parse(JSON.stringify(state.boardState)),
    bar: { ...state.bar },
    borneOff: {...state.borneOff},
    currentRoll: [...state.currentRoll]
  });
}

/**
 * Revert exactly one individual step taken during current turn
 */
export function undoLastMove() {
  if (!state.moveHistory || state.moveHistory.length === 0) {
    logStatus("No moves to undo.");
    return;
  }

  // Pop only the most recent single-step snapshot
  const previousState = state.moveHistory.pop();

  // Restore state to what it was before single step made
  state.boardState = previousState.boardState;
  state.bar = previousState.bar;
  state.borneOff = previousState.borneOff;
  state.currentRoll = previousState.currentRoll;

  state.selectedPoint = null;
  state.validMoves = [];

  console.log("Last move undone.");
  renderBoard();
  renderDiceUI();
  updateScoreBoardUI(); // Restore pip count
}
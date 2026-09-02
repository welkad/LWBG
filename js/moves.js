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
 * Executes a checker move, handles hits, bear-offs, consumed dice,
 * updates board state and turn flow, including win checking.
 */
export function executeMove(fromIndex, toIndex) {
  const player = state.currentPlayer;  

  // Calculate distance moved
  let distance;
  if (toIndex === 'off') {
    distance = player === 'black' ? fromIndex + 1 : 24 - fromIndex;
  } else if (fromIndex === 'bar') {
    distance = player === 'black' ? toIndex - 17 : 24 - toIndex;
  } else {
    distance = Math.abs(toIndex - fromIndex);
  }

  // Determine consumed die value(s) for this move
  const consumedDice = getConsumedDiceForDistance(distance, toIndex === 'off');  

  // Assign a unique checker ID to track this specific piece across multi-step moves
  const checkerId = `${player}-${fromIndex}`;

  // Record history snapshot including checkerId and consumed dice
  recordMoveSnapshot(checkerId, consumedDice);

  // Remove checker from origin
  if (fromIndex === 'bar') {
    state.bar[player]--;
  } else {
    state.boardState[fromIndex].count--;
    if (state.boardState[fromIndex].count === 0) {
      state.boardState[fromIndex].player = null;
    }
  }

  // Execute placement or bear-off
  if (toIndex === 'off') {
    state.borneOff[player]++;
    logStatus(`${player} bore off a checker! (${state.borneOff[player]}/15)`);
  } else {
    const targetPoint = state.boardState[toIndex];
    // Handle landing on opponent's blot (hitting)
    if (targetPoint.player && targetPoint.player !== player && targetPoint.count === 1) {
      const opponent = targetPoint.player;
      state.bar[opponent]++;
      logStatus(`${player} hit ${opponent}'s blot on Point ${toIndex + 1}!`);
      targetPoint.player = player;
      targetPoint.count = 1;
    } else {
      // Normal placement on empty or friendly point
      targetPoint.player = player;
      targetPoint.count++;
    }
  }

  // Consume die values from state.currentRoll
  consumedDice.forEach(val => {
    const idx = state.currentRoll.indexOf(val);
    if (idx !== -1) {
      state.currentRoll.splice(idx, 1);
    }
  });

  // Clear selection and re-render
  state.selectedPoint = null;
  state.validMoves = [];

  // Check for victory condition (15 checkers borne off)
  if (state.borneOff[player] === 15) {
    handleGameEnd(player);
    return;
  }
  renderBoard();
  renderDiceUI();
  updateScoreBoardUI(); // Refresh pip count immediately
}

/**
 * Calculate consumed dice for standard moves or bear-offs.
 */
function getConsumedDiceForDistance(distance, isBearOff = false) {
  // Check exact match on a single die first
  const exactIndex = state.currentRoll.indexOf(distance);
  if (exactIndex !== -1) {
    return [state.currentRoll[exactIndex]];
  }

  // If bearing off and distance > highest die, consume closest higher die
  if (isBearOff) {
    const higherDice = state.currentRoll.
      filter(d => d >= distance).sort((a, b) => a - b);
    if (higherDice.length > 0) return [higherDice[0]];
  }

  // Composite move: find smallest combination of dice summing to distance
  let sum = 0;
  const usedVals = [];

  for (let i = 0; i < state.currentRoll.length; i++) {
    sum += state.currentRoll[i];
    usedVals.push(state.currentRoll[i]);
    if (sum === distance || (isBearOff && sum > distance)) {
      return usedVals;
    }
  }

  return usedVals;
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
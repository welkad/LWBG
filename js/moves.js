// js/moves.js
import { state, handleGameEnd, switchTurn } from './state.js';
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
 * @param {Player} player 
 * @returns {boolean}
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
 * @param {number} targetIndex
 * @param {PlayerColor} player 
 * @returns 
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
 * Helper: Check if on furthest active point in the home board.
 * @param {number} fromIndex 
 * @param {PlayerColor} player 
 * @returns {boolean}
 */
function isCheckerOnHighestPoint(fromIndex, player) {
  if (player === 'black') {
    // Black moves from 23-0
    // Home board is 5-0
    // Check if Black has any checkers on fromIndex > 5 (or 6 point)
    for (let i = 5; i > fromIndex; i--) {
      if (state.boardState[i].player === 'black' && state.boardState[i].count > 0) {
        return false;
      }
    }
  } else {
    // White moves from 0-23
    // Home board is 18-23
    // Check if White has any checkers on fromIndex < 18 (or 19 point)
    for (let i = 18; i < fromIndex; i++) {
      if (state.boardState[i].player === 'white' && state.boardState[i].count > 0) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Calculates valid destinations for a selected point or bar piece.
 * @param {number|string} fromIndex - Index (0-23) or 'bar' * 
 * @returns {Array<number>} Array of valid target indices
 */
export function getValidMovesForPoint(fromIndex) {
  const player = state.currentPlayer;
  if (!player || !state.hasRolled || state.currentRoll.length === 0) return [];  
  const dir = DIRECTIONS[player];

  // Rule: Must enter from bar first if checkers are hit
  if (state.bar[player] > 0 && fromIndex !== 'bar') {
    return [];
  }

  const validTargets = new Set();
  const availableDice = [...state.currentRoll]; // Unique die values available
  const isBearOffEligible = canPlayerBearOff(player);  // Check if bear-off possible

  /**
   * Helper function to recursively traverse possible die paths
   * @param {number|string} currentIndex 
   * @param {Array<number>} remainingDice 
   * @returns 
   */
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
        // Convert currentIndex to a number for addition
        nextIndex = Number(currentIndex) + (dieValue * dir);
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
          const isHighestChecker = isCheckerOnHighestPoint(Number(fromIndex), player);
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
 * Find sequence of individual die values required based on toIndex and fromIndex.
 * @param {number|string} fromIndex - Starting position (0-23 or 'bar')
 * @param {number|string} toIndex - Ending destination (0-23 or 'off')
 * @param {Array<number>} availableDice - Active roll values remaining in state
 * @param {Player} player - Current player ('black' | 'white')
 * @returns {Array<number>|null} Ordered array of dice used or null if invalid.
 */
function findDiceSequenceForMove(fromIndex, toIndex, availableDice, player) {
  const dir = DIRECTIONS[player];
  const isBearOffEligible = canPlayerBearOff(player);

  /**
   * Helper function to recursively search for a valid dice sequence.
   * @param {number|string} currentIndex - Current index position or 'bar'
   * @param {Array<number>} remainingDice - Remaining available dice values
   * @param {Array<number>} path - Sequence of dice used so far
   * @returns {Array<number>|null} Valid dice path sequence or null if search fails
   */
  function search(currentIndex, remainingDice, path) {
    // Base condition: Check if current step matches the desired destination
    if (path.length > 0) {
      if (toIndex === 'off') {
        if (typeof currentIndex === 'number'
          && (currentIndex < 0 || currentIndex > 23)) {
          return path;
        }
      } else if (currentIndex === toIndex) {
        return path;
      }
    }

    if (remainingDice.length === 0) return null;

    // Evaluate unique dice values to avoid duplicate path checking
    const uniqueDice = [...new Set(remainingDice)];

    for (const dieValue of uniqueDice) {
      let nextIndex;

      // Calculate the intermediate point index after applying current dieValue
      if (currentIndex === 'bar') {
        nextIndex = player === 'white' ? dieValue - 1 : 24 - dieValue;
      } else {
        nextIndex = Number(currentIndex) + (dieValue * dir);
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
        
        if (isExact || (isOvershoot 
          && isCheckerOnHighestPoint(Number(currentIndex), player))) {
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
  const player = state.currentPlayer;
  // Guard: ensure active player exists before proceeding or indexing state
  if (!player || !state.hasRolled || state.currentRoll.length === 0) return;

  const playerHasBarCheckers = state.bar[player] > 0;

  // Deselect if clicking the same point again
  if (state.selectedPoint === pointIndex) {
    // Do not allow de-selecting the BAR point
    if (pointIndex === 'bar' && playerHasBarCheckers) {
      logStatus("You must enter checkers from the BAR point first!", 2000);
      return;
    }
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

  // Determine ownership of clicked point
  let pointOwner = null;
  let pointCount = 0;

  if (pointIndex === 'bar') {
    pointOwner = state.currentPlayer;
    pointCount = state.bar[player];
  } else if (typeof pointIndex === 'number' || !isNaN(Number(pointIndex))) {
    const pt = state.boardState[Number(pointIndex)];
    pointOwner = pt.player;
    pointCount = pt.count;
  }

  // Warn if player selects checker on board instead of BAR point
  if (playerHasBarCheckers && pointIndex !=='bar'
      && pointOwner === player && pointCount > 0) {
    logStatus("You must enter checkers from the BAR point first!", 2000);
    state.selectedPoint = 'bar';
    state.validMoves = getValidMovesForPoint('bar');
    renderBoard();
    return;
  }

  // Otherwise, don't warn if player has bar checkers and clicks anywhere else
  if (playerHasBarCheckers && pointIndex !=='bar') {
    state.selectedPoint = 'bar';
    state.validMoves = getValidMovesForPoint('bar');
    renderBoard();
    return;
  }

  // Allow selecting only own pieces
  if (pointOwner === state.currentPlayer && pointCount > 0) {
    // Calculate potential destinations for this point
    const moves = getValidMovesForPoint(pointIndex);

    // Prevent selection of point if no legal moves available
    if (moves.length  === 0) {
      logStatus("You cannot make a valid move from this point.", 1500);
      state.selectedPoint = null;
      state.validMoves = [];
      renderBoard();
      return;
    }

    // Valid moves exist: commit selection and store targets
    state.selectedPoint = pointIndex;
    state.validMoves = moves;

    // Extract valid point numbers, sort them smallest to largest, and handle 'off'
    const sortedMoves = state.validMoves
      .map(idx => (idx === 'off' ? 'OFF' : Number(idx) + 1))
      .sort((a, b) => {
        if (a === 'OFF') return 1;  // Keep 'OFF' at the end of the list
        if (b === 'OFF') return -1;
        return a - b; // Numeric sort from smallest -> largest
      });

    const formattedMoves = sortedMoves.length > 0
      ? sortedMoves.join(', ') : 'None';

    // Log move options to console only
    console.log(`Point selected ${pointIndex === 'bar'
      ? 'BAR' : Number(pointIndex) + 1}. Valid moves: [ ${ formattedMoves } ]`);
  } else {
    // Remove selection if player clicked empty point, opponent checker, or invalid area
    state.selectedPoint = null;
    state.validMoves = [];
    logStatus("Selection cleared.", -1);  // Set timeout to -1 for console only message
  }

  // Apply .selected and .valid-target classes to DOM
  renderBoard();
}

/**
 * Execute a single step, hitting any blots if present
 * @param {number|string} fromIndex - Starting position (0-23 or 'bar')
 * @param {number|string} toIndex - Ending destination (0-23 or 'off')
 * @param {Player} player - Active player moving piece
 * @param {Array<{opponent: Player, point: number}>|null} [hits] - Optional hit details
 */
function applySingleStep (fromIndex, toIndex, player, hits) {
  // Remove checker from source (bar or point)
  if (fromIndex === 'bar') {
    state.bar[player]--;
  } else {
    state.boardState[Number(fromIndex)].count--;
    if (state.boardState[Number(fromIndex)].count === 0) {
      state.boardState[Number(fromIndex)].player = null;
    }
  }
  // Place checker at target destination (bear-off or point)
  if (toIndex === 'off') {
    state.borneOff[player]++;
    logStatus(`${player} bore off a checker! (${state.borneOff[player]}/15)`);
  } else {
    const targetPoint = state.boardState[Number(toIndex)];
    // HIT LOGIC: If landing on an opponent's single checker (blot)
    if (targetPoint.player && targetPoint.player !== player 
        && targetPoint.count === 1) {
      const opponent = targetPoint.player;
      state.bar[opponent]++;  // Send opponent to bar
      // Collect 1-indexed point for formatted summary log
      if (hits) {
        hits.push({ opponent, point: Number(toIndex) + 1 });
      }
      // logStatus(`${player} hit ${opponent}'s blot on the ${toIndex + 1} point!`);
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
 * Helper to construct readable status for single or multiple hits
 * @param {Player} player - Active player executing the hit
 * @param {Array<{opponent: Player, point: number}>} hits - Details of hits made
 * @returns 
 */
function logHitSummary(player, hits) {
  if (!hits || hits.length === 0) return;

  const opponent = hits[0].opponent;
  const pointNumbers = hits.map(h => h.point);
  const totalHits = pointNumbers.length;
  const plural = totalHits > 1 ? 'blots' : 'blot';

  let pointsString = '';
  if (totalHits === 1) {
    pointsString = `${pointNumbers[0]} point`;
  } else if (totalHits === 2) {
    pointsString = `${pointNumbers[0]} and ${pointNumbers[1]} points`;
  } else {
    // Non-mutating extraction for all points except the last
    const initialPoints = pointNumbers.slice(0, -1).join(', ');
    const lastPoint = pointNumbers[pointNumbers.length - 1];
    pointsString = `${initialPoints} and ${lastPoint} points`;
  } 
  logStatus(`${player} hit ${opponent}'s ${plural} on the ${pointsString}!`, 2000);
}

/** 
 * Executes a checker move, handles hits, bear-offs, consumed dice,
 * updates board state and turn flow, including win checking. Refactored to ensure
 * all blots on intermediate points are hit as the checker moves along the board.
 * @param {number|string} fromIndex - Starting point index (0-23 or 'bar')
 * @param {number|string} toIndex - Target point index (0-23 or 'off')
 */
export function executeMove(fromIndex, toIndex) {
  const player = state.currentPlayer;  
  if (!player) return;  // Guard against null active player before proceeding

  const dir = DIRECTIONS[player];

  // Resolve exact sequence of individual dice needed for this move
  const dieSequence =
    findDiceSequenceForMove(fromIndex, toIndex, state.currentRoll, player);
  if (!dieSequence) return;
  
  // Record single snapshot for undo history before executing step sequence
  recordMoveSnapshot(dieSequence);

  let currentStepIndex = fromIndex;
  /** @type {Array<{opponent: Player, point: number}>} */
  const hits = [];  // Array to aggregate hits during this move execution

  // Process each die step individually so intermediate points trigger hit logic
  dieSequence.forEach(dieValue => {
    let nextStepIndex;
    if (toIndex === 'off') {
      // Calculate remaining distance based on player direction
      const stepNum = Number(currentStepIndex);
      const distanceToOff = dir === 1
        ? 24 - stepNum : stepNum + 1;
      if (dieValue >= distanceToOff) {
        nextStepIndex = 'off';
      } else {
        nextStepIndex = stepNum + (dieValue * dir);
      }
    } else {
      // Standard board step calculation
      if (currentStepIndex === 'bar') {
        nextStepIndex = player === 'white' ? dieValue - 1 : 24 - dieValue;
      } else {
        nextStepIndex = Number(currentStepIndex) + (dieValue * dir);
      }
    }
    // Apply board state changes and hit detection for this specific step
    applySingleStep(currentStepIndex, nextStepIndex, player, hits);

    // Consume the corresponding die value form the current roll pool
    const idx = state.currentRoll.indexOf(dieValue);
    if (idx !== -1) {
      state.currentRoll.splice(idx, 1);
    }
    // Advance tracker index for next step in multi-die move
    currentStepIndex = nextStepIndex;
  });

  // Log summary message for all hits accumulated during this move
  logHitSummary(player, hits);

  // Check for victory condition (15 checkers borne off)
  if (state.borneOff[player] === 15) {
    handleGameEnd(player);
    return;
  }

  // --- POST-MOVE SELECTION LOGIC ---
  const remainingBarCount = state.bar[player] || 0;
  if (remainingBarCount > 0 && state.currentRoll.length > 0) {
    // If player still has checkers on the bar, maintain auto-selection logic
    autoSelectBarIfRequired();
  } else {
    // Bar is clear: reset selections so regular board clicks resume
    state.selectedPoint = null;
    state.validMoves = [];
    renderBoard();
  }

  // Refresh remaining UI components
  renderDiceUI();
  updateScoreBoardUI(); // Refresh pip count immediately
}

/**
 * Automatically select the bar checker if current player has
 * any pieces trapped and remaining moves are available.
 * If no moves are available, then switch turn.
 */
export function autoSelectBarIfRequired() {
  const player = state.currentPlayer;
  if (!player) return;

  const barCount = state.bar[player] ||  0;

  // Auto-select only if checkers exist on the bar and dice are available
  if (barCount > 0 && state.hasRolled && state.currentRoll.length > 0) {
    const validBarMoves = getValidMovesForPoint('bar');

    // Check if trapped on BAR point with no legal moves available
    if (validBarMoves.length === 0) {
      logStatus(`${player} is trapped on the bar! All entry points are blocked.`, 3000);

      // Clear remaining dice and automatically switch turn after a brief delay
      state.currentRoll = [];
      setTimeout(() => {
        switchTurn();
      }, 3000);
      return false; // Signal that no valid moves exist
    }
    // Legal moves exist
    state.selectedPoint = 'bar';    
    state.validMoves = validBarMoves; // Calculate destination points from bar
    renderBoard();  // Show selected highlight on bar & target points
    return true;
  }
  return true;
}

// ==================================
//  MOVE HISTORY / DONE / UNDO LOGIC
// ==================================

/**
 * Save a pre-move state snapshot so each individual step can be reverted independently
 * @param {number[]} consumedDice - Array of dice values consumed during the move
 */
function recordMoveSnapshot(consumedDice) {
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
  if (!previousState) return;

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
// js/moves.js - Move validation, legal destination calculation, move execution, and undo history.
import { DIRECTIONS, getValidMovesForPoint, findDiceSequenceForMove, hasAnyLegalMoves, canPlayerBearOff, isCheckerOnHighestPoint} from './rules.js';
import { state, handleGameEnd, switchTurn } from './state.js';
import { clearHoverHighlights, renderBoard, updateScoreBoardUI } from './board.js';
import { clearStatusQueue, logStatus } from './ui.js';
import { renderDiceUI } from './dice-renderer.js';

/**
 * Save a pre-move state snapshot so each individual step can be reverted independently
 * @param {number[]} consumedDice - Array of dice values consumed during the move
 */
function recordMoveSnapshot(consumedDice) {
  state.moveHistory.push({    
    consumedDice: consumedDice,
    boardState: structuredClone(state.boardState),
    bar: { ...state.bar },
    borneOff: {...state.borneOff},
    currentRoll: [...state.currentRoll]
  });
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
  logStatus(`${player} hit ${opponent}'s ${plural} on the ${pointsString}!`);
}

/**
 * Helper function to reset selections and purge hover previews from DOM 
 */
function resetSelectionState() {
  state.selectedPoint = null;
  state.validMoves = [];
  clearHoverHighlights();
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

  resetSelectionState();  // Clear any lingering selection state

  // --- POST-MOVE SELECTION LOGIC ---  
  const remainingBarCount = state.bar[player] || 0;
  if (remainingBarCount > 0 && state.currentRoll.length > 0) {
    // If player still has checkers on the bar, maintain auto-selection logic
    autoSelectBarIfRequired();
  } else {
    // Bar is clear: reset selections so regular board clicks resume
    resetSelectionState();
    renderBoard();
  }

  // Refresh remaining UI components
  renderDiceUI();
  updateScoreBoardUI(); // Refresh pip count immediately

  // --- POST MOVE TURN END CHECK ---
  // Check if player ran out of dice or has zero valid moves remaining
  if (state.currentRoll.length === 0) {
    // Normal turn completion: all dice used        
    resetSelectionState();
    renderBoard();
  } else if (!hasAnyLegalMoves()) {
    // Turn stuck: remaining dice have no valid moves
    clearStatusQueue(); // Cancel pending queue delays in ui.js
    logStatus('No legal moves availabe for remaining roll ' +
      [state.currentRoll.join(', ')], 3000
    );

    state.isInputLocked = true; // Lock input during 3s window

    // Brief timeout so player can see the message before turn switches
    setTimeout(() => {
      // Keep state intact while message displays, then clear and switch
      resetSelectionState();
      state.currentRoll = [];
      switchTurn();
    }, 3000);
  }
}

// ==================================
//  PUBLIC ACTION EXPORTS
// ==================================

/**
 * Handle point click interactions with hybrid hover awareness:
 * - Direct fast clicks invoke instant auto-move (first available die).
 * - Clicking while hover highlights are active locks choices for target selection.
 * @param {number|string} pointIndex - 0-23 or 'bar'
 * @param {boolean} [useSecondDie=false] - Use second die when right-click on mouse
 */
export function handlePointClick(pointIndex, useSecondDie = false) {
  if (pointIndex === null || pointIndex === undefined || state.isInputLocked) {
    return;  // Check for null and undefined so index 0 isn't treated as falsy!
  }

  const player = state.currentPlayer; // Guard: ensure active player exists 
  if (!player || !state.hasRolled || state.currentRoll.length === 0) return;

  // If requesting second die value, first ensure a second value exists
  if (useSecondDie && state.currentRoll.length < 2) return;

  const normalizedIndex = (pointIndex === 'bar' || pointIndex === 'off')
    ? pointIndex : Number(pointIndex);

  const playerHasBarCheckers = state.bar[player] > 0;

  // Deslection on clicking the already selected origin
  if (state.selectedPoint !== null && state.selectedPoint === normalizedIndex) {
    resetSelectionState();
    renderBoard();
    return;
  }

  // Bar entry resolution or piece selection
  const isBarTargetClick = playerHasBarCheckers && state.selectedPoint === null;
  const activeOrigin = state.selectedPoint !== null
    ? state.selectedPoint
    : (isBarTargetClick ? 'bar' : null);

  // Target execution
  if (activeOrigin !== null && state.validMoves.length > 0) {    
    const isTargetMatch = state.validMoves.includes(normalizedIndex);

    if (isTargetMatch) {      
      const originToMove = activeOrigin;
      resetSelectionState();
      executeMove(originToMove, normalizedIndex); // Execute move directly
      return;
    }
  }

  // Prevent clicking bear-off tray as an origin point to select checkers
  if (normalizedIndex === 'off') {
    resetSelectionState();
    renderBoard();
    return;
  }

  // Scoped hover state verification
  let isHoverActive = false;
  if (normalizedIndex === 'bar') {
    // Check if element inside either bar container has the hover class
    const hoveredBarEl = document.querySelector(`
        #bar-black .hover-selected, #bar-black.hover-selected,
        #bar-white .hover-selected, #bar-white.hover-selected
    `);
    isHoverActive = hoveredBarEl !== null;
  } else {  // Check if preview is active
    const targetSelector = `[data-point="${normalizedIndex}"], 
      [data-index="${normalizedIndex}"]`;
    const clickedEl = document.querySelector(targetSelector);
    isHoverActive = clickedEl  
      ? clickedEl.classList.contains('hover-selected') ||
      clickedEl.querySelector('.hover-selected') !== null
      : false;
  }

  // Clear transient hover preview styles
  clearHoverHighlights();

  // Ownership & bar entry validation
  let pointOwner = null;
  let pointCount = 0;

  if (normalizedIndex === 'bar') {
    pointOwner = player;
    pointCount = state.bar[player];
  } else if (typeof normalizedIndex === 'number') {
    const pt = state.boardState[normalizedIndex];
    pointOwner = pt.player;
    pointCount = pt.count;
  }

  // Ignore clicks on empty points or opponent checkers
  if (pointOwner !== player || pointCount <= 0) {
    resetSelectionState();
    renderBoard();
    return;
  }

  // Enforce bar entry requirement  
  if (normalizedIndex !== 'bar' && playerHasBarCheckers) {
    logStatus("You must enter checkers from the BAR point first!", 2000);    
    return;
  }

  // Calculate valid moves (also passing useSecondDie paramater)
  const rawTargets = getValidMovesForPoint(normalizedIndex, useSecondDie);
  /** @type {Array<number|'off'>} */
  const targets = Array.isArray(rawTargets) ? rawTargets : [rawTargets];

  // Notify player if clicked checker has no legal moves
  if (targets.length === 0) {
    const isBearOffMode = canPlayerBearOff(player);    
    // Customized message during bear off phase of the game
    if (isBearOffMode && typeof normalizedIndex === 'number'
      && !isCheckerOnHighestPoint(normalizedIndex, player)) {
        logStatus("Must bear off from highest point first!", 2000);
      } else {
        logStatus("No valid moves can be made from this point.", 1500);
      }
    
    resetSelectionState();
    renderBoard();
    return;
  }

  // Hybrid, either: hover preview was active and multiple-targets -> lock choices
  if (isHoverActive && targets.length > 1) {
    state.selectedPoint = normalizedIndex;
    state.validMoves = targets;
    renderBoard();
    return;
  }
  // Otherwise -> Fast auto-move (also passing useSecondDie paramater)
  resetSelectionState();
  attemptAutoMove(normalizedIndex, useSecondDie);     
}

/**
 * Attempt to automatically move a checker from source point based on dice order.
 * @param {number|string} fromIndex - 0-23 or 'bar'
 * @param {boolean} [useSecondDie=false] - Whether to play the second die value or not
 */
function attemptAutoMove(fromIndex, useSecondDie = false) {
  const player = state.currentPlayer;
  if (!player || !state.currentRoll || state.currentRoll.length === 0) return;

  // If second die value is requested make sure it exists
  if (useSecondDie && state.currentRoll.length < 2) return;

  const dir = DIRECTIONS[player];
  const rawMoves = getValidMovesForPoint(fromIndex, useSecondDie);

  /** @type {Array<number|'off'>} */
  const validMoves = Array.isArray(rawMoves) ? rawMoves : [rawMoves];

  if (!validMoves || validMoves.length === 0) {
    logStatus("You cannot make a valid move from this point.", 1500);
    return;
  }

  /**
   * Helper to calculate target index for a specific die value
   * @param {number} dieValue
   * @returns {number|'off'}
   */
  const calculateTarget = (dieValue) => {
    if (fromIndex === 'bar') {
      return player === 'white' ? dieValue - 1 : 24 - dieValue;
    }
    const targetNum = Number(fromIndex) + (dieValue * dir);
    if (targetNum < 0 || targetNum > 23) {
      return 'off';
    }
    return targetNum;
  };

  /** @type {number|string|null} */
  let targetDestination = null;

  if (useSecondDie) {
    // Mode A: Specifically evaluate second die (state.currentRoll[1])
    const secondDieTarget = calculateTarget(state.currentRoll[1]);
    if (validMoves.includes(secondDieTarget)) {
      targetDestination = secondDieTarget;
    } else {
      // Mode B: Standard auto-move prioritizing first die
      // Priority 1: Left die (state.currentRoll[0])
      if (state.currentRoll.length > 0) {
        const leftTarget = calculateTarget(state.currentRoll[0]);
        if (validMoves.includes(leftTarget)) {
          targetDestination = leftTarget;
        }
      }
    }
    // Priority 2: Right die (state.currentRoll[1]) if left die is blocked
    if (targetDestination === null && state.currentRoll.length > 1) {   
      const rightTarget = calculateTarget(state.currentRoll[1]);
      if (validMoves.includes(rightTarget)) {
        targetDestination = rightTarget;
      }
    }
  }

  // Priority 3: First available valid destination from pathfinder
  if (targetDestination === null && validMoves.length > 0) {
    targetDestination = validMoves[0];
  }

  // Execute movement directly
  if (targetDestination !== null) {
    resetSelectionState();
    executeMove(fromIndex, targetDestination);
  }
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
    const rawBarMoves = getValidMovesForPoint('bar');
    /** @type {Array<number|string>} */
    const validBarMoves = Array.isArray(rawBarMoves) ? rawBarMoves : [rawBarMoves];

    // Check if trapped on BAR point with no legal moves available
    if (validBarMoves.length === 0) {
      logStatus(`${player} is trapped on the bar! All entry points are blocked.`, 2000);

      // Clear remaining dice and automatically switch turn after a brief delay
      state.currentRoll = [];
      state.isInputLocked = true; // Lock input during 3s message window

      setTimeout(() => {
        switchTurn(); // Automatically resets isInputLocked = false
      }, 3000);
      return false; // Signal that no valid moves exist
    }
    // Legal moves exist
    state.selectedPoint = null; // Keep selection state empty to suppress rectangles
    state.validMoves = validBarMoves; // Calculate destination points from bar
    renderBoard();  // Show selected highlight on bar & target points
    return true;
  }
  return true;
}

/**
 * Revert exactly one individual step taken during current turn
 */
export function undoLastMove() {
  if (!state.moveHistory || state.moveHistory.length === 0) {
    logStatus("No moves to undo.", -1);
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

  // Keep selection state empty to suppress rectangles
  resetSelectionState();

  console.log("Last move undone.");
  renderBoard();
  renderDiceUI();
  updateScoreBoardUI(); // Restore pip count
}
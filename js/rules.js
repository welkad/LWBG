// js/rules.js - Rule & calculation logic for moves.js
import { state } from './state.js';

// Direction vectors
export const DIRECTIONS = {
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
export function isPointOpen(targetIndex, player) {
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
export function isCheckerOnHighestPoint(fromIndex, player) {
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
   * @param {number} currentBarCount - Track remaining bar checkers in path sequence
   */
  function findPaths(currentIndex, remainingDice, currentBarCount) {
    if (remainingDice.length === 0) return;

    // Use remaining dice values to avoid duplicate branch evaluation
    const uniqueDice = [...new Set(remainingDice)]; // (e.g. non-doubles permutations)

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
          if (currentIndex === 'bar' && currentBarCount > 1) {   
            // Checkers still remain on the bar
            findPaths('bar', nextRemaining, currentBarCount - 1);
          } else {
            // Single checker on bar can continue moving
            findPaths(nextIndex, nextRemaining, 0);
          }
        }
      }
      // Bear-off logic
      else if (isBearOffEligible && currentIndex !== 'bar') {
        const isExactBearOff = (player === 'black' && nextIndex === -1)
          || (player === 'white' && nextIndex === 24);
        const isOverShootBearOff = (player === 'black' && nextIndex < -1)
          || (player === 'white' && nextIndex > 24);

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
  findPaths(fromIndex, availableDice, state.bar[player]);
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
export function findDiceSequenceForMove(fromIndex, toIndex, availableDice, player) {
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
        if (typeof currentIndex === 'number' && (currentIndex < 0 || currentIndex > 23)) {
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
        
        if (isExact || (isOvershoot && isCheckerOnHighestPoint(Number(currentIndex), player))) {
          return [...path, dieValue];
        }
        // If not bearing off directly, ensure interemediate point is open
        if (nextIndex >= 0 && nextIndex <= 23 && isPointOpen(nextIndex, player)) {
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
 * Checks if the current player has any valid moves anywhere on the board
 * @returns {boolean}
 */
export function hasAnyLegalMoves() {
  const player = state.currentPlayer;
  if (!player || !state.hasRolled || !state.currentRoll || state.currentRoll.length === 0) return false;

  // If trapped on the bar, only check valid bar entry moves
  if (state.bar[player] > 0) {
    return getValidMovesForPoint('bar').length > 0;
  }

  // Check every point  on the board for valid moves
  for (let i = 0; i <= 23; i++) {
    if (state.boardState[i].player === player && state.boardState[i].count > 0) {
      if (getValidMovesForPoint(i).length > 0) {
        return true;
      }
    }
  }
  return false; // No legal moves remain on any point
}

/**
 * Determine the win type, multiplier, and total points based on current board
 * @param {'black'|'white'} winner
 * @param {PlayerColor} [resigningPlayer = null]
 * @returns {{ winType: string, pointsWon: number }}
 */
export function calculateGameOutcome(winner, resigningPlayer = null) {
  const cube = state.cubeValue;
  const loser = resigningPlayer || (winner === 'black' ? 'white' : 'black');
  
  const winnerBorneOff = state.borneOff[winner] || 0;
  const loserBorneOff = state.borneOff[loser] || 0;

  // Resignation before winner has borne off any checkers
  if (resigningPlayer && winnerBorneOff === 0) {
    return { winType: 'Single Win', pointsWon: cube };
  }

  // Single win: loser has borne off at least 1 checker
  if (loserBorneOff > 0) {
    return { winType: '', pointsWon: cube };
  }

  // Check if loser has checkers on bar or inside  winner's home board
  const loserBarCount = state.bar[loser] || 0;

  // Winner's home board indices: Black home (0-5), White home (18-23)
  const winnerHomeRange = winner === 'black'
    ? { start: 0, end: 5 }
    : { start: 18, end: 23 };

  let checkersInWinnerHome = 0;
  for (let i = winnerHomeRange.start; i <= winnerHomeRange.end; i++) {
    if (state.boardState[i].player === loser) {
      checkersInWinnerHome += state.boardState[i].count;
    }
  }

  // Backgammon (3x): 0 borne off by loser and checkers on bar or winner's home
  if (loserBarCount > 0 || checkersInWinnerHome > 0) {
    return { winType: 'Backgammon', pointsWon: cube * 3 };
  }

  // Gammon (2x): 0 borne off by loser but all checkers outside winnner's home
  return { winType: 'Gammon', pointsWon: cube * 2 };
}
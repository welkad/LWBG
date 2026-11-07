// js/rules.js - Rule & calculation logic for moves.js
import { state } from './state.js';

// Direction vectors
export const DIRECTIONS = {
  white: 1, // Increasing index (0 to 23)
  black: -1 // Decreasing index (23 to 0)
};

/**
 * Checks if all checkers of a given player are in their home board or borne off.
 * Accepts optional custom board and bar states for recursive move simulation.
 * Black home board: indices 0-5
 * White home board: indices 18-23
 * @param {Player} player - 'black' or 'white'
 * @param {Array<{player: string|null, count: number}>} [customBoard=state.boardState] - Board state to check
 * @param {{black: number, white: number}} [customBar=state.bar] - Bar state to check
 * @returns {boolean}
 */
export function canPlayerBearOff(player, customBoard = state.boardState,
  customBar = state.bar) {
  if (customBar[player] > 0) return false;

  const outsideHomeRange = player === 'black'
    ? { start: 6, end: 23 }
    : { start: 0, end: 17 };

  for (let i = outsideHomeRange.start; i <= outsideHomeRange.end; i++) {
    if (customBoard[i].player === player) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a specific point-index is open for the current player to land on.
 * @param {number} targetIndex
 * @param {PlayerColor} player 
 * @param {Array<{player: string|null, count: number}>} [customBoard=state.boardState]
 * @returns {boolean}
 */
export function isPointOpen(targetIndex, player, customBoard = state.boardState) {
  if (targetIndex < 0 || targetIndex > 23) return false;

  const point = customBoard[targetIndex];
  const isUnoccupied = point.player === null;
  const isSelf = point.player === player;
  const isBlot = point.player !== player && point.count === 1;

  return isUnoccupied || isSelf || isBlot;
}

/**
 * Helper: Check if on furthest active point in the home board.
 * @param {number} fromIndex 
 * @param {PlayerColor} player
 * @param {Array<{player: string|null, count: number}>} [customBoard=state.boardState]
 * @returns {boolean}
 */
export function isCheckerOnHighestPoint(fromIndex, player,
  customBoard = state.boardState) {
  if (player === 'black') {
    // Black moves from 23-0
    // Home board is 5-0
    // Check if Black has any checkers on fromIndex > 5 (or 6 point)
    for (let i = 5; i > fromIndex; i--) {
      if (customBoard[i].player === 'black' && customBoard[i].count > 0) {
        return false;
      }
    }
  } else {
    // White moves from 0-23
    // Home board is 18-23
    // Check if White has any checkers on fromIndex < 18 (or 19 point)
    for (let i = 18; i < fromIndex; i++) {
      if (customBoard[i].player === 'white' && customBoard[i].count > 0) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Calculates valid destinations for a selected point or bar piece.
 * @param {number|string} fromIndex - Index (0-23) or 'bar'
 * @param {boolean} [useSecondDie=false] - To target state.currentRoll[1] or not
 * @returns {Array<number>|'off'} Array of valid target indices
 */
export function getValidMovesForPoint(fromIndex, useSecondDie = false) {
  const player = state.currentPlayer;
  if (!player || !state.hasRolled || state.currentRoll.length === 0) return [];  

  // If second die value requested, make sure it exists
  if (useSecondDie && state.currentRoll.length < 2) return [];  

  // Rule: Must enter from bar first if checkers are hit
  if (state.bar[player] > 0 && fromIndex !== 'bar') {
    return [];
  }

  const allSequences = getAllTurnSequences();
  if (allSequences.length === 0) return [];

  // "Play Both" rule: filter for sequences achieving maximum completion length
  const maxLength =  Math.max(...allSequences.map(seq => seq.length));
  let validSequences = allSequences.filter(seq => seq.length === maxLength);

  // "Higher Die" rule: if only 1 die can be played, prioritize the higher roll
  const roll = /** @type {number[]} */ (state.currentRoll);
  if (maxLength === 1 && roll.length === 2 && roll[0] !== roll[1]) {
    const higherDie = Math.max(...roll);
    const hasHigherDieMove = validSequences.some(seq => seq[0].die === higherDie);
    if (hasHigherDieMove) {
      validSequences = validSequences.filter(seq => seq[0].die === higherDie);
    }
  }

  // Extract valid destination targets matching the requested origin point
  const validTargets = new Set();
  validSequences.forEach(seq => {
    const firstMove = seq[0];
    const matchesFrom = firstMove.from === fromIndex ||
      (typeof fromIndex === 'number' && Number(firstMove.from) 
        === Number(fromIndex));
    if (matchesFrom) validTargets.add(firstMove.to);
  });  
  
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
  const allSequences = getAllTurnSequences();
  const validSeq = allSequences.find(seq => {
    const first = seq[0];
    const matchesFrom = first.from === fromIndex || Number(first.from) 
      === Number(fromIndex);
    const matchesTo = first.to === toIndex || Number(first.to) === Number(toIndex);
    return matchesFrom && matchesTo && availableDice.includes(first.die);
  });

  return validSeq ? [validSeq[0].die] : null;
}

/**
 * Checks if the current player has any valid moves anywhere on the board
 * @returns {boolean}
 */
export function hasAnyLegalMoves() {
  const player = state.currentPlayer;
  if (!player || !state.hasRolled || !state.currentRoll || state.currentRoll.length === 0) return false;

  const allSequences = getAllTurnSequences();
  return allSequences.length > 0 && allSequences[0].length > 0;
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

/**
 * Count all possible legal moves a player can make accross the board.
 * Useful for determining if move was forced (i.e. has no other options).
 * @returns {number} Total count of valid moves available
 */
export function countTotalLegalMoves() {
  const player = state.currentPlayer;
  if (!player || !state.hasRolled || !state.currentRoll ||
    state.currentRoll.length === 0) return 0;

  let totalMoves = 0;

  // If trapped on bar, only check  bar moves
  if (state.bar[player] > 0) {
    return getValidMovesForPoint('bar').length;
  }

  // Check every point on the board
  for (let i = 0; i <= 23; i++) {
    if (state.boardState[i].player === player && state.boardState[i].count > 0) {
      const moves = getValidMovesForPoint(i);
      totalMoves += moves.length;
    }
  }
  return totalMoves;
}

/**
 * Recursively find all valid complete or partial move sequences for the current turn.
 * Used to enforce the Backgammon rule: "If you can play both dice, you must."
 * Each sequence is an array of move objects: { from, to, die }
 * Returns An array of valid turn paths:
 * @returns {Array<Array<{from: number|string, to: number|string, die: number}>>}
 */
function getAllTurnSequences() {
  const player = state.currentPlayer;
  if (!player || !state.hasRolled || !state.currentRoll
    || state.currentRoll.length === 0) return [];
  
  const initialDice = [...state.currentRoll];
  /** @type {Array<Array<{from: number|string, to: number|string, die: number}>>} */
  const allSequences = [];

  // Helper to find all legal next steps for a given hypothetical board state
  function getLegalMovesForState(
    /** @type {Array<{player: string|null, count: number}>} */ boardState,
    /** @type {{black: number, white: number}} */ barState,
    /** @type {number[]} */ currentDice,
    /** @type {Player} */ currentPlayer
  ) {
    /** @type {Array<{from: number|string, to: number|string, die: number}>} */
    const moves = [];
    const isBearOff = canPlayerBearOff(currentPlayer, boardState, barState);
    const dir = DIRECTIONS[currentPlayer];
    const uniqueDice = [...new Set(currentDice)];

    // Rule: must enter from the BAR point first if pieces are trapped
    if (barState[currentPlayer] > 0) {
      uniqueDice.forEach(die => {
        const nextIndex = currentPlayer === 'white' ? die - 1 : 24 - die;
        if (isPointOpen(nextIndex, currentPlayer, boardState)) {
          moves.push({ from: 'bar', to: nextIndex, die });
        }        
      });
      return moves;
    }

    // Scan all board points for the current player
    for (let i = 0; i <= 23; i++) {
      if (boardState[i].player === currentPlayer && boardState[i].count > 0) {        
        uniqueDice.forEach(die => {
          const nextIndex = Number(i) + (die * dir);

          if (isPointOpen(nextIndex, currentPlayer, boardState)) {
            moves.push({ from: i, to: nextIndex, die });
          } else if (isBearOff) {
            const isExact = (currentPlayer === 'black' && nextIndex === -1)
              || (currentPlayer === 'white' && nextIndex === 24);
            const isOver = (currentPlayer === 'black' && nextIndex < -1)
              || (currentPlayer === 'white' && nextIndex > 24);
            if (isExact || (isOver
              && isCheckerOnHighestPoint(i, currentPlayer, boardState))) {
                moves.push({ from: i, to: 'off', die });
            } else if (nextIndex >= 0 && nextIndex <= 23
              && isPointOpen(nextIndex, currentPlayer, boardState)) {
                moves.push({ from: i, to: nextIndex, die });
            }
          }
        });
      }
    }
    return moves;
  }

  // Return a deep-cloned simulation of the board after applying single move step
  function applyMove(
    /** @type {Array<{player: string|null, count: number}>} */ boardState,
    /** @type {{black: number, white: number}} */ barState,
    /** @type {{black: number, white: number}} */ borneOffState,
    /** @type {{from: number|string, to: number|string, die: number}} */ move,
    /** @type {Player} */ playerColor
  ) {
    const newBoard = boardState.map(
      (/** @type {{player: string|null, count: number}} */ p) => ({ ...p }));
    const newBar = { ...barState };
    const newBorneOff = { ...borneOffState };

    if (move.from === 'bar') {
      newBar[playerColor]--;
    } else {
      newBoard[Number(move.from)].count--;
      if (newBoard[Number(move.from)].count === 0) {
        newBoard[Number(move.from)].player = null;
      }
    }

    if (move.to === 'off') {
      newBorneOff[playerColor] = (newBorneOff[playerColor] || 0) + 1;
    } else {
      const target = newBoard[Number(move.to)];
      const opponent = playerColor === 'black' ? 'white' : 'black';
      if (target.player === opponent && target.count === 1) {
        newBar[opponent]++;
        target.player = playerColor;
        target.count = 1;
      } else if (target.player === playerColor) {
        target.count++;
      } else {
        target.player = playerColor;
        target.count = 1;
      }      
    }
    return { board: newBoard, bar: newBar, borneOff: newBorneOff };
  }

  // Recursive backtracking search to build full action paths
  function searchSequences(
    /** @type {Array<{player: string|null, count: number}>} */ currentBoard, 
    /** @type {{black: number, white: number}} */ currentBar, 
    /** @type {number[]} */ remainingDice, 
    /** @type {Array<{from: number|string, to: number|string, die: number}>} */ currentPath
  ) {  
    // Base case: all available dice have been successfully simulated
    if (remainingDice.length === 0) {
      allSequences.push([...currentPath]);
      return;
    }
    const player = /** @type {'black'|'white'} */ (state.currentPlayer);
    const legalMoves = getLegalMovesForState(currentBoard, currentBar,
      remainingDice, player);
    if (legalMoves.length === 0) {
      // If no more steps can be made, record the partial sequence
      if (currentPath.length > 0) allSequences.push([...currentPath]);
      return;
    }

    let movedAny = false;
    for (const move of legalMoves) {
      movedAny = true;
      const nextDice = [...remainingDice];
      nextDice.splice(nextDice.indexOf(move.die), 1); // Consume die used

      const nextState = applyMove(currentBoard, currentBar, state.borneOff,
        move, player);
      searchSequences(nextState.board, nextState.bar, 
        nextDice, [...currentPath, move]);
    }

    if (!movedAny && currentPath.length > 0) {
      allSequences.push([...currentPath]);
    }
  }

  searchSequences(state.boardState, state.bar, initialDice, []);
  return allSequences;
}
// ==========================================
// GAME STATE MANAGEMENT
// ==========================================
// js/state.js - Centralizes all global mutable game states into one place
// so modules can import and modify it predictably.

import { updateTurnUI, refreshDiceForNewTurn } from './dice.js';
import { renderBoard, updatePointLabels, updateScoreBoardUI } from './board.js';
import { logStatus, clearStatusQueue, updateLegendUI } from './ui.js';
import { updateCubePositionUI } from './doubling-cube.js';
import { calculateGameOutcome } from './rules.js';
import { renderDiceUI, setDieValue } from './dice-renderer.js';

let GAME_OVER_BANNER_DURATION_MS = 3000;  // Display victory message duration

/** @type {GameState} */
export const state = {
    boardState: Array(24).fill(null).map(() => ({ player: null, count: 0 })),
    bar: { white: 0, black: 0 },      // Checkers waiting on the bar
    borneOff: { white: 0, black: 0 }, // Checkers safely borne off
    scores: { white: 0, black: 0 },   // How many games won
    selectedPoint: null,              // Point index (0-23) or 'bar'    
    validMoves: [],                   // Target indices (0-23 or 'off') for checkers
    moveHistory:[],                   // Holds snapshots of boardState, bar, currentRoll
    showHoverHighlights: false,       // Turn on/off selection/targets - press 'H' key
    gameMode: 'single',               // 'single' | 'match' | 'money'
    matchTarget: 3,                   // Target points for 'match' mode
    bankRolls: {                      // Starting kitty for 'money' mode
      black: 100,
      white: 100 },
    moneyAnte: 10,                    // Base dollar stake per <point />
    useCrawfordRule: true,            // Match play option
    useJacobyRule: true,              // Money play option

    cubeValue: 1,                     // Default starting multiplier
    cubeOwner: 'center',              // 'center', 'white', of 'black'
    isCubeOffered: false,             // True when decision is pending
    cubeOfferedBy: null,              // Cube offered by 'black' or 'white'
    gamePhase:  'opening_roll',       // 'opening_roll', 'turns', or 'game_over'
    losingPlayer: null,               // Tracks who lost for post game Y/N prompt
    currentPlayer: null,              // Set dynamically by opening roll
    isResignOffered: false,           // Resignation state
    resignOfferedBy: null,            // Resigning player    
    playAgainChoices: { black: null, white: null }, // Track Y/N decision per player
    awaitingPlayAgainPrompt: false,   // Delay displaying play again prompt
    isInputLocked: false,             // Locking mechanism for player input

    openingRolls: { white: null, black: null },
    turnSwitched: false,              // Boolean to prevent double turn switches
    currentRoll: [],                  // e.g., [5, 3] or [4, 4, 4, 4]
    isDouble: false,                  // Track if current turn started with double dice
    activeRoller: null,
    isRolling: false,
    hasRolled: false,
};

export function initBoardState() {
    state.boardState = Array(24).fill(null).map(() => ({ player: null, count: 0 }));    
    updatePointLabels(null);    

    // Reset board states
    state.bar = { white: 0, black: 0 };
    state.borneOff = { white: 0, black: 0 };
    state.selectedPoint = null;
    state.validMoves = [];
    state.moveHistory = [];

    // Reset opening roll state
    state.gamePhase = 'opening_roll';
    state.currentPlayer = null;
    state.losingPlayer = null;
    state.openingRolls = { white: null, black: null };
    state.isRolling = false;
    state.hasRolled = false;
    state.isDouble = false;
    state.turnSwitched = false;

    // Reset doubling cube and resignation state
    state.cubeValue = 1;
    state.cubeOwner = 'center';
    state.isCubeOffered = false;
    state.cubeOfferedBy = null;
    state.isResignOffered = false;
    state.resignOfferedBy = null;
    state.playAgainChoices = { black: null, white: null };
    state.awaitingPlayAgainPrompt = false;
    state.isInputLocked = false;

    updateCubePositionUI(); // Update cube position AFTER state resets

    // Official Standard Backgammon Starting Setup
    state.boardState[0]  = { player: 'white', count: 2 }; // Point 1
    state.boardState[5]  = { player: 'black', count: 5 }; // Point 6
    state.boardState[7]  = { player: 'black', count: 3 }; // Point 8
    state.boardState[11] = { player: 'white', count: 5 }; // Point 12
    state.boardState[12] = { player: 'black', count: 5 }; // Point 13
    state.boardState[16] = { player: 'white', count: 3 }; // Point 17
    state.boardState[18] = { player: 'white', count: 5 }; // Point 19
    state.boardState[23] = { player: 'black', count: 2 }; // Point 24
}

/**
 * Call handleGameEnd function if player resigns
 * @param {PlayerColor} resigningPlayer
 */
export function handleResignation(resigningPlayer) {
  const winner = resigningPlayer === 'black' ? 'white' : 'black';
  handleGameEnd(winner, resigningPlayer);
}

// Reset board for new game but preserve match scores
export function resetGame() {
  document.body.classList.remove('game-over-phase');  // Remove game-over class
  clearStatusQueue();   // Clear any stale messages
  initBoardState();     // Restore board, bar, cube and opening roll state

  // Refresh UI for opening roll phase
  renderBoard();
  updateScoreBoardUI(); // Display current score and reset pip counts
  updateTurnUI();       // Display both dice zones
  renderDiceUI();       // Render opening 'R' die for both players
  updateLegendUI();     // Update legend back to standard controls  

  logStatus("New game started! Highest roll moves first.");  
}

// Reset hasRolled on Turn Change
export function switchTurn() {
  if (state.gamePhase === 'game_over') return;

  // Prevent turn switching from occurring twice during same turn
  if (state.turnSwitched) return;
  state.turnSwitched = true;

  // Toggle active player
  state.currentPlayer = state.currentPlayer === 'black' ? 'white' : 'black';
  updatePointLabels(state.currentPlayer);

  // Reset turn flags so new active player can double BEFORE rolling
  state.hasRolled = false;    // Keep track for doubling situations
  state.currentRoll = [];
  state.selectedPoint = null;
  state.validMoves = [];
  state.isDouble = false;
  state.isCubeOffered = false;
  state.cubeOfferedBy = null;
  state.isResignOffered = false;
  state.resignOfferedBy = null;
  state.isInputLocked = false;  // Allow players to make decisions again

  clearStatusQueue(); // Cancel any queue delays from previous message
  logStatus(`Turn switched. It is now ${state.currentPlayer}'s turn.`);

  // Clear dice DOM elements, update status, and re-render board
  updateCubePositionUI(); // Refresh cube UI based on currentPlayer & ownership    
  updateTurnUI();
  refreshDiceForNewTurn();
  updateLegendUI();
  renderBoard();
}

/**
 *  Calculate the total PIP count for a given player.
 *  White moves from index 0 -> 23 (bears off past 23).
 *  Black moves from index 23 -> 0 (bears off past 0).
 *  @param {'black' | 'white'} player
 *  @returns {number}
 */
export function calculatePipCount(player) {
    let pips = 0;
    // Checkers on the board
    state.boardState.forEach((point, index) => {
        if (point.player === player && point.count > 0) {
            // Distance to bear off:
            // White point 0 needs 24 pips to bear off, point 23 needs 1 pip.
            // Black point 23 needs 24 pips to bear off, point 0 needs 1 pip.
            const distance = player === 'white' ? (24 - index) : (index + 1);
            pips += distance * point.count;
        }
    });
    // Checkers on the bar (max distance = 25 pips)
    if (state.bar[player] > 0) {
        pips += state.bar[player] * 25;
    }
    return pips;
}

/**
 * Handle end-of-game state when bearing off all checkers or resigning game.
 * @param {'black'|'white'} winner - The winning player.
 * @param {'black'|'white'|null} [resigningPlayer = null] - The resigning player.
 */
export function handleGameEnd(winner, resigningPlayer = null) {
  const loser = resigningPlayer || (winner === 'black' ? 'white' : 'black');
  const { winType, pointsWon} = calculateGameOutcome(winner, resigningPlayer);

  let sessionOver = false;
  let moneyPayoutAmount = 0;

  // Handle scoring/bankrolls based on active game mode
  if (state.gameMode === 'money') {
    const payoutResult = applyMoneyPayout(winner, loser, pointsWon);
    moneyPayoutAmount = payoutResult.actualPayout;
    sessionOver = payoutResult.isSessionOver;
  } else {
    // Single or Match mode point accumulation
    state.scores[winner] += pointsWon;

    if (state.gameMode === 'match') {
      const target = state.matchTarget || 3;
      if (state.scores[winner] >= target) {
        sessionOver = true;
      }
    }
  }

  // Add phase class to body to scope CSS
  document.body.classList.add('game-over-phase');
  document.body.classList.remove('opening-roll-phase');

  // Lock game state and reset flags
  state.gamePhase = 'game_over';
  state.selectedPoint = null; // Clear active selection highlight
  state.validMoves = [];      // Clear target destination highlight

  state.losingPlayer = loser;
  state.isResignOffered = false;
  state.resignOfferedBy = null;
  state.hasRolled = false;
  state.awaitingPlayAgainPrompt = true; // Temporary flag to delay Y/N display

  clearStatusQueue(); // Clear any pending messages

  // Craft victory status message based on mode
  let message = pointsWon > 1 ? `${pointsWon} points` : 'the game';  
  if (winType === 'Gammon' || winType === 'Backgammon') {
    message = `a ${winType} and ${message}`;
  }
  let winMessage = resigningPlayer ? `${resigningPlayer} resigned.`
    : `${winner} bore off all checkers.`;
  
  // Concat winMessage (who won) with message (how many points)
  if (state.gameMode === 'money') {
    winMessage = `${winMessage} ${winner} wins $${moneyPayoutAmount} (${message})!`;
  } else {
    winMessage = `${winMessage} ${winner} wins ${message}!`;
  }

  if (sessionOver) {
    winMessage += ` 🎉 ${winner} wins `
      + `${state.gameMode === 'match' ? 'the Match' : 'all of the Money'}!`;
  }

  if (!resigningPlayer) {
    GAME_OVER_BANNER_DURATION_MS += 2000; // Increase banner time for a 'normal' win!
  }

  logStatus(winMessage, GAME_OVER_BANNER_DURATION_MS); // log initial victory message

  // Update UI components
  renderBoard();            // Ensure entire DOM enters game_over state
  updatePointLabels(null);  // Remove point numbers from the board
  updateScoreBoardUI();     // Update score displayed on the page
  updateCubePositionUI();   // Visually disable doubling cube
  renderDiceUI();           // Trigger renderChoiceDice

  // 5 second delay before prompting to play again
  setTimeout(() => {
    if (state.playAgainChoices.black === 'no' || state.playAgainChoices.white === 'no') {
      return;  // Do not display play again prompt if either player declined.
    }

    state.awaitingPlayAgainPrompt = false;  // Allow Y/N choice dice to render
    clearStatusQueue();

    let scoreStatusText = "";
    if (state.gameMode === 'money') {
      scoreStatusText = `Bankrolls are now Black: $${state.bankRolls.black} ` 
        + `and White: $${state.bankRolls.white}.`;
    } else if (state.gameMode === 'match') {
      scoreStatusText = `Match score is Black: ${state.scores.black}/${state.matchTarget}`
        + ` and White: ${state.scores.white}/${state.matchTarget}.`;
    } else {
      scoreStatusText = `Score is Black: ${state.scores.black} `
        + `and White: ${state.scores.white}.`;
    }

    logStatus(`${scoreStatusText} Play again?`);
    renderDiceUI(); // Display Y/N dice and update legend
  }, GAME_OVER_BANNER_DURATION_MS);  // Wait until Victory message is finished
}

/**
 * Transfers wagered funds from loser to winner in Money mode,
 * capping the payout at the loser's remaining bankroll. * 
 * @param {Player} winner
 * @param {Player} loser
 * @param {number} pointsWon - Base points * cube multiplier (e.g. 1, 2, 4...)
 * @returns {{ actualPayout: number, isSessionOver: boolean }}
 */
export function applyMoneyPayout(winner, loser, pointsWon) {
  const rawWager = pointsWon * (state.moneyAnte || 10);
  const actualPayout = Math.min(rawWager, state.bankRolls[loser]);

  state.bankRolls[loser] -= actualPayout;
  state.bankRolls[winner] += actualPayout;

  const isSessionOver = state.bankRolls[loser] <= 0;
  return { actualPayout, isSessionOver };
}

export function resetBankRolls(startingAmount = 100) {
  state.bankRolls.black = startingAmount;
  state.bankRolls.white = startingAmount;
}
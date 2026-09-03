// js/dice-rolling.js
import { state } from './state.js';
import { logStatus } from './ui.js';
import { updatePointLabels } from './board.js';
import { renderDiceUI, setDieValue, renderWinnerOpeningDice } from './dice-renderer.js';
import { updateCubePositionUI } from './doubling-cube.js';

// ==========================================
// ROLL LOGIC & OPENING ROLL
// ==========================================

// Helper function for easing roll animation (slows down gradually)
function animateDiceRoll(dieConfigs, onComplete) {
  let currentDelay = 40; // Initial fast tick speed (ms)
  const delayStep = 25; // Time added per tick
  const maxDelay = 220; // Threshold speed before stoping on final values
  const finalPause = 700; // Pause (ms) to let players view final roll values

  function tick() {
    if (currentDelay < maxDelay) {
      // Render random values
      dieConfigs.forEach((config) => {
        setDieValue(config.element, Math.floor(Math.random() * 6) + 1);
      });

      currentDelay += delayStep; // Slow down next tick
      setTimeout(tick, currentDelay);
    } else {
      dieConfigs.forEach((config) => {
        setDieValue(config.element, config.finalValue);
      });
      // Animation complete: invoke callback to finalize rolls
      setTimeout(() => {
        onComplete();
      }, finalPause); // Pause so result is clear before callback
    }
  }
  tick(); // Start the recursive animation loop
}

export function handleOpeningRoll(player) {
  // Ignore click if player has already rolled or is currently rolling
  const die1El = document.getElementById(`${player}-die-1`);
  if (!die1El) return;

  if (
    state.openingRolls[player] !== null ||
    die1El.dataset.animating === "true"
  ) {
    return;
  }

  // Mark die as animating independently
  die1El.dataset.animating = "true";
  const finalVal = Math.floor(Math.random() * 6) + 1;

  // Pass the element and its intended final value
  animateDiceRoll([{ element: die1El, finalValue: finalVal }], () => {
    state.openingRolls[player] = finalVal;
    delete die1El.dataset.animating; // Clear animation flag

    // Declare opponent for logStatus message
    const opponent = player === 'black' ? 'White' : 'Black';

    // Check if both players have finished rolling before evaluating winner
    if (
      state.openingRolls.white !== null &&
      state.openingRolls.black !== null
    ) {
      // Ensure no animations are ongoing on either side before proceeding
      const whiteDie = document.getElementById("white-die-1");
      const blackDie = document.getElementById("black-die-1");

      if (!whiteDie.dataset.animating && !blackDie.dataset.animating) {
        evaluateOpeningRoll();
      }
    } else {
      // Only one player has rolled -> display waiting message
      logStatus(`${player} rolled a ${finalVal}. Waiting for ${opponent} to roll.`);
    }
  });
}

function evaluateOpeningRoll() {
  const { white, black } = state.openingRolls;

  if (white > black) {
    state.currentPlayer = "white";
    state.currentRoll = [white, black];
    state.gamePhase = "turns";
    state.hasRolled = true;

    renderDiceUI();
    updatePointLabels(state.currentPlayer);
    // Display the opening move dice on the  winning player's board zone
    renderWinnerOpeningDice("white", white, black);
    updateCubePositionUI();

    logStatus(
      `White wins opening roll (${white} vs ${black}) and plays first!`,
    );
  } else if (black > white) {
    state.currentPlayer = "black";
    state.currentRoll = [black, white];
    state.gamePhase = "turns";
    state.hasRolled = true;

    renderDiceUI();
    updatePointLabels(state.currentPlayer);
    // Display the opening move dice on the winning player's board zone
    renderWinnerOpeningDice("black", black, white);
    updateCubePositionUI();

    logStatus(
      `Black wins the opening roll (${black} vs ${white}) and plays first!`,
    );
  } else {
    logStatus(`Tie roll (${white} vs ${black}) - Try again!`);
    // Reset for re-roll after 1 second delay
    setTimeout(() => {
      state.openingRolls = { white: null, black: null };
      renderDiceUI();
    }, 1000);
  }
}

export function handleDiceRoll(player) {
  // If still in opening phase, route keypresses to handleOpeningRoll
  if (state.gamePhase !== 'turns') {
    const blackDie = document.getElementById('black-die-1');
    const blackHasRolled = state.openingRolls.black !== null 
      || blackDie?.dataset.animating === 'true';
    
    if (!blackHasRolled) {
      handleOpeningRoll('black');
    } else if (state.openingRolls.white === null) {
      handleOpeningRoll('white');
    }
    return;
  }

  // Standard Turn Guard
  if (player !== state.currentPlayer || state.isRolling || state.hasRolled)
    return;

  state.isRolling = true;
  const die1El = document.getElementById(`${player}-die-1`);
  const die2El = document.getElementById(`${player}-die-2`);
  const raw1 = Math.floor(Math.random() * 6) + 1;
  const raw2 = Math.floor(Math.random() * 6) + 1;

  // Sort descending by default (highest value first)
  const sortedVals = [raw1, raw2].sort((a, b) => b - a);
  const finalD1 = sortedVals[0];
  const finalD2 = sortedVals[1];

  animateDiceRoll(
    [
      { element: die1El, finalValue: finalD1 },
      { element: die2El, finalValue: finalD2 },
    ],
    () => {
      state.isDouble = finalD1 === finalD2;
      // Double rolls generate 4 playable moves in backgammon
      state.currentRoll = state.isDouble
        ? [finalD1, finalD1, finalD1, finalD1]
        : [finalD1, finalD2];

      state.activeRoller = player;
      state.isRolling = false;
      state.hasRolled = true;

      // Update doubling cube UI state to disabled after rolling dice
      updateCubePositionUI();

      // Indicate that non-doubles can now be swapped by clicking
      const diceZone = document.getElementById(`${player}-dice-zone`);

      if (diceZone && finalD1 !== finalD2) {
        diceZone.classList.add("swappable");
      } else if (diceZone) {
        diceZone.classList.remove("swappable");
      }

      renderDiceUI();   // Render 2 or 4 dice based on currentRoll

      // Format message: "Black rolled: Double 4s!" or "White rolled: 5, 3"
      const rollMessage = state.isDouble
        ? `Double ${finalD1}s!`
        : `${finalD1}, ${finalD2}`;

      logStatus(`${player} rolled: ${rollMessage}`);
    },
  );
}

// Toggle die order for the current active roller
export function toggleDiceOrder(player) {
    // Only allow swapping during regular turns, after rolling, and if not doubles
    if (
        state.gamePhase !== 'turns' ||
        player !== state.currentPlayer ||
        !state.hasRolled ||
        state.currentRoll.length !== 2 ||
        state.currentRoll[0] === state.currentRoll[1]
    ) {
        return;
    }

    // Swap the values in state
    state.currentRoll.reverse();

    // Update DOM display
    const die1El = document.getElementById(`${player}-die-1`);
    const die2El = document.getElementById(`${player}-die-2`);

    if (die1El && die2El) {
        setDieValue(die1El, state.currentRoll[0]);
        setDieValue(die2El, state.currentRoll[1]);
    }
}
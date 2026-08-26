// js/dice-renderer.js - Handles the creation and rendering of dice UI.
import { state } from './state.js';
import { updateLegendUI } from './ui.js';

// ==========================
//  RENDER PIPS & TEXT CODES
// ==========================

export function setDieValue(element, value) {
  if (!element) return;

  // Convert numbers or numeric strings ('4' -> 4)
  const numValue = Number(value);

  // If it's a valid die roll (1 through 6) render pips
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 6) {
    element.dataset.value = numValue;
    element.textContent = ""; // Clear previous text content
    for (let i = 0; i < numValue; i++) {
      const pip = document.createElement("span");
      pip.className = "pip";
      element.appendChild(pip);
    }
  } else {
    // Otherwise, render text code (e.g. "R" - roll, "U" - undo, "D" - done, etc.)
    element.removeAttribute("data-value");
    element.innerHTML = "";
    element.textContent = value || "";
  }
}

// ================================
//  DYNAMIC DICE UI
// ================================

export function renderDiceUI() {

  // Helper: get or create a die
  function getOrCreateDie(playerColor, index) {
    const dieId = `${playerColor}-die-${index + 1}`;
    let dieEl = document.getElementById(dieId);

    if (!dieEl) {
      const targetZone = document.getElementById(`${playerColor}-dice-zone`);
      if (!targetZone) return null;

      dieEl = document.createElement("div");
      dieEl.id = dieId;
      dieEl.className = "die";
      
      targetZone.appendChild(dieEl);
    }
    // Reset className to 'die' every time it gets used
    dieEl.className = "die";
    return dieEl;
  }

  // Helper: remove dice above requested count
  function removeExtraDice(playerColor, count) {
    const targetZone = document.getElementById(`${playerColor}-dice-zone`);
    if (!targetZone) return;

    const dice = targetZone.querySelectorAll(".die");

    dice.forEach((die) => {
      const match = die.id.match(/-die-(\d+)$/);
      if (!match) return;

      const dieNumber = Number(match[1]);
      if (dieNumber > count) {
        die.remove();
      }
    });
  }

  // --- CUBE OFFER PENDING STATE ---
  if (state.isCubeOffered) {
    const respondingPlayer =
      state.cubeOfferedBy === "white" ? "black" : "white";
    const die1 = getOrCreateDie(respondingPlayer, 0);
    const die2 = getOrCreateDie(respondingPlayer, 1);

    if (die1 && die2) {
      die1.style.display = "";
      die2.style.display = "";
      setDieValue(die1, "Y");
      setDieValue(die2, "N");
      die1.classList.remove("used");
      die2.classList.remove("used");
    }

    removeExtraDice(respondingPlayer, 2);
    
    updateLegendUI();
    return;
  }

  // Update legend back to  standard controls when cube offer is resolved
  updateLegendUI();

  // Opening Roll Phase
  if (state.gamePhase === "opening_roll") {
    ["white", "black"].forEach((playerColor) => {
      const die1 = getOrCreateDie(playerColor, 0);
      const die2 = getOrCreateDie(playerColor, 1);

      // Only one die is needed during opening roll
      if (die2) die2.style.display = "none";

      if (die1) {
        die1.style.display = "";
        // If this player hasn't rolled yet, show 'R'
        if (state.openingRolls[playerColor] === null) {
          setDieValue(die1, "R");
        } else {
          // Show their rolled value
          setDieValue(die1, state.openingRolls[playerColor]);
        }
      }
      // Opening roll should never have dice 3/4
      removeExtraDice(playerColor, 2);
    });
    return;
  }

  // Regular turn
  const player = state.currentPlayer;
  if (!player) return;

  const zone = document.getElementById(`${player}-dice-zone`);
  if (!zone) return;

  // Primary dice elements
  const die1 = getOrCreateDie(player, 0);
  const die2 = getOrCreateDie(player, 1);

  if (!die1 || !die2) return;

  // Before roll state
  if (!state.hasRolled) {
    removeExtraDice(player, 2);
    setDieValue(die1, "R");
    setDieValue(die2, "R");
    die1.classList.remove("used");
    die2.classList.remove("used");
    die1.style.display = "";
    die2.style.display = "";
    return;
  }

  // Store how many moves/dice remain
  const movesMade = state.moveHistory.length;
  const movesLeft = state.currentRoll.length;

  // If doubles rolled
  if (state.isDouble) {
    // Total individual dice consumed across snapshots
    const usedCount = state.moveHistory.reduce((total, snapshot) => {
      return total + (snapshot.consumedDice ? snapshot.consumedDice.length : 1);
    }, 0);

    // When all 4 moves are finished -> show U U U D
    if (movesLeft === 0 && movesMade > 0) {
      for (let i = 0; i < 4; i++) {
        const dieEl = getOrCreateDie(player, i);
        if (!dieEl) continue;
        dieEl.style.display = "";

        if (i < 3) {
          setDieValue(dieEl, "U");
          dieEl.classList.remove("used");
        } else {
          setDieValue(dieEl, "D");
          dieEl.classList.remove("used");
        }
      }
      removeExtraDice(player, 4);
      return;
    }

    // Active playing phase -> show 'U' for spent dice, number for remaining
    for (let i = 0; i < 4; i++) {
      const dieEl = getOrCreateDie(player, i);
      if (!dieEl) continue;
      dieEl.style.display = "";

      if (i < usedCount) {
        setDieValue(dieEl, "U");
        dieEl.classList.remove("used");
      } else {
        const rollIndex = i - usedCount;
        setDieValue(dieEl, state.currentRoll[rollIndex]);
        dieEl.classList.remove("used");
      }
    }

    removeExtraDice(player, 4);
    return;
  }

  // Normal two-dice roll
  removeExtraDice(player, 2);

  // When all moves are completed on a normal roll -> Show U D
  if (movesLeft === 0 && movesMade > 0) {
    setDieValue(die1, "U");
    setDieValue(die2, "D");
    die1.classList.remove("used");
    die2.classList.remove("used");
    die1.style.display = "";
    die2.style.display = "";
    return;
  }

  // No moves made yet
  if (movesMade === 0) {
    setDieValue(die1, state.currentRoll[0]);
    setDieValue(die2, state.currentRoll[1]);
    die1.classList.remove("used");
    die2.classList.remove("used");
    die1.style.display = "";
    die2.style.display = "";
    return;
  }

  // One move made, one die remains
  if (movesMade > 0 && movesLeft > 0) {
    setDieValue(die1, "U");
    setDieValue(die2, state.currentRoll[0]);
    die1.classList.remove("used");
    die2.classList.remove("used");
    die1.style.display = "";
    die2.style.display = "";
    return;
  }
}

// ========================================
// OPENING ROLL RESULT
// ========================================

export function renderWinnerOpeningDice(winner, higherVal, lowerVal) {
    const die1El = document.getElementById(`${winner}-die-1`);
    const die2El = document.getElementById(`${winner}-die-2`);
    // Display winning roll
    if (die1El) {
        die1El.style.display = '';
        setDieValue(die1El, higherVal);
    }
    if (die2El) {
        die2El.style.display = '';
        setDieValue(die2El, lowerVal);
    } 
}
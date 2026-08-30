// js/dice.js - Contains dice rolling logic and turn UI toggling.
import { handleResignation, resetGame, state, switchTurn } from './state.js';
import { handleCubeClick, handleCubeMouseLeave, resolveCubeOffer, updateCubePositionUI } from './doubling-cube.js';
import { handleDiceRoll, handleOpeningRoll, toggleDiceOrder } from './dice-rolling.js';
import { renderDiceUI, setDieValue } from './dice-renderer.js';
import { undoLastMove } from './moves.js';
import { clearStatusQueue, logStatus, updateLegendUI } from './ui.js';

export function handleDieClick(player, dieNumber, event) {
    // Prevent any clicks if the game has ended
    if (state.gamePhase === 'game_over') {
      handlePostGameDieClick(event);
      return;
    }

    // Handle resign decision phase (Y/N)
    if (state.isResignOffered) {
        if (player !== state.resignOfferedBy) return;

        const targetEl = document.getElementById(`${player}-die-${dieNumber}`);
        if (!targetEl) return;

        const content = targetEl.textContent.trim();

        if (content === 'Y') {
          // Player confirmed resignation
          handleResignation(player);
          renderDiceUI();
        } else if (content === 'N') {
          // Player canceled resignation
          state.isResignOffered = false;
          state.resignOfferedBy = null;
          clearStatusQueue();
          logStatus(`${player}'s turn. Roll or Resign.`);
          updateCubePositionUI();
          renderDiceUI();
        }
        return;
    }

    // Handle opening roll phase (any player can click their initial die)
    if (state.gamePhase === 'opening_roll') {
        handleOpeningRoll(player);
        return;
    }

    // --- CUBE DECISION HANDLING ---
    if (state.isCubeOffered) {
        const respondingPlayer = state.cubeOfferedBy === 'white' ? 'black' : 'white';
        if (player !== respondingPlayer) return;

        const targetEl = document.getElementById(`${player}-die-${dieNumber}`);
        if (!targetEl) return;
        const content = targetEl.textContent.trim();
        const targetValue = state.cubeValue === 1 ? 2 : state.cubeValue * 2;
        if (content === 'Y') {
            resolveCubeOffer(true, targetValue);
        } else if (content === 'N') {
            resolveCubeOffer(false, targetValue);
        }
        return;
    }

    // Only current player can act during regular turns
    if (player !== state.currentPlayer) return;

    const targetEl = document.getElementById(`${player}-die-${dieNumber}`);
    if (!targetEl) return;

    // Retrieve displayed code ('R', 'U', 'D') or inspect pips
    const content = targetEl.textContent.trim();
    if (content === 'R' && !state.hasRolled) {
        handleDiceRoll(player);
    } else if (content === 'Q' && !state.hasRolled) {
      // Trigger resign confirmation
      state.isResignOffered = true;
      state.resignOfferedBy = player;
      clearStatusQueue(); // Clear older messages
      logStatus("Are you sure you want to resign?");
      updateCubePositionUI(); // Deactivate cube while pending
      renderDiceUI();
    } else if (content === 'U') {
        undoLastMove();
        renderDiceUI();
    } else if (content === 'D') {
        switchTurn();
    } else if (state.hasRolled && state.currentRoll.length === 2 && state.moveHistory.length === 0) {
        // Swap dice order if initial roll values are clicked
        toggleDiceOrder(player);
    }
}

// Attach event listeners to dice elements once DOM is ready
export function initDiceListeners() {
    const blackZone = document.getElementById('black-dice-zone');
    const whiteZone = document.getElementById('white-dice-zone');

    [blackZone, whiteZone].forEach(zone => {
        if (!zone) return;

        zone.addEventListener('click', event => {
            const dieEl = event.target.closest('.die');
            if (!dieEl) return;

            const match = dieEl.id.match(/^(black|white)-die-(\d+)$/);
            if (!match) return;

            const player = match[1];
            const dieNumber = Number(match[2]);

            handleDieClick(player, dieNumber, event);
        });
    });    

    // Doubling Cube handler
    const cubeEl = document.getElementById('doubling-cube');
    if (cubeEl) {
        cubeEl.addEventListener('click', () => {
            handleCubeClick(state.currentPlayer);
        });
        cubeEl.addEventListener('mouseleave', handleCubeMouseLeave);
    }
}

// ==========================================
// TURN RESET
// ==========================================

export function resetDiceUI() {
    state.moveHistory = []; // Reset history for new turn

    ['white', 'black'].forEach(player => {
        const zone = document.getElementById(`${player}-dice-zone`);
        const die1 = document.getElementById(`${player}-die-1`);
        const die2 = document.getElementById(`${player}-die-2`);

        if (!zone) return;
        zone.classList.remove('swappable');

        if (player === state.currentPlayer) {            
            // Reset die elements back to 'R' state
            if (die1) {
                setDieValue(die1, 'R');
                die1.classList.remove('used');
                die1.style.display = '';
            }
            if (die2) {
                setDieValue(die2, 'Q');
                die2.classList.remove('used');
                die2.style.display = '';
            }
        } else {
            // Clear inactive player's dice
            if (die1) {
                setDieValue(die1, '');
                die1.classList.remove('used');
                die1.style.display = '';
            }
            if (die2) {
                setDieValue(die2, '');
                die2.classList.remove('used');
                die2.style.display = '';
            }
        }

        // Remove dice 3 and 4 form previous doubles
        const extraDice = zone.querySelectorAll('.die');
        extraDice.forEach(die => {
            const match = die.id.match(/-die-(\d+)$/);
            if (match && Number(match[1]) > 2) {
                die.remove();
            }
        });
    });

    updateCubePositionUI(); // Refresh cube clickable state for new player
}

export function updateTurnUI() {
    const whiteZone = document.getElementById('white-dice-zone');
    const blackZone = document.getElementById('black-dice-zone');

    if (!whiteZone || !blackZone) return;

    if (state.isCubeOffered) {
        // Only show the responding player's dice zone during cube offer decisions
        const respondingPlayer = state.cubeOfferedBy === 'white' ? 'black' : 'white';

        if (respondingPlayer === 'white') {
            whiteZone.style.display = 'flex';
            blackZone.style.display = 'none';
        } else {
            whiteZone.style.display = 'none';
            blackZone.style.display = 'flex';
        }
        return;
    }

    // Standard turn UI logic
    if (state.gamePhase === 'opening_roll') {
        document.body.classList.add('opening-roll-phase');
        // Both dice zones must be visible so white and black can each roll 1 die
        whiteZone.style.display = 'flex';
        blackZone.style.display = 'flex';
    } else {
        document.body.classList.remove('opening-roll-phase');
        // Regular turns: hide inactive player's dice zone
        if (state.currentPlayer === 'white') {
            whiteZone.style.display = 'flex';
            blackZone.style.display = 'none';
        } else {
            whiteZone.style.display = 'none';
            blackZone.style.display = 'flex';
        }
    }
}

export function refreshDiceForNewTurn() {
    resetDiceUI();
    renderDiceUI();
}

// =======================================
// POST GAME LOGIC
// =======================================
export function handlePostGameDieClick(event) {
  if (state.gamePhase !== 'game_over') return;

  // Find the clicked die
  const dieEl = event.target.closest('.die');
  if (!dieEl) return;

  // Match target action attribute or class
  const action = dieEl.dataset.action;
  const player = dieEl.dataset.player;
  if (!action || !player) return;

  if (action === 'play-again-yes') {
    state.playAgainChoices[player] = 'yes';

    // Render UI so both players see confirmation dice
    renderDiceUI();

    // Check if both players have agreed
    if (state.playAgainChoices.black === 'yes' && state.playAgainChoices.white === 'yes') {
      clearStatusQueue();      
      logStatus("Both players accepted! Starting a new game...", 2000);

      // Clear legend while waiting for game to reset
      // const legendEl = document.querySelector('.dice-legend');
      // if (legendEl) legendEl.innerHTML = '';

      // Disable click interaction on dice to prevent double-clicks
      document.querySelectorAll('.die').forEach(d => d.style.pointerEvents = 'none');

      setTimeout(() => {
        resetGame();
      }, 2000); // Briefly delay new game setup
    
    } else {
      clearStatusQueue();
      const opponent = player === 'black' ? 'white' : 'black';
      logStatus(`${player} wants to play again. Waiting for ${opponent}'s decision...`);
      renderDiceUI(); // Update dice UI to show single 'Y' 
    }
  }
  else if (action  === 'play-again-no') {
    state.playAgainChoices[player] = 'no';

    // Disable click interactions on all dice
    document.querySelectorAll('.die').forEach(d => d.style.pointerEvents = 'none');

    clearStatusQueue();
    logStatus(`${player} declined. Thank you for playing!`);

    // Delay clearing dice elements immediately
    setTimeout(() => {
      // Remove dice elements from both zones
      const choiceDice = document.querySelectorAll('.die');
      choiceDice.forEach(die => die.remove());
      // Clear the dice legend
      updateLegendUI();
    }, 1500);
  }
}

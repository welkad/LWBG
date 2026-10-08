// js/dice.js - Contains dice rolling logic and turn UI toggling.
import { handleResignation, resetGame, state, switchTurn } from './state.js';
import { handleCubeClick, handleCubeMouseLeave, resolveCubeOffer, updateCubePositionUI } from './doubling-cube.js';
import { handleDiceRoll, handleOpeningRoll, toggleDiceOrder } from './dice-rolling.js';
import { renderDiceUI, setDieValue } from './dice-renderer.js';
import { clearStatusQueue, logStatus, restorePreviousStatus, saveCurrentStatus, updateLegendUI } from './ui.js';
import { undoLastMove } from './moves.js';

/**
 * @typedef {'black' | 'white' } PlayerColor
 * @param {PlayerColor} player
 * @param {number} dieNumber 
 * @param {Event} [event]
 */
export function handleDieClick(player, dieNumber, event) {
  if (state.isInputLocked) return;

  // Prevent any clicks if the game has ended
  if (state.gamePhase === 'game_over') {
    handlePostGameDieClick(event, null, player);
    return;
  }

  // Handle resign decision phase (Y/N)
  if (state.isResignOffered) {
    if (player !== state.resignOfferedBy) return;

    const targetEl = document.getElementById(`${player}-die-${dieNumber}`);
    if (!targetEl) {
      console.error(`${targetEl} not found!`);
      return;
    }

    const content = targetEl.textContent.trim();
    if (content === 'Y') {      
      handleYesAction();  // Player confirmed resignation
    } else if (content === 'N') {
      handleNoAction();
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
    if (!targetEl) {
      console.error(`${targetEl} not found!`);
      return;
    }

    const content = targetEl.textContent.trim();    
    if (content === 'Y') {
      handleYesAction();
    } else if (content === 'N') {
      handleNoAction();
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

/** 
 * Attach event listeners to dice and legend elements once DOM is ready
 */ 
export function initDiceListeners() {
  const blackZone = document.getElementById('black-dice-zone');
  const whiteZone = document.getElementById('white-dice-zone');

  [blackZone, whiteZone].forEach(zone => {
    if (!zone) return;

    /** @param {MouseEvent} event */
    const handleInteraction = (event) => {
      // Prevent native browser right-click menu
      if (event.type === 'contextmenu') {
        event.preventDefault();
      }    

      const target = /** @type {HTMLElement | null} */ (event.target);
      if (!target) return;
      const dieEl = target.closest('.die');
      if (!dieEl) return;
      const match = dieEl.id.match(/^(black|white)-die-(\d+)$/);
      if (!match) return;

      const player = /** @type {'black' | 'white'} */ (match[1]);
      const dieNumber = Number(match[2]);

      handleDieClick(player, dieNumber, event);
    };

    zone.addEventListener('click', handleInteraction);
    zone.addEventListener('contextmenu', handleInteraction);
  });

  // Doubling Cube handler
  const cubeEl = document.getElementById('doubling-cube');
  if (cubeEl) {
      cubeEl.addEventListener('click', () => {
          handleCubeClick(state.currentPlayer);
      });
      cubeEl.addEventListener('mouseleave', handleCubeMouseLeave);
  }

  // Listen for legend button mouse interactions
  const legendActions = [
    { id: 'action-roll-btn', handler: () => handleDiceRoll(state.currentPlayer) },
    { id: 'action-undo-btn', handler: () => { undoLastMove(); renderDiceUI(); } },
    { id: 'action-done-btn', handler: () => switchTurn() },
    { id: 'action-yes-btn', handler: handleYesAction },
    { id: 'action-no-btn', handler: handleNoAction }
  ];

  legendActions.forEach(({ id, handler }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', handler);
    } else {
      console.warn(`[initDiceListeners] Button with id '${id}' was not found`);
    }
  });

  const resignBtn = document.getElementById('action-resign-btn');
  if (resignBtn) {
    resignBtn.addEventListener('click', () => {
      // Allow current active player to resign during their own turn
      if (state.gamePhase === 'turns' && state.currentPlayer !== null
        && !state.isResignOffered && !state.isCubeOffered) {
        // Trigger resign confirmation
        saveCurrentStatus();
        state.isResignOffered = true;
        state.resignOfferedBy = state.currentPlayer;
        clearStatusQueue(); // Clear older messages

        const message = state.cubeValue === 1 ? 'the game' : `${state.cubeValue} points`;
        logStatus(`Are you sure you want to resign and concede ${message}?`);
        updateCubePositionUI(); // Deactivate cube while pending
        updateLegendUI();
        renderDiceUI();
      }
    });
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
            setDieValue(die2, 'R');
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
/**
 * 
 * @param {Event | string | null | undefined} eventOrPlayer 
 * @param {'yes' | 'no' | null} [choice]
 * @param {'black' | 'white' | null} selectPlayer
 * @returns 
 */
export function handlePostGameDieClick(eventOrPlayer, choice = null, selectPlayer = null) {
  if (state.gamePhase !== 'game_over') return;

  let selectedChoice = choice;  
  let player = null;  
  if (selectPlayer) {
    player = selectPlayer;
  } else if (typeof eventOrPlayer === 'string') {
    player = eventOrPlayer;
  }  

  // Extract attributes from data
  if (eventOrPlayer && typeof eventOrPlayer === 'object' && 'target' in eventOrPlayer) {
    const target = /** @type {HTMLElement | null} */ (eventOrPlayer.target);
    const dieEl = target ? /** @type {HTMLElement | null} */ (target.closest('.die')) : null;
    if (dieEl) {
      const match = dieEl.id?.match(/^(black|white)-die/);
      if (match) player = match[1];

      const content = dieEl.textContent.trim();
      if (content === 'Y') selectedChoice = 'yes';
      if (content === 'N') selectedChoice = 'no';
    
      selectedChoice && (selectedChoice = selectedChoice
        || dieEl.dataset.choice 
        || (dieEl.dataset.action === 'play-again-yes' ? 'yes' : 'no' ));
      player = dieEl.dataset.player || player;
    }
  }

  if (!selectedChoice) return;

  if (selectedChoice === 'yes') {
    // If triggered by keyboard without context, default first 'Y' to Black
    if (!player) {
      player = !state.playAgainChoices.black ? 'black' : 'white';
    }

    if (player === 'black' || player === 'white') {
      state.playAgainChoices[player] = 'yes';
    }
    renderDiceUI();  // Render UI so both players see confirmation dice

    // Check if both players agreed (or single keyboard decision)
    if (state.playAgainChoices.black === 'yes' && state.playAgainChoices.white === 'yes') {
      clearStatusQueue();      
      logStatus("Both players accepted! Starting a new game...", 2000);

      // Disable click interaction on dice to prevent double-clicks
      document.querySelectorAll('.die').forEach(d => {
        const el = /** @type {HTMLElement} */ (d);
        el.style.pointerEvents = 'none'
      });

      setTimeout(() => {
        resetGame(); // Or initBoardState(); renderBoard(); updateTurnUI();
      }, 2000);  // Briefly delay new game setup
    } else {
      clearStatusQueue();
      const opponent = player === 'black' ? 'white' : 'black';
      logStatus(`${player} wants to play again. Waiting on ${opponent}'s decision.`);
      renderDiceUI(); // Update dice UI to show single 'Y' 
    }
  } 
  else if (selectedChoice === 'no') {
    // Determine if someone already voted 'yes'
    const blackVoted = state.playAgainChoices.black === 'yes';
    const whiteVoted = state.playAgainChoices.white === 'yes';    

    // Try to infer who declined (if not alreay known by mouse-click)
    let decliner = player;
    if (!decliner) {
      if (blackVoted) decliner = 'white';
      else if (whiteVoted) decliner = 'black';
      // If neither player voted, decliner remains null
    }
    if (decliner && (decliner === 'black' || decliner === 'white')) {
      state.playAgainChoices[decliner] = 'no';
    }
    // Disable click interactions on all dice
    document.querySelectorAll('.die').forEach(d => {
      const el = /** @type {HTMLElement} */ (d);
      el.style.pointerEvents = 'none';
    });
    clearStatusQueue();    
    // Dynamic message based on input source content
    const declineMsg = decliner 
      ? `${decliner} declined another game.`
      : 'Another game was declined.';
    logStatus(`${declineMsg} Thank you for playing!`, 3000);
    const blackPlural = state.scores.black === 1 ? 'point' : 'points';
    const whitePlural = state.scores.white === 1 ? 'point' : 'points';
    logStatus(`Final Score: Black ${state.scores.black} ${blackPlural}` + ' ' 
      + `White ${state.scores.white} ${whitePlural}.`);

    // Delay clearing dice elements immediately
    setTimeout(() => {
      // Remove dice elements from both zones
      document.querySelectorAll('.die').forEach(die => die.remove());
       // Clear the dice legend
      updateLegendUI();
    }, 1500);
  }
}

/**
 * Execute 'Yes' / Confirm action for active game prompts.
 */
export function handleYesAction() {
  if (state.gamePhase === 'game_over') {
    handlePostGameDieClick(null, 'yes', null);
    return;
  }

  if (state.isResignOffered) {
    const resigningPlayer = state.resignOfferedBy || state.currentPlayer;
    handleResignation(resigningPlayer);
    renderDiceUI();
    return;
  }

  if (state.isCubeOffered) {
    const targetValue = state.cubeValue === 1 ? 2 : state.cubeValue * 2;
    resolveCubeOffer(true, targetValue);
  }
}

/**
 * Execute 'No' / Cancel action for active game prompts.
 */
export function handleNoAction() {
  if (state.gamePhase === 'game_over') {
    handlePostGameDieClick(null, 'no', null);
    return;
  }

  if (state.isResignOffered) {
    state.isResignOffered = false;
    state.resignOfferedBy = null;

    clearStatusQueue();
    restorePreviousStatus();
    updateLegendUI();
    updateCubePositionUI();
    renderDiceUI();
    return;
  }

  if (state.isCubeOffered) {
    const targetValue = state.cubeValue === 1 ? 2 : state.cubeValue * 2;
    resolveCubeOffer(false, targetValue);
  }
}
// js/doubling-cube.js - Contains all doubling cube logic.
import { handleResignation, state } from './state.js';
import { logStatus, resetStatusToDefault, clearStatusQueue } from './ui.js';
import { renderDiceUI } from './dice-renderer.js';

const DISPLAY_TIME = 2000; // Temporary message duration

export function handleCubeClick(player) {
    // Disable cube if game is over or an offer is pending
    if (state.isCubeOffered || state.isResignOffered || state.gamePhase === 'game_over') {
      return;
    }
    // Disable cube during opening roll phase
    if (state.gamePhase === 'opening_roll') {        
        logStatus("Doubling cube is disabled during the opening roll.",
          DISPLAY_TIME);
        return;
    }
    // Disable if a cube offer is already pending
    if (state.isCubeOffered) {        
        logStatus("A cube decision is currently pending.", DISPLAY_TIME);
        return;
    }
    // Disable if not player's turn or after rolling
    if (player !== state.currentPlayer || state.isRolling) {        
        logStatus("You can only double on your turn.", DISPLAY_TIME);
        return;
    }
    // Cannot double after rolling the dice
    if (state.hasRolled) {    
        logStatus("You cannot double after rolling the dice!", DISPLAY_TIME);
        return;
    }
    // Cube must be in center or 'owned' by the current player
    if (state.cubeOwner !== 'center' && state.cubeOwner !== player) {       
        logStatus(`You cannot double - ${state.cubeOwner} owns the doubling cube!`,
          DISPLAY_TIME);
        return;
    }
    // Determine proposed next value
    const targetValue = state.cubeValue === 1 ? 2 : state.cubeValue * 2;
    if (targetValue > 64) {       
        logStatus("Cube value cannot exceed 64.", DISPLAY_TIME);
        return;
    }
    // Set pending offer state
    state.isCubeOffered = true;
    state.cubeOfferedBy = player;
    const respondingPlayer = player === 'black' ? 'white' : 'black';

    // Refresh cube UI so classes update immediately
    updateCubePositionUI();

    // Clear stale queued messages (e.g. "Turn switched") so Doubles prompt can render
    clearStatusQueue();
    logStatus(`${player} offered to double the cube to ${targetValue}. Does ${respondingPlayer} accept?`);

    // Render interactive dice for opponent
    renderDiceUI();
}

/**
 * Handles the opponent's accept or decline decision.
 */
export function resolveCubeOffer(accepted, targetValue) {
    const offeringPlayer = state.cubeOfferedBy;
    const opponent = offeringPlayer === 'black' ? 'white' : 'black';

    // Clear flags and wipe any stale status messages
    state.isCubeOffered = false;
    state.cubeOfferedBy = null;
    clearStatusQueue();

    if (accepted) {
        // Update cube value and assign ownership to accepting player
        state.cubeValue = targetValue;        
        state.cubeOwner = opponent;
        state.currentPlayer = offeringPlayer; // Player who offered Cube continues their turn

        logStatus(
            `${opponent} accepted the cube! ...${offeringPlayer}'s turn to play.`
        );        
        // Move cube to new owner's tray
        updateCubePositionUI();

        // Show offering player's dice zone again
        const currentZone = document.getElementById(`${offeringPlayer}-dice-zone`);
        if (currentZone) {
            currentZone.style.display = 'flex';
        }
        // Restore normal dice UI for the player whose turn it is
        renderDiceUI();
    } else {
        // Opponent declined -> Resign current game
        handleResignation(opponent);
    }
}

// Helper function if mouse  pointer leaves cube during opening
export function handleCubeMouseLeave() {
    // Restore any previous status message immediately when cursor exits
    resetStatusToDefault(DISPLAY_TIME);    
}

// Helper function to update positioning in CSS 
export function updateCubePositionUI() {
    const cubeEl = document.getElementById('doubling-cube');
    if (!cubeEl) return;

    // Move cube to appropriate container based on owner
    let targetContainerId = 'bar';  // default center position
    if (state.cubeOwner === 'black') {
        targetContainerId = 'doubling-cube-tray';        
    } else if (state.cubeOwner === 'white') {
        targetContainerId = 'home-bar';
    }
    const targetContainer = document.getElementById(targetContainerId);
    if (targetContainer && cubeEl.parentElement !== targetContainer) {
        targetContainer.appendChild(cubeEl);
    }

    // Display 64 when value is 1 (standard physical set display)
    cubeEl.textContent = state.cubeValue === 1 ? 64 : state.cubeValue;

    // Set data attribute for CSS targeting
    cubeEl.setAttribute('data-owner', state.cubeOwner);

    // Determine if the cube should be visually active/clickable
    const isOpening = state.gamePhase === 'opening_roll';    
    const isGameOver = state.gamePhase === 'game_over';
    const isOwnedByOpponent = state.cubeOwner !== 'center'
      && state.cubeOwner !== state.currentPlayer;

    // Apply proper CSS class state
    if (state.isCubeOffered) {
      cubeEl.classList.add('pending-offer');
      cubeEl.classList.remove('active', 'disabled');      
    } else if (isGameOver || isOpening || state.hasRolled || isOwnedByOpponent
      || state.isResignOffered) {
        cubeEl.classList.add('disabled');
        cubeEl.classList.remove('active', 'pending-offer');
    } else {
      cubeEl.classList.add('active');
      cubeEl.classList.remove('disabled', 'pending-offer');
    }
}

// js/doubling-cube.js - Contains all doubling cube logic.
import { state } from './state.js';
import { logStatus, resetStatusToDefault, clearStatusQueue } from './ui.js';
import { renderDiceUI } from './dice-renderer.js';

export function handleCubeClick(player) {
    // Disable cube during opening roll phase
    if (state.gamePhase === 'opening_roll') {        
        logStatus("Doubling cube is disabled during the opening roll.", 1000);
        return;
    }
    // Disable if a cube offer is already pending
    if (state.isCubeOffered) {        
        logStatus("A cube decision is currently pending.", 1000);
        return;
    }
    // Disable if not player's turn or after rolling
    if (player !== state.currentPlayer || state.isRolling) {        
        logStatus("You can only double on your turn.", 1000);
        return;
    }
    // Cannot double after rolling the dice
    if (state.hasRolled) {    
        logStatus("You cannot double after rolling the dice!", 1000);
        return;
    }
    // Cube must be in center or 'owned' by the current player
    if (state.cubeOwner !== 'center' && state.cubeOwner !== player) {       
        logStatus(`You cannot double - ${state.cubeOwner} owns the doubling cube!`, 1500);
        return;
    }
    // Determine proposed next value
    const targetValue = state.cubeValue === 1 ? 2 : state.cubeValue * 2;
    if (targetValue > 64) {       
        logStatus("Cube value cannot exceed 64.", 1000);
        return;
    }
    // Set pending offer state
    state.isCubeOffered = true;
    state.cubeOfferedBy = player;
    const respondingPlayer = player === 'white' ? 'black' : 'white';

    // Clear stale queued messages (e.g. "Turn switched") so Doubles prompt can render
    clearStatusQueue();
    logStatus(`${player} offered to double the cube to ${targetValue}. Waiting for ${respondingPlayer}...`);

    // Render interactive dice for opponent
    renderDiceUI();
}

/**
 * Handles the opponent's accept or decline decision.
 */
export function resolveCubeOffer(accepted, targetValue) {
    const offeringPlayer = state.cubeOfferedBy;
    const opponent = offeringPlayer === 'white' ? 'black' : 'white';

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
            `${opponent} accepted the cube! Value is now ${state.cubeValue}. ${opponent} now owns the cube.`,
            2000
        );
        logStatus(`${offeringPlayer}'s turn to play.`);
        
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
        const cube = state.cubeValue;
        const message = cube > 1 ? `${cube} points` : 'the game';
        logStatus(`${opponent} declined the cube and resigned! ${offeringPlayer} wins ${message}!`);        
        // Award points equal to current cube value before the declined double
        state.scores[offeringPlayer] += state.cubeValue;       
        renderDiceUI();
    }
}

// Helper function if mouse  pointer leaves cube during opening
export function handleCubeMouseLeave() {
    // Restore any previous status message immediately when cursor exits
    resetStatusToDefault(1000);    
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
    const isOwnedByOpponent = state.cubeOwner !== 'center' && state.cubeOwner !== state.currentPlayer;

    // Disable cube for opening roll, player already rolled, or opponent owns it
    if (!isOpening && (state.hasRolled || isOwnedByOpponent)) {
        cubeEl.classList.add('disabled');
        cubeEl.classList.remove('active');
    } else {
        cubeEl.classList.add('active');
        cubeEl.classList.remove('disabled');
    }
}

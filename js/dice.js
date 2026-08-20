// js/dice.js - Contains all doubling cube and dice rolling logic, turn UI toggling, and roll animations.
import { state, switchTurn } from './state.js';
import { logStatus, resetStatusToDefault } from './ui.js';
import { updatePointLabels } from './board.js';
import { undoLastMove } from './moves.js';

// ==========================
//  RENDER PIPS & TEXT CODES
// ==========================

export function setDieValue(element, value) {
    if (!element) return;

    // Convert numbers or numeric strings ('4' -> 4)
    const numValue = Number(value);

    // If it's a valid die roll (1 through 6) render pips
    if(!isNaN(numValue) && numValue >= 1 && numValue <= 6) {
        element.dataset.value = numValue;
        element.textContent = ''; // Clear previous text content
        for (let i = 0; i < numValue; i++) {
            const pip = document.createElement('span');
            pip.className = 'pip';
            element.appendChild(pip);
        }
    } else {
        // Otherwise, render text code (e.g. "R" - roll, "U" - undo, "D" - done, etc.)
        element.removeAttribute('data-value');
        element.innerHTML = '';
        element.textContent = value || '';
    }
}

// ================================
//  DYNAMIC DICE & UNDO / DONE UI
// ================================

export function renderDiceUI() {    
    // Helper: get or create a die
    function getOrCreateDie(playerColor, index) {
        const dieId = `${playerColor}-die-${index + 1}`;
        let dieEl = document.getElementById(dieId);

        if (!dieEl) {
            const targetZone = document.getElementById(`${playerColor}-dice-zone`);
            if (!targetZone) return null;

            dieEl = document.createElement('span');
            dieEl.id = dieId;
            dieEl.className = 'die';

            dieEl.addEventListener('click', () => {
                handleDieClick(playerColor, index + 1);
            });
            targetZone.appendChild(dieEl);
        }
        return dieEl;
    }

    // Helper: remove dice above requested count    
    function removeExtraDice(playerColor, count) {
        const targetZone = document.getElementById(`${playerColor}-dice-zone`);
        if (!targetZone) return;

        const dice = targetZone.querySelectorAll('.die');

        dice.forEach(die => {
            const match = die.id.match(/-die-(\d+)$/);
            if (!match) return;

            const dieNumber = Number(match[1]);
            if (dieNumber > count) {
                die.remove();
            }
        });
    }

    // Opening Roll
    if (state.gamePhase === 'opening_roll') {
        ['white', 'black'].forEach(playerColor => {
            const die1 = getOrCreateDie(playerColor, 0);
            const die2 = getOrCreateDie(playerColor, 1);

            // Only one die is needed during opening roll
            if (die2) die2.style.display = 'none';

            if (die1) {
                die1.style.display = '';
                // If this player hasn't rolled yet, show 'R'
                if (state.openingRolls[playerColor] === null) {
                    setDieValue(die1, 'R');
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

    // Current player's dice    
    const die1 = getOrCreateDie(player, 0);
    const die2 = getOrCreateDie(player, 1);

    if (!die1 || !die2) return;

    // Before roll
    if (!state.hasRolled) {
        removeExtraDice(player, 2);

        setDieValue(die1, 'R');
        setDieValue(die2, 'R');
        die1.classList.remove('used');
        die2.classList.remove('used');
        die1.style.display = '';
        die2.style.display = '';

        return;
    }

    // Store how many moves have been made
    const movesMade = state.moveHistory.length;
    const movesLeft = state.currentRoll.length;

    // When all moves are completed
    if (movesLeft === 0 && movesMade > 0) {
        removeExtraDice(player, 2);

        setDieValue(die1, 'U');
        setDieValue(die2, 'D');
        die1.classList.add('used');
        die2.classList.remove('used');
        die1.style.display = '';
        die2.style.display = '';

        return;
    }

    // ==========================================
    // DETERMINE ORIGINAL NUMBER OF DICE
    // ==========================================
    // Normal roll: movesMade + movesLeft = 2
    // Doubles: movesMade + movesLeft = 4
    //
    const totalDice = movesMade + movesLeft;

    // Doubles
    if (totalDice === 4) {
        // Ensure four dice exist
        for (let i = 0; i < 4; i++) {
            const dieEl = getOrCreateDie(player, i);
            if (!dieEl) continue;

            dieEl.style.display = '';

            if (i < movesMade) {
                // This die represents a completed move
                setDieValue(dieEl, 'U');
                dieEl.classList.add('used');
            } else {
                // This die represents a remaining playable die
                const rollIndex = i - movesMade;
                setDieValue(dieEl, state.currentRoll[rollIndex]);
                dieEl.classList.remove('used');
            }
        }

        // Make sure there are never any stale die beyond 4
        removeExtraDice(player, 4);

        return;
    }

    // Normal two-dice roll
    removeExtraDice(player, 2);

    // No moves made yet
    if (movesMade === 0) {
        setDieValue(die1, state.currentRoll[0]);
        setDieValue(die2, state.currentRoll[1]);
        die1.classList.remove('used');
        die2.classList.remove('used');
        die1.style.display = '';
        die2.style.display = '';
        return;
    }

    // One move made, one die remains
    if (movesMade > 0 && movesLeft > 0) {
        setDieValue(die1, 'U');
        setDieValue(die2, state.currentRoll[0]);
        die1.classList.add('used');
        die2.classList.remove('used');
        die1.style.display = '';
        die2.style.display = '';
        return;
    }
}

export function handleDieClick(player, dieNumber) {
    // Handle opening rolll phase (any player can click their initial die)
    if (state.gamePhase === 'opening_roll') {
        handleOpeningRoll(player);
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

// Attach event listeners to dice elements once DOM is ready
export function initDiceListeners() {
    // Attach Doubling Cube handler
    const cubeEl = document.getElementById('doubling-cube');
    if (cubeEl) {
        cubeEl.addEventListener('click', () => {
            handleCubeClick(state.currentPlayer);
        });
        cubeEl.addEventListener('mouseleave', handleCubeMouseLeave);
    }
}

// ======================================
//  DOUBLING CUBE
// ======================================

export function handleCubeClick(player) {
    // Disable cube during opening roll phase
    if (state.gamePhase === 'opening_roll') {
        logStatus("Doubling cube is disabled during the opening roll.", 1000);
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
        logStatus(`You cannot double - ${state.cubeOwner} owns the doubling cube!`, 1000);
        return;
    }

    // Increment cube value
    if (state.cubeValue === 1) {
        state.cubeValue = 2;
    } else if (state.cubeValue < 64) {
        state.cubeValue *= 2;
    }

    // Opposing player who accepts the double now 'owns' the cube
    const opponent = player === 'white' ? 'black' : 'white';
    state.cubeOwner = opponent;
    
    // Update UI element text
    const cubeEl = document.getElementById('doubling-cube');
    if (cubeEl) cubeEl.textContent = state.cubeValue;
    logStatus(`${player} doubled to ${state.cubeValue}. ${opponent} accepted and now owns the cube.`, 1500);
    updateCubePositionUI(); // Move cube to owner's side
}

// Helper function if mouse  pointer leaves cube during opening
function handleCubeMouseLeave() {
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

// ==========================================
// ROLL LOGIC & OPENING ROLL
// ==========================================

// Helper function for easing roll animation (slows down gradually)
function animateDiceRoll(dieConfigs, onComplete) {
    let currentDelay = 40;  // Initial fast tick speed (ms)
    const delayStep = 25;   // Time added per tick
    const maxDelay = 220;   // Threshold speed before stoping on final values
    const finalPause = 700; // Pause (ms) to let players view final roll values

    function tick() {
        if (currentDelay < maxDelay) {
            // Render random values
            dieConfigs.forEach(config => {
                setDieValue(config.element, Math.floor(Math.random() * 6) + 1);
            });

            currentDelay += delayStep; // Slow down next tick
            setTimeout(tick, currentDelay);
        } else {
            dieConfigs.forEach(config => {
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

    if (state.openingRolls[player] !== null || die1El.dataset.animating === 'true') {
        return;
    }

    // Mark die as animating independently
    die1El.dataset.animating = 'true';
    const finalVal = Math.floor(Math.random() * 6) + 1;

    // Pass the element and its intended final value
    animateDiceRoll([{ element: die1El, finalValue: finalVal }], () => {                       
        state.openingRolls[player] = finalVal;
        delete die1El.dataset.animating; // Clear animation flag

        // Log the individual opening roll result
        logStatus(`${player} rolled a ${finalVal}.`, 1000);

        // Check if both players have finished rolling before evaluating winner
        if (state.openingRolls.white !== null && state.openingRolls.black !== null) {
            // Ensure no animations are ongoing on either side before proceeding
            const whiteDie = document.getElementById('white-die-1');
            const blackDie = document.getElementById('black-die-1');

            if (!whiteDie.dataset.animating && !blackDie.dataset.animating) {
                evaluateOpeningRoll();
            }
        }
    });
}

function evaluateOpeningRoll() {
    const { white, black } = state.openingRolls;

    if (white > black) {
        state.currentPlayer = 'white';
        state.currentRoll = [white, black];
        state.gamePhase = 'turns';
        state.hasRolled = true;

        updateTurnUI();
        renderDiceUI();
        updatePointLabels(state.currentPlayer);
        // Display the opening move dice on the  winning player's board zone
        renderWinnerOpeningDice('white', white, black);
        updateCubePositionUI();

        logStatus(`White wins opening roll (${white} vs ${black}) and plays first!`);

    } else if (black > white) {
        state.currentPlayer = 'black';
        state.currentRoll = [black, white];
        state.gamePhase = 'turns';
        state.hasRolled = true;        

        updateTurnUI();
        renderDiceUI();
        updatePointLabels(state.currentPlayer);
        // Display the opening move dice on the winning player's board zone
        renderWinnerOpeningDice('black', black, white);
        updateCubePositionUI();
        
        logStatus(`Black wins opening roll (${black} vs ${white}) and plays first!`);

    } else {
        logStatus(`Tie roll (${white} vs ${black}) - Try again!`);        
        // Reset for re-roll after 1 second delay
        setTimeout(() => {
            state.openingRolls = { white: null, black: null};
            renderDiceUI();           
        }, 1000);
    }
}

function renderWinnerOpeningDice(winner, higherVal, lowerVal) {
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

// ==========================================
// TURN BASED ROLLING
// ==========================================

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

export function handleDiceRoll(player) {
    if (player !== state.currentPlayer || state.isRolling || state.hasRolled) return;

    state.isRolling = true;

    const die1El = document.getElementById(`${player}-die-1`);
    const die2El = document.getElementById(`${player}-die-2`);

    const raw1 = Math.floor(Math.random() * 6) + 1;
    const raw2 = Math.floor(Math.random() * 6) + 1;

    // Sort descending by default (highest value first)
    const sortedVals = [raw1, raw2].sort((a, b) => b - a);
    const finalD1 = sortedVals[0];
    const finalD2 = sortedVals[1];

    animateDiceRoll([
        { element: die1El, finalValue: finalD1 },
        { element: die2El, finalValue: finalD2 }
    ], () => {
        // Double rolls generate 4 playable moves in backgammon
        state.currentRoll = (finalD1 === finalD2) 
            ? [finalD1, finalD1, finalD1, finalD1] 
            : [finalD1, finalD2];

        state.activeRoller = player;
        state.isRolling = false;
        state.hasRolled = true; 
        
        // Indicate that non-doubles can now be swapped by clicking
        const diceZone = document.getElementById(`${player}-dice-zone`);

        if (diceZone && finalD1 !== finalD2) {
            diceZone.classList.add('swappable');
        } else if (diceZone) {
            diceZone.classList.remove('swappable');
        }

        // Render 2 or 4 dice based on the new state.currentRoll
        renderDiceUI();

        logStatus(`${player} rolled: ${state.currentRoll.join(', ')}`);
    });
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
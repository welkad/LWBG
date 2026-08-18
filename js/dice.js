// js/dice.js - Contains all doubling cube and dice rolling logic, turn UI toggling, and roll animations.
import { state, switchTurn } from './state.js';
import { logStatus, resetStatusToDefault } from './ui.js';
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
    const player = state.currentPlayer;
    // const die1El = document.getElementById(`${player}-die-1`);
    // const die2El = document.getElementById(`${player}-die-2`);
    // if (!die1El || !die2El) return;

    // Helper to get create die elements dynamically (up to 4)
    function getOrCreateDie(playerColor, index) {
        let dieEl = document.getElementById(`${playerColor}-die-${index + 1}`);
        if (!dieEl) {
            const targetZone = document.getElementById(`${playerColor}-dice-zone`);
            if (!targetZone) return;

            dieEl = document.createElement('span');
            dieEl.id = `${playerColor}-die-${index + 1}`;
            dieEl.className = 'die';
            dieEl.onclick = () => handleDieClick(playerColor, index + 1);
            targetZone.appendChild(dieEl);
        }
        return dieEl;
    }

    // ==========================================
    //  OPENING ROLL PHASE
    // ==========================================
    if (state.gamePhase === 'opening_roll') {
        ['white', 'black'].forEach(p => {
            const d1 = getOrCreateDie(p, 0);
            const d2 = getOrCreateDie(p, 1);

            // Hide second die for both players during opening roll
            if (d2) d2.style.display = 'none';

            if (d1) {
                d1.style.display = '';
                // If this player hasn't rolled yet, show 'R'
                if (state.openingRolls[p] === null) {
                    setDieValue(d1, 'R');
                } else {
                    // Show their rolled value
                    setDieValue(d1, state.openingRolls[p]);
                }
            }
        });
        return;
    }

    // ==========================================
    //  REGULAR TURNS
    // ==========================================
    const zone = document.getElementById(`${player}-dice-zone`);
    if (!zone) return;

    // Clean up extra die elements (> 2) when returning to non-double state
    const extraDiceCount = zone.children.length;
    if (!state.hasRolled || state.currentRoll.length <= 2) {
        for (let i = 3; i <= extraDiceCount; i++) {
            const extra = document.getElementById(`${player}-die-${i}`);
            if (extra) extra.remove();
        }
    }

    const die1El = getOrCreateDie(player, 0);
    const die2El = getOrCreateDie(player, 1);

    // Before roll -> show 'R' 'R'
    if (!state.hasRolled) {
        setDieValue(die1El, 'R');
        setDieValue(die2El, 'R');
        die1El.style.display = '';
        die2El.style.display = '';
        return;
    }

    const movesMade = state.moveHistory ? state.moveHistory.length : 0;
    const movesLeft = state.currentRoll.length;

    // All moves completed -> Show 'U' and 'D' on the first two dice
    if (movesLeft === 0 && movesMade > 0) {
        // Clean up dice 3 & 4 if present
        for (let i = 3; i <= 4; i++) {
            const extra = document.getElementById(`${player}-die-${i}`);
            if (extra) extra.remove();
        }        
        setDieValue(die1El, 'U');
        setDieValue(die2El, 'D');
        die1El.style.display = '';
        die2El.style.display = '';
        return;
    }

    // Doubles rolled (4 dice total)
    if (state.currentRoll.length > 2 || (movesMade > 0 && (movesMade + movesLeft === 4))) {
        const totalInitialDice = movesMade + movesLeft; // 4 for doubles

        for (let i = 0; i < totalInitialDice; i++) {
            const dieEl = getOrCreateDie(player, i);
            dieEl.style.display = '';

            if (i < movesMade) {
                // Used die: shows 'U' for undoing that move
                setDieValue(dieEl, 'U');
                dieEl.classList.add('used');
            } else {
                // Remaining die: shows pip value
                const rollIndex = i - movesMade;
                setDieValue(dieEl, state.currentRoll[rollIndex]);
                dieEl.classList.remove('used');
            }
        }
        return;
    }

    // Standard Non-Doubles Roll (2 dice)
    if (movesMade > 0 && movesLeft > 0) {
        // 1 move made, 1 remaining
        setDieValue(die1El, 'U');
        setDieValue(die2El, state.currentRoll[0]);
        die1El.style.display = '';
        die2El.style.display = '';
    } else {
        // Initial 2-dice roll view
        setDieValue(die1El, state.currentRoll[0]);
        setDieValue(die2El, state.currentRoll[1]);
        die1El.style.display = '';
        die2El.style.display = '';
    }

    // Condition 2: Moves made, but remaining dice available
    // if (movesMade > 0 && movesLeft > 0) {
    //     die2El.style.display = '';
    //     setDieValue(die1El, 'U');
    //     setDieValue(die2El, state.currentRoll[0]); // Remaining move value
    //     return;
    // }

    // Condition 3: Just rolled, no moves made yet
    // if (movesMade === 0 && movesLeft > 0) {
    //     die2El.style.display = '';
    //     setDieValue(die1El, state.currentRoll[0]);
    //     setDieValue(die2El, state.currentRoll[1] ?? state.currentRoll[0]);
    // }
}

export function handleDieClick(player, dieNumber) {
    // Handle opening rolll phase (any player can click their initial die)
    if (state.gamePhase === 'opening_roll') {
        handleOpeningRoll(player);
        return;
    }

    // Only current player can act during regular turns
    if (player !== state.currentPlayer) return;

    // const die1El = document.getElementById(`${player}-die-1`);
    // const die2El = document.getElementById(`${player}-die-2`);
    // const targetEl = dieNumber === 1 ? die1El : die2El;
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
    // ['white', 'black'].forEach(player => {
    //     const d1 = document.getElementById(`${player}-die-1`);
    //     const d2 = document.getElementById(`${player}-die-2`);

    //     if (d1) d1.onclick = () => handleDieClick(player, 1);
    //     if (d2) d2.onclick = () => handleDieClick(player, 2);
    // });

    // Attach Doubling Cube handler
    const cubeEl = document.getElementById('doubling-cube');
    if (cubeEl) {
        cubeEl.addEventListener('click', () => {
            handleCubeClick(state.currentPlayer);
        });
        cubeEl.addEventListener('mouseleave', handleCubeMouseLeave);
    }
}

// ===============
//  DOUBLING CUBE
// ===============

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
        // Display the opening move dice on the winning player's board zone
        renderWinnerOpeningDice('black', black, white);
        updateCubePositionUI();
        
        logStatus(`Black wins opening roll (${black} vs ${white}) and plays first!`);

    } else {
        logStatus(`Tie roll (${white} vs ${black}) - Try again!`);        
        // Reset for reroll after 1 second delay
        setTimeout(() => {
            state.openingRolls = { white: null, black: null};
            setDieValue(document.getElementById('white-die-1'), 'R');
            setDieValue(document.getElementById('black-die-1'), 'R');            
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
        }

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
            if (die1) setDieValue(die1, 'R');
            if (die2) setDieValue(die2, 'R');

            // Show die 2 in case it was hidden or altered
            if (die2) die2.style.display = '';
        } else {
            // Clear pips/text from inactive player's dice
            if (die1) setDieValue(die1, '');
            if (die2) setDieValue(die2, '');
        }
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
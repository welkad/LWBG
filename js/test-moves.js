// js/test-moves.js - Automated move validation test harness
import { state, initBoardState } from './state.js';
import { getValidMovesForPoint, executeMove } from './moves.js';

export function runMoveTests() {
    console.group('%c 🎲 Backgammon Move Logic Test Suite', 'font-weight: bold; font-size: 14px; color: #4CAF50;');
    
    let passed = 0;
    let total = 0;

    function assert(description, condition) {
        total++;
        if (condition) {
            passed++;
            console.log(`%c[PASS] %c${description}`, 'color: #4CAF50; font-weight: bold;', 'color: inherit;');
        } else {
            console.error(`[FAIL] ${description}`);
        }
    }

    // -------------------------------------------------------------
    // TEST 1: Valid Move Computation & Composite Moves
    // -------------------------------------------------------------
    initBoardState();
    state.gamePhase = 'turns';
    state.hasRolled = true;
    state.currentPlayer = 'white';
    state.currentRoll = [3, 5];

    // White starts with 2 checkers on Point 1 (index 0).
    // Index 3 (3-die) is open.
    // Index 5 (5-die) is BLOCKED by 5 Black checkers.
    // Index 8 (3+5 composite via index 3) is OPEN.
    const validFromPoint0 = getValidMovesForPoint(0);

    assert(
        'White at index 0 with roll [3, 5] allows open target [3] and composite target [8], while blocking occupied index [5]',
        validFromPoint0.includes(3) && 
        validFromPoint0.includes(8) && 
        !validFromPoint0.includes(5)
    );

    // -------------------------------------------------------------
    // TEST 2: Bar Requirement Enforcement
    // -------------------------------------------------------------
    state.bar.white = 1;
    const blockedBoardMove = getValidMovesForPoint(0);
    assert(
        'Board moves are blocked (return []) when a player has checkers on the bar',
        blockedBoardMove.length === 0
    );

    const validFromBar = getValidMovesForPoint('bar');
    assert(
        'Bar entry targets computed correctly for White with roll [3, 5] -> indices [2, 4]',
        validFromBar.includes(2) && validFromBar.includes(4) && validFromBar.length === 2
    );

    // -------------------------------------------------------------
    // TEST 3: Move Execution & Dice Consumption
    // -------------------------------------------------------------
    state.bar.white = 0; // Clear bar
    state.currentRoll = [3, 5];
    const initialPoint0Count = state.boardState[0].count; // starts at 2

    executeMove(0, 3); // Move 3 spaces from index 0 -> index 3

    assert(
        'Origin point count decrements by 1 after move execution',
        state.boardState[0].count === initialPoint0Count - 1
    );
    assert(
        'Destination point reflects player ownership and count',
        state.boardState[3].player === 'white' && state.boardState[3].count === 1
    );
    assert(
        'Die value matching distance moved (3) is consumed from currentRoll',
        state.currentRoll.length === 1 && state.currentRoll[0] === 5
    );

    // -------------------------------------------------------------
    // TEST 4: Hitting an Opponent Blot
    // -------------------------------------------------------------
    // Setup Black single checker (blot) at index 8
    state.boardState[8] = { player: 'black', count: 1 };
    state.bar.black = 0;
    state.currentRoll = [5]; // Remaining die

    executeMove(3, 8); // Move White from index 3 -> index 8 (distance 5)

    assert(
        "Opponent's blot is removed from point and sent to the bar",
        state.bar.black === 1
    );
    assert(
        'Target point is captured by hitting player',
        state.boardState[8].player === 'white' && state.boardState[8].count === 1
    );
    assert(
        'All dice consumed on final move, leaving roll empty',
        state.currentRoll.length === 0
    );

    // -------------------------------------------------------------
    // Summary Output
    // -------------------------------------------------------------
    console.log(
        `%cTest Suite Completed: ${passed}/${total} assertions passed.`,
        passed === total ? 'color: #4CAF50; font-weight: bold;' : 'color: #F44336; font-weight: bold;'
    );
    console.groupEnd();

    // Reset clean board state for normal gameplay
    initBoardState();
}
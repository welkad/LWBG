// ==========================================
// TYPE DEFINITIONS
// ==========================================
// js/types.js - Central JSDoc type definitions for VS Code checkJs static analysis

/**
 * Represents a player color or null if unassigned.
 * @typedef {'black' | 'white' | null} PlayerColor
 */

/**
 * Represents ownership or location of the doubling cube.
 * @typedef {'center' | 'white' | 'black'} CubeOwner
 */

/**
 * Represents current phase of game progression.
 * @typedef {'opening_roll' | 'turns' | 'game_over'} GamePhase
 */

/**
 * Checker count and player ownership for a single board point index (0-23).
 * @typedef {Object} PointData
 * @property {PlayerColor} player - The player occupying this point, or null if empty.
 * @property {number} count - Total checkers on this point.
 */

/**
 * Snapshot of board state used for move history and undo tracking.
 * @typedef {Object} MoveHistorySnapshot
 * @property {PointData[]} boardState - Array of 24 points describing checker layout.
 * @property {{ white: number, black: number }} bar - Count of checkers on the bar per player.
 * @property {number[]} currentRoll - Remaining unused dice for the active turn.
 * @property {number[]} [consumedDice] - Array of die values used/consumed during this move.
 */

/**
 * Central state structure governing entire Backgammon application.
 * @typedef {Object} GameState
 * @property {PointData[]} boardState - 24-element array representing board points (0 to 23).
 * @property {{ white: number, black: number }} bar - Checkers waiting on the bar.
 * @property {{ white: number, black: number }} borneOff - Checkers safely borne off.
 * @property {{ white: number, black: number }} scores - Match scores (games/points won).
 * @property {number | string | null} selectedPoint - Point index (0-23), 'bar', or null.
 * @property {(number | string)[]} validMoves - Legal target destinations (0-23 or 'off').
 * @property {MoveHistorySnapshot[]} moveHistory - Stack of turn move snapshots.
 * @property {number} cubeValue - Current doubling cube multiplier (1, 2, 4, 8...).
 * @property {CubeOwner} cubeOwner - Current owner or center state of doubling cube.
 * @property {boolean} isCubeOffered - True when doubling cube challenge is pending.
 * @property {PlayerColor} cubeOfferedBy - Player offering double.
 * @property {GamePhase} gamePhase - Current phase of active game loop.
 * @property {PlayerColor} losingPlayer - Player who lost or resigned.
 * @property {PlayerColor} currentPlayer - Active player whose turn it is.
 * @property {boolean} isResignOffered - True when resignation challenge is pending.
 * @property {PlayerColor} resignOfferedBy - Player offering resignation.
 * @property {{ black: 'yes' | 'no' | null, white: 'yes' | 'no' | null }} playAgainChoices - Post-game choices.
 * @property {boolean} awaitingPlayAgainPrompt - Delay state before showing play again dice.
 * @property {{ white: number | null, black: number | null }} openingRolls - Initial dice roll values.
 * @property {number[]} currentRoll - Active turn dice values (e.g., [5, 3] or [4, 4, 4, 4]).
 * @property {boolean} isDouble - True if current turn rolled matching doubles.
 * @property {PlayerColor} activeRoller - Player currently executing die roll.
 * @property {boolean} isRolling - True while dice rolling animation is active.
 * @property {boolean} hasRolled - True if player rolled dice during current turn.
 */

/**
 * Custom Window interface extensions for global debugging functions.
 * @typedef {Window & { debugSetBearOff?: function(number=, number=): void }} CustomWindow
 */
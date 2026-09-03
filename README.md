# Backgammon Web Application

A lightweight, vanilla JavaScript implementation of Backgammon designed to run entirely in the browser.

## File Architecture

/
├── index.html
├── style.css
├── README.md
├── css/
│   ├── board.css            # Board layout, wood frame, point geometry, and grid structures
│   ├── pieces.css           # Checker pieces, bear-off pockets, bar pieces, and piece positioning
│   └── controls.css         # Dice zones, dice appearance, interactive controls, and doubling cube
└── js/
    ├── main.js              # Application entry point; initializes game state, board, dice UI, and event listeners
    ├── state.js             # Central game state, initial board setup, turn switching, and game-phase management
    ├── board.js             # Board creation, point rendering, checker placement, and board DOM updates
    ├── moves.js             # Move validation, legal destination calculation, move execution, and undo history
    │
    ├── dice.js              # Dice interaction controller; handles die clicks, turn UI, dice reset, and dice listeners
    ├── dice-rolling.js      # Dice rolling logic, opening rolls, animated rolling, and generation of roll values
    ├── dice-renderer.js     # Creates and updates dice DOM elements, pip rendering, and dice state display
    ├── keyboard.js          # Global keyboard shortcuts for game actions
    │
    ├── doubling-cube.js     # Doubling cube offers, accept/decline handling, cube ownership, and cube positioning
    ├── ui.js                # Status messages, game notifications, legend updates, and general UI feedback
    └── test-moves.js        # Automated move-validation test harness

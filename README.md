# Backgammon Web Application

A lightweight, vanilla JavaScript implementation of Backgammon designed to run entirely in the browser.

## File Architecture

```text
/
├── index.html
├── style.css
├── README.md
├── css/
│   ├── board.css       # Base page setup, wood frame layouts, point geometry, and grid structures
│   ├── pieces.css      # Styling for checkers, bear-off home pockets, and bar piece placements
│   └── controls.css    # Interactive UI components: player dice zones, dice styling, and doubling cube
└── js/
    ├── state.js        # Global game state, initial board setup, and turn switching (`switchTurn`)
    ├── board.js        # Board creation, point rendering, and DOM updates
    ├── dice.js         # Rolling logic, progressive slowing roll animations, and doubling cube rules
    ├── main.js         # Application entry point, initial DOM setup, and global event listeners    
    ├── moves.js        # A dedicated module to compute valid moves for a selected origin point
    ├── ui.js           # To display information messages in status banner (echos console.log)
    └── test-moves.js   # Automated move validation test harness
```

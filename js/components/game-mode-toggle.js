// js/components/game-mode-toggle.js: Horizontal 3-button mode toggle component
import { state, resetGame, setInputLocked } from '../state.js';
import { updateScoreBoardUI } from '../board.js';
import { logStatus } from '../ui.js';
import './game-setup-modal.js';

class GameModeToggle extends HTMLElement {
  constructor() {
    super();
    /** @type {string} */
    this.previousMode = 'single';
  }
  connectedCallback() {
    this.render();
    this.initInternalController();
  }

  render() {
    this.innerHTML = `
      <div class="mode-toggle-container">
        <!-- SINGLE GAME -->
        <button class="mode-btn active" data-mode="single" title="Single Game">
          <span class="mode-label">Single</span>
        </button>

        <!-- MATCH PLAY -->
        <button class="mode-btn" data-mode="match" title="Match Play">
          <span class="mode-label">Match</span>
        </button>

        <!-- MONEY PLAY -->
        <button class="mode-btn" data-mode="money" title="Money Play">
          <span class="mode-label">Money</span>
        </button>
      </div>

      <style>
        /* ==========================================
            CONTAINER STYLING
            ========================================== */
        .mode-toggle-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 8px;
        }

        /* ==========================================
            BUTTON BASE STYLING
            ========================================== */
        .mode-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: #aaa;
          padding: 4px 10px;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }
        
        .mode-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.3);
        }

        /* Active radio state (warm accent matching board highlights) */
        .mode-btn.active {
          background: rgba(212, 163, 115, 0.2);
          border-color: #d4a373;
          color: #fff;
          font-weight: 600;
        }
        
        .radio-indicator {
          font-family: monospace;
          font-size: 12px;
          color: #d4a373;
        }
        
        .mode-btn:not(.active) .radio-indicator {
          color: #777;
        }
      </style>
    `;
  }
    
  initInternalController() {
    // Sync initial state if already set
    if (state.gameMode) {
      this.setActiveMode(state.gameMode);
      this.previousMode = state.gameMode;
    }

    // Attach click listeners to emit mode selection
    this.querySelectorAll('.mode-btn').forEach(btn => {
      const htmlBtn = /** @type {HTMLElement} */ (btn);
      htmlBtn.addEventListener('click', () => {
        const selectedMode = htmlBtn.dataset.mode;
        if (!selectedMode || selectedMode === state.gameMode) return;

        // Check if there is an active game or ongoing scores/bankrolls
        const hasActiveProgress =
          state.scores.black > 0 ||
          state.scores.white > 0 ||
          state.gamePhase === 'turns';

        // Single mode without active progress switches immediately
        if (selectedMode === 'single' && !hasActiveProgress) {
          this.applyModeTransition('single');
          return;
        }

        // Match, Money, or Single game with active progress will use the modal
        this.openSetupModal(selectedMode, hasActiveProgress);
      });
    });
  }

  /**
   * Open setup/confirmation modal with shared theme, listeners and mounting logic.
   * @param {string} selectedMode
   * @param {boolean} hasActiveProgress
   */
  openSetupModal(selectedMode, hasActiveProgress) {
    if (document.querySelector('game-setup-modal')) return;

    setInputLocked(true); // Lock inputs and apply background blur
    state.gameMode = selectedMode;
    const modal = document.createElement('game-setup-modal');
    modal.setAttribute('mode', selectedMode);

    if (selectedMode === 'match' || selectedMode === 'money') {          
      modal.setAttribute(
        'value',
        String(selectedMode === 'match' ? (state.matchTarget || 3) : 100)
      );
      
      // Conditionally attach warning attribute if active game in progress
      if (hasActiveProgress) {
        modal.setAttribute(
          'warning',
          'Switching modes will reset your current game and scores.'
        );
      }
    }
          
    // Match the active header theme if present
    const headerContainer = document.querySelector('.header-container');
    if (headerContainer?.classList.contains('card')) {
      modal.setAttribute('theme', 'card');
    }

    modal.addEventListener('setup-complete', (e) => {
      const { mode, value } =  /** @type {CustomEvent} */ (e).detail;
      setInputLocked(false);  // Unlock inputs and remove blur
      this.applyModeTransition(mode, value);
    });

    modal.addEventListener('setup-cancelled', () => {
      setInputLocked(false);  // Unlock inputs and remove blur
      // Revert toggle button visual back to previous state if cancelled
      state.gameMode = this.previousMode;
      this.setActiveMode(this.previousMode);
    });

    // Append to master-board or fallback safely to body
    const masterBoard = /** @type {HTMLElement | null} */ (
      document.querySelector('.master-board')
    );
    if (masterBoard) {
      // Ensure master-board has relative positioning 
      if (getComputedStyle(masterBoard).position === 'static') {
        masterBoard.style.position = 'relative';
      }
      masterBoard.appendChild(modal);
    } else {
      document.body.appendChild(modal); // Fallback
    }
  }

  /**
   * Reset scores/board and apply the new mode configuration uniformly.
   * @param {string} mode
   * @param {number} [value]
   */
  applyModeTransition(mode, value) {
    state.gameMode = mode;
    state.scores = { black: 0, white: 0 };

    if (mode === 'match' && value) {
      state.matchTarget = value;
    } else if (mode === 'money' && value) {
      state.bankRolls = { black: value, white: value };
    }

    this.previousMode = mode;
    this.setActiveMode(mode);
    updateScoreBoardUI();
    resetGame();

    const suffix = 
      mode === 'match' ? ` (${value} Points)` :
      mode === 'money' ? ` ($${value}) Bankroll` : '';
    logStatus(`Mode set to: ${mode.toUpperCase()}${suffix}`, 2000);

    this.dispatchEvent(new CustomEvent('mode-changed', {
      detail: {
        mode: state.gameMode,
        matchTarget: state.matchTarget,
        bankRolls: state.bankRolls
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Helper method to programmatically set the active mode button visual state
   * @param {string} activeMode - 'single' | 'match' | 'money'
   */
  setActiveMode(activeMode) {
    this.querySelectorAll('.mode-btn').forEach(btn => {
      const htmlBtn = /** @type {HTMLElement} */ (btn);
      const isSelected = htmlBtn.dataset.mode === activeMode;
      btn.classList.toggle('active', isSelected);
    });
  }
}

customElements.define('game-mode-toggle', GameModeToggle);
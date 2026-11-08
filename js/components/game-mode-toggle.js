// js/components/game-mode-toggle.js: Horizontal 3-button mode toggle component
import { logStatus } from '../ui.js';
import { state } from '../state.js';

class GameModeToggle extends HTMLElement {
  connectedCallBack() {
    this.render();
    this.initInternalController();
  }

  render() {
    this.innerHTML = `
      <div class="mode-toggle-container">
        <!-- SINGLE GAME -->
        <button class="mode-btn active" data-mode="single" title="Single Game">
          <span class="radio-indicator">[x]</span>
          <span class="mode-label">Single</span>
        </button>

        <!-- MATCH PLAY -->
        <button class="mode-btn" data-mode="match" title="Match Play">
          <span class="radio-indicator">[ ]</span>
          <span class="mode-label">Match</span>
        </button>

        <!-- MONEY PLAY -->
        <button class="mode-btn" data-mode="money" title="Money Play">
          <span class="radio-indicator">[ ]</span>
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
          gap: 8px;
          margin-top: 6px;
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
          transistion:
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
      this.setActiveMode(state.gameMode, state.matchTarget);
    }

    // Attach click listeners to emit mode selection
    this.querySelectorAll('.mode-btn').forEach(btn => {
      const htmlBtn = /** @type {HTMLElement} */ (btn);
      htmlBtn.addEventListener('click', () => {
        const selectedMode = htmlBtn.dataset.mode;
        if (!selectedMode) return;

        state.gameMode = selectedMode;
    
        if (selectedMode === 'match') {
          const input = window.prompt(`Enter Match length (e.g. 3, 5, 7):`,
            String(state.matchTarget));
          const target = input ? parseInt(input, 10) : 3;
          state.matchTarget = !isNaN(target) && target > 0 ? target : 3;
        }

        this.setActiveMode(state.gameMode, state.matchTarget);
        logStatus(`Mode set to: ${state.gameMode.toUpperCase()}`
          + (state.gameMode === 'match' ? ` (${state.matchTarget} Points)`
              : '' ), 3000);

        // Optionally dispatch event for other listeners if needed
        this.dispatchEvent(new CustomEvent('mode-changed', {
          detail: { mode: state.gameMode, matchTarget: state.matchTarget },
          bubbles: true,
          composed: true
        }));
      });
    });
  }

  /**
   * Helper method to programmatically set the active mode button visual state
   * @param {string} activeMode - 'single' | 'match' | 'money'
   * @param {number|null} matchTarget - Target score if mode === 'match'
   */
  setActiveMode(activeMode, matchTarget = null) {
    this.querySelectorAll('mode-btn').forEach(btn => {
      const htmlBtn = /** @type {HTMLElement} */ (btn);
      const isSelected = htmlBtn.dataset.mode === activeMode;
      btn.classList.toggle('active', isSelected);

      const indicator = btn.querySelector('.radio-indicator');
      if (indicator) {
        indicator.textContent = isSelected ? '[x]' : '[ ]';
      }

      // Dynamically display match target points on the Match button label
      if (htmlBtn.dataset.mode === 'match') {
        const label = btn.querySelector('mode-label');
        if (label) {
          label.textContent = isSelected && matchTarget
            ? `Match (${matchTarget}pt)` : 'Match';
        }
      }
    });
  }
}

customElements.define('game-mode-toggle', GameModeToggle);
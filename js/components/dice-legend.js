// js/components/dice-legend.js: Render dynamic icon buttons (Roll, Undo, Done, Resign)

class DiceLegend extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        .dice-legend {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin: 12px 0 16px 0;
        }
        
        .legend-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
          font-size: 24px;
        }

        .legend-btn:hovernot(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-2px);
        }
        
        .legend-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        /* Hidden state utility matching existing UI logic */
        .legend-btn.hidden {
          display: none !important;
        }

        /* Specific icon styling properties */
        #action-done-btn {
          border-color: rgba(46, 204, 113, 0.4);
        }
        #action-done-btn:hover:not(:disabled) {
          background: rgba(46, 204, 113, 0.2);
          border-color: #2ecc71;
        }

        #action-resign-btn {
          border-color: rgba(231, 76, 60, 0.4);          
        }
        #action-resign-btn:hover:not(:disabled) {
          background: rgba(231, 76, 60, 0.2);
          boder-color: #e74c3c;
        }
      </style>

      <div id="legend" class="dice-legend">
        <!-- ROLL (large die emoji) -->
        <button id="action-roll-btn" class="legend-btn hidden" title="Roll Dice (R)">
          🎲
        </button>

        <!-- UNDO (reverse arrow) -->
        <button id="action-undo-btn" class="legend-btn hidden" title="Undo Move (U)">
          ↩️
        </button>

        <!-- DONE (green check mark) -->
        <button id="action-done-btn" class="legend-btn hidden" title="Finish Turn (D)">
          ✅
        </button>

        <!-- RESIGN (large red x) -->
        <button id="action-resign-btn" class="legend-btn hidden" title="Resign Game (Q)">
          ❌
        </button>

        <!-- CONFIRM ✔️ (only used for confirm/cancel prompts)  -->
        <button id="action-yes-btn" class="legend-btn hidden" title="Confirm (Y)">
          👍
        </button>

        <!-- CANCEL ❌ (only used for confirm/cancel prompts) -->
        <button id="action-no-btn" class="legend-btn hidden" title="Cancel (N)">
          👎
        </button>
      </div>
    `;
  }
}

customElements.define('dice-legend', DiceLegend);
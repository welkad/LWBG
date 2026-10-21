// js/components/dice-legend.js: Render dynamic action buttons supporting Normal and Icon views

class DiceLegend extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        .dice-legend {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin: 16px 0;
        }
        
        .legend-btn {
          background: none;
          border: none; /* No borders in normal view */
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 8px 12px;
          font-size: 16px;
          color: #fff;
        }

        .legend-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }
        
        .legend-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        /* Hidden state utility */
        .legend-btn.hidden {
          display: none !important;
        }

        /* Default Normal View: Hide icons, show key badges & text labels */
        .icon-content {
          display: none;
        }

        /* Icon View Styling (triggered when .icon-view is present on <dice-legend>) */
        :host(.icon-view) .dice-legend,
        .dice-legend.icon-view {
          gap: 16px;
          margin: 12px 0 16px 0;
        }

        :host(.icon-view) .key-badge,
        :host(.icon-view) .btn-label,
        .dice-legend.icon-view .key-badge,
        .dice-legend.icon-view .btn-label {
          display: none !important;
        }

        :host(.icon-view) .icon-content,
        .dice-legend.icon-view .icon-content {
          display: inline;
        }

        :host(.icon-view) .legend-btn,
        .dice-legend.icon-view .legend-btn {
          width: 48px;
          height: 48px;
          padding: 0;
          font-size: 22px;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        :host(.icon-view) .legend-btn:hover:not(:disabled),
        .dice-legend.icon-view .legend-btn:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.4);
        }

        /* Specific button accent colors in icon view */
        :host(.icon-view) #action-done-btn,
        .dice-legend.icon-view #action-done-btn {
          border-color: rgba(46, 204, 113, 0.4);
        }
        :host(.icon-view) #action-done-btn:hover:not(:disabled),
        .dice-legend.icon-view #action-done-btn:hover:not(:disabled) {
          background: rgba(46, 204, 113, 0.2);
          border-color: #2ecc71;
        }

        :host(.icon-view) #action-resign-btn, :host(.icon-view) #action-no-btn,
        .dice-legend.icon-view #action-resign-btn, .dice-legend.icon-view #action-no-btn {
          border-color: rgba(231, 76, 60, 0.4);          
        }
        :host(.icon-view) #action-resign-btn:hover:not(:disabled), :host(.icon-view) #action-no-btn:hover:not(:disabled),
        .dice-legend.icon-view #action-resign-btn:hover:not(:disabled), .dice-legend.icon-view #action-no-btn:hover:not(:disabled) {
          background: rgba(231, 76, 60, 0.2);
          border-color: #e74c3c;
        }
      </style>

      <div class="dice-legend">
        <!-- ROLL -->
        <button id="action-roll-btn" class="legend-btn hidden" title="Roll Dice (R)">
          <span class="icon-content">🎲</span>
          <span class="key-badge">R</span>
          <span class="btn-label">: Roll</span>
        </button>

        <!-- UNDO -->
        <button id="action-undo-btn" class="legend-btn hidden" title="Undo Move (U)">
          <span class="icon-content">↩️</span>
          <span class="key-badge">U</span>
          <span class="btn-label">: Undo</span>
        </button>

        <!-- DONE -->
        <button id="action-done-btn" class="legend-btn hidden" title="Finish Turn (D)">
          <span class="icon-content">✅</span>
          <span class="key-badge">D</span>
          <span class="btn-label">: Done</span>
        </button>

        <!-- RESIGN -->
        <button id="action-resign-btn" class="legend-btn hidden" title="Resign Game (Q)">
          <span class="icon-content">❌</span>
          <span class="key-badge">Q</span>
          <span class="btn-label">: Resign</span>
        </button>

        <!-- CONFIRM -->
        <button id="action-yes-btn" class="legend-btn hidden" title="Confirm (Y)">
          <span class="icon-content">👍</span>
          <span class="key-badge">Y</span>      
          <span id="label-yes" class="btn-label">: Confirm</span>
        </button>

        <!-- CANCEL -->
        <button id="action-no-btn" class="legend-btn hidden" title="Cancel (N)">
          <span class="icon-content">👎</span>
          <span class="key-badge">N</span>
          <span id="label-no" class="btn-label">: Cancel</span>
        </button>
      </div>
    `;
  }
}

customElements.define('dice-legend', DiceLegend);
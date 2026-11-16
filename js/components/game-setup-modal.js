// js/components/game-setup-modal.js: Modal to configure Match and Money play settings

class GameSetupModal extends HTMLElement {
  connectedCallback() {
    this.mode = this.getAttribute('mode') || 'match';
    this.currentValue = this.getAttribute('value') || '3';
    this.theme = this.getAttribute('theme') || 'floating';
    this.render();
    this.initListeners();
  }

  static get observedAttributes() {
    return ['mode', 'value', 'theme'];
  }

  /**
   * @param {string} name
   * @param {string} oldValue
   * @param {string} newValue 
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'mode') this.mode = newValue;
    if (name === 'value') this.currentValue = newValue;
    if (name === 'theme') this.theme = newValue;
    this.render();
    this.initListeners();
  }

  render() {
    const isSingle = this.mode === 'single';
    const isMatch = this.mode === 'match';

    const title = isSingle
      ? 'Switch to Single Game Mode'
      : (isMatch ? 'Configure Match Play' : 'Configure Money Play');
    
    const helper = isSingle
      ? 'Switching to Single mode will reset your current game and scores.'
      : (isMatch ? 'First player to reach this score wins the match.'
          : 'Set starting bankroll for each player.');

    const warningMessage = this.getAttribute('warning');

    this.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card ${this.theme}">
          <h2>${title}</h2>
          <p class="modal-helper">${helper}</p>

          ${!isSingle ? `
            <div class="modal-input-group">
              <label for="setup-input">
                ${isMatch ? 'Match Target (Points):'
                    : 'Starting Bankroll - Ante ($):'}
              </label>
              <input
                type="number"
                id="setup-input"
                value="${this.currentValue}"
                min="1"
                max="99"
              />
          </div>
          ` : ''}

          <div class="modal-actions">            
            <button id="modal-cancel" class="modal-btn secondary">Cancel</button>
            <button id="modal-confirm" class="modal-btn primary">Confirm</button>
          </div>

          ${warningMessage ? `
            <div class="setup-warning-banner">
              ⚠️ ${warningMessage}
            </div>
          ` : ''}
        </div>
      </div>

      <style>
        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(1px);
          border-radius: inherit;
        }

        .modal-card {
          width: 320px;
          padding: 24px;
          border-radius: 16px;
          box-sizing: border-box;
          font-family: inherit;
          animation: modalFadeIn 0.2s ease-out;
        }

        /* Floating Theme (default) */
        .modal-card.floating {
          background: #1e1e1e;
          border: 2px solid rgba(255, 255, 255, 0.15);
          color: #f0f0f0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .modal-card.floating .modal-btn.primary {
          background: rgba(255, 255, 255, 0.9);
          color: #111;
        }

        .modal-card.floating .modal-btn.primary:hover {
          background: #888888;
        }

        /* Card Theme */
        .modal-card.card {
          background: #4a3728;
          border: 2px solid #2d2016;
          color: #f1d779;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);
        }

        .modal-card.card .modal-btn.primary {
          background: #d4a373;
          color: #111111;
          border: 1px solid #b88655;
        }

        .modal-card.card .modal-btn.primary:hover {
          background: #e6b988;
        }

        .modal-card h2 {
          margin: 0 0 8px 0;
          font-size: 1.25rem; 
        }

        .modal-helper {
          font-size: 0.85rem;
          opacity: 0.9;
          margin: 0 0 20px 0;
          line-height: 1.4;          
        }

        .modal-input-group {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;       
        }

        .modal-input-group label {
          font-size: 0.9rem;
          font-weight: 600;        
        }

        .modal-input-group input {
          width: 170px;
          padding: 12px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.2);
          color: inherit;
          font-size: 1rem;
          font-family: inherit;
          text-align: center;          
          outline: none;
          caret-color: transparent; /* Hide blinking cursor */
        }

        .modal-input-group input:focus {
          border-color: #d4a373;
        }

        .modal-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
        }

        .modal-btn {        
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.2s;
        }

        .modal-btn.primary {
          font-weight: 600;
        }

        .modal-btn.secondary {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.2);
          color: inherit;
        }

        .modal-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .setup-warning-banner {
            background: rgba(212, 163, 115, 0.15);
            border: 1px solid rgba(212, 163, 115, 0.44);
            color: #d4a373;
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 13px;
            margin-top: 18px;
            line-height: 1.4;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      </style>
    `;
  }

  initListeners() {
    const input = /** @type {HTMLInputElement | null} */
      (this.querySelector('#setup-input'));
    const confirmBtn = /** @type {HTMLInputElement | null} */
      (this.querySelector('#modal-confirm'));
    const cancelBtn = /** @type {HTMLInputElement | null} */
      (this.querySelector('#modal-cancel'));
    
    if (input) {  // No input for Single mode confirmation
      setTimeout(() => {
        input?.focus();   // Auto-focus input
      }, 50);
    }

    confirmBtn?.addEventListener('click', () => {
      const val = parseInt(input?.value || '0', 10);
      const resolvedVal = !isNaN(val) && val > 0 
        ? val : (this.mode === 'match' ? 3 : 100);

      this.dispatchEvent(new CustomEvent('setup-complete', {
        detail: { mode: this.mode, value: resolvedVal },
        bubbles: true,
        composed: true
      }));
      this.remove();
    });

    cancelBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('setup-cancelled', {
        bubbles: true,
        composed: true
      }));
      this.remove();
    });

    // Keyboard support: Enter to confirm, Escape to cancel
    this.addEventListener('keydown', (e) => {
      const ke = /** @type {KeyboardEvent} */ (e);
      if (ke.key === 'Enter') {
        ke.preventDefault();
        confirmBtn?.click();
      } else if (ke.key === 'Escape') {
        ke.preventDefault();
        cancelBtn?.click();
      }
    });
  }
}

customElements.define('game-setup-modal', GameSetupModal);
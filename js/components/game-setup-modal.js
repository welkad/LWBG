// js/components/game-setup-modal.js: Modal for configuring Match and Money play settings

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
    const isMatch = this.mode === 'match';
    const title = isMatch ? 'Configure Match Play' : 'Configure Money Play';
    const label = isMatch ? 'Match Target (Points):' : 'Starting Bankroll / Ante ($):';
    const helper = isMatch
      ? 'First player to reach this score wins the match.'
      : 'Set starting bankroll for each player.';

    this.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card ${this.theme}">
          <h2>${title}</h2>
          <p class="modal-helper">${helper}</p>

          <div class="modal-input-group">
            <label for="setup-input">${label}</label>
            <input
              type="number"
              id="setup-input"
              value="${this.currentValue}"
              min="1"
              max="99"
            />
          </div>

          <div class="modal-actions">
            <button id="modal-confirm" class="modal-btn primary">Confirm</button>
            <button id="modal-cancel" class="modal-btn secondary">Cancel</button>            
          </div>
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

        /* Card Theme */
        .modal-card.card {
          background: #4a3728;
          border: 2px solid #2d2016;
          color: #f1d779;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);
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
          gap: 6px;
          margin-bottom: 24px;
        }

        .modal-input-group label {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .modal-input-group input {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.2);
          color: inherit;
          font-size: 1rem;
          font-family: inherit;
          outline: none;
        }

        .modal-input-group focus {
          border-color: #d4a373;
        }

        .modal-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
        }

        .modal-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.2s;
        }

        .modal-btn.primary {
          background: #d4a373;
          
          color: #111;
          font-weight: 600;
        }

        .modal-btn.primary:hover {
          background: #e6b988;
        }

        .modal-btn.secondary {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.2);
          color: inherit;
        }

        .modal-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
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

    // Auto-focus input
    setTimeout(() => input?.focus(), 50);

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

    input?.addEventListener('keydown', (e) => {
      const ke = /** @type {KeyboardEvent} */ (e);
      if (ke.key === 'Enter') confirmBtn?.click();
      if (ke.key === 'Escape') cancelBtn?.click();
    });
  }
}

customElements.define('game-setup-modal', GameSetupModal);
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
    return ['mode', 'value', 'theme', 'warning'];
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'mode') this.mode = newValue || 'match';
    if (name === 'value') this.currentValue = newValue || '3';
    if (name === 'theme') this.theme = newValue || 'floating';
    if (this.isConnected) {
      this.render();
      this.initListeners();
    }
  }

  render() {
    const isSingle = this.mode === 'single';
    const isMatch = this.mode === 'match';

    const title = isSingle
      ? 'Switch to Single Game'
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
            <button type="button" id="modal-cancel" class="modal-btn secondary">Cancel</button>
            <button type="button" id="modal-confirm" class="modal-btn primary">Confirm</button>
          </div>

          ${warningMessage ? `
            <div class="setup-warning-banner">
              ⚠️ ${warningMessage}
            </div>
          ` : ''}
        </div>
      </div>

      <style>
        .modal-input-group {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
        }

        .modal-input-group label {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .modal-input-group input {
          width: 170px;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.2);
          color: inherit;
          font-size: 1rem;
          font-family: inherit;
          text-align: center;
          outline: none;
          caret-color: transparent;
        }

        .modal-input-group input:focus {
          border-color: #d4a373;
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
      </style>
    `;
  }

  initListeners() {
    const input = /** @type {HTMLInputElement | null} */
      (this.querySelector('#setup-input'));
    const confirmBtn = /** @type {HTMLButtonElement | null} */
      (this.querySelector('#modal-confirm'));
    const cancelBtn = /** @type {HTMLButtonElement | null} */
      (this.querySelector('#modal-cancel'));

    if (input) {
      setTimeout(() => {
        input?.focus();
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
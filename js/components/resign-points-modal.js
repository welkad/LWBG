// js/components/resign-points-modal.js - Modal to choose resignation Cube multiplier

class ResignPointsModal extends HTMLElement {
  constructor() {
    super();
    /** @type {string} */ this.player = 'black';
    /** @type {number} */ this.cubeValue = 1;
    /** @type {string} */ this.theme = 'floating';
    /** @type {string} */ this.mode = 'single';
    /** @type {number} */ this.ante = 10;
    /** @type {number} */ this.matchTarget = 3;
    /** @type {number} */ this.currentScore = 0;
    /** @type {boolean} */ this._keydownBound = false;
  }

  connectedCallback() {
    this.player = this.getAttribute('player') || 'black';
    this.cubeValue = Number(this.getAttribute('cube-value') || '1') || 1;
    this.theme = this.getAttribute('theme') || 'floating';
    this.mode = this.getAttribute('mode') || 'single';
    this.ante = Number(this.getAttribute('ante') || '10') || 10;
    this.matchTarget = Number(this.getAttribute('match-target') || '3') || 3;
    this.currentScore = Number(this.getAttribute('winner-score') || '0') || 0;

    this.render();
    this.initListeners();
  }

  static get observedAttributes() {
    return [
      'player',
      'cube-value',
      'theme',
      'mode',
      'ante',
      'match-target',
      'winner-score'
    ];
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || newValue === null) return;
    if (name === 'player') this.player = newValue;
    if (name === 'cube-value') this.cubeValue = Number(newValue) || 1;
    if (name === 'theme') this.theme = newValue;
    if (name === 'mode') this.mode = newValue;
    if (name === 'ante') this.ante = Number(newValue) || 10;
    if (name === 'match-target') this.matchTarget = Number(newValue) || 3;
    if (name === 'winner-score') this.currentScore = Number(newValue) || 0;

    if (this.isConnected) {
      this.render();
      this.initListeners();
    }
  }

  /**
   * @param {number} points
   * @returns {string}
   */
  formatContext(points) {
    const ptLabel = `${points} pt${points === 1 ? '' : 's'}`;

    if (this.mode === 'money') {
      return `${ptLabel} · $${points * this.ante}`;
    }
    if (this.mode === 'match') {
      const winsMatch = (this.currentScore + points) >= this.matchTarget;
      return winsMatch ? `${ptLabel} · Match` : ptLabel;
    }
    return ptLabel;
  }

  render() {
    const normalPts = this.cubeValue;
    const gammonPts = this.cubeValue * 2;
    const backgammonPts = this.cubeValue * 3;
    const rawPlayer = this.player || 'black';
    const formattedPlayer = rawPlayer.charAt(0).toUpperCase() + rawPlayer.slice(1);

    const options = [
      {
        type: 'single',
        label: 'Normal',
        multiplierText: `1x Cube (${this.cubeValue})`,
        points: normalPts
      },
      {
        type: 'gammon',
        label: 'Gammon',
        multiplierText: `2x Cube (${this.cubeValue})`,
        points: gammonPts
      },
      {
        type: 'backgammon',
        label: 'Backgammon',
        multiplierText: `3x Cube (${this.cubeValue})`,
        points: backgammonPts
      }
    ];

    this.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card ${this.theme}" role="dialog"
          aria-modal="true" aria-labelledby="resign-modal-title">
          <h2 id="resign-modal-title">Resign Game</h2>
          <p class="modal-helper">
            ${formattedPlayer}, how many points are you willing to concede?
            (Cube value: <strong>${this.cubeValue}</strong>)
          </p>

          <div class="resign-options" role="group"
            aria-label="Resignation point options">
            ${options.map((opt, idx) => `
              <button
                type="button"
                class="resign-option-btn ${idx === 0 ? 'selected' : ''}"
                data-resign-type="${opt.type}"
                data-points="${opt.points}"
              >
                <span class="resign-opt-main">
                  <span class="resign-opt-title">${opt.label}</span>
                  <span class="resign-opt-sub">${opt.multiplierText}</span>
                </span>
                <span class="resign-opt-badge">
                  ${this.formatContext(opt.points)}
                </span>
              </button>
            `).join('')}
          </div>

          <div class="modal-actions">
            <button type="button" id="resign-modal-cancel" class="modal-btn secondary">
              Cancel
            </button>
            <button type="button" id="resign-modal-confirm" class="modal-btn primary">
              Confirm Resign
            </button>
          </div>
        </div>
      </div>

      <style>
        .resign-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }

        .resign-option-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.25);
          color: inherit;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s, background 0.15s, transform 0.1s;
        }

        .resign-option-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.35);
        }

        .resign-option-btn.selected {
          border-color: #d4a373;
          background: rgba(212, 163, 115, 0.18);
        }

        .resign-opt-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .resign-opt-title {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .resign-opt-sub {
          font-size: 0.78rem;
          opacity: 0.8;
        }

        .resign-opt-badge {
          font-size: 0.82rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
        }
      </style>
    `;
  }

  initListeners() {
    const optionButtons = Array.from(/** @type {NodeListOf<HTMLButtonElement>} */
      (this.querySelectorAll('.resign-option-btn')));
    const confirmBtn = /** @type {HTMLButtonElement | null} */
      (this.querySelector('#resign-modal-confirm'));
    const cancelBtn = /** @type {HTMLButtonElement | null} */
      (this.querySelector('#resign-modal-cancel'));

    let selectedBtn = optionButtons.find((b) =>
      b.classList.contains('selected')) || optionButtons[0] || null;

    const selectOption = (/** @type {HTMLButtonElement} */ btn) => {
      optionButtons.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedBtn = btn;
    };

    optionButtons.forEach((btn) => {
      btn.addEventListener('click', () => selectOption(btn));
    });

    confirmBtn?.addEventListener('click', () => {
      const points = Number(selectedBtn?.dataset.points || this.cubeValue);
      const resignType = selectedBtn?.dataset.resignType || 'single';

      this.dispatchEvent(new CustomEvent('resign-confirmed', {
        detail: {
          player: this.player,
          points,
          resignType
        },
        bubbles: true,
        composed: true
      }));
      this.remove();
    });

    cancelBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('resign-cancelled', {
        detail: { player: this.player },
        bubbles: true,
        composed: true
      }));
      this.remove();
    });

    if (!this._keydownBound) {
      this._keydownBound = true;
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

    setTimeout(() => {
      selectedBtn?.focus();
    }, 50);
  }
}

customElements.define('resign-points-modal', ResignPointsModal);
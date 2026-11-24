// js/components/player-scoreboard.js: Component to display pips and score for players

const CHECKER_THEMES = {
  black: [
    {
      name: 'default',
      relief: false,
      boardBg: '#1c1c1c',
      boardBorder: '#111111',
      boardInset: 'inset 0 3px 4px rgba(255, 255, 255, 0.15)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #555 0%, #111 60%, #000 100%
      )`,
      miniBorder: '#000',
      dieBg: '#1e1e1e',
      dieBorder: '#111111',
      diePip: '#fbfbfb',
      dieText: '#fbfbfb'
    },
    {
      name: 'cobalt',
      relief: true,
      boardBg: '#1e4b8a',
      boardBorder: '#122f59',
      boardInset: 'inset 0 3px 4px rgba(255, 255, 255, 0.2)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #4a7ec7 0%, #1e4b8a 65%, #10284d 100%
      )`,
      miniBorder: '#0d2140',
      dieBg: '#1e4b8a',
      dieBorder: '#122f59',
      diePip: '#f4f7fb',
      dieText: '#f4f7fb'
    },
    {
      name: 'burgundy',
      relief: true,
      boardBg: '#7c2329',
      boardBorder: '#4e1317',
      boardInset: 'inset 0 3px 4px rgba(255, 255, 255, 0.18)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #b5454d 0%, #7c2329 65%, #420f13 100%
      )`,
      miniBorder: '#380c10',
      dieBg: '#7c2329',
      dieBorder: '#4e1317',
      diePip: '#fbf5f5',
      dieText: '#fbf5f5'
    },
    {
      name: 'default (w/relief)',
      relief: true,
      boardBg: '#1c1c1c',
      boardBorder: '#111111',
      boardInset: 'inset 0 3px 4px rgba(255, 255, 255, 0.15)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #555 0%, #111 60%, #000 100%
      )`,
      miniBorder: '#000',
      dieBg: '#1c1c1c',
      dieBorder: '#111111',
      diePip: '#ffffff',
      dieText: '#ffffff'
    }
  ],
  white: [
    {
      name: 'default',
      relief: false,
      boardBg: '#fbfbfb',
      boardBorder: '#d4d4d4',
      boardInset: 'inset 0 -3px 4px rgba(0, 0, 0, 0.2)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #ffffff 0%, #d1d1d1 60%, #8a8a8a 100%
      )`,
      miniBorder: '#666',
      dieBg: '#fbfbfb',
      dieBorder: '#cccccc',
      diePip: '#222222',
      dieText: '#222222'
    },
    {
      name: 'jade',
      relief: true,
      boardBg: '#2f6f54',
      boardBorder: '#1c4735',
      boardInset: 'inset 0 3px 4px rgba(255, 255, 255, 0.18)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #58a383 0%, #2f6f54 65%, #173b2c 100%
      )`,
      miniBorder: '#123023',
      dieBg: '#2f6f54',
      dieBorder: '#1c4735',
      diePip: '#f3faf6',
      dieText: '#f3faf6'
    },
    {
      name: 'brass',
      relief: true,
      boardBg: '#e6c675',
      boardBorder: '#9c7d32',
      boardInset: 'inset 0 3px 4px rgba(255, 255, 255, 0.25)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #fae4a8 0%, #e6c675 65%, #8f7129 100%
      )`,
      miniBorder: '#7a6021',
      dieBg: '#e6c675',
      dieBorder: '#9c7d32',
      diePip: '#2b2108',
      dieText: '#2b2108'
    },
    {
      name: 'default (w/relief)',
      relief: true,
      boardBg: '#fbfbfb',
      boardBorder: '#d4d4d4',
      boardInset: 'inset 0 -3px 4px rgba(0, 0, 0, 0.2)',
      miniBg: `radial-gradient(
        circle at 35% 35%, #ffffff 0%, #d1d1d1 60%, #8a8a8a 100%
      )`,
      miniBorder: '#666',
      dieBg: '#fbfbfb',
      dieBorder: '#d4d4d4',
      diePip: '#1c1c1',
      dieText: '#1c1c1c'
    }
  ]
};
class PlayerScoreboard extends HTMLElement {
  constructor() {
    super();
    this._colorIndex = 0;
  }
  connectedCallback() {
    const player = this.getAttribute('player') || 'black';
    const defaultPip = this.getAttribute('pip') || '167';
    const defaultScore = this.getAttribute('score') || '0';
    const align = this.getAttribute('align') || 'left';
    const theme = this.getAttribute('theme') || 'floating'; // 'floating' or 'card'
    const label = this.getAttribute('label') || 'Score';

    this.render(player, defaultPip, defaultScore, align, theme, label);
    this._applyCheckerColor(player);
  }

  // Static getter function to tell browser wich attributes to watch
  static get observedAttributes() {
    return ['theme', 'pip', 'score', 'player', 'align', 'label'];
  }

  /** Callback function to handle updates when attributes change dynamically
   * @param {string} name
   * @param {string} oldValue
   * @param {string} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    const player = this.getAttribute('player') || 'black';
    if (name === 'pip') {
      const pipEl = this.querySelector(`#pip-${player}`);
      if (pipEl) pipEl.textContent = newValue;
      else this.renderAll(); // Fallback if not yet rendered      
    } else if (name === 'score') {
      const scoreEl = this.querySelector(`#score-${player}`);
      if (scoreEl) scoreEl.textContent = newValue;
      else this.renderAll();
    } else if (name === 'label') {
      const labelEl = this.querySelector(`#label-${player}`);
      if (labelEl) labelEl.textContent = newValue + ':';
      else this.renderAll();
    } else if (name === 'theme') {
      const panel = this.querySelector('.scoreboard-panel');
      if (panel) panel.classList.toggle('card', newValue === 'card');
      else this.renderAll();      
    } else if (name === 'player' || name === 'align') {
      this.renderAll(); // Structural attributes require full re-render
    }
  }
  // Helper to bundle initial render arguments
  renderAll () {
    const player = this.getAttribute('player') || 'black';
    const pip = this.getAttribute('pip') || '167';
    const score = this.getAttribute('score') || '0';
    const align = this.getAttribute('align') || 'left';
    const theme = this.getAttribute('theme') || 'floating';
    const label = this.getAttribute('label') || 'Score';

    this.render(player, pip, score, align, theme, label);
    this._applyCheckerColor(player);
  }

  /**
   * Cycle checker color palette for the given player and sync CSS variables
   * @param {string} player
   */
  _applyCheckerColor(player) {
    const normalizedPlayer = player === 'black' ? 'black' : 'white';
    const palette = CHECKER_THEMES[normalizedPlayer];
    const current = palette[this._colorIndex % palette.length];
    const rootStyle = document.documentElement.style;
    // Alternate styling not applied to default pieces
    const hasRelief = Boolean(current.relief);
    const reliefUrl = hasRelief 
      ? 'url("../assets/pieces/checker-relief.svg")' : 'none';

    // Checker variables
    rootStyle.setProperty(`--checker-${normalizedPlayer}-bg`, current.boardBg);
    rootStyle.setProperty(`--checker-${normalizedPlayer}-border`,
      current.boardBorder);
    rootStyle.setProperty(`--checker-${normalizedPlayer}-inset`, current.boardInset);
    rootStyle.setProperty(`--checker-${normalizedPlayer}-relief`, reliefUrl);

    // Dice variables
    rootStyle.setProperty(`--die-${normalizedPlayer}-bg`, current.dieBg);
    rootStyle.setProperty(`--die-${normalizedPlayer}-border`, current.dieBorder);
    rootStyle.setProperty(`--die-${normalizedPlayer}-pip`, current.diePip);
    rootStyle.setProperty(`--die-${normalizedPlayer}-text`, current.dieText);

    const miniEl = /** @type {HTMLElement | null} */
      (this.querySelector('.mini-checker'));
    if (miniEl) {
      if (hasRelief) {
        miniEl.style.background = `${reliefUrl} center / 100% 100% no-repeat,
        ${current.miniBg}`;
      } else {
        miniEl.style.background = current.miniBg;
      }      
      miniEl.style.backgroundPosition = 'center';
      miniEl.style.backgroundSize = '100% 100%';
      miniEl.style.backgroundRepeat = 'no-repeat';
      miniEl.style.borderColor = current.miniBorder;
    }

    const badgeEl = this.querySelector('.player-badge');   
    if (badgeEl) {
      badgeEl.setAttribute(
        'title',
        `${current.name.charAt(0).toUpperCase() + current.name.slice(1)}`
      );
    }
  }

  /**
   * @param {string} player
   * @param {string} pip
   * @param {string} score
   * @param {string} align
   * @param {string} theme
   * @param {string} label
   */
  render(player, pip, score, align, theme, label) {
    const isBlack = player === 'black';
    const playerName = isBlack ? 'Black' : 'White';

    this.innerHTML = `
      <div class="scoreboard-panel ${align} ${theme}">
        <div class="player-badge" role="button" tabindex="0"
          aria-label="Cycle ${playerName} checker color">
          <div class="mini-checker ${player}"></div>          
        </div>
        <div class="score-info">
            <span class="score-label">Pips:</span>
            <span class="pip-count" id="pip-${player}">${pip}</span>
            <span class="score-label" id="label-${player}">${label}:</span>
            <span class="score-count" id="score-${player}">${score}</span>
        </div>
      </div>

      <style>
        /* --- THEME: FLOATING (default) --- */
        .scoreboard-panel {
          display: flex;
          align-items: center;
          justify-content: center;          
          gap: 14px;
          width: 185px;
          height: 70px;
          background: rgba(255, 255, 255, 0.04);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;          
          padding: 12px 12px;
          font-size: 1rem;
          color: #d4d4d4;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
          box-sizing: border-box;
        }

        .scoreboard-panel.left {
          flex-direction: row;
          text-align: left;
          margin-left: -5px;
        }

        .scoreboard-panel.right {
          flex-direction: row;
          text-align: right;
          margin-right: -5px;
        }

        /* --- THEME: CARD --- */
        .scoreboard-panel.card {
          background: #4a3728; /* Solid wood tone */            
          border: 2px solid #2d2016;  /* Deep dark border */
          border-radius: 12px;          
          box-shadow:
            0 4px 10px rgba(0, 0, 0, 0.5),
            inset 0 1px 2px rgba(255, 255, 255, 0.1);
          padding: 12px 12px;
          box-sizing: border-box;
          color: #f1d779;              
        }

        .scoreboard-panel.card.left {
          flex-direction: row;
          text-align: left;
          margin-left: -5px;          
        }

        .scoreboard-panel.card.right {
          flex-direction: row;
          text-align: right;
          margin-right: -5px;    
        }

        .scoreboard-panel.card .score-line {
          font-weight: 400;
        }

        /* Mini checker indicator */
        .mini-checker {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5),
           inset 0 2px 3px rgba(255,255,255,0.2);
        }

        .mini-checker.black {
          background: radial-gradient(
            circle at 35% 35%, #555 0%, #111 60%, #000 100%
          );
          border: 1px solid #000;
        }

        .mini-checker.white {
          background: radial-gradient(
            circle at 35% 35%, #ffffff 0%, #d1d1d1 60%, #8a8a8a 100%
          );
          border: 1px solid #666;
        }

        .player-badge {
          display: flex;
          flex-direction: column;
          align-items: center;          
        }

        .score-info {
          display: grid;
          grid-template-columns: 54px 44px; /* Col 1: labels, Col 2: numbers */
          row-gap: 1px;
          column-gap: 3px;
          align-items: center;
          line-height: 1.3;
          font-weight: 600;
          text-align: left;
        }
        
        .pip-count {
          text-align: left;
          font-variant-numeric: tabular-nums;
        }
        
        .score-count {
          text-align: left;
          padding-left: 2px;
          font-variant-numeric: tabular-nums;
        }
        
      </style>
    `;

    const badgeEl = /** @type {HTMLElement | null} */
      (this.querySelector('.player-badge'));
    if (badgeEl) {
      badgeEl.addEventListener('click', () => {
        const currentPlayer = this.getAttribute('player') || 'black';
        const palette = CHECKER_THEMES[currentPlayer === 'black' ? 'black' : 'white']
        this._colorIndex = (this._colorIndex + 1) % palette.length;
        this._applyCheckerColor(currentPlayer);
      });

      badgeEl.addEventListener('keydown', (event) => {
        const ke = /** @type {KeyboardEvent} */ (event);
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          badgeEl.click();
        }
      });
    }
  }

  /**
   * Public method to update scores dynamically
   * @param {number} pipCount
   * @param {number} scoreCount
   */
  updateStatus(pipCount, scoreCount) {
    const player = this.getAttribute('player');
    const pipEl = this.querySelector(`#pip-${player}`);
    const scoreEl = this.querySelector(`#score-${player}`);
    if (pipEl) pipEl.textContent = String(pipCount);
    if (scoreEl) scoreEl.textContent = String(scoreCount);
  }
}

customElements.define('player-scoreboard', PlayerScoreboard);
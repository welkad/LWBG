// js/components/player-scoreboard.js: Component to display pips and score for players

class PlayerScoreboard extends HTMLElement {
  connectedCallback() {
    const player = this.getAttribute('player') || 'black';
    const defaultPip = this.getAttribute('pip') || '167';
    const defaultScore = this.getAttribute('score') || '0';
    const align = this.getAttribute('align') || 'left';
    const theme = this.getAttribute('theme') || 'card'; // 'floating' or 'card'

    this.render(player, defaultPip, defaultScore, align, theme);
  }

  // Static getter function to tell browser wich attributes to watch
  static get observedAttributes() {
    return ['theme', 'pip', 'score'];
  }

  /** Callback function to handle updates when attributes change dynamically
   * @param {string} name
   * @param {string} oldValue
   * @param {string} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      const player = this.getAttribute('player') || 'black';
      const pip = this.getAttribute('pip') || '167';
      const score = this.getAttribute('score') || '0';
      const align = this.getAttribute('align') || 'left';
      const theme = this.getAttribute('theme') || 'card';

      this.render(player, pip, score, align, theme);
    }
  }

  /**
   * @param {string} player
   * @param {string} pip
   * @param {string} score
   * @param {string} align
   * @param {string} theme
   */
  render(player, pip, score, align, theme) {
    const isBlack = player === 'black';
    const playerName = isBlack ? 'Black' : 'White';

    this.innerHTML = `
      <div class="scoreboard-panel ${align} ${theme}">
        <div class="player-badge">
          <div class="mini-checker ${player}"></div>          
        </div>
        <div class="score-info">
          <div class="score-line">Pips:
            <span class="pip-count" id="pip-${player}">${pip}</span></div>
          <div class="score-line">Score: 
            <span class="score-count" id="score-${player}">${score}</span></div>
        </div>
      </div>

      <style>
        /* --- THEME: FLOATING (default) --- */
        .scoreboard-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;          
          width: 170px;
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
          flex-direction: row-reverse;
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
          flex-direction: row-reverse;
          text-align: left;
          margin-left: -5px;          
        }

        .scoreboard-panel.card.right {
          flex-direction: row;
          text-align: right;
          margin-right: -5px;    
        }

        .scoreboard-panel.card .score-line {
          font-weight: 600;
        }

        /* Mini checker indicator */
        .mini-checker {
          width: 38px;
          height: 38px;
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

        .score-count {
          padding-right: 2px;
        }

        .score-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 75px;
        }

        .score-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          line-height: 1.3;
          font-weight: 600;
          
        }
      </style>
    `;
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
// js/components/player-scoreboard.js: Component to display pips and score for players

class PlayerScoreboard extends HTMLElement {
  connectedCallback() {
    const player = this.getAttribute('player') || 'black';
    const defaultPip = this.getAttribute('pip') || '167';
    const defaultScore = this.getAttribute('score') || '0';
    const align = this.getAttribute('align') || 'left';

    this.render(player, defaultPip, defaultScore, align);
  }

  /**
   * @param {string} player
   * @param {string} pip
   * @param {string} score
   * @param {string} align
   */
  render(player, pip, score, align) {
    const isBlack = player === 'black';
    const playerName = isBlack ? 'Black' : 'White';

    this.innerHTML = `
      <div class="scoreboard-panel ${align}">
        <div class="player-badge">
          <div class="mini-checker ${player}"></div>
          <span class="player-name">${playerName}</span>
        </div>
        <div class="score-info">
          <div class="score-line">Pips: 
            <span class="pip-count" id="pip-${player}">${pip}</span></div>
          <div class="score-line">Score: 
            <span class="score-count" id="score-${player}">${score}</span></div>
        </div>
      </div>

      <style>
        .scoreboard-panel {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 6px 14px;
          font-size: 0.95rem;
          color: #d4d4d4;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .scoreboard-panel.left {
          flex-direction: row;
        }

        .scoreboard-panel.right {
          flex-direction: row-reverse;
          text-align: right;
        }

        /* Mini checker indicator */
        .mini-checker {
          width: 22px;
          height: 22px;
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
            circle at 35% 35%, #fff 0%, #e0e0e0 60%, #b8b8b8 100%
          );
          border: 1px solid #999;
        }

        .player-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-weight: bold;
          font-size: 0.8rem;
          color: #f1d779;
        }

        .score-info {
          display: flex;
          flex-direction: column;
        }

        .score-line {
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
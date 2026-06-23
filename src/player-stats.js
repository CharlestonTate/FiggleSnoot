const MODE_LABELS = {
  base: 'Normal Mode',
  timeAttack: 'Time Attack',
  blackout: 'Blackout Mode',
};

const MODES = ['base', 'timeAttack', 'blackout'];

export function getPlayerStats() {
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]');

  const perMode = MODES.map((mode) => {
    const modeScores = scores.filter((s) => s.mode === mode);
    const gamesPlayed = modeScores.length;
    const bestLevel = gamesPlayed
      ? Math.max(...modeScores.map((s) => s.level || 1))
      : null;
    return {
      mode,
      label: MODE_LABELS[mode],
      gamesPlayed,
      bestLevel,
    };
  });

  const totalGames = perMode.reduce((sum, m) => sum + m.gamesPlayed, 0);
  const overallBest = scores.length
    ? Math.max(...scores.map((s) => s.level || 1))
    : null;

  return { perMode, totalGames, overallBest };
}

export function renderAccountStatsHtml() {
  const { perMode, totalGames, overallBest } = getPlayerStats();

  const rows = perMode.map((m) => `
    <div class="account-stat-block">
      <h3 class="account-stat-heading">${m.label}</h3>
      <p class="account-stat-detail">${m.gamesPlayed} games played</p>
      <p class="account-stat-detail">Best: Level ${m.bestLevel ?? '—'}</p>
    </div>
  `).join('');

  return `
    <div class="account-stats-panel">
      <h2 class="account-stats-title">Your Stats</h2>
      <div class="account-stat-block account-stat-summary-block">
        <h3 class="account-stat-heading">Overall</h3>
        <p class="account-stat-detail">Total games: ${totalGames}</p>
        <p class="account-stat-detail">Best level: ${overallBest ?? '—'}</p>
      </div>
      ${rows}
    </div>
  `;
}

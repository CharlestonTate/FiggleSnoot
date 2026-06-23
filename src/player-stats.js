const MODE_LABELS = {
  base: 'Normal',
  timeAttack: 'Time Attack',
  blackout: 'Blackout',
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
    <div class="account-stat-row">
      <span class="account-stat-mode">${m.label}</span>
      <span class="account-stat-val">${m.gamesPlayed} games</span>
      <span class="account-stat-val">Best: Lv ${m.bestLevel ?? '—'}</span>
    </div>
  `).join('');

  return `
    <div class="account-stats-panel">
      <h2 class="account-stats-title">Your Stats</h2>
      <p class="account-stat-summary">Total games: <strong>${totalGames}</strong> · Overall best: <strong>Lv ${overallBest ?? '—'}</strong></p>
      ${rows}
      <p class="account-stat-hint">Personal scores: Leaderboard → Personal → 💣 clears a mode. Account → Delete global scores removes online entries.</p>
    </div>
  `;
}

/** HTML escaping and safe DOM text helpers. */

const HTML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch]);
}

export function setText(el, value) {
  if (el) el.textContent = String(value ?? '');
}

export function appendText(parent, value, className) {
  const el = document.createElement(className ? 'div' : 'span');
  if (className) el.className = className;
  el.textContent = String(value ?? '');
  parent.appendChild(el);
  return el;
}

export function clearChildren(el) {
  if (el) el.replaceChildren();
}

export function appendHint(parent, message, className = 'online-death-hint') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = message;
  parent.appendChild(p);
  return p;
}

const VALID_GAME_MODES = new Set(['base', 'timeAttack', 'blackout']);

export function normalizeGameMode(mode) {
  return VALID_GAME_MODES.has(mode) ? mode : null;
}

export function modeLabel(mode) {
  const labels = {
    base: 'Normal',
    timeAttack: 'Time Attack',
    blackout: 'Blackout',
  };
  return labels[normalizeGameMode(mode)] || 'Unknown';
}

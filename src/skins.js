import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

const OWNED_KEY = 'figglesnoot_owned_skins';
const EQUIPPED_KEY = 'figglesnoot_equipped_skin';

export const SKIN_CATALOG = [
  { id: 'default', name: 'Classic Blue', price: 0, color: '#457b9d' },
  { id: 'gold', name: 'Golden Snoot', price: 50, color: '#e6b422' },
  { id: 'rose', name: 'Rose', price: 75, color: '#ff4d8d' },
  { id: 'ember', name: 'Ember', price: 100, color: '#e63946' },
  { id: 'neon', name: 'Neon', price: 125, color: '#2ecc71' },
  { id: 'void', name: 'Void', price: 150, color: '#6c5ce7' },
];

const catalogById = Object.fromEntries(SKIN_CATALOG.map((s) => [s.id, s]));

function readOwned() {
  try {
    const raw = localStorage.getItem(OWNED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed) ? parsed.filter((id) => catalogById[id]) : [];
    if (!ids.includes('default')) ids.unshift('default');
    return [...new Set(ids)];
  } catch {
    return ['default'];
  }
}

function writeOwned(ids) {
  const unique = [...new Set(['default', ...ids.filter((id) => catalogById[id])])];
  localStorage.setItem(OWNED_KEY, JSON.stringify(unique));
  return unique;
}

export function getSkinCatalog() {
  return SKIN_CATALOG;
}

export function getSkinById(id) {
  return catalogById[id] || catalogById.default;
}

export function getEquippedSkin() {
  const id = localStorage.getItem(EQUIPPED_KEY) || 'default';
  return catalogById[id] ? id : 'default';
}

export function getOwnedSkins() {
  return readOwned();
}

export function getSkinCssColor(id) {
  return getSkinById(id).color;
}

export function renderSkinSwatchHtml(id, { size = 'sm' } = {}) {
  const skin = getSkinById(id);
  const cls = size === 'lg' ? 'skin-swatch skin-swatch-lg' : 'skin-swatch';
  return `<span class="${cls}" style="background:${skin.color}" title="${skin.name}" aria-hidden="true"></span>`;
}

export function applyEquippedSkinFromProfile(skinId) {
  if (!skinId || !catalogById[skinId]) return;
  const owned = readOwned();
  if (!owned.includes(skinId)) {
    writeOwned([...owned, skinId]);
  }
  localStorage.setItem(EQUIPPED_KEY, skinId);
}

export async function syncEquippedSkinToCloud(skinId) {
  if (!catalogById[skinId] || !db) return;
  try {
    const { getCurrentUser } = await import('./auth.js');
    const uid = getCurrentUser()?.uid;
    if (!uid) return;
    await setDoc(doc(db, 'users', uid), { equippedSkin: skinId }, { merge: true });
  } catch (err) {
    console.warn('Could not sync equipped skin:', err);
  }
}

export function equipSkin(id) {
  if (!catalogById[id]) throw new Error('Unknown skin.');
  const owned = readOwned();
  if (!owned.includes(id)) throw new Error('You do not own this skin.');
  localStorage.setItem(EQUIPPED_KEY, id);
  syncEquippedSkinToCloud(id);
  window.dispatchEvent(new CustomEvent('skin:change', { detail: { skinId: id } }));
  return id;
}

export function purchaseSkin(id, getCoinCount, setCoinCount) {
  const skin = catalogById[id];
  if (!skin) throw new Error('Unknown skin.');
  const owned = readOwned();
  if (owned.includes(id)) throw new Error('You already own this skin.');

  const coins = getCoinCount();
  if (coins < skin.price) {
    throw new Error(`Not enough coins. Need ${skin.price}, have ${coins}.`);
  }

  setCoinCount(coins - skin.price);
  writeOwned([...owned, id]);
  equipSkin(id);
  return skin;
}

export function initSkinsFromProfile(profile) {
  if (profile?.equippedSkin && catalogById[profile.equippedSkin]) {
    applyEquippedSkinFromProfile(profile.equippedSkin);
  }
}

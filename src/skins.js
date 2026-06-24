import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

const OWNED_KEY = 'figglesnoot_owned_skins';
const EQUIPPED_KEY = 'figglesnoot_equipped_skin';
const COINS_KEY = 'figglesnoot_coins';

export const SKIN_CATALOG = [
  { id: 'default', name: 'Classic Blue', price: 0, color: '#457b9d' },
  { id: 'gold', name: 'Golden Snoot', price: 50, color: '#e6b422' },
  { id: 'rose', name: 'Rose', price: 75, color: '#ff4d8d' },
  { id: 'ember', name: 'Ember', price: 100, color: '#e63946' },
  { id: 'neon', name: 'Neon', price: 125, color: '#2ecc71' },
  { id: 'void', name: 'Void', price: 150, color: '#6c5ce7' },
];

export const SKIN_IDS = SKIN_CATALOG.map((s) => s.id);

const catalogById = Object.fromEntries(SKIN_CATALOG.map((s) => [s.id, s]));

function readOwnedLocal() {
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

function writeOwnedLocal(ids) {
  const unique = [...new Set(['default', ...ids.filter((id) => catalogById[id])])];
  localStorage.setItem(OWNED_KEY, JSON.stringify(unique));
  return unique;
}

function readCoinsLocal() {
  const n = parseInt(localStorage.getItem(COINS_KEY) || '0', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function writeCoinsLocal(count) {
  const n = Math.max(0, parseInt(count, 10) || 0);
  localStorage.setItem(COINS_KEY, String(n));
  return n;
}

async function syncUserEconomyToCloud(payload) {
  if (!db) return;
  try {
    const { getCurrentUser } = await import('./auth.js');
    const uid = getCurrentUser()?.uid;
    if (!uid) return;
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
  } catch (err) {
    console.warn('Could not sync profile economy:', err);
    throw err;
  }
}

export function getSkinCatalog() {
  return SKIN_CATALOG;
}

export function getSkinById(id) {
  return catalogById[id] || catalogById.default;
}

export function isValidSkinId(id) {
  return Boolean(catalogById[id]);
}

export function getSkinPrice(id) {
  return catalogById[id]?.price ?? 999999;
}

export function getEquippedSkin() {
  const id = localStorage.getItem(EQUIPPED_KEY) || 'default';
  return catalogById[id] ? id : 'default';
}

export function getOwnedSkins() {
  return readOwnedLocal();
}

export function getCoinCountLocal() {
  return readCoinsLocal();
}

export function setCoinCountLocal(count) {
  return writeCoinsLocal(count);
}

export function getSkinCssColor(id) {
  return getSkinById(id).color;
}

export function createSkinSwatchElement(id, { size = 'sm' } = {}) {
  const skin = getSkinById(id);
  const span = document.createElement('span');
  span.className = size === 'lg' ? 'skin-swatch skin-swatch-lg' : 'skin-swatch';
  span.style.background = skin.color;
  span.title = skin.name;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

export function renderSkinSwatchHtml(id, { size = 'sm' } = {}) {
  const skin = getSkinById(id);
  const cls = size === 'lg' ? 'skin-swatch skin-swatch-lg' : 'skin-swatch';
  return `<span class="${cls}" style="background:${skin.color}" title="${skin.name}" aria-hidden="true"></span>`;
}

export function applyEquippedSkinFromProfile(skinId) {
  if (!skinId || !catalogById[skinId]) return;
  const owned = readOwnedLocal();
  if (!owned.includes(skinId)) {
    writeOwnedLocal([...owned, skinId]);
  }
  localStorage.setItem(EQUIPPED_KEY, skinId);
}

export function applyProfileEconomy(profile) {
  if (!profile) return;
  if (Array.isArray(profile.ownedSkins)) {
    writeOwnedLocal(profile.ownedSkins.filter((id) => catalogById[id]));
  }
  if (typeof profile.coins === 'number' && profile.coins >= 0) {
    writeCoinsLocal(profile.coins);
  }
  if (profile.equippedSkin && catalogById[profile.equippedSkin]) {
    localStorage.setItem(EQUIPPED_KEY, profile.equippedSkin);
  }
  window.dispatchEvent(new CustomEvent('economy:change'));
}

export async function syncEquippedSkinToCloud(skinId) {
  if (!catalogById[skinId] || !db) return;
  await syncUserEconomyToCloud({ equippedSkin: skinId });
}

export async function syncCoinsToCloud(coins) {
  const n = writeCoinsLocal(coins);
  await syncUserEconomyToCloud({ coins: n });
  return n;
}

export function equipSkin(id) {
  if (!catalogById[id]) throw new Error('Unknown skin.');
  const owned = readOwnedLocal();
  if (!owned.includes(id)) throw new Error('You do not own this skin.');
  localStorage.setItem(EQUIPPED_KEY, id);
  syncEquippedSkinToCloud(id);
  window.dispatchEvent(new CustomEvent('skin:change', { detail: { skinId: id } }));
  return id;
}

export async function purchaseSkin(id, getCoinCount, setCoinCount) {
  const skin = catalogById[id];
  if (!skin) throw new Error('Unknown skin.');
  const owned = readOwnedLocal();
  if (owned.includes(id)) throw new Error('You already own this skin.');

  const coins = getCoinCount();
  if (coins < skin.price) {
    throw new Error(`Not enough coins. Need ${skin.price}, have ${coins}.`);
  }

  const newCoins = coins - skin.price;
  const newOwned = writeOwnedLocal([...owned, id]);
  setCoinCount(newCoins);
  localStorage.setItem(EQUIPPED_KEY, id);

  await syncUserEconomyToCloud({
    coins: newCoins,
    ownedSkins: newOwned,
    equippedSkin: id,
  });

  window.dispatchEvent(new CustomEvent('skin:change', { detail: { skinId: id } }));
  return skin;
}

export function initSkinsFromProfile(profile) {
  applyProfileEconomy(profile);
}

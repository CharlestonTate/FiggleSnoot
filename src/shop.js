import { switchScreens } from './screens.js';
import { playSound, selectSound, dungSound } from './audio.js';
import { updateCoinDisplay, getCoinCount, setCoinCount } from './game.js';
import {
  getSkinCatalog,
  getEquippedSkin,
  getOwnedSkins,
  purchaseSkin,
  equipSkin,
} from './skins.js';

let wired = false;
let showAllItems = false;

function setShopMessage(msg, { error = false } = {}) {
  const el = document.getElementById('shop-message');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
  el.classList.toggle('shop-message-error', error);
}

function renderShopItem(skin, owned, equipped) {
  const isOwned = owned.includes(skin.id);
  const isEquipped = equipped === skin.id;
  let label = `${skin.price} coins`;
  if (skin.price === 0) label = 'Free';
  if (isEquipped) label = 'Equipped';
  else if (isOwned) label = 'Equip';

  return `
    <button type="button" class="shop-item" data-skin-id="${skin.id}" title="${skin.name}">
      <span class="shop-item-color" style="background:${skin.color}"></span>
      <span class="shop-item-label">${skin.name}</span>
      <span class="shop-item-action">${label}</span>
    </button>
  `;
}

function handleSkinAction(skinId) {
  playSound(selectSound);
  try {
    const owned = getOwnedSkins();
    if (owned.includes(skinId)) {
      equipSkin(skinId);
      setShopMessage('Equipped!');
    } else {
      purchaseSkin(skinId, getCoinCount, setCoinCount);
      setShopMessage('Purchased!');
    }
    renderShop();
  } catch (err) {
    setShopMessage(err.message || 'Could not complete purchase.', { error: true });
  }
}

export function renderShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;

  const catalog = getSkinCatalog();
  const owned = getOwnedSkins();
  const equipped = getEquippedSkin();

  const row1 = catalog.slice(0, 3);
  const row2Base = catalog.slice(3, 5);
  const extraItems = catalog.slice(5);
  const hasMore = extraItems.length > 0;

  let row2Third;
  if (showAllItems && hasMore) {
    row2Third = renderShopItem(extraItems[0], owned, equipped);
  } else if (hasMore) {
    row2Third = `<button type="button" class="shop-item shop-view-more" id="shop-view-more-btn">View More</button>`;
  } else if (catalog[5]) {
    row2Third = renderShopItem(catalog[5], owned, equipped);
  } else {
    row2Third = '<div class="shop-item shop-item-empty"></div>';
  }

  grid.innerHTML = `
    <div class="shop-row">
      ${row1.map((s) => renderShopItem(s, owned, equipped)).join('')}
    </div>
    <div class="shop-row">
      ${row2Base.map((s) => renderShopItem(s, owned, equipped)).join('')}
      ${row2Third}
    </div>
  `;

  grid.querySelectorAll('.shop-item[data-skin-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleSkinAction(btn.dataset.skinId));
  });

  grid.querySelector('#shop-view-more-btn')?.addEventListener('click', () => {
    playSound(selectSound);
    showAllItems = true;
    renderShop();
  });
}

export function onShopOpen() {
  showAllItems = false;
  setShopMessage('');
  renderShop();
}

export function initShop(enterMenu, leaveMenu) {
  if (wired) return;
  wired = true;

  document.getElementById('shop-button')?.addEventListener('click', () => {
    playSound(selectSound);
    leaveMenu();
    switchScreens('menu', 'shop');
    onShopOpen();
  });

  document.getElementById('shop-back-button')?.addEventListener('click', () => {
    playSound(dungSound);
    switchScreens('shop', 'menu');
    updateCoinDisplay();
    enterMenu();
  });
}

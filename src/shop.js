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

function setShopMessage(msg, { error = false } = {}) {
  const el = document.getElementById('shop-message');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
  el.classList.toggle('shop-message-error', error);
  el.classList.toggle('shop-message-success', !error && Boolean(msg));
}

export function renderShop() {
  const grid = document.getElementById('shop-grid');
  const shopCoins = document.getElementById('shop-coin-count');
  if (!grid) return;

  const owned = getOwnedSkins();
  const equipped = getEquippedSkin();
  if (shopCoins) shopCoins.textContent = getCoinCount();

  grid.innerHTML = getSkinCatalog().map((skin) => {
    const isOwned = owned.includes(skin.id);
    const isEquipped = equipped === skin.id;
    let actionLabel = 'Buy';
    let actionClass = 'shop-buy-btn';
    if (isEquipped) {
      actionLabel = 'Equipped';
      actionClass = 'shop-equipped-btn';
    } else if (isOwned) {
      actionLabel = 'Equip';
      actionClass = 'shop-equip-btn';
    }

    return `
      <div class="shop-card" data-skin-id="${skin.id}">
        <div class="shop-preview" style="background:${skin.color}"></div>
        <h3 class="shop-card-name">${skin.name}</h3>
        <p class="shop-card-price">${skin.price === 0 ? 'Free' : `${skin.price} coins`}</p>
        <button type="button" class="menu-button shop-action-btn ${actionClass}" data-skin-id="${skin.id}" ${isEquipped ? 'disabled' : ''}>${actionLabel}</button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.shop-action-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const skinId = btn.dataset.skinId;
      playSound(selectSound);
      try {
        const ownedNow = getOwnedSkins();
        if (ownedNow.includes(skinId)) {
          equipSkin(skinId);
          setShopMessage('Skin equipped!');
        } else {
          purchaseSkin(skinId, getCoinCount, setCoinCount);
          setShopMessage('Purchased and equipped!');
        }
        renderShop();
      } catch (err) {
        setShopMessage(err.message || 'Could not complete purchase.', { error: true });
      }
    });
  });
}

export function onShopOpen() {
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

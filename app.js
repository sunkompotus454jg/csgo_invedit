import { InventoryConnection } from './connection.js';
import { loadCatalog } from './catalog.js?v=6';
import { loadIcons, createThumbnail, setThumbnail } from './icons.js';
import { Presentation, filterInventory } from './presentation.js?v=6';
import { VirtualGrid } from './grid.js';
import { CreationPreferences } from './creation-draft.js';
import { PRESETS } from './presets-data.js';

const $ = id => document.getElementById(id);
let catalog = null, icons = null, iconsLoading = false, loading = false;
let selectedKey = null, selectedId = null, activeTab = 'inventory';
let presentation = new Presentation(null);
let inventoryMatches = [], catalogueMatches = [];
let previousItems = new Map(), previousCatalog = null;
let drawerReturn = null;
const narrow = matchMedia('(max-width:999px)');
const preferences = new CreationPreferences();
let draftError = '';
let renderedWearKey = null, wearDirty = false;
let activePresetSide = 'all';
let activePresetColor = '';
let isApplyingPreset = false;

const CATEGORY_LABELS = {
  weapons: 'Оружие (Weapons)',
  knives: 'Ножи (Knives)',
  gloves: 'Перчатки (Gloves)',
  stickers: 'Наклейки (Stickers)',
  agents: 'Агенты (Agents)',
  containers: 'Кейсы (Containers)',
  graffiti: 'Граффити (Graffiti)',
  music: 'Музыка (Music kits)',
  patches: 'Нашивки (Patches)',
  collectibles: 'Значки (Collectibles)',
  tools: 'Инструменты (Tools)',
  keys: 'Ключи (Keys)',
  other: 'Другое (Other)'
};

const WEAPON_GROUPS = [
  {
    key: 'Rifle',
    label: 'Штурмовые винтовки (Rifles)',
    category: 'weapons',
    items: [
      { defIndex: 7, name: 'AK-47' },
      { defIndex: 16, name: 'M4A4' },
      { defIndex: 60, name: 'M4A1-S' },
      { defIndex: 8, name: 'AUG' },
      { defIndex: 10, name: 'FAMAS' },
      { defIndex: 13, name: 'Galil AR' },
      { defIndex: 39, name: 'SG 553' }
    ]
  },
  {
    key: 'Sniper Rifle',
    label: 'Снайперские винтовки (Snipers)',
    category: 'weapons',
    items: [
      { defIndex: 9, name: 'AWP' },
      { defIndex: 40, name: 'SSG 08' },
      { defIndex: 38, name: 'SCAR-20' },
      { defIndex: 11, name: 'G3SG1' }
    ]
  },
  {
    key: 'Pistol',
    label: 'Пистолеты (Pistols)',
    category: 'weapons',
    items: [
      { defIndex: 1, name: 'Desert Eagle' },
      { defIndex: 4, name: 'Glock-18' },
      { defIndex: 61, name: 'USP-S' },
      { defIndex: 36, name: 'P250' },
      { defIndex: 3, name: 'Five-SeveN' },
      { defIndex: 63, name: 'CZ75-Auto' },
      { defIndex: 30, name: 'Tec-9' },
      { defIndex: 2, name: 'Dual Berettas' },
      { defIndex: 32, name: 'P2000' },
      { defIndex: 64, name: 'R8 Revolver' }
    ]
  },
  {
    key: 'SMG',
    label: 'Пистолеты-пулеметы (SMG)',
    category: 'weapons',
    items: [
      { defIndex: 17, name: 'MAC-10' },
      { defIndex: 34, name: 'MP9' },
      { defIndex: 33, name: 'MP7' },
      { defIndex: 23, name: 'MP5-SD' },
      { defIndex: 19, name: 'P90' },
      { defIndex: 24, name: 'UMP-45' },
      { defIndex: 26, name: 'PP-Bizon' }
    ]
  },
  {
    key: 'Shotgun',
    label: 'Дробовики (Shotguns)',
    category: 'weapons',
    items: [
      { defIndex: 27, name: 'MAG-7' },
      { defIndex: 35, name: 'Nova' },
      { defIndex: 29, name: 'Sawed-Off' },
      { defIndex: 25, name: 'XM1014' }
    ]
  },
  {
    key: 'Machinegun',
    label: 'Пулеметы (Machine guns)',
    category: 'weapons',
    items: [
      { defIndex: 14, name: 'M249' },
      { defIndex: 28, name: 'Negev' }
    ]
  },
  {
    key: 'Knife',
    label: 'Ножи (Knives)',
    category: 'knives',
    items: [
      { defIndex: 507, name: 'Karambit' },
      { defIndex: 515, name: 'Butterfly Knife' },
      { defIndex: 508, name: 'M9 Bayonet' },
      { defIndex: 500, name: 'Bayonet' },
      { defIndex: 514, name: 'Bowie Knife' },
      { defIndex: 503, name: 'Classic Knife' },
      { defIndex: 512, name: 'Falchion Knife' },
      { defIndex: 505, name: 'Flip Knife' },
      { defIndex: 506, name: 'Gut Knife' },
      { defIndex: 509, name: 'Huntsman Knife' },
      { defIndex: 520, name: 'Navaja Knife' },
      { defIndex: 521, name: 'Nomad Knife' },
      { defIndex: 517, name: 'Paracord Knife' },
      { defIndex: 516, name: 'Shadow Daggers' },
      { defIndex: 525, name: 'Skeleton Knife' },
      { defIndex: 522, name: 'Stiletto Knife' },
      { defIndex: 518, name: 'Survival Knife' },
      { defIndex: 523, name: 'Talon Knife' },
      { defIndex: 519, name: 'Ursus Knife' }
    ]
  },
  {
    key: 'Gloves',
    label: 'Перчатки (Gloves)',
    category: 'gloves',
    items: [
      { defIndex: 5030, name: 'Sport Gloves' },
      { defIndex: 5034, name: 'Specialist Gloves' },
      { defIndex: 5033, name: 'Moto Gloves' },
      { defIndex: 5031, name: 'Driver Gloves' },
      { defIndex: 5032, name: 'Hand Wraps' },
      { defIndex: 5035, name: 'Hydra Gloves' },
      { defIndex: 5027, name: 'Bloodhound Gloves' },
      { defIndex: 4725, name: 'Broken Fang Gloves' }
    ]
  }
];

function populateWeaponDropdown(categoryVal, selectElem, wrapperElem) {
  if (!selectElem || !wrapperElem) return;
  const isExcluded = ['stickers', 'agents', 'music', 'containers', 'graffiti', 'patches', 'collectibles', 'tools', 'keys', 'other'].includes(categoryVal);
  if (isExcluded) {
    wrapperElem.hidden = true;
    selectElem.value = '';
    return;
  }
  wrapperElem.hidden = false;

  const currentVal = selectElem.value;
  selectElem.replaceChildren();

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  if (categoryVal === 'weapons') {
    defaultOption.textContent = 'Все оружие';
  } else if (categoryVal === 'knives') {
    defaultOption.textContent = 'Все ножи';
  } else if (categoryVal === 'gloves') {
    defaultOption.textContent = 'Все перчатки';
  } else {
    defaultOption.textContent = 'Все оружие и типы';
  }
  selectElem.append(defaultOption);

  let filteredGroups = WEAPON_GROUPS;
  if (categoryVal === 'weapons') {
    filteredGroups = WEAPON_GROUPS.filter(g => g.category === 'weapons');
  } else if (categoryVal === 'knives') {
    filteredGroups = WEAPON_GROUPS.filter(g => g.category === 'knives');
  } else if (categoryVal === 'gloves') {
    filteredGroups = WEAPON_GROUPS.filter(g => g.category === 'gloves');
  }

  const validDefIndexes = new Set();
  for (const group of filteredGroups) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const item of group.items) {
      const opt = document.createElement('option');
      opt.value = String(item.defIndex);
      opt.textContent = item.name;
      optgroup.append(opt);
      validDefIndexes.add(String(item.defIndex));
    }
    selectElem.append(optgroup);
  }

  if (validDefIndexes.has(currentVal)) {
    selectElem.value = currentVal;
  } else {
    selectElem.value = '';
  }
}

function creationDraft() {
  draftError = '';
  if (!catalog || !selectedKey) return null;
  try { return preferences.build(catalog, selectedKey); }
  catch (error) { draftError = error.message; return null; }
}

function selectedTemplate() {
  return creationDraft()?.item ?? null;
}
function renderBadges(container, badges) {
  container.replaceChildren(...badges.map(text => {
    const badge = document.createElement('span');
    badge.textContent = text;
    if (text === 'StatTrak') badge.className = 'badge-stattrak';
    return badge;
  }));
}
function renderMetadata(container, entries) {
  container.replaceChildren(...entries.flatMap(([label, value]) => {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label; description.textContent = value;
    return [term, description];
  }));
}
function createCard() {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'item-card';
  const image = createThumbnail();
  const title = document.createElement('span'); title.className = 'card-title';
  const subtitle = document.createElement('span'); subtitle.className = 'card-subtitle';
  const badges = document.createElement('span'); badges.className = 'card-badges';
  button.append(image, title, subtitle, badges);
  return button;
}
function updateCard(node, item, record = null) {
  const info = presentation.item(item, record);
  node.dataset.key = record?.key ?? item.highId;
  node.style.setProperty('--rarity', info.color);
  node.children[1].textContent = info.title;
  node.children[2].textContent = info.subtitle;
  renderBadges(node.children[3], info.badges);
  node.setAttribute('aria-label', [info.name, ...info.badges].join(', '));
  node.title = info.name;
  node.setAttribute('aria-pressed', String(record ? selectedKey === record.key : selectedId === item.highId));
  node.classList.toggle('created-item', !record && connection.creation?.status === 'confirmed' && connection.creation.highId === item.highId);
  setThumbnail(node.firstChild, record ? icons?.recordCandidates(record) : icons?.candidates(item));
}

const inventoryGrid = new VirtualGrid($('items'), {
  key: item => item.highId, create: createCard,
  update: (node, item) => updateCard(node, item),
  select: id => { selectedId = id; inventoryGrid.schedule(); renderSelection(); openDrawer(); },
});
const catalogueGrid = new VirtualGrid($('catalog-results'), {
  key: record => record.key, create: createCard,
  update: (node, record) => updateCard(node, record.template ?? { defIndex: record.defIndex, rarity: record.rarity }, record),
  select: key => { commitWear(); selectedKey = key; catalogueGrid.schedule(); renderSelection(); openDrawer(); },
});

$('catalog-results').addEventListener('dblclick', event => {
  const card = event.target.closest('.item-card');
  if (!card || narrow.matches) return;
  commitWear();
  selectedKey = card.dataset.key;
  renderSelection();
  addSelected();
});

function openDrawer() {
  if (!narrow.matches || $('selection').hidden) return;
  drawerReturn = document.activeElement;
  $('inspector').classList.add('drawer-open');
  document.body.classList.add('drawer-active');
  $('inspector').setAttribute('role', 'dialog');
  $('inspector').setAttribute('aria-modal', 'true');
  document.querySelectorAll('main > :not(.workspace), .workspace > section').forEach(node => node.inert = true);
  $('inspector-close').focus();
}
function closeDrawer(restoreFocus = true) {
  $('inspector').classList.remove('drawer-open');
  document.body.classList.remove('drawer-active');
  $('inspector').removeAttribute('role'); $('inspector').removeAttribute('aria-modal');
  document.querySelectorAll('[inert]').forEach(node => node.inert = false);
  if (restoreFocus && drawerReturn?.isConnected) drawerReturn.focus({ preventScroll: true });
}
$('inspector-close').addEventListener('click', () => closeDrawer());
narrow.addEventListener('change', () => { closeDrawer(false); $('inspector-close').hidden = !narrow.matches; });
$('inspector-close').hidden = !narrow.matches;
$('inspector').addEventListener('keydown', event => {
  if (!$('inspector').classList.contains('drawer-open')) return;
  if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
  if (event.key !== 'Tab') return;
  const controls = [...$('inspector').querySelectorAll('button, input')].filter(node => !node.disabled && node.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

function renderSelection() {
  const record = activeTab === 'catalog' ? catalog?.records.get(selectedKey) : null;
  const draft = record ? creationDraft() : null;
  let controls = draft;
  if (record?.template && !controls) {
    try { const defaults = new CreationPreferences(); defaults.statTrak = preferences.statTrak; controls = defaults.build(catalog, selectedKey); } catch {}
  }
  const item = activeTab === 'inventory' ? connection.inventory.items.get(selectedId) : draft?.item;
  const hasSelection = Boolean(record || item);
  $('selection').hidden = !hasSelection;
  $('inspector-empty').hidden = hasSelection;
  $('create').hidden = activeTab !== 'catalog';
  $('stattrak-label').hidden = !record?.statTrakTemplate;
  $('creation-controls').hidden = !record?.template;
  $('stattrak').checked = preferences.statTrak;
  $('paint-controls').hidden = !controls?.painted;
  $('counter-label').hidden = !controls?.statTrak;
  $('delete').hidden = activeTab !== 'inventory';
  $('delete').disabled = !item || !connection.canMutate;
  $('deletion-status').textContent = connection.deletion?.message || '';
  if (controls?.painted) {
    for (const id of ['wear', 'wear-slider']) { $(id).min = controls.min; $(id).max = controls.max; }
    const wear = preferences.wear === null ? controls.min : preferences.commitWear(preferences.wear, controls.min, controls.max);
    if (renderedWearKey !== record.key || (!wearDirty && document.activeElement !== $('wear'))) $('wear').value = wear;
    if (renderedWearKey !== record.key) wearDirty = false;
    $('wear-slider').value = wear;
  }
  renderedWearKey = controls?.painted ? record.key : null;
  $('creation-status').textContent = connection.creation?.message || '';
  $('view-created').hidden = !(connection.creation?.status === 'confirmed' && connection.inventory.items.has(connection.creation.highId));
  if (!hasSelection) { closeDrawer(false); return; }
  const info = presentation.item(item ?? { defIndex: record.defIndex }, record);
  $('selection-name').textContent = info.name;
  renderBadges($('selection-badges'), info.badges);
  const details = [];
  if (!record) {
    details.push(['Item', item.highId]);
    for (const [id, label] of [[8, 'Paint wear'], [7, 'Paint seed']]) {
      const attribute = item.attributes.find(a => a.defIndex === id);
      if (attribute) details.push([label, attribute.value]);
    }
  }
  if (record?.resultDefIndex != null) details.push(['Coupon creates', `Definition ${record.resultDefIndex}`]);
  if (record?.forcedStatTrak) details.push(['StatTrak', 'Forced coupon default']);
  renderMetadata($('selection-info'), details);
  $('selection-reason').textContent = [...new Set([record?.unavailableReason, record ? draftError : ''].filter(Boolean))].join(' ');
  setThumbnail($('selection-icon'), record ? (item ? icons?.candidates(item) : icons?.recordCandidates(record)) : icons?.candidates(item));
  $('create').disabled = !record || !item || !connection.canCreate;
  if ($('add-to-preset')) {
    $('add-to-preset').hidden = activeTab !== 'catalog' || !record;
  }
  // Show hint why create is disabled
  const hint = $('connect-hint');
  if (hint) {
    let hintText = '';
    if (record && item && !connection.canCreate) {
      if (!connection.inventory.ready || connection.socket === null) {
        hintText = 'Нажмите «Connect» для подключения к игре';
      } else if (connection.pendingCreate || connection.pendingDelete) {
        hintText = 'Ожидание ответа...';
      }
    }
    hint.textContent = hintText;
    hint.classList.toggle('visible', hintText !== '');
  }
}

function renderCatalog(reset = false) {
  if (!catalog) return;
  const view = $('catalog-view').value;
  $('catalog-all').disabled = view !== 'definitions';
  $('advanced-label').hidden = view !== 'definitions';
  const color = $('catalog-color') ? $('catalog-color').value : '';
  const weapon = $('catalog-weapon') && !$('catalog-weapon-wrapper').hidden && $('catalog-weapon').value
    ? Number($('catalog-weapon').value)
    : null;
  catalogueMatches = catalog.search({
    view,
    category: $('catalog-category').value,
    query: $('catalog-search').value,
    color,
    weapon,
    allDefinitions: $('catalog-all').checked
  });
  $('catalog-count').textContent = `${catalogueMatches.length.toLocaleString()} items`;
  catalogueGrid.setRecords(catalogueMatches, reset);
  renderSelection();
}

function rebuildInventory(reset = false) {
  const invWeapon = $('inventory-weapon') && !$('inventory-weapon-wrapper').hidden && $('inventory-weapon').value
    ? Number($('inventory-weapon').value)
    : null;
  inventoryMatches = filterInventory(connection.inventory.items.values(), presentation, {
    query: $('inventory-search').value,
    category: $('inventory-category').value,
    weapon: invWeapon
  });
  $('inventory-count').textContent = `${inventoryMatches.length.toLocaleString()} of ${connection.inventory.items.size.toLocaleString()} items`;
  $('empty').hidden = inventoryMatches.length > 0;
  $('empty').textContent = !connection.inventory.ready ? 'Connect to receive inventory.' : connection.inventory.items.size ? 'No items match your filters.' : 'Inventory is empty.';
  inventoryGrid.setRecords(inventoryMatches, reset);
}

function renderInventory(current) {
  $('status').textContent = current.status; $('message').textContent = current.message;
  $('connect').disabled = current.socket !== null; $('disconnect').disabled = current.socket === null;
  $('count').textContent = `(${current.inventory.items.size} items)`;
  if (!current.inventory.items.has(selectedId)) selectedId = null;
  const changed = previousCatalog !== catalog || previousItems.size !== current.inventory.items.size || [...current.inventory.items].some(([id, item]) => previousItems.get(id) !== item);
  if (changed) {
    previousItems = new Map(current.inventory.items); previousCatalog = catalog;
    rebuildInventory();
  } else { inventoryGrid.schedule(); }
  if (!inventoryMatches.length) {
    $('empty').hidden = false;
    $('empty').textContent = !current.inventory.ready ? 'Connect to receive inventory.' : current.inventory.items.size ? 'No items match your filters.' : 'Inventory is empty.';
  }
  document.querySelectorAll('.btn-apply-preset').forEach(b => {
    b.disabled = !current.inventory.ready || isApplyingPreset;
  });
  renderSelection();
}

function switchTab(tab) {
  commitWear();
  closeDrawer(false); activeTab = tab;
  for (const name of ['inventory', 'catalog', 'presets']) {
    const panel = $(name + '-panel');
    const tabBtn = $(name + '-tab');
    if (panel) panel.hidden = name !== tab;
    if (tabBtn) {
      tabBtn.setAttribute('aria-selected', String(name === tab));
      tabBtn.tabIndex = name === tab ? 0 : -1;
    }
  }
  inventoryGrid.schedule(); catalogueGrid.schedule();
  if (tab === 'presets') renderPresets();
  renderSelection();
}

for (const tab of ['inventory', 'catalog', 'presets']) {
  const tabBtn = $(tab + '-tab');
  if (tabBtn) {
    tabBtn.addEventListener('click', () => switchTab(tab));
    tabBtn.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const allTabs = ['inventory', 'catalog', 'presets'];
      const curIdx = allTabs.indexOf(tab);
      let nextIdx = curIdx;
      if (event.key === 'ArrowRight') nextIdx = (curIdx + 1) % allTabs.length;
      else if (event.key === 'ArrowLeft') nextIdx = (curIdx - 1 + allTabs.length) % allTabs.length;
      else if (event.key === 'Home') nextIdx = 0;
      else if (event.key === 'End') nextIdx = allTabs.length - 1;
      const nextTab = allTabs[nextIdx];
      switchTab(nextTab);
      $(nextTab + '-tab').focus();
    });
  }
}

const connection = new InventoryConnection(renderInventory);
$('connect').addEventListener('click', () => connection.connect());
$('disconnect').addEventListener('click', () => connection.disconnect());
window.addEventListener('pagehide', () => connection.disconnect());

for (const id of ['catalog-view', 'catalog-all', 'catalog-search']) {
  $(id).addEventListener(id === 'catalog-search' ? 'input' : 'change', () => renderCatalog(true));
}
$('catalog-category').addEventListener('change', () => {
  populateWeaponDropdown($('catalog-category').value, $('catalog-weapon'), $('catalog-weapon-wrapper'));
  renderCatalog(true);
});
$('catalog-weapon').addEventListener('change', () => renderCatalog(true));

if ($('catalog-color')) {
  $('catalog-color').addEventListener('change', () => {
    const val = $('catalog-color').value;
    document.querySelectorAll('#catalog-color-pills .color-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.color === val);
    });
    renderCatalog(true);
  });
}
document.querySelectorAll('#catalog-color-pills .color-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#catalog-color-pills .color-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    if ($('catalog-color')) $('catalog-color').value = pill.dataset.color;
    renderCatalog(true);
  });
});

$('inventory-search').addEventListener('input', () => { rebuildInventory(true); renderSelection(); });
$('inventory-category').addEventListener('change', () => {
  populateWeaponDropdown($('inventory-category').value, $('inventory-weapon'), $('inventory-weapon-wrapper'));
  rebuildInventory(true);
  renderSelection();
});
$('inventory-weapon').addEventListener('change', () => {
  rebuildInventory(true);
  renderSelection();
});
$('stattrak').addEventListener('change', () => { preferences.statTrak = $('stattrak').checked; renderSelection(); });
for (const [id, field] of [['wear-slider', 'wear'], ['seed', 'seed'], ['counter', 'counter']]) {
  $(id).addEventListener('input', () => {
    preferences[field] = $(id).value;
    if (id === 'wear-slider') { $('wear').value = $(id).value; wearDirty = false; }
    renderSelection();
  });
}

function commitWear() {
  if (activeTab !== 'catalog' || $('paint-controls').hidden || !wearDirty) return;
  preferences.commitWear($('wear').value, Number($('wear').min), Number($('wear').max));
  $('wear').value = preferences.wear;
  wearDirty = false;
  renderSelection();
}
$('wear').addEventListener('input', () => { wearDirty = true; });
$('wear').addEventListener('blur', commitWear);
$('wear').addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); commitWear(); }
});

function addSelected() {
  if (!connection.canCreate) return;
  commitWear();
  try {
    const record = catalog.records.get(selectedKey);
    connection.create(selectedTemplate(), record.name || record.internalName || record.key);
  } catch (error) {
    $('creation-status').textContent = error.message;
  }
}
$('create').addEventListener('click', addSelected);
$('delete').addEventListener('click', () => {
  const item = connection.inventory.items.get(selectedId);
  if (!item || !connection.canMutate) return;
  try { connection.delete(item.highId, presentation.item(item).name); }
  catch (error) { $('deletion-status').textContent = error.message; }
});
$('view-created').addEventListener('click', () => {
  const id = connection.creation?.highId;
  if (!connection.inventory.items.has(id)) return;
  if (!inventoryMatches.some(item => item.highId === id)) {
    $('inventory-search').value = ''; $('inventory-category').value = ''; rebuildInventory(true);
  }
  selectedId = id; switchTab('inventory');
  requestAnimationFrame(() => { inventoryGrid.reveal(id, true); renderSelection(); openDrawer(); });
});

// --- Custom Presets Management ---
const USER_PRESETS_KEY = 'csgo_invedit_user_presets';

function loadUserPresets() {
  try {
    const raw = localStorage.getItem(USER_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load user presets:', e);
    return [];
  }
}

function saveUserPresets(presets) {
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save user presets:', e);
  }
}

function getAllPresets() {
  const userPresets = loadUserPresets();
  return [...userPresets, ...PRESETS];
}

function showToast(message, durationMs = 3000) {
  const toast = $('toast-notification');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.hidden = true; }, durationMs);
}

let pendingSkinForNewPreset = null;

function openCreatePresetModal(pendingSkin = null) {
  pendingSkinForNewPreset = pendingSkin;
  $('input-preset-title').value = pendingSkin ? `Сет: ${pendingSkin.name.split(' | ')[0]}` : '';
  $('input-preset-desc').value = '';
  $('select-preset-side').value = 'all';
  $('select-preset-color').value = '';
  $('modal-create-preset').hidden = false;
  $('input-preset-title').focus();
}

function closeCreatePresetModal() {
  $('modal-create-preset').hidden = true;
  pendingSkinForNewPreset = null;
}

function openAddToPresetModal(record) {
  const userPresets = loadUserPresets();
  if (userPresets.length === 0) {
    openCreatePresetModal({ key: record.key, name: record.name });
    return;
  }
  $('add-preset-skin-name').textContent = record.name;
  setThumbnail($('add-preset-thumb'), icons?.recordCandidates(record));

  const list = $('add-preset-list');
  list.replaceChildren();

  for (const preset of userPresets) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-picker-item';
    const hasItem = preset.items.some(i => i.key === record.key);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'preset-picker-item-title';
    titleSpan.textContent = preset.title;

    const countSpan = document.createElement('span');
    countSpan.className = 'preset-picker-item-count';
    countSpan.textContent = hasItem ? `В сете (${preset.items.length})` : `${preset.items.length} предм.`;

    btn.append(titleSpan, countSpan);
    btn.addEventListener('click', () => {
      addSkinToPreset(preset.id, record);
      closeAddToPresetModal();
    });
    list.append(btn);
  }

  $('btn-create-from-picker').onclick = () => {
    closeAddToPresetModal();
    openCreatePresetModal({ key: record.key, name: record.name });
  };

  $('modal-add-to-preset').hidden = false;
}

function closeAddToPresetModal() {
  $('modal-add-to-preset').hidden = true;
}

function addSkinToPreset(presetId, record) {
  const presets = loadUserPresets();
  const preset = presets.find(p => p.id === presetId);
  if (!preset) return;
  const alreadyHas = preset.items.some(i => i.key === record.key);
  preset.items.push({ key: record.key, name: record.name });
  saveUserPresets(presets);
  showToast(alreadyHas
    ? `Скин "${record.name}" добавлен повторно в "${preset.title}"`
    : `Скин "${record.name}" добавлен в сет "${preset.title}"!`);

  const addBtn = $('add-to-preset');
  if (addBtn) {
    const prevText = addBtn.innerHTML;
    addBtn.textContent = 'Добавлено!';
    setTimeout(() => { if (addBtn) addBtn.innerHTML = prevText; }, 1500);
  }
  renderPresets();
}

function removeSkinFromPreset(presetId, itemIndex) {
  const presets = loadUserPresets();
  const preset = presets.find(p => p.id === presetId);
  if (!preset) return;
  const removed = preset.items.splice(itemIndex, 1);
  saveUserPresets(presets);
  showToast(`Скин "${removed[0]?.name || ''}" удален из сета`);
  renderPresets();
}

function deleteUserPreset(presetId) {
  const presets = loadUserPresets();
  const preset = presets.find(p => p.id === presetId);
  if (!preset) return;
  if (!confirm(`Удалить сет "${preset.title}"?`)) return;
  const updated = presets.filter(p => p.id !== presetId);
  saveUserPresets(updated);
  showToast(`Сет "${preset.title}" удален`);
  renderPresets();
}

function renderPresets() {
  const grid = $('presets-grid');
  if (!grid) return;
  const all = getAllPresets();
  const filtered = all.filter(p => {
    let matchSide = false;
    if (activePresetSide === 'all') matchSide = true;
    else if (activePresetSide === 'custom') matchSide = Boolean(p.isCustom);
    else matchSide = p.side === activePresetSide || (p.isCustom && p.side === 'all');

    const matchColor = !activePresetColor || p.color === activePresetColor;
    return matchSide && matchColor;
  });
  grid.replaceChildren(...filtered.map(preset => createPresetCard(preset)));
}

function createPresetCard(preset) {
  const card = document.createElement('div');
  card.className = 'preset-card';

  const header = document.createElement('div');
  header.className = 'preset-card-header';
  const titleBox = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'preset-card-title';
  title.textContent = preset.title;
  const desc = document.createElement('p');
  desc.className = 'preset-card-desc';
  desc.textContent = preset.desc;
  titleBox.append(title, desc);

  const badges = document.createElement('div');
  badges.className = 'preset-badges';
  if (preset.isCustom) {
    const customBadge = document.createElement('span');
    customBadge.className = 'badge badge-custom';
    customBadge.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="margin-right:3px;vertical-align:-1px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Мой сет';
    badges.append(customBadge);
  }
  const sideBadge = document.createElement('span');
  sideBadge.className = `badge badge-${preset.side.toLowerCase()}`;
  sideBadge.textContent = preset.side === 'all' ? 'T & CT' : preset.side + '-Side';
  const countBadge = document.createElement('span');
  countBadge.className = 'badge badge-color';
  countBadge.textContent = `${preset.items.length} предм.`;
  badges.append(sideBadge, countBadge);

  if (preset.isCustom) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'preset-card-delete';
    deleteBtn.title = 'Удалить этот сет';
    deleteBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteUserPreset(preset.id);
    });
    badges.append(deleteBtn);
  }

  header.append(titleBox, badges);

  const list = document.createElement('div');
  list.className = 'preset-items-list';
  if (preset.items.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'preset-empty-items';
    emptyNotice.textContent = 'В этом сете пока нет скинов. Выберите скин в Каталоге и нажмите «Добавить в мой сет».';
    list.append(emptyNotice);
  } else {
    preset.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'preset-item-row';
      const thumb = createThumbnail();
      thumb.className = 'thumbnail';
      const record = catalog?.records?.get(item.key);
      if (record) {
        setThumbnail(thumb, icons?.recordCandidates(record));
      }
      const nameSpan = document.createElement('span');
      nameSpan.className = 'preset-item-name';
      nameSpan.textContent = item.name;
      row.append(thumb, nameSpan);
      row.title = 'Нажмите, чтобы открыть в каталоге';
      row.addEventListener('click', () => {
        selectedKey = item.key;
        switchTab('catalog');
      });

      if (preset.isCustom) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'preset-item-remove';
        removeBtn.title = 'Удалить скин из сета';
        removeBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeSkinFromPreset(preset.id, index);
        });
        row.append(removeBtn);
      }

      list.append(row);
    });
  }

  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'btn-apply-preset';
  applyBtn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Добавить весь сет (' + preset.items.length + ')';
  applyBtn.disabled = !connection.inventory.ready || isApplyingPreset || preset.items.length === 0;
  applyBtn.addEventListener('click', () => applyPreset(preset));

  card.append(header, list, applyBtn);
  return card;
}

function waitForReady(conn, maxWaitMs = 8000) {
  const start = Date.now();
  return new Promise(resolve => {
    const check = () => {
      if (conn.canCreate) return resolve(true);
      if (Date.now() - start > maxWaitMs) return resolve(false);
      setTimeout(check, 50);
    };
    check();
  });
}

async function applyPreset(preset) {
  if (!connection.inventory.ready) {
    alert('Сначала нажмите Connect, чтобы подключиться к игре!');
    return;
  }
  if (isApplyingPreset) return;

  isApplyingPreset = true;
  document.querySelectorAll('.btn-apply-preset').forEach(b => b.disabled = true);

  const progressContainer = $('preset-progress-container');
  const progressText = $('preset-progress-text');
  const progressBar = $('preset-progress-bar');
  progressContainer.hidden = false;

  const total = preset.items.length;
  let successCount = 0;

  try {
    for (let i = 0; i < total; i++) {
      const itemInfo = preset.items[i];
      const record = catalog.records.get(itemInfo.key);
      if (!record) continue;

      progressText.textContent = `Добавляем ${i + 1} из ${total}: ${record.name}...`;
      progressBar.style.width = `${Math.round((i / total) * 100)}%`;

      const ready = await waitForReady(connection, 8000);
      if (!ready) {
        throw new Error('Таймаут ожидания Game Coordinator');
      }

      const template = catalog.template(itemInfo.key);
      connection.create(template, record.name);
      successCount++;
      await new Promise(r => setTimeout(r, 80));
    }

    progressBar.style.width = '100%';
    progressText.textContent = `Сет "${preset.title}" успешно добавлен в инвентарь (${successCount} предм.)!`;
    setTimeout(() => { progressContainer.hidden = true; }, 4000);
  } catch (err) {
    progressText.textContent = `Ошибка: ${err.message}`;
    setTimeout(() => { progressContainer.hidden = true; }, 4000);
  } finally {
    isApplyingPreset = false;
    document.querySelectorAll('.btn-apply-preset').forEach(b => b.disabled = !connection.inventory.ready);
  }
}

document.querySelectorAll('.side-selector .side-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.side-selector .side-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePresetSide = btn.dataset.side;
    renderPresets();
  });
});
if ($('presets-color-filter')) {
  $('presets-color-filter').addEventListener('change', () => {
    activePresetColor = $('presets-color-filter').value;
    renderPresets();
  });
}

$('btn-create-preset')?.addEventListener('click', () => openCreatePresetModal());
$('modal-create-close')?.addEventListener('click', closeCreatePresetModal);
$('btn-cancel-create')?.addEventListener('click', closeCreatePresetModal);
$('modal-add-close')?.addEventListener('click', closeAddToPresetModal);
$('btn-cancel-add')?.addEventListener('click', closeAddToPresetModal);
$('modal-create-preset')?.addEventListener('click', e => { if (e.target === $('modal-create-preset')) closeCreatePresetModal(); });
$('modal-add-to-preset')?.addEventListener('click', e => { if (e.target === $('modal-add-to-preset')) closeAddToPresetModal(); });
$('add-to-preset')?.addEventListener('click', () => {
  const record = catalog?.records.get(selectedKey);
  if (record) openAddToPresetModal(record);
});

$('form-create-preset')?.addEventListener('submit', event => {
  event.preventDefault();
  const title = $('input-preset-title').value.trim();
  if (!title) return;
  const side = $('select-preset-side').value;
  const color = $('select-preset-color').value;
  const desc = $('input-preset-desc').value.trim();

  const newPreset = {
    id: 'custom_' + Date.now(),
    title,
    side,
    color,
    desc: desc || 'Пользовательский сет',
    isCustom: true,
    items: pendingSkinForNewPreset ? [{ key: pendingSkinForNewPreset.key, name: pendingSkinForNewPreset.name }] : []
  };

  const presets = loadUserPresets();
  presets.unshift(newPreset);
  saveUserPresets(presets);

  closeCreatePresetModal();
  showToast(pendingSkinForNewPreset
    ? `Сет "${title}" создан и скин добавлен!`
    : `Сет "${title}" создан!`);

  activePresetSide = 'custom';
  document.querySelectorAll('.side-selector .side-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.side === 'custom');
  });
  renderPresets();
});

async function initializeCatalog() {
  if (loading) return;
  loading = true;
  $('catalog-status').textContent = 'Loading catalogue...';
  $('catalog-status').classList.remove('status-error');
  $('catalog-retry').hidden = true;
  try {
    catalog = await loadCatalog();
    presentation = new Presentation(catalog);
    if (icons) {
      try { icons.assertCatalog(catalog); }
      catch (error) { icons = null; iconFailure(error); }
    }
    $('catalog-status').textContent = '';
    const categories = [...new Set([...catalog.data.definitions, ...catalog.data.variants].map(r => r.category))].sort();
    for (const category of categories) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = CATEGORY_LABELS[category] || category;
      $('catalog-category').append(option);
      $('inventory-category').append(option.cloneNode(true));
    }
    populateWeaponDropdown($('catalog-category').value, $('catalog-weapon'), $('catalog-weapon-wrapper'));
    populateWeaponDropdown($('inventory-category').value, $('inventory-weapon'), $('inventory-weapon-wrapper'));
    $('catalog-controls').disabled = false;
    renderCatalog();
    renderPresets();
    inventoryGrid.schedule();
    renderInventory(connection);
  } catch (error) {
    $('catalog-status').textContent = `Catalogue unavailable: ${error.message}`;
    $('catalog-status').classList.add('status-error');
    $('catalog-retry').hidden = false;
  } finally { loading = false; }
}
$('catalog-retry').addEventListener('click', initializeCatalog);

function iconFailure(error) {
  $('icon-status').textContent = `Icons unavailable: ${error.message}`;
  $('icon-status').classList.add('status-error');
  $('icon-retry').hidden = false;
}

async function initializeIcons() {
  if (iconsLoading) return;
  iconsLoading = true;
  $('icon-status').textContent = 'Loading icons...';
  $('icon-status').classList.remove('status-error');
  $('icon-retry').hidden = true;
  try {
    const loaded = await loadIcons();
    if (catalog) loaded.assertCatalog(catalog);
    icons = loaded;
    $('icon-status').textContent = '';
    renderPresets();
  } catch (error) {
    icons = null;
    iconFailure(error);
  } finally {
    iconsLoading = false;
    catalogueGrid.schedule();
    inventoryGrid.schedule();
    renderInventory(connection);
  }
}
$('icon-retry').addEventListener('click', initializeIcons);

rebuildInventory();
renderInventory(connection);
if (location.protocol === 'file:') {
  $('message').textContent = 'Serve this directory over HTTP or HTTPS instead of opening the file directly. The GC must allow the exact page origin.';
}
initializeCatalog();
initializeIcons();

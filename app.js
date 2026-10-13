import { InventoryConnection } from './connection.js';
import { loadCatalog } from './catalog.js';
import { loadIcons, createThumbnail, setThumbnail } from './icons.js';
import { Presentation, filterInventory } from './presentation.js';
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
  setThumbnail(node.children[0], record ? (item ? icons?.candidates(item) : icons?.recordCandidates(record)) : icons?.candidates(item));
}
const inventoryGrid = new VirtualGrid($('items'), createCard, (node, item) => updateCard(node, item, catalog?.definitions?.get(item.defIndex)), id => {
  selectedId = Number(id); renderSelection();
});
const catalogueGrid = new VirtualGrid($('catalog-results'), createCard, (node, record) => updateCard(node, null, record), key => {
  selectedKey = key; renderSelection();
});
function openDrawer() {
  if (!narrow.matches || $('inspector').classList.contains('drawer-open')) return;
  drawerReturn = document.activeElement;
  $('inspector').classList.add('drawer-open');
  document.body.classList.add('drawer-active');
  $('inspector-close').hidden = false;
  $('inspector-close').focus();
}
function closeDrawer(restore = true) {
  if (!$('inspector').classList.contains('drawer-open')) return;
  $('inspector').classList.remove('drawer-open');
  document.body.classList.remove('drawer-active');
  $('inspector-close').hidden = true;
  if (restore && drawerReturn && typeof drawerReturn.focus === 'function') drawerReturn.focus();
  drawerReturn = null;
}
$('inspector-close').addEventListener('click', () => closeDrawer());
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('inspector').classList.contains('drawer-open')) {
    event.preventDefault(); closeDrawer();
  }
});
narrow.addEventListener('change', () => {
  if (!narrow.matches) closeDrawer(false);
});
function renderSelection() {
  const isInventory = activeTab === 'inventory';
  const item = isInventory ? connection.inventory.items.get(selectedId) : selectedTemplate();
  const record = isInventory ? (item ? catalog?.definitions?.get(item.defIndex) : null) : (selectedKey ? catalog?.records?.get(selectedKey) : null);
  const selected = Boolean(record || item);
  for (const node of document.querySelectorAll('.item-card[aria-pressed=true]')) node.setAttribute('aria-pressed', 'false');
  const target = document.querySelector(`.item-card[data-key="${CSS.escape(isInventory ? selectedId : selectedKey)}"]`);
  if (target) target.setAttribute('aria-pressed', 'true');
  $('selection').hidden = !selected; $('inspector-empty').hidden = selected;
  if (selected) openDrawer();
  if (!selected) {
    commitWear();
    renderedWearKey = null; $('selection-icon').src = '';
    return;
  }
  const info = presentation.item(item, record);
  $('selection').style.setProperty('--rarity', info.color);
  $('selection-name').textContent = info.fullName;
  renderBadges($('selection-badges'), info.badges);
  const canPaint = Boolean(record?.template?.attributes?.some(attr => attr.defIndex === 6));
  const hasWear = canPaint && record?.wearMin !== undefined && record?.wearMax !== undefined;
  const isPaint = Boolean(record?.kind === 'paint');
  const allowStatTrak = Boolean(record?.statTrakAvailable);
  const isVariant = Boolean(record?.kind && record.kind !== 'definition');
  $('creation-controls').hidden = isInventory || (!isVariant && !canPaint && !allowStatTrak);
  $('paint-controls').hidden = isInventory || !canPaint;
  $('seed').disabled = isInventory || !canPaint;
  $('stattrak-label').hidden = isInventory || !allowStatTrak;
  $('counter-label').hidden = isInventory || !allowStatTrak || !preferences.statTrak;
  if (!isInventory && canPaint && renderedWearKey !== selectedKey) {
    preferences.resetTo(record);
    $('wear').min = hasWear ? String(record.wearMin) : '0';
    $('wear').max = hasWear ? String(record.wearMax) : '1';
    $('wear-slider').min = $('wear').min;
    $('wear-slider').max = $('wear').max;
    $('wear').disabled = !hasWear;
    $('wear-slider').disabled = !hasWear;
    $('wear').value = preferences.wear;
    $('wear-slider').value = preferences.wear;
    $('seed').value = preferences.seed;
    wearDirty = false;
    renderedWearKey = selectedKey;
  }
  if (!isInventory) {
    $('stattrak').checked = preferences.statTrak;
    $('counter').value = preferences.counter;
  }
  $('delete').hidden = !isInventory;
  $('delete').disabled = !isInventory || !connection.canMutate;
  const details = [];
  if (isInventory && item) {
    details.push(['Inventory ID', String(item.highId)]);
    details.push(['Def index', String(item.defIndex)]);
    details.push(['Quality', String(item.quality)]);
    details.push(['Rarity', String(item.rarity)]);
    details.push(['Origin', String(item.origin)]);
    details.push(['Level', String(item.level)]);
    details.push(['Flags', String(item.flags)]);
    for (const attr of item.attributes) {
      details.push([`Attribute ${attr.defIndex}`, attr.value]);
    }
    for (const equip of item.equips) {
      details.push([`Equipped (class ${equip.classId})`, `Slot ${equip.slotId}`]);
    }
  } else if (record) {
    if (record.defIndex != null) details.push(['Def index', String(record.defIndex)]);
    if (record.quality != null) details.push(['Quality', String(record.quality)]);
    if (record.rarity != null) details.push(['Rarity', String(record.rarity)]);
    if (record.category) details.push(['Category', record.category]);
    if (record.collections?.length) details.push(['Collection', record.collections.join(', ')]);
  }
  if (record?.resultDefIndex != null) details.push(['Coupon creates', `Definition ${record.resultDefIndex}`]);
  if (record?.forcedStatTrak) details.push(['StatTrak', 'Forced coupon default']);
  renderMetadata($('selection-info'), details);
  $('selection-reason').textContent = [...new Set([record?.unavailableReason, record ? draftError : ''].filter(Boolean))].join(' ');
  setThumbnail($('selection-icon'), record ? (item ? icons?.candidates(item) : icons?.recordCandidates(record)) : icons?.candidates(item));
  $('create').disabled = !record || !item || !connection.canCreate;
}

function renderCatalog(reset = false) {
  if (!catalog) return;
  const view = $('catalog-view').value;
  $('catalog-all').disabled = view !== 'definitions';
  $('advanced-label').hidden = view !== 'definitions';
  const color = $('catalog-color') ? $('catalog-color').value : '';
  catalogueMatches = catalog.search({
    view,
    category: $('catalog-category').value,
    query: $('catalog-search').value,
    color,
    allDefinitions: $('catalog-all').checked
  });
  $('catalog-count').textContent = `${catalogueMatches.length.toLocaleString()} items`;
  catalogueGrid.setRecords(catalogueMatches, reset);
  renderSelection();
}

function rebuildInventory(reset = false) {
  inventoryMatches = filterInventory(connection.inventory.items.values(), presentation, { query: $('inventory-search').value, category: $('inventory-category').value });
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

for (const id of ['catalog-view', 'catalog-category', 'catalog-all', 'catalog-search']) {
  $(id).addEventListener(id === 'catalog-search' ? 'input' : 'change', () => renderCatalog(true));
}
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

for (const id of ['inventory-search', 'inventory-category']) {
  $(id).addEventListener(id === 'inventory-search' ? 'input' : 'change', () => { rebuildInventory(true); renderSelection(); });
}
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
    $('selection-reason').textContent = error.message;
  }
}
$('create').addEventListener('click', addSelected);
$('delete').addEventListener('click', () => {
  if (!connection.canMutate || selectedId === null) return;
  const item = connection.inventory.items.get(selectedId);
  const record = item ? catalog?.definitions?.get(item.defIndex) : null;
  const label = record?.name || (item ? `item ${item.highId}` : 'item');
  try { connection.delete(selectedId, label); }
  catch (error) { $('message').textContent = error.message; }
});

function renderPresets() {
  const grid = $('presets-grid');
  if (!grid) return;
  const filtered = PRESETS.filter(p => {
    const matchSide = activePresetSide === 'all' || p.side === activePresetSide;
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
  const sideBadge = document.createElement('span');
  sideBadge.className = `badge badge-${preset.side.toLowerCase()}`;
  sideBadge.textContent = preset.side + '-Side';
  const countBadge = document.createElement('span');
  countBadge.className = 'badge badge-color';
  countBadge.textContent = `${preset.items.length} предм.`;
  badges.append(sideBadge, countBadge);

  header.append(titleBox, badges);

  const list = document.createElement('div');
  list.className = 'preset-items-list';
  for (const item of preset.items) {
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
    list.append(row);
  }

  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'btn-apply-preset';
  applyBtn.textContent = `⚡ Добавить весь сет (${preset.items.length})`;
  applyBtn.disabled = !connection.inventory.ready || isApplyingPreset;
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
      progressBar.style.width = `${Math.round(((i) / total) * 100)}%`;

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
    progressText.textContent = `✅ Сет "${preset.title}" успешно добавлен в инвентарь (${successCount} предм.)!`;
    setTimeout(() => { progressContainer.hidden = true; }, 4000);
  } catch (err) {
    progressText.textContent = `❌ Ошибка: ${err.message}`;
    setTimeout(() => { progressContainer.hidden = true; }, 4000);
  } finally {
    isApplyingPreset = false;
    document.querySelectorAll('.btn-apply-preset').forEach(b => b.disabled = !connection.inventory.ready);
  }
}

// Preset filter controls
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
      option.textContent = category;
      $('catalog-category').append(option);
      $('inventory-category').append(option.cloneNode(true));
    }
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

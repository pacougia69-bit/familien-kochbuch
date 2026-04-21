/* ============================================================
   FAMILIEN-KOCHBUCH — app.js
   ============================================================ */

// ─── STATE ────────────────────────────────────────────────────
const state = {
  recipes: [],          // all recipes (loaded + user-added)
  filtered: [],         // currently displayed recipes
  activeFilter: 'all',  // 'all' | 'Phil' | 'Zusammen'
  searchQuery: '',
  timeFilter: false,    // < 30 min

  // Detail view
  currentRecipe: null,
  currentPortions: 4,

  // Shopping list — persisted to localStorage
  shoppingItems: [],    // { id, text, checked }
  freeNotes: [],        // { id, text, checked }
  nextShoppingId: 1,

  // Notes per recipe — persisted to localStorage
  recipeNotes: {},      // { recipeId: ['note1', ...] }
};

// ─── DOM REFS ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const dom = {
  recipesGrid:      $('recipesGrid'),
  emptyState:       $('emptyState'),
  resultsInfo:      $('resultsInfo'),
  searchInput:      $('searchInput'),
  searchClear:      $('searchClear'),
  timeFilter30:     $('timeFilter30'),
  cartBtn:          $('cartBtn'),
  cartBadge:        $('cartBadge'),
  fabBtn:           $('fabBtn'),

  // Recipe detail
  recipeOverlay:    $('recipeOverlay'),
  recipeBackdrop:   $('recipeBackdrop'),
  recipeSheet:      $('recipeSheet'),
  closeRecipe:      $('closeRecipe'),
  detailImage:      $('detailImage'),
  detailCategory:   $('detailCategory'),
  detailTitle:      $('detailTitle'),
  detailDurationText: $('detailDurationText'),
  portionsMinus:    $('portionsMinus'),
  portionsPlus:     $('portionsPlus'),
  portionsCount:    $('portionsCount'),
  addToCartBtn:     $('addToCartBtn'),
  detailIngredients: $('detailIngredients'),
  detailSteps:      $('detailSteps'),
  detailNotes:      $('detailNotes'),
  noteInput:        $('noteInput'),
  addNoteBtn:       $('addNoteBtn'),

  // Shopping
  shoppingOverlay:  $('shoppingOverlay'),
  shoppingBackdrop: $('shoppingBackdrop'),
  closeShoppingBtn: $('closeShoppingBtn'),
  shoppingEmpty:    $('shoppingEmpty'),
  shoppingItems:    $('shoppingItems'),
  freeNoteInput:    $('freeNoteInput'),
  addFreeNoteBtn:   $('addFreeNoteBtn'),
  freeNotesList:    $('freeNotesList'),
  clearListBtn:     $('clearListBtn'),

  // Add Recipe
  addRecipeOverlay:   $('addRecipeOverlay'),
  addRecipeBackdrop:  $('addRecipeBackdrop'),
  closeAddRecipeBtn:  $('closeAddRecipeBtn'),
  cancelAddRecipeBtn: $('cancelAddRecipeBtn'),
  addRecipeForm:      $('addRecipeForm'),
  ingredientBuilder:  $('ingredientBuilder'),
  stepsBuilder:       $('stepsBuilder'),
  addIngredientBtn:   $('addIngredientBtn'),
  addStepBtn:         $('addStepBtn'),
};

// ─── INIT ──────────────────────────────────────────────────────
async function init() {
  loadFromStorage();
  await loadRecipes();
  applyFilters();
  renderShoppingList();
  updateCartBadge();
  bindEvents();
}

async function loadRecipes() {
  try {
    const res = await fetch('./data/recipes.json');
    state.recipes = await res.json();
  } catch (e) {
    console.error('Rezepte konnten nicht geladen werden', e);
    state.recipes = [];
  }
}

// ─── PERSISTENCE ───────────────────────────────────────────────
function saveToStorage() {
  localStorage.setItem('kb_shopping', JSON.stringify(state.shoppingItems));
  localStorage.setItem('kb_free_notes', JSON.stringify(state.freeNotes));
  localStorage.setItem('kb_next_id', String(state.nextShoppingId));
  localStorage.setItem('kb_recipe_notes', JSON.stringify(state.recipeNotes));
}

function loadFromStorage() {
  try {
    const s = localStorage.getItem('kb_shopping');
    if (s) state.shoppingItems = JSON.parse(s);

    const fn = localStorage.getItem('kb_free_notes');
    if (fn) state.freeNotes = JSON.parse(fn);

    const ni = localStorage.getItem('kb_next_id');
    if (ni) state.nextShoppingId = parseInt(ni, 10);

    const rn = localStorage.getItem('kb_recipe_notes');
    if (rn) state.recipeNotes = JSON.parse(rn);
  } catch {}
}

// ─── FILTERING & RENDERING CARDS ──────────────────────────────
function applyFilters() {
  let results = state.recipes.slice();

  if (state.activeFilter !== 'all') {
    results = results.filter(r => r.category === state.activeFilter);
  }

  if (state.timeFilter) {
    results = results.filter(r => r.duration < 30);
  }

  if (state.searchQuery.trim()) {
    const terms = state.searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    results = results.filter(recipe => {
      const haystack = [
        recipe.title,
        ...recipe.ingredients.map(i => i.name),
      ].join(' ').toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }

  state.filtered = results;
  renderGrid();
}

function renderGrid() {
  const recipes = state.filtered;

  dom.resultsInfo.textContent = recipes.length === 1
    ? '1 Rezept gefunden'
    : `${recipes.length} Rezepte gefunden`;

  if (recipes.length === 0) {
    dom.recipesGrid.innerHTML = '';
    dom.emptyState.classList.remove('hidden');
    return;
  }

  dom.emptyState.classList.add('hidden');

  dom.recipesGrid.innerHTML = recipes.map(r => `
    <article class="recipe-card" data-id="${r.id}" role="button" tabindex="0" aria-label="${r.title} öffnen">
      <div class="card-image-wrapper">
        <img
          class="card-image"
          src="${r.image}"
          alt="${r.title}"
          loading="lazy"
          onerror="this.src='https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400'"
        />
        <span class="card-category-tag ${r.category.toLowerCase()}">${r.category}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${escHtml(r.title)}</h2>
        <div class="card-meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          ${r.duration} Min
        </div>
      </div>
    </article>
  `).join('');
}

// ─── RECIPE DETAIL ────────────────────────────────────────────
function openRecipe(id) {
  const recipe = state.recipes.find(r => r.id === id);
  if (!recipe) return;

  state.currentRecipe = recipe;
  state.currentPortions = recipe.servings;

  dom.detailImage.src = recipe.image;
  dom.detailImage.alt = recipe.title;
  dom.detailCategory.textContent = recipe.category;
  dom.detailCategory.className = `recipe-category-tag ${recipe.category.toLowerCase()}`;
  dom.detailTitle.textContent = recipe.title;
  dom.detailDurationText.textContent = `${recipe.duration} Min`;

  updatePortionsUI();
  renderIngredients();
  renderSteps(recipe.steps);
  renderNotes(recipe.id);

  openOverlay(dom.recipeOverlay);
  dom.recipeSheet.querySelector('.sheet-scroll').scrollTop = 0;
}

function updatePortionsUI() {
  const { currentRecipe, currentPortions } = state;
  dom.portionsCount.textContent = currentPortions;
  dom.portionsMinus.disabled = currentPortions <= 1;
  if (!currentRecipe) return;
  renderIngredients();
}

function renderIngredients() {
  const { currentRecipe, currentPortions } = state;
  const ratio = currentPortions / currentRecipe.servings;

  dom.detailIngredients.innerHTML = currentRecipe.ingredients.map(ing => {
    const rawAmount = ing.menge * ratio;
    const amount = formatAmount(rawAmount);
    return `
      <li>
        <span class="ingredient-amount">${amount} ${escHtml(ing.einheit)}</span>
        <span class="ingredient-name">${escHtml(ing.name)}</span>
      </li>
    `;
  }).join('');
}

function renderSteps(steps) {
  dom.detailSteps.innerHTML = steps.map((step, i) => `
    <li>
      <span class="step-number">${i + 1}</span>
      <span>${escHtml(step)}</span>
    </li>
  `).join('');
}

function renderNotes(recipeId) {
  const stored = state.recipeNotes[recipeId] || [];
  const recipe = state.recipes.find(r => r.id === recipeId);
  const allNotes = [...(recipe?.notes || []), ...stored];

  if (allNotes.length === 0) {
    dom.detailNotes.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.88rem;">Noch keine Notizen. Schreib als Erste(r)!</p>';
    return;
  }

  dom.detailNotes.innerHTML = allNotes.map(note => `
    <div class="note-item">${escHtml(note)}</div>
  `).join('');
}

function addNote() {
  const text = dom.noteInput.value.trim();
  if (!text || !state.currentRecipe) return;

  const id = state.currentRecipe.id;
  if (!state.recipeNotes[id]) state.recipeNotes[id] = [];
  state.recipeNotes[id].push(text);
  dom.noteInput.value = '';

  saveToStorage();
  renderNotes(id);
}

// ─── SHOPPING LIST ────────────────────────────────────────────
function addIngredientsToCart() {
  const { currentRecipe, currentPortions } = state;
  if (!currentRecipe) return;

  const ratio = currentPortions / currentRecipe.servings;

  currentRecipe.ingredients.forEach(ing => {
    const rawAmount = ing.menge * ratio;
    const amount = formatAmount(rawAmount);
    const text = `${amount} ${ing.einheit} ${ing.name}`;

    // Avoid duplicates (by ingredient name)
    const exists = state.shoppingItems.some(item =>
      item.text.toLowerCase().includes(ing.name.toLowerCase())
    );
    if (!exists) {
      state.shoppingItems.push({
        id: state.nextShoppingId++,
        text,
        checked: false,
      });
    }
  });

  saveToStorage();
  renderShoppingList();
  updateCartBadge();

  // Feedback
  const btn = dom.addToCartBtn;
  const original = btn.innerHTML;
  btn.classList.add('success');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Hinzugefügt!`;
  setTimeout(() => {
    btn.classList.remove('success');
    btn.innerHTML = original;
  }, 1800);

  showToast(`${currentRecipe.ingredients.length} Zutaten hinzugefügt`);
}

function renderShoppingList() {
  const items = state.shoppingItems;
  const hasItems = items.length > 0;

  dom.shoppingEmpty.classList.toggle('hidden', hasItems);
  dom.shoppingItems.innerHTML = '';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = `shopping-item${item.checked ? ' checked' : ''}`;
    li.dataset.id = item.id;
    li.innerHTML = `
      <div class="shopping-item-check"></div>
      <span class="shopping-item-text">${escHtml(item.text)}</span>
      <button class="shopping-item-remove" data-id="${item.id}" aria-label="Entfernen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    li.querySelector('.shopping-item-check').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleShoppingItem(item.id);
    });

    li.querySelector('.shopping-item-text').addEventListener('click', () => {
      toggleShoppingItem(item.id);
    });

    li.querySelector('.shopping-item-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeShoppingItem(item.id);
    });

    dom.shoppingItems.appendChild(li);
  });

  renderFreeNotes();
  updateCartBadge();
}

function toggleShoppingItem(id) {
  const item = state.shoppingItems.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveToStorage();
    renderShoppingList();
  }
}

function removeShoppingItem(id) {
  state.shoppingItems = state.shoppingItems.filter(i => i.id !== id);
  saveToStorage();
  renderShoppingList();
}

function renderFreeNotes() {
  dom.freeNotesList.innerHTML = '';
  state.freeNotes.forEach(note => {
    const li = document.createElement('li');
    li.className = `free-note-item${note.checked ? ' checked' : ''}`;
    li.innerHTML = `
      <div class="shopping-item-check"></div>
      <span class="free-note-text">${escHtml(note.text)}</span>
      <button class="shopping-item-remove" aria-label="Entfernen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    li.querySelector('.shopping-item-check').addEventListener('click', () => {
      note.checked = !note.checked;
      saveToStorage();
      renderFreeNotes();
    });

    li.querySelector('.free-note-text').addEventListener('click', () => {
      note.checked = !note.checked;
      saveToStorage();
      renderFreeNotes();
    });

    li.querySelector('.shopping-item-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.freeNotes = state.freeNotes.filter(n => n.id !== note.id);
      saveToStorage();
      renderFreeNotes();
    });

    dom.freeNotesList.appendChild(li);
  });
}

function addFreeNote() {
  const text = dom.freeNoteInput.value.trim();
  if (!text) return;
  state.freeNotes.push({ id: state.nextShoppingId++, text, checked: false });
  dom.freeNoteInput.value = '';
  saveToStorage();
  renderFreeNotes();
}

function clearShoppingList() {
  if (state.shoppingItems.length === 0 && state.freeNotes.length === 0) return;
  if (!confirm('Einkaufsliste wirklich leeren?')) return;
  state.shoppingItems = [];
  state.freeNotes = [];
  saveToStorage();
  renderShoppingList();
  showToast('Liste geleert');
}

function updateCartBadge() {
  const unchecked = state.shoppingItems.filter(i => !i.checked).length;
  dom.cartBadge.textContent = unchecked;
  dom.cartBadge.classList.toggle('hidden', unchecked === 0);
}

// ─── ADD RECIPE ───────────────────────────────────────────────
function openAddRecipe() {
  dom.addRecipeForm.reset();
  dom.ingredientBuilder.innerHTML = '';
  dom.stepsBuilder.innerHTML = '';
  addIngredientRow();
  addIngredientRow();
  addStepRow();
  addStepRow();
  openOverlay(dom.addRecipeOverlay);
}

function addIngredientRow(menge = '', einheit = '', name = '') {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="number" min="0" step="any" placeholder="Menge" value="${menge}" aria-label="Menge" />
    <input type="text" placeholder="Einheit" value="${einheit}" aria-label="Einheit" />
    <input type="text" placeholder="Zutat" value="${name}" aria-label="Zutat" />
    <button type="button" class="btn-remove-row" aria-label="Entfernen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
  dom.ingredientBuilder.appendChild(row);
}

function addStepRow(text = '') {
  const stepCount = dom.stepsBuilder.children.length + 1;
  const row = document.createElement('div');
  row.className = 'step-row';
  row.innerHTML = `
    <textarea placeholder="Schritt ${stepCount}: …" rows="2" aria-label="Schritt">${text}</textarea>
    <button type="button" class="btn-remove-row" aria-label="Schritt entfernen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
  dom.stepsBuilder.appendChild(row);
}

function handleAddRecipeSubmit(e) {
  e.preventDefault();

  const title    = $('newTitle').value.trim();
  const category = $('newCategory').value;
  const duration = parseInt($('newDuration').value, 10);
  const servings = parseInt($('newServings').value, 10) || 4;
  const image    = $('newImage').value.trim() ||
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800';

  let valid = true;

  // Validate
  [$('newTitle'), $('newCategory'), $('newDuration')].forEach(el => el.classList.remove('error'));

  if (!title) { $('newTitle').classList.add('error'); valid = false; }
  if (!category) { $('newCategory').classList.add('error'); valid = false; }
  if (!duration || duration < 1) { $('newDuration').classList.add('error'); valid = false; }

  if (!valid) {
    showToast('Bitte alle Pflichtfelder ausfüllen');
    return;
  }

  // Collect ingredients
  const ingredients = [];
  dom.ingredientBuilder.querySelectorAll('.ingredient-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const menge = parseFloat(inputs[0].value) || 0;
    const einheit = inputs[1].value.trim();
    const name = inputs[2].value.trim();
    if (name) ingredients.push({ menge, einheit, name });
  });

  // Collect steps
  const steps = [];
  dom.stepsBuilder.querySelectorAll('textarea').forEach(ta => {
    const text = ta.value.trim();
    if (text) steps.push(text);
  });

  const newRecipe = {
    id: Date.now(),
    title,
    image,
    category,
    duration,
    servings,
    ingredients,
    steps,
    notes: [],
  };

  state.recipes.push(newRecipe);
  applyFilters();
  closeOverlay(dom.addRecipeOverlay);
  showToast(`"${title}" wurde hinzugefügt`);
}

// ─── OVERLAY HELPERS ──────────────────────────────────────────
function openOverlay(overlay) {
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Trigger animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('open'));
  });
}

function closeOverlay(overlay) {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => overlay.classList.add('hidden'), 420);
}

// ─── HELPERS ──────────────────────────────────────────────────
function formatAmount(value) {
  if (value === 0) return '0';
  // Round to max 1 decimal place, remove trailing zero
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let toastTimer = null;
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── EVENT BINDING ────────────────────────────────────────────
function bindEvents() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  // Search
  dom.searchInput.addEventListener('input', () => {
    state.searchQuery = dom.searchInput.value;
    dom.searchClear.classList.toggle('hidden', !state.searchQuery);
    applyFilters();
  });

  dom.searchClear.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.searchQuery = '';
    dom.searchClear.classList.add('hidden');
    dom.searchInput.focus();
    applyFilters();
  });

  // Time filter
  dom.timeFilter30.addEventListener('click', () => {
    state.timeFilter = !state.timeFilter;
    dom.timeFilter30.dataset.active = state.timeFilter;
    dom.timeFilter30.classList.toggle('active', state.timeFilter);
    applyFilters();
  });

  // Recipe cards (delegated)
  dom.recipesGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.recipe-card');
    if (card) openRecipe(Number(card.dataset.id));
  });

  dom.recipesGrid.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.recipe-card');
      if (card) openRecipe(Number(card.dataset.id));
    }
  });

  // Recipe detail close
  dom.closeRecipe.addEventListener('click', () => closeOverlay(dom.recipeOverlay));
  dom.recipeBackdrop.addEventListener('click', () => closeOverlay(dom.recipeOverlay));

  // Portions
  dom.portionsMinus.addEventListener('click', () => {
    if (state.currentPortions > 1) {
      state.currentPortions--;
      updatePortionsUI();
    }
  });

  dom.portionsPlus.addEventListener('click', () => {
    state.currentPortions++;
    updatePortionsUI();
  });

  // Add to cart
  dom.addToCartBtn.addEventListener('click', addIngredientsToCart);

  // Notes
  dom.addNoteBtn.addEventListener('click', addNote);
  dom.noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addNote();
  });

  // Cart
  dom.cartBtn.addEventListener('click', () => openOverlay(dom.shoppingOverlay));
  dom.closeShoppingBtn.addEventListener('click', () => closeOverlay(dom.shoppingOverlay));
  dom.shoppingBackdrop.addEventListener('click', () => closeOverlay(dom.shoppingOverlay));
  dom.clearListBtn.addEventListener('click', clearShoppingList);

  // Free notes
  dom.addFreeNoteBtn.addEventListener('click', addFreeNote);
  dom.freeNoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addFreeNote();
  });

  // FAB
  dom.fabBtn.addEventListener('click', openAddRecipe);

  // Add recipe modal
  dom.closeAddRecipeBtn.addEventListener('click', () => closeOverlay(dom.addRecipeOverlay));
  dom.cancelAddRecipeBtn.addEventListener('click', () => closeOverlay(dom.addRecipeOverlay));
  dom.addRecipeBackdrop.addEventListener('click', () => closeOverlay(dom.addRecipeOverlay));
  dom.addIngredientBtn.addEventListener('click', () => addIngredientRow());
  dom.addStepBtn.addEventListener('click', () => addStepRow());
  dom.addRecipeForm.addEventListener('submit', handleAddRecipeSubmit);

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    [dom.recipeOverlay, dom.shoppingOverlay, dom.addRecipeOverlay].forEach(overlay => {
      if (!overlay.classList.contains('hidden') && overlay.classList.contains('open')) {
        closeOverlay(overlay);
      }
    });
  });
}

// ─── START ────────────────────────────────────────────────────
init();

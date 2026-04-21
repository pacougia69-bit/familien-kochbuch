/* ============================================================
   FAMILIEN-KOCHBUCH — app.js (mit Edit-Funktion)
   ============================================================ */

// ─── STATE ────────────────────────────────────────────────────
const state = {
  recipes: [],          // alle Rezepte
  filtered: [],         // aktuell angezeigte Rezepte
  activeFilter: 'all',  
  searchQuery: '',
  timeFilter: false,    

  currentRecipe: null,
  currentPortions: 4,

  shoppingItems: [],    
  freeNotes: [],        
  nextShoppingId: 1,
  recipeNotes: {},      
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

  shoppingOverlay:  $('shoppingOverlay'),
  shoppingBackdrop: $('shoppingBackdrop'),
  closeShoppingBtn: $('closeShoppingBtn'),
  shoppingEmpty:    $('shoppingEmpty'),
  shoppingItems:    $('shoppingItems'),
  freeNoteInput:    $('freeNoteInput'),
  addFreeNoteBtn:   $('addFreeNoteBtn'),
  freeNotesList:    $('freeNotesList'),
  clearListBtn:     $('clearListBtn'),

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
      const haystack = [recipe.title, ...recipe.ingredients.map(i => i.name)].join(' ').toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }
  state.filtered = results;
  renderGrid();
}

function renderGrid() {
  const recipes = state.filtered;
  dom.resultsInfo.textContent = recipes.length === 1 ? '1 Rezept gefunden' : `${recipes.length} Rezepte gefunden`;
  if (recipes.length === 0) {
    dom.recipesGrid.innerHTML = '';
    dom.emptyState.classList.remove('hidden');
    return;
  }
  dom.emptyState.classList.add('hidden');
  dom.recipesGrid.innerHTML = recipes.map(r => `
    <article class="recipe-card" data-id="${r.id}" role="button" tabindex="0">
      <div class="card-image-wrapper">
        <img class="card-image" src="${r.image}" alt="${r.title}" loading="lazy" onerror="this.src='https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400'"/>
        <span class="card-category-tag ${r.category.toLowerCase()}">${r.category}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${escHtml(r.title)}</h2>
        <div class="card-meta">${r.duration} Min</div>
      </div>
    </article>
  `).join('');
}

// ─── RECIPE DETAIL & EDIT ──────────────────────────────────────────
function openRecipe(id) {
  const recipe = state.recipes.find(r => r.id === id);
  if (!recipe) return;

  state.currentRecipe = recipe;
  state.currentPortions = recipe.servings;

  dom.detailImage.src = recipe.image;
  dom.detailCategory.textContent = recipe.category;
  dom.detailCategory.className = `recipe-category-tag ${recipe.category.toLowerCase()}`;
  dom.detailTitle.textContent = recipe.title;
  dom.detailDurationText.textContent = `${recipe.duration} Min`;

  // Edit Button hinzufügen falls nicht da
  let editBtn = dom.recipeOverlay.querySelector('.btn-edit-recipe');
  if (!editBtn) {
    editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-recipe';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    dom.recipeSheet.querySelector('.recipe-hero').appendChild(editBtn);
    editBtn.addEventListener('click', () => prepareEditRecipe(state.currentRecipe));
  }

  updatePortionsUI();
  renderIngredients();
  renderSteps(recipe.steps);
  renderNotes(recipe.id);
  openOverlay(dom.recipeOverlay);
}

function prepareEditRecipe(recipe) {
  closeOverlay(dom.recipeOverlay);
  openAddRecipe();
  dom.addRecipeOverlay.querySelector('h2').textContent = 'Rezept bearbeiten';
  
  $('newTitle').value = recipe.title;
  $('newCategory').value = recipe.category;
  $('newDuration').value = recipe.duration;
  $('newServings').value = recipe.servings;
  $('newImage').value = recipe.image;
  
  dom.ingredientBuilder.innerHTML = '';
  recipe.ingredients.forEach(ing => addIngredientRow(ing.menge, ing.einheit, ing.name));
  
  dom.stepsBuilder.innerHTML = '';
  recipe.steps.forEach(step => addStepRow(step));
  
  dom.addRecipeForm.dataset.editId = recipe.id;
}

function updatePortionsUI() {
  dom.portionsCount.textContent = state.currentPortions;
  dom.portionsMinus.disabled = state.currentPortions <= 1;
  renderIngredients();
}

function renderIngredients() {
  const { currentRecipe, currentPortions } = state;
  const ratio = currentPortions / currentRecipe.servings;
  dom.detailIngredients.innerHTML = currentRecipe.ingredients.map(ing => `
    <li>
      <span class="ingredient-amount">${formatAmount(ing.menge * ratio)} ${escHtml(ing.einheit)}</span>
      <span class="ingredient-name">${escHtml(ing.name)}</span>
    </li>
  `).join('');
}

function renderSteps(steps) {
  dom.detailSteps.innerHTML = steps.map((step, i) => `<li><span class="step-number">${i + 1}</span><span>${escHtml(step)}</span></li>`).join('');
}

function renderNotes(recipeId) {
  const stored = state.recipeNotes[recipeId] || [];
  const recipe = state.recipes.find(r => r.id === recipeId);
  const allNotes = [...(recipe?.notes || []), ...stored];
  dom.detailNotes.innerHTML = allNotes.length === 0 ? '<p>Noch keine Notizen.</p>' : allNotes.map(note => `<div class="note-item">${escHtml(note)}</div>`).join('');
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
    const text = `${formatAmount(ing.menge * ratio)} ${ing.einheit} ${ing.name}`;
    if (!state.shoppingItems.some(item => item.text.toLowerCase().includes(ing.name.toLowerCase()))) {
      state.shoppingItems.push({ id: state.nextShoppingId++, text, checked: false });
    }
  });
  saveToStorage();
  renderShoppingList();
  showToast('Zutaten hinzugefügt');
}

function renderShoppingList() {
  dom.shoppingEmpty.classList.toggle('hidden', state.shoppingItems.length > 0);
  dom.shoppingItems.innerHTML = state.shoppingItems.map(item => `
    <li class="shopping-item ${item.checked ? 'checked' : ''}" onclick="toggleShoppingItem(${item.id})">
      <div class="shopping-item-check"></div>
      <span class="shopping-item-text">${escHtml(item.text)}</span>
    </li>
  `).join('');
  updateCartBadge();
}

function toggleShoppingItem(id) {
  const item = state.shoppingItems.find(i => i.id === id);
  if (item) item.checked = !item.checked;
  saveToStorage();
  renderShoppingList();
}

function clearShoppingList() {
  state.shoppingItems = [];
  saveToStorage();
  renderShoppingList();
}

function updateCartBadge() {
  const count = state.shoppingItems.filter(i => !i.checked).length;
  dom.cartBadge.textContent = count;
  dom.cartBadge.classList.toggle('hidden', count === 0);
}

// ─── ADD / EDIT FORM ──────────────────────────────────────────
function openAddRecipe() {
  dom.addRecipeForm.reset();
  dom.addRecipeOverlay.querySelector('h2').textContent = 'Neues Rezept';
  delete dom.addRecipeForm.dataset.editId;
  dom.ingredientBuilder.innerHTML = '';
  dom.stepsBuilder.innerHTML = '';
  addIngredientRow();
  addStepRow();
  openOverlay(dom.addRecipeOverlay);
}

function addIngredientRow(menge = '', einheit = '', name = '') {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="number" step="any" placeholder="Menge" value="${menge}" style="width:70px">
    <input type="text" placeholder="Einh." value="${einheit}" style="width:70px">
    <input type="text" placeholder="Zutat" value="${name}" style="flex:1">
    <button type="button" onclick="this.parentElement.remove()">X</button>
  `;
  dom.ingredientBuilder.appendChild(row);
}

function addStepRow(text = '') {
  const row = document.createElement('div');
  row.className = 'step-row';
  row.innerHTML = `<textarea placeholder="Schritt..." rows="2" style="flex:1">${text}</textarea><button type="button" onclick="this.parentElement.remove()">X</button>`;
  dom.stepsBuilder.appendChild(row);
}

function handleAddRecipeSubmit(e) {
  e.preventDefault();
  const title = $('newTitle').value.trim();
  const category = $('newCategory').value;
  const duration = parseInt($('newDuration').value);
  
  if (!title || !category || !duration) return showToast('Bitte alles ausfüllen');

  const ingredients = [];
  dom.ingredientBuilder.querySelectorAll('.ingredient-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs[2].value) ingredients.push({ menge: parseFloat(inputs[0].value) || 0, einheit: inputs[1].value, name: inputs[2].value });
  });

  const steps = [];
  dom.stepsBuilder.querySelectorAll('textarea').forEach(ta => { if (ta.value) steps.push(ta.value); });

  const newRecipe = {
    id: dom.addRecipeForm.dataset.editId ? Number(dom.addRecipeForm.dataset.editId) : Date.now(),
    title, image: $('newImage').value || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    category, duration, servings: parseInt($('newServings').value) || 4, ingredients, steps
  };

  if (dom.addRecipeForm.dataset.editId) {
    const idx = state.recipes.findIndex(r => r.id === newRecipe.id);
    state.recipes[idx] = newRecipe;
  } else {
    state.recipes.push(newRecipe);
  }

  applyFilters();
  closeOverlay(dom.addRecipeOverlay);
  showToast('Gespeichert!');
}

// ─── HELPERS ──────────────────────────────────────────────────
function openOverlay(el) { el.classList.remove('hidden'); setTimeout(() => el.classList.add('open'), 10); }
function closeOverlay(el) { el.classList.remove('open'); setTimeout(() => el.classList.add('hidden'), 400); }
function formatAmount(v) { return v === 0 ? '' : Math.round(v * 10) / 10; }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ─── EVENTS ───────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeFilter = btn.dataset.filter;
    applyFilters();
  }));

  dom.searchInput.addEventListener('input', () => { state.searchQuery = dom.searchInput.value; applyFilters(); });
  dom.recipesGrid.addEventListener('click', e => {
    const card = e.target.closest('.recipe-card');
    if (card) openRecipe(Number(card.dataset.id));
  });

  dom.closeRecipe.addEventListener('click', () => closeOverlay(dom.recipeOverlay));
  dom.portionsMinus.addEventListener('click', () => { if (state.currentPortions > 1) { state.currentPortions--; updatePortionsUI(); } });
  dom.portionsPlus.addEventListener('click', () => { state.currentPortions++; updatePortionsUI(); });
  dom.addToCartBtn.addEventListener('click', addIngredientsToCart);
  dom.cartBtn.addEventListener('click', () => openOverlay(dom.shoppingOverlay));
  dom.closeShoppingBtn.addEventListener('click', () => closeOverlay(dom.shoppingOverlay));
  dom.fabBtn.addEventListener('click', openAddRecipe);
  dom.addIngredientBtn.addEventListener('click', () => addIngredientRow());
  dom.addStepBtn.addEventListener('click', () => addStepRow());
  dom.addRecipeForm.addEventListener('submit', handleAddRecipeSubmit);
  dom.cancelAddRecipeBtn.addEventListener('click', () => closeOverlay(dom.addRecipeOverlay));
}

init();

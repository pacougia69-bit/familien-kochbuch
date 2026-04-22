/* ============================================================
   FAMILIEN-KOCHBUCH — Firebase Version (Final)
   ============================================================ */

// 1. Firebase Konfiguration (Deine Zugangsdaten)
const firebaseConfig = {
  apiKey: "AIzaSyCp7M97mA2gbkevQNni_6RIo6XNpLJLOgc",
  authDomain: "familien-kochbuch-56de6.firebaseapp.com",
  projectId: "familien-kochbuch-56de6",
  storageBucket: "familien-kochbuch-56de6.firebasestorage.app",
  messagingSenderId: "138685113816",
  appId: "1:138685113816:web:574ed7eb20ca5cabad7ead"
};

// 2. Firebase Initialisieren
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ─── STATE ────────────────────────────────────────────────────
const state = {
  recipes: [],
  filtered: [],
  activeFilter: 'all',
  searchQuery: '',
  timeFilter: false,
  currentRecipe: null,
  currentPortions: 4,
  shoppingItems: []
};

// ─── DOM REFS ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const dom = {
  recipesGrid: $('recipesGrid'),
  emptyState: $('emptyState'),
  resultsInfo: $('resultsInfo'),
  searchInput: $('searchInput'),
  timeFilter30: $('timeFilter30'),
  cartBtn: $('cartBtn'),
  cartBadge: $('cartBadge'),
  fabBtn: $('fabBtn'),
  recipeOverlay: $('recipeOverlay'),
  recipeSheet: $('recipeSheet'),
  closeRecipe: $('closeRecipe'),
  detailImage: $('detailImage'),
  detailCategory: $('detailCategory'),
  detailTitle: $('detailTitle'),
  detailDurationText: $('detailDurationText'),
  portionsMinus: $('portionsMinus'),
  portionsPlus: $('portionsPlus'),
  portionsCount: $('portionsCount'),
  addToCartBtn: $('addToCartBtn'),
  detailIngredients: $('detailIngredients'),
  detailSteps: $('detailSteps'),
  addRecipeOverlay: $('addRecipeOverlay'),
  addRecipeForm: $('addRecipeForm'),
  ingredientBuilder: $('ingredientBuilder'),
  stepsBuilder: $('stepsBuilder'),
  addIngredientBtn: $('addIngredientBtn'),
  addStepBtn: $('addStepBtn'),
  shoppingOverlay: $('shoppingOverlay'),
  shoppingItems: $('shoppingItems'),
  closeShoppingBtn: $('closeShoppingBtn'),
  shoppingEmpty: $('shoppingEmpty'),
  clearListBtn: $('clearListBtn')
};

// ─── INIT ──────────────────────────────────────────────────────
async function init() {
  loadShoppingFromStorage();
  await syncWithFirebase();
  bindEvents();
}

// ─── FIREBASE LOGIK ────────────────────────────────────────────
async function syncWithFirebase() {
  // Echtzeit-Überwachung: Sobald sich was in der Cloud ändert, aktualisiert sich die App
  db.collection("recipes").onSnapshot(async (snapshot) => {
    let recipes = [];
    snapshot.forEach(doc => {
      recipes.push({ id: doc.id, ...doc.data() });
    });

    // Erster Start: Wenn Firebase leer ist, lade Daten aus recipes.json hoch
    if (recipes.length === 0) {
      console.log("Datenbank ist noch leer. Kopiere Rezepte aus recipes.json...");
      try {
        const res = await fetch('./data/recipes.json');
        const initialData = await res.json();
        for (const r of initialData) {
          // Wir entfernen die alte ID, Firebase vergibt eigene
          const { id, ...dataWithoutId } = r;
          await db.collection("recipes").add(dataWithoutId);
        }
      } catch (e) {
        console.error("Fehler beim Initial-Upload:", e);
      }
      return;
    }

    state.recipes = recipes;
    applyFilters();
  });
}

async function saveRecipeToFirebase(recipeData, editId = null) {
  if (editId) {
    await db.collection("recipes").doc(editId).update(recipeData);
  } else {
    await db.collection("recipes").add(recipeData);
  }
}

// ─── FILTER & RENDER ──────────────────────────────────────────
function applyFilters() {
  let results = state.recipes.slice();
  if (state.activeFilter !== 'all') results = results.filter(r => r.category === state.activeFilter);
  if (state.timeFilter) results = results.filter(r => r.duration < 30);
  if (state.searchQuery.trim()) {
    const term = state.searchQuery.toLowerCase();
    results = results.filter(r => r.title.toLowerCase().includes(term));
  }
  state.filtered = results;
  renderGrid();
}

function renderGrid() {
  dom.resultsInfo.textContent = `${state.filtered.length} Rezepte gefunden`;
  dom.emptyState.classList.toggle('hidden', state.filtered.length > 0);
  dom.recipesGrid.innerHTML = state.filtered.map(r => `
    <article class="recipe-card" onclick="openRecipe('${r.id}')">
      <div class="card-image-wrapper">
        <img class="card-image" src="${r.image}" onerror="this.src='https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'">
        <span class="card-category-tag ${r.category.toLowerCase()}">${r.category}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${r.title}</h2>
        <div class="card-meta">${r.duration} Min</div>
      </div>
    </article>
  `).join('');
}

// ─── DETAIL & EDIT ───────────────────────────────────────────
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

  // Edit Button (Stift)
  let editBtn = dom.recipeOverlay.querySelector('.btn-edit-recipe');
  if (!editBtn) {
    editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-recipe';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    dom.recipeSheet.querySelector('.recipe-hero').appendChild(editBtn);
    editBtn.onclick = () => prepareEditRecipe(state.currentRecipe);
  }

  updatePortionsUI();
  dom.detailSteps.innerHTML = recipe.steps.map((s, i) => `<li><span class="step-number">${i+1}</span><span>${s}</span></li>`).join('');
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

// ─── FORMULAR ─────────────────────────────────────────────────
function handleAddRecipeSubmit(e) {
  e.preventDefault();
  const ingredients = [];
  dom.ingredientBuilder.querySelectorAll('.ingredient-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs[2].value) ingredients.push({ menge: parseFloat(inputs[0].value) || 0, einheit: inputs[1].value, name: inputs[2].value });
  });
  const steps = [];
  dom.stepsBuilder.querySelectorAll('textarea').forEach(ta => { if (ta.value) steps.push(ta.value); });

  const recipeData = {
    title: $('newTitle').value,
    category: $('newCategory').value,
    duration: parseInt($('newDuration').value) || 0,
    servings: parseInt($('newServings').value) || 4,
    image: $('newImage').value || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    ingredients,
    steps
  };

  const editId = dom.addRecipeForm.dataset.editId;
  saveRecipeToFirebase(recipeData, editId);
  closeOverlay(dom.addRecipeOverlay);
  showToast('Gespeichert!');
}

// ─── SHOPPING LIST ────────────────────────────────────────────
function loadShoppingFromStorage() {
  const s = localStorage.getItem('kb_shopping');
  if (s) state.shoppingItems = JSON.parse(s);
  renderShoppingList();
}

function renderShoppingList() {
  dom.shoppingEmpty.classList.toggle('hidden', state.shoppingItems.length > 0);
  dom.shoppingItems.innerHTML = state.shoppingItems.map(item => `
    <li class="shopping-item ${item.checked ? 'checked' : ''}" onclick="toggleShoppingItem(${item.id})">
      <div class="shopping-item-check"></div>
      <span>${item.text}</span>
    </li>
  `).join('');
  updateCartBadge();
}

function toggleShoppingItem(id) {
  const item = state.shoppingItems.find(i => i.id === id);
  if (item) item.checked = !item.checked;
  localStorage.setItem('kb_shopping', JSON.stringify(state.shoppingItems));
  renderShoppingList();
}

function updateCartBadge() {
  const count = state.shoppingItems.filter(i => !i.checked).length;
  dom.cartBadge.textContent = count;
  dom.cartBadge.classList.toggle('hidden', count === 0);
}

// ─── HELPERS ──────────────────────────────────────────────────
function openOverlay(el) { el.classList.remove('hidden'); setTimeout(() => el.classList.add('open'), 10); }
function closeOverlay(el) { el.classList.remove('open'); setTimeout(() => el.classList.add('hidden'), 400); }
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}
function addIngredientRow(m='', e='', n='') {
  const div = document.createElement('div'); div.className = 'ingredient-row';
  div.innerHTML = `<input type="number" step="any" value="${m}" style="width:60px"><input type="text" value="${e}" style="width:60px"><input type="text" value="${n}" style="flex:1"><button type="button" onclick="this.parentElement.remove()">X</button>`;
  dom.ingredientBuilder.appendChild(div);
}
function addStepRow(t='') {
  const div = document.createElement('div'); div.className = 'step-row';
  div.innerHTML = `<textarea style="flex:1">${t}</textarea><button type="button" onclick="this.parentElement.remove()">X</button>`;
  dom.stepsBuilder.appendChild(div);
}
function openAddRecipe() {
  dom.addRecipeForm.reset();
  delete dom.addRecipeForm.dataset.editId;
  dom.ingredientBuilder.innerHTML = ''; dom.stepsBuilder.innerHTML = '';
  addIngredientRow(); addStepRow();
  openOverlay(dom.addRecipeOverlay);
}
function renderIngredients() {
  const ratio = state.currentPortions / state.currentRecipe.servings;
  dom.detailIngredients.innerHTML = state.currentRecipe.ingredients.map(ing => `<li><span>${Math.round(ing.menge * ratio * 10)/10} ${ing.einheit}</span> <span>${ing.name}</span></li>`).join('');
}
function updatePortionsUI() { dom.portionsCount.textContent = state.currentPortions; renderIngredients(); }

// ─── EVENTS ───────────────────────────────────────────────────
function bindEvents() {
  dom.searchInput.addEventListener('input', () => { state.searchQuery = dom.searchInput.value; applyFilters(); });
  dom.closeRecipe.onclick = () => closeOverlay(dom.recipeOverlay);
  dom.fabBtn.onclick = openAddRecipe;
  dom.addIngredientBtn.onclick = () => addIngredientRow();
  dom.addStepBtn.onclick = () => addStepRow();
  dom.addRecipeForm.onsubmit = handleAddRecipeSubmit;
  dom.cartBtn.onclick = () => openOverlay(dom.shoppingOverlay);
  dom.closeShoppingBtn.onclick = () => closeOverlay(dom.shoppingOverlay);
  dom.portionsMinus.onclick = () => { if (state.currentPortions > 1) { state.currentPortions--; updatePortionsUI(); } };
  dom.portionsPlus.onclick = () => { state.currentPortions++; updatePortionsUI(); };
  dom.clearListBtn.onclick = () => { state.shoppingItems = []; localStorage.setItem('kb_shopping', '[]'); renderShoppingList(); };
  
  document.querySelectorAll('.filter-btn').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeFilter = btn.dataset.filter;
    applyFilters();
  });
}

init();

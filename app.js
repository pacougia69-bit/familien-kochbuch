const firebaseConfig = {
  apiKey: "AIzaSyCp7M97mA2gbkevQNni_6RIo6XNpLJLOgc",
  authDomain: "familien-kochbuch-56de6.firebaseapp.com",
  projectId: "familien-kochbuch-56de6",
  storageBucket: "familien-kochbuch-56de6.firebasestorage.app",
  messagingSenderId: "138685113816",
  appId: "1:138685113816:web:574ed7eb20ca5cabad7ead"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const state = {
  recipes: [],
  filtered: [],
  activeFilter: 'all',
  searchQuery: '',
  currentRecipe: null,
  currentPortions: 4,
  shoppingItems: []
};

const $ = (id) => document.getElementById(id);
const dom = {
  recipesGrid: $('recipesGrid'),
  emptyState: $('emptyState'),
  resultsInfo: $('resultsInfo'),
  searchInput: $('searchInput'),
  randomBtn: $('randomBtn'),
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
  detailIngredients: $('detailIngredients'),
  detailSteps: $('detailSteps'),
  addRecipeOverlay: $('addRecipeOverlay'),
  addRecipeForm: $('addRecipeForm'),
  ingredientBuilder: $('ingredientBuilder'),
  stepsBuilder: $('stepsBuilder'),
  addIngredientBtn: $('addIngredientBtn'),
  addStepBtn: $('addStepBtn'),
  closeAddRecipeBtn: $('closeAddRecipeBtn')
};

async function init() {
  await syncWithFirebase();
  bindEvents();
}

async function syncWithFirebase() {
  db.collection("recipes").onSnapshot(async (snapshot) => {
    let recipes = [];
    snapshot.forEach(doc => { recipes.push({ id: doc.id, ...doc.data() }); });

    // Wenn die Datenbank leer ist, laden wir deine 3 Rezepte hoch
    if (recipes.length === 0) {
      const initial = [
        {
          title: "Portugiesischer Bohneneintopf",
          category: "Zusammen",
          duration: 45, servings: 4,
          image: "https://i.ibb.co/L7PZz7Z/bohneneintopf.jpg",
          ingredients: [
            {menge: 250, einheit: "g", name: "Chouriço (oder Mettenden)"},
            {menge: 2, einheit: "Dosen", name: "Weiße Bohnen (Abtropfgewicht ca. 240g)"},
            {menge: 1, einheit: "Bund", name: "Suppengrün (Möhre, Porree, Sellerie)"},
            {menge: 1, einheit: "EL", name: "Tomatenmark"},
            {menge: 500, einheit: "ml", name: "Fleischbrühe"},
            {menge: 1, einheit: "TL", name: "Paprikapulver edelsüß"}
          ],
          steps: [
            "Wurst in Scheiben schneiden und in einem großen Topf fettfrei anbraten.",
            "Suppengrün fein würfeln und kurz mitdünsten.",
            "Tomatenmark und Paprikapulver unterrühren.",
            "Mit Fleischbrühe aufgießen und zugedeckt ca. 15 Min. köcheln lassen.",
            "Bohnen in einem Sieb abspülen, dazugeben und weitere 10 Min. ziehen lassen.",
            "Nach Belieben mit Salz und Pfeffer abschmecken."
          ]
        },
        {
          title: "Geflügel-Paprika-Pfanne mit Feta",
          category: "Phil",
          duration: 30, servings: 2,
          image: "https://i.ibb.co/2S8Xz9G/paprikapfanne.jpg",
          ingredients: [
            {menge: 400, einheit: "g", name: "Hähnchenbrustfilet"},
            {menge: 2, einheit: "Stück", name: "Paprikaschoten (rot & gelb)"},
            {menge: 1, einheit: "Stück", name: "Zwiebel"},
            {menge: 150, einheit: "g", name: "Feta-Käse"},
            {menge: 1, einheit: "EL", name: "Olivenöl"},
            {menge: 1, einheit: "TL", name: "Oregano (getrocknet)"}
          ],
          steps: [
            "Hähnchenbrust waschen, trocken tupfen und in mundgerechte Würfel schneiden.",
            "Paprika putzen und in Streifen schneiden, Zwiebel fein würfeln.",
            "Öl in einer Pfanne erhitzen und das Fleisch darin goldbraun anbraten.",
            "Zwiebeln und Paprika hinzufügen und ca. 5-8 Minuten mitbraten.",
            "Mit Salz, Pfeffer und Oregano würzen.",
            "Feta grob zerbröseln, über die Pfanne geben und kurz schmelzen lassen."
          ]
        },
        {
          title: "Nudelauflauf mit Brokkoli",
          category: "Phil",
          duration: 35, servings: 3,
          image: "https://i.ibb.co/pW3BfVf/nudelauflauf.jpg",
          ingredients: [
            {menge: 300, einheit: "g", name: "Nudeln (z.B. Penne oder Fusilli)"},
            {menge: 1, einheit: "Kopf", name: "Brokkoli (frisch)"},
            {menge: 200, einheit: "ml", name: "Sahne oder Kochsahne"},
            {menge: 100, einheit: "g", name: "Gerieber Käse (z.B. Gouda)"},
            {menge: 1, einheit: "Prise", name: "Muskatnuss"}
          ],
          steps: [
            "Nudeln in Salzwasser nach Packungsanweisung garen.",
            "Brokkoli in kleine Röschen teilen und die letzten 3-4 Min. mit den Nudeln kochen.",
            "Alles abgießen und in eine gefettete Auflaufform geben.",
            "Sahne mit Salz, Pfeffer und Muskat verrühren und darüber gießen.",
            "Mit Käse bestreuen und im Ofen bei 200°C ca. 15 Min. goldbraun backen."
          ]
        }
      ];
      for (const r of initial) { await db.collection("recipes").add(r); }
      return;
    }
    state.recipes = recipes;
    applyFilters();
  });
}

function applyFilters() {
  let res = state.recipes.slice();
  if (state.activeFilter !== 'all') res = res.filter(r => r.category === state.activeFilter);
  if (state.searchQuery.trim()) {
    const t = state.searchQuery.toLowerCase();
    res = res.filter(r => r.title.toLowerCase().includes(t));
  }
  state.filtered = res;
  renderGrid();
}

function renderGrid() {
  dom.resultsInfo.textContent = `${state.filtered.length} Rezepte`;
  dom.emptyState.classList.toggle('hidden', state.filtered.length > 0);
  dom.recipesGrid.innerHTML = state.filtered.map(r => `
    <article class="recipe-card" onclick="openRecipe('${r.id}')">
      <div class="card-image-wrapper">
        <img class="card-image" src="${r.image}" onerror="this.src='https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'">
        <span class="card-category-tag ${r.category.toLowerCase()}">${r.category}</span>
      </div>
      <div class="card-body"><h2 class="card-title">${r.title}</h2><div class="card-meta">${r.duration} Min</div></div>
    </article>
  `).join('');
}

function openRecipe(id) {
  const r = state.recipes.find(rec => rec.id === id);
  if (!r) return;
  state.currentRecipe = r;
  state.currentPortions = r.servings;
  dom.detailImage.src = r.image;
  dom.detailCategory.textContent = r.category;
  dom.detailTitle.textContent = r.title;
  dom.detailDurationText.textContent = `${r.duration} Min`;

  let actionBox = dom.recipeSheet.querySelector('.action-box');
  if (!actionBox) {
    actionBox = document.createElement('div');
    actionBox.className = 'action-box';
    actionBox.style = "position:absolute; top:10px; left:10px; display:flex; gap:10px; z-index:100;";
    dom.recipeSheet.querySelector('.recipe-hero').appendChild(actionBox);
  }
  actionBox.innerHTML = `
    <button class="btn-edit" style="background:white; border:none; border-radius:50%; width:40px; height:40px; box-shadow:0 2px 5px rgba(0,0,0,0.2); font-size:18px; cursor:pointer;">✏️</button>
    <button class="btn-delete" style="background:#ff4444; border:none; border-radius:50%; width:40px; height:40px; box-shadow:0 2px 5px rgba(0,0,0,0.2); color:white; font-size:18px; cursor:pointer;">🗑️</button>
  `;

  actionBox.querySelector('.btn-edit').onclick = (e) => { e.stopPropagation(); prepareEdit(r); };
  actionBox.querySelector('.btn-delete').onclick = (e) => { e.stopPropagation(); deleteRecipe(r.id); };

  updatePortionsUI();
  dom.detailSteps.innerHTML = r.steps.map((s, i) => `<li>${s}</li>`).join('');
  openOverlay(dom.recipeOverlay);
}

async function deleteRecipe(id) {
  if (confirm("Dieses Rezept wirklich löschen?")) {
    await db.collection("recipes").doc(id).delete();
    closeOverlay(dom.recipeOverlay);
    showToast("Rezept wurde gelöscht!");
  }
}

function prepareEdit(r) {
  closeOverlay(dom.recipeOverlay);
  openAddRecipe();
  $('newTitle').value = r.title;
  $('newCategory').value = r.category;
  $('newDuration').value = r.duration;
  $('newServings').value = r.servings;
  $('newImage').value = r.image;
  dom.ingredientBuilder.innerHTML = '';
  r.ingredients.forEach(i => addIngredientRow(i.menge, i.einheit, i.name));
  dom.stepsBuilder.innerHTML = '';
  r.steps.forEach(s => addStepRow(s));
  dom.addRecipeForm.dataset.editId = r.id;
}

function handleAddSubmit(e) {
  e.preventDefault();
  const ingredients = [];
  dom.ingredientBuilder.querySelectorAll('.ingredient-row').forEach(row => {
    const i = row.querySelectorAll('input');
    if (i[2].value) ingredients.push({ menge: parseFloat(i[0].value) || 0, einheit: i[1].value, name: i[2].value });
  });
  const steps = [];
  dom.stepsBuilder.querySelectorAll('textarea').forEach(t => { if (t.value) steps.push(t.value); });

  const data = {
    title: $('newTitle').value,
    category: $('newCategory').value,
    duration: parseInt($('newDuration').value) || 0,
    servings: parseInt($('newServings').value) || 4,
    image: $('newImage').value || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    ingredients, steps
  };

  const eid = dom.addRecipeForm.dataset.editId;
  if (eid) db.collection("recipes").doc(eid).update(data);
  else db.collection("recipes").add(data);
  
  closeOverlay(dom.addRecipeOverlay);
  showToast('Gespeichert!');
}

function bindEvents() {
  dom.searchInput.oninput = () => { state.searchQuery = dom.searchInput.value; applyFilters(); };
  dom.closeRecipe.onclick = () => closeOverlay(dom.recipeOverlay);
  dom.closeAddRecipeBtn.onclick = () => closeOverlay(dom.addRecipeOverlay);
  dom.fabBtn.onclick = openAddRecipe;
  dom.addIngredientBtn.onclick = () => addIngredientRow();
  dom.addStepBtn.onclick = () => addStepRow();
  dom.addRecipeForm.onsubmit = handleAddSubmit;
  dom.portionsMinus.onclick = () => { if (state.currentPortions > 1) { state.currentPortions--; updatePortionsUI(); } };
  dom.portionsPlus.onclick = () => { state.currentPortions++; updatePortionsUI(); };
  
  dom.randomBtn.onclick = () => {
    if (state.filtered.length === 0) return showToast("Nichts zum Auslosen da!");
    const r = state.filtered[Math.floor(Math.random() * state.filtered.length)];
    openRecipe(r.id);
  };

  document.querySelectorAll('.filter-btn').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeFilter = btn.dataset.filter;
    applyFilters();
  });
}

function openOverlay(el) { el.classList.remove('hidden'); setTimeout(() => el.classList.add('open'), 10); }
function closeOverlay(el) { el.classList.remove('open'); setTimeout(() => el.classList.add('hidden'), 400); }
function showToast(m) { 
  let t = document.createElement('div'); 
  t.style = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:white; padding:10px 20px; border-radius:20px; z-index:1000;";
  t.textContent = m; 
  document.body.appendChild(t); 
  setTimeout(() => t.remove(), 2000); 
}
function addIngredientRow(m='', e='', n='') {
  const d = document.createElement('div'); d.className = 'ingredient-row';
  d.style = "display:flex; gap:5px; margin-bottom:5px;";
  d.innerHTML = `<input type="number" step="any" value="${m}" style="width:50px"><input type="text" value="${e}" style="width:50px"><input type="text" value="${n}" style="flex:1"><button type="button" onclick="this.parentElement.remove()">X</button>`;
  dom.ingredientBuilder.appendChild(d);
}
function addStepRow(t='') {
  const d = document.createElement('div'); d.className = 'step-row';
  d.style = "display:flex; gap:5px; margin-bottom:5px;";
  d.innerHTML = `<textarea style="flex:1">${t}</textarea><button type="button" onclick="this.parentElement.remove()">X</button>`;
  dom.stepsBuilder.appendChild(d);
}
function openAddRecipe() {
  dom.addRecipeForm.reset(); delete dom.addRecipeForm.dataset.editId;
  dom.ingredientBuilder.innerHTML = ''; dom.stepsBuilder.innerHTML = '';
  addIngredientRow(); addStepRow(); openOverlay(dom.addRecipeOverlay);
}
function updatePortionsUI() {
  dom.portionsCount.textContent = state.currentPortions;
  const ratio = state.currentPortions / state.currentRecipe.servings;
  dom.detailIngredients.innerHTML = state.currentRecipe.ingredients.map(i => `<li><span>${Math.round(i.menge * ratio * 10)/10} ${i.einheit}</span> ${i.name}</li>`).join('');
}

init();

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
  weekPlan: {}
};

const $ = (id) => document.getElementById(id);
const dom = {
  recipesGrid: $('recipesGrid'),
  searchInput: $('searchInput'),
  randomBtn: $('randomBtn'),
  fabBtn: $('fabBtn'),
  plannerOverlay: $('plannerOverlay'),
  openPlannerBtn: $('openPlannerBtn'),
  recipeOverlay: $('recipeOverlay'),
  detailImage: $('detailImage'),
  detailTitle: $('detailTitle'),
  detailIngredients: $('detailIngredients'),
  detailSteps: $('detailSteps'),
  portionsCount: $('portionsCount'),
  plannerDisplay: $('plannerDisplay'),
  daySelector: $('daySelector'),
  addToPlannerBtn: $('addToPlannerBtn')
};

async function init() {
  await syncWithFirebase();
  await syncPlanner();
  bindEvents();
}

async function syncWithFirebase() {
  db.collection("recipes").onSnapshot(async (snapshot) => {
    let recipes = [];
    snapshot.forEach(doc => { recipes.push({ id: doc.id, ...doc.data() }); });

    // TRICK: Wenn Bohneneintopf fehlt, lade ihn IMMER hoch
    const hasBohnen = recipes.some(r => r.title.includes("Bohneneintopf"));
    if (!hasBohnen) {
      const news = [
        {
          title: "Portugiesischer Bohneneintopf", category: "Zusammen", duration: 45, servings: 4,
          image: "https://i.ibb.co/L7PZz7Z/bohneneintopf.jpg",
          ingredients: [{menge: 2, einheit: "Dosen", name: "Bohnen"}, {menge: 250, einheit: "g", name: "Wurst"}],
          steps: ["Wurst braten", "Gemüse dazu", "Köcheln"]
        },
        {
          title: "Geflügel-Paprika-Pfanne mit Feta", category: "Phil", duration: 30, servings: 2,
          image: "https://i.ibb.co/2S8Xz9G/paprikapfanne.jpg",
          ingredients: [{menge: 400, einheit: "g", name: "Hähnchen"}, {menge: 150, einheit: "g", name: "Feta"}],
          steps: ["Fleisch braten", "Paprika dazu", "Feta drüber"]
        }
      ];
      for (const r of news) { await db.collection("recipes").add(r); }
    }

    state.recipes = recipes;
    applyFilters();
  });
}

async function syncPlanner() {
  db.collection("planner").doc("currentWeek").onSnapshot(doc => {
    state.weekPlan = doc.exists ? doc.data() : {};
    renderPlanner();
  });
}

function renderPlanner() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const names = {"Mo":"Montag","Di":"Dienstag","Mi":"Mittwoch","Do":"Donnerstag","Fr":"Freitag","Sa":"Samstag","So":"Sonntag"};
  dom.plannerDisplay.innerHTML = days.map(d => `
    <div class="planner-row">
      <strong>${names[d]}:</strong> 
      <span>${state.weekPlan[d] || "---"}</span>
    </div>
  `).join('');
}

function applyFilters() {
  let res = state.recipes.slice();
  if (state.activeFilter !== 'all') res = res.filter(r => r.category === state.activeFilter);
  if (state.searchQuery) res = res.filter(r => r.title.toLowerCase().includes(state.searchQuery.toLowerCase()));
  state.filtered = res;
  renderGrid();
}

function renderGrid() {
  dom.recipesGrid.innerHTML = state.filtered.map(r => `
    <div class="recipe-card" onclick="openRecipe('${r.id}')">
      <img src="${r.image}">
      <h3>${r.title}</h3>
    </div>
  `).join('');
}

function openRecipe(id) {
  const r = state.recipes.find(rec => rec.id === id);
  state.currentRecipe = r;
  dom.detailImage.src = r.image;
  dom.detailTitle.textContent = r.title;
  renderIngredients();
  dom.detailSteps.innerHTML = r.steps.map(s => `<li>${s}</li>`).join('');
  dom.recipeOverlay.classList.remove('hidden');
}

function renderIngredients() {
  const ratio = state.currentPortions / state.currentRecipe.servings;
  dom.detailIngredients.innerHTML = state.currentRecipe.ingredients.map(i => 
    `<li>${Math.round(i.menge * ratio)} ${i.einheit} ${i.name}</li>`).join('');
}

function bindEvents() {
  dom.openPlannerBtn.onclick = () => dom.plannerOverlay.classList.remove('hidden');
  document.querySelectorAll('.close-overlay').forEach(b => b.onclick = () => {
    dom.plannerOverlay.classList.add('hidden');
    dom.recipeOverlay.classList.add('hidden');
  });

  dom.addToPlannerBtn.onclick = async () => {
    const day = dom.daySelector.value;
    if (!day) return;
    await db.collection("planner").doc("currentWeek").update({ [day]: state.currentRecipe.title });
    dom.recipeOverlay.classList.add('hidden');
  };

  dom.randomBtn.onclick = () => {
    const r = state.filtered[Math.floor(Math.random() * state.filtered.length)];
    if(r) openRecipe(r.id);
  };

  document.querySelectorAll('.filter-btn').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeFilter = btn.dataset.filter;
    applyFilters();
  });
}

init();

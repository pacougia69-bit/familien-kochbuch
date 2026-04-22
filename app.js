const firebaseConfig = {
  apiKey: "AIzaSyCp7M97mA2gbkevQNni_6RIo6XNpLJLOgc",
  authDomain: "familien-kochbuch-56de6.firebaseapp.com",
  projectId: "familien-kochbuch-56de6",
  storageBucket: "familien-kochbuch-56de6.firebasestorage.app",
  messagingSenderId: "138685113816",
  appId: "1:138685113816:web:574ed7eb20ca5cabad7ead"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
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

async function init() {
  await syncWithFirebase();
  await syncPlanner();
  bindEvents();
}

async function syncWithFirebase() {
  db.collection("recipes").onSnapshot(async (snapshot) => {
    let recipes = [];
    snapshot.forEach(doc => { recipes.push({ id: doc.id, ...doc.data() }); });

    // GEZIELTE PRÜFUNG: Wenn Bohneneintopf fehlt -> Rezepte hochladen
    const hasNew = recipes.some(r => r.title.includes("Bohneneintopf"));
    if (!hasNew) {
      console.log("Erzeuge neue Rezepte...");
      const news = [
        {
          title: "Portugiesischer Bohneneintopf", category: "Zusammen", duration: 45, servings: 4,
          image: "https://i.ibb.co/L7PZz7Z/bohneneintopf.jpg",
          ingredients: [
            {menge: 250, einheit: "g", name: "Chouriço"},
            {menge: 2, einheit: "Dosen", name: "Weiße Bohnen"},
            {menge: 1, einheit: "Bund", name: "Suppengrün"}
          ],
          steps: ["Wurst braten.", "Gemüse würfeln und mitdünsten.", "Brühe dazu, 15 Min. kochen.", "Bohnen rein."]
        },
        {
          title: "Geflügel-Paprika-Pfanne mit Feta", category: "Phil", duration: 30, servings: 2,
          image: "https://i.ibb.co/2S8Xz9G/paprikapfanne.jpg",
          ingredients: [
            {menge: 400, einheit: "g", name: "Hähnchen"},
            {menge: 2, einheit: "Stück", name: "Paprika"},
            {menge: 150, einheit: "g", name: "Feta"}
          ],
          steps: ["Fleisch braten.", "Paprika und Zwiebeln dazu.", "Feta am Ende drüber."]
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
  if($('plannerDisplay')) {
    $('plannerDisplay').innerHTML = days.map(d => `
      <div class="planner-row">
        <strong>${names[d]}</strong> 
        <span style="color:#E85D4A; font-weight:bold;">${state.weekPlan[d] || "---"}</span>
      </div>
    `).join('');
  }
}

function applyFilters() {
  let res = state.recipes.slice();
  if (state.activeFilter !== 'all') res = res.filter(r => r.category === state.activeFilter);
  if (state.searchQuery) res = res.filter(r => r.title.toLowerCase().includes(state.searchQuery.toLowerCase()));
  state.filtered = res;
  renderGrid();
}

function renderGrid() {
  if(!$('recipesGrid')) return;
  $('recipesGrid').innerHTML = state.filtered.map(r => `
    <div class="recipe-card" onclick="openRecipe('${r.id}')" style="cursor:pointer; margin-bottom:15px; border-radius:15px; overflow:hidden; border:1px solid #eee; background:white;">
      <img src="${r.image}" style="width:100%; height:150px; object-fit:cover;">
      <div style="padding:10px;">
        <h3 style="margin:0; font-size:1rem;">${r.title}</h3>
        <small style="color:#999;">${r.duration} Min | ${r.category}</small>
      </div>
    </div>
  `).join('');
  $('resultsInfo').textContent = `${state.filtered.length} Rezepte gefunden`;
}

window.openRecipe = function(id) {
  const r = state.recipes.find(rec => rec.id === id);
  if(!r) return;
  state.currentRecipe = r;
  $('detailImage').src = r.image;
  $('detailTitle').textContent = r.title;
  renderIngredients();
  $('detailSteps').innerHTML = r.steps.map(s => `<li>${s}</li>`).join('');
  $('recipeOverlay').classList.remove('hidden');
};

function renderIngredients() {
  const ratio = state.currentPortions / state.currentRecipe.servings;
  $('detailIngredients').innerHTML = state.currentRecipe.ingredients.map(i => 
    `<li>${Math.round(i.menge * ratio)} ${i.einheit} ${i.name}</li>`).join('');
}

function bindEvents() {
  $('openPlannerBtn').onclick = () => $('plannerOverlay').classList.remove('hidden');
  
  document.querySelectorAll('.close-overlay').forEach(b => b.onclick = () => {
    $('plannerOverlay').classList.add('hidden');
    $('recipeOverlay').classList.add('hidden');
  });

  $('addToPlannerBtn').onclick = async () => {
    const day = $('daySelector').value;
    if (!day) return;
    await db.collection("planner").doc("currentWeek").set({ ...state.weekPlan, [day]: state.currentRecipe.title });
    $('recipeOverlay').classList.add('hidden');
  };

  $('clearPlannerBtn').onclick = async () => {
    if(confirm("Plan leeren?")) await db.collection("planner").doc("currentWeek").set({});
  };

  $('randomBtn').onclick = () => {
    const r = state.filtered[Math.floor(Math.random() * state.filtered.length)];
    if(r) window.openRecipe(r.id);
  };

  $('searchInput').oninput = (e) => {
    state.searchQuery = e.target.value;
    applyFilters();
  };

  document.querySelectorAll('.filter-btn').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeFilter = btn.dataset.filter;
    applyFilters();
  });
}

init();

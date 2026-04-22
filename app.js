const firebaseConfig = {
  apiKey: "AIzaSyCp7M97mA2gbkevQNni_6RIo6XNpLJLOgc",
  authDomain: "familien-kochbuch-56de6.firebaseapp.com",
  projectId: "familien-kochbuch-56de6",
  storageBucket: "familien-kochbuch-56de6.firebasestorage.app",
  messagingSenderId: "138685113816",
  appId: "1:138685113816:web:574ed7eb20ca5cabad7ead"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const state = { recipes: [], filtered: [], activeFilter: 'all', searchQuery: '', weekPlan: {} };
const $ = (id) => document.getElementById(id);

async function init() {
  await syncData();
  bindEvents();
}

async function syncData() {
  // Rezepte holen
  db.collection("recipes").onSnapshot(snap => {
    let list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    
    // Check ob Bohneneintopf da ist, sonst neu anlegen
    if (!list.some(r => r.title.includes("Bohnen"))) {
        const news = [
          { title: "Portugiesischer Bohneneintopf", category: "Zusammen", image: "https://i.ibb.co/L7PZz7Z/bohneneintopf.jpg", ingredients: [{menge:2, einheit:"Dosen", name:"Bohnen"}], steps: ["Wurst braten","Kochen"] },
          { title: "Geflügel-Paprika-Pfanne", category: "Phil", image: "https://i.ibb.co/2S8Xz9G/paprikapfanne.jpg", ingredients: [{menge:400, einheit:"g", name:"Hähnchen"}], steps: ["Fleisch braten","Feta drüber"] }
        ];
        news.forEach(r => db.collection("recipes").add(r));
    }
    state.recipes = list;
    render();
  });

  // Plan holen
  db.collection("planner").doc("currentWeek").onSnapshot(doc => {
    state.weekPlan = doc.exists ? doc.data() : {};
    renderPlan();
  });
}

function render() {
  let res = state.recipes.filter(r => (state.activeFilter === 'all' || r.category === state.activeFilter));
  if(state.searchQuery) res = res.filter(r => r.title.toLowerCase().includes(state.searchQuery.toLowerCase()));
  state.filtered = res;
  
  $('recipesGrid').innerHTML = res.map(r => `
    <div class="recipe-card" onclick="openRecipe('${r.id}')">
      <img src="${r.image}">
      <h3>${r.title}</h3>
    </div>
  `).join('');
  $('resultsInfo').textContent = res.length + " Rezepte";
}

function renderPlan() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  $('plannerDisplay').innerHTML = days.map(d => `
    <div class="planner-row"><strong>${d}:</strong> <span>${state.weekPlan[d] || "---"}</span></div>
  `).join('');
}

window.openRecipe = (id) => {
  const r = state.recipes.find(rec => rec.id === id);
  state.currentRecipe = r;
  $('detailImage').src = r.image;
  $('detailTitle').textContent = r.title;
  $('detailIngredients').innerHTML = r.ingredients.map(i => `<li>${i.menge||""} ${i.einheit||""} ${i.name}</li>`).join('');
  $('detailSteps').innerHTML = r.steps.map(s => `<li>${s}</li>`).join('');
  $('recipeOverlay').classList.remove('hidden');
};

window.closeAll = () => {
  $('recipeOverlay').classList.add('hidden');
  $('plannerOverlay').classList.add('hidden');
};

function bindEvents() {
  $('openPlannerBtn').onclick = () => $('plannerOverlay').classList.remove('hidden');
  $('searchInput').oninput = (e) => { state.searchQuery = e.target.value; render(); };
  $('randomBtn').onclick = () => {
    const r = state.filtered[Math.floor(Math.random() * state.filtered.length)];
    if(r) openRecipe(r.id);
  };
  $('addToPlannerBtn').onclick = async () => {
    const day = $('daySelector').value;
    await db.collection("planner").doc("currentWeek").set({...state.weekPlan, [day]: state.currentRecipe.title});
    closeAll();
  };
  $('clearPlannerBtn').onclick = () => db.collection("planner").doc("currentWeek").set({});
  $('deleteBtn').onclick = async () => {
      if(confirm("Löschen?")) {
          await db.collection("recipes").doc(state.currentRecipe.id).delete();
          closeAll();
      }
  };
  document.querySelectorAll('.filter-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    b.classList.add('active');
    state.activeFilter = b.dataset.filter;
    render();
  });
}

init();

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
    db.collection("recipes").onSnapshot(snap => {
        let list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        
        // Automatischer Upload der neuen Rezepte, falls sie fehlen
        if (!list.some(r => r.title.includes("Bohneneintopf"))) {
            const news = [
                { title: "Portugiesischer Bohneneintopf", category: "Zusammen", duration: 45, servings: 4, image: "https://i.ibb.co/L7PZz7Z/bohneneintopf.jpg", ingredients: [{menge:250, einheit:"g", name:"Wurst"}, {menge:2, einheit:"Dosen", name:"Bohnen"}], steps: ["Wurst braten", "Gemüse dünsten", "Köcheln"] },
                { title: "Geflügel-Paprika-Pfanne mit Feta", category: "Phil", duration: 30, servings: 2, image: "https://i.ibb.co/2S8Xz9G/paprikapfanne.jpg", ingredients: [{menge:400, einheit:"g", name:"Hähnchen"}, {menge:150, einheit:"g", name:"Feta"}], steps: ["Fleisch braten", "Feta drüber"] }
            ];
            news.forEach(r => db.collection("recipes").add(r));
        }
        state.recipes = list;
        render();
    });

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
            <div class="card-body"><h3>${r.title}</h3><small>${r.duration} Min</small></div>
        </div>
    `).join('');
    $('resultsInfo').textContent = res.length + " Rezepte";
}

function renderPlan() {
    const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const names = {"Mo":"Montag","Di":"Dienstag","Mi":"Mittwoch","Do":"Donnerstag","Fr":"Freitag","Sa":"Samstag","So":"Sonntag"};
    $('plannerDisplay').innerHTML = days.map(d => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <strong>${names[d]}:</strong> <span style="color:#E85D4A;">${state.weekPlan[d] || "---"}</span>
        </div>
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

function bindEvents() {
    $('openPlannerBtn').onclick = () => $('plannerOverlay').classList.remove('hidden');
    $('fabBtn').onclick = () => {
        $('addRecipeForm').reset();
        delete $('addRecipeForm').dataset.editId;
        $('addFormTitle').textContent = "Neues Rezept";
        $('ingredientBuilder').innerHTML = '';
        $('stepsBuilder').innerHTML = '';
        addIngredientRow();
        addStepRow();
        $('addRecipeOverlay').classList.remove('hidden');
    };

    $('editBtn').onclick = () => {
        const r = state.currentRecipe;
        $('recipeOverlay').classList.add('hidden');
        $('addRecipeOverlay').classList.remove('hidden');
        $('addFormTitle').textContent = "Rezept bearbeiten";
        $('newTitle').value = r.title;
        $('newCategory').value = r.category;
        $('newDuration').value = r.duration;
        $('newImage').value = r.image;
        $('ingredientBuilder').innerHTML = '';
        r.ingredients.forEach(i => addIngredientRow(i.menge, i.einheit, i.name));
        $('stepsBuilder').innerHTML = '';
        r.steps.forEach(s => addStepRow(s));
        $('addRecipeForm').dataset.editId = r.id;
    };

    $('deleteBtn').onclick = async () => {
        if(confirm("Wirklich löschen?")) {
            await db.collection("recipes").doc(state.currentRecipe.id).delete();
            $('recipeOverlay').classList.add('hidden');
        }
    };

    document.querySelectorAll('.close-overlay').forEach(b => b.onclick = () => {
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    });

    $('addRecipeForm').onsubmit = async (e) => {
        e.preventDefault();
        const ingredients = [];
        document.querySelectorAll('#ingredientBuilder .row').forEach(r => {
            const i = r.querySelectorAll('input');
            if(i[2].value) ingredients.push({menge: i[0].value, einheit: i[1].value, name: i[2].value});
        });
        const steps = [];
        document.querySelectorAll('#stepsBuilder textarea').forEach(t => { if(t.value) steps.push(t.value); });
        
        const data = { title: $('newTitle').value, category: $('newCategory').value, duration: $('newDuration').value, image: $('newImage').value, ingredients, steps, servings: 4 };
        
        const eid = $('addRecipeForm').dataset.editId;
        if(eid) await db.collection("recipes").doc(eid).update(data);
        else await db.collection("recipes").add(data);
        
        $('addRecipeOverlay').classList.add('hidden');
    };

    $('addIngredientBtn').onclick = () => addIngredientRow();
    $('addStepBtn').onclick = () => addStepRow();
    
    $('addToPlannerBtn').onclick = async () => {
        const day = $('daySelector').value;
        await db.collection("planner").doc("currentWeek").set({...state.weekPlan, [day]: state.currentRecipe.title});
        $('recipeOverlay').classList.add('hidden');
    };

    $('randomBtn').onclick = () => {
        const r = state.filtered[Math.floor(Math.random() * state.filtered.length)];
        if(r) openRecipe(r.id);
    };

    $('searchInput').oninput = (e) => { state.searchQuery = e.target.value; render(); };
    
    document.querySelectorAll('.filter-btn').forEach(b => b.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        state.activeFilter = b.dataset.filter;
        render();
    });
}

function addIngredientRow(m='', e='', n='') {
    const d = document.createElement('div'); d.className = 'row'; d.style = "display:flex; gap:5px; margin-bottom:5px;";
    d.innerHTML = `<input type="number" value="${m}" style="width:50px"><input type="text" value="${e}" style="width:50px"><input type="text" value="${n}" style="flex:1"><button type="button" onclick="this.parentElement.remove()">X</button>`;
    $('ingredientBuilder').appendChild(d);
}

function addStepRow(t='') {
    const d = document.createElement('div'); d.style = "display:flex; gap:5px; margin-bottom:5px;";
    d.innerHTML = `<textarea style="flex:1">${t}</textarea><button type="button" onclick="this.parentElement.remove()">X</button>`;
    $('stepsBuilder').appendChild(d);
}

init();

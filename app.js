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

const state = { recipes: [], filtered: [], filter: 'all', search: '', plan: {} };
const $ = id => document.getElementById(id);

async function init() {
    // Echtzeit-Daten Rezepte
    db.collection("recipes").onSnapshot(snap => {
        let list = [];
        snap.forEach(doc => list.push({id: doc.id, ...doc.data()}));
        
        // AUTO-UPLOAD falls Bohneneintopf fehlt
        if(!list.some(r => r.title.includes("Bohnen"))) {
            const news = [
                { title: "Portugiesischer Bohneneintopf", category: "Zusammen", image: "https://i.ibb.co/L7PZz7Z/bohneneintopf.jpg", ingredients: "Wurst, Bohnen, Gemüse", steps: "1. Braten, 2. Kochen" },
                { title: "Geflügel-Paprika-Pfanne", category: "Phil", image: "https://i.ibb.co/2S8Xz9G/paprikapfanne.jpg", ingredients: "Hähnchen, Paprika, Feta", steps: "1. Braten, 2. Käse drüber" }
            ];
            news.forEach(r => db.collection("recipes").add(r));
        }
        state.recipes = list;
        render();
    });

    // Echtzeit-Daten Planer
    db.collection("planner").doc("week").onSnapshot(doc => {
        state.plan = doc.exists ? doc.data() : {};
        renderPlan();
    });

    // Events
    $('searchInput').oninput = e => { state.search = e.target.value; render(); };
    $('randomBtn').onclick = () => {
        const r = state.filtered[Math.floor(Math.random() * state.filtered.length)];
        if(r) openRecipe(r.id);
    };
    $('addToPlannerBtn').onclick = () => {
        const day = $('daySelector').value;
        db.collection("planner").doc("week").set({...state.plan, [day]: state.currentRecipe.title});
        closeAll();
    };
    $('clearPlannerBtn').onclick = () => db.collection("planner").doc("week").set({});
    $('deleteBtn').onclick = () => { if(confirm("Löschen?")) db.collection("recipes").doc(state.currentRecipe.id).delete(); closeAll(); };
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter;
            render();
        };
    });
}

function render() {
    let list = state.recipes.filter(r => state.filter === 'all' || r.category === state.filter);
    if(state.search) list = list.filter(r => r.title.toLowerCase().includes(state.search.toLowerCase()));
    state.filtered = list;
    
    $('recipesGrid').innerHTML = list.map(r => `
        <div class="recipe-card" onclick="openRecipe('${r.id}')">
            <img src="${r.image}">
            <h3>${r.title}</h3>
        </div>
    `).join('');
}

function renderPlan() {
    const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    $('plannerDisplay').innerHTML = days.map(d => `
        <div class="planner-row"><strong>${d}:</strong> <span>${state.plan[d] || "---"}</span></div>
    `).join('');
}

window.openRecipe = id => {
    const r = state.recipes.find(rec => rec.id === id);
    state.currentRecipe = r;
    $('detailImage').src = r.image;
    $('detailTitle').textContent = r.title;
    $('detailContent').innerHTML = `<h4>Zutaten:</h4><p>${r.ingredients}</p><h4>Schritte:</h4><p>${r.steps}</p>`;
    $('recipeOverlay').classList.remove('hidden');
};

window.showPlanner = () => $('plannerOverlay').classList.remove('hidden');
window.closeAll = () => { $('recipeOverlay').classList.add('hidden'); $('plannerOverlay').classList.add('hidden'); };

init();

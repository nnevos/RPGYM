"use strict";

function loadDietState() {
  if (dietState) return dietState;
  try {
    const parsed = JSON.parse(localStorage.getItem(DIET_STORAGE_KEY) || "null");
    dietState = parsed && typeof parsed === "object" ? parsed : { days: {} };
  } catch (error) {
    dietState = { days: {} };
  }
  if (!dietState.days) dietState.days = {};
  dietState.version = Math.max(2, Number(dietState.version) || 0);
  dietState.targets ||= { calories: 2500, carbs: 300, protein: 160, fat: 70 };
  dietState.recentFoods ||= [];
  dietState.favoriteFoodIds ||= [];
  return dietState;
}

function saveDietState() {
  try {
    localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(loadDietState()));
    if (state) { rebuildStatsFromSources(); saveGame(); }
  }
  catch (error) { console.warn("Não foi possível salvar a dieta localmente.", error); }
}

function dietDateKey(offset = dietDateOffset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

function getDietDay() {
  const data = loadDietState();
  const key = dietDateKey();
  if (!data.days[key]) {
    data.days[key] = { finalized: false, meals: { breakfast: [], lunch: [], snack: [], dinner: [] } };
  }
  const day = data.days[key];
  day.meals ||= { breakfast: [], lunch: [], snack: [], dinner: [] };
  for (const key of ["breakfast", "lunch", "snack", "dinner"]) day.meals[key] ||= [];
  return day;
}

function dietTargets() {
  const targets = loadDietState().targets || {};
  return {
    calories: Math.max(500, Number(targets.calories) || 2500),
    carbs: Math.max(20, Number(targets.carbs) || 300),
    protein: Math.max(20, Number(targets.protein) || 160),
    fat: Math.max(10, Number(targets.fat) || 70)
  };
}

function foodValue(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }

function calculateFoodNutrition(food, grams) {
  const factor = Math.max(0, Number(grams) || 0) / 100;
  return {
    calories: foodValue(food.kcal) * factor,
    carbs: foodValue(food.carbs) * factor,
    protein: foodValue(food.protein) * factor,
    fat: foodValue(food.fat) * factor,
    fiber: foodValue(food.fiber) * factor
  };
}

function dietDayTotals(day = getDietDay()) {
  const totals = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
  Object.values(day.meals).flat().forEach((item) => {
    const food = FOOD_DATABASE.find((entry) => entry.id === item.foodId);
    if (!food) return;
    const nutrition = calculateFoodNutrition(food, item.grams);
    Object.keys(totals).forEach((key) => totals[key] += nutrition[key] || 0);
  });
  return totals;
}

function renderDiet() {
  if (!document.getElementById("dietMeals")) return;
  const day = getDietDay();
  const totals = dietDayTotals(day);
  const targets = dietTargets();
  const date = new Date(); date.setDate(date.getDate() + dietDateOffset);
  setText("dietHeading", dietDateOffset === 0 ? "Hoje" : capitalizeFirst(shortDateFormatter.format(date)));
  setText("dietDateLabel", capitalizeFirst(fullDateFormatter.format(date)));
  setText("dietCarbs", `${Math.round(totals.carbs)} g`);
  setText("dietProtein", `${Math.round(totals.protein)} g`);
  setText("dietFat", `${Math.round(totals.fat)} g`);
  setText("dietCalories", `${Math.round(totals.calories)} / ${targets.calories} kcal`);
  setText("dietFiber", `Fibra ${totals.fiber.toFixed(1)} g`);
  setText("dietCarbsTarget", `/ ${targets.carbs} g`);
  setText("dietProteinTarget", `/ ${targets.protein} g`);
  setText("dietFatTarget", `/ ${targets.fat} g`);
  for (const [key, value, target] of [["dietCarbsBar",totals.carbs,targets.carbs],["dietProteinBar",totals.protein,targets.protein],["dietFatBar",totals.fat,targets.fat],["dietCaloriesBar",totals.calories,targets.calories]]) {
    const el=document.getElementById(key); if(el) el.style.width=`${Math.min(100, Math.max(0, value/target*100))}%`;
  }
  const mealLabels = { breakfast: "Café da manhã", lunch: "Almoço", snack: "Lanche", dinner: "Janta" };
  const meals = document.getElementById("dietMeals");
  meals.innerHTML = Object.entries(mealLabels).map(([mealKey,label]) => {
    const items = day.meals[mealKey] || [];
    const mealCalories=items.reduce((sum,item)=>{const f=FOOD_DATABASE.find(e=>e.id===item.foodId);return sum+(f?calculateFoodNutrition(f,item.grams).calories:0)},0);
    const rows = items.map((item) => {
      const food=FOOD_DATABASE.find((entry)=>entry.id===item.foodId); if(!food) return "";
      const n=calculateFoodNutrition(food,item.grams);
      return `<button class="diet-food-row" type="button" data-edit-food="${escapeHtml(item.id)}" data-meal-key="${mealKey}"><div><strong>${escapeHtml(food.name)}</strong><small>${Math.round(item.grams)} g · C ${n.carbs.toFixed(1)} · P ${n.protein.toFixed(1)} · G ${n.fat.toFixed(1)}</small></div><span>${Math.round(n.calories)} kcal</span><i aria-hidden="true">›</i></button>`;
    }).join("");
    const empty = !items.length ? `<div class="diet-empty-compact"><span>Nenhum alimento</span><small>0 kcal</small></div>` : "";
    return `<section class="diet-meal-card ${items.length?"has-food":"is-empty"}"><header><div><h3>${label}</h3><small>${items.length} ${items.length===1?"item":"itens"}</small></div><strong>${Math.round(mealCalories)} kcal</strong></header>${rows}${empty}<button class="diet-add-food" type="button" data-open-food-picker="${mealKey}">＋ Adicionar alimento</button></section>`;
  }).join("");
  const finish=document.getElementById("finishDietDay");
  if(finish){finish.textContent=day.finalized?"Dia finalizado ✓":"Finalizar dia"; finish.classList.toggle("is-finalized", day.finalized); finish.disabled=false;}
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function openFoodPicker(mealKey) {
  foodPickerMealKey = mealKey || "breakfast";
  const overlay=document.getElementById("foodPickerOverlay"); if(!overlay) return;
  overlay.hidden=false; document.body.classList.add("modal-open");
  const search=document.getElementById("foodSearch"); if(search) search.value="";
  renderFoodSearch(); window.setTimeout(()=>search?.focus(),30);
}

function closeFoodPicker() {
  const overlay=document.getElementById("foodPickerOverlay"); if(overlay) overlay.hidden=true;
  document.body.classList.remove("modal-open");
}

const FOOD_SEARCH_ALIASES = {
  "arroz branco": "arroz branco", "peito de frango": "peito frango", "frango grelhado": "frango grelhado",
  "pao frances": "pao frances", "ovo": "ovo", "banana": "banana", "batata doce": "batata doce",
  "carne moida": "carne moida", "feijao": "feijao", "leite": "leite", "aveia": "aveia",
  "mussarela": "mucarela", "macarrao": "macarrao", "miojo": "miojo", "aipim": "mandioca", "macaxeira": "mandioca"
};

function foodSearchScore(food, rawQuery) {
  if (!rawQuery) return food.common === false ? 0 : 1;
  const normalized = normalizeSearchText(rawQuery).trim();
  const alias = FOOD_SEARCH_ALIASES[normalized] || normalized;
  const tokens = alias.split(/\s+/).filter(Boolean);
  const foodAliases = Array.isArray(food.aliases) ? food.aliases.join(" ") : "";
  const haystack = normalizeSearchText(`${food.name} ${food.group} ${foodAliases}`);
  if (!tokens.every(token => haystack.includes(token))) return 0;
  let score = food.common === false ? 4 : 14;
  const name = normalizeSearchText(food.name);
  const aliases = normalizeSearchText(foodAliases);
  if (name.startsWith(alias)) score += 18;
  if (name.includes(alias)) score += 10;
  if (aliases.includes(alias)) score += 12;
  score += tokens.filter(token => name.includes(token)).length * 3;
  return score;
}

function toggleFavoriteFood(foodId) {
  const data=loadDietState(); const id=Number(foodId);
  const set=new Set(data.favoriteFoodIds || []); set.has(id)?set.delete(id):set.add(id);
  data.favoriteFoodIds=[...set]; saveDietState(); renderFoodSearch();
}

function rememberRecentFood(foodId) {
  const data=loadDietState(); const id=Number(foodId);
  data.recentFoods=[id,...(data.recentFoods||[]).filter(item=>item!==id)].slice(0,12);
}

function foodResultMarkup(food, isFavorite=false) {
  const portions = Array.isArray(food.portions) && food.portions.length
    ? `<div class="food-portion-presets">${food.portions.slice(0,2).map((portion)=>`<button type="button" data-food-portion="${food.id}" data-portion-grams="${portion.grams}">${escapeHtml(portion.label)}</button>`).join("")}</div>`
    : "";
  return `<article class="food-result-card"><button class="food-favorite-button ${isFavorite?"is-favorite":""}" type="button" data-favorite-food="${food.id}" aria-label="${isFavorite?"Remover dos favoritos":"Favoritar alimento"}">${isFavorite?"★":"☆"}</button><div class="food-result-main"><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(FOOD_GROUP_LABELS[food.group] || food.group)} · valores por 100 g</small><div class="food-macros"><span><b>${Math.round(foodValue(food.kcal))}</b> kcal</span><span>C <b>${foodValue(food.carbs).toFixed(1)}</b> g</span><span>P <b>${foodValue(food.protein).toFixed(1)}</b> g</span><span>G <b>${foodValue(food.fat).toFixed(1)}</b> g</span></div>${portions}</div><label><span>Quantidade</span><input type="number" min="1" max="2000" step="1" value="${food.portions?.[0]?.grams || 100}" data-food-grams="${food.id}"><small>g</small></label><button class="food-add-button" type="button" data-add-food="${food.id}" aria-label="Adicionar">＋</button></article>`;
}

const FOOD_GROUP_LABELS = {
  "Cereais e derivados": "Cereais e carboidratos",
  "Verduras, hortaliças e derivados": "Verduras e legumes",
  "Frutas e derivados": "Frutas",
  "Carnes e derivados": "Carnes",
  "Pescados e frutos do mar": "Peixes e frutos do mar",
  "Ovos e derivados": "Ovos",
  "Leite e derivados": "Leites e derivados",
  "Leguminosas e derivados": "Feijões e leguminosas",
  "Alimentos preparados": "Pratos preparados",
  "Gorduras e óleos": "Gorduras e óleos",
  "Bebidas (alcoólicas e não alcoólicas)": "Bebidas",
  "Produtos açucarados": "Doces e açucarados",
  "Outros alimentos industrializados": "Industrializados",
  "Miscelâneas": "Outros"
};

const FOOD_GROUP_ORDER = [
  "Cereais e derivados",
  "Verduras, hortaliças e derivados",
  "Frutas e derivados",
  "Carnes e derivados",
  "Pescados e frutos do mar",
  "Ovos e derivados",
  "Leite e derivados",
  "Leguminosas e derivados",
  "Alimentos preparados",
  "Gorduras e óleos",
  "Bebidas (alcoólicas e não alcoólicas)",
  "Produtos açucarados",
  "Outros alimentos industrializados",
  "Miscelâneas"
];

function renderFoodGroup(groupName, foods, favorites) {
  if (!foods.length) return "";
  const label = FOOD_GROUP_LABELS[groupName] || groupName;
  return `<details class="food-type-group"><summary><span>${escapeHtml(label)}</span><small>${foods.length}</small><i aria-hidden="true">⌄</i></summary><div class="food-type-group-list">${foods.map(food=>foodResultMarkup(food,favorites.has(food.id))).join("")}</div></details>`;
}

function renderFoodSearch() {
  const container=document.getElementById("foodResultList"); if(!container) return;
  const rawQuery=document.getElementById("foodSearch")?.value || "";
  const query=rawQuery.trim();
  const data=loadDietState();
  const favorites=new Set((data.favoriteFoodIds || []).map(Number));

  if (!query) {
    setText("foodSearchCount", `${FOOD_COMMON_DATABASE.length} alimentos principais`);
    const favoriteFoods=(data.favoriteFoodIds||[])
      .map(id=>FOOD_DATABASE.find(food=>food.id===Number(id)))
      .filter(Boolean);

    let html="";
    if (favoriteFoods.length) {
      html += `<section class="food-favorites-section"><div class="food-browser-heading"><div><span>★</span><strong>Favoritos</strong></div><small>${favoriteFoods.length}</small></div>${favoriteFoods.map(food=>foodResultMarkup(food,true)).join("")}</section>`;
    } else {
      html += `<section class="food-favorites-empty"><div><span>☆</span><strong>Favoritos</strong></div><small>Toque na estrela de um alimento para deixá-lo aqui.</small></section>`;
    }

    html += `<div class="food-browser-heading food-types-heading"><div><strong>Alimentos por tipo</strong></div><small>${FOOD_GROUP_ORDER.length} categorias</small></div>`;
    for (const groupName of FOOD_GROUP_ORDER) {
      const foods=FOOD_COMMON_DATABASE.filter(food=>food.group===groupName).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
      html += renderFoodGroup(groupName, foods, favorites);
    }
    container.innerHTML=html;
    return;
  }

  const results=FOOD_DATABASE
    .map(food=>({food,score:foodSearchScore(food,query)}))
    .filter(entry=>entry.score>0)
    .sort((a,b)=>b.score-a.score || a.food.name.localeCompare(b.food.name,"pt-BR"))
    .slice(0,80)
    .map(entry=>entry.food);

  setText("foodSearchCount", `${results.length}${FOOD_DATABASE.length>results.length?"+":""} resultados · busca completa`);
  container.innerHTML=results.length
    ? `<div class="food-search-results">${results.map(food=>foodResultMarkup(food,favorites.has(food.id))).join("")}</div>`
    : `<div class="exercise-picker-empty">Nenhum alimento encontrado.</div>`;
}

function addFoodToMeal(foodId) {
  const food=FOOD_DATABASE.find(entry=>entry.id===Number(foodId)); if(!food) return;
  const gramsInput=document.querySelector(`[data-food-grams="${food.id}"]`);
  const grams=Math.max(1,Math.min(2000,Number(gramsInput?.value)||100));
  const day=getDietDay(); day.finalized=false;
  day.meals[foodPickerMealKey].push({id:createId(),foodId:food.id,grams});
  rememberRecentFood(food.id);
  saveDietState(); renderDiet(); closeFoodPicker();
  showToast("Alimento adicionado", `${food.name} • ${Math.round(grams)} g`, "✓");
}

function removeFoodFromMeal(mealKey, itemId) {
  const day=getDietDay(); day.meals[mealKey]=(day.meals[mealKey]||[]).filter(item=>item.id!==itemId); day.finalized=false;
  saveDietState(); renderDiet();
}

function ensureDietEditable(onContinue) {
  const day=getDietDay();
  if (!day.finalized) { onContinue(); return; }
  requestConfirmation({title:"Reabrir este dia?",message:"O dia está finalizado. Para editar alimentos, ele precisa voltar ao estado de edição.",confirmLabel:"Reabrir dia",cancelLabel:"Manter finalizado",icon:"↺"},()=>{day.finalized=false;saveDietState();renderDiet();onContinue();});
}

function openDietItemEditor(mealKey,itemId) {
  ensureDietEditable(()=>{
    const item=(getDietDay().meals[mealKey]||[]).find(entry=>entry.id===itemId); if(!item)return;
    const food=FOOD_DATABASE.find(entry=>entry.id===item.foodId); if(!food)return;
    editingDietItem={mealKey,itemId};
    setText("dietEditTitle",food.name);
    const n=calculateFoodNutrition(food,item.grams);
    setText("dietEditNutrition",`${Math.round(n.calories)} kcal · C ${n.carbs.toFixed(1)} g · P ${n.protein.toFixed(1)} g · G ${n.fat.toFixed(1)} g`);
    const input=document.getElementById("dietEditGrams"); if(input)input.value=Math.round(item.grams);
    const overlay=document.getElementById("dietEditOverlay"); if(overlay)overlay.hidden=false; document.body.classList.add("modal-open");
  });
}
function closeDietItemEditor(){const overlay=document.getElementById("dietEditOverlay");if(overlay)overlay.hidden=true;editingDietItem=null;document.body.classList.remove("modal-open");}
function saveDietItemEdit(){if(!editingDietItem)return;const day=getDietDay();const item=(day.meals[editingDietItem.mealKey]||[]).find(entry=>entry.id===editingDietItem.itemId);if(!item)return;item.grams=Math.max(1,Math.min(2000,Number(document.getElementById("dietEditGrams")?.value)||item.grams));day.finalized=false;saveDietState();renderDiet();closeDietItemEditor();showToast("Registro atualizado",`${Math.round(item.grams)} g salvos.`,"✓");}
function deleteDietItem(){if(!editingDietItem)return;const {mealKey,itemId}=editingDietItem;closeDietItemEditor();removeFoodFromMeal(mealKey,itemId);showToast("Alimento removido","O registro foi removido da refeição.","✓");}

function openDietSettings(){const targets=dietTargets();document.getElementById("dietTargetCalories").value=targets.calories;document.getElementById("dietTargetCarbs").value=targets.carbs;document.getElementById("dietTargetProtein").value=targets.protein;document.getElementById("dietTargetFat").value=targets.fat;document.getElementById("dietSettingsOverlay").hidden=false;document.body.classList.add("modal-open");}
function closeDietSettings(){const overlay=document.getElementById("dietSettingsOverlay");if(overlay)overlay.hidden=true;document.body.classList.remove("modal-open");}
function saveDietTargets(event){event.preventDefault();const data=loadDietState();data.targets={calories:Number(document.getElementById("dietTargetCalories").value)||2500,carbs:Number(document.getElementById("dietTargetCarbs").value)||300,protein:Number(document.getElementById("dietTargetProtein").value)||160,fat:Number(document.getElementById("dietTargetFat").value)||70};saveDietState();renderDiet();closeDietSettings();showToast("Referências atualizadas","As metas visuais da dieta foram salvas.","✓");}


function changeDietDay(delta) { dietDateOffset += delta; renderDiet(); }

function finishDietDay() {
  const day=getDietDay();
  if (day.finalized) { showToast("Dia finalizado", "Para alterar este dia, edite ou adicione um alimento e confirme a reabertura.", "✓"); return; }
  const items=Object.values(day.meals).flat();
  if (!items.length) { showToast("Dia sem alimentos", "Adicione pelo menos um alimento antes de finalizar.", "⚠"); return; }
  const totals=dietDayTotals(day);
  requestConfirmation({title:"Finalizar dieta do dia?",message:"Confira o resumo antes de fechar o registro de hoje.",confirmLabel:"Finalizar dia",cancelLabel:"Continuar editando",icon:"✓",details:[{label:"Calorias",value:`${Math.round(totals.calories)} kcal`},{label:"Proteína",value:`${Math.round(totals.protein)} g`},{label:"Carboidratos",value:`${Math.round(totals.carbs)} g`},{label:"Gorduras",value:`${Math.round(totals.fat)} g`}]},()=>{
    day.finalized=true; saveDietState(); renderDiet(); showToast("Dieta registrada", "Resumo nutricional do dia salvo neste dispositivo.", "✓");
  });
}

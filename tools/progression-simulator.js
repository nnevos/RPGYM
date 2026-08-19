"use strict";

const PERSONAS = {
  casual: {
    label: "Casual",
    workouts: 2, setsPerWorkout: 12, workoutPrChance: 0.12,
    cardio: [{ type: "treadmill", minutes: 30, secondaryEligible: false, prChance: 0.08 }],
    dietDays: 3, mealsPerDietDay: 3, finalizeDietShare: 0.65,
    dailyMissionCompletion: 0.40, weeklyMissionCompletion: 0.40
  },
  medium: {
    label: "Médio",
    workouts: 3, setsPerWorkout: 16, workoutPrChance: 0.18,
    cardio: [
      { type: "treadmill", minutes: 35, secondaryEligible: true, prChance: 0.12 },
      { type: "stationary_bike", minutes: 40, secondaryEligible: true, prChance: 0.10 },
      { type: "jump_rope", minutes: 15, secondaryEligible: true, prChance: 0.12 }
    ],
    dietDays: 5, mealsPerDietDay: 3, finalizeDietShare: 0.80,
    dailyMissionCompletion: 0.70, weeklyMissionCompletion: 0.70
  },
  dedicated: {
    label: "Dedicado",
    workouts: 5, setsPerWorkout: 18, workoutPrChance: 0.25,
    cardio: [
      { type: "outdoor_run", minutes: 45, secondaryEligible: true, prChance: 0.18 },
      { type: "stationary_bike", minutes: 45, secondaryEligible: true, prChance: 0.15 },
      { type: "rowing", minutes: 30, secondaryEligible: true, prChance: 0.15 },
      { type: "jump_rope", minutes: 20, secondaryEligible: true, prChance: 0.18 }
    ],
    dietDays: 7, mealsPerDietDay: 4, finalizeDietShare: 0.95,
    dailyMissionCompletion: 0.95, weeklyMissionCompletion: 0.95
  }
};

const ATTRIBUTE_KEYS = ["force","agility","constitution","intelligence","determination","charisma"];
const GLOBAL_KEYS = BALANCE.globalLevel?.activeAttributes || ATTRIBUTE_KEYS;
const LABELS = { force:"Força", agility:"Agilidade", constitution:"Constituição", intelligence:"Inteligência", determination:"Determinação", charisma:"Carisma" };

function requiredXp(level) {
  return level >= 50 ? Infinity : Math.ceil(BALANCE.levelCurve.base * Math.pow(level, BALANCE.levelCurve.exponent));
}
function classBonusForLevel(level) {
  let milestone = 0;
  [10,20,30,40,50].forEach(m => { if (level >= m) milestone = m; });
  return BALANCE.bonuses.classByMilestone[milestone] || 0;
}
function xpMultiplier(level) {
  const levelBonus = Math.min(BALANCE.bonuses.levelCap, level * BALANCE.bonuses.levelPerLevel);
  return 1 + Math.min(BALANCE.bonuses.totalCap, levelBonus + classBonusForLevel(level));
}
function award(model, key, base) {
  if (!base || base <= 0) return 0;
  const value = Math.round(base * xpMultiplier(model[key].level));
  model[key].xp += value;
  model[key].earned += value;
  while (model[key].level < 50 && model[key].xp >= requiredXp(model[key].level)) {
    model[key].xp -= requiredXp(model[key].level);
    model[key].level += 1;
  }
  if (model[key].level >= 50) model[key].xp = 0;
  return value;
}
function workoutBase(persona) {
  const cfg = BALANCE.workout;
  const working = persona.setsPerWorkout;
  const full = Math.min(working, cfg.fullSetUntil);
  const reduced = Math.max(0, working - cfg.fullSetUntil);
  let completionMult = 1;
  if (working < 3) completionMult = cfg.shortSessionCompletionMultiplier;
  else if (working < cfg.minWorkingSetsForFullCompletion) completionMult = cfg.mediumSessionCompletionMultiplier;
  const prXp = persona.workoutPrChance * cfg.prBonus; // expectativa de 1 oportunidade recompensada por sessão
  return cfg.completionXp * completionMult + full * cfg.setXp + reduced * cfg.reducedSetXp + prXp;
}
function cardioEnduranceBase(minutes) {
  const c = BALANCE.cardio;
  const completion = c.completionXp * Math.min(1, minutes / Math.max(1, c.minMinutesForFullCompletion));
  return completion + Math.min(minutes,30)*c.first30PerMinute + Math.max(0,Math.min(minutes-30,30))*c.minute31to60 + Math.max(0,minutes-60)*c.after60PerMinute;
}
function cardioAwards(session) {
  const affinity = CARDIO_TYPES[session.type]?.affinities || { primary:"constitution" };
  const primary = affinity.primary || "constitution";
  const endurance = cardioEnduranceBase(session.minutes);
  const perf = session.prChance * BALANCE.cardio.performanceBonus;
  const performanceToSecondary = Boolean(session.secondaryEligible && affinity.secondary?.performanceTarget);
  const awards = [{ key:primary, base:endurance + (performanceToSecondary ? 0 : perf), role:"primary" }];
  if (session.secondaryEligible && affinity.secondary) {
    const ratio = Math.min(BALANCE.cardio.secondaryAttributeMaxRatio, affinity.secondary.ratio || 0);
    awards.push({ key:affinity.secondary.attribute, base:endurance*ratio + (performanceToSecondary ? perf : 0), role:"secondary" });
  }
  return awards;
}
function averageMissionRewards(templates) {
  const xp = templates.filter(m => m.reward?.type === "xp");
  const sum = {};
  xp.forEach(m => { sum[m.reward.attribute] = (sum[m.reward.attribute] || 0) + Number(m.reward.amount || 0); });
  const count = Math.max(1, templates.length);
  Object.keys(sum).forEach(k => sum[k] /= count); // inclui chance de template ser buff, que rende 0 XP direto
  return sum;
}
const DAILY_AVG = averageMissionRewards(DAILY_MISSION_TEMPLATES);
const WEEKLY_AVG = averageMissionRewards(WEEKLY_MISSION_TEMPLATES);

function emptyModel(){return Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,{level:1,xp:0,earned:0}]))}
function globalLevel(model){return Math.ceil(GLOBAL_KEYS.reduce((s,k)=>s+model[k].level,0)/GLOBAL_KEYS.length)}
function simulate(persona, weeks) {
  const model = emptyModel();
  const sources = { workout:0, cardio:0, diet:0, missions:0 };
  const firstWeekByAttr = Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,0]));
  for (let week=1; week<=weeks; week++) {
    const before = Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,model[k].earned]));
    const wb = workoutBase(persona);
    for(let i=0;i<persona.workouts;i++) sources.workout += award(model,"force",wb);
    persona.cardio.forEach(session => cardioAwards(session).forEach(a => { sources.cardio += award(model,a.key,a.base); }));
    const activeDays = Math.min(7, Math.max(persona.dietDays, persona.workouts, persona.cardio.length));
    for(let d=0; d<activeDays; d++) sources.workout += award(model,"determination",BALANCE.consistency?.firstActiveDayXp || 0);
    for(let d=0; d<persona.dietDays; d++) {
      const meals = Math.min(BALANCE.diet.maxRewardedMealsPerDay, persona.mealsPerDietDay);
      let base = meals * BALANCE.diet.mealXp;
      if (d < persona.dietDays * persona.finalizeDietShare) base += BALANCE.diet.finalizeDayXp + BALANCE.diet.completeDayBonusXp;
      sources.diet += award(model,"intelligence",base);
    }
    // 3 diárias por dia e 3 semanais. A média usa a distribuição real de atributos dos templates.
    ATTRIBUTE_KEYS.forEach(k => {
      const dailyBase = (DAILY_AVG[k] || 0) * 3 * 7 * persona.dailyMissionCompletion;
      const weeklyBase = (WEEKLY_AVG[k] || 0) * 3 * persona.weeklyMissionCompletion;
      const got = award(model,k,dailyBase + weeklyBase);
      sources.missions += got;
    });
    if (week===1) ATTRIBUTE_KEYS.forEach(k => firstWeekByAttr[k]=model[k].earned-before[k]);
  }
  return { model, global:globalLevel(model), sources, firstWeekByAttr, total: Object.values(sources).reduce((a,b)=>a+b,0) };
}
function milestoneWeeks(persona, maxWeeks=156) {
  const targets=[10,20,30,40,50], found={};
  for(let w=1;w<=maxWeeks;w++){const s=simulate(persona,w);targets.forEach(t=>{if(!found[t]&&s.global>=t)found[t]=w});if(found[50])break;}
  return found;
}
function fmt(n){return Math.round(n).toLocaleString("pt-BR")}
function activityShare(s){const activity=s.sources.workout+s.sources.cardio+s.sources.diet;return s.total?activity/s.total:0}
function render(){
  const cards=document.getElementById("cards"), rows=document.getElementById("summaryRows"); cards.innerHTML="";rows.innerHTML="";
  Object.entries(PERSONAS).forEach(([key,p])=>{
    const s1=simulate(p,1),s12=simulate(p,12),s26=simulate(p,26),s52=simulate(p,52); const share=activityShare(s1);
    cards.insertAdjacentHTML("beforeend",`<div class="card"><strong>${p.label}</strong><div class="big">Global ${s52.global}</div><small>após 52 semanas</small><p>${fmt(s1.total)} XP/sem inicial • <span class="${share>=.75?'good':share>=.65?'warn':'bad'}">${Math.round(share*100)}% por atividade</span></p></div>`);
    rows.insertAdjacentHTML("beforeend",`<tr><td>${p.label}</td><td>${fmt(s1.total)}</td><td>${Math.round(share*100)}%</td><td>${Math.round((1-share)*100)}%</td><td>${s12.global}</td><td>${s26.global}</td><td>${s52.global}</td></tr>`);
  });
  renderDetail(document.getElementById("detailPersona").value);
}
function renderDetail(key){
  const p=PERSONAS[key],s1=simulate(p,1),s12=simulate(p,12),s26=simulate(p,26),s52=simulate(p,52);document.getElementById("detailTitle").textContent=`Detalhe do perfil ${p.label}`;
  document.getElementById("attributeRows").innerHTML=ATTRIBUTE_KEYS.map(k=>`<tr><td>${LABELS[k]}</td><td>${s12.model[k].level}</td><td>${s26.model[k].level}</td><td>${s52.model[k].level}</td><td>${fmt(s1.firstWeekByAttr[k])}</td></tr>`).join("");
  const entries=[["Musculação",s1.sources.workout],["Cardio",s1.sources.cardio],["Dieta",s1.sources.diet],["Missões",s1.sources.missions]];
  document.getElementById("sourceList").innerHTML=entries.map(([l,v])=>`<div class="source-row"><span>${l}</span><strong>${fmt(v)} XP <small class="muted">(${Math.round(v/s1.total*100)}%)</small></strong></div>`).join("");
  const ms=milestoneWeeks(p); const share=activityShare(s1); const diagnostics=[];
  diagnostics.push(`${p.label}: atividade real representa aproximadamente <strong>${Math.round(share*100)}%</strong> do XP direto na primeira semana.`);
  diagnostics.push(`Global 10: <strong>${ms[10] ? ms[10]+" semanas" : ">156 semanas"}</strong>; Global 20: <strong>${ms[20] ? ms[20]+" semanas" : ">156"}</strong>; Global 30: <strong>${ms[30] ? ms[30]+" semanas" : ">156"}</strong>.`);
  if(share < BALANCE.missions.activityShareTarget) diagnostics.push(`<span class="warn">Atenção:</span> missões estão representando mais XP do que a meta de ${(BALANCE.missions.activityShareTarget*100).toFixed(0)}% por atividade real.`);
  if(s52.model.charisma.level<=2) diagnostics.push(`Carisma permanece baixo no simulador porque o Social ainda não possui uma fonte online/real recorrente de XP. Isso é esperado nesta fase.`);
  document.getElementById("diagnostics").innerHTML=diagnostics.join("<br>");
  document.getElementById("assumptions").innerHTML=`<strong>${p.workouts} musculações/sem</strong> com ${p.setsPerWorkout} séries por sessão; <strong>${p.cardio.length} cardios/sem</strong>; <strong>${p.dietDays} dias de dieta</strong>; ${Math.round(p.dailyMissionCompletion*100)}% das diárias e ${Math.round(p.weeklyMissionCompletion*100)}% das semanais. PRs são tratados como uma probabilidade média por sessão. O simulador assume que evoluções de classe são conquistadas perto do nível correspondente; roadmaps não bloqueiam o ganho de XP.`;
}
document.addEventListener("DOMContentLoaded",()=>{render();document.getElementById("detailPersona").addEventListener("change",e=>renderDetail(e.target.value));});

function renderRoadmapValidation(){
  const el=document.getElementById("roadmapValidation"); if(!el)return;
  const v=window.ROADMAP_VALIDATION; if(!v){el.innerHTML='<span class="bad">Validador não carregado.</span>';return;}
  const totalCh=v.summary.reduce((n,x)=>n+x.chapters,0), totalObj=v.summary.reduce((n,x)=>n+x.objectives,0);
  el.innerHTML=v.ok?`<span class="good"><strong>OK</strong></span> — ${totalCh} capítulos e ${totalObj} objetivos válidos nas 6 rotas.`:`<span class="bad"><strong>${v.issues.length} problema(s)</strong></span><br>${v.issues.join('<br>')}`;
}
document.addEventListener("DOMContentLoaded",renderRoadmapValidation);

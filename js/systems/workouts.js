"use strict";

function ensureWorkoutState() {
  if (!state.workouts || typeof state.workouts !== "object") {
    state.workouts = { active: null, routines: [], sessions: [] };
  }
  if (!Array.isArray(state.workouts.routines)) state.workouts.routines = [];
  if (!Array.isArray(state.workouts.sessions)) state.workouts.sessions = [];
}

function getExerciseById(exerciseId) {
  return EXERCISE_DATABASE.find((exercise) => exercise.id === exerciseId) || null;
}

function humanizeToken(value) {
  return String(value || "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function muscleIcon(muscle) {
  const value = String(muscle || "").toLowerCase();
  if (value.includes("peito")) return "◒";
  if (value.includes("biceps") || value.includes("triceps") || value.includes("antebracos")) return "💪";
  if (value.includes("quadriceps") || value.includes("gluteos") || value.includes("isquiotibiais")) return "🦵";
  if (value.includes("dorsais") || value.includes("costas") || value.includes("trapezio")) return "◆";
  if (value.includes("ombros")) return "◉";
  if (value.includes("abdominais")) return "⬡";
  return "🏋️";
}

function createWorkoutExercise(exerciseId) {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return null;
  const previous = getPreviousExercisePerformance(exerciseId);
  return {
    id: createId(),
    exerciseId,
    name: exercise.name,
    equipment: exercise.equipment,
    mechanic: exercise.mechanic,
    primaryMuscles: exercise.primaryMuscles,
    notes: "",
    sets: [{ id: createId(), type: "normal", weight: "", reps: "", durationSeconds: "", completed: false, previous: previous[0] || "" }]
  };
}

function getExerciseTracking(exerciseOrId) {
  const definition = typeof exerciseOrId === "string" ? getExerciseById(exerciseOrId) : exerciseOrId;
  if (!definition) return "weight_reps";
  if (definition.tracking) return definition.tracking;
  if (definition.force === "static") return "time";
  if (definition.equipment === "peso-do-corpo") return "reps";
  return "weight_reps";
}

function formatExerciseSetPerformance(set, tracking) {
  if (tracking === "time") {
    const seconds = Number(set.durationSeconds) || 0;
    return seconds > 0 ? formatDurationSeconds(seconds) : "";
  }
  const reps = Number(set.reps) || 0;
  if (!(reps > 0)) return "";
  if (tracking === "reps") return `${reps} reps`;
  const weight = Number(set.weight) || 0;
  return weight > 0 ? `${weight} kg × ${reps}` : `${reps} reps`;
}

function getPreviousExercisePerformance(exerciseId) {
  ensureWorkoutState();
  const tracking = getExerciseTracking(exerciseId);
  for (const session of state.workouts.sessions) {
    const exercise = session.exercises?.find((item) => item.exerciseId === exerciseId);
    if (exercise) {
      return (exercise.sets || []).filter((set) => set.completed).map((set) => formatExerciseSetPerformance(set, tracking)).filter(Boolean);
    }
  }
  return [];
}

function renderStrengthTraining() {
  ensureWorkoutState();
  const hub = document.getElementById("strengthWorkoutHub");
  const panel = document.getElementById("activeWorkoutPanel");
  const active = state.workouts.active;
  if (hub) hub.hidden = Boolean(active);
  if (panel) panel.hidden = !active;
  if (active) {
    startWorkoutElapsedTicker();
    renderActiveWorkout();
  } else {
    stopWorkoutElapsedTicker();
    renderRoutineList();
    renderStrengthSessions();
  }
}

function renderRoutineList() {
  const container = document.getElementById("routineList");
  if (!container) return;
  const count = document.getElementById("routineCount"); if (count) count.textContent = `(${state.workouts.routines.length})`;
  if (!state.workouts.routines.length) {
    container.innerHTML = `<div class="routine-empty-minimal">Nenhuma rotina criada.</div>`;
    return;
  }
  container.innerHTML = state.workouts.routines.map((routine) => {
    const names = (routine.exerciseIds || []).slice(0, 3).map((id) => getExerciseById(id)?.name).filter(Boolean);
    return `<article class="routine-card"><button class="routine-main" type="button" data-start-routine="${escapeHtml(routine.id)}"><span class="routine-play">▶</span><span><strong>${escapeHtml(routine.name)}</strong><small>${escapeHtml(names.join(" • ") || "Sem exercícios")}</small><em>${routine.exerciseIds?.length || 0} exercícios</em></span></button><button class="routine-menu" type="button" data-edit-routine="${escapeHtml(routine.id)}" aria-label="Editar rotina">•••</button></article>`;
  }).join("");
}

function renderStrengthSessions() {
  const container = document.getElementById("strengthSessionList");
  if (!container) return;
  const sessions = state.workouts.sessions.slice(0, 4);
  if (!sessions.length) {
    container.innerHTML = `<div class="strength-empty-session"><span>🏋️</span><div><strong>Nenhum treino registrado</strong><small>Seu histórico de musculação aparecerá aqui.</small></div></div>`;
    return;
  }
  container.innerHTML = sessions.map((session) => {
    const date = new Date(session.finishedAt);
    return `<article class="strength-session-card"><span class="session-icon">🏋️</span><div class="session-copy"><strong>${escapeHtml(session.name)}</strong><small>${shortDateFormatter.format(date)} • ${formatDurationSeconds(session.durationSeconds)} • ${session.completedSets} séries</small><span>${escapeHtml(session.exercises.slice(0,3).map((ex)=>ex.name).join(" • "))}</span></div><div class="session-xp">+${formatNumber(session.xp || 0)} XP</div></article>`;
  }).join("");
}

function startEmptyWorkout() {
  ensureWorkoutState();
  if (state.workouts.active) return renderStrengthTraining();
  state.workouts.active = {
    id: createId(), name: "Treino", startedAt: new Date().toISOString(), exercises: []
  };
  saveGame();
  renderStrengthTraining();
  openExercisePicker("workout");
}

function startRoutineWorkout(routineId) {
  const routine = state.workouts.routines.find((item) => item.id === routineId);
  if (!routine) return;
  state.workouts.active = {
    id: createId(), name: routine.name, startedAt: new Date().toISOString(),
    routineId: routine.id,
    exercises: (routine.exerciseIds || []).map(createWorkoutExercise).filter(Boolean)
  };
  saveGame();
  renderStrengthTraining();
}

function requestConfirmation({ title, message, confirmLabel = "Confirmar", cancelLabel = "Voltar", danger = false, icon = "!", details = [] }, onConfirm) {
  const overlay = document.getElementById("actionConfirmOverlay");
  if (!overlay) { if (window.confirm(`${title}\n\n${message}`)) onConfirm?.(); return; }
  confirmationAction = typeof onConfirm === "function" ? onConfirm : null;
  setText("actionConfirmTitle", title);
  setText("actionConfirmMessage", message);
  setText("actionConfirmIcon", icon);
  setText("actionConfirmContinue", confirmLabel);
  setText("actionConfirmCancel", cancelLabel);
  const confirmButton = document.getElementById("actionConfirmContinue");
  confirmButton?.classList.toggle("is-danger", danger);
  const detailsBox = document.getElementById("actionConfirmDetails");
  if (detailsBox) {
    detailsBox.hidden = !details.length;
    detailsBox.innerHTML = details.map((item) => `<div><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(String(item.value))}</strong></div>`).join("");
  }
  overlay.hidden = false;
  document.body.classList.add("modal-open");
}

function closeActionConfirmation(runAction = false) {
  const overlay = document.getElementById("actionConfirmOverlay");
  if (overlay) overlay.hidden = true;
  document.body.classList.remove("modal-open");
  const action = confirmationAction;
  confirmationAction = null;
  if (runAction) action?.();
}

function cancelWorkout() {
  const workout = state.workouts.active;
  if (!workout) return;
  let completed = 0, volume = 0;
  workout.exercises.forEach((exercise) => exercise.sets.forEach((set) => {
    if (set.completed) completed += 1;
    if (set.completed) volume += (Number(set.weight)||0) * (Number(set.reps)||0);
  }));
  requestConfirmation({
    title: "Cancelar treino?",
    message: "O treino em andamento será descartado e não dará XP. Esta ação não pode ser desfeita.",
    confirmLabel: "Cancelar treino",
    cancelLabel: "Continuar treino",
    danger: true,
    icon: "×",
    details: [
      { label: "Séries concluídas", value: completed },
      { label: "Volume atual", value: `${numberFormatter.format(Math.round(volume))} kg` }
    ]
  }, () => {
    state.workouts.active = null;
    stopRestTimer();
    stopWorkoutElapsedTicker();
    saveGame();
    renderStrengthTraining();
    showToast("Treino cancelado", "O registro em andamento foi descartado.", "×");
  });
}

function renderActiveWorkout() {
  const workout = state.workouts.active;
  if (!workout) return;
  setInputValue("activeWorkoutName", workout.name || "Treino");
  setText("saveWorkoutAsRoutine", workout.routineId ? "Salvar alterações da rotina" : "Salvar como rotina");
  const container = document.getElementById("workoutExerciseList");
  if (!container) return;
  if (!workout.exercises.length) {
    container.innerHTML = `<div class="workout-empty"><span>＋</span><strong>Adicione seu primeiro exercício</strong><p>Pesquise na biblioteca e monte seu treino.</p></div>`;
  } else {
    container.innerHTML = workout.exercises.map((exercise, exerciseIndex) => renderWorkoutExercise(exercise, exerciseIndex)).join("");
  }
  updateWorkoutLiveStats();
}

function renderWorkoutExercise(exercise, exerciseIndex) {
  const definition = getExerciseById(exercise.exerciseId) || exercise;
  const tracking = getExerciseTracking(definition);
  const muscle = definition.primaryMuscles?.[0] || "forca";
  const previous = getPreviousExercisePerformance(exercise.exerciseId);
  const rows = exercise.sets.map((set, setIndex) => {
    const previousText = previous[setIndex] || set.previous || "—";
    const commonStart = `<div class="workout-set-row mode-${tracking} ${set.completed ? "is-complete" : ""}" data-set-row="${set.id}"><button class="set-type-badge type-${escapeHtml(set.type)}" type="button" data-cycle-set-type="${set.id}" data-exercise-instance="${exercise.id}" title="Alterar tipo de série">${setTypeLabel(set.type, setIndex + 1)}</button><span class="previous-set">${escapeHtml(previousText)}</span>`;
    const complete = `<button class="set-complete-button" type="button" data-complete-set="${set.id}" data-exercise-instance="${exercise.id}" aria-label="${set.completed ? "Desmarcar série" : "Concluir série"}">${set.completed ? "✓" : "○"}</button></div>`;
    if (tracking === "time") {
      const seconds = escapeHtml(set.durationSeconds ?? "");
      return `${commonStart}<div class="timed-set-control"><input class="set-input timed-set-input" type="number" inputmode="numeric" min="0" max="7200" step="1" placeholder="seg" value="${seconds}" data-set-field="durationSeconds" data-set-id="${set.id}" data-exercise-instance="${exercise.id}" aria-label="Tempo em segundos"><button class="set-timer-button" type="button" data-toggle-set-timer="${set.id}" data-exercise-instance="${exercise.id}" aria-label="Iniciar ou parar cronômetro">▶</button></div>${complete}`;
    }
    if (tracking === "reps") {
      return `${commonStart}<input class="set-input" type="number" inputmode="numeric" min="0" max="999" step="1" placeholder="0" value="${escapeHtml(set.reps)}" data-set-field="reps" data-set-id="${set.id}" data-exercise-instance="${exercise.id}" aria-label="Repetições">${complete}`;
    }
    return `${commonStart}<input class="set-input" type="number" inputmode="decimal" min="0" step="0.5" placeholder="0" value="${escapeHtml(set.weight)}" data-set-field="weight" data-set-id="${set.id}" data-exercise-instance="${exercise.id}" aria-label="Peso em kg"><input class="set-input" type="number" inputmode="numeric" min="0" max="999" step="1" placeholder="0" value="${escapeHtml(set.reps)}" data-set-field="reps" data-set-id="${set.id}" data-exercise-instance="${exercise.id}" aria-label="Repetições">${complete}`;
  }).join("");
  const header = tracking === "time"
    ? `<div class="workout-set-header mode-time"><span>SÉRIE</span><span>ANTERIOR</span><span>TEMPO</span><span>✓</span></div>`
    : tracking === "reps"
      ? `<div class="workout-set-header mode-reps"><span>SÉRIE</span><span>ANTERIOR</span><span>REPS</span><span>✓</span></div>`
      : `<div class="workout-set-header mode-weight_reps"><span>SÉRIE</span><span>ANTERIOR</span><span>KG</span><span>REPS</span><span>✓</span></div>`;
  const trackingLabel = tracking === "time" ? "Tempo" : tracking === "reps" ? "Repetições" : "Carga + repetições";
  return `<article class="workout-exercise-card" data-exercise-instance-card="${exercise.id}"><div class="workout-exercise-head"><span class="exercise-muscle-icon">${muscleIcon(muscle)}</span><button class="exercise-title-button" type="button" data-show-exercise-info="${escapeHtml(exercise.exerciseId)}"><strong>${escapeHtml(exercise.name)}</strong><small>${humanizeToken(muscle)} • ${humanizeToken(definition.equipment)} • ${trackingLabel}</small></button><button class="exercise-more" type="button" data-remove-workout-exercise="${exercise.id}" aria-label="Remover exercício">•••</button></div><input class="exercise-note" data-exercise-note="${exercise.id}" placeholder="Adicionar observação" value="${escapeHtml(exercise.notes || "")}">${header}${rows}<button class="add-set-button" type="button" data-add-set="${exercise.id}">＋ Adicionar série</button></article>`;
}

function setTypeLabel(type, number) {
  if (type === "warmup") return "A";
  if (type === "drop") return "D";
  if (type === "failure") return "F";
  return String(number);
}

function cycleSetType(exerciseInstanceId, setId) {
  const set = findWorkoutSet(exerciseInstanceId, setId);
  if (!set) return;
  const order = ["normal", "warmup", "failure", "drop"];
  set.type = order[(order.indexOf(set.type) + 1) % order.length];
  saveGame(); renderActiveWorkout();
}

function findWorkoutExercise(instanceId) {
  return state.workouts.active?.exercises.find((exercise) => exercise.id === instanceId) || null;
}
function findWorkoutSet(instanceId, setId) {
  return findWorkoutExercise(instanceId)?.sets.find((set) => set.id === setId) || null;
}

function addWorkoutSet(exerciseInstanceId) {
  const exercise = findWorkoutExercise(exerciseInstanceId);
  if (!exercise) return;
  const last = exercise.sets[exercise.sets.length - 1];
  const previous = getPreviousExercisePerformance(exercise.exerciseId);
  const tracking = getExerciseTracking(exercise.exerciseId);
  exercise.sets.push({ id:createId(), type:"normal", weight:tracking === "weight_reps" ? (last?.weight || "") : "", reps:tracking === "time" ? "" : (last?.reps || ""), durationSeconds:tracking === "time" ? (last?.durationSeconds || "") : "", completed:false, previous:previous[exercise.sets.length] || "" });
  saveGame(); renderActiveWorkout();
  const field = tracking === "time" ? "durationSeconds" : tracking === "reps" ? "reps" : "weight";
  document.querySelector(`[data-set-row="${exercise.sets.at(-1).id}"] input[data-set-field="${field}"]`)?.focus();
}

function toggleWorkoutSet(exerciseInstanceId, setId) {
  const set = findWorkoutSet(exerciseInstanceId, setId);
  const exercise = findWorkoutExercise(exerciseInstanceId);
  if (!set || !exercise) return;
  const tracking = getExerciseTracking(exercise.exerciseId);
  const valid = tracking === "time" ? Number(set.durationSeconds) > 0 : Number(set.reps) > 0;
  if (!set.completed && !valid) {
    const message = tracking === "time" ? "Informe o tempo ou use o cronômetro antes de concluir a série." : "Informe as repetições antes de concluir a série.";
    showToast(tracking === "time" ? "Informe o tempo" : "Informe as repetições", message, "⚠");
    return;
  }
  if (activeExerciseSetTimer?.setId === setId) stopExerciseSetTimer(true);
  set.completed = !set.completed;
  saveGame(); renderActiveWorkout();
  if (set.completed) startRestTimer(90);
}

function toggleExerciseSetTimer(exerciseInstanceId, setId) {
  const set = findWorkoutSet(exerciseInstanceId, setId);
  const exercise = findWorkoutExercise(exerciseInstanceId);
  if (!set || !exercise || getExerciseTracking(exercise.exerciseId) !== "time") return;
  if (activeExerciseSetTimer?.setId === setId) {
    stopExerciseSetTimer(true);
    return;
  }
  stopExerciseSetTimer(true);
  const existing = Math.max(0, Number(set.durationSeconds) || 0);
  activeExerciseSetTimer = { exerciseInstanceId, setId, startedAt: Date.now(), baseSeconds: existing, interval: null };
  const tick = () => {
    if (!activeExerciseSetTimer || activeExerciseSetTimer.setId !== setId) return;
    const elapsed = Math.floor((Date.now() - activeExerciseSetTimer.startedAt) / 1000);
    const value = activeExerciseSetTimer.baseSeconds + elapsed;
    set.durationSeconds = String(value);
    const input = document.querySelector(`[data-set-id="${setId}"][data-set-field="durationSeconds"]`);
    if (input) input.value = String(value);
    const button = document.querySelector(`[data-toggle-set-timer="${setId}"]`);
    if (button) { button.textContent = "■"; button.classList.add("is-running"); }
  };
  tick();
  activeExerciseSetTimer.interval = window.setInterval(tick, 1000);
}

function stopExerciseSetTimer(save = true) {
  if (!activeExerciseSetTimer) return;
  const timer = activeExerciseSetTimer;
  if (timer.interval) window.clearInterval(timer.interval);
  const set = findWorkoutSet(timer.exerciseInstanceId, timer.setId);
  if (set) {
    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
    set.durationSeconds = String(timer.baseSeconds + elapsed);
  }
  activeExerciseSetTimer = null;
  if (save) saveGame();
  const button = document.querySelector(`[data-toggle-set-timer="${timer.setId}"]`);
  if (button) { button.textContent = "▶"; button.classList.remove("is-running"); }
}

function updateWorkoutField(target) {
  const exerciseInstanceId = target.dataset.exerciseInstance;
  const setId = target.dataset.setId;
  const field = target.dataset.setField;
  if (!exerciseInstanceId || !setId || !field) return;
  const set = findWorkoutSet(exerciseInstanceId, setId);
  if (!set) return;
  set[field] = target.value;
  saveGame(); updateWorkoutLiveStats();
}

function updateWorkoutLiveStats() {
  const workout = state.workouts.active;
  if (!workout) return;
  let volume=0, completed=0;
  workout.exercises.forEach((exercise) => exercise.sets.forEach((set) => {
    if (!set.completed) return;
    completed += 1;
    volume += (Number(set.weight)||0) * (Number(set.reps)||0);
  }));
  setText("workoutVolume", `${numberFormatter.format(Math.round(volume))} kg`);
  setText("workoutCompletedSets", completed);
}

function startWorkoutElapsedTicker() {
  if (workoutElapsedInterval) return;
  updateWorkoutElapsed();
  workoutElapsedInterval = window.setInterval(updateWorkoutElapsed, 1000);
}
function stopWorkoutElapsedTicker() {
  if (workoutElapsedInterval) window.clearInterval(workoutElapsedInterval);
  workoutElapsedInterval = null;
}
function updateWorkoutElapsed() {
  const startedAt = state.workouts?.active?.startedAt;
  if (!startedAt) return;
  const sec = Math.max(0, Math.floor((Date.now()-new Date(startedAt).getTime())/1000));
  setText("workoutElapsed", formatDurationSeconds(sec));
}
function formatDurationSeconds(seconds) {
  const sec=Math.max(0,Math.round(Number(seconds)||0));
  const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
  if (h>0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function calculateStrengthWorkoutXp(workout) {
  const forceLevel = state.attributes.force.level;
  const levelBonus = Math.min(.5, forceLevel*.01);
  const classBonus = getClassBonus("force");
  const buffBonus = getActiveBuffs().reduce((sum,buff)=>sum+Math.max(0,Number(buff.multiplier)-1),0);
  const rawGlobalBonus = levelBonus + classBonus + buffBonus;
  const appliedGlobalBonus = Math.min(.5,rawGlobalBonus);
  let base=0, completedSets=0, compoundSets=0;
  workout.exercises.forEach((exercise)=>{
    const def=getExerciseById(exercise.exerciseId);
    exercise.sets.forEach((set)=>{
      if(!set.completed) return;
      completedSets += 1;
      let setBase = set.type === "warmup" ? 8 : (set.type === "failure" || set.type === "drop") ? 20 : 12;
      if(def?.mechanic === "composto") { setBase *= 1.10; compoundSets += 1; }
      base += setBase;
    });
  });
  return { baseXp:Math.round(base), xp:Math.max(1,Math.round(base*(1+appliedGlobalBonus))), completedSets, compoundSets, appliedBonus:appliedGlobalBonus };
}

function finishStrengthWorkout() {
  const workout=state.workouts.active;
  if(!workout) return;
  const calc=calculateStrengthWorkoutXp(workout);
  if(!calc.completedSets) { showToast("Nenhuma série concluída","Marque pelo menos uma série como concluída antes de finalizar.","⚠"); return; }
  let volume=0;
  workout.exercises.forEach((exercise)=>exercise.sets.forEach((set)=>{if(set.completed) volume+=(Number(set.weight)||0)*(Number(set.reps)||0)}));
  const durationSeconds=Math.max(1,Math.round((Date.now()-new Date(workout.startedAt).getTime())/1000));
  requestConfirmation({
    title: "Finalizar treino?",
    message: "Confirme o registro. Depois de finalizar, o treino entra no histórico e o XP é aplicado.",
    confirmLabel: "Finalizar treino",
    cancelLabel: "Voltar ao treino",
    icon: "✓",
    details: [
      { label: "Séries", value: calc.completedSets },
      { label: "Exercícios", value: workout.exercises.length },
      { label: "Volume", value: `${numberFormatter.format(Math.round(volume))} kg` },
      { label: "XP estimado", value: `+${formatNumber(calc.xp)} XP` }
    ]
  }, finalizeStrengthWorkout);
}

function finalizeStrengthWorkout() {
  const workout=state.workouts.active;
  if(!workout) return;
  const calc=calculateStrengthWorkoutXp(workout);
  const beforeForce={level:state.attributes.force.level,xp:state.attributes.force.xp};
  const finishedAt=new Date();
  const durationSeconds=Math.max(1,Math.round((finishedAt-new Date(workout.startedAt))/1000));
  let volume=0;
  workout.exercises.forEach((exercise)=>exercise.sets.forEach((set)=>{if(set.completed) volume+=(Number(set.weight)||0)*(Number(set.reps)||0)}));
  const session={...structuredCloneSafe(workout),finishedAt:finishedAt.toISOString(),durationSeconds,completedSets:calc.completedSets,volume:Math.round(volume),xp:calc.xp,baseXp:calc.baseXp,bonusPercent:calc.appliedBonus,compoundSets:calc.compoundSets};
  state.workouts.sessions.unshift(session);
  state.workouts.sessions=state.workouts.sessions.slice(0,200);
  const progressEvents=addXP("force",calc.xp,workout.name || "Treino de musculação");
  const streakUpdate=updateStreak(finishedAt);
  state.history.unshift({id:createId(),kind:"activity",activityId:"strengthWorkout",activityName:workout.name || "Treino de musculação",attribute:"force",xp:calc.xp,baseXp:calc.baseXp,bonusPercent:calc.appliedBonus,setCount:calc.completedSets,details:`${calc.completedSets} séries • ${workout.exercises.length} exercícios • ${numberFormatter.format(Math.round(volume))} kg`,timestamp:finishedAt.toISOString(),dateKey:localDateKey(finishedAt)});
  state.history=state.history.slice(0,1000);
  rebuildStatsFromSources();
  state.workouts.active=null;
  stopWorkoutElapsedTicker(); stopRestTimer(); stopExerciseSetTimer(true);
  const missions=refreshMissionProgress(); syncDerivedState(); saveGame(); updateUI();
  workoutResultProgressEvents=progressEvents;
  showWorkoutResult(session,calc,beforeForce,streakUpdate);
  if(streakUpdate.changed) showToast(streakUpdate.reset?"Novo streak iniciado":"Streak aumentado",`Sequência atual: ${formatDays(state.streak.current)}.`,"🔥");
  missions.forEach((mission)=>showToast("Missão concluída",`${mission.name} está pronta para resgate.`,"✦"));
}

function showWorkoutResult(session,calc,beforeForce,streakUpdate) {
  const overlay=document.getElementById("workoutResultOverlay"); if(!overlay) return;
  const force=state.attributes.force;
  const needed=force.level>=MAX_LEVEL?0:calculateRequiredXP(force.level);
  const pct=force.level>=MAX_LEVEL?100:Math.min(100,(force.xp/needed)*100);
  setText("workoutResultTitle",session.name || "Treino concluído");
  setText("workoutResultXp",`+${formatNumber(calc.xp)} XP`);
  setText("workoutResultXpBreakdown",`${formatNumber(calc.baseXp)} XP base • +${Math.round(calc.appliedBonus*100)}% de bônus`);
  setText("workoutResultForceLevel",`Força • Nv. ${force.level}`);
  setText("workoutResultForceProgress",force.level>=MAX_LEVEL?"Nível máximo":`${formatNumber(force.xp)} / ${formatNumber(needed)} XP`);
  const bar=document.getElementById("workoutResultForceBar"); if(bar) bar.style.width=`${pct}%`;
  setText("workoutResultSets",calc.completedSets);
  setText("workoutResultExercises",session.exercises.length);
  setText("workoutResultVolume",`${numberFormatter.format(session.volume)} kg`);
  setText("workoutResultDuration",formatDurationSeconds(session.durationSeconds));
  const levelText=force.level>beforeForce.level?`<strong>Level up!</strong> Força ${beforeForce.level} → ${force.level}. `:"";
  const compoundText=calc.compoundSets?`${calc.compoundSets} séries compostas receberam bônus. `:"";
  const streakText=streakUpdate.changed?`Streak atual: ${formatDays(state.streak.current)}.`:"";
  const bonus=document.getElementById("workoutResultBonus"); if(bonus) bonus.innerHTML=`${levelText}${compoundText}${streakText || "Progresso salvo automaticamente."}`;
  overlay.hidden=false; document.body.classList.add("modal-open");
}

function closeWorkoutResult() {
  const overlay=document.getElementById("workoutResultOverlay"); if(overlay) overlay.hidden=true;
  document.body.classList.remove("modal-open");
  const events=workoutResultProgressEvents; workoutResultProgressEvents=[];
  if(events.length) presentProgressEvents(events);
}

function openExercisePicker(target="workout") {
  pickerTarget=target; pickerSelectedIds=new Set();
  exercisePickerReturnToRoutine = target === "routine" && !document.getElementById("routineEditorOverlay")?.hidden;
  if (exercisePickerReturnToRoutine) document.getElementById("routineEditorOverlay").hidden = true;
  const overlay=document.getElementById("exercisePickerOverlay"); if(!overlay) return;
  overlay.hidden=false; document.body.classList.add("modal-open");
  setText("exercisePickerTitle", target === "browse" ? "Pesquisar exercícios" : "Adicionar exercício");
  const confirm = document.getElementById("confirmExercisePicker"); if (confirm) confirm.hidden = target === "browse";
  populateExerciseFilters(); renderExercisePicker();
  window.setTimeout(()=>document.getElementById("exerciseSearch")?.focus(),30);
}
function closeExercisePicker() {
  const overlay=document.getElementById("exercisePickerOverlay"); if(overlay) overlay.hidden=true;
  if (exercisePickerReturnToRoutine && routineDraft) {
    const routineOverlay=document.getElementById("routineEditorOverlay"); if(routineOverlay) routineOverlay.hidden=false;
    document.body.classList.add("modal-open");
  } else document.body.classList.remove("modal-open");
  exercisePickerReturnToRoutine=false; pickerSelectedIds.clear();
}
function populateExerciseFilters() {
  const muscle=document.getElementById("exerciseMuscleFilter"), equipment=document.getElementById("exerciseEquipmentFilter");
  if(muscle && muscle.options.length===1) {
    [...new Set(EXERCISE_DATABASE.flatMap(ex=>ex.primaryMuscles))].sort().forEach(value=>muscle.add(new Option(humanizeToken(value),value)));
  }
  if(equipment && equipment.options.length===1) {
    [...new Set(EXERCISE_DATABASE.map(ex=>ex.equipment).filter(Boolean))].sort().forEach(value=>equipment.add(new Option(humanizeToken(value),value)));
  }
}
function renderExercisePicker() {
  const container=document.getElementById("exercisePickerResults"); if(!container) return;
  const search=(document.getElementById("exerciseSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
  const muscle=document.getElementById("exerciseMuscleFilter")?.value||"all";
  const equipment=document.getElementById("exerciseEquipmentFilter")?.value||"all";
  const allowedCategories=new Set(["forca","powerlifting","levantamento-olimpico","strongman","pliometria","alongamento"]);
  const results=EXERCISE_DATABASE.filter(ex=>allowedCategories.has(ex.category)).filter(ex=>muscle==="all"||ex.primaryMuscles.includes(muscle)).filter(ex=>equipment==="all"||ex.equipment===equipment).filter(ex=>!search||`${ex.name} ${ex.primaryMuscles.join(" ")} ${ex.equipment}`.toLocaleLowerCase("pt-BR").includes(search)).slice(0,120);
  if(!results.length){container.innerHTML=`<div class="exercise-picker-empty">Nenhum exercício encontrado.</div>`;return;}
  container.innerHTML=results.map(ex=>{const selected=pickerSelectedIds.has(ex.id); const muscleName=ex.primaryMuscles[0]||"força"; const browse=pickerTarget==="browse"; return `<button class="exercise-picker-item ${selected?"is-selected":""}" type="button" ${browse?`data-show-exercise-info="${escapeHtml(ex.id)}"`:`data-pick-exercise="${escapeHtml(ex.id)}"`}><span class="picker-muscle-icon">${muscleIcon(muscleName)}</span><span class="picker-exercise-copy"><strong>${escapeHtml(ex.name)}</strong><small>${escapeHtml(humanizeToken(muscleName))} • ${escapeHtml(humanizeToken(ex.equipment))} • ${escapeHtml(humanizeToken(ex.level))}</small></span><span class="picker-check">${browse?"ℹ":(selected?"✓":"＋")}</span></button>`}).join("");
}
function togglePickerExercise(exerciseId){ if(pickerSelectedIds.has(exerciseId)) pickerSelectedIds.delete(exerciseId); else pickerSelectedIds.add(exerciseId); renderExercisePicker(); }
function confirmExercisePicker(){
  const ids=[...pickerSelectedIds]; if(!ids.length){showToast("Selecione um exercício","Escolha pelo menos um item da biblioteca.","⚠");return;}
  if(pickerTarget==="routine") {
    if(!routineDraft) routineDraft={name:"",exerciseIds:[]};
    ids.forEach(id=>{if(!routineDraft.exerciseIds.includes(id)) routineDraft.exerciseIds.push(id)}); renderRoutineDraft();
  } else {
    if(!state.workouts.active) startEmptyWorkout();
    ids.forEach(id=>{if(!state.workouts.active.exercises.some(ex=>ex.exerciseId===id)){const item=createWorkoutExercise(id);if(item) state.workouts.active.exercises.push(item)}}); saveGame(); renderStrengthTraining();
  }
  closeExercisePicker();
}

function removeWorkoutExercise(instanceId){
  const workout=state.workouts.active;if(!workout)return;
  const ex=workout.exercises.find(item=>item.id===instanceId); if(!ex)return;
  const removeNow=()=>{workout.exercises=workout.exercises.filter(item=>item.id!==instanceId);saveGame();renderActiveWorkout();};
  if(ex.sets.some(set=>set.completed || set.weight || set.reps)) {
    requestConfirmation({title:"Remover exercício?",message:`${ex.name} e as séries preenchidas serão removidos deste treino.`,confirmLabel:"Remover",cancelLabel:"Manter",danger:true,icon:"×",details:[{label:"Séries",value:ex.sets.length},{label:"Concluídas",value:ex.sets.filter(set=>set.completed).length}]},removeNow);
    return;
  }
  removeNow();
}

function openRoutineEditor(fromActive=false, routineId=null){
  const existing = routineId ? state.workouts.routines.find((item) => item.id === routineId) : null;
  routineDraft = existing
    ? {id: existing.id, name: existing.name, exerciseIds: [...(existing.exerciseIds || [])], createdAt: existing.createdAt}
    : {id: null, name: fromActive ? (state.workouts.active?.name || "Treino") : "", exerciseIds: fromActive ? (state.workouts.active?.exercises.map((ex) => ex.exerciseId) || []) : []};
  const overlay=document.getElementById("routineEditorOverlay");
  if(overlay) overlay.hidden=false;
  document.body.classList.add("modal-open");
  renderRoutineDraft();
  window.setTimeout(()=>document.getElementById("routineNameInput")?.focus(),30);
}
function closeRoutineEditor(){const overlay=document.getElementById("routineEditorOverlay");if(overlay)overlay.hidden=true;document.body.classList.remove("modal-open");routineDraft=null;}
function renderRoutineDraft(){
  if(!routineDraft)return;
  setInputValue("routineNameInput",routineDraft.name||"");
  setText("routineEditorTitle", routineDraft.id ? "Editar rotina" : "Criar rotina");
  setText("saveRoutineButton", routineDraft.id ? "Salvar" : "Criar");
  const deleteButton=document.getElementById("deleteRoutineEditorButton"); if(deleteButton) deleteButton.hidden=!routineDraft.id;
  const container=document.getElementById("routineEditorExercises");if(!container)return;
  container.innerHTML=routineDraft.exerciseIds.length?routineDraft.exerciseIds.map((id,index)=>{const ex=getExerciseById(id);return `<div class="routine-draft-row"><span>${index+1}</span><div><strong>${escapeHtml(ex?.name||id)}</strong><small>${escapeHtml(humanizeToken(ex?.primaryMuscles?.[0]||"força"))}</small></div><button type="button" data-remove-routine-exercise="${escapeHtml(id)}" aria-label="Remover exercício">×</button></div>`}).join(""):`<div class="routine-draft-empty">Adicione exercícios para montar a rotina.</div>`;
}
function saveRoutine(){
  if(!routineDraft)return;
  routineDraft.name=(document.getElementById("routineNameInput")?.value||"").trim();
  if(!routineDraft.name){showToast("Dê um nome à rotina","Ex.: Peito e tríceps, Pull ou Treino A.","⚠");return;}
  if(!routineDraft.exerciseIds.length){showToast("Rotina vazia","Adicione pelo menos um exercício.","⚠");return;}
  const savedName=routineDraft.name;
  if(routineDraft.id){
    const index=state.workouts.routines.findIndex((item)=>item.id===routineDraft.id);
    if(index!==-1) state.workouts.routines[index]={...state.workouts.routines[index],name:routineDraft.name,exerciseIds:[...routineDraft.exerciseIds],updatedAt:new Date().toISOString()};
  } else {
    state.workouts.routines.unshift({id:createId(),name:routineDraft.name,exerciseIds:[...routineDraft.exerciseIds],createdAt:new Date().toISOString()});
  }
  saveGame();closeRoutineEditor();renderStrengthTraining();showToast("Rotina salva",`${savedName} foi salva.`,"✓");
}
function deleteRoutine(routineId){
  const routine=state.workouts.routines.find(item=>item.id===routineId); if(!routine)return;
  requestConfirmation({title:"Excluir rotina?",message:`A rotina “${routine.name}” será removida. Seus treinos já registrados continuam no histórico.`,confirmLabel:"Excluir rotina",cancelLabel:"Manter rotina",danger:true,icon:"×",details:[{label:"Exercícios",value:routine.exerciseIds?.length||0}]},()=>{
    state.workouts.routines=state.workouts.routines.filter(item=>item.id!==routineId); saveGame(); renderRoutineList(); showToast("Rotina excluída",routine.name,"×");
  });
}

function showExerciseInfo(exerciseId){
  const ex=getExerciseById(exerciseId);if(!ex)return;
  const instructions=(ex.instructions||[]).map((text,index)=>`${index+1}. ${text}`).join("\n\n");
  window.alert(`${ex.name}\n\nMúsculo principal: ${humanizeToken(ex.primaryMuscles?.[0]||"—")}\nEquipamento: ${humanizeToken(ex.equipment)}\nNível: ${humanizeToken(ex.level)}\n\n${instructions||"Sem instruções cadastradas."}`);
}

function startRestTimer(seconds=90){stopRestTimer();restTimerSeconds=Math.max(0,seconds);const el=document.getElementById("restTimer");if(el)el.hidden=false;updateRestTimer();restTimerInterval=window.setInterval(()=>{restTimerSeconds-=1;updateRestTimer();if(restTimerSeconds<=0){stopRestTimer();showToast("Descanso concluído","Pronto para a próxima série.","⏱")}},1000)}
function adjustRestTimer(delta){restTimerSeconds=Math.max(0,restTimerSeconds+delta);updateRestTimer();if(restTimerSeconds===0)stopRestTimer()}
function updateRestTimer(){const m=Math.floor(restTimerSeconds/60),s=restTimerSeconds%60;setText("restTimerValue",`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`)}
function stopRestTimer(){if(restTimerInterval)window.clearInterval(restTimerInterval);restTimerInterval=null;restTimerSeconds=0;const el=document.getElementById("restTimer");if(el)el.hidden=true}

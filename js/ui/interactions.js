"use strict";

const debouncedExerciseSearch = debounce(renderExercisePicker, 120);
const debouncedFoodSearch = debounce(renderFoodSearch, 120);
const debouncedSocialSearch = debounce(renderSocialSearch, 100);

function toggleCardioPanels(running) {
  const launch = document.getElementById("cardioLaunchPanel");
  const live = document.getElementById("cardioLivePanel");
  if (launch) launch.hidden = running;
  if (live) live.hidden = !running;
  if (typeof renderLiveSessionIndicators === "function") renderLiveSessionIndicators();
}


const HELP_CONTENT = {
  social: {
    title: "Área Social",
    html: `<p>O Social conecta sua conta a grupos do RPG GYM.</p><ul><li>Pesquise e entre em um grupo.</li><li>Veja integrantes e registros recentes quase em tempo real.</li><li>Abra o perfil de um integrante para comparar atributos.</li><li>Quando vocês usam os mesmos exercícios, o app compara os melhores registros salvos.</li></ul><p class="help-tip">Somente informações de progresso necessárias para o grupo são compartilhadas. Dados privados do perfil e o save completo continuam protegidos.</p>`
  },
  training: {
    title: "Como registrar treino",
    html: `<ol><li>Inicie um treino vazio ou uma rotina salva.</li><li>Pesquise e adicione exercícios.</li><li>Informe carga e repetições de cada série.</li><li>Marque a série como concluída.</li><li>Finalize o treino para calcular volume e XP.</li></ol><p class="help-tip">O histórico da série anterior aparece automaticamente quando houver dados.</p>`
  },
  strength: {
    title: "Musculação",
    html: `<p>O registrador funciona no estilo de apps como Hevy.</p><ul><li>Crie rotinas reutilizáveis.</li><li>Pesquise exercícios por nome, músculo e equipamento.</li><li>Use séries normais, aquecimento, falha ou drop set.</li><li>Treinos compostos podem gerar bônus no XP de Força.</li></ul>`
  },
  cardio: {
    title: "Como registrar cardio",
    html: `<ol><li>Escolha a modalidade e inicie o cronômetro.</li><li>Pause quando necessário.</li><li>Finalize e informe os dados pedidos para aquela modalidade.</li><li>Confirme para registrar XP e performance.</li></ol><p class="help-tip">Cardio usa afinidades: endurance costuma alimentar Constituição, enquanto velocidade, ritmo ou potência podem gerar uma parcela menor de XP em Agilidade ou Força. O XP secundário não passa do limite configurado.</p>`
  },
  diet: {
    title: "Como usar a Dieta",
    html: `<ol><li>Toque em “Adicionar alimento” na refeição.</li><li>Pesquise na base TACO.</li><li>Informe a quantidade em gramas.</li><li>Os macros e calorias são recalculados automaticamente.</li></ol><p class="help-tip">Os dados nutricionais são calculados a partir dos valores por 100 g da TACO.</p>`
  },
  profile: {
    title: "Perfil e atributos",
    html: `<p>O radar resume os seis atributos do RPG GYM.</p><ul><li>Cada atributo possui XP e nível próprios.</li><li>Toque em um atributo para abrir sua rota permanente.</li><li>Roadmaps exigem nível + objetivos e liberam marcos e evoluções de classe.</li><li>Missões rotativas são bônus; a maior parte do progresso vem das atividades reais.</li></ul>`
  },
  roadmap: {
    title: "Roadmap e classes",
    html: `<p>O roadmap é a campanha permanente de cada atributo.</p><ul><li>Há capítulos nos níveis 5, 10, 15... até 50.</li><li>Os objetivos são cumulativos: seu progresso antigo continua contando.</li><li>Nos níveis múltiplos de 10, concluir e resgatar o capítulo evolui a classe.</li><li>Chegar ao nível sozinho não libera a classe: os objetivos também precisam estar completos.</li></ul><p class="help-tip">Missões diárias e semanais renovam. Roadmaps não renovam.</p>`
  },
  xp: {
    title: "XP e progressão",
    html: `<p>Os níveis iniciais avançam mais rápido e os níveis altos exigem mais constância.</p><ul><li>Atividade real é a principal fonte de XP.</li><li>Fazer mais continua dando XP; repetições excessivas no mesmo dia têm retorno decrescente.</li><li>Musculação e cardio são categorias independentes.</li><li>PRs, missões e roadmaps complementam o progresso.</li></ul>`
  }
};

function openHelp(key) {
  const data = HELP_CONTENT[key] || HELP_CONTENT.profile;
  const overlay = document.getElementById("helpOverlay");
  if (!overlay) return;
  setText("helpModalTitle", data.title);
  const content = document.getElementById("helpModalContent");
  if (content) content.innerHTML = data.html;
  state.tutorial ||= { welcomeSeen: false, dismissed: {}, viewedHelp: {} };
  state.tutorial.viewedHelp ||= {};
  state.tutorial.viewedHelp[key] = true;
  saveGame();
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeHelp() {
  const overlay = document.getElementById("helpOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = "";
}
function openOnboarding(force = false) {
  const overlay = document.getElementById("onboardingOverlay");
  if (!overlay) return;
  state.tutorial ||= { welcomeSeen: false, dismissed: {}, viewedHelp: {} };
  if (!force && state.tutorial.welcomeSeen) return;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeOnboarding() {
  const overlay = document.getElementById("onboardingOverlay");
  if (!overlay) return;
  state.tutorial ||= { welcomeSeen: false, dismissed: {}, viewedHelp: {} };
  state.tutorial.welcomeSeen = true;
  saveGame();
  overlay.hidden = true;
  document.body.style.overflow = "";
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const guideButton = event.target.closest("[data-open-guide]");
    if (guideButton) { openOnboarding(true); return; }

    const roadmapHelp = event.target.closest("[data-roadmap-help]");
    if (roadmapHelp) { openHelp("roadmap"); return; }

    const navigationButton = event.target.closest("[data-view]");
    if (navigationButton) {
      setActiveView(navigationButton.dataset.view);
      return;
    }

    const targetButton = event.target.closest("[data-view-target]");
    if (targetButton) {
      setActiveView(targetButton.dataset.viewTarget);
      return;
    }

    const attributeOpenButton = event.target.closest("[data-open-attribute]");
    if (attributeOpenButton) { openAttributeMissions(attributeOpenButton.dataset.openAttribute); return; }

    const attributeBackButton = event.target.closest("[data-attribute-back]");
    if (attributeBackButton) { closeAttributeMissions(); return; }

    const attributePrevButton = event.target.closest("[data-attribute-prev]");
    if (attributePrevButton) { cycleProfileAttribute(-1); return; }

    const attributeNextButton = event.target.closest("[data-attribute-next]");
    if (attributeNextButton) { cycleProfileAttribute(1); return; }

    const profileSettingsInline = event.target.closest("[data-open-profile-settings]");
    if (profileSettingsInline) { openProfileSettings(); return; }

    const socialBackButton = event.target.closest("[data-social-back]");
    if (socialBackButton) { showSocialPanel("socialHomePanel"); return; }

    const socialGroupButton = event.target.closest("[data-social-group]");
    if (socialGroupButton) { openSocialGroup(socialGroupButton.dataset.socialGroup); return; }

    const socialMemberButton = event.target.closest("[data-social-member]");
    if (socialMemberButton) { openSocialMember(socialMemberButton.dataset.socialMember); return; }

    const socialOpenSearchButton = event.target.closest("[data-social-open-search]");
    if (socialOpenSearchButton) { openSocialSearch(); return; }

    const socialBackSearchButton = event.target.closest("[data-social-back-search]");
    if (socialBackSearchButton) { openSocialSearch(); return; }

    const socialCreateButton = event.target.closest("#socialCreateGroupButton, [data-social-create-direct]");
    if (socialCreateButton) { openSocialCreateGroup(); return; }

    const socialJoinButton = event.target.closest("[data-social-join-group]");
    if (socialJoinButton) { joinSocialGroup(socialJoinButton.dataset.socialJoinGroup); return; }

    const socialLeaveButton = event.target.closest("[data-social-leave-group]");
    if (socialLeaveButton) { leaveSocialGroup(); return; }

    const socialDeleteButton = event.target.closest("[data-social-delete-group]");
    if (socialDeleteButton) { deleteSocialGroup(socialDeleteButton.dataset.socialDeleteGroup); return; }

    const activityButton = event.target.closest("[data-register-activity]");
    if (activityButton) {
      registerActivity(activityButton.dataset.registerActivity);
      return;
    }

    const startRoutineButton = event.target.closest("[data-start-routine]");
    if (startRoutineButton) { startRoutineWorkout(startRoutineButton.dataset.startRoutine); return; }

    const editRoutineButton = event.target.closest("[data-edit-routine]");
    if (editRoutineButton) { openRoutineEditor(false, editRoutineButton.dataset.editRoutine); return; }

    const emptyRoutineCreate = event.target.closest("#emptyRoutineCreate");
    if (emptyRoutineCreate) { openRoutineEditor(false); return; }

    const pickExerciseButton = event.target.closest("[data-pick-exercise]");
    if (pickExerciseButton) { togglePickerExercise(pickExerciseButton.dataset.pickExercise); return; }

    const addSetButton = event.target.closest("[data-add-set]");
    if (addSetButton) { addWorkoutSet(addSetButton.dataset.addSet); return; }

    const completeSetButton = event.target.closest("[data-complete-set]");
    if (completeSetButton) { toggleWorkoutSet(completeSetButton.dataset.exerciseInstance, completeSetButton.dataset.completeSet); return; }

    const timerSetButton = event.target.closest("[data-toggle-set-timer]");
    if (timerSetButton) { toggleExerciseSetTimer(timerSetButton.dataset.exerciseInstance, timerSetButton.dataset.toggleSetTimer); return; }

    const cycleTypeButton = event.target.closest("[data-cycle-set-type]");
    if (cycleTypeButton) { cycleSetType(cycleTypeButton.dataset.exerciseInstance, cycleTypeButton.dataset.cycleSetType); return; }

    const removeWorkoutExerciseButton = event.target.closest("[data-remove-workout-exercise]");
    if (removeWorkoutExerciseButton) { removeWorkoutExercise(removeWorkoutExerciseButton.dataset.removeWorkoutExercise); return; }

    const showExerciseInfoButton = event.target.closest("[data-show-exercise-info]");
    if (showExerciseInfoButton) { showExerciseInfo(showExerciseInfoButton.dataset.showExerciseInfo); return; }

    const removeRoutineExerciseButton = event.target.closest("[data-remove-routine-exercise]");
    if (removeRoutineExerciseButton && routineDraft) { routineDraft.exerciseIds = routineDraft.exerciseIds.filter((id) => id !== removeRoutineExerciseButton.dataset.removeRoutineExercise); renderRoutineDraft(); return; }

    const openFoodButton = event.target.closest("[data-open-food-picker]");
    if (openFoodButton) { ensureDietEditable(()=>openFoodPicker(openFoodButton.dataset.openFoodPicker)); return; }

    const editFoodButton = event.target.closest("[data-edit-food]");
    if (editFoodButton) { openDietItemEditor(editFoodButton.dataset.mealKey, editFoodButton.dataset.editFood); return; }

    const favoriteFoodButton = event.target.closest("[data-favorite-food]");
    if (favoriteFoodButton) { toggleFavoriteFood(favoriteFoodButton.dataset.favoriteFood); return; }

    const portionButton = event.target.closest("[data-food-portion]");
    if (portionButton) {
      const input=document.querySelector(`[data-food-grams="${portionButton.dataset.foodPortion}"]`);
      if (input) { input.value=portionButton.dataset.portionGrams || 100; input.dispatchEvent(new Event("input", {bubbles:true})); }
      return;
    }

    const addFoodButton = event.target.closest("[data-add-food]");
    if (addFoodButton) { addFoodToMeal(addFoodButton.dataset.addFood); return; }

    const removeFoodButton = event.target.closest("[data-remove-food]");
    if (removeFoodButton) { removeFoodFromMeal(removeFoodButton.dataset.mealKey, removeFoodButton.dataset.removeFood); return; }

    const roadmapClaimButton = event.target.closest("[data-claim-roadmap]");
    if (roadmapClaimButton) {
      claimRoadmapChapter(roadmapClaimButton.dataset.roadmapAttribute, roadmapClaimButton.dataset.claimRoadmap);
      return;
    }

    const claimButton = event.target.closest("[data-claim-mission]");
    if (claimButton) {
      claimMission(claimButton.dataset.claimMission);
      return;
    }

    const toastCloseButton = event.target.closest("[data-toast-close]");
    if (toastCloseButton) {
      removeToast(toastCloseButton.closest(".toast"));
    }
  });

  document
    .getElementById("quickTrainingButton")
    ?.addEventListener("click", () => setActiveView("training"));

  document.getElementById("socialSearchToggle")?.addEventListener("click", openSocialSearch);
  document.getElementById("socialSeeGroup")?.addEventListener("click", () => openSocialGroup(socialCurrentGroup?.id));
  document.getElementById("socialGroupSearch")?.addEventListener("input", debouncedSocialSearch);
  document.getElementById("socialCreateGroupForm")?.addEventListener("submit", createSocialGroup);
  document.getElementById("startEmptyWorkout")?.addEventListener("click", startEmptyWorkout);
  document.getElementById("createRoutineButton")?.addEventListener("click", () => openRoutineEditor(false));
  document.getElementById("browseExercisesButton")?.addEventListener("click", () => openExercisePicker("browse"));
  document.getElementById("manageRoutinesButton")?.addEventListener("click", () => showToast("Rotinas", "Use o botão ••• em uma rotina para excluí-la.", "ℹ"));
  document.getElementById("cancelWorkoutButton")?.addEventListener("click", cancelWorkout);
  document.getElementById("finishWorkoutButton")?.addEventListener("click", finishStrengthWorkout);
  document.getElementById("actionConfirmCancel")?.addEventListener("click", () => closeActionConfirmation(false));
  document.getElementById("actionConfirmContinue")?.addEventListener("click", () => closeActionConfirmation(true));
  document.getElementById("closeWorkoutResult")?.addEventListener("click", closeWorkoutResult);
  document.getElementById("closeCardioResult")?.addEventListener("click", closeCardioResult);
  document.getElementById("profileAchievementsToggle")?.addEventListener("click", () => { showAllAchievements = !showAllAchievements; renderAchievements(); });
  document.getElementById("addExerciseButton")?.addEventListener("click", () => openExercisePicker("workout"));
  document.getElementById("saveWorkoutAsRoutine")?.addEventListener("click", () => { const active=state.workouts.active; if(active?.routineId) openRoutineEditor(false, active.routineId); else openRoutineEditor(true); });
  document.getElementById("activeWorkoutName")?.addEventListener("input", (event) => { if (state.workouts.active) { state.workouts.active.name = event.target.value; scheduleSaveGame(); } });
  document.getElementById("workoutExerciseList")?.addEventListener("input", (event) => { if (event.target.matches("[data-set-field]")) updateWorkoutField(event.target); if (event.target.matches("[data-exercise-note]")) { const ex=findWorkoutExercise(event.target.dataset.exerciseNote); if(ex){ex.notes=event.target.value;scheduleSaveGame();} } });
  document.getElementById("closeExercisePicker")?.addEventListener("click", closeExercisePicker);
  document.getElementById("confirmExercisePicker")?.addEventListener("click", confirmExercisePicker);
  document.getElementById("exerciseSearch")?.addEventListener("input", debouncedExerciseSearch);
  document.getElementById("exerciseMuscleFilter")?.addEventListener("change", renderExercisePicker);
  document.getElementById("exerciseEquipmentFilter")?.addEventListener("change", renderExercisePicker);
  document.getElementById("closeRoutineEditor")?.addEventListener("click", closeRoutineEditor);
  document.getElementById("saveRoutineButton")?.addEventListener("click", saveRoutine);
  document.getElementById("deleteRoutineEditorButton")?.addEventListener("click", () => { if(routineDraft?.id){ const id=routineDraft.id; closeRoutineEditor(); deleteRoutine(id); } });
  document.getElementById("routineNameInput")?.addEventListener("input", (event) => { if(routineDraft) routineDraft.name=event.target.value; });
  document.getElementById("addExerciseToRoutineButton")?.addEventListener("click", () => openExercisePicker("routine"));
  document.getElementById("restMinusButton")?.addEventListener("click", () => adjustRestTimer(-15));
  document.getElementById("restPlusButton")?.addEventListener("click", () => adjustRestTimer(30));
  document.getElementById("restSkipButton")?.addEventListener("click", stopRestTimer);

  document
    .getElementById("compoundExercise")
    ?.addEventListener("change", updateActivityPreviews);
  document
    .getElementById("cardioMode")
    ?.addEventListener("change", updateActivityPreviews);
  document
    .getElementById("cardioStartButton")
    ?.addEventListener("click", startCardioTimer);
  document
    .getElementById("cardioPauseButton")
    ?.addEventListener("click", pauseResumeCardioTimer);
  document
    .getElementById("cardioStopButton")
    ?.addEventListener("click", stopCardioTimer);
  document
    .getElementById("cardioConfirmBack")
    ?.addEventListener("click", () => { closeCardioConfirmation(false); setText("cardioTimerState", "Pausado"); });
  document
    .getElementById("cardioCancelConfirm")
    ?.addEventListener("click", () => closeCardioConfirmation(true));
  document
    .getElementById("cardioContinueConfirm")
    ?.addEventListener("click", confirmTimedCardio);
  document.getElementById("cardioHistoryToggle")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const list = document.getElementById("cardioHistoryList");
    if (!list) return;
    const expanded = button.getAttribute("aria-expanded") !== "false";
    button.setAttribute("aria-expanded", String(!expanded));
    list.hidden = expanded;
  });
  document.getElementById("dietPrevDay")?.addEventListener("click", () => changeDietDay(-1));
  document.getElementById("dietNextDay")?.addEventListener("click", () => changeDietDay(1));
  document.getElementById("finishDietDay")?.addEventListener("click", finishDietDay);
  document.getElementById("dietTargetsButton")?.addEventListener("click", openDietSettings);
  document.getElementById("closeDietSettings")?.addEventListener("click", closeDietSettings);
  document.getElementById("dietTargetsForm")?.addEventListener("submit", saveDietTargets);
  document.getElementById("closeDietEdit")?.addEventListener("click", closeDietItemEditor);
  document.getElementById("dietSaveFood")?.addEventListener("click", saveDietItemEdit);
  document.getElementById("dietDeleteFood")?.addEventListener("click", deleteDietItem);
  document.getElementById("closeFoodPicker")?.addEventListener("click", closeFoodPicker);
  document.getElementById("foodSearch")?.addEventListener("input", debouncedFoodSearch);
  document.getElementById("finishOnboarding")?.addEventListener("click", closeOnboarding);
  document.getElementById("skipOnboarding")?.addEventListener("click", closeOnboarding);
  document.getElementById("onboardingOverlay")?.addEventListener("click", (event) => { if (event.target.id === "onboardingOverlay") closeOnboarding(); });

  document.querySelectorAll("[data-help]").forEach((button) => {
    button.addEventListener("click", () => openHelp(button.dataset.help));
  });
  document.getElementById("closeHelpOverlay")?.addEventListener("click", closeHelp);
  document.getElementById("helpOverlay")?.addEventListener("click", (event) => { if (event.target.id === "helpOverlay") closeHelp(); });

  document
    .getElementById("profileSettingsButton")
    ?.addEventListener("click", openProfileSettings);
  document
    .getElementById("closeProfileSettings")
    ?.addEventListener("click", closeProfileSettings);
  document
    .getElementById("profileForm")
    ?.addEventListener("submit", saveProfile);
  document
    .getElementById("historyFilter")
    ?.addEventListener("change", renderFullHistory);
  document
    .getElementById("resetProgressButton")
    ?.addEventListener("click", resetProgress);
  document
    .getElementById("closeCelebrationButton")
    ?.addEventListener("click", closeCelebration);

  document.getElementById("exercisePickerOverlay")?.addEventListener("click", (event) => { if (event.target.id === "exercisePickerOverlay") closeExercisePicker(); });
  document.getElementById("routineEditorOverlay")?.addEventListener("click", (event) => { if (event.target.id === "routineEditorOverlay") closeRoutineEditor(); });
  document.getElementById("actionConfirmOverlay")?.addEventListener("click", (event) => { if (event.target.id === "actionConfirmOverlay") closeActionConfirmation(false); });
  document.getElementById("profileSettingsOverlay")?.addEventListener("click", (event) => { if (event.target.id === "profileSettingsOverlay") closeProfileSettings(); });
  document.getElementById("foodPickerOverlay")?.addEventListener("click", (event) => { if (event.target.id === "foodPickerOverlay") closeFoodPicker(); });
  document.getElementById("dietSettingsOverlay")?.addEventListener("click", (event) => { if (event.target.id === "dietSettingsOverlay") closeDietSettings(); });
  document.getElementById("cardioResultOverlay")?.addEventListener("click", (event) => { if (event.target.id === "cardioResultOverlay") closeCardioResult(); });
  document.getElementById("dietEditOverlay")?.addEventListener("click", (event) => { if (event.target.id === "dietEditOverlay") closeDietItemEditor(); });

  document.getElementById("celebration")?.addEventListener("click", (event) => {
    if (event.target.id === "celebration") {
      closeCelebration();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!document.getElementById("actionConfirmOverlay")?.hidden) closeActionConfirmation(false);
    else if (!document.getElementById("cardioConfirmOverlay")?.hidden) closeCardioConfirmation(false);
    else if (!document.getElementById("cardioResultOverlay")?.hidden) closeCardioResult();
    else if (!document.getElementById("workoutResultOverlay")?.hidden) closeWorkoutResult();
    else if (!document.getElementById("balanceAuditOverlay")?.hidden && typeof closeBalanceAuditPanel === "function") closeBalanceAuditPanel();
    else if (!document.getElementById("onboardingOverlay")?.hidden) closeOnboarding();
    else if (celebrationOpen) closeCelebration();
    else if (!document.getElementById("exercisePickerOverlay")?.hidden) closeExercisePicker();
    else if (!document.getElementById("routineEditorOverlay")?.hidden) closeRoutineEditor();
    else if (!document.getElementById("helpOverlay")?.hidden) closeHelp();
    else if (!document.getElementById("accountActionOverlay")?.hidden && typeof closeAccountAction === "function") closeAccountAction();
    else if (!document.getElementById("historyEditOverlay")?.hidden && typeof closeHistoryEditor === "function") closeHistoryEditor();
    else if (!document.getElementById("profileSettingsOverlay")?.hidden) closeProfileSettings();
    else if (!document.getElementById("dietEditOverlay")?.hidden) closeDietItemEditor();
    else if (!document.getElementById("dietSettingsOverlay")?.hidden) closeDietSettings();
    else if (!document.getElementById("foodPickerOverlay")?.hidden) closeFoodPicker();
  });

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (activeView === "character") {
        drawRadarChart();
      }
    }, 120);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      // Importante: uma atualização recebida de outra aba é somente leitura.
      // Não salvamos novamente aqui, pois isso criaria um ciclo A -> B -> A
      // entre abas e faria a interface disparar notificações sem parar.
      state = migrateState(JSON.parse(event.newValue));
      profileHydrated = false;
      rebuildStatsFromSources();
      normalizeTemporalState();
      ensureMissions();
      refreshMissionProgress();
      syncDerivedState();
      hydrateProfileForm();
      updateUI({ persist: false, evaluate: false });
    } catch (error) {
      console.warn("Não foi possível sincronizar outra aba.", error);
    }
  });
}

function setActiveView(viewName, scrollToTop = true) {
  if (!VIEW_TITLES[viewName]) {
    return;
  }

  activeView = viewName;

  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const isActive = panel.dataset.viewPanel === viewName;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("is-active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  setText("topbarTitle", VIEW_TITLES[viewName]);
  document.title = `${VIEW_TITLES[viewName]} • RPG GYM`;

  if (scrollToTop) {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (viewName === "character") {
    const main = document.getElementById("profileMainPanel");
    const attributePanel = document.getElementById("attributeMissionsPanel");
    if (main && attributePanel) {
      attributePanel.hidden = true;
      main.hidden = false;
    }
  }

  renderActiveView(viewName);
}

function resetProgress() {
  requestConfirmation({title:"Resetar todo o progresso?",message:"Níveis, XP, missões, streak, histórico, rotinas e treinos serão apagados deste navegador. Esta ação não pode ser desfeita.",confirmLabel:"Resetar tudo",cancelLabel:"Cancelar",danger:true,icon:"!",details:[{label:"Nível global",value:state.globalLevel||1},{label:"XP total",value:formatNumber((state.history||[]).reduce((sum,item)=>sum+(Number(item.xp)||0),0))}]},()=>{
    try { localStorage.removeItem(getGameStorageKey()); localStorage.removeItem(getScopedStorageKey(DIET_STORAGE_KEY)); } catch (error) { console.warn("Não foi possível limpar o armazenamento.", error); }
    state = createDefaultState(); profileHydrated = false; celebrationQueue = []; normalizeTemporalState(); ensureMissions(); refreshMissionProgress(); syncDerivedState(); hydrateProfileForm(); saveGame(); updateUI(); setActiveView("social"); showToast("Progresso resetado", "Uma nova jornada foi iniciada.", "↻");
  });
}

function showToast(title, message, icon = "✦", duration = 4_800) {
  const region = document.getElementById("toastRegion");
  if (!region) {
    return;
  }

  const signature = `${title}::${message}`;
  const existing = Array.from(region.querySelectorAll(".toast")).find((item) => item.dataset.signature === signature);
  if (existing) {
    existing.classList.remove("is-leaving");
    existing.animate?.([{ opacity: .72 }, { opacity: 1 }], { duration: 180 });
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.signature = signature;
  toast.setAttribute("role", "status");

  const iconElement = document.createElement("span");
  iconElement.className = "toast-icon";
  iconElement.setAttribute("aria-hidden", "true");
  iconElement.textContent = icon;

  const copy = document.createElement("div");
  copy.className = "toast-copy";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const small = document.createElement("small");
  small.textContent = message;
  copy.append(strong, small);

  const close = document.createElement("button");
  close.className = "toast-close";
  close.type = "button";
  close.dataset.toastClose = "true";
  close.setAttribute("aria-label", "Fechar notificação");
  close.textContent = "×";

  toast.append(iconElement, copy, close);
  region.prepend(toast);

  while (region.children.length > 4) {
    region.lastElementChild?.remove();
  }

  window.setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  if (!(toast instanceof HTMLElement) || !toast.isConnected) {
    return;
  }

  toast.classList.add("is-leaving");
  window.setTimeout(() => toast.remove(), 220);
}

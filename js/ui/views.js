"use strict";

function updateUI(options = {}) {
  const { persist = true, evaluate = true } = options;
  normalizeTemporalState();
  ensureMissions();
  refreshMissionProgress();
  syncDerivedState();
  if (evaluate) evaluateAchievements();

  renderTopbar();
  renderDashboard();
  renderSocial();
  renderTraining();
  renderDiet();
  renderMissions();
  renderCharacter();
  renderProfile();
  renderCardioHistory();
  updateActivityPreviews();
  updateTimeLabels();
  if (persist) saveGame();
}

function renderTopbar() {
  const now = new Date();
  const dateText = capitalizeFirst(fullDateFormatter.format(now));
  const initials = getInitials(state.player.name);
  const activeBuffs = getActiveBuffs();
  const buffPill = document.getElementById("activeBuffPill");

  setText("topbarDate", dateText);
  setText("topbarTitle", VIEW_TITLES[activeView] || VIEW_TITLES.social);
  setText("miniAvatar", initials);

  if (buffPill) {
    if (activeBuffs.length) {
      const totalBonus = activeBuffs.reduce(
        (sum, buff) => sum + Math.max(0, Number(buff.multiplier) - 1),
        0
      );
      setText(
        "activeBuffText",
        `+${Math.round(totalBonus * 100)}% XP ativo`
      );
      buffPill.hidden = false;
    } else {
      buffPill.hidden = true;
    }
  }
}

function renderDashboard() {
  const journeyPercent = calculateJourneyPercent();
  const todayEntries = getEntriesForDate(localDateKey());
  const unlockedClassCount = getUnlockedClassCount();

  setText("dashboardPlayerName", state.player.name || "Jogador");
  setText("globalLevelValue", state.player.globalLevel);
  setText("globalJourneyPercent", `${journeyPercent.toFixed(1).replace(".", ",")}%`);
  setText("dashboardStreak", formatDays(state.streak.current));
  setText("dashboardTodayActivities", todayEntries.length);
  setText("dashboardTotalXp", `${formatNumber(state.stats.totalXp)} XP`);
  setText("dashboardUnlockedClasses", `${unlockedClassCount}/6`);

  const motivation = getMotivationMessage();
  setText("dashboardMotivation", motivation);
  setText(
    "globalLevelDescription",
    state.player.globalLevel >= MAX_LEVEL
      ? "Nível global máximo alcançado. Sua jornada continua nos hábitos."
      : `Título atual: ${state.player.title}. Na v0.3.7, o Global usa 5 rotas ativas; Carisma entra quando o Social estiver completo.`
  );

  setProgress("globalProgressTrack", "globalProgressBar", journeyPercent);

  const attributesContainer = document.getElementById("dashboardAttributes");
  if (attributesContainer) {
    attributesContainer.innerHTML = Object.keys(ATTRIBUTES)
      .map((attributeKey) => renderCompactAttributeCard(attributeKey))
      .join("");
  }

  const dailyMissions = document.getElementById("dashboardDailyMissions");
  if (dailyMissions) {
    dailyMissions.innerHTML = state.missions.daily
      .map((mission) => missionCardMarkup(mission, true))
      .join("");
  }

  renderWeeklySummary();
  renderDashboardClasses();
  renderHistoryList(
    "dashboardRecentHistory",
    state.history,
    6,
    "Nenhuma atividade registrada ainda."
  );
}

function renderCompactAttributeCard(attributeKey) {
  const definition = ATTRIBUTES[attributeKey];
  const attribute = state.attributes[attributeKey];
  const requiredXp = calculateRequiredXP(attribute.level);
  const progress = attribute.level >= MAX_LEVEL
    ? 100
    : (attribute.xp / requiredXp) * 100;
  const classInfo = getClassInfo(attributeKey);
  const xpLabel = attribute.level >= MAX_LEVEL
    ? "Nível máximo"
    : `${formatNumber(attribute.xp)}/${formatNumber(requiredXp)} XP`;

  return `
    <article class="attribute-card" style="--attribute-color: ${definition.cssColor};">
      <div class="attribute-card-head">
        <span class="attribute-card-icon" aria-hidden="true">${definition.icon}</span>
        <div class="attribute-card-title">
          <strong>${definition.name}</strong>
          <small>${escapeHtml(classInfo.shortLabel)}</small>
        </div>
        <span class="attribute-level">Nv. ${attribute.level}</span>
      </div>
      <div class="attribute-progress-row">
        <div class="progress-track" role="progressbar" aria-label="XP de ${definition.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}">
          <span style="width: ${clamp(progress, 0, 100)}%;"></span>
        </div>
        <small>${xpLabel}</small>
      </div>
    </article>
  `;
}

function renderWeeklySummary() {
  const days = getCurrentWeekDays();
  const todayKey = localDateKey();
  const dayStats = days.map((date) => {
    const dateKey = localDateKey(date);
    const entries = getEntriesForDate(dateKey);
    const xp = entries.reduce((sum, entry) => sum + (Number(entry.xp) || 0), 0);
    return { date, dateKey, entries, xp };
  });

  const maxXp = Math.max(0, ...dayStats.map((day) => day.xp));
  const totalXp = dayStats.reduce((sum, day) => sum + day.xp, 0);
  const activeDays = dayStats.filter((day) => day.entries.length > 0).length;
  const weeklyEntries = dayStats.flatMap((day) => day.entries);
  const trainingCount = weeklyEntries.filter(
    (entry) => ACTIVITIES[entry.activityId]?.category === "training"
  ).length;
  const bestDay = dayStats.reduce(
    (best, day) => (day.xp > best.xp ? day : best),
    dayStats[0]
  );

  setText("weeklyXpTotal", `${formatNumber(totalXp)} XP`);

  const chart = document.getElementById("weekChart");
  if (chart) {
    chart.innerHTML = dayStats
      .map((day) => {
        const height = maxXp > 0 ? 8 + (day.xp / maxXp) * 82 : 5;
        const dayLabel = new Intl.DateTimeFormat("pt-BR", {
          weekday: "short"
        })
          .format(day.date)
          .replace(".", "");

        return `
          <div class="day-column ${day.dateKey === todayKey ? "is-today" : ""}" title="${capitalizeFirst(dayLabel)}: ${formatNumber(day.xp)} XP">
            <div class="day-bar-wrap">
              <span class="day-bar" data-xp="${day.xp ? formatNumber(day.xp) : "0"}" style="height: ${height}%;"></span>
            </div>
            <small>${escapeHtml(dayLabel)}</small>
          </div>
        `;
      })
      .join("");
  }

  const insights = document.getElementById("weekInsights");
  if (insights) {
    const bestDayLabel = bestDay?.xp
      ? capitalizeFirst(
          new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(bestDay.date)
        )
      : "—";

    insights.innerHTML = `
      <div class="insight-card"><small>Dias ativos</small><strong>${activeDays}/7</strong></div>
      <div class="insight-card"><small>Treinos registrados</small><strong>${trainingCount}</strong></div>
      <div class="insight-card"><small>Melhor dia</small><strong>${escapeHtml(bestDayLabel)}</strong></div>
    `;
  }
}

function renderDashboardClasses() {
  const container = document.getElementById("dashboardClasses");
  if (!container) {
    return;
  }

  container.innerHTML = Object.keys(ATTRIBUTES)
    .map((attributeKey) => {
      const definition = ATTRIBUTES[attributeKey];
      const attribute = state.attributes[attributeKey];
      const info = getClassInfo(attributeKey);
      const locked = !isClassUnlocked(attributeKey);

      return `
        <div class="class-row ${locked ? "is-locked" : ""}" style="--attribute-color: ${definition.cssColor};">
          <span class="class-symbol" aria-hidden="true">${locked ? "🔒" : definition.icon}</span>
          <div>
            <strong>${definition.className}</strong>
            <small>${escapeHtml(info.bonusDescription)}</small>
          </div>
          <span class="class-stage">${escapeHtml(info.stageLabel)}</span>
        </div>
      `;
    })
    .join("");
}

function renderTraining() {
  setText("trainingStreak", formatDays(state.streak.current));
  renderStrengthTraining();

  const eligibility = getWeeklyStreakEligibility();
  const eligibilityBox = document.getElementById("weeklyStreakEligibility");
  const weeklyButton = document.getElementById("weeklyStreakButton");

  if (eligibilityBox) {
    eligibilityBox.textContent = eligibility.message;
    eligibilityBox.classList.toggle("is-ready", eligibility.eligible);
  }

  if (weeklyButton) {
    weeklyButton.disabled = !eligibility.eligible;
    weeklyButton.textContent = eligibility.eligible ? "Resgatar XP" : "Bloqueado";
  }

  renderBonusBreakdown();
  renderHistoryList(
    "trainingRecentHistory",
    getEntriesForDate(localDateKey()),
    5,
    "Registre sua primeira atividade de hoje."
  );
}

function renderBonusBreakdown() {
  const container = document.getElementById("bonusBreakdown");
  if (!container) {
    return;
  }

  const activeBuffs = getActiveBuffs();
  const levelBonuses = Object.keys(ATTRIBUTES).map((attributeKey) => ({
    label: ATTRIBUTES[attributeKey].name,
    value: Math.min(50, state.attributes[attributeKey].level)
  }));
  const highest = levelBonuses.reduce((best, current) =>
    current.value > best.value ? current : best
  );
  const unlockedClasses = Object.keys(ATTRIBUTES).filter(
    (attributeKey) => state.attributes[attributeKey].level >= 10
  );

  const rows = [
    `<div class="bonus-row"><span>Escala por nível</span><strong>até +${highest.value}%</strong></div>`,
    `<div class="bonus-row"><span>Classes desbloqueadas</span><strong>${unlockedClasses.length}/6</strong></div>`
  ];

  activeBuffs.forEach((buff) => {
    rows.push(
      `<div class="bonus-row"><span>${escapeHtml(buff.source || "Buff semanal")}</span><strong>+${Math.round((buff.multiplier - 1) * 100)}%</strong></div>`
    );
  });

  if (!activeBuffs.length) {
    rows.push(
      `<div class="bonus-row"><span>Buff temporário</span><strong>Nenhum</strong></div>`
    );
  }

  rows.push(
    `<div class="bonus-row"><span>Limite por ação</span><strong>+50%</strong></div>`
  );
  container.innerHTML = rows.join("");
}

function updateActivityPreviews() {
  const type = document.getElementById("cardioMode")?.value || "treadmill";
  const config = CARDIO_TYPES[type] || CARDIO_TYPES.treadmill;
  const affinities = config.affinities || { primary: config.attribute || "constitution" };
  const attributeNames = [ATTRIBUTES[affinities.primary]?.name || "Constituição"];
  if (affinities.secondary?.attribute) attributeNames.push(ATTRIBUTES[affinities.secondary.attribute]?.name);
  setText("cardioAttributePreview", attributeNames.filter(Boolean).join(" + "));
  setText("cardioLiveType", config.label);
  setText("cardioRequiredPreview", config.requiredLabel);
  setText("cardioTypeHint", config.hint);
  const liveSecondary = document.getElementById("cardioLiveDistance");
  if (liveSecondary) liveSecondary.textContent = config.requiredLabel.split(" • ")[0] || "Dados ao finalizar";

  Object.keys(ACTIVITIES).forEach((activityId) => {
    const preview = document.getElementById(`preview-${activityId}`);
    if (!preview) {
      return;
    }

    try {
      const calculation = calculateActivityXp(
        activityId,
        readActivityOptions(activityId)
      );
      preview.textContent = `${formatNumber(calculation.xp)} XP`;
    } catch (error) {
      preview.textContent = `${ACTIVITIES[activityId].baseXp} XP`;
    }
  });
}

function renderMissions() {
  const dailyList = document.getElementById("dailyMissionList");
  const weeklyList = document.getElementById("weeklyMissionList");
  const completedCount = [...state.missions.daily, ...state.missions.weekly].filter(
    (mission) => mission.status === "completed" || mission.status === "claimed"
  ).length;

  setText("missionCompletedCount", completedCount);

  if (dailyList) {
    dailyList.innerHTML = state.missions.daily
      .map((mission) => missionCardMarkup(mission, false))
      .join("");
  }

  if (weeklyList) {
    weeklyList.innerHTML = state.missions.weekly
      .map((mission) => missionCardMarkup(mission, false))
      .join("");
  }
}

function missionCardMarkup(mission, compact) {
  const progressPercent = mission.target > 0
    ? (mission.progress / mission.target) * 100
    : 0;
  const reward = missionRewardLabel(mission.reward);
  const completed = mission.status === "completed";
  const claimed = mission.status === "claimed";
  const statusText = claimed
    ? "Recompensa resgatada"
    : completed
      ? "Pronta para resgate"
      : "Em andamento";
  const buttonLabel = claimed
    ? "Resgatada"
    : completed
      ? "Resgatar"
      : "Em progresso";

  return `
    <article class="mission-card ${completed ? "is-completed" : ""} ${claimed ? "is-claimed" : ""}">
      <div class="mission-head">
        <div>
          <h3>${escapeHtml(mission.name)}</h3>
          <p>${escapeHtml(mission.description)}</p>
        </div>
        <span class="mission-reward">${escapeHtml(reward)}</span>
      </div>
      <div class="mission-progress">
        <div class="progress-track" role="progressbar" aria-label="Progresso da missão ${escapeHtml(mission.name)}" aria-valuemin="0" aria-valuemax="${mission.target}" aria-valuenow="${mission.progress}">
          <span style="width: ${clamp(progressPercent, 0, 100)}%;"></span>
        </div>
        <strong>${mission.progress}/${mission.target}</strong>
      </div>
      <div class="mission-action-row">
        <span class="mission-status ${completed ? "complete" : ""}">${statusText}</span>
        <button class="claim-button" type="button" data-claim-mission="${escapeHtml(mission.id)}" ${completed ? "" : "disabled"}>${buttonLabel}</button>
      </div>
    </article>
  `;
}

function missionRewardLabel(reward) {
  if (reward.type === "xp") {
    return `+${formatNumber(reward.amount)} XP • ${ATTRIBUTES[reward.attribute].name}`;
  }
  if (reward.type === "buff") {
    return `${formatMultiplier(reward.multiplier)} XP • ${reward.durationHours}h`;
  }
  return "Recompensa";
}

function renderCharacter() {
  const initials = getInitials(state.player.name);
  setText("characterAvatar", initials);
  setText("profilePlayerName", state.player.name || "Jogador");
  setText("characterHeading", "Meu Perfil");
  setText("characterTitle", state.player.title || "Novato");

  const weight = state.profile?.weight ? `${String(state.profile.weight).replace(".", ",")} kg` : "—";
  const heightValue = Number(state.profile?.height || 0);
  const height = heightValue > 0 ? `${(heightValue / 100).toFixed(2).replace(".", ",")} m` : "—";
  setText("profileWeightSummary", weight);
  setText("profileHeightSummary", height);
  setText("profileClassSummary", getProfileClassSummary());

  renderAchievements();

  const attributeList = document.getElementById("characterAttributeList");
  if (attributeList) {
    attributeList.innerHTML = PROFILE_ATTRIBUTE_ORDER
      .map((attributeKey) => renderCharacterAttributeCard(attributeKey))
      .join("");
  }

  if (activeView === "character") {
    renderAttributeMissionPanel();
    window.requestAnimationFrame(drawRadarChart);
  }
}

function renderRoadmapChapter(attributeKey, chapter) {
  const chapterState = getRoadmapChapterState(attributeKey, chapter);
  const completedCount = chapterState.objectives.filter((objective) => objective.complete).length;
  const allCount = chapterState.objectives.length;
  const status = chapterState.claimed ? "Concluído" : chapterState.ready ? "Pronto" : chapterState.levelReady ? `${completedCount}/${allCount} objetivos` : `Requer Nv. ${chapter.unlockLevel}`;
  return `
    <article class="roadmap-chapter ${chapterState.claimed ? "is-claimed" : ""} ${chapterState.ready ? "is-ready" : ""}">
      <div class="roadmap-chapter-head">
        <div><small>CAPÍTULO • NV. ${chapter.unlockLevel}</small><strong>${escapeHtml(chapter.title)}</strong></div>
        <span>${escapeHtml(status)}</span>
      </div>
      <div class="roadmap-objectives">
        ${chapterState.objectives.map((objective) => {
          const shown = Math.min(objective.value, objective.target);
          const percent = clamp((shown / objective.target) * 100, 0, 100);
          return `<div class="roadmap-objective ${objective.complete ? "is-complete" : ""}">
            <span class="roadmap-check">${objective.complete ? "✓" : ""}</span>
            <div><strong>${escapeHtml(objective.label)}</strong><small>${formatNumber(shown)} / ${formatNumber(objective.target)}</small><i><b style="width:${percent}%"></b></i></div>
          </div>`;
        }).join("")}
      </div>
      <div class="roadmap-reward"><span>Recompensa</span><strong>${escapeHtml(chapter.rewardLabel)}</strong></div>
      ${chapterState.claimed
        ? `<button type="button" disabled>Concluído ✓</button>`
        : `<button type="button" data-claim-roadmap="${chapter.id}" data-roadmap-attribute="${attributeKey}" ${chapterState.ready ? "" : "disabled"}>${chapterState.ready ? "Desbloquear" : "Em progresso"}</button>`}
    </article>`;
}

function getProfileClassSummary() {
  const unlocked = Object.keys(ATTRIBUTES)
    .map((key) => ({ key, level: state.attributes[key]?.level || 1 }))
    .filter((item) => isClassUnlocked(item.key))
    .sort((a, b) => b.level - a.level);
  if (!unlocked.length) return "Novato";
  return ATTRIBUTES[unlocked[0].key].className;
}

function renderAchievementCard(achievement) {
  const unlocked = achievementUnlocked(achievement.id);
  return `<article class="achievement-card ${unlocked ? "is-unlocked" : "is-locked"}">
    <span class="achievement-badge" aria-hidden="true">${unlocked ? achievement.icon : "·"}</span>
    <div><small>${escapeHtml(achievement.group)}</small><strong>${escapeHtml(achievement.title)}</strong><p>${escapeHtml(achievement.description)}</p><em>${unlocked ? escapeHtml(achievement.reward) : "Bloqueada"}</em></div>
  </article>`;
}

function renderAchievements() {
  const container = document.getElementById("profileAchievementsList");
  if (!container) return;
  const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter((item) => achievementUnlocked(item.id)).length;
  setText("profileAchievementsCount", `${unlockedCount}/${ACHIEVEMENT_DEFINITIONS.length}`);
  container.innerHTML = ACHIEVEMENT_DEFINITIONS.map(renderAchievementCard).join("");
}

function renderCharacterAttributeCard(attributeKey) {
  const definition = ATTRIBUTES[attributeKey];
  const attribute = state.attributes[attributeKey];
  const requiredXp = calculateRequiredXP(attribute.level);
  const progress = attribute.level >= MAX_LEVEL ? 100 : (attribute.xp / requiredXp) * 100;
  const xpText = attribute.level >= MAX_LEVEL
    ? "Nível máximo"
    : `${formatNumber(attribute.xp)} / ${formatNumber(requiredXp)} XP`;

  return `
    <button class="profile-attribute-button" type="button" data-open-attribute="${attributeKey}" style="--attribute-color:${definition.chartColor}">
      <span class="profile-attribute-copy">
        <strong>${escapeHtml(definition.name)}</strong>
        <small>Nível ${attribute.level}</small>
        <span class="profile-attribute-progress" role="progressbar" aria-label="XP de ${escapeHtml(definition.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><i style="width:${clamp(progress, 0, 100)}%"></i></span>
        <em>${xpText}</em>
      </span>
      <span class="profile-attribute-chevron" aria-hidden="true">›</span>
    </button>
  `;
}

function openAttributeMissions(attributeKey) {
  if (!ATTRIBUTES[attributeKey]) return;
  activeProfileAttribute = attributeKey;
  const main = document.getElementById("profileMainPanel");
  const panel = document.getElementById("attributeMissionsPanel");
  if (main) main.hidden = true;
  if (panel) panel.hidden = false;
  renderAttributeMissionPanel();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeAttributeMissions() {
  const main = document.getElementById("profileMainPanel");
  const panel = document.getElementById("attributeMissionsPanel");
  if (panel) panel.hidden = true;
  if (main) main.hidden = false;
  window.requestAnimationFrame(drawRadarChart);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cycleProfileAttribute(direction) {
  const keys = PROFILE_ATTRIBUTE_ORDER;
  const current = Math.max(0, keys.indexOf(activeProfileAttribute));
  activeProfileAttribute = keys[(current + direction + keys.length) % keys.length];
  renderAttributeMissionPanel();
}

function missionBelongsToAttribute(mission, attributeKey) {
  if (mission?.reward?.attribute === attributeKey) return true;
  const metric = mission?.metric || {};
  const activityIds = [];
  if (metric.activityId) activityIds.push(metric.activityId);
  if (Array.isArray(metric.activityIds)) activityIds.push(...metric.activityIds);
  if (activityIds.some((id) => ACTIVITIES[id]?.attribute === attributeKey)) return true;
  if (attributeKey === "determination" && ["activeDays", "anyActivityCount", "categoryCount"].includes(metric.type)) return true;
  return false;
}

function renderAttributeMissionPanel() {
  const panel = document.getElementById("attributeMissionsPanel");
  if (!panel || panel.hidden) return;
  const key = activeProfileAttribute;
  const definition = ATTRIBUTES[key];
  const attribute = state.attributes[key];
  if (!definition || !attribute) return;

  const info = getClassInfo(key);
  const requiredXp = calculateRequiredXP(attribute.level);
  const progress = attribute.level >= MAX_LEVEL ? 100 : (attribute.xp / requiredXp) * 100;
  setText("attributeMissionTitle", definition.name);
  setText("attributeClassMark", definition.name.slice(0, 1));
  setText("attributeClassName", definition.className);
  setText("attributeClassStage", isClassUnlocked(key) ? info.stageLabel : (attribute.level >= 10 ? "Provação do roadmap pendente" : "Nível 10 + roadmap"));
  setText("attributeMissionLevel", `Nível ${attribute.level}`);
  setText("attributeMissionXp", attribute.level >= MAX_LEVEL ? "Nível máximo" : `${formatNumber(attribute.xp)} / ${formatNumber(requiredXp)} XP`);
  const xpBar = document.getElementById("attributeMissionXpBar");
  if (xpBar) xpBar.style.width = `${clamp(progress, 0, 100)}%`;

  const chapters = ROADMAP_DEFINITIONS[key] || [];
  const roadmapList = document.getElementById("attributeRoadmapList");
  if (roadmapList) {
    const firstOpenIndex = chapters.findIndex((chapter) => !getRoadmapChapterState(key, chapter).claimed);
    roadmapList.innerHTML = chapters.map((chapter, index) => {
      const markup = renderRoadmapChapter(key, chapter);
      return markup.replace('class="roadmap-chapter ', `class="roadmap-chapter ${index === firstOpenIndex ? "is-current " : ""}`);
    }).join("");
  }
  const roadmapDone = chapters.filter((chapter) => getRoadmapChapterState(key, chapter).claimed).length;
  setText("attributeRoadmapCount", `${roadmapDone}/${chapters.length} capítulos`);

  const missions = [...state.missions.daily, ...state.missions.weekly].filter((mission) => missionBelongsToAttribute(mission, key));
  setText("attributeMissionCount", `${missions.length} ${missions.length === 1 ? "rotativa" : "rotativas"}`);
  const list = document.getElementById("attributeMissionList");
  if (list) {
    list.innerHTML = missions.length
      ? missions.map((mission) => missionCardMarkup(mission, false)).join("")
      : `<div class="attribute-mission-empty"><strong>Nenhuma missão rotativa ativa</strong><span>O roadmap permanente continua disponível acima.</span></div>`;
  }
}

function renderClassCollectionItem(attributeKey) {
  const definition = ATTRIBUTES[attributeKey];
  const attribute = state.attributes[attributeKey];
  const info = getClassInfo(attributeKey);
  const locked = !isClassUnlocked(attributeKey);

  return `
    <div class="class-collection-item ${locked ? "is-locked" : ""}" style="--attribute-color: ${definition.cssColor};">
      <span class="class-symbol" aria-hidden="true">${locked ? "🔒" : definition.icon}</span>
      <div>
        <strong>${definition.className}</strong>
        <small>${escapeHtml(info.bonusDescription)}</small>
      </div>
      <span class="class-stage">${escapeHtml(info.stageLabel)}</span>
    </div>
  `;
}

function drawRadarChart() {
  const canvas = document.getElementById("radarChart");
  if (!canvas || activeView !== "character" || document.getElementById("profileMainPanel")?.hidden) return;

  const rect = canvas.getBoundingClientRect();
  const cssSize = Math.max(210, Math.min(260, Math.floor(rect.width || 250)));
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(cssSize * ratio);
  canvas.height = Math.round(cssSize * ratio);
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;

  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssSize, cssSize);

  const center = cssSize / 2;
  const radius = cssSize * 0.31;
  const labelRadius = cssSize * 0.43;
  const keys = ["agility", "constitution", "intelligence", "charisma", "determination", "force"];
  const angleStep = (Math.PI * 2) / keys.length;
  const startAngle = -Math.PI / 2;

  context.lineJoin = "round";
  context.lineCap = "round";

  for (let ring = 1; ring <= 5; ring += 1) {
    const ringRadius = radius * (ring / 5);
    context.beginPath();
    keys.forEach((_, index) => {
      const angle = startAngle + angleStep * index;
      const x = center + Math.cos(angle) * ringRadius;
      const y = center + Math.sin(angle) * ringRadius;
      index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
    });
    context.closePath();
    context.strokeStyle = ring === 5 ? "rgba(159,132,255,.5)" : "rgba(159,132,255,.18)";
    context.lineWidth = 1;
    context.stroke();
  }

  keys.forEach((_, index) => {
    const angle = startAngle + angleStep * index;
    context.beginPath();
    context.moveTo(center, center);
    context.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    context.strokeStyle = "rgba(159,132,255,.17)";
    context.stroke();
  });

  context.beginPath();
  keys.forEach((attributeKey, index) => {
    const level = clamp(state.attributes[attributeKey]?.level || 1, 1, MAX_LEVEL);
    const normalized = 0.12 + 0.88 * ((level - 1) / (MAX_LEVEL - 1));
    const angle = startAngle + angleStep * index;
    const x = center + Math.cos(angle) * radius * normalized;
    const y = center + Math.sin(angle) * radius * normalized;
    index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = "rgba(128,88,255,.32)";
  context.fill();
  context.strokeStyle = "#9f83ff";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#c8ccd5";
  context.font = `600 ${Math.max(8, Math.round(cssSize * 0.035))}px system-ui, sans-serif`;
  context.textBaseline = "middle";
  keys.forEach((attributeKey, index) => {
    const angle = startAngle + angleStep * index;
    const x = center + Math.cos(angle) * labelRadius;
    const y = center + Math.sin(angle) * labelRadius;
    const cos = Math.cos(angle);
    context.textAlign = Math.abs(cos) < 0.25 ? "center" : cos > 0 ? "left" : "right";
    context.fillText(ATTRIBUTES[attributeKey].name, x, y);
  });
}

function openProfileSettings() {
  const overlay = document.getElementById("profileSettingsOverlay");
  if (!overlay) return;
  hydrateProfileForm();
  renderProfile();
  overlay.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => document.getElementById("profileName")?.focus(), 20);
}

function closeProfileSettings() {
  const overlay = document.getElementById("profileSettingsOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove("modal-open");
  document.getElementById("profileSettingsButton")?.focus({ preventScroll: true });
}

function renderProfile() {
  setText("profileBestStreak", formatDays(state.streak.best));
  renderFullHistory();
}

function hydrateProfileForm() {
  const form = document.getElementById("profileForm");
  if (!form || profileHydrated) {
    return;
  }

  setInputValue("profileName", state.player.name || "Jogador");
  setInputValue("profileWeight", state.profile.weight ?? "");
  setInputValue("profileHeight", state.profile.height ?? "");
  setInputValue("profileGoal", state.profile.goal || "Criar consistência");
  setInputValue(
    "profileFrequency",
    state.profile.frequency || "4 vezes por semana"
  );
  profileHydrated = true;
}

function saveProfile(event) {
  event.preventDefault();

  const name = (document.getElementById("profileName")?.value || "").trim();
  const weight = document.getElementById("profileWeight")?.value || "";
  const height = document.getElementById("profileHeight")?.value || "";
  const goal = document.getElementById("profileGoal")?.value || "Criar consistência";
  const frequency =
    document.getElementById("profileFrequency")?.value || "4 vezes por semana";

  if (!name) {
    showToast("Nome obrigatório", "Informe o nome do jogador.", "⚠");
    document.getElementById("profileName")?.focus();
    return;
  }

  state.player.name = name.slice(0, 40);
  state.profile.weight = weight;
  state.profile.height = height;
  state.profile.goal = goal;
  state.profile.frequency = frequency;
  saveGame();
  updateUI();
  showToast("Perfil atualizado", "Suas alterações foram salvas localmente.", "✓");
}

function renderCardioHistory() {
  const container = document.getElementById("cardioHistoryList");
  if (!container) return;

  const entries = (state.history || [])
    .filter((entry) => entry.activityId === "cardio" || entry.cardioData)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 12);

  if (!entries.length) {
    container.innerHTML = `<div class="cardio-history-empty"><strong>Nenhum cardio registrado</strong><span>Seus registros aparecerão aqui depois da primeira sessão.</span></div>`;
    return;
  }

  container.innerHTML = entries.map((entry) => {
    const date = new Date(entry.timestamp);
    const data = entry.cardioData || {};
    const type = CARDIO_TYPES[data.type] || null;
    const label = entry.activityName || type?.label || "Cardio";
    const duration = Number(data.minutes) > 0 ? formatCardioDuration(Number(data.minutes) * 60000) : "";
    const metrics = [];
    const v = data.values || data;
    if (Number(v.distanceKm) > 0) metrics.push(`${Number(v.distanceKm).toLocaleString("pt-BR", {maximumFractionDigits:2})} km`);
    if (Number(v.distanceMeters) > 0) metrics.push(`${Math.round(Number(v.distanceMeters))} m`);
    if (Number(v.speedKmh) > 0) metrics.push(`${Number(v.speedKmh).toLocaleString("pt-BR", {maximumFractionDigits:1})} km/h`);
    if (Number(v.floors) > 0) metrics.push(`${Math.round(Number(v.floors))} andares`);
    if (Number(v.jumps) > 0) metrics.push(`${Math.round(Number(v.jumps))} saltos`);
    const meta = [duration, ...metrics.slice(0,2), formatHistoryDate(date, entry.dateKey)].filter(Boolean).join(" • ");
    const awards = Array.isArray(entry.xpAwards) && entry.xpAwards.length ? entry.xpAwards : [{ attribute: entry.attribute, xp: entry.xp || 0 }];
    const xpText = awards.map((award) => `${ATTRIBUTES[award.attribute]?.name || "XP"} +${formatNumber(award.xp || 0)}`).join(" • ");
    return `<article class="cardio-history-item"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(meta)}</small></div><span>${escapeHtml(xpText)}</span></article>`;
  }).join("");
}

function renderFullHistory() {
  const filter = document.getElementById("historyFilter")?.value || "all";
  const entries = filter === "all"
    ? state.history
    : state.history.filter((entry) => entry.attribute === filter);

  renderHistoryList(
    "fullHistoryList",
    entries,
    250,
    filter === "all"
      ? "Seu histórico aparecerá aqui após o primeiro registro."
      : "Nenhuma atividade encontrada para este atributo."
  );
}

function renderHistoryList(containerId, entries, limit, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const sortedEntries = [...entries]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);

  if (!sortedEntries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div>
          <span aria-hidden="true">◇</span>
          <strong>Nenhum registro</strong>
          <p>${escapeHtml(emptyMessage)}</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = sortedEntries
    .map((entry) => historyEntryMarkup(entry))
    .join("");
}

function historyEntryMarkup(entry) {
  const definition = ATTRIBUTES[entry.attribute] || ATTRIBUTES.determination;
  const date = new Date(entry.timestamp);
  const dateText = formatHistoryDate(date, entry.dateKey);
  const details = [definition.name, entry.details, dateText]
    .filter(Boolean)
    .join(" • ");

  return `
    <article class="history-entry" style="--attribute-color: ${definition.cssColor};">
      <span class="history-icon" aria-hidden="true">${definition.icon}</span>
      <div class="history-copy">
        <strong>${escapeHtml(entry.activityName || "Atividade")}</strong>
        <small>${escapeHtml(details)}</small>
      </div>
      <span class="history-xp">+${formatNumber(entry.xp || 0)} XP</span>
    </article>
  `;
}

function getClassInfo(attributeKey) {
  const definition = ATTRIBUTES[attributeKey];
  const attribute = state.attributes[attributeKey];
  const unlocked = isClassUnlocked(attributeKey);
  if (!unlocked) {
    const chapter = ROADMAP_DEFINITIONS[attributeKey]?.find((item) => item.unlockLevel === 10);
    const chapterState = chapter ? getRoadmapChapterState(attributeKey, chapter) : null;
    return {
      stage: 0,
      stageLabel: attribute.level >= 10 ? "Provação pendente" : `Nv. ${attribute.level}/10`,
      shortLabel: `${definition.className} bloqueado`,
      bonusDescription: attribute.level >= 10
        ? `Conclua o roadmap de ${definition.name} para desbloquear`
        : `Alcance o nível 10 e conclua a provação`,
      roadmapReady: Boolean(chapterState?.ready)
    };
  }
  const claimed = state.roadmaps?.[attributeKey]?.claimedChapters || [];
  const claimedClassLevels = [10, 20, 30, 40, 50].filter((level) => claimed.includes(`${attributeKey}_${level}`));
  const highestClaimedClassLevel = claimedClassLevels.length ? Math.max(...claimedClassLevels) : 10;
  const stage = Math.max(1, Math.min(5, highestClaimedClassLevel / 10));
  const mastered = claimed.includes(`${attributeKey}_50`);
  const bonus = mastered ? definition.masterBonus : definition.unlockBonus;
  const stageLabel = mastered ? "Mestre" : romanNumeral(stage);
  const shortLabel = mastered ? `${definition.className} mestre` : `${definition.className} ${romanNumeral(stage)}`;
  return { stage, stageLabel, shortLabel, bonusDescription: `+${Math.round(bonus * 100)}% ${definition.bonusLabel}` };
}

function getUnlockedClassCount() {
  return Object.keys(ATTRIBUTES).filter((attributeKey) => isClassUnlocked(attributeKey)).length;
}

function getCurrentGlobalTitle() {
  let currentTitle = GLOBAL_TITLES[0].title;

  GLOBAL_TITLES.forEach((entry) => {
    if (state.player.globalLevel >= entry.level) {
      currentTitle = entry.title;
    }
  });

  return currentTitle;
}

function getUnlockedTitles() {
  const titles = GLOBAL_TITLES.filter(
    (entry) => state.player.globalLevel >= entry.level
  ).map((entry) => entry.title);

  Object.keys(ATTRIBUTES).forEach((attributeKey) => {
    const definition = ATTRIBUTES[attributeKey];
    const level = state.attributes[attributeKey].level;

    if (level >= 5) titles.push(`Iniciado em ${definition.name}`);
    if (level >= 25) titles.push(`Especialista em ${definition.name}`);
    if (level >= 45) titles.push(`Lenda de ${definition.name}`);
    if (level >= 50) titles.push(definition.masterTitle);
  });

  const achievementTitles = {
    ten_workouts: "Ritmo de Ferro", cardio_120: "Fôlego", diet_five: "Planejamento",
    missions_10: "Caçador de Missões", all_classes: "Mestre das Seis Trilhas"
  };
  Object.entries(achievementTitles).forEach(([id, title]) => { if (achievementUnlocked(id)) titles.push(title); });
  return [...new Set(titles)];
}

function getMotivationMessage() {
  const todayCount = getEntriesForDate(localDateKey()).length;
  const streak = state.streak.current;

  if (state.player.globalLevel >= MAX_LEVEL) {
    return "O nível máximo foi alcançado. Agora sua maior conquista é manter o estilo de vida.";
  }
  if (todayCount === 0) {
    return "Sua próxima ação no mundo real pode ser o XP que faltava para evoluir.";
  }
  if (streak >= 7) {
    return `Sequência de ${streak} dias ativa. A consistência já virou parte da sua classe.`;
  }
  if (todayCount >= 3) {
    return "Dia produtivo: seus atributos já receberam várias melhorias hoje.";
  }
  return "Cada atividade registrada fortalece seu personagem e sua rotina.";
}

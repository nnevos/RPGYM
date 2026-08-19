"use strict";

function init() {
  state = loadGame();
  loadDietState();
  rebuildStatsFromSources();
  normalizeTemporalState();
  ensureMissions();
  refreshMissionProgress();
  syncDerivedState();
  evaluateAchievements({ silent: true });
  saveGame();
  bindEvents();
  hydrateProfileForm();
  updateUI();
  setActiveView("social", false);
  window.addEventListener("pagehide", () => { flushScheduledSave(); if (typeof flushCloudSync === "function") flushCloudSync(); }, { passive: true });
  if (typeof bootstrapCloudSyncAfterGameInit === "function") bootstrapCloudSyncAfterGameInit();
  if (typeof scheduleSocialSnapshotSync === "function") scheduleSocialSnapshotSync(500);

  window.setInterval(() => {
    const previousDailyKey = state.missions.dailyKey;
    const previousWeeklyKey = state.missions.weeklyKey;
    normalizeTemporalState();
    ensureMissions();
    refreshMissionProgress();
    syncDerivedState();
    updateTimeLabels();

    if (
      previousDailyKey !== state.missions.dailyKey ||
      previousWeeklyKey !== state.missions.weeklyKey
    ) {
      saveGame();
      renderActiveView(activeView);
    }
  }, 60_000);
}

function createDefaultStats() {
  return {
    schemaVersion: 1,
    totalXp: 0,
    totalActivities: 0,
    claimedMissionRewards: 0,
    generatedAt: null,
    lifetime: {
      workoutsCompleted: 0,
      workoutDays: 0,
      setsCompleted: 0,
      compoundSets: 0,
      totalVolumeKg: 0,
      workoutPersonalRecords: 0,
      cardioSessions: 0,
      cardioPersonalRecords: 0,
      cardioMinutes: 0,
      cardioDistanceKm: 0,
      uniqueExercises: 0,
      exerciseSessions: 0,
      mealsLogged: 0,
      foodEntriesLogged: 0,
      dietDaysCompleted: 0,
      nutritionDays: 0,
      activeDays: 0,
      socialSessions: 0,
      dailyMissionsCompleted: 0,
      weeklyMissionsCompleted: 0,
      currentStreak: 0,
      bestStreak: 0
    },
    attributes: Object.fromEntries(
      Object.keys(ATTRIBUTES).map((key) => [key, { activityCount: 0, xpFromActivities: 0, activeDays: 0 }])
    ),
    daily: {},
    exercises: {},
    cardioByType: {},
    missionClaims: []
  };
}

function createEmptyDailyStats() {
  return {
    activityCount: 0,
    workouts: 0,
    sets: 0,
    compoundSets: 0,
    volumeKg: 0,
    workoutPersonalRecords: 0,
    cardioSessions: 0,
    cardioPersonalRecords: 0,
    cardioMinutes: 0,
    cardioDistanceKm: 0,
    meals: 0,
    foodEntries: 0,
    dietFinalized: false,
    socialSessions: 0,
    dailyMissionsCompleted: 0,
    weeklyMissionsCompleted: 0,
    attributes: Object.fromEntries(
      Object.keys(ATTRIBUTES).map((key) => [key, { activities: 0, xp: 0 }])
    )
  };
}

function rebuildStatsFromSources() {
  if (!state) return;

  const previous = state.stats && typeof state.stats === "object" ? state.stats : {};
  const next = createDefaultStats();
  next.totalXp = Math.max(0, Number(previous.totalXp) || 0);
  next.claimedMissionRewards = Math.max(0, Number(previous.claimedMissionRewards) || 0);
  next.missionClaims = Array.isArray(previous.missionClaims) ? previous.missionClaims.filter(Boolean) : [];

  const daily = next.daily;
  const activeDays = new Set();
  const workoutDays = new Set();
  const nutritionDays = new Set();
  const attributeDays = Object.fromEntries(Object.keys(ATTRIBUTES).map((key) => [key, new Set()]));

  const getDay = (dateKey) => {
    const key = dateKey || localDateKey();
    if (!daily[key]) daily[key] = createEmptyDailyStats();
    return daily[key];
  };

  for (const entry of state.history || []) {
    if (!entry || (!entry.kind || entry.kind === "activity") === false) continue;
    const dateKey = entry.dateKey || (entry.timestamp ? localDateKey(new Date(entry.timestamp)) : null);
    if (!dateKey) continue;
    const day = getDay(dateKey);
    day.activityCount += 1;
    next.totalActivities += 1;
    activeDays.add(dateKey);

    const entryAwards = Array.isArray(entry.xpAwards) && entry.xpAwards.length
      ? entry.xpAwards
      : (ATTRIBUTES[entry.attribute] ? [{ attribute: entry.attribute, xp: entry.xp }] : []);
    const countedAttributes = new Set();
    for (const award of entryAwards) {
      const attributeKey = ATTRIBUTES[award.attribute] ? award.attribute : null;
      if (!attributeKey) continue;
      const xp = Math.max(0, Number(award.xp) || 0);
      if (!countedAttributes.has(attributeKey)) {
        day.attributes[attributeKey].activities += 1;
        next.attributes[attributeKey].activityCount += 1;
        countedAttributes.add(attributeKey);
      }
      day.attributes[attributeKey].xp += xp;
      next.attributes[attributeKey].xpFromActivities += xp;
      attributeDays[attributeKey].add(dateKey);
    }

    if (entry.activityId === "cardio" || entry.cardioData) {
      const data = entry.cardioData || {};
      const minutes = Math.max(0, Number(data.minutes) || 0);
      const distanceKm = Math.max(0, Number(data.distance) || 0) + Math.max(0, Number(data.distanceMeters) || 0) / 1000;
      day.cardioSessions += 1;
      day.cardioMinutes += minutes;
      day.cardioDistanceKm += distanceKm;
      if (entry.performance?.isPr) {
        day.cardioPersonalRecords += 1;
        next.lifetime.cardioPersonalRecords += 1;
      }
      next.lifetime.cardioSessions += 1;
      next.lifetime.cardioMinutes += minutes;
      next.lifetime.cardioDistanceKm += distanceKm;
      const cardioType = data.type || "cardio";
      next.cardioByType[cardioType] ||= { sessions: 0, minutes: 0, distanceKm: 0 };
      next.cardioByType[cardioType].sessions += 1;
      next.cardioByType[cardioType].minutes += minutes;
      next.cardioByType[cardioType].distanceKm += distanceKm;
    }

    if (entry.activityId === "groupTraining") {
      day.socialSessions += 1;
      next.lifetime.socialSessions += 1;
    }
  }

  const seenWorkoutIds = new Set();
  for (const session of state.workouts?.sessions || []) {
    if (!session) continue;
    const uniqueId = session.id || `${session.finishedAt || session.startedAt || ""}:${session.name || ""}`;
    if (seenWorkoutIds.has(uniqueId)) continue;
    seenWorkoutIds.add(uniqueId);
    const timestamp = session.finishedAt || session.startedAt;
    const dateKey = timestamp ? localDateKey(new Date(timestamp)) : null;
    if (!dateKey) continue;
    const day = getDay(dateKey);
    const completedSets = Math.max(0, Number(session.completedSets) || 0);
    const compoundSets = Math.max(0, Number(session.compoundSets) || 0);
    const volume = Math.max(0, Number(session.volume) || 0);
    day.workouts += 1;
    day.sets += completedSets;
    day.compoundSets += compoundSets;
    day.volumeKg += volume;
    next.lifetime.workoutsCompleted += 1;
    next.lifetime.setsCompleted += completedSets;
    next.lifetime.compoundSets += compoundSets;
    next.lifetime.totalVolumeKg += volume;
    const prCount = Math.max(0, Number(session.prCount) || 0);
    day.workoutPersonalRecords += prCount;
    next.lifetime.workoutPersonalRecords += prCount;
    workoutDays.add(dateKey);
    activeDays.add(dateKey);

    const seenInSession = new Set();
    for (const exercise of session.exercises || []) {
      if (!exercise?.exerciseId) continue;
      const exerciseId = exercise.exerciseId;
      const definition = getExerciseById(exerciseId);
      next.exercises[exerciseId] ||= {
        name: exercise.name || definition?.name || exerciseId,
        sessions: 0,
        sets: 0,
        reps: 0,
        timedSeconds: 0,
        volumeKg: 0,
        lastPerformedAt: null
      };
      const exerciseStats = next.exercises[exerciseId];
      if (!seenInSession.has(exerciseId)) {
        exerciseStats.sessions += 1;
        next.lifetime.exerciseSessions += 1;
        seenInSession.add(exerciseId);
      }
      for (const set of exercise.sets || []) {
        if (!set?.completed) continue;
        exerciseStats.sets += 1;
        exerciseStats.reps += Math.max(0, Number(set.reps) || 0);
        exerciseStats.timedSeconds += Math.max(0, Number(set.seconds ?? set.durationSeconds ?? set.time) || 0);
        exerciseStats.volumeKg += Math.max(0, Number(set.weight) || 0) * Math.max(0, Number(set.reps) || 0);
      }
      if (!exerciseStats.lastPerformedAt || String(timestamp) > exerciseStats.lastPerformedAt) exerciseStats.lastPerformedAt = String(timestamp);
    }
  }

  const diet = loadDietState();
  for (const [dateKey, dietDay] of Object.entries(diet.days || {})) {
    if (!dietDay || typeof dietDay !== "object") continue;
    const day = getDay(dateKey);
    const meals = dietDay.meals || {};
    let mealSlots = 0;
    let foodEntries = 0;
    for (const mealKey of ["breakfast", "lunch", "snack", "dinner"]) {
      const items = Array.isArray(meals[mealKey]) ? meals[mealKey] : [];
      if (items.length) mealSlots += 1;
      foodEntries += items.length;
    }
    day.meals = mealSlots;
    day.foodEntries = foodEntries;
    day.dietFinalized = Boolean(dietDay.finalized);
    next.lifetime.mealsLogged += mealSlots;
    next.lifetime.foodEntriesLogged += foodEntries;
    if (mealSlots > 0) {
      nutritionDays.add(dateKey);
      activeDays.add(dateKey);
    }
    if (dietDay.finalized) next.lifetime.dietDaysCompleted += 1;
  }

  for (const claim of next.missionClaims) {
    if (!claim?.dateKey) continue;
    const day = getDay(claim.dateKey);
    if (claim.scope === "weekly") {
      day.weeklyMissionsCompleted += 1;
      next.lifetime.weeklyMissionsCompleted += 1;
    } else {
      day.dailyMissionsCompleted += 1;
      next.lifetime.dailyMissionsCompleted += 1;
    }
  }

  next.lifetime.workoutDays = workoutDays.size;
  next.lifetime.nutritionDays = nutritionDays.size;
  next.lifetime.activeDays = activeDays.size;
  next.lifetime.currentStreak = Math.max(0, Number(state.streak?.current) || 0);
  next.lifetime.bestStreak = Math.max(0, Number(state.streak?.best) || 0);
  for (const key of Object.keys(next.attributes)) next.attributes[key].activeDays = attributeDays[key].size;

  next.lifetime.uniqueExercises = Object.keys(next.exercises).length;
  next.lifetime.totalVolumeKg = Math.round(next.lifetime.totalVolumeKg);
  next.lifetime.cardioMinutes = Math.round(next.lifetime.cardioMinutes * 100) / 100;
  next.lifetime.cardioDistanceKm = Math.round(next.lifetime.cardioDistanceKm * 1000) / 1000;
  for (const value of Object.values(next.exercises)) value.volumeKg = Math.round(value.volumeKg);
  for (const value of Object.values(next.cardioByType)) {
    value.minutes = Math.round(value.minutes * 100) / 100;
    value.distanceKm = Math.round(value.distanceKm * 1000) / 1000;
  }
  for (const value of Object.values(next.daily)) {
    value.volumeKg = Math.round(value.volumeKg);
    value.cardioMinutes = Math.round(value.cardioMinutes * 100) / 100;
    value.cardioDistanceKm = Math.round(value.cardioDistanceKm * 1000) / 1000;
  }
  next.generatedAt = new Date().toISOString();
  state.stats = next;
}

function recordMissionClaim(mission) {
  if (!mission) return;
  state.stats ||= createDefaultStats();
  state.stats.missionClaims ||= [];
  if (state.stats.missionClaims.some((claim) => claim.missionId === mission.id)) return;
  const scope = state.missions.weekly.some((item) => item.id === mission.id) ? "weekly" : "daily";
  state.stats.missionClaims.push({
    missionId: mission.id,
    templateId: mission.templateId || null,
    scope,
    dateKey: localDateKey(),
    claimedAt: new Date().toISOString()
  });
  state.stats.missionClaims = state.stats.missionClaims.slice(-500);
}

function createDefaultState() {
  const attributes = {};

  Object.keys(ATTRIBUTES).forEach((attributeKey) => {
    attributes[attributeKey] = {
      level: 1,
      xp: 0,
      milestones: [],
      classStage: 0
    };
  });

  return {
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    player: {
      name: "Jogador",
      globalLevel: 1,
      title: "Novato"
    },
    profile: {
      weight: "",
      height: "",
      goal: "Criar consistência",
      frequency: "4 vezes por semana"
    },
    attributes,
    streak: {
      current: 0,
      best: 0,
      lastActiveDate: null,
      lastWeeklyRewardDate: null
    },
    missions: {
      seed: null,
      dailyKey: null,
      weeklyKey: null,
      daily: [],
      weekly: [],
      recentDailyTemplates: [],
      recentWeeklyTemplates: []
    },
    buffs: [],
    history: [],
    workouts: {
      active: null,
      routines: [],
      sessions: []
    },
    stats: createDefaultStats(),
    roadmaps: Object.fromEntries(Object.keys(ATTRIBUTES).map((key) => [key, { claimedChapters: [] }])),
    achievements: { unlocked: [] },
    tutorial: {
      welcomeSeen: false,
      dismissed: {},
      viewedHelp: {}
    }
  };
}

function loadGame() {
  const fallback = createDefaultState();

  try {
    const storageKey = getGameStorageKey();
    const cloudState = typeof consumePendingCloudGame === "function" ? consumePendingCloudGame() : null;
    if (cloudState) return migrateState(cloudState, fallback);

    const stored = localStorage.getItem(storageKey) || claimLegacyStorage(STORAGE_KEY, storageKey);
    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && String(parsed.version || "") !== APP_VERSION) {
      try {
        const userId = window.RPG_GYM_AUTH_USER_ID || "local";
        const backupKey = `rpgym:game-upgrade-backup:${userId}:${String(parsed.version || "unknown")}:to:${APP_VERSION}`;
        if (!localStorage.getItem(backupKey)) {
          localStorage.setItem(backupKey, JSON.stringify({
            createdAt: new Date().toISOString(),
            fromVersion: parsed.version || null,
            toVersion: APP_VERSION,
            game: parsed
          }));
        }
      } catch (backupError) {
        console.warn("Não foi possível criar backup do progresso antes da migração.", backupError);
      }
    }
    return migrateState(parsed, fallback);
  } catch (error) {
    console.warn("Não foi possível carregar o progresso salvo.", error);
    return fallback;
  }
}

function migrateState(rawState, fallback = createDefaultState()) {
  if (!rawState || typeof rawState !== "object") {
    return fallback;
  }

  const migrated = {
    ...fallback,
    ...rawState,
    version: APP_VERSION,
    player: {
      ...fallback.player,
      ...(rawState.player || {})
    },
    profile: {
      ...fallback.profile,
      ...(rawState.profile || {})
    },
    streak: {
      ...fallback.streak,
      ...(rawState.streak || {})
    },
    missions: {
      ...fallback.missions,
      ...(rawState.missions || {})
    },
    stats: {
      ...fallback.stats,
      ...(rawState.stats || {}),
      lifetime: { ...fallback.stats.lifetime, ...(rawState.stats?.lifetime || {}) },
      attributes: { ...fallback.stats.attributes, ...(rawState.stats?.attributes || {}) },
      daily: rawState.stats?.daily && typeof rawState.stats.daily === "object" ? rawState.stats.daily : {},
      exercises: rawState.stats?.exercises && typeof rawState.stats.exercises === "object" ? rawState.stats.exercises : {},
      cardioByType: rawState.stats?.cardioByType && typeof rawState.stats.cardioByType === "object" ? rawState.stats.cardioByType : {},
      missionClaims: Array.isArray(rawState.stats?.missionClaims) ? rawState.stats.missionClaims : []
    }
  };

  migrated.roadmaps = Object.fromEntries(
    Object.keys(ATTRIBUTES).map((attributeKey) => {
      const rawRoadmap = rawState.roadmaps?.[attributeKey] || {};
      return [attributeKey, {
        claimedChapters: Array.isArray(rawRoadmap.claimedChapters)
          ? rawRoadmap.claimedChapters.filter((id) => ROADMAP_DEFINITIONS[attributeKey]?.some((chapter) => chapter.id === id))
          : []
      }];
    })
  );

  migrated.achievements = {
    unlocked: Array.isArray(rawState.achievements?.unlocked)
      ? rawState.achievements.unlocked.filter((id) => ACHIEVEMENT_DEFINITIONS.some((item) => item.id === id))
      : []
  };

  migrated.tutorial = {
    ...fallback.tutorial,
    ...(rawState.tutorial || {}),
    dismissed: { ...fallback.tutorial.dismissed, ...(rawState.tutorial?.dismissed || {}) },
    viewedHelp: { ...fallback.tutorial.viewedHelp, ...(rawState.tutorial?.viewedHelp || {}) }
  };

  migrated.attributes = {};
  Object.keys(ATTRIBUTES).forEach((attributeKey) => {
    const savedAttribute = rawState.attributes?.[attributeKey] || {};
    migrated.attributes[attributeKey] = {
      ...fallback.attributes[attributeKey],
      ...savedAttribute,
      level: clampInteger(savedAttribute.level ?? 1, 1, MAX_LEVEL),
      xp: Math.max(0, Number(savedAttribute.xp) || 0),
      milestones: Array.isArray(savedAttribute.milestones)
        ? savedAttribute.milestones.filter((level) => MILESTONE_LEVELS.includes(level))
        : [],
      classStage: clampInteger(savedAttribute.classStage ?? 0, 0, 5)
    };
  });

  migrated.workouts = {
    ...fallback.workouts,
    ...(rawState.workouts || {}),
    active: rawState.workouts?.active || null,
    routines: Array.isArray(rawState.workouts?.routines) ? rawState.workouts.routines : [],
    sessions: Array.isArray(rawState.workouts?.sessions) ? rawState.workouts.sessions : []
  };

  migrated.history = Array.isArray(rawState.history)
    ? rawState.history.filter((entry) => entry && entry.timestamp && entry.attribute)
    : [];
  migrated.buffs = Array.isArray(rawState.buffs) ? rawState.buffs : [];
  migrated.missions.daily = Array.isArray(migrated.missions.daily)
    ? migrated.missions.daily
    : [];
  migrated.missions.weekly = Array.isArray(migrated.missions.weekly)
    ? migrated.missions.weekly
    : [];

  return migrated;
}

function saveGame() {
  if (state) state.lastSavedAt = new Date().toISOString();
  if (pendingSaveTimer) {
    window.clearTimeout(pendingSaveTimer);
    pendingSaveTimer = null;
  }
  try {
    localStorage.setItem(getGameStorageKey(), JSON.stringify(state));
    if (typeof scheduleCloudSync === "function") scheduleCloudSync();
    if (typeof scheduleSocialSnapshotSync === "function") scheduleSocialSnapshotSync();
    return true;
  } catch (error) {
    console.warn("Não foi possível salvar o progresso.", error);
    showToast(
      "Falha ao salvar",
      "O navegador bloqueou o armazenamento local.",
      "⚠"
    );
    return false;
  }
}

function scheduleSaveGame(delay = 180) {
  window.clearTimeout(pendingSaveTimer);
  pendingSaveTimer = window.setTimeout(() => {
    pendingSaveTimer = null;
    saveGame();
  }, delay);
}

function flushScheduledSave() {
  if (!pendingSaveTimer) return;
  window.clearTimeout(pendingSaveTimer);
  pendingSaveTimer = null;
  saveGame();
}

function normalizeTemporalState() {
  removeExpiredBuffs();
  normalizeStreakForToday();
}

function normalizeStreakForToday() {
  if (!state.streak.lastActiveDate) {
    return;
  }

  const difference = daysBetweenDateKeys(
    state.streak.lastActiveDate,
    localDateKey()
  );

  if (difference > 1) {
    state.streak.current = 0;
  }
}

function removeExpiredBuffs() {
  const now = Date.now();
  state.buffs = state.buffs.filter((buff) => {
    const expiresAt = new Date(buff.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

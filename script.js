(() => {
  "use strict";

  const STORAGE_KEY = "rpgGymMvp_v1";
  const APP_VERSION = 1;
  const MAX_LEVEL = 50;
  const MILESTONE_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const DAY_MS = 86_400_000;
  const PROFILE_ATTRIBUTE_ORDER = ["force", "agility", "constitution", "determination", "intelligence", "charisma"];

  const ATTRIBUTES = Object.freeze({
    force: {
      name: "Força",
      icon: "🏋️",
      cssColor: "var(--force)",
      chartColor: "#ff7b70",
      className: "Berserker",
      mentor: "Atlas",
      mentorRole: "Mestre da potência",
      description: "Capacidade muscular, potência e progressão de carga.",
      unlockBonus: 0.10,
      masterBonus: 0.25,
      bonusLabel: "XP de Força",
      masterTitle: "Titã"
    },
    agility: {
      name: "Agilidade",
      icon: "⚡",
      cssColor: "var(--agility)",
      chartColor: "#8d8cff",
      className: "Ninja",
      mentor: "Kaori",
      mentorRole: "Mestra da velocidade",
      description: "Velocidade, explosão, mobilidade e coordenação.",
      unlockBonus: 0.12,
      masterBonus: 0.30,
      bonusLabel: "XP de Agilidade",
      masterTitle: "Sombra Veloz"
    },
    constitution: {
      name: "Constituição",
      icon: "🛡️",
      cssColor: "var(--constitution)",
      chartColor: "#59d7b1",
      className: "Guardião",
      mentor: "Bastião",
      mentorRole: "Mestre da resistência",
      description: "Resistência física, fôlego e atividades de longa duração.",
      unlockBonus: 0.15,
      masterBonus: 0.35,
      bonusLabel: "XP de Resistência",
      masterTitle: "Muralha Viva"
    },
    intelligence: {
      name: "Inteligência",
      icon: "🧠",
      cssColor: "var(--intelligence)",
      chartColor: "#5cb8ff",
      className: "Mago",
      mentor: "Lyra",
      mentorRole: "Mestra dos hábitos",
      description: "Conhecimento corporal, alimentação e decisões conscientes.",
      unlockBonus: 0.10,
      masterBonus: 0.20,
      bonusLabel: "XP de Nutrição",
      masterTitle: "Sábio dos Hábitos"
    },
    determination: {
      name: "Determinação",
      icon: "🔥",
      cssColor: "var(--determination)",
      chartColor: "#ffb95f",
      className: "Monge",
      mentor: "Soren",
      mentorRole: "Mestre da disciplina",
      description: "Consistência, disciplina, metas e manutenção de streaks.",
      unlockBonus: 0.15,
      masterBonus: 0.30,
      bonusLabel: "XP de Consistência",
      masterTitle: "Inabalável"
    },
    charisma: {
      name: "Carisma",
      icon: "🤝",
      cssColor: "var(--charisma)",
      chartColor: "#e985ff",
      className: "Capitão",
      mentor: "Maya",
      mentorRole: "Mestra da cooperação",
      description: "Engajamento social, cooperação e treinos em comunidade.",
      unlockBonus: 0.12,
      masterBonus: 0.25,
      bonusLabel: "XP Social",
      masterTitle: "Comandante"
    }
  });

  const ACTIVITIES = Object.freeze({
    heavySet: {
      id: "heavySet",
      name: "Série pesada",
      attribute: "force",
      icon: "🏋️",
      baseXp: 25,
      category: "training"
    },
    strengthWorkout: {
      id: "strengthWorkout",
      name: "Treino de musculação",
      attribute: "force",
      icon: "🏋️",
      baseXp: 0,
      category: "training"
    },
    hiit: {
      id: "hiit",
      name: "HIIT completo",
      attribute: "agility",
      icon: "⚡",
      baseXp: 35,
      category: "training"
    },
    cardio: {
      id: "cardio",
      name: "Cardio",
      attribute: "constitution",
      icon: "🛡️",
      baseXp: 20,
      category: "training"
    },
    meal: {
      id: "meal",
      name: "Refeição registrada",
      attribute: "intelligence",
      icon: "🧠",
      baseXp: 5,
      category: "habit"
    },
    weeklyStreak: {
      id: "weeklyStreak",
      name: "Streak semanal",
      attribute: "determination",
      icon: "🔥",
      baseXp: 90,
      category: "habit"
    },
    groupTraining: {
      id: "groupTraining",
      name: "Treino em grupo",
      attribute: "charisma",
      icon: "🤝",
      baseXp: 25,
      category: "training"
    }
  });

  const EXERCISE_DATABASE = Object.freeze(window.RPG_GYM_EXERCISES || []);
  const FOOD_DATABASE = Object.freeze(window.RPG_GYM_FOODS || []);
  const FOOD_COMMON_DATABASE = Object.freeze(FOOD_DATABASE.filter((food) => food.common !== false));
  const DIET_STORAGE_KEY = "rpgGymDiet_v1";

  const DAILY_MISSION_TEMPLATES = Object.freeze([
    {
      templateId: "daily_force_three",
      name: "Trinca de Ferro",
      description: "Registre 3 séries pesadas hoje.",
      metric: { type: "activityCount", activityId: "heavySet" },
      target: 3,
      reward: { type: "xp", attribute: "force", amount: 35 }
    },
    {
      templateId: "daily_meals_three",
      name: "Nutrição Consciente",
      description: "Registre 3 refeições hoje.",
      metric: { type: "activityCount", activityId: "meal" },
      target: 3,
      reward: { type: "xp", attribute: "intelligence", amount: 25 }
    },
    {
      templateId: "daily_cardio_one",
      name: "Pulmões de Aço",
      description: "Conclua uma sessão de cardio.",
      metric: { type: "activityCount", activityId: "cardio" },
      target: 1,
      reward: { type: "xp", attribute: "constitution", amount: 30 }
    },
    {
      templateId: "daily_training_one",
      name: "Movimento Conta",
      description: "Registre pelo menos um treino hoje.",
      metric: { type: "categoryCount", category: "training" },
      target: 1,
      reward: { type: "xp", attribute: "determination", amount: 20 }
    },
    {
      templateId: "daily_hiit_one",
      name: "Explosão Controlada",
      description: "Conclua uma sessão de HIIT.",
      metric: { type: "activityCount", activityId: "hiit" },
      target: 1,
      reward: { type: "xp", attribute: "agility", amount: 35 }
    },
    {
      templateId: "daily_social_one",
      name: "Força da Equipe",
      description: "Registre um treino em grupo.",
      metric: { type: "activityCount", activityId: "groupTraining" },
      target: 1,
      reward: { type: "xp", attribute: "charisma", amount: 35 }
    },
    {
      templateId: "daily_any_two",
      name: "Passos da Jornada",
      description: "Registre 2 atividades válidas hoje.",
      metric: { type: "anyActivityCount" },
      target: 2,
      reward: { type: "xp", attribute: "determination", amount: 25 }
    }
  ]);

  const WEEKLY_MISSION_TEMPLATES = Object.freeze([
    {
      templateId: "weekly_train_four",
      name: "Semana de Aço",
      description: "Registre 4 treinos nesta semana.",
      metric: { type: "categoryCount", category: "training" },
      target: 4,
      reward: { type: "buff", multiplier: 1.2, durationHours: 24 }
    },
    {
      templateId: "weekly_hiit_cardio",
      name: "Velocidade e Fôlego",
      description: "Faça pelo menos um HIIT e um cardio.",
      metric: { type: "requiredActivities", activityIds: ["hiit", "cardio"] },
      target: 2,
      reward: { type: "xp", attribute: "agility", amount: 70 }
    },
    {
      templateId: "weekly_meal_days",
      name: "Diário Nutricional",
      description: "Registre refeições em 5 dias diferentes.",
      metric: { type: "activityDays", activityId: "meal" },
      target: 5,
      reward: { type: "xp", attribute: "intelligence", amount: 75 }
    },
    {
      templateId: "weekly_active_days",
      name: "Disciplina em Marcha",
      description: "Mantenha atividades em 3 dias diferentes.",
      metric: { type: "activeDays" },
      target: 3,
      reward: { type: "xp", attribute: "determination", amount: 80 }
    },
    {
      templateId: "weekly_group_two",
      name: "Esquadrão Unido",
      description: "Registre 2 treinos em grupo.",
      metric: { type: "activityCount", activityId: "groupTraining" },
      target: 2,
      reward: { type: "xp", attribute: "charisma", amount: 75 }
    },
    {
      templateId: "weekly_force_six",
      name: "Fundação de Força",
      description: "Registre 6 séries pesadas.",
      metric: { type: "activityCount", activityId: "heavySet" },
      target: 6,
      reward: { type: "xp", attribute: "force", amount: 80 }
    }
  ]);

  const VIEW_TITLES = Object.freeze({
    dashboard: "Painel do aventureiro",
    social: "Social",
    training: "Treino",
    cardio: "Cardio",
    diet: "Dieta",
    missions: "Missões da jornada",
    character: "Perfil"
  });

  const GLOBAL_TITLES = Object.freeze([
    { level: 1, title: "Novato" },
    { level: 5, title: "Iniciado" },
    { level: 10, title: "Discípulo de Ferro" },
    { level: 20, title: "Veterano da Jornada" },
    { level: 30, title: "Elite do RPG GYM" },
    { level: 40, title: "Lenda da Consistência" },
    { level: 50, title: "Ascendente" }
  ]);

  const numberFormatter = new Intl.NumberFormat("pt-BR");
  const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  let state;
  let activeView = "social";
  let activeProfileAttribute = "force";
  let profileHydrated = false;
  let celebrationOpen = false;
  let celebrationQueue = [];
  let celebrationReturnFocus = null;
  let resizeTimer = null;
  let cardioTimerInterval = null;
  let cardioTimerStartedAt = null;
  let cardioTimerElapsedMs = 0;
  let cardioTimerPaused = false;
  let pendingCardioRecord = null;

  const CARDIO_TYPES = {
    treadmill: { label: "Esteira", icon: "▰", attribute: "constitution", requiredLabel: "Distância • velocidade • inclinação", hint: "Ao finalizar, informe distância, velocidade média e inclinação.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.01, required: true },
      { key: "speed", label: "Velocidade média", unit: "km/h", type: "number", min: 0, step: 0.1, required: true },
      { key: "incline", label: "Inclinação média", unit: "%", type: "number", min: 0, step: 0.5, required: false }
    ]},
    outdoor_run: { label: "Corrida ao ar livre", icon: "↗", attribute: "agility", requiredLabel: "Distância • ritmo", hint: "Informe a distância. O ritmo médio é calculado automaticamente pelo tempo.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.01, required: true }
    ]},
    stationary_bike: { label: "Bicicleta ergométrica", icon: "◉", attribute: "constitution", requiredLabel: "Distância • resistência • RPM", hint: "Registre os dados exibidos pela bicicleta. RPM é opcional.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: true },
      { key: "resistance", label: "Resistência média", unit: "nível", type: "number", min: 0, step: 1, required: false },
      { key: "rpm", label: "Cadência média", unit: "RPM", type: "number", min: 0, step: 1, required: false }
    ]},
    outdoor_bike: { label: "Ciclismo ao ar livre", icon: "◉", attribute: "constitution", requiredLabel: "Distância • velocidade", hint: "Informe a distância; a velocidade média será calculada pelo tempo.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: true }
    ]},
    elliptical: { label: "Elíptico", icon: "◇", attribute: "constitution", requiredLabel: "Distância • resistência", hint: "Use a distância e o nível médio mostrados no painel da máquina.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: false },
      { key: "resistance", label: "Resistência média", unit: "nível", type: "number", min: 0, step: 1, required: false }
    ]},
    stair_climber: { label: "Escada / Stair climber", icon: "▤", attribute: "constitution", requiredLabel: "Andares • nível", hint: "Registre os andares subidos ou o nível médio exibido pela máquina.", fields: [
      { key: "floors", label: "Andares", unit: "andares", type: "number", min: 0, step: 1, required: false },
      { key: "resistance", label: "Nível médio", unit: "nível", type: "number", min: 0, step: 1, required: false }
    ]},
    rowing: { label: "Remo ergométrico", icon: "≈", attribute: "constitution", requiredLabel: "Distância • ritmo /500 m", hint: "Informe a distância em metros; o ritmo por 500 m é calculado automaticamente.", fields: [
      { key: "distanceMeters", label: "Distância", unit: "m", type: "number", min: 0, step: 10, required: true }
    ]},
    jump_rope: { label: "Corda", icon: "∞", attribute: "agility", requiredLabel: "Saltos", hint: "Registre a quantidade aproximada de saltos realizados.", fields: [
      { key: "jumps", label: "Saltos", unit: "saltos", type: "number", min: 0, step: 1, required: true }
    ]},
    swimming: { label: "Natação", icon: "≈", attribute: "constitution", requiredLabel: "Distância • piscina", hint: "Informe a distância total. O tamanho da piscina é opcional.", fields: [
      { key: "distanceMeters", label: "Distância", unit: "m", type: "number", min: 0, step: 25, required: true },
      { key: "poolLength", label: "Comprimento da piscina", unit: "m", type: "number", min: 0, step: 5, required: false }
    ]}
  };
  let workoutElapsedInterval = null;
  let activeExerciseSetTimer = null;
  let pickerTarget = "workout";
  let pickerSelectedIds = new Set();
  let routineDraft = null;
  let confirmationAction = null;
  let workoutResultProgressEvents = [];
  let exercisePickerReturnToRoutine = false;
  let restTimerInterval = null;
  let restTimerSeconds = 0;
  let dietState = null;
  let dietDateOffset = 0;
  let foodPickerMealKey = "breakfast";
  let editingDietItem = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    state = loadGame();
    normalizeTemporalState();
    ensureMissions();
    refreshMissionProgress();
    syncDerivedState();
    bindEvents();
    hydrateProfileForm();
    updateUI();
    setActiveView("social", false);

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
        renderMissions();
        renderDashboard();
      }
    }, 60_000);
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
        dailyKey: null,
        weeklyKey: null,
        daily: [],
        weekly: []
      },
      buffs: [],
      history: [],
      workouts: {
        active: null,
        routines: [],
        sessions: []
      },
      stats: {
        totalXp: 0,
        totalActivities: 0,
        claimedMissionRewards: 0
      }
    };
  }

  function loadGame() {
    const fallback = createDefaultState();

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return fallback;
      }

      const parsed = JSON.parse(stored);
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
        ...(rawState.stats || {})
      }
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  function ensureMissions() {
    const todayKey = localDateKey();
    const weekKey = weekStartKey();

    if (state.missions.dailyKey !== todayKey) {
      state.missions.dailyKey = todayKey;
      state.missions.daily = generateDailyMissions(todayKey);
    }

    if (state.missions.weeklyKey !== weekKey) {
      state.missions.weeklyKey = weekKey;
      state.missions.weekly = generateWeeklyMissions(weekKey);
    }
  }

  function generateDailyMissions(dateKey = localDateKey()) {
    return deterministicSample(
      DAILY_MISSION_TEMPLATES,
      4,
      `daily-${dateKey}`
    ).map((template) => createMissionFromTemplate(template, "daily", dateKey));
  }

  function generateWeeklyMissions(weekKey = weekStartKey()) {
    return deterministicSample(
      WEEKLY_MISSION_TEMPLATES,
      3,
      `weekly-${weekKey}`
    ).map((template) => createMissionFromTemplate(template, "weekly", weekKey));
  }

  function createMissionFromTemplate(template, period, periodKey) {
    return {
      id: `${period}-${periodKey}-${template.templateId}`,
      templateId: template.templateId,
      type: period,
      name: template.name,
      description: template.description,
      metric: structuredCloneSafe(template.metric),
      target: template.target,
      progress: 0,
      reward: structuredCloneSafe(template.reward),
      status: "active"
    };
  }

  function deterministicSample(source, count, seedText) {
    const items = source.map((item) => item);
    let seed = hashString(seedText);

    for (let index = items.length - 1; index > 0; index -= 1) {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      const swapIndex = seed % (index + 1);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }

    return items.slice(0, Math.min(count, items.length));
  }

  function hashString(value) {
    let hash = 2_166_136_261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16_777_619);
    }
    return hash >>> 0;
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function refreshMissionProgress() {
    const completedNow = [];

    [...state.missions.daily, ...state.missions.weekly].forEach((mission) => {
      const previousStatus = mission.status;
      mission.progress = calculateMissionProgress(mission);

      if (mission.status !== "claimed") {
        mission.status = mission.progress >= mission.target ? "completed" : "active";
      }

      if (previousStatus === "active" && mission.status === "completed") {
        completedNow.push(mission);
      }
    });

    return completedNow;
  }

  function calculateMissionProgress(mission) {
    const entries = getEntriesForMissionPeriod(mission.type);
    const metric = mission.metric || {};
    let progress = 0;

    switch (metric.type) {
      case "activityCount":
        if (metric.activityId === "heavySet") {
          progress = entries.reduce((sum, entry) => {
            if (entry.activityId === "heavySet") return sum + Math.max(1, Number(entry.setCount) || 1);
            if (entry.activityId === "strengthWorkout") return sum + Math.max(0, Number(entry.setCount) || 0);
            return sum;
          }, 0);
        } else {
          progress = entries.filter((entry) => entry.activityId === metric.activityId).length;
        }
        break;
      case "categoryCount":
        progress = entries.filter((entry) => {
          const activity = ACTIVITIES[entry.activityId];
          return activity?.category === metric.category;
        }).length;
        break;
      case "anyActivityCount":
        progress = entries.length;
        break;
      case "activeDays":
        progress = new Set(entries.map((entry) => entry.dateKey)).size;
        break;
      case "activityDays":
        progress = new Set(
          entries
            .filter((entry) => entry.activityId === metric.activityId)
            .map((entry) => entry.dateKey)
        ).size;
        break;
      case "requiredActivities":
        progress = metric.activityIds.filter((activityId) =>
          entries.some((entry) => entry.activityId === activityId)
        ).length;
        break;
      default:
        progress = 0;
    }

    return Math.min(mission.target, Math.max(0, progress));
  }

  function getEntriesForMissionPeriod(period) {
    const today = localDateKey();
    const weekStart = weekStartKey();

    return state.history.filter((entry) => {
      if (entry.kind && entry.kind !== "activity") {
        return false;
      }

      if (period === "daily") {
        return entry.dateKey === today;
      }

      return entry.dateKey >= weekStart && entry.dateKey <= today;
    });
  }

  function calculateRequiredXP(level) {
    if (level >= MAX_LEVEL) {
      return 0;
    }
    return Math.ceil(100 * Math.pow(level, 1.2));
  }

  function calculateGlobalLevel() {
    const totalLevels = Object.values(state.attributes).reduce(
      (sum, attribute) => sum + attribute.level,
      0
    );
    return Math.min(MAX_LEVEL, Math.ceil(totalLevels / Object.keys(ATTRIBUTES).length));
  }

  function calculateJourneyPercent() {
    const totalProgress = Object.values(state.attributes).reduce((sum, attribute) => {
      if (attribute.level >= MAX_LEVEL) {
        return sum + (MAX_LEVEL - 1);
      }

      const requiredXp = calculateRequiredXP(attribute.level);
      const fractionalLevel = requiredXp > 0 ? attribute.xp / requiredXp : 0;
      return sum + (attribute.level - 1) + fractionalLevel;
    }, 0);

    const maximumProgress = (MAX_LEVEL - 1) * Object.keys(ATTRIBUTES).length;
    return maximumProgress > 0
      ? Math.min(100, Math.max(0, (totalProgress / maximumProgress) * 100))
      : 0;
  }

  function syncDerivedState() {
    Object.keys(ATTRIBUTES).forEach((attributeKey) => {
      const attribute = state.attributes[attributeKey];
      attribute.level = clampInteger(attribute.level, 1, MAX_LEVEL);

      if (attribute.level >= MAX_LEVEL) {
        attribute.xp = 0;
      } else {
        attribute.xp = Math.max(0, Number(attribute.xp) || 0);
      }

      attribute.milestones = MILESTONE_LEVELS.filter(
        (milestone) => milestone <= attribute.level
      );
      attribute.classStage = Math.min(5, Math.floor(attribute.level / 10));
    });

    state.player.globalLevel = calculateGlobalLevel();
    state.player.title = getCurrentGlobalTitle();
  }

  function getActivityAttribute(activityId, options = {}) {
    if (activityId === "cardio") {
      return CARDIO_TYPES[options.type]?.attribute || options.mode || "constitution";
    }
    return ACTIVITIES[activityId]?.attribute || "constitution";
  }

  function calculateActivityXp(activityId, options = {}) {
    const activity = ACTIVITIES[activityId];
    if (!activity) {
      throw new Error(`Atividade desconhecida: ${activityId}`);
    }

    const attributeKey = getActivityAttribute(activityId, options);
    const attribute = state.attributes[attributeKey];
    let baseXp = activity.baseXp;
    const breakdown = [];

    if (activityId === "cardio") {
      const minutes = Math.max(1, Number(options.minutes) || 1);
      const distanceKm = Math.max(0, Number(options.distance) || (Number(options.distanceMeters) || 0) / 1000);
      const isAgility = attributeKey === "agility";
      // Mantém o balanceamento atual: tempo é a base; distância dá um bônus pequeno.
      baseXp = minutes < 30 ? Math.max(5, Math.round((minutes / 30) * 20)) : 20 + Math.floor(minutes - 30);
      baseXp += Math.min(isAgility ? 20 : 15, Math.floor(distanceKm * (isAgility ? 2 : 1)));
    }

    const levelBonus = Math.min(0.5, attribute.level * 0.01);
    if (levelBonus > 0) {
      breakdown.push({
        label: `Nível de ${ATTRIBUTES[attributeKey].name}`,
        value: levelBonus
      });
    }

    const classBonus = getClassBonus(attributeKey);
    if (classBonus > 0) {
      breakdown.push({
        label: ATTRIBUTES[attributeKey].className,
        value: classBonus
      });
    }

    if (activityId === "heavySet" && options.compound) {
      breakdown.push({ label: "Exercício composto", value: 0.10 });
    }

    const intelligenceHabitBonus = getIntelligenceHabitBonus(activity);
    if (intelligenceHabitBonus > 0) {
      breakdown.push({ label: "Mago mestre", value: intelligenceHabitBonus });
    }

    getActiveBuffs().forEach((buff) => {
      breakdown.push({
        label: buff.source || "Buff semanal",
        value: Math.max(0, Number(buff.multiplier) - 1)
      });
    });

    const rawBonus = breakdown.reduce((sum, item) => sum + item.value, 0);
    const appliedBonus = Math.min(0.5, rawBonus);
    const xp = Math.max(1, Math.round(baseXp * (1 + appliedBonus)));

    return {
      xp,
      baseXp,
      rawBonus,
      appliedBonus,
      capped: rawBonus > 0.5,
      breakdown,
      attributeKey
    };
  }

  function getClassBonus(attributeKey) {
    const attribute = state.attributes[attributeKey];
    const definition = ATTRIBUTES[attributeKey];

    if (attribute.level >= 50) {
      return definition.masterBonus;
    }
    if (attribute.level >= 10) {
      return definition.unlockBonus;
    }
    return 0;
  }

  function getIntelligenceHabitBonus(activity) {
    if (activity.attribute === "intelligence") {
      return 0;
    }

    const intelligence = state.attributes.intelligence;
    return intelligence.level >= 50 && activity.category === "habit" ? 0.20 : 0;
  }

  function getActiveBuffs() {
    const now = Date.now();
    return state.buffs.filter(
      (buff) => new Date(buff.expiresAt).getTime() > now
    );
  }

  function registerActivity(activityId) {
    const activity = ACTIVITIES[activityId];
    if (!activity) {
      showToast("Atividade inválida", "Não foi possível encontrar essa ação.", "⚠");
      return;
    }

    if (activityId === "weeklyStreak") {
      const eligibility = getWeeklyStreakEligibility();
      if (!eligibility.eligible) {
        showToast("Recompensa bloqueada", eligibility.message, "🔒");
        return;
      }
    }

    const options = readActivityOptions(activityId);
    const calculation = calculateActivityXp(activityId, options);
    const now = new Date();
    const effectiveAttribute = calculation.attributeKey || activity.attribute;
    const progressEvents = addXP(
      effectiveAttribute,
      calculation.xp,
      activity.name
    );

    const streakUpdate = updateStreak(now);

    if (activityId === "weeklyStreak") {
      state.streak.lastWeeklyRewardDate = localDateKey(now);
    }

    const details = buildActivityDetails(activityId, options, calculation);
    const historyEntry = {
      id: createId(),
      kind: "activity",
      activityId,
      activityName: activityId === "cardio" ? (CARDIO_TYPES[options.type]?.label || activity.name) : activity.name,
      attribute: effectiveAttribute,
      xp: calculation.xp,
      baseXp: calculation.baseXp,
      bonusPercent: calculation.appliedBonus,
      details,
      ...(activityId === "cardio" ? { cardioData: { ...options } } : {}),
      timestamp: now.toISOString(),
      dateKey: localDateKey(now)
    };

    state.history.unshift(historyEntry);
    state.history = state.history.slice(0, 1_000);
    state.stats.totalActivities += 1;

    const newlyCompletedMissions = refreshMissionProgress();
    syncDerivedState();
    saveGame();
    updateUI();

    showToast(
      `+${formatNumber(calculation.xp)} XP em ${ATTRIBUTES[effectiveAttribute].name}`,
      calculation.capped
        ? `${activity.name} registrado. O bônus total atingiu o limite de +50%.`
        : `${activity.name} registrado com sucesso.`,
      activity.icon
    );

    if (streakUpdate.changed) {
      showToast(
        streakUpdate.reset ? "Novo streak iniciado" : "Streak aumentado",
        `Sequência atual: ${state.streak.current} ${pluralize(state.streak.current, "dia", "dias")}.`,
        "🔥"
      );
    }

    newlyCompletedMissions.forEach((mission) => {
      showToast(
        "Missão concluída",
        `${mission.name} está pronta para resgate.`,
        "✦"
      );
    });

    presentProgressEvents(progressEvents);
  }

  function readActivityOptions(activityId) {
    switch (activityId) {
      case "heavySet":
        return {
          compound: Boolean(document.getElementById("compoundExercise")?.checked)
        };
      case "cardio": {
        const type = pendingCardioRecord?.type || document.getElementById("cardioMode")?.value || "treadmill";
        const config = CARDIO_TYPES[type] || CARDIO_TYPES.treadmill;
        const values = pendingCardioRecord?.values || {};
        const minutes = pendingCardioRecord?.minutes || Math.max(1, getCurrentCardioElapsedMs() / 60000);
        return { type, mode: config.attribute, minutes, ...values };
      }
      case "meal":
        return {
          mealType: document.getElementById("mealType")?.value || "Refeição"
        };
      case "groupTraining":
        return {
          groupName: (document.getElementById("groupName")?.value || "").trim()
        };
      default:
        return {};
    }
  }

  function buildActivityDetails(activityId, options, calculation) {
    const details = [];

    if (activityId === "heavySet" && options.compound) {
      details.push("Exercício composto");
    }
    if (activityId === "cardio") {
      const config = CARDIO_TYPES[options.type] || CARDIO_TYPES.treadmill;
      details.push(config.label);
      details.push(formatCardioDuration((Number(options.minutes) || 0) * 60000));
      if (Number(options.distance) > 0) details.push(`${formatDecimal(options.distance, 2)} km`);
      if (Number(options.distanceMeters) > 0) details.push(`${formatNumber(Math.round(options.distanceMeters))} m`);
      if (Number(options.speed) > 0) details.push(`${formatDecimal(options.speed, 1)} km/h`);
      if (Number(options.incline) > 0) details.push(`${formatDecimal(options.incline, 1)}% incl.`);
      if (Number(options.resistance) > 0) details.push(`nível ${formatDecimal(options.resistance, 0)}`);
      if (Number(options.rpm) > 0) details.push(`${formatDecimal(options.rpm, 0)} RPM`);
      if (Number(options.floors) > 0) details.push(`${formatNumber(Math.round(options.floors))} andares`);
      if (Number(options.jumps) > 0) details.push(`${formatNumber(Math.round(options.jumps))} saltos`);
      const pace = getCardioDerivedMetric(options);
      if (pace) details.push(pace);
    }
    if (activityId === "meal") {
      details.push(options.mealType);
    }
    if (activityId === "groupTraining" && options.groupName) {
      details.push(options.groupName);
    }
    if (calculation.appliedBonus > 0) {
      details.push(`bônus +${Math.round(calculation.appliedBonus * 100)}%`);
    }

    return details.join(" • ");
  }

  function addXP(attributeKey, amount, source = "Atividade") {
    const attribute = state.attributes[attributeKey];
    const definition = ATTRIBUTES[attributeKey];
    const xpAmount = Math.max(0, Math.round(Number(amount) || 0));
    const events = [];

    state.stats.totalXp += xpAmount;

    if (attribute.level >= MAX_LEVEL || xpAmount <= 0) {
      return events;
    }

    attribute.xp += xpAmount;

    while (attribute.level < MAX_LEVEL) {
      const requiredXp = calculateRequiredXP(attribute.level);
      if (attribute.xp < requiredXp) {
        break;
      }

      attribute.xp -= requiredXp;
      attribute.level += 1;
      events.push({
        type: "level",
        attribute: attributeKey,
        level: attribute.level,
        source
      });

      if (MILESTONE_LEVELS.includes(attribute.level)) {
        events.push({
          type: "milestone",
          attribute: attributeKey,
          level: attribute.level
        });
      }

      if (attribute.level % 10 === 0) {
        events.push({
          type: "class",
          attribute: attributeKey,
          level: attribute.level,
          className: definition.className
        });
      }
    }

    if (attribute.level >= MAX_LEVEL) {
      attribute.level = MAX_LEVEL;
      attribute.xp = 0;
    }

    syncDerivedState();
    return events;
  }

  function updateStreak(date = new Date()) {
    const today = localDateKey(date);
    const previousDate = state.streak.lastActiveDate;

    if (previousDate === today) {
      return { changed: false, reset: false };
    }

    let reset = false;
    if (!previousDate) {
      state.streak.current = 1;
      reset = true;
    } else {
      const difference = daysBetweenDateKeys(previousDate, today);
      if (difference === 1) {
        state.streak.current += 1;
      } else {
        state.streak.current = 1;
        reset = true;
      }
    }

    state.streak.lastActiveDate = today;
    state.streak.best = Math.max(state.streak.best, state.streak.current);

    return { changed: true, reset };
  }

  function getWeeklyStreakEligibility() {
    const today = localDateKey();

    if (state.streak.current < 7) {
      const remaining = 7 - state.streak.current;
      return {
        eligible: false,
        message: `Faltam ${remaining} ${pluralize(remaining, "dia", "dias")} de streak para liberar.`
      };
    }

    if (state.streak.lastWeeklyRewardDate) {
      const sinceLastReward = daysBetweenDateKeys(
        state.streak.lastWeeklyRewardDate,
        today
      );
      if (sinceLastReward < 7) {
        const remaining = 7 - sinceLastReward;
        return {
          eligible: false,
          message: `Recompensa já resgatada. Nova liberação em ${remaining} ${pluralize(remaining, "dia", "dias")}.`
        };
      }
    }

    return {
      eligible: true,
      message: "Streak de 7 dias completo. Recompensa pronta!"
    };
  }

  function claimMission(missionId) {
    const mission = [...state.missions.daily, ...state.missions.weekly].find(
      (candidate) => candidate.id === missionId
    );

    if (!mission || mission.status !== "completed") {
      showToast(
        "Recompensa indisponível",
        "Complete todos os requisitos antes de resgatar.",
        "🔒"
      );
      return;
    }

    let progressEvents = [];
    let rewardMessage = "Recompensa adicionada.";

    if (mission.reward.type === "xp") {
      progressEvents = addXP(
        mission.reward.attribute,
        mission.reward.amount,
        `Missão: ${mission.name}`
      );
      rewardMessage = `+${formatNumber(mission.reward.amount)} XP em ${ATTRIBUTES[mission.reward.attribute].name}.`;
    }

    if (mission.reward.type === "buff") {
      const durationMs = mission.reward.durationHours * 60 * 60 * 1_000;
      state.buffs.push({
        id: createId(),
        multiplier: mission.reward.multiplier,
        source: mission.name,
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + durationMs).toISOString()
      });
      rewardMessage = `Bônus de ${formatMultiplier(mission.reward.multiplier)} XP ativo por ${mission.reward.durationHours}h.`;
    }

    mission.status = "claimed";
    state.stats.claimedMissionRewards += 1;
    syncDerivedState();
    saveGame();
    updateUI();

    showToast("Recompensa resgatada", rewardMessage, "🎁");
    presentProgressEvents(progressEvents);
  }

  function presentProgressEvents(events) {
    if (!events.length) {
      return;
    }

    const classEvents = events.filter((event) => event.type === "class");
    const milestoneEvents = events.filter((event) => event.type === "milestone");
    const levelEvents = events.filter((event) => event.type === "level");

    if (classEvents.length) {
      const event = classEvents[classEvents.length - 1];
      const definition = ATTRIBUTES[event.attribute];
      const master = event.level >= 50;
      queueCelebration({
        icon: definition.icon,
        kicker: master ? "Classe dominada" : "Classe evoluída",
        title: master
          ? `${definition.className} mestre!`
          : `${definition.className} ${romanNumeral(event.level / 10)} desbloqueado`,
        message: master
          ? `${definition.masterTitle} conquistado no nível 50 de ${definition.name}.`
          : `${definition.name} alcançou o marco de nível ${event.level}.`
      });
      return;
    }

    if (milestoneEvents.length) {
      const event = milestoneEvents[milestoneEvents.length - 1];
      const definition = ATTRIBUTES[event.attribute];
      queueCelebration({
        icon: "✦",
        kicker: "Novo marco",
        title: `${definition.name} nível ${event.level}`,
        message: `A afinidade com ${definition.mentor} aumentou e uma nova etapa foi liberada.`
      });
      return;
    }

    if (levelEvents.length) {
      const event = levelEvents[levelEvents.length - 1];
      const definition = ATTRIBUTES[event.attribute];
      queueCelebration({
        icon: definition.icon,
        kicker: "Level up",
        title: `${definition.name} nível ${event.level}`,
        message:
          levelEvents.length > 1
            ? `Você avançou ${levelEvents.length} níveis com uma única recompensa.`
            : "Seu personagem ficou mais forte."
      });
    }
  }

  function queueCelebration(data) {
    celebrationQueue.push(data);
    if (!celebrationOpen) {
      displayNextCelebration();
    }
  }

  function displayNextCelebration() {
    const celebration = document.getElementById("celebration");
    const next = celebrationQueue.shift();

    if (!celebration || !next) {
      celebrationOpen = false;
      return;
    }

    celebrationOpen = true;
    celebrationReturnFocus = document.activeElement;
    setText("celebrationIcon", next.icon || "✦");
    setText("celebrationKicker", next.kicker || "Evolução");
    setText("celebrationTitle", next.title || "Level up!");
    setText(
      "celebrationMessage",
      next.message || "Seu personagem ficou mais forte."
    );
    celebration.hidden = false;
    document.getElementById("closeCelebrationButton")?.focus();
  }

  function closeCelebration() {
    const celebration = document.getElementById("celebration");
    if (!celebration) {
      return;
    }

    celebration.hidden = true;
    celebrationOpen = false;

    if (celebrationReturnFocus instanceof HTMLElement) {
      celebrationReturnFocus.focus({ preventScroll: true });
    }

    window.setTimeout(displayNextCelebration, 160);
  }

  function updateUI() {
    normalizeTemporalState();
    ensureMissions();
    refreshMissionProgress();
    syncDerivedState();

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
    saveGame();
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
        : `Título atual: ${state.player.title}. Equilibre os seis atributos para avançar.`
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
        const locked = attribute.level < 10;

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
    setText("cardioAttributePreview", ATTRIBUTES[config.attribute]?.name || "Constituição");
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

  function getProfileClassSummary() {
    const unlocked = Object.keys(ATTRIBUTES)
      .map((key) => ({ key, level: state.attributes[key]?.level || 1 }))
      .filter((item) => item.level >= 10)
      .sort((a, b) => b.level - a.level);
    if (!unlocked.length) return "Novato";
    return ATTRIBUTES[unlocked[0].key].className;
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
    setText("attributeClassStage", attribute.level >= 10 ? info.stageLabel : "Desbloqueia no nível 10");
    setText("attributeMissionLevel", `Nível ${attribute.level}`);
    setText("attributeMissionXp", attribute.level >= MAX_LEVEL ? "Nível máximo" : `${formatNumber(attribute.xp)} / ${formatNumber(requiredXp)} XP`);
    const xpBar = document.getElementById("attributeMissionXpBar");
    if (xpBar) xpBar.style.width = `${clamp(progress, 0, 100)}%`;

    const missions = [...state.missions.daily, ...state.missions.weekly].filter((mission) => missionBelongsToAttribute(mission, key));
    setText("attributeMissionCount", `${missions.length} ${missions.length === 1 ? "missão" : "missões"}`);
    const list = document.getElementById("attributeMissionList");
    if (list) {
      list.innerHTML = missions.length
        ? missions.map((mission) => missionCardMarkup(mission, false)).join("")
        : `<div class="attribute-mission-empty"><strong>Nenhuma missão ativa</strong><span>Novas missões deste atributo aparecerão aqui.</span></div>`;
    }
  }

  function renderClassCollectionItem(attributeKey) {
    const definition = ATTRIBUTES[attributeKey];
    const attribute = state.attributes[attributeKey];
    const info = getClassInfo(attributeKey);
    const locked = attribute.level < 10;

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
      return `<article class="cardio-history-item"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(meta)}</small></div><span>+${formatNumber(entry.xp || 0)} XP</span></article>`;
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
    const stage = Math.min(5, Math.floor(attribute.level / 10));

    if (stage <= 0) {
      return {
        stage,
        stageLabel: `Nv. ${attribute.level}/10`,
        shortLabel: `${definition.className} bloqueado`,
        bonusDescription: `Desbloqueia no nível 10 de ${definition.name}`
      };
    }

    const bonus = attribute.level >= 50
      ? definition.masterBonus
      : definition.unlockBonus;
    const stageLabel = stage >= 5 ? "Mestre" : romanNumeral(stage);
    const shortLabel = stage >= 5
      ? `${definition.className} mestre`
      : `${definition.className} ${romanNumeral(stage)}`;

    return {
      stage,
      stageLabel,
      shortLabel,
      bonusDescription: `+${Math.round(bonus * 100)}% ${definition.bonusLabel}`
    };
  }

  function getUnlockedClassCount() {
    return Object.values(state.attributes).filter(
      (attribute) => attribute.level >= 10
    ).length;
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

  function updateTimeLabels() {
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );
    const nextWeek = nextMonday(now);
    const dailyText = `Renova em ${formatCountdown(tomorrow - now)}`;
    const weeklyText = `Renova em ${formatCountdown(nextWeek - now)}`;

    setText("dailyResetLabel", dailyText);
    setText("dailyCountdown", dailyText);
    setText("weeklyCountdown", weeklyText);
  }

  function formatDecimal(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  }

  function formatCardioDuration(ms) {
    const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function getCardioDerivedMetric(options) {
    const minutes = Number(options.minutes) || 0;
    const distance = Number(options.distance) || 0;
    const distanceMeters = Number(options.distanceMeters) || 0;
    if ((options.type === "outdoor_run" || options.type === "treadmill") && distance > 0 && minutes > 0) {
      const pace = minutes / distance;
      const whole = Math.floor(pace);
      const seconds = Math.round((pace - whole) * 60);
      return `${whole}:${String(seconds).padStart(2, "0")} min/km`;
    }
    if (options.type === "outdoor_bike" && distance > 0 && minutes > 0) {
      return `${formatDecimal(distance / (minutes / 60), 1)} km/h méd.`;
    }
    if (options.type === "rowing" && distanceMeters > 0 && minutes > 0) {
      const splitMinutes = minutes / (distanceMeters / 500);
      const whole = Math.floor(splitMinutes);
      const seconds = Math.round((splitMinutes - whole) * 60);
      return `${whole}:${String(seconds).padStart(2, "0")} /500m`;
    }
    return "";
  }

  function renderCardioConfirmationFields() {
    const container = document.getElementById("cardioConfirmFields");
    if (!container || !pendingCardioRecord) return;
    const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
    container.innerHTML = config.fields.map((field) => `
      <label class="cardio-confirm-field">
        <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
        <div class="cardio-input-unit">
          <input data-cardio-field="${escapeHtml(field.key)}" type="number" inputmode="decimal" min="${field.min ?? 0}" step="${field.step ?? 1}" placeholder="0" ${field.required ? "required" : ""}>
          <small>${escapeHtml(field.unit)}</small>
        </div>
      </label>`).join("");
    container.querySelectorAll("[data-cardio-field]").forEach((input) => {
      input.addEventListener("input", () => {
        pendingCardioRecord.values[input.dataset.cardioField] = Math.max(0, Number(input.value) || 0);
        updateCardioConfirmationSummary();
      });
    });
  }

  function updateCardioConfirmationSummary() {
    if (!pendingCardioRecord) return;
    const options = readActivityOptions("cardio");
    const calculation = calculateActivityXp("cardio", options);
    setText("cardioConfirmXp", `${formatNumber(calculation.xp)} XP`);
    const derived = getCardioDerivedMetric(options);
    const note = document.getElementById("cardioConfirmNote");
    if (note) note.textContent = derived ? `Calculado automaticamente: ${derived}.` : "Preencha os dados da máquina ou atividade para concluir o registro.";
  }

  function validateCardioConfirmation() {
    if (!pendingCardioRecord) return false;
    const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
    for (const field of config.fields) {
      if (field.required && !(Number(pendingCardioRecord.values[field.key]) > 0)) {
        const input = document.querySelector(`[data-cardio-field="${field.key}"]`);
        input?.focus();
        showToast("Dado necessário", `Informe ${field.label.toLowerCase()} para concluir o registro.`, "!");
        return false;
      }
    }
    return true;
  }

  function startCardioTimer() {
    pendingCardioRecord = { type: document.getElementById("cardioMode")?.value || "treadmill", values: {}, minutes: 0 };
    if (cardioTimerInterval) {
      window.clearInterval(cardioTimerInterval);
    }

    cardioTimerElapsedMs = 0;
    cardioTimerPaused = false;
    cardioTimerStartedAt = Date.now();
    toggleCardioPanels(true);
    updateCardioTimerDisplay();
    setText("cardioTimerState", "Cardio em andamento");
    cardioTimerInterval = window.setInterval(updateCardioTimerDisplay, 250);
  }

  function pauseResumeCardioTimer() {
    if (cardioTimerElapsedMs <= 0 && !cardioTimerStartedAt) return;

    if (cardioTimerPaused) {
      cardioTimerPaused = false;
      cardioTimerStartedAt = Date.now();
      setText("cardioTimerState", "Cardio em andamento");
      const button = document.getElementById("cardioPauseButton");
      if (button) button.setAttribute("aria-label", "Pausar cardio");
      if (!cardioTimerInterval) cardioTimerInterval = window.setInterval(updateCardioTimerDisplay, 250);
    } else {
      cardioTimerElapsedMs += Date.now() - cardioTimerStartedAt;
      cardioTimerPaused = true;
      cardioTimerStartedAt = null;
      setText("cardioTimerState", "Pausado");
      const button = document.getElementById("cardioPauseButton");
      if (button) button.setAttribute("aria-label", "Continuar cardio");
    }
    updateCardioTimerDisplay();
  }

  function getCurrentCardioElapsedMs() {
    if (!cardioTimerStartedAt) return cardioTimerElapsedMs;
    return cardioTimerElapsedMs + (Date.now() - cardioTimerStartedAt);
  }

  function updateCardioTimerDisplay() {
    const elapsed = Math.max(0, getCurrentCardioElapsedMs());
    const totalSeconds = Math.floor(elapsed / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    setText(
      "cardioTimerDisplay",
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    );
  }

  function stopCardioTimer() {
    if (!cardioTimerStartedAt && cardioTimerElapsedMs <= 0) return;

    if (cardioTimerStartedAt) {
      cardioTimerElapsedMs += Date.now() - cardioTimerStartedAt;
      cardioTimerStartedAt = null;
    }
    cardioTimerPaused = true;
    if (cardioTimerInterval) {
      window.clearInterval(cardioTimerInterval);
      cardioTimerInterval = null;
    }
    updateCardioTimerDisplay();
    if (!pendingCardioRecord) pendingCardioRecord = { type: document.getElementById("cardioMode")?.value || "treadmill", values: {} };
    pendingCardioRecord.minutes = Math.max(1 / 60, cardioTimerElapsedMs / 60000);
    openCardioConfirmation();
  }

  function openCardioConfirmation() {
    if (!pendingCardioRecord) return;
    const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
    setText("cardioConfirmType", config.label);
    setText("cardioConfirmTime", formatCardioDuration(cardioTimerElapsedMs));
    renderCardioConfirmationFields();
    updateCardioConfirmationSummary();
    const overlay = document.getElementById("cardioConfirmOverlay");
    if (overlay) overlay.hidden = false;
  }

  function closeCardioConfirmation(resetTimer = false) {
    const overlay = document.getElementById("cardioConfirmOverlay");
    if (overlay) overlay.hidden = true;
    if (resetTimer) resetCardioTimer();
  }

  function confirmTimedCardio() {
    if (!validateCardioConfirmation()) return;
    closeCardioConfirmation(false);
    registerActivity("cardio");
    showToast(
      "Cardio finalizado!",
      "Tempo e dados da atividade foram adicionados ao histórico.",
      "✓"
    );
    resetCardioTimer();
  }


  function resetCardioTimer() {
    if (cardioTimerInterval) window.clearInterval(cardioTimerInterval);
    cardioTimerInterval = null;
    cardioTimerStartedAt = null;
    cardioTimerElapsedMs = 0;
    cardioTimerPaused = false;
    pendingCardioRecord = null;
    setText("cardioTimerDisplay", "00:00:00");
    setText("cardioTimerState", "Cardio em andamento");
    const button = document.getElementById("cardioPauseButton");
    if (button) button.setAttribute("aria-label", "Pausar cardio");
    toggleCardioPanels(false);
  }


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
    state.stats.totalActivities += 1;
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

  const SOCIAL_GROUPS = [
    { id: "golo", name: "Golo", tagline: "Força e constância", members: 18, focus: "Força" },
    { id: "agronegocio", name: "Agronegócio", tagline: "Evolução em equipe", members: 24, focus: "Equilíbrio" },
    { id: "rubra", name: "Rubra", tagline: "Treino sem desculpas", members: 12, focus: "Determinação" }
  ];

  const SOCIAL_MEMBERS = [
    { id: "andre", name: "André Lima", title: "Prometheus", className: "Prometheus", level: 8, series: 15, minutes: 60, volume: 10000, initials: "AL", levels: [6,5,7,8,4,5] },
    { id: "caio", name: "Caio Sykez", title: "Fullbody", className: "Jogador Nato", level: 6, series: 15, minutes: 60, volume: 10000, initials: "CS", levels: [5,6,5,7,4,4] },
    { id: "willar", name: "Willar Carolina", title: "Upper I", className: "Soladora Das Sombras", level: 7, series: 15, minutes: 60, volume: 10000, initials: "WC", levels: [4,6,6,7,5,5] }
  ];

  function socialMissionMarkup(mission) {
    const target = Math.max(1, Number(mission?.target || 1));
    const progress = Math.max(0, Number(mission?.progress || 0));
    const percent = clamp((progress / target) * 100, 0, 100);
    const reward = mission?.reward ? missionRewardLabel(mission.reward) : "XP";
    return `<article class="social-mission-card">
      <div class="social-mission-copy">
        <strong>${escapeHtml(mission?.name || "Missão")}</strong>
        <small>${escapeHtml(mission?.description || "Complete a missão para ganhar XP.")}</small>
        <div class="social-mini-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${progress}"><i style="width:${percent}%"></i></div>
      </div>
      <span class="social-mission-reward">${escapeHtml(reward)}</span>
    </article>`;
  }

  function socialMemberMarkup(member) {
    return `<button class="social-member-card" type="button" data-social-member="${member.id}">
      <span class="social-avatar">${escapeHtml(member.initials)}</span>
      <span class="social-member-main"><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.className)}</small><b>${escapeHtml(member.title)}</b></span>
      <span class="social-member-status">Novo registro!</span>
      <span class="social-member-metrics"><em><b>${member.series}</b><small>Séries</small></em><em><b>${member.minutes} min</b><small>Tempo</small></em><em><b>${Math.round(member.volume/1000)}k kg</b><small>Volume</small></em></span>
    </button>`;
  }

  function showSocialPanel(panelId) {
    ["socialHomePanel","socialSearchPanel","socialGroupPanel","socialMemberPanel"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = id !== panelId;
    });
  }

  function renderSocialSearch() {
    const input = document.getElementById("socialGroupSearch");
    const results = document.getElementById("socialGroupSearchResults");
    if (!results) return;
    const query = normalizeSearchText(input?.value || "");
    const groups = SOCIAL_GROUPS.filter((group) => !query || normalizeSearchText(`${group.name} ${group.tagline} ${group.focus}`).includes(query));
    results.innerHTML = groups.length ? groups.map((group) => `<button class="social-search-row" type="button" data-social-group="${group.id}"><span class="social-search-avatar">${escapeHtml(group.name.slice(0,2).toUpperCase())}</span><span><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(group.tagline)}</small></span><b>＋</b></button>`).join("") : `<div class="social-empty-state">Nenhum grupo encontrado.</div>`;
  }

  function openSocialSearch() {
    showSocialPanel("socialSearchPanel");
    renderSocialSearch();
    window.setTimeout(() => document.getElementById("socialGroupSearch")?.focus(), 0);
  }

  function openSocialGroup(groupId = "agronegocio") {
    const group = SOCIAL_GROUPS.find((item) => item.id === groupId) || SOCIAL_GROUPS[1];
    const detail = document.getElementById("socialGroupDetail");
    if (!detail) return;
    detail.innerHTML = `<div class="social-group-hero"><span class="social-group-avatar">${escapeHtml(group.name.slice(0,2).toUpperCase())}</span><h2>${escapeHtml(group.name)}</h2><p>${escapeHtml(group.tagline)}</p><div class="social-group-stats"><span><b>Top 1</b><small>Ranking local</small></span><span><b>${group.members}</b><small>Membros</small></span><span><b>${escapeHtml(group.focus)}</b><small>Foco</small></span></div></div><div class="social-group-members">${SOCIAL_MEMBERS.map(socialMemberMarkup).join("")}</div>`;
    showSocialPanel("socialGroupPanel");
  }

  function openSocialMember(memberId) {
    const member = SOCIAL_MEMBERS.find((item) => item.id === memberId) || SOCIAL_MEMBERS[0];
    const detail = document.getElementById("socialMemberDetail");
    if (!detail) return;
    const attrs = ["Força","Agilidade","Constituição","Determinação","Inteligência","Carisma"];
    detail.innerHTML = `<div class="social-member-hero"><span class="social-profile-avatar">${escapeHtml(member.initials)}</span><h2>${escapeHtml(member.name)}</h2><p>${escapeHtml(member.className)}</p><div class="social-profile-stats"><span><b>Nv. ${member.level}</b><small>Nível</small></span><span><b>${member.minutes} min</b><small>Treino</small></span><span><b>${Math.round(member.volume/1000)}k kg</b><small>Volume</small></span></div></div><section class="social-attribute-list"><h3>Atributos</h3>${attrs.map((name,index)=>`<div class="social-attribute-row"><span><strong>${name}</strong><small>Level ${member.levels[index]}</small></span><i><b style="width:${Math.min(100, member.levels[index]*10)}%"></b></i></div>`).join("")}</section>`;
    showSocialPanel("socialMemberPanel");
  }

  function renderSocial() {
    setText("socialPlayerName", state?.player?.name || "Jogador");
    const missions = document.getElementById("socialWeeklyMissions");
    if (missions) {
      const source = state?.missions?.weekly?.length ? state.missions.weekly : state?.missions?.daily || [];
      missions.innerHTML = source.slice(0, 3).map(socialMissionMarkup).join("");
    }
    const members = document.getElementById("socialGroupMembers");
    if (members) members.innerHTML = SOCIAL_MEMBERS.map(socialMemberMarkup).join("");
  }

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
    try { localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(loadDietState())); }
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

  function toggleCardioPanels(running) {
    const launch = document.getElementById("cardioLaunchPanel");
    const live = document.getElementById("cardioLivePanel");
    if (launch) launch.hidden = running;
    if (live) live.hidden = !running;
  }


  const HELP_CONTENT = {
    social: {
      title: "Área Social",
      html: `<p>A área Social reúne grupo, desafios e progresso compartilhado.</p><ul><li>Acompanhe missões rápidas.</li><li>Veja companheiros e grupos.</li><li>Recursos sociais maiores podem ser conectados a um backend no futuro.</li></ul>`
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
      html: `<ol><li>Escolha cardio contínuo ou corrida/velocidade.</li><li>Inicie o cronômetro.</li><li>Pause quando necessário.</li><li>Finalize e confirme o registro.</li></ol><p class="help-tip">Cardio contínuo evolui Constituição; corrida/velocidade evolui Agilidade.</p>`
    },
    diet: {
      title: "Como usar a Dieta",
      html: `<ol><li>Toque em “Adicionar alimento” na refeição.</li><li>Pesquise na base TACO.</li><li>Informe a quantidade em gramas.</li><li>Os macros e calorias são recalculados automaticamente.</li></ol><p class="help-tip">Os dados nutricionais são calculados a partir dos valores por 100 g da TACO.</p>`
    },
    profile: {
      title: "Perfil e atributos",
      html: `<p>O radar resume os seis atributos do RPG GYM.</p><ul><li>Quanto mais distante do centro, maior o nível.</li><li>Cada atributo possui XP e progressão próprios.</li><li>Marcos desbloqueiam classes, títulos e afinidade.</li><li>Configurações pessoais ficam no botão “Configurações”.</li></ul>`
    }
  };

  function openHelp(key) {
    const data = HELP_CONTENT[key] || HELP_CONTENT.profile;
    const overlay = document.getElementById("helpOverlay");
    if (!overlay) return;
    setText("helpModalTitle", data.title);
    const content = document.getElementById("helpModalContent");
    if (content) content.innerHTML = data.html;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeHelp() {
    const overlay = document.getElementById("helpOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }
  function bindEvents() {
    document.addEventListener("click", (event) => {
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
    document.getElementById("socialSeeGroup")?.addEventListener("click", () => openSocialGroup("agronegocio"));
    document.getElementById("socialGroupSearch")?.addEventListener("input", renderSocialSearch);
    document.getElementById("startEmptyWorkout")?.addEventListener("click", startEmptyWorkout);
    document.getElementById("createRoutineButton")?.addEventListener("click", () => openRoutineEditor(false));
    document.getElementById("browseExercisesButton")?.addEventListener("click", () => openExercisePicker("browse"));
    document.getElementById("manageRoutinesButton")?.addEventListener("click", () => showToast("Rotinas", "Use o botão ••• em uma rotina para excluí-la.", "ℹ"));
    document.getElementById("cancelWorkoutButton")?.addEventListener("click", cancelWorkout);
    document.getElementById("finishWorkoutButton")?.addEventListener("click", finishStrengthWorkout);
    document.getElementById("actionConfirmCancel")?.addEventListener("click", () => closeActionConfirmation(false));
    document.getElementById("actionConfirmContinue")?.addEventListener("click", () => closeActionConfirmation(true));
    document.getElementById("closeWorkoutResult")?.addEventListener("click", closeWorkoutResult);
    document.getElementById("addExerciseButton")?.addEventListener("click", () => openExercisePicker("workout"));
    document.getElementById("saveWorkoutAsRoutine")?.addEventListener("click", () => { const active=state.workouts.active; if(active?.routineId) openRoutineEditor(false, active.routineId); else openRoutineEditor(true); });
    document.getElementById("activeWorkoutName")?.addEventListener("input", (event) => { if (state.workouts.active) { state.workouts.active.name = event.target.value; saveGame(); } });
    document.getElementById("workoutExerciseList")?.addEventListener("input", (event) => { if (event.target.matches("[data-set-field]")) updateWorkoutField(event.target); if (event.target.matches("[data-exercise-note]")) { const ex=findWorkoutExercise(event.target.dataset.exerciseNote); if(ex){ex.notes=event.target.value;saveGame();} } });
    document.getElementById("closeExercisePicker")?.addEventListener("click", closeExercisePicker);
    document.getElementById("confirmExercisePicker")?.addEventListener("click", confirmExercisePicker);
    document.getElementById("exerciseSearch")?.addEventListener("input", renderExercisePicker);
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
    document.getElementById("foodSearch")?.addEventListener("input", renderFoodSearch);
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
    document.getElementById("dietEditOverlay")?.addEventListener("click", (event) => { if (event.target.id === "dietEditOverlay") closeDietItemEditor(); });

    document.getElementById("celebration")?.addEventListener("click", (event) => {
      if (event.target.id === "celebration") {
        closeCelebration();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.getElementById("actionConfirmOverlay")?.hidden) closeActionConfirmation(false);
      else if (event.key === "Escape" && celebrationOpen) closeCelebration();
      else if (event.key === "Escape" && !document.getElementById("exercisePickerOverlay")?.hidden) closeExercisePicker();
      else if (event.key === "Escape" && !document.getElementById("routineEditorOverlay")?.hidden) closeRoutineEditor();
      else if (event.key === "Escape" && !document.getElementById("helpOverlay")?.hidden) closeHelp();
      else if (event.key === "Escape" && !document.getElementById("profileSettingsOverlay")?.hidden) closeProfileSettings();
      else if (event.key === "Escape" && !document.getElementById("dietEditOverlay")?.hidden) closeDietItemEditor();
      else if (event.key === "Escape" && !document.getElementById("dietSettingsOverlay")?.hidden) closeDietSettings();
      else if (event.key === "Escape" && !document.getElementById("foodPickerOverlay")?.hidden) closeFoodPicker();
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
        state = migrateState(JSON.parse(event.newValue));
        profileHydrated = false;
        normalizeTemporalState();
        ensureMissions();
        refreshMissionProgress();
        syncDerivedState();
        hydrateProfileForm();
        updateUI();
        showToast(
          "Progresso sincronizado",
          "Outra aba atualizou os dados locais.",
          "✓"
        );
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (viewName === "character") {
      const main = document.getElementById("profileMainPanel");
      const attributePanel = document.getElementById("attributeMissionsPanel");
      if (main && attributePanel) {
        attributePanel.hidden = true;
        main.hidden = false;
      }
      window.setTimeout(drawRadarChart, 80);
    } else if (viewName === "diet") {
      renderDiet();
    }
  }

  function resetProgress() {
    requestConfirmation({title:"Resetar todo o progresso?",message:"Níveis, XP, missões, streak, histórico, rotinas e treinos serão apagados deste navegador. Esta ação não pode ser desfeita.",confirmLabel:"Resetar tudo",cancelLabel:"Cancelar",danger:true,icon:"!",details:[{label:"Nível global",value:state.globalLevel||1},{label:"XP total",value:formatNumber((state.history||[]).reduce((sum,item)=>sum+(Number(item.xp)||0),0))}]},()=>{
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(DIET_STORAGE_KEY); } catch (error) { console.warn("Não foi possível limpar o armazenamento.", error); }
      state = createDefaultState(); profileHydrated = false; celebrationQueue = []; normalizeTemporalState(); ensureMissions(); refreshMissionProgress(); syncDerivedState(); hydrateProfileForm(); saveGame(); updateUI(); setActiveView("social"); showToast("Progresso resetado", "Uma nova jornada foi iniciada.", "↻");
    });
  }

  function showToast(title, message, icon = "✦", duration = 4_800) {
    const region = document.getElementById("toastRegion");
    if (!region) {
      return;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
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

  function getEntriesForDate(dateKey) {
    return state.history.filter(
      (entry) => (!entry.kind || entry.kind === "activity") && entry.dateKey === dateKey
    );
  }

  function getCurrentWeekDays() {
    const start = dateFromKey(weekStartKey());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  function weekStartKey(date = new Date()) {
    const normalized = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12
    );
    const dayIndex = (normalized.getDay() + 6) % 7;
    normalized.setDate(normalized.getDate() - dayIndex);
    return localDateKey(normalized);
  }

  function nextMonday(date = new Date()) {
    const result = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0
    );
    const daysUntilMonday = ((8 - result.getDay()) % 7) || 7;
    result.setDate(result.getDate() + daysUntilMonday);
    return result;
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateFromKey(dateKey) {
    const [year, month, day] = String(dateKey)
      .split("-")
      .map((value) => Number(value));
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function daysBetweenDateKeys(fromKey, toKey) {
    const from = dateFromKey(fromKey);
    const to = dateFromKey(toKey);
    return Math.round((to.getTime() - from.getTime()) / DAY_MS);
  }

  function formatHistoryDate(date, dateKey) {
    const today = localDateKey();
    const yesterday = localDateKey(
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1)
    );
    const time = timeFormatter.format(date);

    if (dateKey === today) {
      return `Hoje, ${time}`;
    }
    if (dateKey === yesterday) {
      return `Ontem, ${time}`;
    }
    return `${shortDateFormatter.format(date)}, ${time}`;
  }

  function formatCountdown(milliseconds) {
    const safeMs = Math.max(0, milliseconds);
    const totalMinutes = Math.ceil(safeMs / 60_000);
    const days = Math.floor(totalMinutes / 1_440);
    const hours = Math.floor((totalMinutes % 1_440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  function formatMultiplier(multiplier) {
    return `${Number(multiplier).toFixed(1).replace(".", ",")}x`;
  }

  function formatNumber(value) {
    return numberFormatter.format(Math.round(Number(value) || 0));
  }

  function formatDays(days) {
    return `${days} ${pluralize(days, "dia", "dias")}`;
  }

  function pluralize(value, singular, plural) {
    return Number(value) === 1 ? singular : plural;
  }

  function romanNumeral(value) {
    return ["", "I", "II", "III", "IV", "V"][clampInteger(value, 0, 5)] || "";
  }

  function getInitials(name) {
    const parts = String(name || "Jogador")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "JG";
    }

    const first = parts[0][0] || "J";
    const second = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || "G";
    return `${first}${second}`.toUpperCase();
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function clampInteger(value, minimum, maximum) {
    return Math.trunc(clamp(value, minimum, maximum));
  }

  function capitalizeFirst(value) {
    const text = String(value || "");
    return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = String(value);
    }
  }

  function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.value = String(value ?? "");
    }
  }

  function setProgress(trackId, barId, percentage) {
    const track = document.getElementById(trackId);
    const bar = document.getElementById(barId);
    const value = clamp(percentage, 0, 100);

    if (track) {
      track.setAttribute("aria-valuenow", String(Math.round(value)));
    }
    if (bar) {
      bar.style.width = `${value}%`;
    }
  }
})();

"use strict";

function ensureMissions() {
  const todayKey = localDateKey();
  const weekKey = weekStartKey();
  state.missions ||= createDefaultState().missions;
  if (!state.missions.seed) state.missions.seed = createMissionSeed();
  state.missions.recentDailyTemplates = Array.isArray(state.missions.recentDailyTemplates) ? state.missions.recentDailyTemplates : [];
  state.missions.recentWeeklyTemplates = Array.isArray(state.missions.recentWeeklyTemplates) ? state.missions.recentWeeklyTemplates : [];

  const validDailyIds = new Set(DAILY_MISSION_TEMPLATES.map((item) => item.templateId));
  const validWeeklyIds = new Set(WEEKLY_MISSION_TEMPLATES.map((item) => item.templateId));
  const dailyNeedsRefresh = state.missions.dailyKey !== todayKey || state.missions.daily.length !== 3 || state.missions.daily.some((item) => !validDailyIds.has(item.templateId));
  const weeklyNeedsRefresh = state.missions.weeklyKey !== weekKey || state.missions.weekly.length !== 3 || state.missions.weekly.some((item) => !validWeeklyIds.has(item.templateId));

  if (dailyNeedsRefresh) {
    rememberMissionTemplates("daily");
    state.missions.dailyKey = todayKey;
    state.missions.daily = generateDailyMissions(todayKey);
  }

  if (weeklyNeedsRefresh) {
    rememberMissionTemplates("weekly");
    state.missions.weeklyKey = weekKey;
    state.missions.weekly = generateWeeklyMissions(weekKey);
  }
}

function createMissionSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(2);
    globalThis.crypto.getRandomValues(bytes);
    return `${bytes[0].toString(36)}${bytes[1].toString(36)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function rememberMissionTemplates(period) {
  const listKey = period === "weekly" ? "weekly" : "daily";
  const recentKey = period === "weekly" ? "recentWeeklyTemplates" : "recentDailyTemplates";
  const ids = (state.missions[listKey] || []).map((mission) => mission.templateId).filter(Boolean);
  const max = period === "weekly" ? 9 : 12;
  state.missions[recentKey] = [...ids, ...(state.missions[recentKey] || [])].filter((id, index, array) => array.indexOf(id) === index).slice(0, max);
}

function generateDailyMissions(dateKey = localDateKey()) {
  return selectMissionTemplates({
    templates: DAILY_MISSION_TEMPLATES,
    count: 3,
    seedText: `${state.missions.seed}|daily|${dateKey}`,
    recentIds: state.missions.recentDailyTemplates || [],
    categoryCaps: { training: 1, cardio: 1, diet: 1, consistency: 1, mixed: 1 }
  }).map((template) => createMissionFromTemplate(template, "daily", dateKey));
}

function generateWeeklyMissions(weekKey = weekStartKey()) {
  return selectMissionTemplates({
    templates: WEEKLY_MISSION_TEMPLATES,
    count: 3,
    seedText: `${state.missions.seed}|weekly|${weekKey}`,
    recentIds: state.missions.recentWeeklyTemplates || [],
    categoryCaps: { training: 1, cardio: 1, diet: 1, consistency: 1, mixed: 1 }
  }).map((template) => createMissionFromTemplate(template, "weekly", weekKey));
}

function selectMissionTemplates({ templates, count, seedText, recentIds = [], categoryCaps = {} }) {
  const eligible = templates.filter(isMissionTemplateEligible);
  const preferred = eligible.filter((item) => !recentIds.includes(item.templateId));
  const fallback = eligible.filter((item) => recentIds.includes(item.templateId));
  const ordered = [...deterministicShuffle(preferred, `${seedText}|fresh`), ...deterministicShuffle(fallback, `${seedText}|recent`)];
  const chosen = [];
  const categoryCount = {};

  for (const template of ordered) {
    const category = template.category || "other";
    const cap = Number(categoryCaps[category] ?? count);
    if ((categoryCount[category] || 0) >= cap) continue;
    if (chosen.some((item) => missionsOverlapTooMuch(item, template))) continue;
    chosen.push(template);
    categoryCount[category] = (categoryCount[category] || 0) + 1;
    if (chosen.length >= count) break;
  }

  if (chosen.length < count) {
    for (const template of ordered) {
      if (chosen.includes(template)) continue;
      if (chosen.some((item) => missionsOverlapTooMuch(item, template))) continue;
      chosen.push(template);
      if (chosen.length >= count) break;
    }
  }
  return chosen.slice(0, count);
}

function isMissionTemplateEligible(template) {
  // Social fica fora da rotação até existir funcionalidade social real com backend.
  if (template.category === "social") return false;
  return true;
}

function missionsOverlapTooMuch(a, b) {
  const signature = (template) => {
    const metric = template.metric || {};
    if (metric.type === "all") return new Set((metric.requirements || []).map((item) => item.type));
    return new Set([metric.type]);
  };
  const left = signature(a);
  const right = signature(b);
  const overlap = [...left].filter((type) => right.has(type));
  if (!overlap.length) return false;
  // Evita pares redundantes como “1 treino” + “1 treino e 2 refeições”.
  if (left.size === 1 || right.size === 1) return true;
  return overlap.length >= Math.min(left.size, right.size);
}

function createMissionFromTemplate(template, period, periodKey) {
  return {
    id: `${period}-${periodKey}-${template.templateId}`,
    templateId: template.templateId,
    category: template.category || "other",
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

function deterministicShuffle(source, seedText) {
  const items = source.map((item) => item);
  let seed = hashString(seedText);
  for (let index = items.length - 1; index > 0; index -= 1) {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    const swapIndex = seed % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
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
  if (typeof structuredClone === "function") return structuredClone(value);
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
  const metric = mission.metric || {};
  if (metric.type === "all") {
    const requirements = Array.isArray(metric.requirements) ? metric.requirements : [];
    return requirements.reduce((done, requirement) => done + (missionMetricValue(requirement, mission.type) >= Number(requirement.target || 1) ? 1 : 0), 0);
  }
  return Math.min(mission.target, Math.max(0, missionMetricValue(metric, mission.type)));
}

function missionMetricValue(metric, period) {
  const keys = missionPeriodDateKeys(period);
  const days = keys.map((key) => state.stats?.daily?.[key] || createEmptyDailyStats());
  const sum = (field) => days.reduce((total, day) => total + Math.max(0, Number(day[field]) || 0), 0);
  const countDays = (predicate) => days.filter(predicate).length;

  switch (metric.type) {
    case "workouts": return sum("workouts");
    case "workoutDays": return countDays((day) => Number(day.workouts) > 0);
    case "sets": return sum("sets");
    case "compoundSets": return sum("compoundSets");
    case "volumeKg": return sum("volumeKg");
    case "cardioSessions": return sum("cardioSessions");
    case "cardioMinutes": return sum("cardioMinutes");
    case "cardioDistanceKm": return sum("cardioDistanceKm");
    case "cardioDays": return countDays((day) => Number(day.cardioSessions) > 0);
    case "meals": return sum("meals");
    case "foodEntries": return sum("foodEntries");
    case "nutritionDays": return countDays((day) => Number(day.meals) > 0 || Number(day.foodEntries) > 0);
    case "dietFinalized": return days.some((day) => day.dietFinalized) ? 1 : 0;
    case "dietFinalizedDays": return countDays((day) => Boolean(day.dietFinalized));
    case "activeToday": return days.some(isStatsDayActive) ? 1 : 0;
    case "activeDays": return countDays(isStatsDayActive);
    case "uniqueExercises": return uniqueExercisesInPeriod(period);
    default: return 0;
  }
}

function isStatsDayActive(day) {
  return Number(day.workouts) > 0 || Number(day.cardioSessions) > 0 || Number(day.meals) > 0 || Number(day.socialSessions) > 0 || Number(day.activityCount) > 0;
}

function missionPeriodDateKeys(period) {
  if (period === "daily") return [localDateKey()];
  const start = new Date(`${weekStartKey()}T12:00:00`);
  const today = new Date(`${localDateKey()}T12:00:00`);
  const keys = [];
  for (let cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) keys.push(localDateKey(cursor));
  return keys;
}

function uniqueExercisesInPeriod(period) {
  const validKeys = new Set(missionPeriodDateKeys(period));
  const ids = new Set();
  for (const session of state.workouts?.sessions || []) {
    const timestamp = session?.finishedAt || session?.startedAt;
    if (!timestamp || !validKeys.has(localDateKey(new Date(timestamp)))) continue;
    for (const exercise of session.exercises || []) if (exercise?.exerciseId) ids.add(exercise.exerciseId);
  }
  return ids.size;
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

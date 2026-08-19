"use strict";

/*
 * Runtime indexes and session-only state.
 *
 * Large static databases stay as arrays for rendering/export compatibility, while
 * the application uses Maps and precomputed indexes for hot-path lookups. This
 * avoids repeated Array.find/filter calls when rendering workouts and diet logs.
 */
const EXERCISE_DATABASE = Object.freeze(window.RPG_GYM_EXERCISES || []);
const FOOD_DATABASE = Object.freeze(window.RPG_GYM_FOODS || []);
const FOOD_COMMON_DATABASE = Object.freeze(FOOD_DATABASE.filter((food) => food.common !== false));
const DIET_STORAGE_KEY = "rpgGymDiet_v1";

const EXERCISE_BY_ID = new Map(EXERCISE_DATABASE.map((exercise) => [String(exercise.id), exercise]));
const FOOD_BY_ID = new Map(FOOD_DATABASE.map((food) => [Number(food.id), food]));

const EXERCISE_MUSCLES = Object.freeze(
  [...new Set(EXERCISE_DATABASE.flatMap((exercise) => exercise.primaryMuscles || []))].sort((a, b) => a.localeCompare(b, "pt-BR"))
);
const EXERCISE_EQUIPMENT = Object.freeze(
  [...new Set(EXERCISE_DATABASE.map((exercise) => exercise.equipment).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))
);

const FOOD_COMMON_BY_GROUP = (() => {
  const groups = new Map();
  for (const food of FOOD_COMMON_DATABASE) {
    if (!groups.has(food.group)) groups.set(food.group, []);
    groups.get(food.group).push(food);
  }
  for (const foods of groups.values()) {
    foods.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    Object.freeze(foods);
  }
  return groups;
})();

function runtimeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const EXERCISE_SEARCH_INDEX = Object.freeze(
  EXERCISE_DATABASE.map((exercise) => ({
    exercise,
    text: runtimeSearchText([
      exercise.name,
      ...(exercise.primaryMuscles || []),
      ...(exercise.secondaryMuscles || []),
      exercise.equipment,
      exercise.category
    ].filter(Boolean).join(" "))
  }))
);

const FOOD_SEARCH_INDEX = Object.freeze(
  FOOD_DATABASE.map((food) => ({
    food,
    text: runtimeSearchText([food.name, food.group, ...(food.aliases || [])].filter(Boolean).join(" "))
  }))
);

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

/* Mutable runtime state. None of these values are persisted directly. */
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

let workoutElapsedInterval = null;
let activeExerciseSetTimer = null;
let pickerTarget = "workout";
let pickerSelectedIds = new Set();
let routineDraft = null;
let confirmationAction = null;
let workoutResultProgressEvents = [];
let cardioResultContext = null;
let showAllAchievements = false;
let exercisePickerReturnToRoutine = false;
let restTimerInterval = null;
let restTimerSeconds = 0;
let dietState = null;
let dietDateOffset = 0;
let foodPickerMealKey = "breakfast";
let editingDietItem = null;
let pendingSaveTimer = null;

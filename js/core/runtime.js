"use strict";

const EXERCISE_DATABASE = Object.freeze(window.RPG_GYM_EXERCISES || []);
const FOOD_DATABASE = Object.freeze(window.RPG_GYM_FOODS || []);
const FOOD_COMMON_DATABASE = Object.freeze(FOOD_DATABASE.filter((food) => food.common !== false));
const DIET_STORAGE_KEY = "rpgGymDiet_v1";

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

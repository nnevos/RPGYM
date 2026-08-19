"use strict";

// RPG GYM v0.3.7 - Modelo A rebalanceado + afinidades de cardio: progressao desacelera naturalmente, sem cap de XP.
// Altere numeros aqui antes de tocar nas engines.
const BALANCE = Object.freeze({
  levelCurve: {
    base: 40,
    exponent: 1.18
  },
  bonuses: {
    levelPerLevel: 0.002,
    levelCap: 0.10,
    totalCap: 0.25,
    classByMilestone: { 10: 0.03, 20: 0.05, 30: 0.07, 40: 0.10, 50: 0.15 }
  },
  workout: {
    completionXp: 85,
    setXp: 4,
    fullSetUntil: 20,
    reducedSetXp: 1.5,
    warmupMultiplier: 0.35,
    compoundBonusPerSet: 0, // compostos contam para roadmap; nao inflam XP direto
    minWorkingSetsForFullCompletion: 6,
    shortSessionCompletionMultiplier: 0.35,
    mediumSessionCompletionMultiplier: 0.65,
    prBonus: 14,
    maxPrBonusesPerWorkout: 3,
    prImprovementRatio: 0.01
  },
  cardio: {
    completionXp: 55,
    minMinutesForFullCompletion: 10,
    first30PerMinute: 1.25,
    minute31to60: 0.65,
    after60PerMinute: 0.35,
    distanceBonusPerKm: 0, // distancia fica para roadmap e performance; evita favorecer uma maquina
    performanceBonus: 16,
    performanceImprovementRatio: 0.01,
    secondaryAttributeMaxRatio: 0.30
  },
  diet: {
    mealXp: 7,
    maxRewardedMealsPerDay: 4,
    finalizeDayXp: 20,
    completeDayBonusXp: 12
  },
  missions: {
    dailyXp: { easy: 7, normal: 9, hard: 11 },
    weeklyXp: { easy: 30, normal: 44, hard: 61, epic: 72 },
    activityShareTarget: 0.78
  },
  consistency: {
    firstActiveDayXp: 10
  },
  globalLevel: {
    // Carisma volta para a média quando o Social possuir uma fonte recorrente real.
    activeAttributes: ["force", "agility", "constitution", "intelligence", "determination"]
  },
  roadmap: {
    xpByMilestone: { 5: 50, 10: 100, 15: 100, 20: 150, 25: 150, 30: 200, 35: 200, 40: 300, 45: 300, 50: 500 }
  },
  antiFarm: {
    // O contador reinicia a cada dia e por categoria. Musculacao nao reduz cardio e vice-versa.
    sameCategoryDailyMultipliers: [1, 0.75, 0.50],
    fourthPlusSameCategoryMultiplier: 0.40
  }
});

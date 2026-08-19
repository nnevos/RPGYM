"use strict";

// RPG GYM v0.3.4 - Modelo A + afinidades de cardio: progressao desacelera naturalmente, sem cap de XP.
// Altere numeros aqui antes de tocar nas engines.
const BALANCE = Object.freeze({
  levelCurve: {
    base: 120,
    exponent: 1.35
  },
  bonuses: {
    levelPerLevel: 0.002,
    levelCap: 0.10,
    totalCap: 0.25,
    classByMilestone: { 10: 0.03, 20: 0.05, 30: 0.07, 40: 0.10, 50: 0.15 }
  },
  workout: {
    completionXp: 60,
    setXp: 3,
    fullSetUntil: 20,
    reducedSetXp: 1,
    warmupMultiplier: 0.35,
    compoundBonusPerSet: 0, // compostos contam para roadmap; nao inflam XP direto
    minWorkingSetsForFullCompletion: 6,
    shortSessionCompletionMultiplier: 0.35,
    mediumSessionCompletionMultiplier: 0.65,
    prBonus: 10,
    maxPrBonusesPerWorkout: 3,
    prImprovementRatio: 0.01
  },
  cardio: {
    completionXp: 40,
    minMinutesForFullCompletion: 10,
    first30PerMinute: 1,
    minute31to60: 0.5,
    after60PerMinute: 0.25,
    distanceBonusPerKm: 0, // distancia fica para roadmap e performance; evita favorecer uma maquina
    performanceBonus: 12,
    performanceImprovementRatio: 0.01,
    secondaryAttributeMaxRatio: 0.30
  },
  diet: {
    mealXp: 5,
    maxRewardedMealsPerDay: 4,
    finalizeDayXp: 15,
    completeDayBonusXp: 10
  },
  missions: {
    dailyXp: { easy: 12, normal: 16, hard: 20 },
    weeklyXp: { easy: 55, normal: 80, hard: 110, epic: 130 },
    activityShareTarget: 0.80
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

"use strict";

const STORAGE_KEY = "rpgGymMvp_v1";

function getRpgGymStorageScope() {
  return String(window.RPG_GYM_AUTH_USER_ID || "local");
}

function getScopedStorageKey(baseKey) {
  const scope = getRpgGymStorageScope();
  return scope === "local" ? baseKey : `${baseKey}:${scope}`;
}

function claimLegacyStorage(baseKey, scopedKey) {
  if (scopedKey === baseKey) return null;
  try {
    const claimedByKey = `${baseKey}:legacy-claimed-by`;
    const claimedBy = localStorage.getItem(claimedByKey);
    if (claimedBy && claimedBy !== getRpgGymStorageScope()) return null;
    const legacy = localStorage.getItem(baseKey);
    if (!legacy) return null;
    if (!claimedBy) localStorage.setItem(claimedByKey, getRpgGymStorageScope());
    return legacy;
  } catch (_error) {
    return null;
  }
}

function getGameStorageKey() {
  return getScopedStorageKey(STORAGE_KEY);
}
const APP_VERSION = "0.6.12";
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

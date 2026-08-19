"use strict";

const ACHIEVEMENT_DEFINITIONS = Object.freeze([
  { id: "first_workout", group: "Treino", icon: "◆", title: "Primeiro Passo", description: "Conclua seu primeiro treino de musculação.", reward: "Badge Primeiro Passo", test: (stats) => stats.lifetime.workoutsCompleted >= 1 },
  { id: "ten_workouts", group: "Treino", icon: "◆", title: "Ritmo de Ferro", description: "Conclua 10 treinos de musculação.", reward: "Título Ritmo de Ferro", test: (stats) => stats.lifetime.workoutsCompleted >= 10 },
  { id: "hundred_sets", group: "Treino", icon: "◆", title: "Cem Séries", description: "Complete 100 séries válidas.", reward: "Badge Centurião", test: (stats) => stats.lifetime.setsCompleted >= 100 },
  { id: "volume_20k", group: "Treino", icon: "◆", title: "20 Toneladas", description: "Acumule 20.000 kg de volume registrado.", reward: "Badge 20T", test: (stats) => stats.lifetime.totalVolumeKg >= 20000 },
  { id: "first_workout_pr", group: "Treino", icon: "◆", title: "Além do Limite", description: "Supere seu primeiro recorde pessoal em um exercício.", reward: "Badge Primeiro PR", test: (stats) => stats.lifetime.workoutPersonalRecords >= 1 },
  { id: "ten_workout_prs", group: "Treino", icon: "◆", title: "Progressão Real", description: "Supere 10 recordes pessoais em musculação.", reward: "Título Progressão Real", test: (stats) => stats.lifetime.workoutPersonalRecords >= 10 },
  { id: "first_cardio", group: "Cardio", icon: "◇", title: "Em Movimento", description: "Conclua sua primeira sessão de cardio.", reward: "Badge Em Movimento", test: (stats) => stats.lifetime.cardioSessions >= 1 },
  { id: "cardio_120", group: "Cardio", icon: "◇", title: "Fôlego", description: "Acumule 120 minutos de cardio.", reward: "Título Fôlego", test: (stats) => stats.lifetime.cardioMinutes >= 120 },
  { id: "first_cardio_pr", group: "Cardio", icon: "◇", title: "Novo Ritmo", description: "Supere sua primeira referência de performance no cardio.", reward: "Badge Novo Ritmo", test: (stats) => stats.lifetime.cardioPersonalRecords >= 1 },
  { id: "diet_first", group: "Dieta", icon: "◈", title: "Diário Aberto", description: "Finalize seu primeiro dia de dieta.", reward: "Badge Diário Aberto", test: (stats) => stats.lifetime.dietDaysCompleted >= 1 },
  { id: "diet_five", group: "Dieta", icon: "◈", title: "Planejamento", description: "Finalize 5 dias de dieta.", reward: "Título Planejamento", test: (stats) => stats.lifetime.dietDaysCompleted >= 5 },
  { id: "streak_7", group: "Consistência", icon: "✦", title: "Uma Semana", description: "Alcance uma sequência de 7 dias ativos.", reward: "Badge Uma Semana", test: (stats) => stats.lifetime.bestStreak >= 7 },
  { id: "missions_10", group: "Consistência", icon: "✦", title: "Caçador de Missões", description: "Resgate 10 missões diárias ou semanais.", reward: "Título Caçador de Missões", test: (stats) => (stats.lifetime.dailyMissionsCompleted + stats.lifetime.weeklyMissionsCompleted) >= 10 },
  { id: "all_level_5", group: "Progressão", icon: "⬡", title: "Equilíbrio Inicial", description: "Leve os seis atributos ao nível 5.", reward: "Badge Equilíbrio Inicial", test: (_stats, game) => Object.values(game.attributes).every((attr) => attr.level >= 5) },
  { id: "first_class", group: "Classes", icon: "⬢", title: "Despertar de Classe", description: "Desbloqueie sua primeira classe.", reward: "Badge Despertar", test: (_stats, game) => Object.keys(ATTRIBUTES).some((key) => isClassUnlocked(key, game)) },
  { id: "all_classes", group: "Classes", icon: "⬢", title: "Círculo Completo", description: "Desbloqueie as seis classes iniciais.", reward: "Título Mestre das Seis Trilhas", test: (_stats, game) => Object.keys(ATTRIBUTES).every((key) => isClassUnlocked(key, game)) }
]);

const GLOBAL_TITLES = Object.freeze([
  { level: 1, title: "Novato" },
  { level: 5, title: "Iniciado" },
  { level: 10, title: "Discípulo de Ferro" },
  { level: 20, title: "Veterano da Jornada" },
  { level: 30, title: "Elite do RPG GYM" },
  { level: 40, title: "Lenda da Consistência" },
  { level: 50, title: "Ascendente" }
]);

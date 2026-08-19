"use strict";

const DAILY_MISSION_TEMPLATES = Object.freeze([
  // Treino — metas curtas, mas que exigem uma sessão real.
  { templateId: "d_train_1", category: "training", name: "Sessão do Dia", description: "Conclua 1 treino de musculação hoje.", metric: { type: "workouts" }, target: 1, reward: { type: "xp", attribute: "determination", amount: 20 } },
  { templateId: "d_sets_6", category: "training", name: "Primeiro Bloco", description: "Complete 6 séries válidas hoje.", metric: { type: "sets" }, target: 6, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_sets_8", category: "training", name: "Volume de Trabalho", description: "Complete 8 séries válidas hoje.", metric: { type: "sets" }, target: 8, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_sets_10", category: "training", name: "Dez Séries", description: "Complete 10 séries válidas hoje.", metric: { type: "sets" }, target: 10, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_compound_3", category: "training", name: "Base Sólida", description: "Complete 3 séries de exercícios compostos.", metric: { type: "compoundSets" }, target: 3, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_compound_5", category: "training", name: "Movimentos Fundamentais", description: "Complete 5 séries de exercícios compostos.", metric: { type: "compoundSets" }, target: 5, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_exercises_3", category: "training", name: "Trio de Exercícios", description: "Faça 3 exercícios diferentes no mesmo dia.", metric: { type: "uniqueExercises" }, target: 3, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_exercises_4", category: "training", name: "Treino Completo", description: "Faça 4 exercícios diferentes hoje.", metric: { type: "uniqueExercises" }, target: 4, reward: { type: "xp", attribute: "force", amount: 20 } },

  // Cardio — tempos alcançáveis numa única sessão, sem exigir equipamento específico.
  { templateId: "d_cardio_1", category: "cardio", name: "Coração Ativo", description: "Conclua 1 sessão de cardio hoje.", metric: { type: "cardioSessions" }, target: 1, reward: { type: "xp", attribute: "constitution", amount: 20 } },
  { templateId: "d_cardio_15", category: "cardio", name: "Quinze Minutos", description: "Acumule 15 minutos de cardio hoje.", metric: { type: "cardioMinutes" }, target: 15, reward: { type: "xp", attribute: "constitution", amount: 20 } },
  { templateId: "d_cardio_20", category: "cardio", name: "Fôlego em Dia", description: "Acumule 20 minutos de cardio hoje.", metric: { type: "cardioMinutes" }, target: 20, reward: { type: "xp", attribute: "constitution", amount: 20 } },
  { templateId: "d_cardio_30", category: "cardio", name: "Meia Hora em Movimento", description: "Acumule 30 minutos de cardio hoje.", metric: { type: "cardioMinutes" }, target: 30, reward: { type: "xp", attribute: "constitution", amount: 20 } },
  { templateId: "d_distance_2", category: "cardio", name: "Dois Quilômetros", description: "Acumule 2 km em atividades com distância.", metric: { type: "cardioDistanceKm" }, target: 2, reward: { type: "xp", attribute: "constitution", amount: 20 } },
  { templateId: "d_distance_3", category: "cardio", name: "Três Quilômetros", description: "Acumule 3 km em atividades com distância.", metric: { type: "cardioDistanceKm" }, target: 3, reward: { type: "xp", attribute: "constitution", amount: 20 } },

  // Dieta — registro, não perfeição nutricional.
  { templateId: "d_meals_2", category: "diet", name: "Duas Refeições", description: "Registre alimentos em 2 refeições diferentes.", metric: { type: "meals" }, target: 2, reward: { type: "xp", attribute: "intelligence", amount: 20 } },
  { templateId: "d_meals_3", category: "diet", name: "Diário Alimentar", description: "Registre alimentos em 3 refeições diferentes.", metric: { type: "meals" }, target: 3, reward: { type: "xp", attribute: "intelligence", amount: 20 } },
  { templateId: "d_foods_3", category: "diet", name: "Registro Consciente", description: "Registre 3 alimentos hoje.", metric: { type: "foodEntries" }, target: 3, reward: { type: "xp", attribute: "intelligence", amount: 20 } },
  { templateId: "d_foods_5", category: "diet", name: "Mapa do Prato", description: "Registre 5 alimentos hoje.", metric: { type: "foodEntries" }, target: 5, reward: { type: "xp", attribute: "intelligence", amount: 20 } },
  { templateId: "d_diet_finish", category: "diet", name: "Dia Registrado", description: "Finalize o diário alimentar de hoje.", metric: { type: "dietFinalized" }, target: 1, reward: { type: "xp", attribute: "intelligence", amount: 20 } },

  // Consistência / híbridas — podem ser cumpridas em diferentes rotinas.
  { templateId: "d_active", category: "consistency", name: "Presença", description: "Registre pelo menos uma atividade válida hoje.", metric: { type: "activeToday" }, target: 1, reward: { type: "xp", attribute: "determination", amount: 15 } },
  { templateId: "d_train_diet", category: "mixed", name: "Corpo e Combustível", description: "Conclua 1 treino e registre 2 refeições.", metric: { type: "all", requirements: [{ type: "workouts", target: 1 }, { type: "meals", target: 2 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 20 } },
  { templateId: "d_cardio_diet", category: "mixed", name: "Energia em Equilíbrio", description: "Faça 15 min de cardio e registre 2 refeições.", metric: { type: "all", requirements: [{ type: "cardioMinutes", target: 15 }, { type: "meals", target: 2 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 20 } },
  { templateId: "d_train_cardio", category: "mixed", name: "Força e Fôlego", description: "Conclua 1 treino e 10 min de cardio.", metric: { type: "all", requirements: [{ type: "workouts", target: 1 }, { type: "cardioMinutes", target: 10 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 20 } },
  { templateId: "d_sets_diet", category: "mixed", name: "Rotina Completa", description: "Complete 6 séries e registre 2 refeições.", metric: { type: "all", requirements: [{ type: "sets", target: 6 }, { type: "meals", target: 2 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 20 } },

  // Variações adicionais para reduzir repetição entre dias.
  { templateId: "d_sets_12", category: "training", name: "Doze Séries", description: "Complete 12 séries válidas hoje.", metric: { type: "sets" }, target: 12, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_compound_4", category: "training", name: "Núcleo do Treino", description: "Complete 4 séries de exercícios compostos.", metric: { type: "compoundSets" }, target: 4, reward: { type: "xp", attribute: "force", amount: 20 } },
  { templateId: "d_cardio_25", category: "cardio", name: "Vinte e Cinco", description: "Acumule 25 minutos de cardio hoje.", metric: { type: "cardioMinutes" }, target: 25, reward: { type: "xp", attribute: "constitution", amount: 20 } },
  { templateId: "d_distance_1", category: "cardio", name: "Primeiro Quilômetro", description: "Acumule 1 km em atividades com distância.", metric: { type: "cardioDistanceKm" }, target: 1, reward: { type: "xp", attribute: "constitution", amount: 20 } },
  { templateId: "d_meals_4", category: "diet", name: "Dia Completo", description: "Registre alimentos nas 4 refeições do dia.", metric: { type: "meals" }, target: 4, reward: { type: "xp", attribute: "intelligence", amount: 20 } },
  { templateId: "d_foods_4", category: "diet", name: "Quatro Registros", description: "Registre 4 alimentos hoje.", metric: { type: "foodEntries" }, target: 4, reward: { type: "xp", attribute: "intelligence", amount: 20 } },
  { templateId: "d_foods_6", category: "diet", name: "Detalhes do Dia", description: "Registre 6 alimentos hoje.", metric: { type: "foodEntries" }, target: 6, reward: { type: "xp", attribute: "intelligence", amount: 20 } },
  { templateId: "d_sets_cardio", category: "mixed", name: "Treino Híbrido", description: "Complete 6 séries e 10 min de cardio.", metric: { type: "all", requirements: [{ type: "sets", target: 6 }, { type: "cardioMinutes", target: 10 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 20 } },
  { templateId: "d_finish_cardio", category: "mixed", name: "Dia Bem Feito", description: "Finalize a dieta e faça 15 min de cardio.", metric: { type: "all", requirements: [{ type: "dietFinalized", target: 1 }, { type: "cardioMinutes", target: 15 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 20 } }
]);

const WEEKLY_MISSION_TEMPLATES = Object.freeze([
  // Musculação — distribuídas para não serem concluídas em uma única sessão comum.
  { templateId: "w_workouts_2", category: "training", name: "Duas Sessões", description: "Conclua 2 treinos de musculação nesta semana.", metric: { type: "workouts" }, target: 2, reward: { type: "xp", attribute: "force", amount: 55 } },
  { templateId: "w_workouts_3", category: "training", name: "Três Sessões", description: "Conclua 3 treinos de musculação nesta semana.", metric: { type: "workouts" }, target: 3, reward: { type: "xp", attribute: "force", amount: 80 } },
  { templateId: "w_workouts_4", category: "training", name: "Semana de Aço", description: "Conclua 4 treinos de musculação nesta semana.", metric: { type: "workouts" }, target: 4, reward: { type: "buff", multiplier: 1.1, durationHours: 24 } },
  { templateId: "w_workout_days_3", category: "training", name: "Treino Distribuído", description: "Treine em 3 dias diferentes nesta semana.", metric: { type: "workoutDays" }, target: 3, reward: { type: "xp", attribute: "determination", amount: 80 } },
  { templateId: "w_sets_20", category: "training", name: "Vinte Séries", description: "Complete 20 séries válidas nesta semana.", metric: { type: "sets" }, target: 20, reward: { type: "xp", attribute: "force", amount: 55 } },
  { templateId: "w_sets_30", category: "training", name: "Trinta Séries", description: "Complete 30 séries válidas nesta semana.", metric: { type: "sets" }, target: 30, reward: { type: "xp", attribute: "force", amount: 80 } },
  { templateId: "w_sets_40", category: "training", name: "Quarenta Séries", description: "Complete 40 séries válidas nesta semana.", metric: { type: "sets" }, target: 40, reward: { type: "xp", attribute: "force", amount: 110 } },
  { templateId: "w_compound_10", category: "training", name: "Fundamentos", description: "Complete 10 séries de exercícios compostos nesta semana.", metric: { type: "compoundSets" }, target: 10, reward: { type: "xp", attribute: "force", amount: 55 } },
  { templateId: "w_compound_15", category: "training", name: "Base de Ferro", description: "Complete 15 séries de exercícios compostos nesta semana.", metric: { type: "compoundSets" }, target: 15, reward: { type: "xp", attribute: "force", amount: 80 } },

  // Cardio — minutos e dias, independentes de máquina.
  { templateId: "w_cardio_60", category: "cardio", name: "Uma Hora de Fôlego", description: "Acumule 60 minutos de cardio nesta semana.", metric: { type: "cardioMinutes" }, target: 60, reward: { type: "xp", attribute: "constitution", amount: 55 } },
  { templateId: "w_cardio_90", category: "cardio", name: "Noventa Minutos", description: "Acumule 90 minutos de cardio nesta semana.", metric: { type: "cardioMinutes" }, target: 90, reward: { type: "xp", attribute: "constitution", amount: 80 } },
  { templateId: "w_cardio_120", category: "cardio", name: "Duas Horas em Movimento", description: "Acumule 120 minutos de cardio nesta semana.", metric: { type: "cardioMinutes" }, target: 120, reward: { type: "buff", multiplier: 1.1, durationHours: 24 } },
  { templateId: "w_cardio_sessions_2", category: "cardio", name: "Duas Sessões de Cardio", description: "Conclua cardio em 2 sessões nesta semana.", metric: { type: "cardioSessions" }, target: 2, reward: { type: "xp", attribute: "constitution", amount: 55 } },
  { templateId: "w_cardio_sessions_3", category: "cardio", name: "Cardio em Três Atos", description: "Conclua 3 sessões de cardio nesta semana.", metric: { type: "cardioSessions" }, target: 3, reward: { type: "xp", attribute: "constitution", amount: 80 } },
  { templateId: "w_cardio_days_3", category: "cardio", name: "Fôlego Distribuído", description: "Faça cardio em 3 dias diferentes.", metric: { type: "cardioDays" }, target: 3, reward: { type: "xp", attribute: "constitution", amount: 80 } },
  { templateId: "w_distance_10", category: "cardio", name: "Dez Quilômetros", description: "Acumule 10 km em atividades com distância.", metric: { type: "cardioDistanceKm" }, target: 10, reward: { type: "xp", attribute: "constitution", amount: 80 } },
  { templateId: "w_distance_15", category: "cardio", name: "Quinze Quilômetros", description: "Acumule 15 km em atividades com distância.", metric: { type: "cardioDistanceKm" }, target: 15, reward: { type: "xp", attribute: "constitution", amount: 80 } },

  // Dieta — esforço ao longo de dias diferentes.
  { templateId: "w_nutrition_days_3", category: "diet", name: "Três Dias de Registro", description: "Registre alimentação em 3 dias diferentes.", metric: { type: "nutritionDays" }, target: 3, reward: { type: "xp", attribute: "intelligence", amount: 55 } },
  { templateId: "w_nutrition_days_5", category: "diet", name: "Diário da Semana", description: "Registre alimentação em 5 dias diferentes.", metric: { type: "nutritionDays" }, target: 5, reward: { type: "xp", attribute: "intelligence", amount: 80 } },
  { templateId: "w_diet_finish_3", category: "diet", name: "Três Dias Fechados", description: "Finalize o diário alimentar em 3 dias diferentes.", metric: { type: "dietFinalizedDays" }, target: 3, reward: { type: "xp", attribute: "intelligence", amount: 55 } },
  { templateId: "w_diet_finish_4", category: "diet", name: "Quatro Dias Fechados", description: "Finalize o diário alimentar em 4 dias diferentes.", metric: { type: "dietFinalizedDays" }, target: 4, reward: { type: "xp", attribute: "intelligence", amount: 80 } },
  { templateId: "w_meals_10", category: "diet", name: "Dez Refeições", description: "Registre alimentos em 10 refeições ao longo da semana.", metric: { type: "meals" }, target: 10, reward: { type: "xp", attribute: "intelligence", amount: 55 } },
  { templateId: "w_meals_15", category: "diet", name: "Quinze Refeições", description: "Registre alimentos em 15 refeições ao longo da semana.", metric: { type: "meals" }, target: 15, reward: { type: "xp", attribute: "intelligence", amount: 80 } },

  // Consistência — o coração do jogo.
  { templateId: "w_active_3", category: "consistency", name: "Três Dias Ativos", description: "Registre atividade em 3 dias diferentes nesta semana.", metric: { type: "activeDays" }, target: 3, reward: { type: "xp", attribute: "determination", amount: 55 } },
  { templateId: "w_active_4", category: "consistency", name: "Quatro Dias Ativos", description: "Registre atividade em 4 dias diferentes nesta semana.", metric: { type: "activeDays" }, target: 4, reward: { type: "xp", attribute: "determination", amount: 80 } },
  { templateId: "w_active_5", category: "consistency", name: "Cinco Dias Ativos", description: "Registre atividade em 5 dias diferentes nesta semana.", metric: { type: "activeDays" }, target: 5, reward: { type: "xp", attribute: "determination", amount: 80 } },

  // Híbridas — sempre exigem mais de um sistema e tendem a durar vários dias.
  { templateId: "w_mix_train_cardio", category: "mixed", name: "Força e Resistência", description: "Conclua 2 treinos e acumule 45 min de cardio.", metric: { type: "all", requirements: [{ type: "workouts", target: 2 }, { type: "cardioMinutes", target: 45 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 80 } },
  { templateId: "w_mix_train_diet", category: "mixed", name: "Treino com Rotina", description: "Conclua 2 treinos e registre dieta em 3 dias.", metric: { type: "all", requirements: [{ type: "workouts", target: 2 }, { type: "nutritionDays", target: 3 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 80 } },
  { templateId: "w_mix_cardio_diet", category: "mixed", name: "Fôlego e Nutrição", description: "Acumule 60 min de cardio e registre dieta em 3 dias.", metric: { type: "all", requirements: [{ type: "cardioMinutes", target: 60 }, { type: "nutritionDays", target: 3 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 80 } },
  { templateId: "w_mix_all", category: "mixed", name: "Semana Completa", description: "Conclua 2 treinos, 45 min de cardio e registre dieta em 3 dias.", metric: { type: "all", requirements: [{ type: "workouts", target: 2 }, { type: "cardioMinutes", target: 45 }, { type: "nutritionDays", target: 3 }] }, target: 3, reward: { type: "buff", multiplier: 1.1, durationHours: 24 } },
  { templateId: "w_mix_active_train", category: "mixed", name: "Constância de Ferro", description: "Treine 2 vezes e fique ativo em 4 dias diferentes.", metric: { type: "all", requirements: [{ type: "workouts", target: 2 }, { type: "activeDays", target: 4 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 80 } },
  { templateId: "w_mix_active_diet", category: "mixed", name: "Semana Organizada", description: "Registre dieta em 4 dias e fique ativo em 4 dias.", metric: { type: "all", requirements: [{ type: "nutritionDays", target: 4 }, { type: "activeDays", target: 4 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 80 } },
  { templateId: "w_mix_sets_cardio", category: "mixed", name: "Motor Completo", description: "Complete 24 séries e acumule 45 min de cardio.", metric: { type: "all", requirements: [{ type: "sets", target: 24 }, { type: "cardioMinutes", target: 45 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 110 } },
  { templateId: "w_mix_finish_train", category: "mixed", name: "Disciplina Aplicada", description: "Finalize a dieta em 3 dias e conclua 2 treinos.", metric: { type: "all", requirements: [{ type: "dietFinalizedDays", target: 3 }, { type: "workouts", target: 2 }] }, target: 2, reward: { type: "xp", attribute: "determination", amount: 80 } }
]);

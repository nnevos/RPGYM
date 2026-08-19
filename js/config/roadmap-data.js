"use strict";

// Roadmaps permanentes dos seis atributos.
// Os alvos sao cumulativos: progresso feito antes de desbloquear um capitulo continua contando.
// Niveis 5/15/25/35/45 = marcos intermediarios.
// Niveis 10/20/30/40/50 = evolucoes da classe do atributo.
const ROADMAP_DEFINITIONS = Object.freeze({
  force: [
    { id: "force_5", unlockLevel: 5, title: "Fundamentos de Força", rewardLabel: "Marco de Força I", objectives: [
      { id: "workouts", label: "Conclua 3 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 3 },
      { id: "sets", label: "Complete 30 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 30 },
      { id: "exercises", label: "Use 6 exercícios diferentes", metric: { type: "lifetime", key: "uniqueExercises" }, target: 6 }
    ]},
    { id: "force_10", unlockLevel: 10, title: "Provação do Berserker", rewardLabel: "Classe Berserker", objectives: [
      { id: "workouts", label: "Conclua 10 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 10 },
      { id: "sets", label: "Complete 100 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 100 },
      { id: "compound", label: "Complete 30 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 30 },
      { id: "volume", label: "Acumule 20.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 20000 },
      { id: "prs", label: "Supere 2 recordes pessoais", metric: { type: "lifetime", key: "workoutPersonalRecords" }, target: 2 }
    ]},
    { id: "force_15", unlockLevel: 15, title: "Carga e Controle", rewardLabel: "Marco de Força II", objectives: [
      { id: "workouts", label: "Conclua 20 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 20 },
      { id: "sets", label: "Complete 220 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 220 },
      { id: "compound", label: "Complete 60 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 60 },
      { id: "volume", label: "Acumule 50.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 50000 }
    ]},
    { id: "force_20", unlockLevel: 20, title: "Ascensão do Berserker", rewardLabel: "Berserker II", objectives: [
      { id: "workouts", label: "Conclua 35 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 35 },
      { id: "sets", label: "Complete 400 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 400 },
      { id: "compound", label: "Complete 120 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 120 },
      { id: "volume", label: "Acumule 100.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 100000 },
      { id: "prs", label: "Supere 8 recordes pessoais", metric: { type: "lifetime", key: "workoutPersonalRecords" }, target: 8 }
    ]},
    { id: "force_25", unlockLevel: 25, title: "Força Lapidada", rewardLabel: "Marco de Força III", objectives: [
      { id: "workouts", label: "Conclua 55 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 55 },
      { id: "sets", label: "Complete 650 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 650 },
      { id: "compound", label: "Complete 200 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 200 },
      { id: "volume", label: "Acumule 180.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 180000 }
    ]},
    { id: "force_30", unlockLevel: 30, title: "Dominio do Berserker", rewardLabel: "Berserker III", objectives: [
      { id: "workouts", label: "Conclua 80 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 80 },
      { id: "sets", label: "Complete 950 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 950 },
      { id: "compound", label: "Complete 300 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 300 },
      { id: "volume", label: "Acumule 300.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 300000 },
      { id: "prs", label: "Supere 18 recordes pessoais", metric: { type: "lifetime", key: "workoutPersonalRecords" }, target: 18 }
    ]},
    { id: "force_35", unlockLevel: 35, title: "Potência Implacavel", rewardLabel: "Marco de Força IV", objectives: [
      { id: "workouts", label: "Conclua 110 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 110 },
      { id: "sets", label: "Complete 1.300 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 1300 },
      { id: "compound", label: "Complete 420 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 420 },
      { id: "volume", label: "Acumule 450.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 450000 }
    ]},
    { id: "force_40", unlockLevel: 40, title: "Berserker Veterano", rewardLabel: "Berserker IV", objectives: [
      { id: "workouts", label: "Conclua 145 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 145 },
      { id: "sets", label: "Complete 1.750 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 1750 },
      { id: "compound", label: "Complete 560 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 560 },
      { id: "volume", label: "Acumule 650.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 650000 },
      { id: "prs", label: "Supere 30 recordes pessoais", metric: { type: "lifetime", key: "workoutPersonalRecords" }, target: 30 }
    ]},
    { id: "force_45", unlockLevel: 45, title: "Força Lendaria", rewardLabel: "Marco de Força V", objectives: [
      { id: "workouts", label: "Conclua 185 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 185 },
      { id: "sets", label: "Complete 2.250 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 2250 },
      { id: "compound", label: "Complete 720 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 720 },
      { id: "volume", label: "Acumule 900.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 900000 }
    ]},
    { id: "force_50", unlockLevel: 50, title: "Coroação do Titã", rewardLabel: "Berserker Mestre + Titulo Titã", objectives: [
      { id: "workouts", label: "Conclua 230 treinos de musculação", metric: { type: "lifetime", key: "workoutsCompleted" }, target: 230 },
      { id: "sets", label: "Complete 2.800 séries validas", metric: { type: "lifetime", key: "setsCompleted" }, target: 2800 },
      { id: "compound", label: "Complete 900 séries compostas", metric: { type: "lifetime", key: "compoundSets" }, target: 900 },
      { id: "volume", label: "Acumule 1.200.000 kg de volume", metric: { type: "lifetime", key: "totalVolumeKg" }, target: 1200000 },
      { id: "prs", label: "Supere 45 recordes pessoais", metric: { type: "lifetime", key: "workoutPersonalRecords" }, target: 45 }
    ]}
  ],

  agility: [
    { id: "agility_5", unlockLevel: 5, title: "Passos do Ninja", rewardLabel: "Marco de Agilidade I", objectives: [
      { id: "days", label: "Registre Agilidade em 3 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 3 },
      { id: "sessions", label: "Complete 2 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 2 },
      { id: "activities", label: "Registre 5 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 5 }
    ]},
    { id: "agility_10", unlockLevel: 10, title: "Provação do Ninja", rewardLabel: "Classe Ninja", objectives: [
      { id: "days", label: "Registre Agilidade em 10 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 10 },
      { id: "sessions", label: "Complete 6 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 6 },
      { id: "minutes", label: "Acumule 100 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 100 }
    ]},
    { id: "agility_15", unlockLevel: 15, title: "Ritmo e Precisão", rewardLabel: "Marco de Agilidade II", objectives: [
      { id: "days", label: "Registre Agilidade em 20 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 20 },
      { id: "sessions", label: "Complete 12 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 12 },
      { id: "minutes", label: "Acumule 220 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 220 },
      { id: "activities", label: "Registre 35 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 35 }
    ]},
    { id: "agility_20", unlockLevel: 20, title: "Ascensão do Ninja", rewardLabel: "Ninja II", objectives: [
      { id: "days", label: "Registre Agilidade em 35 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 35 },
      { id: "sessions", label: "Complete 20 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 20 },
      { id: "minutes", label: "Acumule 400 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 400 },
      { id: "activities", label: "Registre 60 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 60 }
    ]},
    { id: "agility_25", unlockLevel: 25, title: "Movimento Instintivo", rewardLabel: "Marco de Agilidade III", objectives: [
      { id: "days", label: "Registre Agilidade em 55 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 55 },
      { id: "sessions", label: "Complete 30 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 30 },
      { id: "minutes", label: "Acumule 650 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 650 },
      { id: "activities", label: "Registre 90 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 90 }
    ]},
    { id: "agility_30", unlockLevel: 30, title: "Dominio do Ninja", rewardLabel: "Ninja III", objectives: [
      { id: "days", label: "Registre Agilidade em 80 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 80 },
      { id: "sessions", label: "Complete 42 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 42 },
      { id: "minutes", label: "Acumule 950 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 950 },
      { id: "activities", label: "Registre 125 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 125 }
    ]},
    { id: "agility_35", unlockLevel: 35, title: "Reflexos Afiados", rewardLabel: "Marco de Agilidade IV", objectives: [
      { id: "days", label: "Registre Agilidade em 110 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 110 },
      { id: "sessions", label: "Complete 56 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 56 },
      { id: "minutes", label: "Acumule 1300 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 1300 },
      { id: "activities", label: "Registre 165 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 165 }
    ]},
    { id: "agility_40", unlockLevel: 40, title: "Ninja Veterano", rewardLabel: "Ninja IV", objectives: [
      { id: "days", label: "Registre Agilidade em 145 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 145 },
      { id: "sessions", label: "Complete 72 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 72 },
      { id: "minutes", label: "Acumule 1750 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 1750 },
      { id: "activities", label: "Registre 210 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 210 }
    ]},
    { id: "agility_45", unlockLevel: 45, title: "Passos Lendarios", rewardLabel: "Marco de Agilidade V", objectives: [
      { id: "days", label: "Registre Agilidade em 185 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 185 },
      { id: "sessions", label: "Complete 90 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 90 },
      { id: "minutes", label: "Acumule 2250 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 2250 },
      { id: "activities", label: "Registre 260 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 260 }
    ]},
    { id: "agility_50", unlockLevel: 50, title: "Sombra Perfeita", rewardLabel: "Ninja Mestre + Titulo Sombra Veloz", objectives: [
      { id: "days", label: "Registre Agilidade em 230 dias diferentes", metric: { type: "attributeActiveDays", attribute: "agility" }, target: 230 },
      { id: "sessions", label: "Complete 110 sessões de corrida ou corda", metric: { type: "cardioTypeSessions", types: ["outdoor_run", "jump_rope"] }, target: 110 },
      { id: "minutes", label: "Acumule 2800 min em corrida ou corda", metric: { type: "cardioTypeMinutes", types: ["outdoor_run", "jump_rope"] }, target: 2800 },
      { id: "activities", label: "Registre 320 atividades de Agilidade", metric: { type: "attributeActivityCount", attribute: "agility" }, target: 320 }
    ]}
  ],

  constitution: [
    { id: "constitution_5", unlockLevel: 5, title: "Base do Guardiao", rewardLabel: "Marco de Constituição I", objectives: [
      { id: "sessions", label: "Complete 3 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 3 },
      { id: "minutes", label: "Acumule 60 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 60 },
      { id: "days", label: "Registre Constituição em 3 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 3 }
    ]},
    { id: "constitution_10", unlockLevel: 10, title: "Provação do Guardiao", rewardLabel: "Classe Guardiao", objectives: [
      { id: "sessions", label: "Complete 12 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 12 },
      { id: "minutes", label: "Acumule 300 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 300 },
      { id: "days", label: "Registre Constituição em 10 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 10 }
    ]},
    { id: "constitution_15", unlockLevel: 15, title: "Folego Construido", rewardLabel: "Marco de Constituição II", objectives: [
      { id: "sessions", label: "Complete 25 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 25 },
      { id: "minutes", label: "Acumule 700 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 700 },
      { id: "days", label: "Registre Constituição em 20 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 20 }
    ]},
    { id: "constitution_20", unlockLevel: 20, title: "Ascensão do Guardiao", rewardLabel: "Guardiao II", objectives: [
      { id: "sessions", label: "Complete 45 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 45 },
      { id: "minutes", label: "Acumule 1.300 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 1300 },
      { id: "days", label: "Registre Constituição em 35 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 35 }
    ]},
    { id: "constitution_25", unlockLevel: 25, title: "Resistência Solida", rewardLabel: "Marco de Constituição III", objectives: [
      { id: "sessions", label: "Complete 70 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 70 },
      { id: "minutes", label: "Acumule 2.200 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 2200 },
      { id: "days", label: "Registre Constituição em 55 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 55 }
    ]},
    { id: "constitution_30", unlockLevel: 30, title: "Dominio do Guardiao", rewardLabel: "Guardiao III", objectives: [
      { id: "sessions", label: "Complete 100 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 100 },
      { id: "minutes", label: "Acumule 3.400 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 3400 },
      { id: "days", label: "Registre Constituição em 80 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 80 }
    ]},
    { id: "constitution_35", unlockLevel: 35, title: "Corpo Inabalavel", rewardLabel: "Marco de Constituição IV", objectives: [
      { id: "sessions", label: "Complete 140 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 140 },
      { id: "minutes", label: "Acumule 4.800 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 4800 },
      { id: "days", label: "Registre Constituição em 110 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 110 }
    ]},
    { id: "constitution_40", unlockLevel: 40, title: "Guardiao Veterano", rewardLabel: "Guardiao IV", objectives: [
      { id: "sessions", label: "Complete 185 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 185 },
      { id: "minutes", label: "Acumule 6.500 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 6500 },
      { id: "days", label: "Registre Constituição em 145 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 145 }
    ]},
    { id: "constitution_45", unlockLevel: 45, title: "Resistência Lendaria", rewardLabel: "Marco de Constituição V", objectives: [
      { id: "sessions", label: "Complete 235 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 235 },
      { id: "minutes", label: "Acumule 8.500 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 8500 },
      { id: "days", label: "Registre Constituição em 185 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 185 }
    ]},
    { id: "constitution_50", unlockLevel: 50, title: "Muralha Viva", rewardLabel: "Guardiao Mestre + Titulo Muralha Viva", objectives: [
      { id: "sessions", label: "Complete 300 sessões de cardio", metric: { type: "lifetime", key: "cardioSessions" }, target: 300 },
      { id: "minutes", label: "Acumule 11.000 minutos de cardio", metric: { type: "lifetime", key: "cardioMinutes" }, target: 11000 },
      { id: "days", label: "Registre Constituição em 230 dias diferentes", metric: { type: "attributeActiveDays", attribute: "constitution" }, target: 230 }
    ]}
  ],

  intelligence: [
    { id: "intelligence_5", unlockLevel: 5, title: "Estudos do Mago", rewardLabel: "Marco de Inteligência I", objectives: [
      { id: "days", label: "Registre alimentação em 5 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 5 },
      { id: "meals", label: "Registre 12 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 12 },
      { id: "foods", label: "Registre 25 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 25 }
    ]},
    { id: "intelligence_10", unlockLevel: 10, title: "Provação do Mago", rewardLabel: "Classe Mago", objectives: [
      { id: "days", label: "Registre alimentação em 20 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 20 },
      { id: "finished", label: "Finalize 10 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 10 },
      { id: "meals", label: "Registre 60 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 60 }
    ]},
    { id: "intelligence_15", unlockLevel: 15, title: "Conhecimento Aplicado", rewardLabel: "Marco de Inteligência II", objectives: [
      { id: "days", label: "Registre alimentação em 35 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 35 },
      { id: "finished", label: "Finalize 20 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 20 },
      { id: "meals", label: "Registre 110 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 110 },
      { id: "foods", label: "Registre 180 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 180 }
    ]},
    { id: "intelligence_20", unlockLevel: 20, title: "Ascensão do Mago", rewardLabel: "Mago II", objectives: [
      { id: "days", label: "Registre alimentação em 60 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 60 },
      { id: "finished", label: "Finalize 40 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 40 },
      { id: "meals", label: "Registre 190 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 190 },
      { id: "foods", label: "Registre 320 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 320 }
    ]},
    { id: "intelligence_25", unlockLevel: 25, title: "Hábitos Conscientes", rewardLabel: "Marco de Inteligência III", objectives: [
      { id: "days", label: "Registre alimentação em 90 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 90 },
      { id: "finished", label: "Finalize 65 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 65 },
      { id: "meals", label: "Registre 280 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 280 },
      { id: "foods", label: "Registre 480 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 480 }
    ]},
    { id: "intelligence_30", unlockLevel: 30, title: "Dominio do Mago", rewardLabel: "Mago III", objectives: [
      { id: "days", label: "Registre alimentação em 130 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 130 },
      { id: "finished", label: "Finalize 95 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 95 },
      { id: "meals", label: "Registre 400 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 400 },
      { id: "foods", label: "Registre 700 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 700 }
    ]},
    { id: "intelligence_35", unlockLevel: 35, title: "Sabedoria da Rotina", rewardLabel: "Marco de Inteligência IV", objectives: [
      { id: "days", label: "Registre alimentação em 180 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 180 },
      { id: "finished", label: "Finalize 135 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 135 },
      { id: "meals", label: "Registre 550 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 550 },
      { id: "foods", label: "Registre 950 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 950 }
    ]},
    { id: "intelligence_40", unlockLevel: 40, title: "Mago Veterano", rewardLabel: "Mago IV", objectives: [
      { id: "days", label: "Registre alimentação em 235 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 235 },
      { id: "finished", label: "Finalize 180 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 180 },
      { id: "meals", label: "Registre 720 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 720 },
      { id: "foods", label: "Registre 1.250 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 1250 }
    ]},
    { id: "intelligence_45", unlockLevel: 45, title: "Conhecimento Lendario", rewardLabel: "Marco de Inteligência V", objectives: [
      { id: "days", label: "Registre alimentação em 300 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 300 },
      { id: "finished", label: "Finalize 230 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 230 },
      { id: "meals", label: "Registre 920 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 920 },
      { id: "foods", label: "Registre 1.600 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 1600 }
    ]},
    { id: "intelligence_50", unlockLevel: 50, title: "Sabio dos Hábitos", rewardLabel: "Mago Mestre + Titulo Sabio dos Hábitos", objectives: [
      { id: "days", label: "Registre alimentação em 365 dias", metric: { type: "lifetime", key: "nutritionDays" }, target: 365 },
      { id: "finished", label: "Finalize 280 dias de dieta", metric: { type: "lifetime", key: "dietDaysCompleted" }, target: 280 },
      { id: "meals", label: "Registre 1.150 refeições", metric: { type: "lifetime", key: "mealsLogged" }, target: 1150 },
      { id: "foods", label: "Registre 2.000 alimentos", metric: { type: "lifetime", key: "foodEntriesLogged" }, target: 2000 }
    ]}
  ],

  determination: [
    { id: "determination_5", unlockLevel: 5, title: "Disciplina do Monge", rewardLabel: "Marco de Determinação I", objectives: [
      { id: "active", label: "Seja ativo em 5 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 5 },
      { id: "streak", label: "Alcance um streak de 3 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 3 },
      { id: "missions", label: "Conclua 5 missões rotativas", metric: { type: "missionClaimsTotal" }, target: 5 }
    ]},
    { id: "determination_10", unlockLevel: 10, title: "Provação do Monge", rewardLabel: "Classe Monge", objectives: [
      { id: "active", label: "Seja ativo em 20 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 20 },
      { id: "streak", label: "Alcance um streak de 7 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 7 },
      { id: "daily", label: "Conclua 15 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 15 },
      { id: "weekly", label: "Conclua 3 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 3 }
    ]},
    { id: "determination_15", unlockLevel: 15, title: "Rotina Inabalavel", rewardLabel: "Marco de Determinação II", objectives: [
      { id: "active", label: "Seja ativo em 40 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 40 },
      { id: "streak", label: "Alcance um streak de 10 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 10 },
      { id: "daily", label: "Conclua 30 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 30 },
      { id: "weekly", label: "Conclua 6 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 6 }
    ]},
    { id: "determination_20", unlockLevel: 20, title: "Ascensão do Monge", rewardLabel: "Monge II", objectives: [
      { id: "active", label: "Seja ativo em 65 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 65 },
      { id: "streak", label: "Alcance um streak de 14 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 14 },
      { id: "daily", label: "Conclua 50 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 50 },
      { id: "weekly", label: "Conclua 10 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 10 }
    ]},
    { id: "determination_25", unlockLevel: 25, title: "Disciplina Profunda", rewardLabel: "Marco de Determinação III", objectives: [
      { id: "active", label: "Seja ativo em 95 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 95 },
      { id: "streak", label: "Alcance um streak de 21 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 21 },
      { id: "daily", label: "Conclua 75 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 75 },
      { id: "weekly", label: "Conclua 15 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 15 }
    ]},
    { id: "determination_30", unlockLevel: 30, title: "Dominio do Monge", rewardLabel: "Monge III", objectives: [
      { id: "active", label: "Seja ativo em 130 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 130 },
      { id: "streak", label: "Alcance um streak de 30 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 30 },
      { id: "daily", label: "Conclua 105 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 105 },
      { id: "weekly", label: "Conclua 22 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 22 }
    ]},
    { id: "determination_35", unlockLevel: 35, title: "Vontade de Ferro", rewardLabel: "Marco de Determinação IV", objectives: [
      { id: "active", label: "Seja ativo em 170 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 170 },
      { id: "streak", label: "Alcance um streak de 40 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 40 },
      { id: "daily", label: "Conclua 140 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 140 },
      { id: "weekly", label: "Conclua 30 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 30 }
    ]},
    { id: "determination_40", unlockLevel: 40, title: "Monge Veterano", rewardLabel: "Monge IV", objectives: [
      { id: "active", label: "Seja ativo em 220 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 220 },
      { id: "streak", label: "Alcance um streak de 50 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 50 },
      { id: "daily", label: "Conclua 180 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 180 },
      { id: "weekly", label: "Conclua 40 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 40 }
    ]},
    { id: "determination_45", unlockLevel: 45, title: "Determinação Lendaria", rewardLabel: "Marco de Determinação V", objectives: [
      { id: "active", label: "Seja ativo em 280 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 280 },
      { id: "streak", label: "Alcance um streak de 60 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 60 },
      { id: "daily", label: "Conclua 230 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 230 },
      { id: "weekly", label: "Conclua 52 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 52 }
    ]},
    { id: "determination_50", unlockLevel: 50, title: "Vontade Inabalavel", rewardLabel: "Monge Mestre + Titulo Inabalavel", objectives: [
      { id: "active", label: "Seja ativo em 365 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 365 },
      { id: "streak", label: "Alcance um streak de 75 dias", metric: { type: "lifetime", key: "bestStreak" }, target: 75 },
      { id: "daily", label: "Conclua 300 missões diarias", metric: { type: "lifetime", key: "dailyMissionsCompleted" }, target: 300 },
      { id: "weekly", label: "Conclua 65 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 65 }
    ]}
  ],

  charisma: [
    { id: "charisma_5", unlockLevel: 5, title: "Primeiros Laços", rewardLabel: "Marco de Carisma I", objectives: [
      { id: "social", label: "Registre 2 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 2 },
      { id: "active", label: "Seja ativo em 5 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 5 },
      { id: "weekly", label: "Conclua 1 missão semanal", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 1 }
    ]},
    { id: "charisma_10", unlockLevel: 10, title: "Provação do Capitão", rewardLabel: "Classe Capitão", objectives: [
      { id: "social", label: "Registre 8 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 8 },
      { id: "active", label: "Seja ativo em 20 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 20 },
      { id: "weekly", label: "Conclua 5 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 5 }
    ]},
    { id: "charisma_15", unlockLevel: 15, title: "Presenca Inspiradora", rewardLabel: "Marco de Carisma II", objectives: [
      { id: "social", label: "Registre 15 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 15 },
      { id: "active", label: "Seja ativo em 40 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 40 },
      { id: "weekly", label: "Conclua 8 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 8 }
    ]},
    { id: "charisma_20", unlockLevel: 20, title: "Ascensão do Capitão", rewardLabel: "Capitão II", objectives: [
      { id: "social", label: "Registre 25 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 25 },
      { id: "active", label: "Seja ativo em 65 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 65 },
      { id: "weekly", label: "Conclua 12 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 12 }
    ]},
    { id: "charisma_25", unlockLevel: 25, title: "Espírito de Equipe", rewardLabel: "Marco de Carisma III", objectives: [
      { id: "social", label: "Registre 40 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 40 },
      { id: "active", label: "Seja ativo em 95 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 95 },
      { id: "weekly", label: "Conclua 18 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 18 }
    ]},
    { id: "charisma_30", unlockLevel: 30, title: "Dominio do Capitão", rewardLabel: "Capitão III", objectives: [
      { id: "social", label: "Registre 60 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 60 },
      { id: "active", label: "Seja ativo em 130 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 130 },
      { id: "weekly", label: "Conclua 25 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 25 }
    ]},
    { id: "charisma_35", unlockLevel: 35, title: "Liderança Natural", rewardLabel: "Marco de Carisma IV", objectives: [
      { id: "social", label: "Registre 85 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 85 },
      { id: "active", label: "Seja ativo em 170 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 170 },
      { id: "weekly", label: "Conclua 33 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 33 }
    ]},
    { id: "charisma_40", unlockLevel: 40, title: "Capitão Veterano", rewardLabel: "Capitão IV", objectives: [
      { id: "social", label: "Registre 115 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 115 },
      { id: "active", label: "Seja ativo em 220 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 220 },
      { id: "weekly", label: "Conclua 42 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 42 }
    ]},
    { id: "charisma_45", unlockLevel: 45, title: "Voz da Comunidade", rewardLabel: "Marco de Carisma V", objectives: [
      { id: "social", label: "Registre 150 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 150 },
      { id: "active", label: "Seja ativo em 280 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 280 },
      { id: "weekly", label: "Conclua 52 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 52 }
    ]},
    { id: "charisma_50", unlockLevel: 50, title: "Comandante", rewardLabel: "Capitão Mestre + Titulo Comandante", objectives: [
      { id: "social", label: "Registre 200 treinos em grupo", metric: { type: "lifetime", key: "socialSessions" }, target: 200 },
      { id: "active", label: "Seja ativo em 365 dias diferentes", metric: { type: "lifetime", key: "activeDays" }, target: 365 },
      { id: "weekly", label: "Conclua 65 missões semanais", metric: { type: "lifetime", key: "weeklyMissionsCompleted" }, target: 65 }
    ]}
  ]
});

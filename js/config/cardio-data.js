"use strict";

const CARDIO_TYPES = {
  treadmill: {
    label: "Esteira", icon: "▰", attribute: "constitution",
    affinities: { primary: "constitution", secondary: { attribute: "agility", ratio: 0.20, performanceTarget: true, eligibility: { minSpeedKmh: 6.0 } } },
    requiredLabel: "Distância • velocidade • inclinação", hint: "Ao finalizar, informe distância, velocidade média e inclinação. Corridas também podem gerar Agilidade pela performance.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.01, required: true },
      { key: "speed", label: "Velocidade média", unit: "km/h", type: "number", min: 0, step: 0.1, required: true },
      { key: "incline", label: "Inclinação média", unit: "%", type: "number", min: 0, step: 0.5, required: false }
    ]
  },
  outdoor_run: {
    label: "Corrida ao ar livre", icon: "↗", attribute: "constitution",
    affinities: { primary: "constitution", secondary: { attribute: "agility", ratio: 0.25, performanceTarget: true, eligibility: { minSpeedKmh: 6.0 } } },
    requiredLabel: "Distância • ritmo", hint: "Informe a distância. Resistência gera Constituição; ritmo e evolução de velocidade podem gerar Agilidade.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.01, required: true }
    ]
  },
  stationary_bike: {
    label: "Bicicleta ergométrica", icon: "◉", attribute: "constitution",
    affinities: { primary: "constitution", secondary: { attribute: "agility", ratio: 0.15, performanceTarget: true, eligibility: { minRpm: 70 } } },
    requiredLabel: "Distância • resistência • RPM", hint: "Resistência e duração geram Constituição. Cadência alta e evolução de performance podem gerar Agilidade.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: true },
      { key: "resistance", label: "Resistência média", unit: "nível", type: "number", min: 0, step: 1, required: false },
      { key: "rpm", label: "Cadência média", unit: "RPM", type: "number", min: 0, step: 1, required: false }
    ]
  },
  outdoor_bike: {
    label: "Ciclismo ao ar livre", icon: "◉", attribute: "constitution",
    affinities: { primary: "constitution", secondary: { attribute: "agility", ratio: 0.15, performanceTarget: true, eligibility: { minSpeedKmh: 18 } } },
    requiredLabel: "Distância • velocidade", hint: "Duração e distância geram Constituição. Velocidade média alta e melhora de performance podem gerar Agilidade.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: true }
    ]
  },
  elliptical: {
    label: "Elíptico", icon: "◇", attribute: "constitution",
    affinities: { primary: "constitution" },
    requiredLabel: "Distância • resistência", hint: "Use a distância e o nível médio mostrados no painel da máquina.", fields: [
      { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: false },
      { key: "resistance", label: "Resistência média", unit: "nível", type: "number", min: 0, step: 1, required: false }
    ]
  },
  stair_climber: {
    label: "Escada / Stair climber", icon: "▤", attribute: "constitution",
    affinities: { primary: "constitution", secondary: { attribute: "force", ratio: 0.15, performanceTarget: true, eligibility: { minMinutes: 10 } } },
    requiredLabel: "Andares • nível", hint: "Endurance gera Constituição; uma sessão consistente também pode gerar uma parcela menor de Força pelas pernas.", fields: [
      { key: "floors", label: "Andares", unit: "andares", type: "number", min: 0, step: 1, required: false },
      { key: "resistance", label: "Nível médio", unit: "nível", type: "number", min: 0, step: 1, required: false }
    ]
  },
  rowing: {
    label: "Remo ergométrico", icon: "≈", attribute: "constitution",
    affinities: { primary: "constitution", secondary: { attribute: "force", ratio: 0.20, performanceTarget: true, eligibility: { minDistanceMeters: 500 } } },
    requiredLabel: "Distância • ritmo /500 m", hint: "Endurance gera Constituição; ritmo e esforço do remo podem gerar uma parcela menor de Força.", fields: [
      { key: "distanceMeters", label: "Distância", unit: "m", type: "number", min: 0, step: 10, required: true }
    ]
  },
  jump_rope: {
    label: "Corda", icon: "∞", attribute: "agility",
    affinities: { primary: "agility", secondary: { attribute: "constitution", ratio: 0.20, performanceTarget: false, eligibility: { minMinutes: 5 } } },
    requiredLabel: "Saltos", hint: "Cadência e coordenação geram Agilidade; sessões sustentadas também podem gerar Constituição.", fields: [
      { key: "jumps", label: "Saltos", unit: "saltos", type: "number", min: 0, step: 1, required: true }
    ]
  },
  swimming: {
    label: "Natação", icon: "≈", attribute: "constitution",
    affinities: { primary: "constitution", secondary: { attribute: "agility", ratio: 0.15, performanceTarget: true, eligibility: { minDistanceMeters: 100 } } },
    requiredLabel: "Distância • piscina", hint: "Endurance gera Constituição; ritmo e eficiência de deslocamento podem gerar Agilidade.", fields: [
      { key: "distanceMeters", label: "Distância", unit: "m", type: "number", min: 0, step: 25, required: true },
      { key: "poolLength", label: "Comprimento da piscina", unit: "m", type: "number", min: 0, step: 5, required: false }
    ]
  }
};

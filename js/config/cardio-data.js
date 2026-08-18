"use strict";

const CARDIO_TYPES = {
  treadmill: { label: "Esteira", icon: "▰", attribute: "constitution", requiredLabel: "Distância • velocidade • inclinação", hint: "Ao finalizar, informe distância, velocidade média e inclinação.", fields: [
    { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.01, required: true },
    { key: "speed", label: "Velocidade média", unit: "km/h", type: "number", min: 0, step: 0.1, required: true },
    { key: "incline", label: "Inclinação média", unit: "%", type: "number", min: 0, step: 0.5, required: false }
  ]},
  outdoor_run: { label: "Corrida ao ar livre", icon: "↗", attribute: "agility", requiredLabel: "Distância • ritmo", hint: "Informe a distância. O ritmo médio é calculado automaticamente pelo tempo.", fields: [
    { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.01, required: true }
  ]},
  stationary_bike: { label: "Bicicleta ergométrica", icon: "◉", attribute: "constitution", requiredLabel: "Distância • resistência • RPM", hint: "Registre os dados exibidos pela bicicleta. RPM é opcional.", fields: [
    { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: true },
    { key: "resistance", label: "Resistência média", unit: "nível", type: "number", min: 0, step: 1, required: false },
    { key: "rpm", label: "Cadência média", unit: "RPM", type: "number", min: 0, step: 1, required: false }
  ]},
  outdoor_bike: { label: "Ciclismo ao ar livre", icon: "◉", attribute: "constitution", requiredLabel: "Distância • velocidade", hint: "Informe a distância; a velocidade média será calculada pelo tempo.", fields: [
    { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: true }
  ]},
  elliptical: { label: "Elíptico", icon: "◇", attribute: "constitution", requiredLabel: "Distância • resistência", hint: "Use a distância e o nível médio mostrados no painel da máquina.", fields: [
    { key: "distance", label: "Distância", unit: "km", type: "number", min: 0, step: 0.1, required: false },
    { key: "resistance", label: "Resistência média", unit: "nível", type: "number", min: 0, step: 1, required: false }
  ]},
  stair_climber: { label: "Escada / Stair climber", icon: "▤", attribute: "constitution", requiredLabel: "Andares • nível", hint: "Registre os andares subidos ou o nível médio exibido pela máquina.", fields: [
    { key: "floors", label: "Andares", unit: "andares", type: "number", min: 0, step: 1, required: false },
    { key: "resistance", label: "Nível médio", unit: "nível", type: "number", min: 0, step: 1, required: false }
  ]},
  rowing: { label: "Remo ergométrico", icon: "≈", attribute: "constitution", requiredLabel: "Distância • ritmo /500 m", hint: "Informe a distância em metros; o ritmo por 500 m é calculado automaticamente.", fields: [
    { key: "distanceMeters", label: "Distância", unit: "m", type: "number", min: 0, step: 10, required: true }
  ]},
  jump_rope: { label: "Corda", icon: "∞", attribute: "agility", requiredLabel: "Saltos", hint: "Registre a quantidade aproximada de saltos realizados.", fields: [
    { key: "jumps", label: "Saltos", unit: "saltos", type: "number", min: 0, step: 1, required: true }
  ]},
  swimming: { label: "Natação", icon: "≈", attribute: "constitution", requiredLabel: "Distância • piscina", hint: "Informe a distância total. O tamanho da piscina é opcional.", fields: [
    { key: "distanceMeters", label: "Distância", unit: "m", type: "number", min: 0, step: 25, required: true },
    { key: "poolLength", label: "Comprimento da piscina", unit: "m", type: "number", min: 0, step: 5, required: false }
  ]}
};

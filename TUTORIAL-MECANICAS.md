# RPG GYM v0.6 — Tutorial de Alterações Mecânicas

Este arquivo explica **onde e como alterar as regras do jogo** sem precisar mexer na interface visual. Ele serve como guia para manutenção, balanceamento e expansão do RPG GYM.

> Regra principal: sempre que possível, altere primeiro os arquivos de `js/config/`. Só mexa em `js/core/` quando você estiver criando um comportamento novo que ainda não existe.

---

## 1. Mapa rápido — onde alterar cada coisa

| Quero alterar... | Arquivo principal |
|---|---|
| Fórmula de XP / level up | `js/core/progression.js` |
| Nível máximo | `js/config/game-config.js` |
| Marcos de nível | `js/config/game-config.js` |
| Nome, classe e bônus de cada atributo | `js/config/game-config.js` |
| XP base das atividades | `js/config/game-config.js` |
| Missões diárias | `js/config/mission-data.js` |
| Missões semanais | `js/config/mission-data.js` |
| Quantidade de missões sorteadas | `js/core/missions.js` |
| Regras de sorteio / repetição de missões | `js/core/missions.js` |
| Roadmaps de atributos | `js/config/roadmap-data.js` |
| Regras de desbloqueio das classes | `js/core/roadmaps-achievements.js` |
| Conquistas / badges | `js/config/achievement-data.js` |
| Títulos globais | `js/config/achievement-data.js` |
| Tipos de cardio | `js/config/cardio-data.js` |
| Estatísticas disponíveis para missões/roadmaps | `js/core/state.js` |
| Dados do treino | `js/systems/workouts.js` |
| Dados da dieta | `js/systems/diet.js` |
| Dados sociais | `js/systems/social.js` |
| Aparência | `css/` e `js/ui/` |

---

# 2. Antes de modificar qualquer mecânica

Faça sempre estas três coisas:

1. **Mantenha os IDs antigos sempre que possível.**
2. **Não renomeie uma métrica existente sem atualizar todos os lugares que usam essa métrica.**
3. Se mudar a estrutura do save, atualize a versão em `game-config.js` e revise a migração em `state.js`.

Exemplo:

```js
const APP_VERSION = "0.3.0";
```

Se uma futura alteração realmente mudar a estrutura dos dados salvos, use algo como:

```js
const APP_VERSION = "0.4.0";
```

Não aumente a versão só porque mudou um texto ou um valor de XP.

---

# 3. XP e progressão de nível

## 3.1 Fórmula do XP necessário

Arquivo:

`js/core/progression.js`

Função atual:

```js
function calculateRequiredXP(level) {
  if (level >= MAX_LEVEL) return 0;
  return Math.ceil(100 * Math.pow(level, 1.2));
}
```

Atualmente:

```text
XP necessário = 100 × nível^1.2
```

### Exemplo: tornar a progressão mais lenta

```js
return Math.ceil(120 * Math.pow(level, 1.25));
```

### Exemplo: tornar a progressão mais rápida

```js
return Math.ceil(90 * Math.pow(level, 1.15));
```

**Cuidado:** mudar esta fórmula afeta todos os seis atributos e todo o ritmo do jogo.

---

## 3.2 Nível máximo

Arquivo:

`js/config/game-config.js`

```js
const MAX_LEVEL = 50;
```

Para aumentar para 60:

```js
const MAX_LEVEL = 60;
```

Se fizer isso, também será necessário revisar roadmaps, marcos, títulos e classes que hoje foram planejados até 50.

---

## 3.3 Marcos

Arquivo:

`js/config/game-config.js`

```js
const MILESTONE_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
```

Se quiser marcos a cada 10 níveis:

```js
const MILESTONE_LEVELS = [10, 20, 30, 40, 50];
```

---

# 4. Atributos e classes

Arquivo:

`js/config/game-config.js`

Cada atributo está dentro de `ATTRIBUTES`.

Exemplo simplificado:

```js
force: {
  name: "Força",
  className: "Berserker",
  unlockBonus: 0.10,
  masterBonus: 0.25,
  bonusLabel: "XP de Força",
  masterTitle: "Titã"
}
```

## Campos importantes

- `name`: nome visível do atributo.
- `className`: nome da classe.
- `unlockBonus`: bônus da classe inicial.
- `masterBonus`: bônus no nível 50.
- `bonusLabel`: texto exibido no bônus.
- `masterTitle`: título final.

### Exemplo: Berserker de 10% para 8%

```js
unlockBonus: 0.08
```

### Exemplo: bônus mestre de 25% para 20%

```js
masterBonus: 0.20
```

O sistema limita o bônus total aplicado a **+50%** dentro de `calculateActivityXp()`.

---

# 5. XP base das atividades

Arquivo:

`js/config/game-config.js`

Objeto:

```js
const ACTIVITIES = Object.freeze({ ... });
```

Exemplo:

```js
heavySet: {
  id: "heavySet",
  name: "Série pesada",
  attribute: "force",
  baseXp: 25,
  category: "training"
}
```

Para mudar Série pesada de 25 para 20 XP:

```js
baseXp: 20
```

Atividades atuais principais:

- `heavySet` → Força
- `hiit` → Agilidade
- `cardio` → Constituição ou Agilidade dependendo do cardio
- `meal` → Inteligência
- `weeklyStreak` → Determinação
- `groupTraining` → Carisma

---

# 6. Como o bônus de XP funciona

Arquivo:

`js/core/progression.js`

A função principal é:

```js
calculateActivityXp(activityId, options)
```

Ela pode combinar:

1. XP base.
2. Bônus de nível.
3. Bônus de classe.
4. Bônus por exercício composto.
5. Bônus mestre de Inteligência em hábitos.
6. Buffs temporários.

Depois soma os bônus e limita o total:

```js
const appliedBonus = Math.min(0.5, rawBonus);
```

Ou seja: **+50% máximo**.

### Bônus por nível

Atualmente:

```js
const levelBonus = Math.min(0.5, attribute.level * 0.01);
```

Isso significa +1% por nível.

Se quiser +0,5% por nível:

```js
const levelBonus = Math.min(0.5, attribute.level * 0.005);
```

---

# 7. Cardio e XP

O cardio é especial porque o XP é calculado pelo tempo e pode receber um pequeno bônus pela distância.

Arquivo:

`js/core/progression.js`

Trecho principal:

```js
baseXp = minutes < 30
  ? Math.max(5, Math.round((minutes / 30) * 20))
  : 20 + Math.floor(minutes - 30);
```

Depois há bônus de distância:

```js
baseXp += Math.min(
  isAgility ? 20 : 15,
  Math.floor(distanceKm * (isAgility ? 2 : 1))
);
```

Se for rebalancear cardio, altere este bloco com cuidado.

---

# 8. Missões diárias

Arquivo:

`js/config/mission-data.js`

Banco:

```js
const DAILY_MISSION_TEMPLATES = Object.freeze([ ... ]);
```

Exemplo completo:

```js
{
  templateId: "d_sets_8",
  category: "training",
  name: "Volume de Trabalho",
  description: "Complete 8 séries válidas hoje.",
  metric: { type: "sets" },
  target: 8,
  reward: {
    type: "xp",
    attribute: "force",
    amount: 30
  }
}
```

## Campos

- `templateId`: ID único e permanente.
- `category`: categoria usada no sorteio.
- `name`: nome da missão.
- `description`: descrição.
- `metric`: o que será contado.
- `target`: quantidade necessária.
- `reward`: recompensa.

### Criar uma diária nova

Exemplo: 12 séries.

```js
{
  templateId: "d_sets_12",
  category: "training",
  name: "Doze Séries",
  description: "Complete 12 séries válidas hoje.",
  metric: { type: "sets" },
  target: 12,
  reward: {
    type: "xp",
    attribute: "force",
    amount: 40
  }
}
```

Adicione dentro de `DAILY_MISSION_TEMPLATES`.

---

# 9. Missões semanais

No mesmo arquivo:

`js/config/mission-data.js`

Banco:

```js
const WEEKLY_MISSION_TEMPLATES = Object.freeze([ ... ]);
```

Exemplo conceitual:

```js
{
  templateId: "w_cardio_90",
  category: "cardio",
  name: "Semana de Resistência",
  description: "Acumule 90 minutos de cardio esta semana.",
  metric: { type: "cardioMinutes" },
  target: 90,
  reward: {
    type: "xp",
    attribute: "constitution",
    amount: 100
  }
}
```

Use metas que normalmente exijam vários dias.

Evite semanais como:

```text
Faça 10 minutos de cardio.
```

Isso é uma missão diária, não semanal.

---

# 10. Quantas missões aparecem

Arquivo:

`js/core/missions.js`

Atualmente são 3 diárias:

```js
count: 3
```

E 3 semanais:

```js
count: 3
```

Também existe uma validação que espera exatamente 3:

```js
state.missions.daily.length !== 3
state.missions.weekly.length !== 3
```

Se mudar para 4, altere **os dois lugares** relacionados ao período.

---

# 11. Categorias de missão

Categorias atuais:

```text
training
cardio
diet
consistency
mixed
social
```

O gerador limita normalmente uma missão de cada categoria por sorteio:

```js
categoryCaps: {
  training: 1,
  cardio: 1,
  diet: 1,
  consistency: 1,
  mixed: 1
}
```

Isso evita receber três missões praticamente iguais.

A categoria `social` atualmente é bloqueada no sorteio automático até existir funcionalidade social real:

```js
if (template.category === "social") return false;
```

---

# 12. Métricas disponíveis para missões

Arquivo que interpreta as métricas:

`js/core/missions.js`

Função:

```js
missionMetricValue(metric, period)
```

Tipos existentes:

```text
workouts
workoutDays
sets
compoundSets
volumeKg
cardioSessions
cardioMinutes
cardioDistanceKm
cardioDays
meals
foodEntries
nutritionDays
dietFinalized
dietFinalizedDays
activeToday
activeDays
uniqueExercises
```

## Exemplos

### 3 treinos

```js
metric: { type: "workouts" },
target: 3
```

### 90 minutos de cardio

```js
metric: { type: "cardioMinutes" },
target: 90
```

### 4 dias diferentes com treino

```js
metric: { type: "workoutDays" },
target: 4
```

### 5 dias com dieta

```js
metric: { type: "nutritionDays" },
target: 5
```

---

# 13. Missões combinadas

Use `metric.type = "all"`.

Exemplo:

```js
metric: {
  type: "all",
  requirements: [
    { type: "workouts", target: 1 },
    { type: "meals", target: 2 }
  ]
},
target: 2
```

O `target: 2` significa que os dois requisitos precisam estar completos.

Exemplo com três requisitos:

```js
metric: {
  type: "all",
  requirements: [
    { type: "workouts", target: 2 },
    { type: "cardioMinutes", target: 45 },
    { type: "nutritionDays", target: 3 }
  ]
},
target: 3
```

---

# 14. Recompensas de missão

Existem dois formatos já suportados.

## XP

```js
reward: {
  type: "xp",
  attribute: "force",
  amount: 30
}
```

Atributos válidos:

```text
force
agility
constitution
intelligence
determination
charisma
```

## Buff temporário

```js
reward: {
  type: "buff",
  multiplier: 1.2,
  durationHours: 24
}
```

Isso ativa 1.2x XP por 24 horas.

**Importante:** o bônus final das atividades continua respeitando o cap geral configurado na engine.

---

# 15. Como as missões são sorteadas

Arquivo:

`js/core/missions.js`

O sistema usa uma seed salva no jogador + data.

Diárias:

```text
seed do jogador + dia
```

Semanais:

```text
seed do jogador + início da semana
```

Por isso atualizar a página não muda as missões.

O sistema também mantém histórico recente:

```js
recentDailyTemplates
recentWeeklyTemplates
```

Limite atual:

```text
12 IDs recentes para diárias
9 IDs recentes para semanais
```

Para aumentar a variedade, aumente o número de templates antes de aumentar estes limites.

---

# 16. Roadmaps de atributos

Arquivo:

`js/config/roadmap-data.js`

Estrutura:

```js
const ATTRIBUTE_ROADMAPS = Object.freeze({
  force: [...],
  agility: [...],
  constitution: [...],
  intelligence: [...],
  determination: [...],
  charisma: [...]
});
```

Cada capítulo tem:

```js
{
  id: "force_10",
  unlockLevel: 10,
  title: "Provação do Berserker",
  rewardLabel: "Classe Berserker",
  objectives: [...]
}
```

## Exemplo de objetivo

```js
{
  id: "sets",
  label: "Complete 100 séries válidas",
  metric: {
    type: "lifetime",
    key: "setsCompleted"
  },
  target: 100
}
```

O roadmap é **permanente e cumulativo**.

---

# 17. Métricas disponíveis para roadmaps

Os roadmaps usam métricas de carreira, atributos e tipos de cardio.

Exemplos já usados:

### Estatística vitalícia

```js
metric: {
  type: "lifetime",
  key: "workoutsCompleted"
}
```

Chaves comuns:

```text
workoutsCompleted
workoutDays
setsCompleted
compoundSets
totalVolumeKg
uniqueExercises
cardioSessions
cardioMinutes
cardioDistanceKm
mealsLogged
foodEntriesLogged
nutritionDays
dietDaysCompleted
activeDays
currentStreak
bestStreak
dailyMissionsCompleted
weeklyMissionsCompleted
socialSessions
```

### Dias ativos de um atributo

```js
metric: {
  type: "attributeActiveDays",
  attribute: "agility"
}
```

### Quantidade de atividades daquele atributo

```js
metric: {
  type: "attributeActivityCount",
  attribute: "agility"
}
```

### Sessões por tipo de cardio

```js
metric: {
  type: "cardioTypeSessions",
  types: ["outdoor_run", "jump_rope"]
}
```

### Minutos por tipo de cardio

```js
metric: {
  type: "cardioTypeMinutes",
  types: ["outdoor_run", "jump_rope"]
}
```

### Total de missões resgatadas

```js
metric: {
  type: "missionClaimsTotal"
}
```

---

# 18. Criar um novo capítulo de roadmap

Exemplo: Força nível 15.

```js
{
  id: "force_15",
  unlockLevel: 15,
  title: "Domínio da Carga",
  rewardLabel: "Marco de Força II",
  objectives: [
    {
      id: "workouts",
      label: "Conclua 20 treinos",
      metric: { type: "lifetime", key: "workoutsCompleted" },
      target: 20
    },
    {
      id: "sets",
      label: "Complete 200 séries",
      metric: { type: "lifetime", key: "setsCompleted" },
      target: 200
    }
  ]
}
```

Coloque depois de `force_10`.

---

# 19. Desbloqueio de classe

Arquivo de regra:

`js/core/roadmaps-achievements.js`

Função principal:

```js
isClassUnlocked(attributeKey, game)
```

A filosofia atual é:

```text
Nível necessário + roadmap da classe completo
```

Não transforme a classe em desbloqueio apenas por nível sem revisar o restante do sistema, pois isso quebra a ideia da v0.2/v0.3.

---

# 20. Conquistas e badges

Arquivo:

`js/config/achievement-data.js`

Banco:

```js
const ACHIEVEMENT_DEFINITIONS = Object.freeze([ ... ]);
```

Exemplo:

```js
{
  id: "hundred_sets",
  group: "Treino",
  icon: "◆",
  title: "Cem Séries",
  description: "Complete 100 séries válidas.",
  reward: "Badge Centurião",
  test: (stats) => stats.lifetime.setsCompleted >= 100
}
```

## Criar uma conquista

Exemplo: 50 treinos.

```js
{
  id: "fifty_workouts",
  group: "Treino",
  icon: "◆",
  title: "Veterano",
  description: "Conclua 50 treinos de musculação.",
  reward: "Badge Veterano",
  test: (stats) => stats.lifetime.workoutsCompleted >= 50
}
```

O campo `id` precisa ser único e deve permanecer estável depois que usuários começarem a desbloqueá-la.

---

# 21. Conquistas que consultam o estado do jogo

Também é possível usar `game`.

Exemplo atual:

```js
test: (_stats, game) =>
  Object.values(game.attributes).every((attr) => attr.level >= 5)
```

Isso verifica se todos os atributos chegaram ao nível 5.

Outro exemplo:

```js
test: (_stats, game) =>
  Object.keys(ATTRIBUTES).some((key) => isClassUnlocked(key, game))
```

Isso verifica se existe pelo menos uma classe desbloqueada.

---

# 22. Títulos globais

Arquivo:

`js/config/achievement-data.js`

```js
const GLOBAL_TITLES = Object.freeze([
  { level: 1, title: "Novato" },
  { level: 5, title: "Iniciado" },
  { level: 10, title: "Discípulo de Ferro" },
  { level: 20, title: "Veterano da Jornada" },
  { level: 30, title: "Elite do RPG GYM" },
  { level: 40, title: "Lenda da Consistência" },
  { level: 50, title: "Ascendente" }
]);
```

Para adicionar um título no nível 15:

```js
{ level: 15, title: "Aventureiro de Ferro" }
```

Mantenha a lista em ordem crescente.

---

# 23. StatsTracker — o coração das mecânicas

Arquivo principal:

`js/core/state.js`

Função:

```js
rebuildStatsFromSources()
```

Ela reconstrói as estatísticas lendo:

- histórico de atividades;
- sessões de treino;
- cardio;
- dieta;
- missões resgatadas;
- streak.

Isso reduz risco de contagem duplicada.

## Estatísticas importantes

Dentro de:

```js
state.stats.lifetime
```

existem valores como:

```text
workoutsCompleted
setsCompleted
compoundSets
totalVolumeKg
cardioSessions
cardioMinutes
cardioDistanceKm
mealsLogged
foodEntriesLogged
dietDaysCompleted
nutritionDays
activeDays
bestStreak
dailyMissionsCompleted
weeklyMissionsCompleted
socialSessions
```

Antes de inventar uma nova métrica de missão, verifique se o StatsTracker já calcula o dado necessário.

---

# 24. Quando uma nova métrica exige código

Exemplo: você quer uma missão:

```text
Faça 50 repetições de agachamento nesta semana.
```

Hoje não existe uma métrica semanal genérica de repetições por exercício no `missionMetricValue()`.

Nesse caso são necessárias duas etapas:

1. Garantir que a informação existe em `state.stats` ou nas sessões.
2. Criar um novo `case` em `missionMetricValue()`.

Exemplo conceitual:

```js
case "exerciseReps":
  return getExerciseRepsForPeriod(metric.exerciseId, period);
```

Depois a missão poderia usar:

```js
metric: {
  type: "exerciseReps",
  exerciseId: "Barbell_Squat"
}
```

**Regra:** só faça isso quando a métrica não puder ser representada pelas métricas existentes.

---

# 25. Tipos de cardio

Arquivo:

`js/config/cardio-data.js`

Exemplo:

```js
treadmill: {
  label: "Esteira",
  attribute: "constitution",
  requiredLabel: "Distância • velocidade • inclinação",
  hint: "Ao finalizar, informe distância, velocidade média e inclinação.",
  fields: [...]
}
```

## Campos do tipo de cardio

- `label`: nome mostrado.
- `attribute`: atributo que recebe XP.
- `requiredLabel`: resumo do que será registrado.
- `hint`: explicação curta.
- `fields`: campos solicitados ao finalizar.

### Criar um cardio novo

Exemplo: caminhada.

```js
walking: {
  label: "Caminhada",
  icon: "→",
  attribute: "constitution",
  requiredLabel: "Distância",
  hint: "Informe a distância percorrida.",
  fields: [
    {
      key: "distance",
      label: "Distância",
      unit: "km",
      type: "number",
      min: 0,
      step: 0.01,
      required: true
    }
  ]
}
```

Se o campo usa `distance` ou `distanceMeters`, o StatsTracker atual já consegue somar distância.

---

# 26. Buffs temporários

Buffs ficam em:

```js
state.buffs
```

Formato:

```js
{
  id: "...",
  multiplier: 1.2,
  source: "Nome da missão",
  activatedAt: "...",
  expiresAt: "..."
}
```

Um multiplicador de `1.2` significa +20%.

Missões podem criar buffs usando:

```js
reward: {
  type: "buff",
  multiplier: 1.2,
  durationHours: 24
}
```

---

# 27. Streak

O streak está em:

```js
state.streak
```

Campos:

```text
current
best
lastActiveDate
lastWeeklyRewardDate
```

As estatísticas reconstruídas também copiam:

```text
currentStreak
bestStreak
```

Use `bestStreak` para conquistas e roadmaps que nunca devem regredir.

Use `currentStreak` somente para desafios que realmente dependem da sequência atual.

---

# 28. O que NÃO colocar em missão diária

Evite:

- metas que exigem vários dias;
- metas extremamente específicas de equipamento;
- metas que obrigam um tipo de treino que o usuário talvez não faça;
- missões sociais enquanto Social não for real;
- tarefas que incentivam volume excessivo de exercício;
- tarefas nutricionais que exigem perfeição absoluta.

Uma diária deve ser normalmente completável em um dia saudável e comum.

---

# 29. O que NÃO colocar em missão semanal

Evite uma missão que o usuário conclui em cinco minutos.

Boas semanais medem:

- frequência;
- volume distribuído;
- dias diferentes;
- minutos acumulados;
- consistência da dieta;
- combinações de sistemas.

---

# 30. Como balancear recompensas

Uma regra prática inicial:

### Diárias

```text
Pequena: 15–20 XP
Normal: 25–30 XP
Mais trabalhosa: 35–45 XP
```

### Semanais

Use recompensas maiores porque exigem vários dias.

Você pode usar:

- XP direto;
- buff temporário;
- futuramente badge/cosmético, se a engine for expandida.

Evite dar recompensa grande demais a missões que já seriam naturalmente concluídas durante o uso normal.

---

# 31. Alterar nomes sem quebrar saves

Pode mudar:

```js
name
description
label
rewardLabel
title
```

Com baixo risco.

Evite mudar:

```js
templateId
id de conquista
id de roadmap
id de atividade
chave de atributo
```

Esses IDs são usados pelo save.

---

# 32. IDs — padrão recomendado

## Diárias

```text
d_<categoria>_<descrição>
```

Exemplos:

```text
d_sets_12
d_cardio_25
d_meals_3
```

## Semanais

```text
w_<categoria>_<descrição>
```

## Roadmaps

```text
<atributo>_<nível>
```

Exemplos:

```text
force_15
agility_20
```

## Conquistas

Use nome descritivo em inglês simples:

```text
fifty_workouts
cardio_500
streak_30
```

---

# 33. Checklist para adicionar missão diária

1. Abra `js/config/mission-data.js`.
2. Adicione um objeto em `DAILY_MISSION_TEMPLATES`.
3. Crie `templateId` único.
4. Escolha categoria.
5. Escolha métrica existente.
6. Defina `target` sensato para um dia.
7. Defina recompensa.
8. Abra o app com save de teste.
9. Confirme que a missão pode aparecer.
10. Registre atividade e confira progresso.
11. Resgate e confira XP/buff.

---

# 34. Checklist para adicionar missão semanal

1. Use `WEEKLY_MISSION_TEMPLATES`.
2. Meta deve exigir esforço distribuído na semana.
3. Evite sobreposição com outras semanais da mesma categoria.
4. Teste progresso em mais de uma data se possível.
5. Confira renovação na semana seguinte.

---

# 35. Checklist para adicionar conquista

1. Abra `achievement-data.js`.
2. Crie `id` único.
3. Escolha grupo.
4. Escreva título e descrição.
5. Defina `reward` textual.
6. Crie `test` usando `stats` ou `game`.
7. Teste com valores abaixo do requisito.
8. Teste com valores acima do requisito.
9. Garanta que não desbloqueia repetidamente.

---

# 36. Checklist para roadmap

1. Abra `roadmap-data.js`.
2. Selecione atributo.
3. Crie capítulo com `id` permanente.
4. Defina `unlockLevel`.
5. Defina objetivos cumulativos.
6. Use métricas de carreira sempre que possível.
7. Evite objetivos impossíveis para o perfil de atividade daquele atributo.
8. Confirme que o capítulo anterior continua coerente.
9. Teste classe/marco após conclusão.

---

# 37. Como fazer testes sem esperar semanas

Para desenvolvimento, você pode temporariamente reduzir `target` no arquivo de configuração.

Exemplo:

```js
target: 100
```

vira temporariamente:

```js
target: 2
```

Teste o fluxo e depois restaure o valor final.

Não altere manualmente a data do sistema como método principal de teste, porque missões usam datas e semanas para geração determinística.

---

# 38. Como testar XP

Use um save separado e anote:

```text
nível antes
XP antes
atividade
XP base
bônus
XP recebido
nível depois
XP depois
```

Teste pelo menos:

- nível 1;
- nível próximo de subir;
- classe desbloqueada;
- exercício composto;
- buff ativo;
- situação em que bônus ultrapassaria +50%.

---

# 39. Como testar missões

Teste:

- missão ativa;
- missão parcialmente completa;
- missão completa;
- resgate;
- tentativa de resgatar duas vezes;
- mudança de dia;
- mudança de semana;
- refresh da página;
- missão com métrica `all`;
- buff como recompensa.

---

# 40. Como testar roadmaps e classes

Teste quatro estados:

1. Nível insuficiente + objetivos incompletos.
2. Nível suficiente + objetivos incompletos.
3. Objetivos completos + nível insuficiente.
4. Nível suficiente + objetivos completos.

A classe só deve ser considerada desbloqueada no estado 4.

---

# 41. Alterações que exigem atenção especial

São mudanças de alto risco:

- mudar nomes de IDs;
- mudar `STORAGE_KEY`;
- excluir campos do `state`;
- alterar estrutura de `stats`;
- mudar IDs de exercícios usados em históricos;
- alterar como sessões antigas são interpretadas;
- alterar como roadmaps identificam capítulos já resgatados.

Faça backup do save antes.

---

# 42. Storage e save

Arquivo:

`js/config/game-config.js`

```js
const STORAGE_KEY = "rpgGymMvp_v1";
```

Não mude essa chave sem criar migração, ou o app parecerá ter perdido todo o progresso.

Dieta possui uma chave própria em `js/core/runtime.js`:

```js
const DIET_STORAGE_KEY = "rpgGymDiet_v1";
```

---

# 43. Onde mexer na mecânica de treino

Arquivo:

`js/systems/workouts.js`

Altere aqui quando o comportamento depender de:

- séries;
- carga;
- repetições;
- volume;
- exercícios compostos;
- timer de exercício;
- rotinas;
- finalização de treino.

Não coloque regras de UI ou CSS aqui.

---

# 44. Onde mexer na mecânica de dieta

Arquivo:

`js/systems/diet.js`

Use para:

- registros alimentares;
- edição de quantidade;
- finalização/reabertura de dia;
- favoritos;
- porções;
- metas nutricionais.

Regras RPG ligadas à dieta devem preferir `progression.js`, missões ou roadmaps, e não ficar misturadas ao render da Dieta.

---

# 45. Onde mexer na mecânica social

Arquivo:

`js/systems/social.js`

O Social ainda deve ser tratado com cuidado enquanto não existe backend real.

Quando grupos reais existirem, estatísticas sociais devem alimentar:

```text
socialSessions
Carisma
roadmaps de Carisma
missões sociais
conquistas sociais
```

---

# 46. Onde mexer no visual

Não confunda configuração mecânica com UI.

Visual:

```text
css/base.css
css/product.css
css/systems.css
css/polish.css
js/ui/views.js
js/ui/interactions.js
```

Mecânica:

```text
js/config/
js/core/
js/systems/
```

Se você quiser apenas mudar “30 séries” para “25 séries”, **não precisa tocar na UI**.

---

# 47. Fluxo ideal para qualquer nova mecânica

Antes de programar, pergunte:

### 1. É só um valor ou conteúdo novo?

Use `js/config/`.

### 2. Usa uma métrica que já existe?

Reaproveite o StatsTracker.

### 3. Precisa de um novo tipo de métrica?

Implemente no `core`.

### 4. Precisa salvar dado novo?

Atualize `state.js` e migração.

### 5. Precisa aparecer na tela?

Só então altere `ui/`.

Essa ordem reduz muito a chance de quebrar outras partes do app.

---

# 48. Exemplo completo — criar uma nova semanal

Objetivo:

> Faça musculação em 4 dias diferentes durante a semana.

Em `mission-data.js`:

```js
{
  templateId: "w_workout_days_4",
  category: "training",
  name: "Quatro Dias de Ferro",
  description: "Faça musculação em 4 dias diferentes nesta semana.",
  metric: { type: "workoutDays" },
  target: 4,
  reward: {
    type: "xp",
    attribute: "determination",
    amount: 100
  }
}
```

Nenhuma alteração na engine é necessária porque `workoutDays` já existe.

---

# 49. Exemplo completo — criar badge de cardio

Objetivo:

> 1.000 minutos de cardio na carreira.

Em `achievement-data.js`:

```js
{
  id: "cardio_1000",
  group: "Cardio",
  icon: "◇",
  title: "Motor Infinito",
  description: "Acumule 1.000 minutos de cardio.",
  reward: "Badge Motor Infinito",
  test: (stats) => stats.lifetime.cardioMinutes >= 1000
}
```

Como `cardioMinutes` já existe, não precisa alterar a engine.

---

# 50. Exemplo completo — novo roadmap de Constituição nível 15

Em `roadmap-data.js`:

```js
{
  id: "constitution_15",
  unlockLevel: 15,
  title: "Resistência Prolongada",
  rewardLabel: "Marco de Constituição II",
  objectives: [
    {
      id: "minutes",
      label: "Acumule 600 minutos de cardio",
      metric: { type: "lifetime", key: "cardioMinutes" },
      target: 600
    },
    {
      id: "sessions",
      label: "Complete 25 sessões de cardio",
      metric: { type: "lifetime", key: "cardioSessions" },
      target: 25
    }
  ]
}
```

---

# 51. Regra de ouro de balanceamento

Evite mudar cinco sistemas ao mesmo tempo.

Faça assim:

```text
1. escolha uma mecânica
2. altere
3. teste
4. observe o impacto
5. só depois altere outra
```

Exemplo ruim:

```text
mudar fórmula de XP + XP das atividades + bônus das classes + recompensas das missões
```

Se a progressão ficar rápida demais, você não saberá qual mudança causou o problema.

---

# 52. Arquivos que normalmente NÃO precisam ser alterados para balanceamento

Na maioria das mudanças mecânicas simples, deixe estes arquivos intactos:

```text
index.html
css/base.css
css/product.css
css/systems.css
css/polish.css
js/ui/views.js
js/ui/interactions.js
js/data/exercises.js
js/data/foods.js
```

---

# 53. Resumo final

Para balancear o RPG GYM, pense assim:

```text
CONTEÚDO / NÚMEROS
        ↓
js/config/
        ↓
ENGINES
        ↓
js/core/
        ↓
SISTEMAS REAIS
        ↓
js/systems/
        ↓
INTERFACE
        ↓
js/ui/ + CSS
```

Quanto mais alterações conseguirmos fazer apenas em `js/config/`, mais saudável e fácil de manter será o projeto.

---

## Arquivos mais importantes para edição mecânica

```text
js/config/game-config.js
js/config/mission-data.js
js/config/roadmap-data.js
js/config/achievement-data.js
js/config/cardio-data.js
```

Esses são os primeiros arquivos que você deve abrir quando quiser alterar balanceamento, missões, roadmaps, badges, classes ou cardio.



# ROADMAP COMPLETO 1-50

Cada atributo possui 10 capitulos em `js/config/roadmap-data.js`, nos niveis 5, 10, 15, 20, 25, 30, 35, 40, 45 e 50.

- 5/15/25/35/45: marcos intermediarios.
- 10: desbloqueio inicial da classe.
- 20/30/40: evolucoes II, III e IV da classe.
- 50: mestria da classe e titulo final.

Os objetivos sao cumulativos. Para rebalancear, altere apenas `target`, `label`, `title` ou `rewardLabel`, mantendo `id` e `metric` quando quiser preservar compatibilidade com saves.

A UI calcula o estagio da classe pelo maior capitulo de classe realmente resgatado, portanto apenas atingir o nivel nao promove automaticamente a classe. O bonus mestre tambem exige o capitulo de nivel 50.


# Central de balanceamento (v0.3.2)

Antes de alterar números dentro das engines, abra `js/config/balance-config.js`. Ele concentra curva de nível, bônus, musculação, cardio, dieta, missões, roadmap e regras anti-farm.

A curva atual é `120 × nível^1.35`. Ela é uma curva de potência, não exponencial pura.

O treino usa XP de conclusão + séries. Até 20 séries de trabalho valem o valor integral; depois disso as séries continuam dando XP, porém com retorno menor. Não existe cap semanal.

O cardio usa conclusão da sessão + minutos por faixas: 0–30, 31–60 e 60+. Quanto mais tempo, mais XP, mas o retorno marginal cai.

O limite combinado de bônus foi reduzido para 25%. Os estágios de classe usam 3%, 5%, 7%, 10% e 15% nos marcos 10/20/30/40/50.

Para testar a velocidade de progressão, abra `tools/progression-simulator.html`. Ajuste primeiro `balance-config.js`, depois as recompensas específicas em `mission-data.js` e `roadmap-data.js`.

# Modelo A — v0.3.3

A filosofia atual é **sem cap de XP**. Atividade real adicional sempre pode gerar progresso.

## Repetição no mesmo dia

Edite em `js/config/balance-config.js`:

```js
antiFarm: {
  sameCategoryDailyMultipliers: [1, 0.75, 0.50],
  fourthPlusSameCategoryMultiplier: 0.40
}
```

A primeira musculação do dia recebe 100%, a segunda 75%, a terceira 50% e da quarta em diante 40%. Cardio usa um contador próprio. Portanto, musculação + cardio no mesmo dia continuam recebendo 100% cada na primeira sessão da categoria.

## PR de musculação

```js
workout: {
  prBonus: 10,
  maxPrBonusesPerWorkout: 3,
  prImprovementRatio: 0.01
}
```

O primeiro registro de um exercício cria a referência. A partir do próximo treino, superar a melhor marca por mais de 1% pode gerar PR. No máximo três exercícios geram bônus de PR por treino, embora todos os PRs possam ser registrados no resumo.

Para exercícios com carga + reps o sistema usa 1RM estimado de Epley para evitar que apenas aumentar peso com uma repetição muito baixa seja sempre a melhor estratégia. Exercícios de peso corporal usam repetições e exercícios isométricos usam duração.

## Performance do cardio

```js
cardio: {
  performanceBonus: 12,
  performanceImprovementRatio: 0.01
}
```

A comparação varia por modalidade: ritmo em corrida, velocidade média em bike/elíptico, /500m no remo, saltos/min na corda, ritmo /100m na natação e andares/min na escada.

## Sessões curtas

O bônus fixo de conclusão não deve tornar micro-sessões a melhor estratégia para farmar XP.

Musculação usa `minWorkingSetsForFullCompletion`; abaixo dessa faixa o bônus fixo é proporcional por patamares. Cardio usa `minMinutesForFullCompletion`, com bônus de conclusão proporcional até atingir o tempo mínimo.

## Regra de design

Não transforme retorno decrescente em bloqueio. O jogador que fizer mais deve sempre terminar com mais XP do que quem fez menos, desde que a atividade seja válida. O objetivo é reduzir a eficiência do spam, não punir treino real.


## Cardio com múltiplos atributos (v0.3.4)

O cardio agora usa afinidades em vez de uma relação rígida 1:1 entre atividade e atributo. A duração/endurance alimenta o atributo primário; uma característica secundária mensurável pode gerar uma parcela menor de XP (máximo configurado de 30% da base primária). Exemplos: corrida/esteira = Constituição + Agilidade; remo/escada = Constituição + Força; corda = Agilidade + Constituição. O XP secundário só aparece quando a modalidade atende aos critérios de performance definidos em `js/config/cardio-data.js`. PRs de performance são direcionados ao atributo que representa aquela performance quando apropriado.


## v0.4.2 — Como ler a jornada visual

Cada rota de atributo possui 10 capítulos, nos níveis 5, 10, 15, 20, 25, 30, 35, 40, 45 e 50. A linha no topo resume a jornada inteira sem exigir que o usuário leia todos os cards.

- **Concluído:** etapa já resgatada.
- **Atual:** próximo capítulo permanente da rota.
- **Pronto:** nível e objetivos atendidos; pode ser desbloqueado.
- **Futuro:** ainda depende de nível e/ou objetivos.

Os níveis terminados em 5 são **marcos**. Os níveis 10, 20, 30, 40 e 50 são **evoluções de classe**. A trilha da classe mostra I → II → III → IV → Mestre. Essa apresentação não muda os requisitos mecânicos: nível + objetivos do capítulo continuam necessários.

## Social — criar, entrar e sair de grupos (v0.5.4)

O Social usa uma associação de grupo por usuário. A interface lê `groups`, `group_members` e `social_profiles`, mas a criação e a saída passam por funções SQL para manter a operação consistente.

- `create_social_group(name, description, focus)` cria o grupo e o vínculo `owner` na mesma operação.
- `leave_social_group(group_id)` remove o vínculo do usuário. Se ele for o dono, a função transfere a propriedade para outro integrante; se for o último membro, remove o grupo.
- A home do Social mostra um cartão do grupo atual + feed de atividade recente. A lista completa de participantes só é carregada ao abrir o grupo.
- O perfil social continua separado do save privado. Comparações usam apenas exercícios em comum presentes no snapshot social.

Para alterar regras de criação/saída, edite `supabase/v0.5.4-groups.sql` e crie uma nova migração em vez de sobrescrever uma migração já aplicada em produção.


---

## v0.6 — estabilidade, conta e produto

| Função | Arquivo |
|---|---|
| Sincronização nuvem/offline/conflitos | `js/core/cloud-sync.js` |
| Backup, importação, correção histórica e tratamento de erros | `js/core/stability.js` |
| Troca de senha e exclusão de conta | `js/core/account-security.js` |
| Instalação PWA | `js/core/pwa.js` |
| Cache offline | `service-worker.js` |
| Manifesto instalável | `manifest.webmanifest` |
| Segurança Supabase v0.6 | `supabase/v0.6.0-beta.sql` |

### Regra de conflito de save
O app registra o horário da última sincronização conhecida. Se o save local e o da nuvem tiverem sido modificados independentemente desde esse ponto, o usuário escolhe qual versão manter. Não altere essa decisão para “o mais novo sempre vence” sem considerar perda de dados em dois dispositivos.

### Correções históricas
Na v0.6, corrigir histórico recalcula estatísticas derivadas, mas preserva o XP já concedido. Isso impede que edição retroativa vire uma ferramenta de farm ou perda acidental de níveis. Se no futuro você implementar um ledger de XP imutável por evento, aí será possível recalcular XP histórico com segurança.

### Service Worker
Sempre altere `CACHE_NAME` em `service-worker.js` quando publicar uma versão que precise invalidar arquivos antigos. Não coloque respostas privadas do Supabase no cache do Service Worker.

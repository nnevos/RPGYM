# RPG GYM v0.3.0

Esta versao reorganiza o projeto para separar dados, regras, sistemas e interface sem usar frameworks ou ES modules.
Isso permite abrir `index.html` diretamente pelo navegador (file://) e ainda manter os arquivos editaveis.

## Estrutura

- `index.html`: estrutura das telas.
- `css/style.css`: toda a camada visual.
- `js/data/`: bases grandes de exercicios e alimentos.
- `js/config/`: valores de balanceamento e conteudo editavel.
- `js/core/`: estado, save, stats, missoes, XP, roadmaps e helpers.
- `js/systems/`: funcionalidades de treino, dieta e social.
- `js/ui/`: renderizacao, modais, eventos e navegacao.
- `js/app.js`: ponto de entrada.

## Onde alterar o RPG

- XP, atributos e classes: `js/config/game-config.js` + `js/core/progression.js`.
- Missoes diarias/semanais: `js/config/mission-data.js`.
- Roadmaps: `js/config/roadmap-data.js`.
- Conquistas: `js/config/achievement-data.js`.
- Tipos/campos de cardio: `js/config/cardio-data.js`.

## Regra de manutencao

Sempre que possivel, altere primeiro um arquivo em `js/config/`. As engines em `js/core/` devem interpretar os dados, nao armazenar valores de balanceamento espalhados pelo codigo.

## Tutorial de mecânicas

Para alterar XP, missões diárias/semanais, roadmaps, classes, badges, títulos, buffs, métricas e balanceamento, consulte `TUTORIAL-MECANICAS.md`.

## Roadmaps completos

As seis rotas de atributos possuem agora capitulos nos niveis 5, 10, 15, 20, 25, 30, 35, 40, 45 e 50. Edite `js/config/roadmap-data.js` para rebalancear metas e recompensas. Evolucoes de classe em 20/30/40/50 dependem do capitulo correspondente.


## v0.3.2 — Balanceamento

Os números centrais agora ficam em `js/config/balance-config.js`.

Abra `tools/progression-simulator.html` para comparar Casual / Médio / Dedicado em 12, 26 e 52 semanas. O simulador é uma ferramenta de desenvolvimento e não aparece no app.

A v0.3.2 também troca o XP de musculação por sessão + séries com retorno decrescente, cardio por faixas de duração, reduz o peso das recompensas de missões e limita bônus combinados a 25%.

## v0.3.3 — Modelo A de progressão

A progressão agora segue o Modelo A: níveis iniciais avançam mais rápido e o custo cresce naturalmente no longo prazo. Não existe limite semanal de XP.

Regras principais:

- musculação, cardio e dieta são categorias independentes; fazer musculação e cardio no mesmo dia não reduz uma à outra;
- repetir a mesma categoria no mesmo dia continua concedendo XP, porém com retorno decrescente;
- treinos muito curtos recebem apenas parte do bônus fixo de conclusão, mas continuam contando séries válidas;
- cardio abaixo de 10 minutos recebe o bônus de conclusão proporcional ao tempo;
- musculação reconhece PR por exercício usando melhor performance anterior (1RM estimado para carga + reps, reps para peso corporal e tempo para isometria);
- cardio cria uma referência na primeira sessão e pode premiar melhora real de ritmo, velocidade/cadência conforme o tipo de atividade;
- a primeira referência não é tratada como PR;
- missões semanais com buff temporário passaram de 1.20x para 1.10x;
- roadmaps de Força incluem objetivos de PR nos marcos de classe de longo prazo.

Os valores continuam centralizados em `js/config/balance-config.js`.

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

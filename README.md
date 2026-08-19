# RPG GYM v0.4.4

A v0.4.4 é uma refatoração técnica. Ela mantém as mecânicas e o visual da v0.4.3, mas reduz trabalho desnecessário no navegador e deixa a base mais simples de manter.

O projeto continua sem frameworks e pode ser executado abrindo `index.html` diretamente no navegador.

## Estrutura

```text
RPG-GYM/
├── index.html
├── README.md
├── TUTORIAL-MECANICAS.md
├── css/
│   ├── base.css
│   ├── product.css
│   ├── systems.css
│   └── polish.css
├── js/
│   ├── app.js
│   ├── config/
│   ├── core/
│   ├── data/
│   ├── systems/
│   └── ui/
└── tools/
```

### CSS

Os estilos foram separados mantendo a mesma ordem de cascata da versão anterior:

- `base.css`: fundação visual e estilos antigos de base;
- `product.css`: linguagem visual do produto e componentes estruturais;
- `systems.css`: estilos específicos dos sistemas Treino, Cardio, Dieta e RPG;
- `polish.css`: ajustes finais de UX, responsividade e acessibilidade.

A ordem dos quatro `<link>` em `index.html` é intencional. Não altere a ordem sem revisar a cascata.

### JavaScript

- `js/data/`: bases estáticas grandes de exercícios e alimentos;
- `js/config/`: balanceamento e conteúdo configurável;
- `js/core/`: save, stats, XP, missões, roadmaps, runtime e utilitários;
- `js/systems/`: Treino, Cardio, Dieta e Social;
- `js/ui/`: renderização, interações, modais e navegação;
- `js/app.js`: entrada da aplicação.

## Otimizações da v0.4.4

- exercícios e alimentos possuem índices `Map` para consultas por ID em O(1), evitando vários `Array.find()` durante renderizações;
- filtros de músculo/equipamento e agrupamentos de alimentos comuns são pré-calculados uma vez na inicialização;
- textos normalizados de pesquisa são pré-indexados, reduzindo trabalho a cada tecla digitada;
- busca de exercícios, alimentos e grupos utiliza debounce curto;
- alterações rápidas em carga, reps, notas e nome do treino usam salvamento agrupado, reduzindo gravações repetidas no `localStorage`;
- o save pendente é descarregado ao sair da página;
- `updateUI()` renderiza somente a tela ativa em vez de reconstruir todas as telas escondidas;
- ao navegar, a tela de destino é atualizada naquele momento, preservando dados atuais sem custo de renderização invisível.

## Onde alterar o RPG

- Curva, XP e anti-farm: `js/config/balance-config.js`
- Atributos e classes: `js/config/game-config.js`
- Missões: `js/config/mission-data.js`
- Roadmaps: `js/config/roadmap-data.js`
- Conquistas: `js/config/achievement-data.js`
- Cardio multiatributo: `js/config/cardio-data.js`

Para alterações mecânicas detalhadas, consulte `TUTORIAL-MECANICAS.md`.

## Regra de manutenção

Valores de balanceamento devem ficar em `js/config/` sempre que possível. `js/core/` interpreta as regras, `js/systems/` registra as atividades e `js/ui/` apresenta o resultado. Evite colocar números de balanceamento diretamente na camada visual.

## Compatibilidade

A v0.4.4 não muda a estrutura funcional do save nem o balanceamento da v0.4.3. Saves existentes continuam sendo migrados normalmente pelo sistema atual.

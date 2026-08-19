# RPG GYM v0.6.0

Beta utilizável por amigos. O projeto continua em HTML, CSS e JavaScript puro, com Supabase para autenticação, save e recursos sociais.

## Rodar
Para desenvolvimento local, use um servidor HTTP em vez de abrir `index.html` diretamente:

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.

Para amigos, publique a pasta inteira em um host HTTPS (Netlify, Vercel, GitHub Pages ou equivalente) e configure a URL publicada em Supabase > Authentication > URL Configuration.

## Supabase
A configuração pública já fica em `js/config/supabase-config.js`. Nunca coloque `service_role` ou `sb_secret_...` no frontend.

Se você já executou todos os SQLs da v0.5.x, execute somente:

`supabase/v0.6.0-beta.sql`

Ele adiciona a exclusão segura de conta, reafirma grants/RLS usados pelo navegador e endurece o limite do bucket de avatares.

## Estrutura
- `css/` — visual e responsividade.
- `js/config/` — balanceamento e configuração.
- `js/core/` — estado, autenticação, sincronização, estabilidade, conta e PWA.
- `js/systems/` — treino, cardio, dieta e social.
- `js/data/` — exercícios e alimentos.
- `supabase/` — migrações SQL.
- `service-worker.js` / `manifest.webmanifest` — PWA e cache offline.

## v0.6
A versão fecha três frentes:
- estabilidade/sincronização: conflitos, modo offline, backup e correção histórica;
- conta/segurança: senha, exclusão de conta, RLS e upload restrito;
- produto: PWA, instalação e polimento mobile.

Leia `BETA-CHECKLIST.md` antes de liberar para outras pessoas.

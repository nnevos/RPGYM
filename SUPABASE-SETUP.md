# RPG GYM v0.5.1 — Configuração do Supabase

Esta versão integra **login, cadastro, recuperação de senha, perfil inicial e tutorial** com Supabase.
O progresso de treino/cardio/dieta ainda permanece local nesta etapa. A conta e os dados do onboarding ficam no Supabase.

## 1. Configuração recomendada no projeto Supabase

Em **Project Settings / API** ou na tela de segurança da Data API:

- **Enable Data API:** ligado
- **Automatically expose new tables:** desligado
- **Enable automatic RLS:** ligado

O arquivo `supabase/schema.sql` também habilita RLS explicitamente na tabela `profiles`.

## 2. Criar a tabela e as policies

Abra **SQL Editor** no Supabase e execute todo o arquivo:

`supabase/schema.sql`

Ele cria:

- `public.profiles`
- trigger para criar perfil ao cadastrar usuário
- RLS
- policies para cada usuário ler/editar somente o próprio perfil
- grants explícitos para o papel `authenticated`

## 3. Configurar o front-end

Abra:

`js/config/supabase-config.js`

Preencha somente:

```js
url: "https://SEU-PROJETO.supabase.co",
publishableKey: "SUA_CHAVE_PUBLICA"
```

Use a **Publishable key** ou a chave pública `anon`, conforme a interface do seu projeto.

**Nunca coloque a `service_role` no navegador.**

## 4. Authentication > URL Configuration

Para confirmação de email e recuperação de senha, o aplicativo precisa ser servido por HTTP/HTTPS.

Exemplo local:

```bash
python -m http.server 8080
```

Abra:

`http://localhost:8080`

No Supabase, coloque em **Site URL** e/ou **Redirect URLs** a URL que vai usar, por exemplo:

`http://localhost:8080/`

Em produção, substitua pelo domínio real.

> Abrir diretamente `index.html` por `file://` pode funcionar para login/senha simples, mas não é adequado para links de confirmação e recuperação enviados por email.

## 5. Confirmação de email

A implementação suporta os dois cenários:

- confirmação de email desativada: após cadastro, o onboarding abre imediatamente;
- confirmação ativada: o app mostra “Confirme seu email” e o usuário entra depois de validar o link.

## 6. Fluxo implementado

1. Launch screen
2. Login
3. Cadastro
4. Esqueci a senha
5. Nova senha por link de recuperação
6. Onboarding do perfil:
   - sexo fisiológico / opção de não informar
   - nascimento
   - peso
   - altura
   - objetivo
   - nível de atividade
7. Tutorial RPG GYM
8. Aplicativo principal

O Supabase registra `onboarding_completed` e `tutorial_completed`, então esses fluxos não reaparecem a cada login.

## 7. Segurança atual

A tabela `profiles` utiliza `auth.uid() = id` nas policies. Isso significa que um usuário autenticado não deve conseguir ler ou editar o perfil de outro usuário pela Data API.

Nesta versão o **save completo do jogo ainda não foi enviado para o Supabase**. Treinos, dieta, XP e demais dados permanecem no `localStorage`, preparando a próxima fase de sincronização.

## 8. Saves locais por conta

Enquanto o save completo ainda não está na nuvem, esta versão separa `localStorage` pelo `user.id` do Supabase. Assim, duas contas usadas no mesmo navegador não compartilham o mesmo progresso local.

Na primeira migração da v0.4.x, o save local antigo pode ser associado à primeira conta Supabase usada naquele navegador para evitar perda de progresso.

## v0.5.1 - sincronização do progresso

Se o schema da v0.5.0 já foi executado, rode também no SQL Editor:

`supabase/v0.5.1-sync.sql`

A nova tabela `game_saves` guarda um snapshot JSON do estado mecânico e da Dieta. Ela possui RLS e cada usuário só pode ler/alterar a própria linha.

O navegador continua mantendo uma cópia em `localStorage`. A nuvem é usada para restaurar o progresso em outro dispositivo e manter a conta sincronizada. Alterações são agrupadas antes do envio para reduzir requisições.

---

## v0.5.2 — Social / Grupos

Depois de configurar `profiles` e `game_saves`, execute no SQL Editor:

`supabase/v0.5.2-social.sql`

Esse migration cria:

- `groups`: grupos pesquisáveis;
- `group_members`: vínculo entre usuário e grupo;
- `social_profiles`: snapshot limitado do progresso que pode ser visto por integrantes do mesmo grupo.

O `game_saves` **não é exposto para os integrantes**. Comparações e atualizações usam apenas `social_profiles`, que contém nome de exibição, título, níveis, estatísticas resumidas, exercícios e atividade recente.

### Realtime

O migration adiciona `social_profiles` e `group_members` à publication `supabase_realtime` quando ela existe. A v0.5.2 usa Postgres Changes por ser simples e suficiente para o MVP. Em escala maior, o recomendado é migrar atualizações de grupo para Broadcast privado.

### Segurança

As policies garantem que:

- um usuário pode entrar/sair apenas com o próprio `user_id`;
- integrantes só enxergam perfis sociais de pessoas que compartilham o mesmo grupo;
- dados privados de `profiles` e o conteúdo completo de `game_saves` não são usados no Social.


## Atualização v0.5.3 — foto de perfil

Depois de `schema.sql`, `v0.5.1-sync.sql` e `v0.5.2-social.sql`, execute também:

`supabase/v0.5.3-avatar-cardio.sql`

O script cria um bucket público chamado `avatars`. A leitura da imagem é pública porque ela aparece no perfil social, mas upload, substituição e remoção continuam protegidos por RLS e só podem ocorrer dentro da pasta do UID autenticado. O frontend usa apenas a Publishable key.


## Atualizacao v0.5.4 — grupos criados pelo usuario

Execute no SQL Editor, depois dos scripts anteriores:

`supabase/v0.5.4-groups.sql`

O script adiciona duas funcoes protegidas:

- `create_social_group(...)`: cria o grupo e registra o usuario autenticado como dono em uma unica operacao.
- `leave_social_group(...)`: permite sair com seguranca; se o dono sair, transfere a propriedade para outro integrante, ou apaga o grupo quando ele era o ultimo membro.

Os nomes dos grupos tambem passam a ser unicos sem diferenciar letras maiusculas/minusculas.

## Exclusão de grupos (hotfix v0.5.4)
Se você já executou `v0.5.4-groups.sql`, execute também uma única vez:

`supabase/v0.5.4-delete-group.sql`

A função valida no servidor se `auth.uid()` é o dono antes de permitir a exclusão.

---

## v0.6.0 — preparação para beta

Se você já executou as migrações anteriores, rode apenas:

`supabase/v0.6.0-beta.sql`

Esse script:
- limita o bucket `avatars` a 2 MB e apenas JPG/PNG/WebP;
- reafirma grants mínimos das tabelas públicas usadas pelo cliente;
- cria `public.delete_my_account()`, uma RPC autenticada que permite ao próprio usuário excluir sua conta;
- antes da exclusão, sai/transfere o grupo com segurança e remove os objetos de avatar do usuário.

### Para publicar
1. Hospede o projeto em HTTPS.
2. Copie a URL publicada.
3. Em Supabase > Authentication > URL Configuration, use essa URL como `Site URL`.
4. Adicione também a URL em `Redirect URLs` para confirmação de email e recuperação de senha.
5. Se quiser fixar a URL no código, preencha `redirectUrl` em `js/config/supabase-config.js`. Se ficar vazio, o app usa a página atual.

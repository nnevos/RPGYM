# RPG GYM v0.6 — Auditoria de segurança Supabase

## Resultado

A publishable key (`sb_publishable_...`) e a Project URL podem existir no frontend/GitHub. Elas identificam o projeto, mas **não substituem autenticação nem ignoram RLS**.

Nunca publique: `service_role`, `sb_secret_...`, senha do banco, JWT secret ou credenciais administrativas.

## Problema encontrado e corrigido

A versão anterior permitia `INSERT` direto em `group_members`. Embora a UI enviasse `role: member`, um cliente modificado poderia tentar inserir a própria participação com `role: owner` ou `admin` em um grupo público.

A v0.6.1 corrige isso de duas formas:

1. `authenticated` agora tem apenas `SELECT` direto em `group_members`.
2. Entrar/sair de grupos usa RPCs server-side (`join_social_group` / `leave_social_group`), e `join_social_group` sempre força `role = 'member'`.

Também foram endurecidas todas as funções `SECURITY DEFINER` relevantes com `search_path` vazio e referências qualificadas.

## Dados privados

### `profiles`
Somente o próprio usuário autenticado pode ler/inserir/alterar sua linha. Email, telefone, nascimento, peso e altura não são compartilhados pelo Social.

### `game_saves`
Somente o próprio usuário pode ler/inserir/alterar seu save. Outro usuário autenticado não consegue consultar o JSON de treino, dieta, XP ou progresso.

### `social_profiles`
O próprio usuário pode atualizar seu snapshot social. Leitura é permitida para o próprio usuário e para usuários que compartilham o mesmo grupo.

### `groups`
Grupos públicos podem ser descobertos por usuários autenticados. Isso expõe nome/descrição/foco do grupo, o que é intencional para a pesquisa social.

### `group_members`
Um usuário só pode ler sua própria participação ou participantes de um grupo do qual faz parte. Escritas diretas foram removidas.

## Avatares

O bucket `avatars` continua **público para leitura por escolha de produto**, porque a foto é exibida como avatar social. Isso significa que uma pessoa que possua a URL exata da imagem consegue visualizá-la sem login.

Upload, substituição e exclusão continuam limitados à pasta cujo primeiro segmento é o UUID do usuário autenticado.

Se no futuro o avatar precisar ser privado, migre o bucket para privado e gere Signed URLs temporárias para integrantes autorizados.

## GitHub

É seguro versionar:

- Project URL do Supabase
- `sb_publishable_...`
- SQL de schema/RLS
- frontend HTML/CSS/JS

Não é seguro versionar:

- `service_role`
- `sb_secret_...`
- senha do Postgres
- tokens administrativos
- backups contendo dados reais de usuários

## Após atualizar

Execute `supabase/v0.6.1-security-hardening.sql` uma vez no SQL Editor.

Depois rode `supabase/security-check.sql` para conferir RLS, grants e policies principais.

# RPG GYM v0.6.0 — Beta para uso diário

## v0.6.0 — Estabilidade e sincronização
- Cache local continua sendo a primeira camada de resposta.
- Sincronização com Supabase ganhou estados: sincronizando, sincronizado, offline e pendente.
- Alterações realizadas offline entram em fila e são enviadas quando a conexão volta.
- Detecção de conflito entre save local e nuvem com escolha explícita do usuário.
- Exportação e importação de backup JSON.
- Histórico passou a aceitar correções de nome e, para cardio, duração/distância.
- Correções históricas recalculam estatísticas; XP já concedido é preservado para evitar manipulação retroativa.
- Validação adicional de campos numéricos e tratamento global de erros do cliente.

## v0.6.1 — Conta e segurança
- Troca de senha dentro de Perfil > Configurações.
- Exclusão permanente de conta por RPC autenticada `delete_my_account`.
- Exclusão limpa avatar, vínculo social, perfil e save antes de remover a conta.
- RLS/grants reafirmados no script de migração.
- Bucket de avatar limitado a 2 MB após otimização e apenas JPG/PNG/WebP.

## v0.6.2 — Produto finalizável
- PWA instalável com manifest e Service Worker.
- App shell, bases de exercícios/alimentos e Supabase JS ficam disponíveis em cache após a primeira carga.
- Navegação tem fallback offline.
- Botão de instalação aparece quando o navegador oferece o prompt.
- Exportação/importação de dados disponível nas configurações.
- Ajustes mobile para novos modais, áreas seguras e telas estreitas.

## Importante
Para ativar as funções de conta da v0.6, execute `supabase/v0.6.0-beta.sql` uma vez no SQL Editor.

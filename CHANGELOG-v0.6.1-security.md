# RPG GYM v0.6.1 — Security hardening

- Corrigido possível privilege escalation em `group_members`.
- Entrar em grupo agora usa RPC `join_social_group` e força role `member` no servidor.
- Removidos INSERT/DELETE diretos de `group_members` para o browser.
- SECURITY DEFINER functions endurecidas com `search_path` fixo/vazio.
- Grants públicos/anon reafirmados como mínimos.
- RLS reafirmado explicitamente nas tabelas do aplicativo.
- Policies do Storage reaplicadas para escrita apenas na própria pasta UUID.
- Adicionado `SECURITY-AUDIT.md`.
- Adicionado `supabase/security-check.sql` read-only.

# Checklist de beta — RPG GYM v0.6

Antes de convidar amigos:

1. Execute `supabase/v0.6.0-beta.sql` no projeto Supabase.
2. Hospede o projeto por HTTPS. PWA e recuperação de senha não devem ser testadas via `file://`.
3. Em Supabase > Authentication > URL Configuration, configure `Site URL` e `Redirect URLs` para o endereço publicado.
4. Teste duas contas diferentes e confirme que uma não acessa save/perfil privado da outra.
5. Teste cadastro, confirmação de email, login, logout, troca e recuperação de senha.
6. Teste treino, cardio, dieta, foto, grupos e sincronização em dois navegadores.
7. Faça uma atividade offline, volte online e confira se o status muda para sincronizado.
8. Exporte um backup JSON e importe em uma conta de teste.
9. Teste a instalação PWA no Android/Chrome e, no iPhone, Adicionar à Tela de Início.
10. Teste exclusão de uma conta descartável e confirme que ela deixa de aparecer no grupo.

## Limite conhecido do beta
A edição histórica preserva o XP original. Ela serve para corrigir métricas e nomes, não para recalcular retroativamente toda a economia de XP.

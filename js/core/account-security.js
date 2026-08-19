"use strict";

function openAccountAction() {
  const overlay = document.getElementById("accountActionOverlay");
  if (!overlay) return;
  overlay.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("accountNewPassword")?.focus(), 30);
}

function closeAccountAction() {
  const overlay = document.getElementById("accountActionOverlay");
  if (overlay) overlay.hidden = true;
  document.body.classList.remove("modal-open");
  document.getElementById("changePasswordForm")?.reset();
}

async function changeAccountPassword(event) {
  event.preventDefault();
  if (!supabaseClient || !authSession?.user) return;
  const password = document.getElementById("accountNewPassword")?.value || "";
  const confirm = document.getElementById("accountNewPasswordConfirm")?.value || "";
  if (password.length < 8) { showToast("Senha curta", "Use pelo menos 8 caracteres.", "⚠"); return; }
  if (password !== confirm) { showToast("Senhas diferentes", "Digite a mesma senha nos dois campos.", "⚠"); return; }
  try {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    closeAccountAction();
    showToast("Senha atualizada", "Sua nova senha já está ativa.", "✓");
  } catch (error) {
    console.warn(error);
    showToast("Não foi possível alterar", error?.message || "Tente novamente em instantes.", "⚠");
  }
}

async function deleteCurrentAccount() {
  if (!supabaseClient || !authSession?.user) return;
  requestConfirmation({
    title: "Excluir sua conta?",
    message: "Esta ação é permanente. Perfil, save na nuvem, participação em grupo e avatar serão removidos.",
    confirmLabel: "Excluir minha conta",
    cancelLabel: "Cancelar",
    danger: true,
    icon: "!",
    details: [
      { label: "Conta", value: authSession.user.email || "RPG GYM" },
      { label: "Backup", value: "Exporte antes se quiser guardar seus dados" }
    ]
  }, async () => {
    try {
      await flushCloudSync?.();
      const { error } = await supabaseClient.rpc("delete_my_account");
      if (error) throw error;
      try {
        localStorage.removeItem(getGameStorageKey());
        localStorage.removeItem(getScopedStorageKey(DIET_STORAGE_KEY));
        localStorage.removeItem(`rpgym:cloud-meta:${authSession.user.id}`);
      } catch (_error) {}
      await supabaseClient.auth.signOut().catch(() => {});
      authSession = null;
      window.RPG_GYM_AUTH_USER_ID = null;
      showToast("Conta excluída", "Seus dados pessoais foram removidos.", "✓");
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.warn("Falha ao excluir conta", error);
      const msg = /delete_my_account/i.test(String(error?.message || ""))
        ? "Execute o SQL supabase/v0.6.0-beta.sql antes de usar esta função."
        : (error?.message || "Não foi possível excluir sua conta.");
      showToast("Exclusão não concluída", msg, "⚠", 7000);
    }
  });
}

function bindAccountSecurity() {
  document.getElementById("changePasswordButton")?.addEventListener("click", openAccountAction);
  document.getElementById("closeAccountAction")?.addEventListener("click", closeAccountAction);
  document.getElementById("changePasswordForm")?.addEventListener("submit", changeAccountPassword);
  document.getElementById("accountActionOverlay")?.addEventListener("click", (event) => { if (event.target.id === "accountActionOverlay") closeAccountAction(); });
  document.getElementById("deleteAccountButton")?.addEventListener("click", deleteCurrentAccount);
}

document.addEventListener("DOMContentLoaded", bindAccountSecurity, { once: true });
Object.assign(window, { openAccountAction, closeAccountAction, deleteCurrentAccount });

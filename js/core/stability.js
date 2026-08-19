"use strict";

let syncConflictResolver = null;
let historyEditingEntry = null;

function formatSyncDate(timestamp) {
  if (!timestamp) return "Sem data";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function openSyncConflict(context = {}) {
  const overlay = document.getElementById("syncConflictOverlay");
  if (!overlay) return Promise.resolve("local");
  document.getElementById("localConflictTime").textContent = `Alterado em ${formatSyncDate(context.localTs)}`;
  document.getElementById("cloudConflictTime").textContent = `Alterado em ${formatSyncDate(context.cloudTs)}`;
  overlay.hidden = false;
  document.body.classList.add("modal-open");
  return new Promise((resolve) => { syncConflictResolver = resolve; });
}

function resolveSyncConflict(choice) {
  const overlay = document.getElementById("syncConflictOverlay");
  if (overlay) overlay.hidden = true;
  document.body.classList.remove("modal-open");
  const resolver = syncConflictResolver;
  syncConflictResolver = null;
  resolver?.(choice);
}

function buildBackupPayload() {
  return {
    product: "RPG GYM",
    formatVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    userId: authSession?.user?.id || null,
    game: structuredCloneSafe(state),
    diet: structuredCloneSafe(loadDietState())
  };
}

function exportUserData() {
  try {
    flushScheduledSave?.();
    const payload = buildBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `RPG-GYM-backup-${localDateKey()}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
    showToast("Backup exportado", "Guarde o arquivo em um local seguro.", "↓");
  } catch (error) {
    console.error(error);
    showToast("Falha ao exportar", "Não foi possível gerar o backup.", "⚠");
  }
}

async function importUserDataFile(file) {
  if (!file) return;
  try {
    if (file.size > 12 * 1024 * 1024) throw new Error("Arquivo muito grande");
    const payload = JSON.parse(await file.text());
    if (!payload || payload.product !== "RPG GYM" || !payload.game) throw new Error("Backup inválido");
    requestConfirmation({
      title: "Importar backup?",
      message: "O progresso atual deste dispositivo será substituído pelo conteúdo do backup.",
      confirmLabel: "Importar",
      cancelLabel: "Cancelar",
      danger: true,
      icon: "↺",
      details: [
        { label: "Versão do backup", value: payload.appVersion || "desconhecida" },
        { label: "Exportado", value: formatSyncDate(payload.exportedAt) }
      ]
    }, async () => {
      const fallback = createDefaultState();
      state = migrateState(payload.game, fallback);
      const diet = payload.diet && typeof payload.diet === "object" ? payload.diet : { days: {}, targets: {} };
      try { localStorage.setItem(getScopedStorageKey(DIET_STORAGE_KEY), JSON.stringify(diet)); } catch (_error) {}
      profileHydrated = false;
      rebuildStatsFromSources();
      syncDerivedState();
      saveGame();
      updateUI();
      await flushCloudSync?.();
      showToast("Backup importado", "Seu progresso foi restaurado e será sincronizado.", "✓");
    });
  } catch (error) {
    console.warn(error);
    showToast("Backup inválido", "Escolha um arquivo exportado pelo RPG GYM.", "⚠");
  }
}

function openHistoryEditor(entryId) {
  const entry = (state.history || []).find((item) => item.id === entryId);
  if (!entry) return;
  historyEditingEntry = entry;
  const overlay = document.getElementById("historyEditOverlay");
  if (!overlay) return;
  document.getElementById("historyEditId").value = entry.id;
  document.getElementById("historyEditName").value = entry.activityName || "Atividade";
  const isCardio = entry.activityId === "cardio" || entry.cardioData;
  const minutesInput = document.getElementById("historyEditMinutes");
  const distanceInput = document.getElementById("historyEditDistance");
  if (minutesInput) { minutesInput.disabled = !isCardio; minutesInput.value = isCardio ? Number(entry.cardioData?.minutes || 0).toFixed(2).replace(/\.00$/, "") : ""; }
  if (distanceInput) {
    distanceInput.disabled = !isCardio;
    const data = entry.cardioData || {};
    const km = Number(data.distance || data.distanceKm || 0) + (Number(data.distanceMeters || 0) / 1000);
    distanceInput.value = isCardio && km ? String(Math.round(km * 100) / 100) : "";
  }
  overlay.hidden = false;
  document.body.classList.add("modal-open");
}

function closeHistoryEditor() {
  const overlay = document.getElementById("historyEditOverlay");
  if (overlay) overlay.hidden = true;
  historyEditingEntry = null;
  document.body.classList.remove("modal-open");
}

function saveHistoryCorrection(event) {
  event.preventDefault();
  const entry = historyEditingEntry;
  if (!entry) return;
  const name = String(document.getElementById("historyEditName")?.value || "").trim();
  if (!name) { showToast("Nome obrigatório", "Informe um nome para o registro.", "⚠"); return; }
  entry.activityName = name.slice(0, 80);

  if (entry.activityId === "cardio" || entry.cardioData) {
    const minutes = Number(document.getElementById("historyEditMinutes")?.value || 0);
    const distanceKm = Number(document.getElementById("historyEditDistance")?.value || 0);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) { showToast("Duração inválida", "Use uma duração entre 1 minuto e 24 horas.", "⚠"); return; }
    if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > 500) { showToast("Distância inválida", "Confira a distância registrada.", "⚠"); return; }
    entry.cardioData ||= {};
    entry.cardioData.minutes = minutes;
    const type = entry.cardioData.type;
    if (["rowing", "swimming"].includes(type)) {
      entry.cardioData.distanceMeters = Math.round(distanceKm * 1000);
      delete entry.cardioData.distance;
      delete entry.cardioData.distanceKm;
    } else {
      entry.cardioData.distance = distanceKm;
      entry.cardioData.distanceKm = distanceKm;
    }
    if (distanceKm > 0) entry.cardioData.speedKmh = distanceKm / (minutes / 60);
    entry.details = `${Math.round(minutes)} min${distanceKm ? ` • ${distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km` : ""} • corrigido`;
  } else if (entry.activityId === "strengthWorkout") {
    const session = (state.workouts?.sessions || []).find((item) => item.finishedAt === entry.timestamp || item.id === entry.workoutId);
    if (session) session.name = entry.activityName;
  }

  entry.editedAt = new Date().toISOString();
  rebuildStatsFromSources();
  saveGame(); updateUI(); closeHistoryEditor();
  showToast("Registro corrigido", "Estatísticas foram atualizadas. O XP original foi preservado.", "✓");
}

function deleteHistoryCorrection() {
  const entry = historyEditingEntry;
  if (!entry) return;
  requestConfirmation({
    title: "Excluir registro do histórico?",
    message: "O registro e suas estatísticas serão removidos. Para proteger a progressão contra manipulação, o XP que já foi recebido não é retirado.",
    confirmLabel: "Excluir registro", cancelLabel: "Cancelar", danger: true, icon: "×"
  }, () => {
    state.history = (state.history || []).filter((item) => item.id !== entry.id);
    if (entry.activityId === "strengthWorkout") {
      state.workouts.sessions = (state.workouts?.sessions || []).filter((session) => session.finishedAt !== entry.timestamp && session.id !== entry.workoutId);
    }
    rebuildStatsFromSources(); saveGame(); updateUI(); closeHistoryEditor();
    showToast("Registro excluído", "O histórico e as estatísticas foram atualizados.", "×");
  });
}

function clampInputToBounds(input) {
  if (!(input instanceof HTMLInputElement) || input.type !== "number" || !input.value) return;
  const value = Number(input.value); if (!Number.isFinite(value)) return;
  const min = input.min !== "" ? Number(input.min) : null;
  const max = input.max !== "" ? Number(input.max) : null;
  let next = value;
  if (Number.isFinite(min)) next = Math.max(min, next);
  if (Number.isFinite(max)) next = Math.min(max, next);
  if (next !== value) { input.value = String(next); showToast("Valor ajustado", "O valor foi limitado a uma faixa válida.", "↕"); }
}

function bindStabilityFeatures() {
  document.getElementById("useLocalConflictButton")?.addEventListener("click", () => resolveSyncConflict("local"));
  document.getElementById("useCloudConflictButton")?.addEventListener("click", () => resolveSyncConflict("cloud"));
  document.getElementById("cancelConflictButton")?.addEventListener("click", () => resolveSyncConflict(null));
  document.getElementById("exportUserDataButton")?.addEventListener("click", exportUserData);
  document.getElementById("importUserDataButton")?.addEventListener("click", () => document.getElementById("importUserDataInput")?.click());
  document.getElementById("importUserDataInput")?.addEventListener("change", (event) => { importUserDataFile(event.target.files?.[0]); event.target.value = ""; });
  document.getElementById("closeHistoryEdit")?.addEventListener("click", closeHistoryEditor);
  document.getElementById("historyEditForm")?.addEventListener("submit", saveHistoryCorrection);
  document.getElementById("deleteHistoryEntryButton")?.addEventListener("click", deleteHistoryCorrection);
  document.getElementById("historyEditOverlay")?.addEventListener("click", (event) => { if (event.target.id === "historyEditOverlay") closeHistoryEditor(); });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-history]");
    if (button) openHistoryEditor(button.dataset.editHistory);
  });
  document.addEventListener("blur", (event) => clampInputToBounds(event.target), true);
  window.addEventListener("error", (event) => {
    console.error("RPG GYM runtime error", event.error || event.message);
    if (document.body.dataset.lastFatalToast !== String(event.message)) {
      document.body.dataset.lastFatalToast = String(event.message);
      showToast("Algo deu errado", "Se a tela não responder, recarregue. Seu progresso local foi preservado.", "⚠", 7000);
    }
  });
  window.addEventListener("unhandledrejection", (event) => console.error("RPG GYM promise rejection", event.reason));
}

document.addEventListener("DOMContentLoaded", bindStabilityFeatures, { once: true });
Object.assign(window, { openSyncConflict, exportUserData, importUserDataFile, openHistoryEditor });

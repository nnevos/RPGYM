"use strict";

const CLOUD_SYNC_TABLE = "game_saves";
const CLOUD_SYNC_DEBOUNCE_MS = 1000;
const CLOUD_TIME_TOLERANCE_MS = 1500;
let cloudSyncTimer = null;
let cloudSyncInFlight = null;
let cloudSyncQueued = false;
let cloudHydratedForUser = null;
let cloudLastServerUpdatedAt = null;
let cloudSyncDisabled = false;
let cloudDirtyWhileOffline = false;
let cloudReconnectInFlight = null;
let cloudInitialReconcileComplete = false;
let cloudBootLocalSnapshot = null;

function withCloudTimeout(promise, timeoutMs = 8000) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error("Tempo limite ao carregar o save da nuvem.")), timeoutMs);
    })
  ]).finally(() => window.clearTimeout(timer));
}

function cloudSyncAvailable() {
  return !cloudSyncDisabled && Boolean(supabaseClient && authSession?.user?.id);
}

function cloudMetaKey(userId = authSession?.user?.id) {
  return userId ? `rpgym:cloud-meta:${userId}` : "rpgym:cloud-meta";
}

function readCloudMeta(userId = authSession?.user?.id) {
  try { return JSON.parse(localStorage.getItem(cloudMetaKey(userId)) || "{}"); } catch (_error) { return {}; }
}

function writeCloudMeta(values = {}, userId = authSession?.user?.id) {
  if (!userId) return;
  const current = readCloudMeta(userId);
  try { localStorage.setItem(cloudMetaKey(userId), JSON.stringify({ ...current, ...values })); } catch (_error) {}
}

function getLocalSaveSnapshot() {
  let game = null, diet = null;
  try { const raw = localStorage.getItem(getGameStorageKey()); if (raw) game = JSON.parse(raw); } catch (_error) {}
  try { const raw = localStorage.getItem(getScopedStorageKey(DIET_STORAGE_KEY)); if (raw) diet = JSON.parse(raw); } catch (_error) {}
  return { game, diet };
}


function prepareCloudBootstrapSnapshot() {
  cloudBootLocalSnapshot = getLocalSaveSnapshot();
  cloudInitialReconcileComplete = false;
}

function localSnapshotTimestamp(snapshot) {
  const values = [snapshot?.game?.lastSavedAt, snapshot?.diet?.updatedAt]
    .map((value) => value ? new Date(value).getTime() : 0).filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}

function cloudTimestamp(data) {
  const value = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

function setCloudPendingSnapshot(gameState, dietData, serverUpdatedAt = null) {
  window.RPG_GYM_PENDING_CLOUD_GAME = gameState && typeof gameState === "object" ? gameState : null;
  window.RPG_GYM_PENDING_CLOUD_DIET = dietData && typeof dietData === "object" ? dietData : null;
  cloudLastServerUpdatedAt = serverUpdatedAt || null;
}

function persistCloudSnapshotLocally(data) {
  try {
    if (data?.game_state && typeof data.game_state === "object") {
      localStorage.setItem(getGameStorageKey(), JSON.stringify(data.game_state));
    }
    if (data?.diet_state && typeof data.diet_state === "object") {
      localStorage.setItem(getScopedStorageKey(DIET_STORAGE_KEY), JSON.stringify(data.diet_state));
    }
    return true;
  } catch (error) {
    console.warn("Não foi possível atualizar o cache local com o save da nuvem.", error);
    return false;
  }
}

async function fetchCloudSave(userId = authSession?.user?.id) {
  if (!userId) return null;
  const result = await withCloudTimeout(
    supabaseClient.from(CLOUD_SYNC_TABLE)
      .select("game_state,diet_state,updated_at").eq("user_id", userId).maybeSingle(),
    8000
  );
  if (result.error) throw result.error;
  return result.data || null;
}

async function preloadCloudSaveForUser() {
  if (!supabaseClient || !authSession?.user?.id || !navigator.onLine) {
    updateCloudStatusLabel("offline");
    return { source: "local", reason: "offline" };
  }
  const userId = authSession.user.id;
  if (cloudHydratedForUser === userId) return { source: "cached" };

  updateCloudStatusLabel("syncing");
  let data = null;
  try {
    data = await fetchCloudSave(userId);
  } catch (error) {
    console.warn("Cloud save indisponível; mantendo dados locais.", error);
    updateCloudStatusLabel("error");
    return { source: "local", reason: "cloud_error", error };
  }

  const local = getLocalSaveSnapshot();
  const localTs = localSnapshotTimestamp(local);
  const cloudTs = cloudTimestamp(data);

  // Regra de resolução automática:
  // 1) nuvem é a fonte preferida;
  // 2) se o cache local for comprovadamente mais novo, ele sobe para a nuvem após o boot;
  // 3) em empate ou nuvem mais nova, a nuvem vence;
  // 4) nunca bloquear a entrada esperando decisão manual.
  if (data && cloudTs + CLOUD_TIME_TOLERANCE_MS >= localTs) {
    setCloudPendingSnapshot(data.game_state, data.diet_state, data.updated_at);
    cloudHydratedForUser = userId;
    writeCloudMeta({ lastSyncedAt: data.updated_at, lastServerUpdatedAt: data.updated_at, resolution: "cloud-auto" }, userId);
    updateCloudStatusLabel("synced");
    return { source: "cloud", updatedAt: data.updated_at };
  }

  setCloudPendingSnapshot(null, null, data?.updated_at || null);
  cloudHydratedForUser = userId;
  if (local.game || local.diet) window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT = true;
  writeCloudMeta({ resolution: data ? "local-newer-auto" : "local-first-auto" }, userId);
  updateCloudStatusLabel("local");
  return { source: data ? "local-newer" : "local-first" };
}

function consumePendingCloudGame() {
  const pending = window.RPG_GYM_PENDING_CLOUD_GAME;
  window.RPG_GYM_PENDING_CLOUD_GAME = null;
  return pending && typeof pending === "object" ? pending : null;
}
function consumePendingCloudDiet() {
  const pending = window.RPG_GYM_PENDING_CLOUD_DIET;
  window.RPG_GYM_PENDING_CLOUD_DIET = null;
  return pending && typeof pending === "object" ? pending : null;
}

function currentCloudPayload() {
  if (!state || !authSession?.user?.id) return null;
  const now = new Date().toISOString();
  state.lastSavedAt ||= now;
  const diet = loadDietState();
  diet.updatedAt ||= now;
  return { user_id: authSession.user.id, game_state: state, diet_state: diet, client_version: APP_VERSION };
}

async function pushCloudSaveNow() {
  if (!cloudSyncAvailable() || !state) return false;
  if (!cloudInitialReconcileComplete) { cloudDirtyWhileOffline = true; return false; }
  if (!navigator.onLine) {
    cloudDirtyWhileOffline = true;
    updateCloudStatusLabel("offline");
    return false;
  }
  if (cloudSyncInFlight) { cloudSyncQueued = true; return cloudSyncInFlight; }
  const payload = currentCloudPayload();
  if (!payload) return false;
  updateCloudStatusLabel("syncing");

  cloudSyncInFlight = (async () => {
    try {
      const { data, error } = await supabaseClient.from(CLOUD_SYNC_TABLE)
        .upsert(payload, { onConflict: "user_id" }).select("updated_at").single();
      if (error) throw error;
      cloudLastServerUpdatedAt = data?.updated_at || new Date().toISOString();
      window.RPG_GYM_CLOUD_LAST_SYNC_AT = cloudLastServerUpdatedAt;
      writeCloudMeta({ lastSyncedAt: cloudLastServerUpdatedAt, lastServerUpdatedAt: cloudLastServerUpdatedAt, resolution: "uploaded" });
      cloudDirtyWhileOffline = false;
      updateCloudStatusLabel("synced");
      return true;
    } catch (error) {
      console.warn("Não foi possível sincronizar o progresso com Supabase.", error);
      cloudDirtyWhileOffline = true;
      updateCloudStatusLabel("error");
      return false;
    } finally {
      cloudSyncInFlight = null;
      if (cloudSyncQueued) { cloudSyncQueued = false; scheduleCloudSync(450); }
    }
  })();
  return cloudSyncInFlight;
}

function scheduleCloudSync(delay = CLOUD_SYNC_DEBOUNCE_MS) {
  if (!cloudSyncAvailable() || !state) return;
  if (!cloudInitialReconcileComplete) { cloudDirtyWhileOffline = true; return; }
  if (!navigator.onLine) { cloudDirtyWhileOffline = true; updateCloudStatusLabel("offline"); return; }
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(() => { cloudSyncTimer = null; pushCloudSaveNow(); }, delay);
}

async function flushCloudSync() {
  if (cloudSyncTimer) { window.clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
  return pushCloudSaveNow();
}

async function bootstrapCloudSyncAfterGameInit() {
  if (!cloudSyncAvailable()) return;
  if (!navigator.onLine) {
    cloudDirtyWhileOffline = true;
    updateCloudStatusLabel("offline");
    return;
  }

  updateCloudStatusLabel("syncing");
  try {
    const userId = authSession.user.id;
    const data = await fetchCloudSave(userId);
    const local = cloudBootLocalSnapshot || getLocalSaveSnapshot();
    const localTs = localSnapshotTimestamp(local);
    const cloudTs = cloudTimestamp(data);
    const meta = readCloudMeta(userId);

    if (!data) {
      cloudInitialReconcileComplete = true;
      cloudBootLocalSnapshot = null;
      if (local.game || local.diet) await pushCloudSaveNow();
      else updateCloudStatusLabel("synced");
      return;
    }

    cloudLastServerUpdatedAt = data.updated_at || null;

    // Nuvem vence em empate ou quando é mais recente. O reload só ocorre uma vez
    // para a mesma versão de nuvem, evitando ciclos de inicialização.
    if (cloudTs + CLOUD_TIME_TOLERANCE_MS >= localTs) {
      const alreadyApplied = meta.lastAppliedCloudAt === data.updated_at;
      writeCloudMeta({
        lastSyncedAt: data.updated_at,
        lastServerUpdatedAt: data.updated_at,
        resolution: "cloud-auto",
        lastAppliedCloudAt: data.updated_at
      }, userId);

      if (!alreadyApplied && persistCloudSnapshotLocally(data)) {
        cloudInitialReconcileComplete = true;
        cloudBootLocalSnapshot = null;
        updateCloudStatusLabel("synced");
        window.location.reload();
        return;
      }

      cloudInitialReconcileComplete = true;
      cloudBootLocalSnapshot = null;
      cloudDirtyWhileOffline = false;
      updateCloudStatusLabel("synced");
      return;
    }

    // O estado local já era mais novo antes do boot. Só agora liberamos upload.
    cloudInitialReconcileComplete = true;
    cloudBootLocalSnapshot = null;
    writeCloudMeta({ resolution: "local-newer-auto" }, userId);
    await pushCloudSaveNow();
  } catch (error) {
    console.warn("Não foi possível concluir a reconciliação inicial com a nuvem.", error);
    cloudInitialReconcileComplete = true;
    cloudBootLocalSnapshot = null;
    cloudDirtyWhileOffline = true;
    updateCloudStatusLabel("error");
  }
}

async function reconcileCloudAfterReconnect() {
  if (!cloudInitialReconcileComplete) return bootstrapCloudSyncAfterGameInit();
  if (cloudReconnectInFlight) return cloudReconnectInFlight;
  if (!cloudSyncAvailable() || !navigator.onLine) return false;

  cloudReconnectInFlight = (async () => {
    updateCloudStatusLabel("syncing");
    try {
      const userId = authSession.user.id;
      const data = await fetchCloudSave(userId);
      const local = getLocalSaveSnapshot();
      const localTs = localSnapshotTimestamp(local);
      const cloudTs = cloudTimestamp(data);

      if (!data) {
        if (local.game || local.diet) return await pushCloudSaveNow();
        updateCloudStatusLabel("synced");
        return true;
      }

      if (localTs > cloudTs + CLOUD_TIME_TOLERANCE_MS) {
        // Este dispositivo tem a alteração mais recente: publica assim que possível.
        return await pushCloudSaveNow();
      }

      // A nuvem é mais nova ou equivalente. Atualiza o cache local automaticamente.
      cloudLastServerUpdatedAt = data.updated_at || null;
      writeCloudMeta({ lastSyncedAt: data.updated_at, lastServerUpdatedAt: data.updated_at, resolution: "cloud-reconnect-auto" }, userId);
      cloudDirtyWhileOffline = false;

      if (cloudTs > localTs + CLOUD_TIME_TOLERANCE_MS && persistCloudSnapshotLocally(data)) {
        updateCloudStatusLabel("synced");
        // Recarrega uma vez para reconstruir todos os sistemas a partir do estado vencedor.
        window.location.reload();
        return true;
      }

      updateCloudStatusLabel("synced");
      return true;
    } catch (error) {
      console.warn("Não foi possível reconciliar o save após reconectar.", error);
      cloudDirtyWhileOffline = true;
      updateCloudStatusLabel("error");
      return false;
    } finally {
      cloudReconnectInFlight = null;
    }
  })();

  return cloudReconnectInFlight;
}

function updateCloudStatusLabel(mode = null) {
  const status = document.querySelector(".sidebar-status");
  const profile = document.getElementById("profileSyncState");
  const effective = mode || (!navigator.onLine ? "offline" : cloudLastServerUpdatedAt ? "synced" : "local");
  const copy = {
    synced: ["Sincronizado", "Progresso salvo na nuvem"],
    syncing: ["Sincronizando", "Comparando e salvando alterações…"],
    offline: ["Modo offline", "Alterações ficam neste dispositivo"],
    error: ["Sincronização pendente", "Tentaremos novamente quando possível"],
    local: ["Cache local ativo", "Será enviado para a nuvem automaticamente"]
  }[effective] || ["Conta conectada", "Cache local ativo"];
  if (status) {
    status.classList.toggle("is-offline", effective === "offline" || effective === "error");
    const strong = status.querySelector("strong"), small = status.querySelector("small");
    if (strong) strong.textContent = copy[0];
    if (small) small.textContent = copy[1];
  }
  if (profile) profile.textContent = `${copy[0]} • ${copy[1]}`;
}

window.addEventListener("online", () => {
  cloudSyncDisabled = false;
  reconcileCloudAfterReconnect();
});
window.addEventListener("offline", () => {
  cloudDirtyWhileOffline = true;
  updateCloudStatusLabel("offline");
});

Object.assign(window, {
  preloadCloudSaveForUser, consumePendingCloudGame, consumePendingCloudDiet, prepareCloudBootstrapSnapshot,
  scheduleCloudSync, flushCloudSync, bootstrapCloudSyncAfterGameInit,
  reconcileCloudAfterReconnect, updateCloudStatusLabel
});

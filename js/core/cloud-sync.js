"use strict";

const CLOUD_SYNC_TABLE = "game_saves";
const CLOUD_SYNC_DEBOUNCE_MS = 1000;
let cloudSyncTimer = null;
let cloudSyncInFlight = null;
let cloudSyncQueued = false;
let cloudHydratedForUser = null;
let cloudLastServerUpdatedAt = null;
let cloudSyncDisabled = false;
let cloudDirtyWhileOffline = false;

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

function localSnapshotTimestamp(snapshot) {
  const values = [snapshot?.game?.lastSavedAt, snapshot?.diet?.updatedAt]
    .map((value) => value ? new Date(value).getTime() : 0).filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}

function setCloudPendingSnapshot(gameState, dietData, serverUpdatedAt = null) {
  window.RPG_GYM_PENDING_CLOUD_GAME = gameState && typeof gameState === "object" ? gameState : null;
  window.RPG_GYM_PENDING_CLOUD_DIET = dietData && typeof dietData === "object" ? dietData : null;
  cloudLastServerUpdatedAt = serverUpdatedAt || null;
}

function applyCloudConflictChoice(choice, context) {
  const { data, userId } = context;
  if (choice === "cloud") {
    setCloudPendingSnapshot(data?.game_state, data?.diet_state, data?.updated_at);
    writeCloudMeta({ lastSyncedAt: data?.updated_at || new Date().toISOString(), resolution: "cloud" }, userId);
    window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT = false;
  } else if (choice === "local") {
    setCloudPendingSnapshot(null, null, data?.updated_at || null);
    window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT = true;
    writeCloudMeta({ resolution: "local" }, userId);
  }
  cloudHydratedForUser = userId;
}

async function preloadCloudSaveForUser() {
  if (!supabaseClient || !authSession?.user?.id || !navigator.onLine) {
    updateCloudStatusLabel("offline");
    return { source: "local", reason: "offline" };
  }
  const userId = authSession.user.id;
  if (cloudHydratedForUser === userId) return { source: "cached" };

  updateCloudStatusLabel("syncing");
  const { data, error } = await supabaseClient.from(CLOUD_SYNC_TABLE)
    .select("game_state,diet_state,updated_at").eq("user_id", userId).maybeSingle();

  if (error) {
    console.warn("Cloud save indisponível; mantendo dados locais.", error);
    updateCloudStatusLabel("error");
    return { source: "local", reason: "cloud_error", error };
  }

  const local = getLocalSaveSnapshot();
  const localTs = localSnapshotTimestamp(local);
  const cloudTs = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
  const meta = readCloudMeta(userId);
  const lastSyncTs = meta.lastSyncedAt ? new Date(meta.lastSyncedAt).getTime() : 0;
  const localChanged = Boolean(lastSyncTs && localTs > lastSyncTs + 1500);
  const cloudChanged = Boolean(lastSyncTs && cloudTs > lastSyncTs + 1500);

  if (data && local.game && localChanged && cloudChanged && Math.abs(localTs - cloudTs) > 1500) {
    const conflictContext = { data, local, localTs, cloudTs, userId };
    window.RPG_GYM_PENDING_SYNC_CONFLICT = conflictContext;
    if (typeof openSyncConflict === "function") {
      const choice = await openSyncConflict(conflictContext);
      if (choice === "local" || choice === "cloud") applyCloudConflictChoice(choice, conflictContext);
      else {
        // A decisão pode ser adiada; preservamos o dispositivo atual e não sobrescrevemos a nuvem.
        setCloudPendingSnapshot(null, null, data.updated_at);
        cloudHydratedForUser = userId;
        cloudSyncDisabled = true;
      }
      updateCloudStatusLabel(choice === "cloud" ? "synced" : "local");
      return { source: `conflict-${choice || "deferred"}` };
    }
  }

  if (data && cloudTs >= localTs) {
    setCloudPendingSnapshot(data.game_state, data.diet_state, data.updated_at);
    cloudHydratedForUser = userId;
    writeCloudMeta({ lastSyncedAt: data.updated_at, lastServerUpdatedAt: data.updated_at }, userId);
    updateCloudStatusLabel("synced");
    return { source: "cloud", updatedAt: data.updated_at };
  }

  setCloudPendingSnapshot(null, null, data?.updated_at || null);
  cloudHydratedForUser = userId;
  if (local.game || local.diet) window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT = true;
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
      writeCloudMeta({ lastSyncedAt: cloudLastServerUpdatedAt, lastServerUpdatedAt: cloudLastServerUpdatedAt });
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
  if (window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT) {
    window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT = false;
    await pushCloudSaveNow();
  }
  updateCloudStatusLabel(navigator.onLine ? "synced" : "offline");
}

function updateCloudStatusLabel(mode = null) {
  const status = document.querySelector(".sidebar-status");
  const profile = document.getElementById("profileSyncState");
  const effective = mode || (!navigator.onLine ? "offline" : cloudLastServerUpdatedAt ? "synced" : "local");
  const copy = {
    synced: ["Sincronizado", "Progresso salvo na nuvem"],
    syncing: ["Sincronizando", "Enviando alterações…"],
    offline: ["Modo offline", "Alterações ficam neste dispositivo"],
    error: ["Sincronização pendente", "Tentaremos novamente quando possível"],
    local: ["Cache local ativo", "Aguardando sincronização"]
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
  updateCloudStatusLabel("syncing");
  if (cloudDirtyWhileOffline) scheduleCloudSync(250); else updateCloudStatusLabel("synced");
});
window.addEventListener("offline", () => updateCloudStatusLabel("offline"));

Object.assign(window, {
  preloadCloudSaveForUser, consumePendingCloudGame, consumePendingCloudDiet,
  scheduleCloudSync, flushCloudSync, bootstrapCloudSyncAfterGameInit, updateCloudStatusLabel
});

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

function localDirtyKey(userId = authSession?.user?.id || window.RPG_GYM_AUTH_USER_ID) {
  return userId ? `rpgym:pending-local-save:${userId}` : "rpgym:pending-local-save:local";
}

function readLocalSaveDirty(userId = authSession?.user?.id || window.RPG_GYM_AUTH_USER_ID) {
  try { return JSON.parse(localStorage.getItem(localDirtyKey(userId)) || "{}"); }
  catch (_error) { return {}; }
}

function markLocalSaveDirty(domain, updatedAt = new Date().toISOString(), userId = authSession?.user?.id || window.RPG_GYM_AUTH_USER_ID) {
  if (!domain) return;
  const current = readLocalSaveDirty(userId);
  current[domain] = updatedAt || new Date().toISOString();
  try { localStorage.setItem(localDirtyKey(userId), JSON.stringify(current)); } catch (_error) {}
}

function isLocalSaveDirty(domain, userId = authSession?.user?.id || window.RPG_GYM_AUTH_USER_ID) {
  return Boolean(readLocalSaveDirty(userId)?.[domain]);
}

function clearLocalSaveDirtyIfSynced(domain, syncedThrough, userId = authSession?.user?.id || window.RPG_GYM_AUTH_USER_ID) {
  const current = readLocalSaveDirty(userId);
  const dirtyAt = stateTimestamp(current?.[domain], 0);
  const syncedAt = stateTimestamp(syncedThrough, 0);
  if (!dirtyAt || !syncedAt || dirtyAt > syncedAt) return false;
  delete current[domain];
  try {
    if (Object.keys(current).length) localStorage.setItem(localDirtyKey(userId), JSON.stringify(current));
    else localStorage.removeItem(localDirtyKey(userId));
  } catch (_error) {}
  return true;
}

function getLocalSaveSnapshot() {
  let game = null, diet = null;
  try { const raw = localStorage.getItem(getGameStorageKey()); if (raw) game = JSON.parse(raw); } catch (_error) {}
  try { const raw = localStorage.getItem(getScopedStorageKey(DIET_STORAGE_KEY)); if (raw) diet = JSON.parse(raw); } catch (_error) {}
  return { game, diet };
}


function prepareCloudBootstrapSnapshot() {
  cloudBootLocalSnapshot = getLocalSaveSnapshot();
  createVersionUpgradeBackup(cloudBootLocalSnapshot);
  cloudInitialReconcileComplete = false;
}

function localSnapshotTimestamp(snapshot) {
  const values = [snapshot?.game?.lastSavedAt, snapshot?.diet?.updatedAt]
    .map((value) => value ? new Date(value).getTime() : 0).filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}

function stateTimestamp(value, fallback = 0) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function gameSnapshotTimestamp(game, fallback = 0) {
  return stateTimestamp(game?.lastSavedAt, fallback);
}

function dietSnapshotTimestamp(diet, fallback = 0) {
  return stateTimestamp(diet?.updatedAt, fallback);
}

function preservationKey(item) {
  if (!item || typeof item !== "object") return JSON.stringify(item);
  return String(
    item.id ||
    item.sessionId ||
    item.activityId && item.timestamp ? `${item.activityId}:${item.timestamp}` :
    item.timestamp ||
    item.createdAt ||
    JSON.stringify(item)
  );
}

function mergeUniqueRecords(preferred = [], fallback = []) {
  const result = [];
  const seen = new Set();
  [...(Array.isArray(preferred) ? preferred : []), ...(Array.isArray(fallback) ? fallback : [])].forEach((item) => {
    const key = preservationKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

function mergeWorkoutState(preferred = {}, fallback = {}) {
  return {
    ...(fallback && typeof fallback === "object" ? fallback : {}),
    ...(preferred && typeof preferred === "object" ? preferred : {}),
    active: preferred?.active || fallback?.active || null,
    routines: mergeUniqueRecords(preferred?.routines, fallback?.routines),
    sessions: mergeUniqueRecords(preferred?.sessions, fallback?.sessions)
  };
}

function mergeGameForUpgrade(preferred, fallback) {
  if (!preferred || typeof preferred !== "object") return fallback || null;
  if (!fallback || typeof fallback !== "object") return preferred;
  const merged = {
    ...fallback,
    ...preferred,
    history: mergeUniqueRecords(preferred.history, fallback.history),
    workouts: mergeWorkoutState(preferred.workouts, fallback.workouts),
    buffs: mergeUniqueRecords(preferred.buffs, fallback.buffs),
    achievements: {
      ...(fallback.achievements || {}),
      ...(preferred.achievements || {}),
      unlocked: Array.from(new Set([
        ...(Array.isArray(preferred.achievements?.unlocked) ? preferred.achievements.unlocked : []),
        ...(Array.isArray(fallback.achievements?.unlocked) ? fallback.achievements.unlocked : [])
      ]))
    }
  };

  const roadmapKeys = new Set([
    ...Object.keys(fallback.roadmaps || {}),
    ...Object.keys(preferred.roadmaps || {})
  ]);
  merged.roadmaps = { ...(fallback.roadmaps || {}), ...(preferred.roadmaps || {}) };
  roadmapKeys.forEach((key) => {
    merged.roadmaps[key] = {
      ...(fallback.roadmaps?.[key] || {}),
      ...(preferred.roadmaps?.[key] || {}),
      claimedChapters: Array.from(new Set([
        ...(Array.isArray(preferred.roadmaps?.[key]?.claimedChapters) ? preferred.roadmaps[key].claimedChapters : []),
        ...(Array.isArray(fallback.roadmaps?.[key]?.claimedChapters) ? fallback.roadmaps[key].claimedChapters : [])
      ]))
    };
  });

  if (preferred.stats || fallback.stats) {
    merged.stats = {
      ...(fallback.stats || {}),
      ...(preferred.stats || {}),
      missionClaims: mergeUniqueRecords(preferred.stats?.missionClaims, fallback.stats?.missionClaims)
    };
  }
  return merged;
}

function mergeDietDay(preferred = {}, fallback = {}) {
  const mealKeys = new Set([
    ...Object.keys(fallback?.meals || {}),
    ...Object.keys(preferred?.meals || {})
  ]);
  const meals = {};
  mealKeys.forEach((mealKey) => {
    meals[mealKey] = mergeUniqueRecords(preferred?.meals?.[mealKey], fallback?.meals?.[mealKey]);
  });
  return {
    ...fallback,
    ...preferred,
    finalized: Boolean(preferred?.finalized || fallback?.finalized),
    meals
  };
}

function mergeDietForUpgrade(preferred, fallback) {
  if (!preferred || typeof preferred !== "object") return fallback || null;
  if (!fallback || typeof fallback !== "object") return preferred;
  const merged = {
    ...fallback,
    ...preferred,
    recentFoods: mergeUniqueRecords(preferred.recentFoods, fallback.recentFoods),
    favoriteFoodIds: Array.from(new Set([
      ...(Array.isArray(preferred.favoriteFoodIds) ? preferred.favoriteFoodIds : []),
      ...(Array.isArray(fallback.favoriteFoodIds) ? fallback.favoriteFoodIds : [])
    ])),
    days: { ...(fallback.days || {}) }
  };
  Object.keys(preferred.days || {}).forEach((dateKey) => {
    merged.days[dateKey] = mergeDietDay(preferred.days[dateKey], fallback.days?.[dateKey]);
  });
  return merged;
}

function isVersionUpgradePair(localValue, cloudValue) {
  const localVersion = String(localValue?.version || "");
  const cloudVersion = String(cloudValue?.version || "");
  return Boolean(
    (localVersion && localVersion !== APP_VERSION) ||
    (cloudVersion && cloudVersion !== APP_VERSION) ||
    (localVersion && cloudVersion && localVersion !== cloudVersion)
  );
}

function createVersionUpgradeBackup(snapshot) {
  const userId = authSession?.user?.id || "local";
  if (!snapshot?.game && !snapshot?.diet) return;
  const previousVersion = String(snapshot?.game?.version || snapshot?.diet?.version || "unknown");
  if (previousVersion === APP_VERSION) return;
  const key = `rpgym:upgrade-backup:${userId}:${previousVersion}:to:${APP_VERSION}`;
  try {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({
        createdAt: new Date().toISOString(),
        fromVersion: previousVersion,
        toVersion: APP_VERSION,
        game: snapshot.game || null,
        diet: snapshot.diet || null
      }));
    }
  } catch (error) {
    console.warn("Não foi possível criar o backup pré-atualização.", error);
  }
}

function chooseDomain(domain, localValue, cloudValue, localTs, cloudTs) {
  if (!cloudValue && localValue) return { value: localValue, source: "local" };
  if (!localValue && cloudValue) return { value: cloudValue, source: "cloud" };
  if (!localValue && !cloudValue) return { value: null, source: "none" };

  // Uma alteração local ainda não confirmada pela nuvem NUNCA pode ser
  // descartada por reload, boot ou diferença pequena de relógio.
  if (isLocalSaveDirty(domain)) return { value: localValue, source: "local", dirty: true };

  // Sem pendência local, compara timestamps sem janela de tolerância destrutiva.
  if (localTs > cloudTs) return { value: localValue, source: "local" };
  return { value: cloudValue, source: "cloud" };
}

function reconcileSaveDomains(local, data) {
  const serverTs = cloudTimestamp(data);
  const gameChoice = chooseDomain(
    "game",
    local?.game || null,
    data?.game_state || null,
    gameSnapshotTimestamp(local?.game),
    gameSnapshotTimestamp(data?.game_state, serverTs)
  );
  const dietChoice = chooseDomain(
    "diet",
    local?.diet || null,
    data?.diet_state || null,
    dietSnapshotTimestamp(local?.diet),
    dietSnapshotTimestamp(data?.diet_state, serverTs)
  );

  const gameOther = gameChoice.source === "cloud" ? local?.game : data?.game_state;
  const dietOther = dietChoice.source === "cloud" ? local?.diet : data?.diet_state;

  const game = isVersionUpgradePair(local?.game, data?.game_state)
    ? { ...gameChoice, value: mergeGameForUpgrade(gameChoice.value, gameOther), mergedForUpgrade: true }
    : gameChoice;
  const diet = isVersionUpgradePair(local?.diet, data?.diet_state)
    ? { ...dietChoice, value: mergeDietForUpgrade(dietChoice.value, dietOther), mergedForUpgrade: true }
    : dietChoice;

  return { game, diet };
}

function backupLocalBeforeReconcile() {
  const userId = authSession?.user?.id || "local";
  try {
    const snapshot = getLocalSaveSnapshot();
    if (!snapshot.game && !snapshot.diet) return;
    localStorage.setItem(`rpgym:pre-reconcile-backup:${userId}`, JSON.stringify({
      createdAt: new Date().toISOString(),
      game: snapshot.game,
      diet: snapshot.diet
    }));
  } catch (error) {
    console.warn("Não foi possível criar backup local antes da sincronização.", error);
  }
}

function persistReconciledSnapshot(reconciled) {
  try {
    backupLocalBeforeReconcile();
    if (reconciled?.game?.value && typeof reconciled.game.value === "object") {
      localStorage.setItem(getGameStorageKey(), JSON.stringify(reconciled.game.value));
    }
    if (reconciled?.diet?.value && typeof reconciled.diet.value === "object") {
      localStorage.setItem(getScopedStorageKey(DIET_STORAGE_KEY), JSON.stringify(reconciled.diet.value));
    }
    return true;
  } catch (error) {
    console.warn("Não foi possível persistir o estado reconciliado.", error);
    return false;
  }
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
  if (data) {
    const reconciled = reconcileSaveDomains(local, data);
    setCloudPendingSnapshot(
      reconciled.game.source === "cloud" ? reconciled.game.value : null,
      reconciled.diet.source === "cloud" ? reconciled.diet.value : null,
      data.updated_at
    );
    if (reconciled.game.source === "local" || reconciled.diet.source === "local") {
      window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT = true;
    }
    cloudHydratedForUser = userId;
    writeCloudMeta({
      lastSyncedAt: data.updated_at,
      lastServerUpdatedAt: data.updated_at,
      resolution: `preload-game-${reconciled.game.source}-diet-${reconciled.diet.source}`
    }, userId);
    updateCloudStatusLabel("synced");
    return { source: "reconciled", updatedAt: data.updated_at };
  }

  setCloudPendingSnapshot(null, null, null);
  cloudHydratedForUser = userId;
  if (local.game || local.diet) window.RPG_GYM_UPLOAD_LOCAL_AFTER_BOOT = true;
  writeCloudMeta({ resolution: "local-first-auto" }, userId);
  updateCloudStatusLabel("local");
  return { source: "local-first" };
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
      clearLocalSaveDirtyIfSynced("game", payload.game_state?.lastSavedAt);
      clearLocalSaveDirtyIfSynced("diet", payload.diet_state?.updatedAt);
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
    const reconciled = reconcileSaveDomains(local, data);
    const appliedKey = `${data.updated_at || "none"}|g:${reconciled.game.source}|d:${reconciled.diet.source}`;
    const alreadyApplied = meta.lastAppliedReconcileKey === appliedKey;

    // Jogo e Dieta são reconciliados separadamente. Uma área mais nova nunca
    // apaga silenciosamente a outra só porque o registro da nuvem é único.
    const cloudWonAny = reconciled.game.source === "cloud" || reconciled.diet.source === "cloud";
    const localWonAny = reconciled.game.source === "local" || reconciled.diet.source === "local" || reconciled.game.mergedForUpgrade || reconciled.diet.mergedForUpgrade;

    writeCloudMeta({
      lastSyncedAt: data.updated_at,
      lastServerUpdatedAt: data.updated_at,
      resolution: `game-${reconciled.game.source}-diet-${reconciled.diet.source}`,
      lastAppliedReconcileKey: appliedKey
    }, userId);

    if (cloudWonAny && !alreadyApplied && persistReconciledSnapshot(reconciled)) {
      cloudInitialReconcileComplete = true;
      cloudBootLocalSnapshot = null;
      updateCloudStatusLabel("synced");
      window.location.reload();
      return;
    }

    cloudInitialReconcileComplete = true;
    cloudBootLocalSnapshot = null;
    cloudDirtyWhileOffline = false;

    // Se qualquer domínio local era realmente mais recente, publica o pacote
    // reconciliado depois que a comparação terminou.
    if (localWonAny) {
      await pushCloudSaveNow();
      return;
    }

    updateCloudStatusLabel("synced");
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

      const reconciled = reconcileSaveDomains(local, data);
      const cloudWonAny = reconciled.game.source === "cloud" || reconciled.diet.source === "cloud";
      const localWonAny = reconciled.game.source === "local" || reconciled.diet.source === "local" || reconciled.game.mergedForUpgrade || reconciled.diet.mergedForUpgrade;

      cloudLastServerUpdatedAt = data.updated_at || null;
      writeCloudMeta({
        lastSyncedAt: data.updated_at,
        lastServerUpdatedAt: data.updated_at,
        resolution: `reconnect-game-${reconciled.game.source}-diet-${reconciled.diet.source}`
      }, userId);
      cloudDirtyWhileOffline = false;

      if (cloudWonAny && persistReconciledSnapshot(reconciled)) {
        updateCloudStatusLabel("synced");
        window.location.reload();
        return true;
      }

      if (localWonAny) return await pushCloudSaveNow();

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
  reconcileCloudAfterReconnect, updateCloudStatusLabel,
  markLocalSaveDirty, isLocalSaveDirty
});

"use strict";

const SOCIAL_CACHE_MS = 8_000;
let socialCurrentGroup = null;
let socialCurrentMembers = [];
let socialMemberProfiles = new Map();
let socialAvailableGroups = [];
let socialLastLoadedAt = 0;
let socialLoadPromise = null;
let socialRealtimeChannel = null;
let socialSnapshotTimer = null;
let socialSnapshotInFlight = false;
let socialSnapshotQueued = false;

function socialReady() {
  return Boolean(supabaseClient && authSession?.user?.id);
}

function socialMissionMarkup(mission) {
  const target = Math.max(1, Number(mission?.target || 1));
  const progress = Math.max(0, Number(mission?.progress || 0));
  const percent = clamp((progress / target) * 100, 0, 100);
  const reward = mission?.reward ? missionRewardLabel(mission.reward) : "XP";
  return `<article class="social-mission-card">
    <div class="social-mission-copy">
      <strong>${escapeHtml(mission?.name || "Missão")}</strong>
      <small>${escapeHtml(mission?.description || "Complete a missão para ganhar XP.")}</small>
      <div class="social-mini-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${progress}"><i style="width:${percent}%"></i></div>
    </div>
    <span class="social-mission-reward">${escapeHtml(reward)}</span>
  </article>`;
}

function socialInitials(name) {
  return String(name || "JG")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "JG";
}

function socialAvatarMarkup(profile, className = "social-avatar") {
  const url = String(profile?.avatar_url || "").trim();
  if (url) return `<span class="${className} has-image"><img src="${escapeHtml(url)}" alt="" loading="lazy"></span>`;
  return `<span class="${className}">${escapeHtml(socialInitials(profile?.display_name))}</span>`;
}

function socialTimeAgo(timestamp) {
  if (!timestamp) return "Sem atividade recente";
  const diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "dia" : "dias"} atrás`;
}

function socialMemberMarkup(profile, member = null) {
  const summary = profile?.summary || {};
  const latest = profile?.latest_activity || null;
  const userId = profile?.user_id || member?.user_id || "";
  return `<button class="social-member-card" type="button" data-social-member="${escapeHtml(userId)}">
    ${socialAvatarMarkup(profile)}
    <span class="social-member-main">
      <strong>${escapeHtml(profile?.display_name || "Jogador")}</strong>
      <small>${escapeHtml(profile?.title || "Novato")} • Nv. ${Math.max(1, Number(profile?.global_level) || 1)}</small>
      <b>${escapeHtml(latest?.title || "Sem registro recente")}</b>
    </span>
    <span class="social-member-status">${escapeHtml(socialTimeAgo(latest?.timestamp || profile?.updated_at))}</span>
    <span class="social-member-metrics">
      <em><b>${formatNumber(summary.workouts || 0)}</b><small>Treinos</small></em>
      <em><b>${formatNumber(Math.round(summary.cardioMinutes || 0))} min</b><small>Cardio</small></em>
      <em><b>${formatNumber(Math.round(summary.volumeKg || 0))} kg</b><small>Volume</small></em>
    </span>
  </button>`;
}

function socialActivityMarkup(profile) {
  const latest = profile?.latest_activity;
  if (!latest) return "";
  const awards = Array.isArray(latest.xpAwards) && latest.xpAwards.length
    ? latest.xpAwards.map((award) => `${ATTRIBUTES[award.attribute]?.name || award.attribute} +${formatNumber(award.xp)} XP`).join(" • ")
    : (latest.xp ? `+${formatNumber(latest.xp)} XP` : "");
  return `<button class="social-update-card" type="button" data-social-member="${escapeHtml(profile.user_id)}">
    ${socialAvatarMarkup(profile)}
    <span class="social-update-copy"><strong>${escapeHtml(profile.display_name || "Jogador")}</strong><b>${escapeHtml(latest.title || "Novo registro")}</b><small>${escapeHtml(latest.details || awards || "Atividade registrada")}</small></span>
    <time>${escapeHtml(socialTimeAgo(latest.timestamp))}</time>
  </button>`;
}

function showSocialPanel(panelId) {
  ["socialHomePanel", "socialSearchPanel", "socialCreatePanel", "socialGroupPanel", "socialMemberPanel"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== panelId;
  });
}

async function loadSocialGroups(force = false) {
  if (!socialReady()) return [];
  if (!force && socialAvailableGroups.length && Date.now() - socialLastLoadedAt < SOCIAL_CACHE_MS) return socialAvailableGroups;
  const { data, error } = await supabaseClient
    .from("groups")
    .select("id,name,description,focus,is_public,created_at")
    .eq("is_public", true)
    .order("name", { ascending: true });
  if (error) throw error;
  socialAvailableGroups = Array.isArray(data) ? data : [];
  return socialAvailableGroups;
}

async function loadCurrentSocialGroup(force = false) {
  if (!socialReady()) return null;
  if (!force && socialCurrentGroup && Date.now() - socialLastLoadedAt < SOCIAL_CACHE_MS) return socialCurrentGroup;

  const userId = authSession.user.id;
  const { data: membership, error: membershipError } = await supabaseClient
    .from("group_members")
    .select("group_id,user_id,role,joined_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) throw membershipError;

  if (!membership) {
    socialCurrentGroup = null;
    socialCurrentMembers = [];
    socialMemberProfiles = new Map();
    socialLastLoadedAt = Date.now();
    subscribeSocialRealtime(null);
    return null;
  }

  const { data: group, error: groupError } = await supabaseClient
    .from("groups")
    .select("id,name,description,focus,is_public,created_at")
    .eq("id", membership.group_id)
    .single();
  if (groupError) throw groupError;

  const { data: members, error: membersError } = await supabaseClient
    .from("group_members")
    .select("group_id,user_id,role,joined_at")
    .eq("group_id", membership.group_id)
    .order("joined_at", { ascending: true });
  if (membersError) throw membersError;

  const memberIds = (members || []).map((item) => item.user_id).filter(Boolean);
  let profiles = [];
  if (memberIds.length) {
    const { data, error } = await supabaseClient
      .from("social_profiles")
      .select("user_id,display_name,avatar_url,title,global_level,attributes,summary,exercises,latest_activity,updated_at")
      .in("user_id", memberIds);
    if (error) throw error;
    profiles = data || [];
  }

  socialCurrentGroup = { ...group, membership };
  socialCurrentMembers = members || [];
  socialMemberProfiles = new Map(profiles.map((profile) => [profile.user_id, profile]));
  socialLastLoadedAt = Date.now();
  subscribeSocialRealtime(group.id);
  return socialCurrentGroup;
}

async function ensureSocialLoaded(force = false) {
  if (!socialReady()) return;
  if (socialLoadPromise) return socialLoadPromise;
  if (!force && Date.now() - socialLastLoadedAt < SOCIAL_CACHE_MS) return;
  socialLoadPromise = (async () => {
    try {
      await Promise.all([loadSocialGroups(force), loadCurrentSocialGroup(force)]);
    } catch (error) {
      console.warn("Não foi possível carregar o Social.", error);
    } finally {
      socialLoadPromise = null;
    }
  })();
  return socialLoadPromise;
}

function renderSocialHome() {
  setText("socialPlayerName", state?.player?.name || authProfile?.display_name || "Jogador");
  const missions = document.getElementById("socialWeeklyMissions");
  if (missions) {
    const source = state?.missions?.weekly?.length ? state.missions.weekly : state?.missions?.daily || [];
    missions.innerHTML = source.slice(0, 3).map(socialMissionMarkup).join("");
  }

  const sectionTitle = document.querySelector(".social-group-section .social-section-title h2");
  const seeButton = document.getElementById("socialSeeGroup");
  const members = document.getElementById("socialGroupMembers");
  if (!members) return;

  if (!socialReady()) {
    if (sectionTitle) sectionTitle.textContent = "Seu grupo";
    if (seeButton) seeButton.hidden = true;
    members.innerHTML = `<div class="social-empty-state"><strong>Conecte sua conta</strong><span>O Social usa sua conta Supabase para grupos e atualizações.</span></div>`;
    return;
  }

  if (!socialCurrentGroup) {
    if (sectionTitle) sectionTitle.textContent = "Seu grupo";
    if (seeButton) seeButton.hidden = true;
    members.innerHTML = `<div class="social-no-group-card"><strong>Você ainda não entrou em um grupo</strong><span>Entre em um grupo existente ou crie o seu para acompanhar atividades e comparar exercícios.</span><div class="social-no-group-actions"><button type="button" data-social-open-search>Encontrar grupo</button><button class="social-secondary-action" type="button" data-social-create-direct>Criar grupo</button></div></div>`;
    return;
  }

  if (sectionTitle) sectionTitle.textContent = socialCurrentGroup.name;
  if (seeButton) {
    seeButton.hidden = false;
    seeButton.textContent = "Participantes ›";
  }

  const orderedProfiles = socialCurrentMembers
    .map((member) => ({ member, profile: socialMemberProfiles.get(member.user_id) }))
    .filter((item) => item.profile)
    .sort((a, b) => new Date(b.profile.latest_activity?.timestamp || b.profile.updated_at || 0) - new Date(a.profile.latest_activity?.timestamp || a.profile.updated_at || 0));

  const updateCards = orderedProfiles.map(({ profile }) => socialActivityMarkup(profile)).filter(Boolean).slice(0, 5).join("");
  const memberCount = socialCurrentMembers.length;
  const owner = orderedProfiles.find(({ member }) => member?.role === "owner")?.profile;
  members.innerHTML = `<button class="social-current-group-card" type="button" data-social-group="${escapeHtml(socialCurrentGroup.id)}">
      <span class="social-group-avatar">${escapeHtml(socialCurrentGroup.name.slice(0, 2).toUpperCase())}</span>
      <span class="social-current-group-copy"><strong>${escapeHtml(socialCurrentGroup.name)}</strong><small>${escapeHtml(socialCurrentGroup.description || socialCurrentGroup.focus || "Grupo RPG GYM")}</small><b>${memberCount} ${memberCount === 1 ? "integrante" : "integrantes"}${owner ? ` • criado por ${escapeHtml(owner.display_name || "Jogador")}` : ""}</b></span>
      <span class="social-current-group-arrow">›</span>
    </button>
    <div class="social-feed-block social-group-feed"><div class="social-feed-title"><strong>Atividade recente</strong><small>Atualiza automaticamente</small></div>${updateCards || `<div class="social-empty-state">Nenhum registro recente do grupo.</div>`}</div>`;
}

function renderSocial() {
  renderSocialHome();
  ensureSocialLoaded(false).then(() => {
    if (activeView === "social" && !document.getElementById("socialHomePanel")?.hidden) renderSocialHome();
  });
}

async function renderSocialSearch() {
  const input = document.getElementById("socialGroupSearch");
  const results = document.getElementById("socialGroupSearchResults");
  const createButton = document.getElementById("socialCreateGroupButton");
  if (createButton) createButton.hidden = Boolean(socialCurrentGroup);
  if (!results) return;
  if (!socialReady()) {
    results.innerHTML = `<div class="social-empty-state">Faça login para pesquisar grupos.</div>`;
    return;
  }
  results.innerHTML = `<div class="social-empty-state">Buscando grupos...</div>`;
  try {
    await loadSocialGroups(true);
    const query = normalizeSearchText(input?.value || "");
    const groups = socialAvailableGroups.filter((group) => !query || normalizeSearchText(`${group.name} ${group.description} ${group.focus}`).includes(query));
    results.innerHTML = groups.length ? groups.map((group) => {
      const current = socialCurrentGroup?.id === group.id;
      return `<button class="social-search-row" type="button" data-social-group="${group.id}"><span class="social-search-avatar">${escapeHtml(group.name.slice(0, 2).toUpperCase())}</span><span><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(group.description || group.focus)}</small></span><b>${current ? "✓" : "›"}</b></button>`;
    }).join("") : `<div class="social-empty-state">Nenhum grupo encontrado.</div>`;
  } catch (error) {
    console.warn(error);
    results.innerHTML = `<div class="social-empty-state">Não foi possível carregar os grupos.</div>`;
  }
}

function openSocialSearch() {
  showSocialPanel("socialSearchPanel");
  renderSocialSearch();
  window.setTimeout(() => document.getElementById("socialGroupSearch")?.focus(), 0);
}

function openSocialCreateGroup() {
  if (!socialReady()) return;
  if (socialCurrentGroup) {
    showToast("Você já está em um grupo", "Saia do grupo atual antes de criar outro.", "◎");
    return;
  }
  showSocialPanel("socialCreatePanel");
  const form = document.getElementById("socialCreateGroupForm");
  form?.reset();
  window.setTimeout(() => document.getElementById("socialCreateName")?.focus(), 0);
}

async function createSocialGroup(event) {
  event?.preventDefault?.();
  if (!socialReady() || socialCurrentGroup) return;
  const name = String(document.getElementById("socialCreateName")?.value || "").trim().replace(/\s+/g, " ");
  const description = String(document.getElementById("socialCreateDescription")?.value || "").trim();
  const focus = String(document.getElementById("socialCreateFocus")?.value || "Equilíbrio").trim();
  if (name.length < 3) { showToast("Nome muito curto", "Use pelo menos 3 caracteres para o grupo.", "!"); return; }
  const submit = event?.submitter || document.querySelector("#socialCreateGroupForm button[type='submit']");
  if (submit) { submit.disabled = true; submit.textContent = "Criando..."; }
  try {
    const { data, error } = await supabaseClient.rpc("create_social_group", {
      group_name: name,
      group_description: description,
      group_focus: focus
    });
    if (error) throw error;
    socialAvailableGroups = [];
    socialLastLoadedAt = 0;
    await syncSocialSnapshotNow();
    await ensureSocialLoaded(true);
    showToast("Grupo criado", `${socialCurrentGroup?.name || name} já está pronto.`, "◎");
    showSocialPanel("socialHomePanel");
    renderSocialHome();
    if (data) openSocialGroup(data);
  } catch (error) {
    console.warn(error);
    const duplicate = error?.code === "23505" || /already exists|duplicate|unique/i.test(error?.message || "");
    showToast("Não foi possível criar", duplicate ? "Já existe um grupo com esse nome." : "Confira os dados e tente novamente.", "!");
  } finally {
    if (submit) { submit.disabled = false; submit.textContent = "Criar grupo"; }
  }
}

async function fetchSocialGroup(groupId) {
  const cached = socialAvailableGroups.find((item) => item.id === groupId);
  if (cached) return cached;
  const { data, error } = await supabaseClient.from("groups").select("id,name,description,focus,is_public,created_at").eq("id", groupId).single();
  if (error) throw error;
  return data;
}

async function openSocialGroup(groupId = socialCurrentGroup?.id) {
  if (!socialReady()) return;
  const detail = document.getElementById("socialGroupDetail");
  if (!detail) return;
  detail.innerHTML = `<div class="social-empty-state">Carregando grupo...</div>`;
  showSocialPanel("socialGroupPanel");

  try {
    const group = await fetchSocialGroup(groupId);
    const isCurrent = socialCurrentGroup?.id === group.id;
    let membersMarkup = "";
    let memberCount = 0;
    if (isCurrent) {
      await loadCurrentSocialGroup(true);
      memberCount = socialCurrentMembers.length;
      membersMarkup = socialCurrentMembers
        .map((member) => ({ member, profile: socialMemberProfiles.get(member.user_id) }))
        .filter(({ profile }) => Boolean(profile))
        .sort((a, b) => (a.member.role === "owner" ? -1 : 0) - (b.member.role === "owner" ? -1 : 0) || new Date(a.member.joined_at) - new Date(b.member.joined_at))
        .map(({ profile, member }) => `<div class="social-group-member-wrap">${socialMemberMarkup(profile, member)}${member.role === "owner" ? `<span class="social-role-badge">Dono</span>` : ""}</div>`)
        .join("");
    }

    detail.innerHTML = `<div class="social-group-hero">
      <span class="social-group-avatar">${escapeHtml(group.name.slice(0, 2).toUpperCase())}</span>
      <h2>${escapeHtml(group.name)}</h2>
      <p>${escapeHtml(group.description || "Grupo RPG GYM")}</p>
      <div class="social-group-stats"><span><b>${escapeHtml(group.focus || "Equilíbrio")}</b><small>Foco</small></span><span><b>${isCurrent ? memberCount : "—"}</b><small>Membros</small></span><span><b>${isCurrent ? "Você está dentro" : "Aberto"}</b><small>Status</small></span></div>
    </div>
    <div class="social-group-actions">${isCurrent
      ? `<button class="social-secondary-action" type="button" data-social-leave-group="${group.id}">Sair do grupo</button>${socialCurrentGroup?.membership?.role === "owner" ? `<button class="social-danger-action" type="button" data-social-delete-group="${group.id}">Excluir grupo</button>` : ""}`
      : `<button class="social-primary-action" type="button" data-social-join-group="${group.id}">Entrar no grupo</button>`}
    </div>
    ${isCurrent ? `<section class="social-group-member-section"><div class="social-feed-title"><strong>Integrantes</strong><small>${memberCount}</small></div><div class="social-group-members">${membersMarkup || `<div class="social-empty-state">Nenhum integrante encontrado.</div>`}</div></section>` : `<div class="social-join-hint">Entre no grupo para visualizar os participantes e comparar exercícios em comum.</div>`}`;
  } catch (error) {
    console.warn(error);
    detail.innerHTML = `<div class="social-empty-state">Não foi possível abrir este grupo.</div>`;
  }
}

async function joinSocialGroup(groupId) {
  if (!socialReady()) return;
  const perform = async () => {
    try {
      const userId = authSession.user.id;
      if (socialCurrentGroup?.id && socialCurrentGroup.id !== groupId) {
        const { error: leaveError } = await supabaseClient.rpc("leave_social_group", { target_group: socialCurrentGroup.id });
        if (leaveError) throw leaveError;
      }
      const { error } = await supabaseClient.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" });
      if (error && error.code !== "23505") throw error;
      socialLastLoadedAt = 0;
      await syncSocialSnapshotNow();
      await ensureSocialLoaded(true);
      showToast("Grupo atualizado", `Você entrou em ${socialCurrentGroup?.name || "um grupo"}.`, "◎");
      showSocialPanel("socialHomePanel");
      renderSocialHome();
    } catch (error) {
      console.warn(error);
      showToast("Não foi possível entrar", "Confira sua conexão e tente novamente.", "!");
    }
  };

  if (socialCurrentGroup && socialCurrentGroup.id !== groupId) {
    requestConfirmation({
      title: "Trocar de grupo?",
      message: `Você sairá de ${socialCurrentGroup.name} para entrar no novo grupo.`,
      confirmLabel: "Trocar grupo",
      cancelLabel: "Cancelar",
      icon: "◎"
    }, perform);
  } else {
    await perform();
  }
}

async function leaveSocialGroup() {
  if (!socialReady() || !socialCurrentGroup) return;
  requestConfirmation({
    title: "Sair do grupo?",
    message: `Você deixará de receber atualizações de ${socialCurrentGroup.name}. Seu progresso pessoal não será apagado.`,
    confirmLabel: "Sair do grupo",
    cancelLabel: "Cancelar",
    danger: true,
    icon: "◎"
  }, async () => {
    try {
      const { error } = await supabaseClient.rpc("leave_social_group", { target_group: socialCurrentGroup.id });
      if (error) throw error;
      socialCurrentGroup = null;
      socialCurrentMembers = [];
      socialMemberProfiles = new Map();
      socialLastLoadedAt = 0;
      subscribeSocialRealtime(null);
      showSocialPanel("socialHomePanel");
      renderSocialHome();
      showToast("Você saiu do grupo", "É possível entrar em outro grupo quando quiser.", "◎");
    } catch (error) {
      console.warn(error);
      showToast("Não foi possível sair", "Tente novamente em alguns segundos.", "!");
    }
  });
}


async function deleteSocialGroup(groupId = socialCurrentGroup?.id) {
  if (!socialReady() || !socialCurrentGroup || !groupId) return;
  if (socialCurrentGroup.id !== groupId || socialCurrentGroup.membership?.role !== "owner") {
    showToast("Ação não permitida", "Somente o dono pode excluir este grupo.", "!");
    return;
  }

  const groupName = socialCurrentGroup.name || "este grupo";
  requestConfirmation({
    title: "Excluir grupo?",
    message: `Esta ação removerá ${groupName} e todos os participantes do grupo. O progresso pessoal de cada membro não será apagado. Esta ação não pode ser desfeita.`,
    confirmLabel: "Excluir grupo",
    cancelLabel: "Cancelar",
    danger: true,
    icon: "!"
  }, async () => {
    try {
      const { error } = await supabaseClient.rpc("delete_social_group", { target_group: groupId });
      if (error) throw error;

      socialCurrentGroup = null;
      socialCurrentMembers = [];
      socialMemberProfiles = new Map();
      socialAvailableGroups = socialAvailableGroups.filter((group) => group.id !== groupId);
      socialLastLoadedAt = 0;
      subscribeSocialRealtime(null);
      showSocialPanel("socialHomePanel");
      renderSocialHome();
      showToast("Grupo excluído", `${groupName} foi removido. Os dados pessoais dos integrantes foram preservados.`, "✓");
    } catch (error) {
      console.warn(error);
      const forbidden = /owner|permission|not allowed|not found/i.test(error?.message || "");
      showToast("Não foi possível excluir", forbidden ? "Somente o dono atual pode excluir o grupo." : "Confira sua conexão e tente novamente.", "!");
    }
  });
}

function socialAttributeRows(profile) {
  const attrs = profile?.attributes || {};
  return PROFILE_ATTRIBUTE_ORDER.map((key) => {
    const level = Math.max(1, Number(attrs[key]?.level ?? attrs[key]) || 1);
    return `<div class="social-attribute-row"><span><strong>${escapeHtml(ATTRIBUTES[key].name)}</strong><small>Nível ${level}</small></span><i><b style="width:${Math.min(100, level * 2)}%"></b></i></div>`;
  }).join("");
}

function buildSocialExerciseSnapshot() {
  const map = {};
  const sessions = state?.workouts?.sessions || [];
  for (const session of sessions) {
    for (const exercise of session?.exercises || []) {
      const id = exercise?.exerciseId;
      if (!id) continue;
      const tracking = typeof getExerciseTracking === "function" ? getExerciseTracking(id) : "weight_reps";
      const definition = getExerciseById(id);
      map[id] ||= {
        name: exercise.name || definition?.name || id,
        tracking,
        sessions: 0,
        sets: 0,
        volumeKg: 0,
        bestValue: 0,
        bestWeight: 0,
        bestReps: 0,
        bestSeconds: 0,
        lastPerformedAt: null
      };
      const row = map[id];
      row.sessions += 1;
      for (const set of exercise.sets || []) {
        if (!set?.completed) continue;
        row.sets += 1;
        const reps = Math.max(0, Number(set.reps) || 0);
        const weight = Math.max(0, Number(set.weight) || 0);
        const seconds = Math.max(0, Number(set.durationSeconds ?? set.seconds ?? set.time) || 0);
        row.volumeKg += weight * reps;
        if (tracking === "time") {
          if (seconds > row.bestValue) {
            row.bestValue = seconds;
            row.bestSeconds = seconds;
          }
        } else if (tracking === "reps") {
          if (reps > row.bestValue) {
            row.bestValue = reps;
            row.bestReps = reps;
          }
        } else {
          const e1rm = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
          if (e1rm > row.bestValue) {
            row.bestValue = e1rm;
            row.bestWeight = weight;
            row.bestReps = reps;
          }
        }
      }
      const performedAt = session.finishedAt || session.startedAt;
      if (performedAt && (!row.lastPerformedAt || performedAt > row.lastPerformedAt)) row.lastPerformedAt = performedAt;
    }
  }
  Object.values(map).forEach((item) => { item.volumeKg = Math.round(item.volumeKg); item.bestValue = Number(item.bestValue.toFixed?.(2) ?? item.bestValue); });
  return map;
}

function getLatestSocialActivity() {
  const entry = (state?.history || []).find((item) => item?.timestamp);
  if (!entry) return null;
  return {
    id: entry.id || null,
    title: entry.activityName || "Atividade registrada",
    details: entry.details || "",
    xp: Math.max(0, Number(entry.xp) || 0),
    xpAwards: Array.isArray(entry.xpAwards) ? entry.xpAwards.slice(0, 3) : [],
    timestamp: entry.timestamp
  };
}

function currentSocialSnapshotPayload() {
  if (!socialReady() || !state) return null;
  const lifetime = state.stats?.lifetime || {};
  return {
    user_id: authSession.user.id,
    display_name: state.player?.name || authProfile?.display_name || "Jogador",
    avatar_url: authProfile?.avatar_url || null,
    title: state.player?.title || "Novato",
    global_level: Math.max(1, Number(state.player?.globalLevel) || 1),
    attributes: Object.fromEntries(PROFILE_ATTRIBUTE_ORDER.map((key) => [key, { level: state.attributes?.[key]?.level || 1 }])),
    summary: {
      workouts: lifetime.workoutsCompleted || 0,
      sets: lifetime.setsCompleted || 0,
      volumeKg: Math.round(lifetime.totalVolumeKg || 0),
      cardioSessions: lifetime.cardioSessions || 0,
      cardioMinutes: Math.round(lifetime.cardioMinutes || 0),
      streak: state.streak?.current || 0,
      personalRecords: (lifetime.workoutPersonalRecords || 0) + (lifetime.cardioPersonalRecords || 0)
    },
    exercises: buildSocialExerciseSnapshot(),
    latest_activity: getLatestSocialActivity()
  };
}

async function syncSocialSnapshotNow() {
  if (!socialReady() || !state) return false;
  if (socialSnapshotInFlight) {
    socialSnapshotQueued = true;
    return false;
  }
  const payload = currentSocialSnapshotPayload();
  if (!payload) return false;
  socialSnapshotInFlight = true;
  try {
    const { data, error } = await supabaseClient
      .from("social_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id,display_name,avatar_url,title,global_level,attributes,summary,exercises,latest_activity,updated_at")
      .single();
    if (error) throw error;

    // Atualiza o cache social imediatamente. Isso faz a nova foto aparecer no
    // grupo/feed sem exigir logout, reload ou esperar o evento Realtime.
    const freshProfile = data || payload;
    if (freshProfile?.user_id) socialMemberProfiles.set(freshProfile.user_id, freshProfile);
    if (activeView === "social") renderSocialHome();
    return true;
  } catch (error) {
    console.warn("Não foi possível atualizar o perfil social.", error);
    return false;
  } finally {
    socialSnapshotInFlight = false;
    if (socialSnapshotQueued) {
      socialSnapshotQueued = false;
      scheduleSocialSnapshotSync(500);
    }
  }
}

function scheduleSocialSnapshotSync(delay = 1_500) {
  if (!socialReady() || !state) return;
  window.clearTimeout(socialSnapshotTimer);
  socialSnapshotTimer = window.setTimeout(() => {
    socialSnapshotTimer = null;
    syncSocialSnapshotNow();
  }, delay);
}

function formatSocialExerciseBest(item) {
  if (!item) return "—";
  if (item.tracking === "time") return item.bestSeconds ? formatDurationSeconds(item.bestSeconds) : "—";
  if (item.tracking === "reps") return item.bestReps ? `${formatNumber(item.bestReps)} reps` : "—";
  if (item.bestWeight > 0 && item.bestReps > 0) return `${formatNumber(item.bestWeight)} kg × ${formatNumber(item.bestReps)}`;
  return "—";
}

function compareCommonExercises(memberProfile) {
  const theirs = memberProfile?.exercises || {};
  const mine = buildSocialExerciseSnapshot();
  return Object.keys(mine)
    .filter((id) => theirs[id])
    .map((id) => ({ id, mine: mine[id], theirs: theirs[id] }))
    .sort((a, b) => Math.max(new Date(b.mine.lastPerformedAt || 0), new Date(b.theirs.lastPerformedAt || 0)) - Math.max(new Date(a.mine.lastPerformedAt || 0), new Date(a.theirs.lastPerformedAt || 0)))
    .slice(0, 10);
}

function commonExerciseMarkup(memberProfile) {
  if (memberProfile?.user_id === authSession?.user?.id) return `<div class="social-compare-note">Este é o seu próprio perfil.</div>`;
  const common = compareCommonExercises(memberProfile);
  if (!common.length) return `<div class="social-compare-note">Vocês ainda não possuem exercícios registrados em comum.</div>`;
  return common.map(({ mine, theirs }) => `<div class="social-compare-row"><div><strong>${escapeHtml(mine.name || theirs.name)}</strong><small>${escapeHtml(mine.tracking === "time" ? "Tempo" : mine.tracking === "reps" ? "Repetições" : "Melhor série")}</small></div><span><small>Você</small><b>${escapeHtml(formatSocialExerciseBest(mine))}</b></span><span><small>${escapeHtml(memberProfile.display_name?.split(" ")[0] || "Membro")}</small><b>${escapeHtml(formatSocialExerciseBest(theirs))}</b></span></div>`).join("");
}

async function openSocialMember(memberId) {
  if (!memberId || !socialReady()) return;
  const detail = document.getElementById("socialMemberDetail");
  if (!detail) return;
  let member = socialMemberProfiles.get(memberId);
  if (!member) {
    const { data, error } = await supabaseClient
      .from("social_profiles")
      .select("user_id,display_name,avatar_url,title,global_level,attributes,summary,exercises,latest_activity,updated_at")
      .eq("user_id", memberId)
      .maybeSingle();
    if (error) {
      console.warn(error);
      return;
    }
    member = data;
  }
  if (!member) return;
  const summary = member.summary || {};
  detail.innerHTML = `<div class="social-member-hero">
    ${socialAvatarMarkup(member, "social-profile-avatar")}
    <h2>${escapeHtml(member.display_name || "Jogador")}</h2>
    <p>${escapeHtml(member.title || "Novato")}</p>
    <div class="social-profile-stats"><span><b>Nv. ${Math.max(1, Number(member.global_level) || 1)}</b><small>Global</small></span><span><b>${formatNumber(summary.workouts || 0)}</b><small>Treinos</small></span><span><b>${formatNumber(summary.personalRecords || 0)}</b><small>PRs</small></span></div>
  </div>
  <section class="social-attribute-list"><h3>Atributos</h3>${socialAttributeRows(member)}</section>
  <section class="social-compare-section"><div class="social-feed-title"><strong>Exercícios em comum</strong><small>Comparação de melhores registros</small></div>${commonExerciseMarkup(member)}</section>`;
  showSocialPanel("socialMemberPanel");
}

function subscribeSocialRealtime(groupId) {
  if (!supabaseClient) return;
  if (socialRealtimeChannel) {
    try { supabaseClient.removeChannel(socialRealtimeChannel); } catch (_error) {}
    socialRealtimeChannel = null;
  }
  if (!groupId) return;
  socialRealtimeChannel = supabaseClient
    .channel(`rpg-gym-social-${groupId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, () => refreshSocialFromRealtime())
    .on("postgres_changes", { event: "*", schema: "public", table: "social_profiles" }, () => refreshSocialFromRealtime())
    .subscribe((status, error) => {
      if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && error) console.warn("Realtime Social:", error);
    });
}

const refreshSocialFromRealtime = debounce(async () => {
  if (!socialReady() || !socialCurrentGroup) return;
  socialLastLoadedAt = 0;
  await loadCurrentSocialGroup(true);
  if (activeView === "social") renderSocialHome();
}, 350);

window.scheduleSocialSnapshotSync = scheduleSocialSnapshotSync;
window.syncSocialSnapshotNow = syncSocialSnapshotNow;
window.ensureSocialLoaded = ensureSocialLoaded;

window.openSocialCreateGroup = openSocialCreateGroup;
window.createSocialGroup = createSocialGroup;
window.deleteSocialGroup = deleteSocialGroup;

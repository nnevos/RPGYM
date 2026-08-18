"use strict";

const SOCIAL_GROUPS = [
  { id: "golo", name: "Golo", tagline: "Força e constância", members: 18, focus: "Força" },
  { id: "agronegocio", name: "Agronegócio", tagline: "Evolução em equipe", members: 24, focus: "Equilíbrio" },
  { id: "rubra", name: "Rubra", tagline: "Treino sem desculpas", members: 12, focus: "Determinação" }
];

const SOCIAL_MEMBERS = [
  { id: "andre", name: "André Lima", title: "Prometheus", className: "Prometheus", level: 8, series: 15, minutes: 60, volume: 10000, initials: "AL", levels: [6,5,7,8,4,5] },
  { id: "caio", name: "Caio Sykez", title: "Fullbody", className: "Jogador Nato", level: 6, series: 15, minutes: 60, volume: 10000, initials: "CS", levels: [5,6,5,7,4,4] },
  { id: "willar", name: "Willar Carolina", title: "Upper I", className: "Soladora Das Sombras", level: 7, series: 15, minutes: 60, volume: 10000, initials: "WC", levels: [4,6,6,7,5,5] }
];

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

function socialMemberMarkup(member) {
  return `<button class="social-member-card" type="button" data-social-member="${member.id}">
    <span class="social-avatar">${escapeHtml(member.initials)}</span>
    <span class="social-member-main"><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.className)}</small><b>${escapeHtml(member.title)}</b></span>
    <span class="social-member-status">Novo registro!</span>
    <span class="social-member-metrics"><em><b>${member.series}</b><small>Séries</small></em><em><b>${member.minutes} min</b><small>Tempo</small></em><em><b>${Math.round(member.volume/1000)}k kg</b><small>Volume</small></em></span>
  </button>`;
}

function showSocialPanel(panelId) {
  ["socialHomePanel","socialSearchPanel","socialGroupPanel","socialMemberPanel"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== panelId;
  });
}

function renderSocialSearch() {
  const input = document.getElementById("socialGroupSearch");
  const results = document.getElementById("socialGroupSearchResults");
  if (!results) return;
  const query = normalizeSearchText(input?.value || "");
  const groups = SOCIAL_GROUPS.filter((group) => !query || normalizeSearchText(`${group.name} ${group.tagline} ${group.focus}`).includes(query));
  results.innerHTML = groups.length ? groups.map((group) => `<button class="social-search-row" type="button" data-social-group="${group.id}"><span class="social-search-avatar">${escapeHtml(group.name.slice(0,2).toUpperCase())}</span><span><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(group.tagline)}</small></span><b>＋</b></button>`).join("") : `<div class="social-empty-state">Nenhum grupo encontrado.</div>`;
}

function openSocialSearch() {
  showSocialPanel("socialSearchPanel");
  renderSocialSearch();
  window.setTimeout(() => document.getElementById("socialGroupSearch")?.focus(), 0);
}

function openSocialGroup(groupId = "agronegocio") {
  const group = SOCIAL_GROUPS.find((item) => item.id === groupId) || SOCIAL_GROUPS[1];
  const detail = document.getElementById("socialGroupDetail");
  if (!detail) return;
  detail.innerHTML = `<div class="social-group-hero"><span class="social-group-avatar">${escapeHtml(group.name.slice(0,2).toUpperCase())}</span><h2>${escapeHtml(group.name)}</h2><p>${escapeHtml(group.tagline)}</p><div class="social-group-stats"><span><b>Top 1</b><small>Ranking local</small></span><span><b>${group.members}</b><small>Membros</small></span><span><b>${escapeHtml(group.focus)}</b><small>Foco</small></span></div></div><div class="social-group-members">${SOCIAL_MEMBERS.map(socialMemberMarkup).join("")}</div>`;
  showSocialPanel("socialGroupPanel");
}

function openSocialMember(memberId) {
  const member = SOCIAL_MEMBERS.find((item) => item.id === memberId) || SOCIAL_MEMBERS[0];
  const detail = document.getElementById("socialMemberDetail");
  if (!detail) return;
  const attrs = ["Força","Agilidade","Constituição","Determinação","Inteligência","Carisma"];
  detail.innerHTML = `<div class="social-member-hero"><span class="social-profile-avatar">${escapeHtml(member.initials)}</span><h2>${escapeHtml(member.name)}</h2><p>${escapeHtml(member.className)}</p><div class="social-profile-stats"><span><b>Nv. ${member.level}</b><small>Nível</small></span><span><b>${member.minutes} min</b><small>Treino</small></span><span><b>${Math.round(member.volume/1000)}k kg</b><small>Volume</small></span></div></div><section class="social-attribute-list"><h3>Atributos</h3>${attrs.map((name,index)=>`<div class="social-attribute-row"><span><strong>${name}</strong><small>Level ${member.levels[index]}</small></span><i><b style="width:${Math.min(100, member.levels[index]*10)}%"></b></i></div>`).join("")}</section>`;
  showSocialPanel("socialMemberPanel");
}

function renderSocial() {
  setText("socialPlayerName", state?.player?.name || "Jogador");
  const missions = document.getElementById("socialWeeklyMissions");
  if (missions) {
    const source = state?.missions?.weekly?.length ? state.missions.weekly : state?.missions?.daily || [];
    missions.innerHTML = source.slice(0, 3).map(socialMissionMarkup).join("");
  }
  const members = document.getElementById("socialGroupMembers");
  if (members) members.innerHTML = SOCIAL_MEMBERS.map(socialMemberMarkup).join("");
}

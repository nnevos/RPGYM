"use strict";

// Ferramenta local de desenvolvimento para auditar de onde o XP esta vindo.
// Nao interfere no save do jogador e pode ser apagada a qualquer momento.
const BALANCE_AUDIT_STORAGE_KEY = "rpgym_balance_audit_v1";
const BALANCE_AUDIT_LIMIT = 300;

function loadBalanceAuditLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BALANCE_AUDIT_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, BALANCE_AUDIT_LIMIT) : [];
  } catch (_error) {
    return [];
  }
}

function saveBalanceAuditLog(log) {
  try {
    localStorage.setItem(BALANCE_AUDIT_STORAGE_KEY, JSON.stringify((log || []).slice(0, BALANCE_AUDIT_LIMIT)));
  } catch (_error) {
    // A auditoria nunca pode impedir o funcionamento do jogo.
  }
}

function recordXpAudit(attributeKey, amount, source = "Atividade", metadata = {}) {
  const xp = Math.max(0, Math.round(Number(amount) || 0));
  if (!xp) return;
  const log = loadBalanceAuditLog();
  log.unshift({
    id: typeof createId === "function" ? createId() : `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    attributeKey,
    xp,
    source,
    kind: metadata.kind || "xp",
    baseXp: Number.isFinite(Number(metadata.baseXp)) ? Math.round(Number(metadata.baseXp)) : null,
    bonusPercent: Number.isFinite(Number(metadata.bonusPercent)) ? Number(metadata.bonusPercent) : null,
    categoryMultiplier: Number.isFinite(Number(metadata.categoryMultiplier)) ? Number(metadata.categoryMultiplier) : 1,
    role: metadata.role || null,
    components: metadata.components || null,
    note: metadata.note || ""
  });
  saveBalanceAuditLog(log);
  if (typeof renderBalanceAuditPanel === "function") renderBalanceAuditPanel();
}

function clearBalanceAuditLog() {
  localStorage.removeItem(BALANCE_AUDIT_STORAGE_KEY);
  renderBalanceAuditPanel();
}

function getBalanceAuditSummary(log = loadBalanceAuditLog()) {
  const byAttribute = {};
  const byKind = {};
  let total = 0;
  log.forEach((entry) => {
    total += entry.xp || 0;
    byAttribute[entry.attributeKey] = (byAttribute[entry.attributeKey] || 0) + (entry.xp || 0);
    byKind[entry.kind || "xp"] = (byKind[entry.kind || "xp"] || 0) + (entry.xp || 0);
  });
  return { total, byAttribute, byKind, count: log.length };
}

function formatAuditComponents(entry) {
  const parts = [];
  if (entry.baseXp !== null) parts.push(`base ${entry.baseXp}`);
  if (entry.categoryMultiplier < 0.999) parts.push(`repetição ${Math.round(entry.categoryMultiplier * 100)}%`);
  if (entry.bonusPercent !== null && entry.bonusPercent > 0) parts.push(`bônus +${Math.round(entry.bonusPercent * 100)}%`);
  const c = entry.components || {};
  if (Number(c.completionXp) > 0) parts.push(`conclusão ${Math.round(c.completionXp)}`);
  if (Number(c.setXp) > 0) parts.push(`séries ${Math.round(c.setXp)}`);
  if (Number(c.performanceXp) > 0) parts.push(`performance ${Math.round(c.performanceXp)}`);
  if (Number(c.secondaryBase) > 0) parts.push(`secundário ${Math.round(c.secondaryBase)}`);
  if (entry.role === "secondary") parts.push("atributo secundário");
  if (entry.note) parts.push(entry.note);
  return parts.join(" • ") || "XP aplicado diretamente";
}

function renderBalanceAuditPanel() {
  const listEl = document.getElementById("balanceAuditList");
  const totalEl = document.getElementById("balanceAuditTotal");
  const countEl = document.getElementById("balanceAuditCount");
  const attributesEl = document.getElementById("balanceAuditAttributes");
  if (!listEl || !totalEl || !countEl || !attributesEl) return;

  const log = loadBalanceAuditLog();
  const summary = getBalanceAuditSummary(log);
  totalEl.textContent = `${summary.total.toLocaleString("pt-BR")} XP`;
  countEl.textContent = `${summary.count} eventos`;
  attributesEl.innerHTML = Object.entries(summary.byAttribute)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `<span><strong>${ATTRIBUTES[key]?.name || key}</strong>${value.toLocaleString("pt-BR")} XP</span>`)
    .join("") || `<span class="balance-audit-empty-inline">Nenhum XP registrado ainda.</span>`;

  listEl.innerHTML = log.slice(0, 80).map((entry) => {
    const time = new Date(entry.timestamp);
    const dateLabel = Number.isNaN(time.getTime()) ? "" : time.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    return `<article class="balance-audit-entry">
      <div class="balance-audit-entry-main">
        <div><strong>${escapeHtml(entry.source || "XP")}</strong><small>${escapeHtml(ATTRIBUTES[entry.attributeKey]?.name || entry.attributeKey)}${entry.role === "secondary" ? " • secundário" : ""}</small></div>
        <b>+${Number(entry.xp || 0).toLocaleString("pt-BR")} XP</b>
      </div>
      <p>${escapeHtml(formatAuditComponents(entry))}</p>
      <time>${escapeHtml(dateLabel)}</time>
    </article>`;
  }).join("") || `<div class="balance-audit-empty"><strong>Ainda não há eventos</strong><p>Registre um treino, cardio, refeição ou resgate uma missão para ver a decomposição do XP aqui.</p></div>`;
}

function openBalanceAuditPanel() {
  const overlay = document.getElementById("balanceAuditOverlay");
  if (!overlay) return;
  renderBalanceAuditPanel();
  overlay.hidden = false;
  document.body.classList.add("modal-open");
}

function closeBalanceAuditPanel() {
  const overlay = document.getElementById("balanceAuditOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove("modal-open");
}

function exportBalanceAuditLog() {
  const payload = {
    generatedAt: new Date().toISOString(),
    appVersion: typeof APP_VERSION !== "undefined" ? APP_VERSION : "",
    balance: typeof BALANCE !== "undefined" ? BALANCE : null,
    summary: getBalanceAuditSummary(),
    events: loadBalanceAuditLog()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rpg-gym-auditoria-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("openBalanceAudit")?.addEventListener("click", openBalanceAuditPanel);
  document.getElementById("closeBalanceAudit")?.addEventListener("click", closeBalanceAuditPanel);
  document.getElementById("balanceAuditOverlay")?.addEventListener("click", (event) => {
    if (event.target?.id === "balanceAuditOverlay") closeBalanceAuditPanel();
  });
  document.getElementById("clearBalanceAudit")?.addEventListener("click", () => {
    if (window.confirm("Apagar somente o histórico de auditoria de XP? Isso não altera o progresso do jogador.")) clearBalanceAuditLog();
  });
  document.getElementById("exportBalanceAudit")?.addEventListener("click", exportBalanceAuditLog);
});

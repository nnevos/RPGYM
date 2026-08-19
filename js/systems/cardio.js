"use strict";

function updateTimeLabels() {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  const nextWeek = nextMonday(now);
  const dailyText = `Renova em ${formatCountdown(tomorrow - now)}`;
  const weeklyText = `Renova em ${formatCountdown(nextWeek - now)}`;

  setText("dailyResetLabel", dailyText);
  setText("dailyCountdown", dailyText);
  setText("weeklyCountdown", weeklyText);
}

function formatDecimal(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function formatCardioDuration(ms) {
  const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


function parseCardioDurationInput(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  if (/^\d+(?:[.,]\d+)?$/.test(text)) return Math.max(0, Number(text.replace(",", ".")) * 60);
  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
  if (parts.length === 2) return (parts[0] * 60) + Math.min(59, parts[1]);
  if (parts.length === 3) return (parts[0] * 3600) + (Math.min(59, parts[1]) * 60) + Math.min(59, parts[2]);
  return 0;
}

function applyManualCardioDuration(rawValue) {
  if (!pendingCardioRecord) return false;
  const seconds = parseCardioDurationInput(rawValue);
  if (!(seconds > 0) || seconds > 24 * 3600) return false;
  cardioTimerElapsedMs = Math.round(seconds * 1000);
  cardioTimerStartedAt = null;
  cardioTimerPaused = true;
  pendingCardioRecord.minutes = seconds / 60;
  setText("cardioConfirmTime", formatCardioDuration(cardioTimerElapsedMs));
  updateCardioTimerDisplay();
  return true;
}

function getCardioCalculatedMetrics(options = {}) {
  const minutes = Math.max(0, Number(options.minutes) || 0);
  const distanceKm = Math.max(0, Number(options.distance) || 0);
  const distanceMeters = Math.max(0, Number(options.distanceMeters) || 0);
  const metrics = {};
  if (minutes > 0 && distanceKm > 0) metrics.speedKmh = distanceKm / (minutes / 60);
  if (minutes > 0 && distanceMeters > 0) metrics.speedKmh = (distanceMeters / 1000) / (minutes / 60);
  if (minutes > 0 && Number(options.floors) > 0) metrics.floorsPerMinute = Number(options.floors) / minutes;
  if (minutes > 0 && Number(options.jumps) > 0) metrics.jumpsPerMinute = Number(options.jumps) / minutes;
  return metrics;
}

function getCardioDerivedMetric(options) {
  const minutes = Number(options.minutes) || 0;
  const distance = Number(options.distance) || 0;
  const distanceMeters = Number(options.distanceMeters) || 0;
  if (["outdoor_run", "treadmill"].includes(options.type) && distance > 0 && minutes > 0) {
    const speed = distance / (minutes / 60);
    const pace = minutes / distance;
    const whole = Math.floor(pace);
    let seconds = Math.round((pace - whole) * 60);
    let paceMinutes = whole;
    if (seconds === 60) { paceMinutes += 1; seconds = 0; }
    const paceText = `${paceMinutes}:${String(seconds).padStart(2, "0")} min/km`;
    return `${formatDecimal(speed, 1)} km/h méd. • ${paceText}`;
  }
  if (["stationary_bike", "outdoor_bike", "elliptical"].includes(options.type) && distance > 0 && minutes > 0) {
    return `${formatDecimal(distance / (minutes / 60), 1)} km/h méd.`;
  }
  if (options.type === "rowing" && distanceMeters > 0 && minutes > 0) {
    const splitMinutes = minutes / (distanceMeters / 500);
    const whole = Math.floor(splitMinutes);
    let seconds = Math.round((splitMinutes - whole) * 60);
    let splitWhole = whole;
    if (seconds === 60) { splitWhole += 1; seconds = 0; }
    return `${splitWhole}:${String(seconds).padStart(2, "0")} /500m`;
  }
  if (options.type === "swimming" && distanceMeters > 0 && minutes > 0) {
    const pace100 = minutes / (distanceMeters / 100);
    const whole = Math.floor(pace100);
    let seconds = Math.round((pace100 - whole) * 60);
    let paceWhole = whole;
    if (seconds === 60) { paceWhole += 1; seconds = 0; }
    return `${paceWhole}:${String(seconds).padStart(2, "0")} /100m`;
  }
  if (options.type === "stair_climber" && Number(options.floors) > 0 && minutes > 0) return `${formatDecimal(Number(options.floors) / minutes, 1)} andares/min`;
  if (options.type === "jump_rope" && Number(options.jumps) > 0 && minutes > 0) return `${formatDecimal(Number(options.jumps) / minutes, 0)} saltos/min`;
  return "";
}

function renderCardioConfirmationFields() {
  const container = document.getElementById("cardioConfirmFields");
  if (!container || !pendingCardioRecord) return;
  const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
  container.innerHTML = `
    <label class="cardio-confirm-field cardio-time-edit-field">
      <span>Tempo total <small>(editável)</small></span>
      <div class="cardio-input-unit">
        <input data-cardio-duration type="text" inputmode="numeric" autocomplete="off" value="${escapeHtml(formatCardioDuration(cardioTimerElapsedMs))}" placeholder="00:30:00" aria-label="Tempo total do cardio">
        <small>hh:mm:ss</small>
      </div>
    </label>` + config.fields.map((field) => `
    <label class="cardio-confirm-field">
      <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
      <div class="cardio-input-unit">
        <input data-cardio-field="${escapeHtml(field.key)}" type="number" inputmode="decimal" min="${field.min ?? 0}" ${field.max != null ? `max="${field.max}"` : ""} step="${field.step ?? 1}" placeholder="0" ${field.required ? "required" : ""}>
        <small>${escapeHtml(field.unit)}</small>
      </div>
    </label>`).join("");

  const durationInput = container.querySelector("[data-cardio-duration]");
  durationInput?.addEventListener("change", () => {
    if (!applyManualCardioDuration(durationInput.value)) {
      durationInput.value = formatCardioDuration(cardioTimerElapsedMs);
      showToast("Tempo inválido", "Use MM:SS ou HH:MM:SS, com no máximo 24 horas.", "!");
      return;
    }
    durationInput.value = formatCardioDuration(cardioTimerElapsedMs);
    updateCardioConfirmationSummary();
  });

  container.querySelectorAll("[data-cardio-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const value = Math.max(0, Number(input.value) || 0);
      pendingCardioRecord.values[input.dataset.cardioField] = value;
      updateCardioConfirmationSummary();
    });
  });
}

function updateCardioConfirmationSummary() {
  if (!pendingCardioRecord) return;
  const options = readActivityOptions("cardio");
  const calculation = calculateActivityXp("cardio", options);
  const awardText = Array.isArray(calculation.awards) && calculation.awards.length > 1
    ? calculation.awards.map((award) => `${ATTRIBUTES[award.attributeKey].name} +${formatNumber(award.xp)}`).join(" • ")
    : `${formatNumber(calculation.xp)} XP`;
  setText("cardioConfirmXp", awardText);
  const derived = getCardioDerivedMetric(options);
  const note = document.getElementById("cardioConfirmNote");
  if (note) {
    const parts = [];
    if (derived) parts.push(`Calculado automaticamente: ${derived}.`);
    if (Array.isArray(calculation.awards) && calculation.awards.length > 1) parts.push("Esta sessão gera XP em mais de um atributo porque combina endurance com uma característica secundária mensurável.");
    if (calculation.performance?.isPr) parts.push(`${calculation.performance.label}: novo recorde pessoal (+${BALANCE.cardio.performanceBonus} XP base).`);
    else if (calculation.performance?.label === "Referência inicial") parts.push("Esta sessão cria sua primeira referência de performance para este cardio.");
    if ((calculation.categoryMultiplier || 1) < 1) parts.push(`Sessão repetida hoje: ${Math.round(calculation.categoryMultiplier * 100)}% do XP da categoria.`);
    note.textContent = parts.join(" ") || "Preencha os dados da máquina ou atividade para concluir o registro.";
  }
}

function validateCardioConfirmation() {
  if (!pendingCardioRecord) return false;
  const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
  const durationInput = document.querySelector("[data-cardio-duration]");
  if (durationInput && !applyManualCardioDuration(durationInput.value)) {
    durationInput.focus();
    showToast("Tempo inválido", "Informe um tempo maior que zero em MM:SS ou HH:MM:SS.", "!");
    return false;
  }
  for (const field of config.fields) {
    const value = Number(pendingCardioRecord.values[field.key]) || 0;
    if (field.required && !(value > 0)) {
      const input = document.querySelector(`[data-cardio-field="${field.key}"]`);
      input?.focus();
      showToast("Dado necessário", `Informe ${field.label.toLowerCase()} para concluir o registro.`, "!");
      return false;
    }
    if (field.max != null && value > Number(field.max)) {
      const input = document.querySelector(`[data-cardio-field="${field.key}"]`);
      input?.focus();
      showToast("Valor fora do limite", `${field.label} está acima do limite aceito para este registro.`, "!");
      return false;
    }
  }

  const options = readActivityOptions("cardio");
  const metrics = getCardioCalculatedMetrics(options);
  const limits = config.limits || {};
  if (limits.maxSpeedKmh && metrics.speedKmh > limits.maxSpeedKmh) {
    showToast("Velocidade incompatível", `Distância e tempo resultam em ${formatDecimal(metrics.speedKmh, 1)} km/h. Revise os dados da sessão.`, "!");
    durationInput?.focus();
    return false;
  }
  if (limits.maxFloorsPerMinute && metrics.floorsPerMinute > limits.maxFloorsPerMinute) {
    showToast("Ritmo incompatível", `O registro resulta em ${formatDecimal(metrics.floorsPerMinute, 1)} andares/min. Revise tempo ou andares.`, "!");
    return false;
  }
  if (limits.maxJumpsPerMinute && metrics.jumpsPerMinute > limits.maxJumpsPerMinute) {
    showToast("Cadência incompatível", `O registro resulta em ${formatDecimal(metrics.jumpsPerMinute, 0)} saltos/min. Revise tempo ou saltos.`, "!");
    return false;
  }
  if (limits.maxRpm && Number(options.rpm) > limits.maxRpm) {
    showToast("Cadência incompatível", `A cadência informada está acima de ${limits.maxRpm} RPM.`, "!");
    return false;
  }
  return true;
}

function startCardioTimer() {
  pendingCardioRecord = { type: document.getElementById("cardioMode")?.value || "treadmill", values: {}, minutes: 0 };
  if (cardioTimerInterval) {
    window.clearInterval(cardioTimerInterval);
  }

  cardioTimerElapsedMs = 0;
  cardioTimerPaused = false;
  cardioTimerStartedAt = Date.now();
  toggleCardioPanels(true);
  updateCardioTimerDisplay();
  setText("cardioTimerState", "Cardio em andamento");
  cardioTimerInterval = window.setInterval(updateCardioTimerDisplay, 250);
}

function pauseResumeCardioTimer() {
  if (cardioTimerElapsedMs <= 0 && !cardioTimerStartedAt) return;

  if (cardioTimerPaused) {
    cardioTimerPaused = false;
    cardioTimerStartedAt = Date.now();
    setText("cardioTimerState", "Cardio em andamento");
    const button = document.getElementById("cardioPauseButton");
    if (button) button.setAttribute("aria-label", "Pausar cardio");
    if (!cardioTimerInterval) cardioTimerInterval = window.setInterval(updateCardioTimerDisplay, 250);
  } else {
    cardioTimerElapsedMs += Date.now() - cardioTimerStartedAt;
    cardioTimerPaused = true;
    cardioTimerStartedAt = null;
    setText("cardioTimerState", "Pausado");
    const button = document.getElementById("cardioPauseButton");
    if (button) button.setAttribute("aria-label", "Continuar cardio");
  }
  updateCardioTimerDisplay();
}

function getCurrentCardioElapsedMs() {
  if (!cardioTimerStartedAt) return cardioTimerElapsedMs;
  return cardioTimerElapsedMs + (Date.now() - cardioTimerStartedAt);
}

function updateCardioTimerDisplay() {
  const elapsed = Math.max(0, getCurrentCardioElapsedMs());
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  setText(
    "cardioTimerDisplay",
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  );
}

function stopCardioTimer() {
  if (!cardioTimerStartedAt && cardioTimerElapsedMs <= 0) return;

  if (cardioTimerStartedAt) {
    cardioTimerElapsedMs += Date.now() - cardioTimerStartedAt;
    cardioTimerStartedAt = null;
  }
  cardioTimerPaused = true;
  if (cardioTimerInterval) {
    window.clearInterval(cardioTimerInterval);
    cardioTimerInterval = null;
  }
  updateCardioTimerDisplay();
  if (!pendingCardioRecord) pendingCardioRecord = { type: document.getElementById("cardioMode")?.value || "treadmill", values: {} };
  pendingCardioRecord.minutes = Math.max(1 / 60, cardioTimerElapsedMs / 60000);
  openCardioConfirmation();
}

function openCardioConfirmation() {
  if (!pendingCardioRecord) return;
  const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
  setText("cardioConfirmType", config.label);
  setText("cardioConfirmTime", formatCardioDuration(cardioTimerElapsedMs));
  renderCardioConfirmationFields();
  updateCardioConfirmationSummary();
  const overlay = document.getElementById("cardioConfirmOverlay");
  if (overlay) overlay.hidden = false;
}

function closeCardioConfirmation(resetTimer = false) {
  const overlay = document.getElementById("cardioConfirmOverlay");
  if (overlay) overlay.hidden = true;
  if (resetTimer) resetCardioTimer();
}

function confirmTimedCardio() {
  const confirmButton = document.getElementById("cardioContinueConfirm");
  if (confirmButton?.disabled) return;
  if (!validateCardioConfirmation()) return;
  if (confirmButton) { confirmButton.disabled = true; confirmButton.setAttribute("aria-busy", "true"); }
  closeCardioConfirmation(false);
  const result = registerActivity("cardio", { deferPresentation: true });
  if (result) showCardioResult(result);
  resetCardioTimer();
  if (confirmButton) { confirmButton.disabled = false; confirmButton.removeAttribute("aria-busy"); }
}

function showCardioResult(result) {
  const overlay = document.getElementById("cardioResultOverlay");
  if (!overlay) return;
  cardioResultContext = result;
  const { calculation, xpAwards, historyEntry, beforeAttributes } = result;
  setText("cardioResultTitle", historyEntry.activityName || "Cardio concluído");
  setText("cardioResultTotalXp", `+${formatNumber(calculation.xp)} XP`);
  const performance = document.getElementById("cardioResultPerformance");
  if (performance) {
    if (calculation.performance?.isPr) performance.textContent = `${calculation.performance.label} • novo PR`;
    else if (calculation.performance?.label === "Referência inicial") performance.textContent = "Primeira referência de performance registrada";
    else performance.textContent = "Endurance e performance registrados";
  }
  const awards = document.getElementById("cardioResultAwards");
  if (awards) awards.innerHTML = xpAwards.map((award) => {
    const definition = ATTRIBUTES[award.attributeKey];
    const attribute = state.attributes[award.attributeKey];
    const needed = attribute.level >= MAX_LEVEL ? 0 : calculateRequiredXP(attribute.level);
    const pct = attribute.level >= MAX_LEVEL ? 100 : clamp((attribute.xp / needed) * 100, 0, 100);
    const before = beforeAttributes?.[award.attributeKey];
    const levelUp = before && attribute.level > before.level ? `<em>Level up ${before.level} → ${attribute.level}</em>` : `<em>${award.role === "secondary" ? "XP secundário por performance" : "XP principal da sessão"}</em>`;
    const remaining = attribute.level >= MAX_LEVEL ? 0 : Math.max(0, needed - attribute.xp);
    const near = attribute.level < MAX_LEVEL && remaining <= Math.max(80, needed * .18) ? `<small>Faltam ${formatNumber(Math.ceil(remaining))} XP para Nv. ${attribute.level + 1}</small>` : `<small>${attribute.level >= MAX_LEVEL ? "Nível máximo" : `${formatNumber(attribute.xp)} / ${formatNumber(needed)} XP`}</small>`;
    return `<article style="--attribute-color:${definition.chartColor}"><div><span>${escapeHtml(definition.name)}</span><strong>+${formatNumber(award.xp)} XP</strong></div>${levelUp}<i><b style="width:${pct}%"></b></i>${near}</article>`;
  }).join("");
  const metrics = document.getElementById("cardioResultMetrics");
  if (metrics) {
    const data = historyEntry.cardioData || {};
    const values = data.values || data;
    const items = [["Tempo", formatCardioDuration((Number(data.minutes)||0)*60000)]];
    if (Number(values.distance)>0) items.push(["Distância", `${formatDecimal(values.distance,2)} km`]);
    if (Number(values.distanceMeters)>0) items.push(["Distância", `${formatNumber(Math.round(values.distanceMeters))} m`]);
    if (Number(values.speed)>0) items.push(["Velocidade", `${formatDecimal(values.speed,1)} km/h`]);
    if (Number(values.rpm)>0) items.push(["Cadência", `${formatDecimal(values.rpm,0)} RPM`]);
    if (Number(values.floors)>0) items.push(["Escada", `${formatNumber(Math.round(values.floors))} andares`]);
    if (Number(values.jumps)>0) items.push(["Corda", `${formatNumber(Math.round(values.jumps))} saltos`]);
    const derived = getCardioDerivedMetric(data);
    if (derived) items.push(["Performance", derived]);
    metrics.innerHTML = items.slice(0,4).map(([label,value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join("");
  }
  overlay.hidden = false;
  document.body.classList.add("modal-open");
}

function closeCardioResult() {
  const overlay = document.getElementById("cardioResultOverlay");
  if (overlay) overlay.hidden = true;
  document.body.classList.remove("modal-open");
  const result = cardioResultContext;
  cardioResultContext = null;
  if (!result) return;
  if (result.streakUpdate?.changed) showToast(result.streakUpdate.reset ? "Novo streak iniciado" : "Streak aumentado", `Sequência atual: ${formatDays(state.streak.current)}.`, "🔥");
  result.newlyCompletedMissions?.forEach((mission) => showToast("Missão concluída", `${mission.name} está pronta para resgate.`, "✦"));
  presentProgressEvents(result.progressEvents || []);
}


function resetCardioTimer() {
  if (cardioTimerInterval) window.clearInterval(cardioTimerInterval);
  cardioTimerInterval = null;
  cardioTimerStartedAt = null;
  cardioTimerElapsedMs = 0;
  cardioTimerPaused = false;
  pendingCardioRecord = null;
  setText("cardioTimerDisplay", "00:00:00");
  setText("cardioTimerState", "Cardio em andamento");
  const button = document.getElementById("cardioPauseButton");
  if (button) button.setAttribute("aria-label", "Pausar cardio");
  toggleCardioPanels(false);
  if (typeof renderLiveSessionIndicators === "function") renderLiveSessionIndicators();
}

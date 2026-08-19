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

function getCardioDerivedMetric(options) {
  const minutes = Number(options.minutes) || 0;
  const distance = Number(options.distance) || 0;
  const distanceMeters = Number(options.distanceMeters) || 0;
  if ((options.type === "outdoor_run" || options.type === "treadmill") && distance > 0 && minutes > 0) {
    const pace = minutes / distance;
    const whole = Math.floor(pace);
    const seconds = Math.round((pace - whole) * 60);
    return `${whole}:${String(seconds).padStart(2, "0")} min/km`;
  }
  if (options.type === "outdoor_bike" && distance > 0 && minutes > 0) {
    return `${formatDecimal(distance / (minutes / 60), 1)} km/h méd.`;
  }
  if (options.type === "rowing" && distanceMeters > 0 && minutes > 0) {
    const splitMinutes = minutes / (distanceMeters / 500);
    const whole = Math.floor(splitMinutes);
    const seconds = Math.round((splitMinutes - whole) * 60);
    return `${whole}:${String(seconds).padStart(2, "0")} /500m`;
  }
  return "";
}

function renderCardioConfirmationFields() {
  const container = document.getElementById("cardioConfirmFields");
  if (!container || !pendingCardioRecord) return;
  const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
  container.innerHTML = config.fields.map((field) => `
    <label class="cardio-confirm-field">
      <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
      <div class="cardio-input-unit">
        <input data-cardio-field="${escapeHtml(field.key)}" type="number" inputmode="decimal" min="${field.min ?? 0}" step="${field.step ?? 1}" placeholder="0" ${field.required ? "required" : ""}>
        <small>${escapeHtml(field.unit)}</small>
      </div>
    </label>`).join("");
  container.querySelectorAll("[data-cardio-field]").forEach((input) => {
    input.addEventListener("input", () => {
      pendingCardioRecord.values[input.dataset.cardioField] = Math.max(0, Number(input.value) || 0);
      updateCardioConfirmationSummary();
    });
  });
}

function updateCardioConfirmationSummary() {
  if (!pendingCardioRecord) return;
  const options = readActivityOptions("cardio");
  const calculation = calculateActivityXp("cardio", options);
  setText("cardioConfirmXp", `${formatNumber(calculation.xp)} XP`);
  const derived = getCardioDerivedMetric(options);
  const note = document.getElementById("cardioConfirmNote");
  if (note) {
    const parts = [];
    if (derived) parts.push(`Calculado automaticamente: ${derived}.`);
    if (calculation.performance?.isPr) parts.push(`${calculation.performance.label}: novo recorde pessoal (+${BALANCE.cardio.performanceBonus} XP base).`);
    else if (calculation.performance?.label === "Referência inicial") parts.push("Esta sessão cria sua primeira referência de performance para este cardio.");
    if ((calculation.categoryMultiplier || 1) < 1) parts.push(`Sessão repetida hoje: ${Math.round(calculation.categoryMultiplier * 100)}% do XP da categoria.`);
    note.textContent = parts.join(" ") || "Preencha os dados da máquina ou atividade para concluir o registro.";
  }
}

function validateCardioConfirmation() {
  if (!pendingCardioRecord) return false;
  const config = CARDIO_TYPES[pendingCardioRecord.type] || CARDIO_TYPES.treadmill;
  for (const field of config.fields) {
    if (field.required && !(Number(pendingCardioRecord.values[field.key]) > 0)) {
      const input = document.querySelector(`[data-cardio-field="${field.key}"]`);
      input?.focus();
      showToast("Dado necessário", `Informe ${field.label.toLowerCase()} para concluir o registro.`, "!");
      return false;
    }
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
  if (!validateCardioConfirmation()) return;
  closeCardioConfirmation(false);
  registerActivity("cardio");
  showToast(
    "Cardio finalizado!",
    "Tempo e dados da atividade foram adicionados ao histórico.",
    "✓"
  );
  resetCardioTimer();
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
}

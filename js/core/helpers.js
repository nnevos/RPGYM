"use strict";

function getEntriesForDate(dateKey) {
  return state.history.filter(
    (entry) => (!entry.kind || entry.kind === "activity") && entry.dateKey === dateKey
  );
}

function getCurrentWeekDays() {
  const start = dateFromKey(weekStartKey());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function weekStartKey(date = new Date()) {
  const normalized = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12
  );
  const dayIndex = (normalized.getDay() + 6) % 7;
  normalized.setDate(normalized.getDate() - dayIndex);
  return localDateKey(normalized);
}

function nextMonday(date = new Date()) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
  const daysUntilMonday = ((8 - result.getDay()) % 7) || 7;
  result.setDate(result.getDate() + daysUntilMonday);
  return result;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey) {
  const [year, month, day] = String(dateKey)
    .split("-")
    .map((value) => Number(value));
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function daysBetweenDateKeys(fromKey, toKey) {
  const from = dateFromKey(fromKey);
  const to = dateFromKey(toKey);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function formatHistoryDate(date, dateKey) {
  const today = localDateKey();
  const yesterday = localDateKey(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1)
  );
  const time = timeFormatter.format(date);

  if (dateKey === today) {
    return `Hoje, ${time}`;
  }
  if (dateKey === yesterday) {
    return `Ontem, ${time}`;
  }
  return `${shortDateFormatter.format(date)}, ${time}`;
}

function formatCountdown(milliseconds) {
  const safeMs = Math.max(0, milliseconds);
  const totalMinutes = Math.ceil(safeMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

function formatMultiplier(multiplier) {
  return `${Number(multiplier).toFixed(1).replace(".", ",")}x`;
}

function formatNumber(value) {
  return numberFormatter.format(Math.round(Number(value) || 0));
}

function formatDays(days) {
  return `${days} ${pluralize(days, "dia", "dias")}`;
}

function pluralize(value, singular, plural) {
  return Number(value) === 1 ? singular : plural;
}

function romanNumeral(value) {
  return ["", "I", "II", "III", "IV", "V"][clampInteger(value, 0, 5)] || "";
}

function getInitials(name) {
  const parts = String(name || "Jogador")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "JG";
  }

  const first = parts[0][0] || "J";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || "G";
  return `${first}${second}`.toUpperCase();
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function clampInteger(value, minimum, maximum) {
  return Math.trunc(clamp(value, minimum, maximum));
}

function capitalizeFirst(value) {
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.value = String(value ?? "");
  }
}

function setProgress(trackId, barId, percentage) {
  const track = document.getElementById(trackId);
  const bar = document.getElementById(barId);
  const value = clamp(percentage, 0, 100);

  if (track) {
    track.setAttribute("aria-valuenow", String(Math.round(value)));
  }
  if (bar) {
    bar.style.width = `${value}%`;
  }
}

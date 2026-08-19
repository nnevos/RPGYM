"use strict";

function calculateRequiredXP(level) {
  if (level >= MAX_LEVEL) {
    return 0;
  }
  return Math.ceil(BALANCE.levelCurve.base * Math.pow(level, BALANCE.levelCurve.exponent));
}

function getGlobalLevelAttributeKeys() {
  const configured = BALANCE.globalLevel?.activeAttributes;
  return Array.isArray(configured) && configured.length
    ? configured.filter((key) => state.attributes[key])
    : Object.keys(ATTRIBUTES);
}

function calculateGlobalLevel() {
  const keys = getGlobalLevelAttributeKeys();
  const totalLevels = keys.reduce((sum, key) => sum + state.attributes[key].level, 0);
  return Math.min(MAX_LEVEL, Math.ceil(totalLevels / Math.max(1, keys.length)));
}

function calculateJourneyPercent() {
  const keys = getGlobalLevelAttributeKeys();
  const totalProgress = keys.reduce((sum, key) => {
    const attribute = state.attributes[key];
    if (attribute.level >= MAX_LEVEL) {
      return sum + (MAX_LEVEL - 1);
    }

    const requiredXp = calculateRequiredXP(attribute.level);
    const fractionalLevel = requiredXp > 0 ? attribute.xp / requiredXp : 0;
    return sum + (attribute.level - 1) + fractionalLevel;
  }, 0);

  const maximumProgress = (MAX_LEVEL - 1) * keys.length;
  return maximumProgress > 0
    ? Math.min(100, Math.max(0, (totalProgress / maximumProgress) * 100))
    : 0;
}

function syncDerivedState() {
  Object.keys(ATTRIBUTES).forEach((attributeKey) => {
    const attribute = state.attributes[attributeKey];
    attribute.level = clampInteger(attribute.level, 1, MAX_LEVEL);

    if (attribute.level >= MAX_LEVEL) {
      attribute.xp = 0;
    } else {
      attribute.xp = Math.max(0, Number(attribute.xp) || 0);
    }

    attribute.milestones = MILESTONE_LEVELS.filter(
      (milestone) => milestone <= attribute.level
    );
    attribute.classStage = Math.min(5, Math.floor(attribute.level / 10));
  });

  state.player.globalLevel = calculateGlobalLevel();
  state.player.title = getCurrentGlobalTitle();
}

function getCardioAffinities(type) {
  const config = CARDIO_TYPES[type] || CARDIO_TYPES.treadmill;
  const affinities = config.affinities || { primary: config.attribute || "constitution" };
  return {
    primary: affinities.primary || config.attribute || "constitution",
    secondary: affinities.secondary || null
  };
}

function getActivityAttribute(activityId, options = {}) {
  if (activityId === "cardio") {
    return getCardioAffinities(options.type).primary || options.mode || "constitution";
  }
  return ACTIVITIES[activityId]?.attribute || "constitution";
}

function isCardioSecondaryEligible(type, options = {}) {
  const secondary = getCardioAffinities(type).secondary;
  if (!secondary) return false;
  const rule = secondary.eligibility || {};
  const minutes = Math.max(0, Number(options.minutes) || 0);
  const distance = Math.max(0, Number(options.distance) || 0);
  const distanceMeters = Math.max(0, Number(options.distanceMeters) || 0);
  const suppliedSpeed = Math.max(0, Number(options.speed) || 0);
  const derivedSpeed = distance > 0 && minutes > 0 ? distance / (minutes / 60) : 0;
  const speed = suppliedSpeed || derivedSpeed;
  const rpm = Math.max(0, Number(options.rpm) || 0);
  if (rule.minMinutes && minutes < rule.minMinutes) return false;
  if (rule.minSpeedKmh && speed < rule.minSpeedKmh) return false;
  if (rule.minRpm && rpm < rule.minRpm) return false;
  if (rule.minDistanceMeters && distanceMeters < rule.minDistanceMeters) return false;
  return true;
}

function getXpBonusBreakdown(attributeKey, activity) {
  const attribute = state.attributes[attributeKey];
  const breakdown = [];
  const levelBonus = Math.min(BALANCE.bonuses.levelCap, attribute.level * BALANCE.bonuses.levelPerLevel);
  if (levelBonus > 0) breakdown.push({ label: `Nível de ${ATTRIBUTES[attributeKey].name}`, value: levelBonus });
  const classBonus = getClassBonus(attributeKey);
  if (classBonus > 0) breakdown.push({ label: ATTRIBUTES[attributeKey].className, value: classBonus });
  const intelligenceHabitBonus = getIntelligenceHabitBonus(activity);
  if (intelligenceHabitBonus > 0) breakdown.push({ label: "Mago mestre", value: intelligenceHabitBonus });
  getActiveBuffs().forEach((buff) => breakdown.push({ label: buff.source || "Buff semanal", value: Math.max(0, Number(buff.multiplier) - 1) }));
  const rawBonus = breakdown.reduce((sum, item) => sum + item.value, 0);
  const appliedBonus = Math.min(BALANCE.bonuses.totalCap, rawBonus);
  return { breakdown, rawBonus, appliedBonus, capped: rawBonus > BALANCE.bonuses.totalCap };
}


function getSameCategoryDailyMultiplier(category, date = new Date()) {
  const dateKey = localDateKey(date);
  let previousCount = 0;

  if (category === "workout") {
    previousCount = (state.workouts?.sessions || []).filter((session) => {
      const stamp = session?.finishedAt || session?.startedAt;
      return stamp && localDateKey(new Date(stamp)) === dateKey;
    }).length;
  } else if (category === "cardio") {
    previousCount = (state.history || []).filter((entry) => {
      if (!entry || (entry.activityId !== "cardio" && !entry.cardioData)) return false;
      const key = entry.dateKey || (entry.timestamp ? localDateKey(new Date(entry.timestamp)) : "");
      return key === dateKey;
    }).length;
  }

  const configured = BALANCE.antiFarm.sameCategoryDailyMultipliers || [1, 0.75, 0.5];
  if (previousCount < configured.length) return configured[previousCount];
  return BALANCE.antiFarm.fourthPlusSameCategoryMultiplier ?? configured[configured.length - 1] ?? 0.4;
}

function getCardioPerformanceValue(type, data = {}) {
  const minutes = Math.max(0, Number(data.minutes) || 0);
  const distanceKm = Math.max(0, Number(data.distance) || 0);
  const distanceMeters = Math.max(0, Number(data.distanceMeters) || 0);

  switch (type) {
    case "treadmill":
    case "outdoor_run":
      if (minutes >= 5 && distanceKm >= 1) return { key: "pace", value: minutes / distanceKm, lowerIsBetter: true, label: "Melhor ritmo" };
      break;
    case "stationary_bike":
    case "outdoor_bike":
    case "elliptical":
      if (minutes >= 5 && distanceKm > 0) return { key: "speed", value: distanceKm / (minutes / 60), lowerIsBetter: false, label: "Melhor velocidade média" };
      break;
    case "stair_climber": {
      const floors = Math.max(0, Number(data.floors) || 0);
      if (minutes >= 5 && floors > 0) return { key: "floorsPerMinute", value: floors / minutes, lowerIsBetter: false, label: "Melhor ritmo na escada" };
      break;
    }
    case "rowing":
      if (minutes > 0 && distanceMeters >= 500) return { key: "split500", value: minutes / (distanceMeters / 500), lowerIsBetter: true, label: "Melhor ritmo /500 m" };
      break;
    case "jump_rope": {
      const jumps = Math.max(0, Number(data.jumps) || 0);
      if (minutes >= 3 && jumps > 0) return { key: "jumpsPerMinute", value: jumps / minutes, lowerIsBetter: false, label: "Melhor cadência na corda" };
      break;
    }
    case "swimming":
      if (minutes > 0 && distanceMeters >= 100) return { key: "pace100", value: minutes / (distanceMeters / 100), lowerIsBetter: true, label: "Melhor ritmo /100 m" };
      break;
  }
  return null;
}

function evaluateCardioPerformance(options = {}) {
  const current = getCardioPerformanceValue(options.type, options);
  if (!current) return { isPr: false, bonusXp: 0, label: "", current: null, previous: null };

  const previousValues = (state.history || [])
    .filter((entry) => entry && (entry.activityId === "cardio" || entry.cardioData) && entry.cardioData?.type === options.type)
    .map((entry) => getCardioPerformanceValue(options.type, entry.cardioData || {}))
    .filter((metric) => metric && metric.key === current.key)
    .map((metric) => metric.value)
    .filter((value) => Number.isFinite(value) && value > 0);

  // A primeira sessao cria a referencia. PR so passa a existir quando ha um historico para superar.
  if (!previousValues.length) return { isPr: false, bonusXp: 0, label: "Referência inicial", current: current.value, previous: null };

  const previousBest = current.lowerIsBetter ? Math.min(...previousValues) : Math.max(...previousValues);
  const ratio = Math.max(0, Number(BALANCE.cardio.performanceImprovementRatio) || 0);
  const threshold = current.lowerIsBetter ? previousBest * (1 - ratio) : previousBest * (1 + ratio);
  const improved = current.lowerIsBetter ? current.value < threshold : current.value > threshold;

  return {
    isPr: improved,
    bonusXp: improved ? BALANCE.cardio.performanceBonus : 0,
    label: current.label,
    current: current.value,
    previous: previousBest,
    key: current.key
  };
}

function calculateActivityXp(activityId, options = {}) {
  const activity = ACTIVITIES[activityId];
  if (!activity) throw new Error(`Atividade desconhecida: ${activityId}`);

  const attributeKey = getActivityAttribute(activityId, options);
  let baseXp = activity.baseXp;
  let categoryMultiplier = 1;
  let performance = null;
  let awards = null;

  if (activityId === "cardio") {
    const minutes = Math.max(1 / 60, Number(options.minutes) || 1 / 60);
    const distanceKm = Math.max(0, Number(options.distance) || (Number(options.distanceMeters) || 0) / 1000);
    const cfg = BALANCE.cardio;
    const completionRatio = Math.min(1, minutes / Math.max(1, cfg.minMinutesForFullCompletion));
    const completionXp = cfg.completionXp * completionRatio;
    const first30 = Math.min(minutes, 30) * cfg.first30PerMinute;
    const next30 = Math.max(0, Math.min(minutes - 30, 30)) * cfg.minute31to60;
    const after60 = Math.max(0, minutes - 60) * cfg.after60PerMinute;
    const enduranceBase = completionXp + first30 + next30 + after60 + (distanceKm * cfg.distanceBonusPerKm);
    performance = evaluateCardioPerformance(options);
    categoryMultiplier = getSameCategoryDailyMultiplier("cardio");

    const affinities = getCardioAffinities(options.type);
    const primaryBonus = getXpBonusBreakdown(affinities.primary, activity);
    const secondaryEligible = affinities.secondary && isCardioSecondaryEligible(options.type, options);
    const performanceToSecondary = Boolean(secondaryEligible && affinities.secondary.performanceTarget);
    const primaryRaw = (enduranceBase + (performanceToSecondary ? 0 : performance.bonusXp)) * categoryMultiplier;
    const primaryXp = Math.max(1, Math.round(primaryRaw * (1 + primaryBonus.appliedBonus)));

    awards = [{
      attributeKey: affinities.primary, role: "primary", xp: primaryXp,
      baseXp: Math.round(primaryRaw), ...primaryBonus
    }];

    if (secondaryEligible) {
      const ratio = Math.min(BALANCE.cardio.secondaryAttributeMaxRatio ?? 0.30, Math.max(0, Number(affinities.secondary.ratio) || 0));
      const secondaryBaseBeforeMultiplier = (enduranceBase * ratio) + (performanceToSecondary ? performance.bonusXp : 0);
      const secondaryRaw = secondaryBaseBeforeMultiplier * categoryMultiplier;
      const secondaryBonus = getXpBonusBreakdown(affinities.secondary.attribute, activity);
      const secondaryXp = Math.max(1, Math.round(secondaryRaw * (1 + secondaryBonus.appliedBonus)));
      awards.push({
        attributeKey: affinities.secondary.attribute, role: "secondary", xp: secondaryXp,
        baseXp: Math.round(secondaryRaw), ...secondaryBonus
      });
    }

    const totalXp = awards.reduce((sum, award) => sum + award.xp, 0);
    const totalBase = awards.reduce((sum, award) => sum + award.baseXp, 0);
    return {
      xp: totalXp, baseXp: totalBase, rawBonus: primaryBonus.rawBonus, appliedBonus: primaryBonus.appliedBonus,
      capped: awards.some((award) => award.capped), breakdown: primaryBonus.breakdown, attributeKey: affinities.primary,
      categoryMultiplier, performance, awards
    };
  }

  const bonus = getXpBonusBreakdown(attributeKey, activity);
  if (activityId === "heavySet" && options.compound) bonus.breakdown.push({ label: "Exercício composto", value: 0.10 });
  const rawBonus = bonus.breakdown.reduce((sum, item) => sum + item.value, 0);
  const appliedBonus = Math.min(BALANCE.bonuses.totalCap, rawBonus);
  const xp = Math.max(1, Math.round(baseXp * (1 + appliedBonus)));
  return { xp, baseXp, rawBonus, appliedBonus, capped: rawBonus > BALANCE.bonuses.totalCap, breakdown: bonus.breakdown, attributeKey, categoryMultiplier, performance, awards: null };
}

function getClassBonus(attributeKey) {
  const attribute = state.attributes[attributeKey];
  const definition = ATTRIBUTES[attributeKey];
  if (!isClassUnlocked(attributeKey)) return 0;
  let highestClaimed = 0;
  [10, 20, 30, 40, 50].forEach((milestone) => {
    if (isRoadmapChapterClaimed(attributeKey, `${attributeKey}_${milestone}`)) highestClaimed = milestone;
  });
  return BALANCE.bonuses.classByMilestone[highestClaimed] || 0;
}

function getIntelligenceHabitBonus(activity) {
  if (activity.attribute === "intelligence") {
    return 0;
  }

  const intelligence = state.attributes.intelligence;
  return intelligence.level >= 50 && isRoadmapChapterClaimed("intelligence", "intelligence_50") && activity.category === "habit" ? 0.20 : 0;
}

function getActiveBuffs() {
  const now = Date.now();
  return state.buffs.filter(
    (buff) => new Date(buff.expiresAt).getTime() > now
  );
}

function registerActivity(activityId) {
  const activity = ACTIVITIES[activityId];
  if (!activity) {
    showToast("Atividade inválida", "Não foi possível encontrar essa ação.", "⚠");
    return;
  }

  if (activityId === "weeklyStreak") {
    const eligibility = getWeeklyStreakEligibility();
    if (!eligibility.eligible) {
      showToast("Recompensa bloqueada", eligibility.message, "🔒");
      return;
    }
  }

  const options = readActivityOptions(activityId);
  const calculation = calculateActivityXp(activityId, options);
  const now = new Date();
  const effectiveAttribute = calculation.attributeKey || activity.attribute;
  const xpAwards = Array.isArray(calculation.awards) && calculation.awards.length
    ? calculation.awards
    : [{ attributeKey: effectiveAttribute, xp: calculation.xp, role: "primary" }];
  const progressEvents = xpAwards.flatMap((award) => addXP(
    award.attributeKey,
    award.xp,
    activity.name,
    {
      kind: activityId === "cardio" ? "cardio" : (activity.category || "activity"),
      baseXp: award.baseXp ?? calculation.baseXp,
      bonusPercent: award.appliedBonus ?? calculation.appliedBonus,
      categoryMultiplier: calculation.categoryMultiplier || 1,
      role: award.role || "primary",
      components: activityId === "cardio" ? {
        performanceXp: calculation.performance?.bonusXp || 0,
        secondaryBase: award.role === "secondary" ? award.baseXp : 0
      } : null,
      note: calculation.capped ? "bônus limitado pelo cap" : ""
    }
  ));

  const streakUpdate = updateStreak(now);
  progressEvents.push(...awardDailyDetermination(streakUpdate));

  if (activityId === "weeklyStreak") {
    state.streak.lastWeeklyRewardDate = localDateKey(now);
  }

  const details = buildActivityDetails(activityId, options, calculation);
  const historyEntry = {
    id: createId(),
    kind: "activity",
    activityId,
    activityName: activityId === "cardio" ? (CARDIO_TYPES[options.type]?.label || activity.name) : activity.name,
    attribute: effectiveAttribute,
    xp: calculation.xp,
    baseXp: calculation.baseXp,
    bonusPercent: calculation.appliedBonus,
    xpAwards: xpAwards.map((award) => ({ attribute: award.attributeKey, xp: award.xp, role: award.role || "primary" })),
    details,
    ...(activityId === "cardio" ? { cardioData: { ...options }, performance: calculation.performance || null, categoryMultiplier: calculation.categoryMultiplier || 1 } : {}),
    timestamp: now.toISOString(),
    dateKey: localDateKey(now)
  };

  state.history.unshift(historyEntry);
  state.history = state.history.slice(0, 1_000);
  rebuildStatsFromSources();

  const newlyCompletedMissions = refreshMissionProgress();
  syncDerivedState();
  saveGame();
  updateUI();

  const awardSummary = xpAwards.map((award) => `${ATTRIBUTES[award.attributeKey].name} +${formatNumber(award.xp)}`).join(" • ");
  showToast(
    activityId === "cardio" && xpAwards.length > 1 ? `+${formatNumber(calculation.xp)} XP total` : `+${formatNumber(calculation.xp)} XP em ${ATTRIBUTES[effectiveAttribute].name}`,
    activityId === "cardio" && xpAwards.length > 1
      ? awardSummary
      : (calculation.capped ? `${activity.name} registrado. O bônus total atingiu o limite configurado.` : `${activity.name} registrado com sucesso.`),
    activity.icon
  );

  if (streakUpdate.changed) {
    showToast(
      streakUpdate.reset ? "Novo streak iniciado" : "Streak aumentado",
      `Sequência atual: ${state.streak.current} ${pluralize(state.streak.current, "dia", "dias")}.`,
      "🔥"
    );
  }

  newlyCompletedMissions.forEach((mission) => {
    showToast(
      "Missão concluída",
      `${mission.name} está pronta para resgate.`,
      "✦"
    );
  });

  presentProgressEvents(progressEvents);
}

function readActivityOptions(activityId) {
  switch (activityId) {
    case "heavySet":
      return {
        compound: Boolean(document.getElementById("compoundExercise")?.checked)
      };
    case "cardio": {
      const type = pendingCardioRecord?.type || document.getElementById("cardioMode")?.value || "treadmill";
      const config = CARDIO_TYPES[type] || CARDIO_TYPES.treadmill;
      const values = pendingCardioRecord?.values || {};
      const minutes = pendingCardioRecord?.minutes || Math.max(1, getCurrentCardioElapsedMs() / 60000);
      return { type, mode: config.attribute, minutes, ...values };
    }
    case "meal":
      return {
        mealType: document.getElementById("mealType")?.value || "Refeição"
      };
    case "groupTraining":
      return {
        groupName: (document.getElementById("groupName")?.value || "").trim()
      };
    default:
      return {};
  }
}

function buildActivityDetails(activityId, options, calculation) {
  const details = [];

  if (activityId === "heavySet" && options.compound) {
    details.push("Exercício composto");
  }
  if (activityId === "cardio") {
    const config = CARDIO_TYPES[options.type] || CARDIO_TYPES.treadmill;
    details.push(config.label);
    details.push(formatCardioDuration((Number(options.minutes) || 0) * 60000));
    if (Number(options.distance) > 0) details.push(`${formatDecimal(options.distance, 2)} km`);
    if (Number(options.distanceMeters) > 0) details.push(`${formatNumber(Math.round(options.distanceMeters))} m`);
    if (Number(options.speed) > 0) details.push(`${formatDecimal(options.speed, 1)} km/h`);
    if (Number(options.incline) > 0) details.push(`${formatDecimal(options.incline, 1)}% incl.`);
    if (Number(options.resistance) > 0) details.push(`nível ${formatDecimal(options.resistance, 0)}`);
    if (Number(options.rpm) > 0) details.push(`${formatDecimal(options.rpm, 0)} RPM`);
    if (Number(options.floors) > 0) details.push(`${formatNumber(Math.round(options.floors))} andares`);
    if (Number(options.jumps) > 0) details.push(`${formatNumber(Math.round(options.jumps))} saltos`);
    const pace = getCardioDerivedMetric(options);
    if (pace) details.push(pace);
  }
  if (activityId === "meal") {
    details.push(options.mealType);
  }
  if (activityId === "groupTraining" && options.groupName) {
    details.push(options.groupName);
  }
  if (calculation.appliedBonus > 0) {
    details.push(`bônus +${Math.round(calculation.appliedBonus * 100)}%`);
  }

  return details.join(" • ");
}

function addXP(attributeKey, amount, source = "Atividade", auditMetadata = {}) {
  const attribute = state.attributes[attributeKey];
  const definition = ATTRIBUTES[attributeKey];
  const xpAmount = Math.max(0, Math.round(Number(amount) || 0));
  const events = [];

  state.stats.totalXp += xpAmount;

  if (xpAmount > 0 && typeof recordXpAudit === "function" && !auditMetadata.silent) {
    recordXpAudit(attributeKey, xpAmount, source, auditMetadata);
  }

  if (attribute.level >= MAX_LEVEL || xpAmount <= 0) {
    return events;
  }

  attribute.xp += xpAmount;

  while (attribute.level < MAX_LEVEL) {
    const requiredXp = calculateRequiredXP(attribute.level);
    if (attribute.xp < requiredXp) {
      break;
    }

    attribute.xp -= requiredXp;
    attribute.level += 1;
    events.push({
      type: "level",
      attribute: attributeKey,
      level: attribute.level,
      source
    });

    if (MILESTONE_LEVELS.includes(attribute.level)) {
      events.push({
        type: "milestone",
        attribute: attributeKey,
        level: attribute.level
      });
    }

  }

  if (attribute.level >= MAX_LEVEL) {
    attribute.level = MAX_LEVEL;
    attribute.xp = 0;
  }

  syncDerivedState();
  return events;
}

function updateStreak(date = new Date()) {
  const today = localDateKey(date);
  const previousDate = state.streak.lastActiveDate;

  if (previousDate === today) {
    return { changed: false, reset: false };
  }

  let reset = false;
  if (!previousDate) {
    state.streak.current = 1;
    reset = true;
  } else {
    const difference = daysBetweenDateKeys(previousDate, today);
    if (difference === 1) {
      state.streak.current += 1;
    } else {
      state.streak.current = 1;
      reset = true;
    }
  }

  state.streak.lastActiveDate = today;
  state.streak.best = Math.max(state.streak.best, state.streak.current);

  return { changed: true, reset };
}

function awardDailyDetermination(streakUpdate, source = "Dia ativo") {
  if (!streakUpdate?.changed) return [];
  const baseXp = Math.max(0, Number(BALANCE.consistency?.firstActiveDayXp) || 0);
  if (!baseXp) return [];
  const bonus = getXpBonusBreakdown("determination", { attribute: "determination", category: "habit" });
  const xp = Math.max(1, Math.round(baseXp * (1 + bonus.appliedBonus)));
  return addXP("determination", xp, source, { kind: "consistência", baseXp, bonusPercent: bonus.appliedBonus, note: "primeiro dia ativo" });
}

function getWeeklyStreakEligibility() {
  const today = localDateKey();

  if (state.streak.current < 7) {
    const remaining = 7 - state.streak.current;
    return {
      eligible: false,
      message: `Faltam ${remaining} ${pluralize(remaining, "dia", "dias")} de streak para liberar.`
    };
  }

  if (state.streak.lastWeeklyRewardDate) {
    const sinceLastReward = daysBetweenDateKeys(
      state.streak.lastWeeklyRewardDate,
      today
    );
    if (sinceLastReward < 7) {
      const remaining = 7 - sinceLastReward;
      return {
        eligible: false,
        message: `Recompensa já resgatada. Nova liberação em ${remaining} ${pluralize(remaining, "dia", "dias")}.`
      };
    }
  }

  return {
    eligible: true,
    message: "Streak de 7 dias completo. Recompensa pronta!"
  };
}

function claimMission(missionId) {
  const mission = [...state.missions.daily, ...state.missions.weekly].find(
    (candidate) => candidate.id === missionId
  );

  if (!mission || mission.status !== "completed") {
    showToast(
      "Recompensa indisponível",
      "Complete todos os requisitos antes de resgatar.",
      "🔒"
    );
    return;
  }

  let progressEvents = [];
  let rewardMessage = "Recompensa adicionada.";

  if (mission.reward.type === "xp") {
    progressEvents = addXP(
      mission.reward.attribute,
      mission.reward.amount,
      `Missão: ${mission.name}`,
      { kind: mission.periodType === "weekly" ? "missão semanal" : "missão diária", baseXp: mission.reward.amount }
    );
    rewardMessage = `+${formatNumber(mission.reward.amount)} XP em ${ATTRIBUTES[mission.reward.attribute].name}.`;
  }

  if (mission.reward.type === "buff") {
    const durationMs = mission.reward.durationHours * 60 * 60 * 1_000;
    state.buffs.push({
      id: createId(),
      multiplier: mission.reward.multiplier,
      source: mission.name,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationMs).toISOString()
    });
    rewardMessage = `Bônus de ${formatMultiplier(mission.reward.multiplier)} XP ativo por ${mission.reward.durationHours}h.`;
  }

  mission.status = "claimed";
  state.stats.claimedMissionRewards += 1;
  recordMissionClaim(mission);
  rebuildStatsFromSources();
  syncDerivedState();
  saveGame();
  updateUI();

  showToast("Recompensa resgatada", rewardMessage, "🎁");
  presentProgressEvents(progressEvents);
}

function presentProgressEvents(events) {
  if (!events.length) {
    return;
  }

  const classEvents = events.filter((event) => event.type === "class");
  const milestoneEvents = events.filter((event) => event.type === "milestone");
  const levelEvents = events.filter((event) => event.type === "level");

  if (classEvents.length) {
    const event = classEvents[classEvents.length - 1];
    const definition = ATTRIBUTES[event.attribute];
    const master = event.level >= 50;
    queueCelebration({
      icon: definition.icon,
      kicker: master ? "Classe dominada" : "Classe evoluída",
      title: master
        ? `${definition.className} mestre!`
        : `${definition.className} ${romanNumeral(event.level / 10)} desbloqueado`,
      message: master
        ? `${definition.masterTitle} conquistado no nível 50 de ${definition.name}.`
        : `${definition.name} alcançou o marco de nível ${event.level}.`
    });
    return;
  }

  if (milestoneEvents.length) {
    const event = milestoneEvents[milestoneEvents.length - 1];
    const definition = ATTRIBUTES[event.attribute];
    queueCelebration({
      icon: "✦",
      kicker: "Novo marco",
      title: `${definition.name} nível ${event.level}`,
      message: `A afinidade com ${definition.mentor} aumentou e uma nova etapa foi liberada.`
    });
    return;
  }

  if (levelEvents.length) {
    const event = levelEvents[levelEvents.length - 1];
    const definition = ATTRIBUTES[event.attribute];
    queueCelebration({
      icon: definition.icon,
      kicker: "Level up",
      title: `${definition.name} nível ${event.level}`,
      message:
        levelEvents.length > 1
          ? `Você avançou ${levelEvents.length} níveis com uma única recompensa.`
          : "Seu personagem ficou mais forte."
    });
  }
}

function queueCelebration(data) {
  celebrationQueue.push(data);
  if (!celebrationOpen) {
    displayNextCelebration();
  }
}

function displayNextCelebration() {
  const celebration = document.getElementById("celebration");
  const next = celebrationQueue.shift();

  if (!celebration || !next) {
    celebrationOpen = false;
    return;
  }

  celebrationOpen = true;
  celebrationReturnFocus = document.activeElement;
  setText("celebrationIcon", next.icon || "✦");
  setText("celebrationKicker", next.kicker || "Evolução");
  setText("celebrationTitle", next.title || "Level up!");
  setText(
    "celebrationMessage",
    next.message || "Seu personagem ficou mais forte."
  );
  celebration.hidden = false;
  document.getElementById("closeCelebrationButton")?.focus();
}

function closeCelebration() {
  const celebration = document.getElementById("celebration");
  if (!celebration) {
    return;
  }

  celebration.hidden = true;
  celebrationOpen = false;

  if (celebrationReturnFocus instanceof HTMLElement) {
    celebrationReturnFocus.focus({ preventScroll: true });
  }

  window.setTimeout(displayNextCelebration, 160);
}

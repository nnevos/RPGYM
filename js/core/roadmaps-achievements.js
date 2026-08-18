"use strict";

function getRoadmapMetricValue(metric) {
  const stats = state.stats || createDefaultStats();
  if (!metric) return 0;
  if (metric.type === "lifetime") return Math.max(0, Number(stats.lifetime?.[metric.key]) || 0);
  if (metric.type === "attributeActiveDays") return Math.max(0, Number(stats.attributes?.[metric.attribute]?.activeDays) || 0);
  if (metric.type === "attributeActivityCount") return Math.max(0, Number(stats.attributes?.[metric.attribute]?.activityCount) || 0);
  if (metric.type === "missionClaimsTotal") return Math.max(0, Number(stats.lifetime?.dailyMissionsCompleted) || 0) + Math.max(0, Number(stats.lifetime?.weeklyMissionsCompleted) || 0);
  if (["cardioTypeSessions", "cardioTypeMinutes", "cardioTypeDistanceKm"].includes(metric.type)) {
    const prop = metric.type === "cardioTypeSessions" ? "sessions" : metric.type === "cardioTypeMinutes" ? "minutes" : "distanceKm";
    return (metric.types || []).reduce((sum, type) => sum + Math.max(0, Number(stats.cardioByType?.[type]?.[prop]) || 0), 0);
  }
  return 0;
}

function getRoadmapChapterState(attributeKey, chapter) {
  const attribute = state.attributes[attributeKey];
  const claimed = Boolean(state.roadmaps?.[attributeKey]?.claimedChapters?.includes(chapter.id));
  const objectives = chapter.objectives.map((objective) => {
    const value = getRoadmapMetricValue(objective.metric);
    return { ...objective, value, complete: value >= objective.target };
  });
  const objectivesComplete = objectives.every((objective) => objective.complete);
  const levelReady = attribute.level >= chapter.unlockLevel;
  return { claimed, objectives, objectivesComplete, levelReady, ready: !claimed && objectivesComplete && levelReady };
}

function isRoadmapChapterClaimed(attributeKey, chapterId) {
  return Boolean(state.roadmaps?.[attributeKey]?.claimedChapters?.includes(chapterId));
}

function isClassUnlocked(attributeKey, game = state) {
  return Boolean(game?.roadmaps?.[attributeKey]?.claimedChapters?.includes(`${attributeKey}_10`));
}

function claimRoadmapChapter(attributeKey, chapterId) {
  const chapter = ROADMAP_DEFINITIONS[attributeKey]?.find((item) => item.id === chapterId);
  if (!chapter) return;
  const chapterState = getRoadmapChapterState(attributeKey, chapter);
  if (chapterState.claimed) return;
  if (!chapterState.levelReady) {
    showToast("Marco bloqueado", `Alcance o nível ${chapter.unlockLevel} de ${ATTRIBUTES[attributeKey].name}.`, "🔒");
    return;
  }
  if (!chapterState.objectivesComplete) {
    showToast("Objetivos pendentes", "Complete todos os objetivos deste capítulo primeiro.", "🔒");
    return;
  }
  state.roadmaps[attributeKey] ||= { claimedChapters: [] };
  state.roadmaps[attributeKey].claimedChapters.push(chapter.id);
  evaluateAchievements();
  saveGame();
  updateUI();
  const definition = ATTRIBUTES[attributeKey];
  if (chapter.unlockLevel === 10) {
    queueCelebration({
      icon: definition.icon,
      kicker: "Classe desbloqueada",
      title: `${definition.className}!`,
      message: `Você concluiu a provação de ${definition.name}. O bônus inicial da classe agora está ativo.`
    });
  } else if (chapter.unlockLevel === 50) {
    queueCelebration({
      icon: definition.icon,
      kicker: "Mestria alcançada",
      title: `${definition.className} Mestre`,
      message: `${chapter.rewardLabel}. Você concluiu toda a rota de ${definition.name}.`
    });
  } else if (chapter.unlockLevel % 10 === 0) {
    queueCelebration({
      icon: definition.icon,
      kicker: "Classe evoluída",
      title: chapter.rewardLabel,
      message: `Você concluiu ${chapter.title} e avançou para o próximo estágio de ${definition.className}.`
    });
  } else {
    queueCelebration({
      icon: "✦",
      kicker: "Roadmap concluído",
      title: chapter.rewardLabel,
      message: `Você concluiu ${chapter.title} e liberou um novo marco de ${definition.name}.`
    });
  }
}

function achievementUnlocked(id) {
  return Boolean(state.achievements?.unlocked?.includes(id));
}

function evaluateAchievements(options = {}) {
  state.achievements ||= { unlocked: [] };
  const newlyUnlocked = [];
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    if (state.achievements.unlocked.includes(achievement.id)) continue;
    let earned = false;
    try { earned = Boolean(achievement.test(state.stats || createDefaultStats(), state)); } catch (_error) { earned = false; }
    if (!earned) continue;
    state.achievements.unlocked.push(achievement.id);
    newlyUnlocked.push(achievement);
  }
  if (!options.silent) {
    newlyUnlocked.forEach((achievement) => queueCelebration({
      icon: achievement.icon,
      kicker: "Conquista desbloqueada",
      title: achievement.title,
      message: achievement.reward
    }));
  }
  return newlyUnlocked;
}

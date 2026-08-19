"use strict";
// Static validator for roadmap content. It intentionally does not mutate saves or gameplay.
(function () {
  const VALID_TYPES = new Set(["lifetime","attributeActiveDays","attributeActivityCount","missionClaimsTotal","cardioTypeSessions","cardioTypeMinutes","cardioTypeDistanceKm"]);
  const issues = [];
  const summary = [];
  Object.entries(ROADMAP_DEFINITIONS).forEach(([attribute, chapters]) => {
    let lastLevel = 0;
    const ids = new Set();
    chapters.forEach((chapter) => {
      if (ids.has(chapter.id)) issues.push(`${attribute}: ID duplicado ${chapter.id}`);
      ids.add(chapter.id);
      if (chapter.unlockLevel <= lastLevel) issues.push(`${attribute}: níveis fora de ordem em ${chapter.id}`);
      lastLevel = chapter.unlockLevel;
      if (!chapter.objectives?.length) issues.push(`${chapter.id}: sem objetivos`);
      chapter.objectives?.forEach((o) => {
        if (!o.metric || !VALID_TYPES.has(o.metric.type)) issues.push(`${chapter.id}/${o.id}: métrica desconhecida`);
        if (!(Number(o.target) > 0)) issues.push(`${chapter.id}/${o.id}: alvo inválido`);
      });
    });
    const expected = [5,10,15,20,25,30,35,40,45,50];
    const got = chapters.map(c=>c.unlockLevel);
    if (JSON.stringify(got)!==JSON.stringify(expected)) issues.push(`${attribute}: capítulos esperados 5..50, encontrados ${got.join(', ')}`);
    summary.push({attribute, chapters:chapters.length, objectives:chapters.reduce((n,c)=>n+c.objectives.length,0)});
  });
  window.ROADMAP_VALIDATION = { ok: issues.length===0, issues, summary };
})();

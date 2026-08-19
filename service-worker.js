"use strict";

const CACHE_NAME = "rpg-gym-v0.6.3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/base.css",
  "./css/product.css",
  "./css/systems.css",
  "./css/polish.css",
  "./css/auth.css",
  "./js/config/supabase-config.js",
  "./js/config/game-config.js",
  "./js/config/balance-config.js",
  "./js/config/roadmap-data.js",
  "./js/config/mission-data.js",
  "./js/config/achievement-data.js",
  "./js/config/ui-config.js",
  "./js/config/cardio-data.js",
  "./js/core/runtime.js",
  "./js/core/helpers.js",
  "./js/core/audit.js",
  "./js/core/state.js",
  "./js/core/missions.js",
  "./js/core/progression.js",
  "./js/core/roadmaps-achievements.js",
  "./js/core/cloud-sync.js",
  "./js/core/stability.js",
  "./js/core/account-security.js",
  "./js/core/pwa.js",
  "./js/core/auth.js",
  "./js/systems/cardio.js",
  "./js/systems/workouts.js",
  "./js/systems/social.js",
  "./js/systems/diet.js",
  "./js/ui/views.js",
  "./js/ui/interactions.js",
  "./js/app.js",
  "./js/data/exercises.js",
  "./js/data/foods.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      try { await cache.add(url); } catch (error) { console.warn("Cache install skip", url, error); }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isAppAsset = url.origin === self.location.origin;
  const isSupabaseLib = url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("supabase-js");
  if (!isAppAsset && !isSupabaseLib) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", response.clone());
        return response;
      } catch (_error) {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async (response) => {
      if (response && (response.ok || response.type === "opaque")) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});

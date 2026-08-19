"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (typeof bootstrapSupabaseAuth === "function") {
    bootstrapSupabaseAuth();
    return;
  }
  console.error("Módulo de autenticação não carregado.");
});

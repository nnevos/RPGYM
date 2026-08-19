"use strict";

let deferredPwaPrompt = null;

function setInstallCardVisible(visible) {
  const card = document.getElementById("pwaInstallCard");
  if (card) card.hidden = !visible;
}

async function installRpgGymPwa() {
  if (!deferredPwaPrompt) {
    showToast("Instalação", "No iPhone, use Compartilhar → Adicionar à Tela de Início. Em outros navegadores, procure a opção Instalar app.", "+");
    return;
  }
  deferredPwaPrompt.prompt();
  await deferredPwaPrompt.userChoice.catch(() => null);
  deferredPwaPrompt = null;
  setInstallCardVisible(false);
}

function bootstrapPwa() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => console.warn("Service Worker não registrado", error));
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPwaPrompt = event;
    setInstallCardVisible(true);
  });
  window.addEventListener("appinstalled", () => {
    deferredPwaPrompt = null;
    setInstallCardVisible(false);
    showToast("RPG GYM instalado", "Agora você pode abrir pela tela inicial.", "✓");
  });
  document.getElementById("installPwaButton")?.addEventListener("click", installRpgGymPwa);
}

document.addEventListener("DOMContentLoaded", bootstrapPwa, { once: true });

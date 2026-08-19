"use strict";

/*
 * Supabase authentication + first-run onboarding.
 * The game state remains local in v0.5.0; this module synchronizes account/profile
 * identity and tutorial completion only. Full cloud save is intentionally a later step.
 */

let supabaseClient = null;
let authSession = null;
let authProfile = null;
let authUiMode = "login";
let authWizardStep = 0;
let tutorialStep = 0;
let authWizardDraft = {};
let gameBootedAfterAuth = false;
let authStateSubscription = null;
let authGlobalActionsBound = false;

const AUTH_PROFILE_STEPS = [
  "physiological_sex",
  "birth_date",
  "weight_kg",
  "height_cm",
  "goal",
  "activity_level"
];

const AUTH_TUTORIAL_SLIDES = [
  {
    kicker: "Sua evolução não acontece sozinha",
    title: "Consistência é poder",
    text: "Transforme sua rotina em evolução. Cada treino, cardio e hábito registrado fortalece sua jornada no RPG GYM."
  },
  {
    kicker: "Atividade real = progresso",
    title: "Quanto mais você faz, mais XP pode receber",
    text: "Atividades legítimas continuam gerando progresso. Repetições excessivas no mesmo dia apenas perdem eficiência para evitar farm artificial."
  },
  {
    kicker: "Sua build vem da sua rotina",
    title: "Você não escolhe um único caminho",
    text: "Seu estilo é definido pelas suas ações. Os seis atributos evoluem de acordo com treino, cardio, alimentação, consistência e experiências sociais."
  },
  {
    attribute: "FORÇA",
    text: "Representa potência, musculação, séries válidas e evolução de performance. A rota de Força conduz à classe Berserker."
  },
  {
    attribute: "AGILIDADE",
    text: "Representa velocidade, explosão e controle do próprio corpo. Ritmo, corrida, corda e performance rápida podem alimentar Agilidade."
  },
  {
    attribute: "CONSTITUIÇÃO",
    text: "Representa fôlego e resistência. Tempo de cardio, distância e capacidade de sustentar esforço alimentam principalmente Constituição."
  },
  {
    attribute: "INTELIGÊNCIA",
    text: "Representa consciência sobre alimentação e hábitos. Registrar refeições e acompanhar sua rotina nutricional desenvolve Inteligência."
  },
  {
    attribute: "DETERMINAÇÃO",
    text: "Representa consistência e disciplina. Dias ativos, streaks e missões refletem sua capacidade de continuar aparecendo."
  },
  {
    attribute: "CARISMA",
    text: "Representa cooperação e progresso social. Grupos e atividades compartilhadas serão a principal fonte desta rota conforme o Social evoluir."
  }
];

function getAuthConfig() {
  return window.RPG_GYM_SUPABASE_CONFIG || {};
}

function bindAuthGlobalActions() {
  if (authGlobalActionsBound) return;
  authGlobalActionsBound = true;
  document.addEventListener("click", (event) => {
    const avatarButton = event.target.closest("#profileAvatarUploadButton");
    if (avatarButton) {
      event.preventDefault();
      document.getElementById("profileAvatarInput")?.click();
      return;
    }
    const logout = event.target.closest("[data-auth-logout]");
    if (logout) {
      event.preventDefault();
      signOutRpgGym();
      return;
    }
    const replay = event.target.closest("[data-replay-cloud-tutorial]");
    if (replay) {
      event.preventDefault();
      replayCloudTutorial();
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target?.id !== "profileAvatarInput") return;
    const file = event.target.files?.[0];
    if (file) uploadProfileAvatar(file);
    event.target.value = "";
  });
}

function isSupabaseConfigured() {
  const config = getAuthConfig();
  return Boolean(
    /^https:\/\/.+\.supabase\.co$/i.test(String(config.url || "").trim()) &&
    String(config.publishableKey || "").trim() &&
    !String(config.publishableKey).includes("COLE_AQUI")
  );
}

function getAuthRedirectUrl() {
  const configured = String(getAuthConfig().redirectUrl || "").trim();
  if (configured) return configured;
  if (window.location.protocol === "file:") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

function authEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ensureAuthRoot() {
  let root = document.getElementById("authRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "authRoot";
    root.className = "auth-root";
    document.body.prepend(root);
  }
  return root;
}

function setAuthBusy(button, busy, label = "Aguarde...") {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalLabel || button.textContent;
    delete button.dataset.originalLabel;
  }
}

function showAuthMessage(message, type = "info") {
  const el = document.getElementById("authMessage");
  if (!el) return;
  el.hidden = !message;
  el.className = `auth-message auth-message-${type}`;
  el.textContent = message || "";
}

function renderAuthShell(content, options = {}) {
  const root = ensureAuthRoot();
  root.hidden = false;
  root.innerHTML = `
    <main class="auth-screen ${options.wide ? "auth-screen-wide" : ""}">
      ${options.back ? `<button class="auth-back" id="authBackButton" type="button">‹ Voltar</button>` : ""}
      <section class="auth-card ${options.cardClass || ""}">
        ${content}
        <p class="auth-message" id="authMessage" hidden></p>
      </section>
    </main>`;
  document.body.classList.add("auth-active");
  document.body.style.overflow = "hidden";
  document.getElementById("authBackButton")?.addEventListener("click", () => showLoginScreen());
}

function showConfigRequired() {
  renderAuthShell(`
    <div class="auth-brand-mark">RPG</div>
    <p class="auth-kicker">Integração Supabase</p>
    <h1>Conecte seu projeto</h1>
    <p class="auth-copy">Preencha <code>js/config/supabase-config.js</code> com o Project URL e a chave pública Publishable/Anon do Supabase.</p>
    <div class="auth-config-note">
      <strong>Não use service_role.</strong>
      <span>Depois execute <code>supabase/schema.sql</code> no SQL Editor.</span>
    </div>
  `);
}

function showLaunchScreen() {
  renderAuthShell(`
    <div class="auth-launch-logo" aria-hidden="true"><span>RPG</span><b>GYM</b></div>
    <p class="auth-launch-title">Bem-vindo ao</p>
    <strong class="auth-launch-name">RPG GYM</strong>
    <div class="auth-launch-spinner" aria-label="Carregando"></div>
  `, { cardClass: "auth-launch-card" });
}

function showLoginScreen(prefillEmail = "") {
  authUiMode = "login";
  renderAuthShell(`
    <div class="auth-heading">
      <p>Bem-vindo!</p>
      <h1>Entre na sua jornada</h1>
      <span>Treine, evolua seus atributos e fortaleça sua consistência.</span>
    </div>
    <form class="auth-form" id="loginForm">
      <label><span>Email</span><input id="loginEmail" type="email" autocomplete="email" required value="${authEscape(prefillEmail)}" placeholder="seunome@email.com"></label>
      <label><span>Senha</span><input id="loginPassword" type="password" autocomplete="current-password" required minlength="6" placeholder="••••••••"></label>
      <button class="auth-text-link auth-forgot-link" id="forgotPasswordLink" type="button">Esqueci a senha</button>
      <button class="auth-primary" type="submit">Entrar</button>
    </form>
    <div class="auth-divider"><span>ou</span></div>
    <button class="auth-secondary" id="goRegisterButton" type="button">Criar uma conta</button>
  `);

  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("goRegisterButton")?.addEventListener("click", showRegisterScreen);
  document.getElementById("forgotPasswordLink")?.addEventListener("click", () => showForgotPasswordScreen(document.getElementById("loginEmail")?.value || ""));
  window.setTimeout(() => document.getElementById("loginEmail")?.focus(), 20);
}

function showRegisterScreen() {
  authUiMode = "register";
  renderAuthShell(`
    <div class="auth-heading">
      <p>Vamos começar!</p>
      <h1>Crie sua conta</h1>
      <span>Seu perfil ficará ligado à sua conta Supabase.</span>
    </div>
    <form class="auth-form" id="registerForm">
      <label><span>Nome</span><input id="registerName" type="text" autocomplete="name" maxlength="40" required placeholder="Como quer ser chamado?"></label>
      <label><span>Email</span><input id="registerEmail" type="email" autocomplete="email" required placeholder="seunome@email.com"></label>
      <label><span>Telefone <small>(opcional)</small></span><input id="registerPhone" type="tel" autocomplete="tel" maxlength="30" placeholder="(11) 99999-9999"></label>
      <div class="auth-form-two">
        <label><span>Senha</span><input id="registerPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mín. 8 caracteres"></label>
        <label><span>Confirmar senha</span><input id="registerPasswordConfirm" type="password" autocomplete="new-password" minlength="8" required placeholder="Repita a senha"></label>
      </div>
      <button class="auth-primary" type="submit">Inscrever-se</button>
    </form>
    <p class="auth-switch">Já tem conta? <button class="auth-text-link" id="goLoginButton" type="button">Entrar</button></p>
  `, { back: true });

  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);
  document.getElementById("goLoginButton")?.addEventListener("click", () => showLoginScreen());
  window.setTimeout(() => document.getElementById("registerName")?.focus(), 20);
}

function showForgotPasswordScreen(prefillEmail = "") {
  authUiMode = "forgot";
  renderAuthShell(`
    <div class="auth-heading">
      <p>Recuperação</p>
      <h1>Esqueceu sua senha?</h1>
      <span>Digite seu email. Enviaremos um link seguro para criar uma nova senha.</span>
    </div>
    <form class="auth-form" id="forgotForm">
      <label><span>Email de recuperação</span><input id="forgotEmail" type="email" autocomplete="email" required value="${authEscape(prefillEmail)}" placeholder="seunome@email.com"></label>
      <button class="auth-primary" type="submit">Continuar</button>
    </form>
  `, { back: true });
  document.getElementById("forgotForm")?.addEventListener("submit", handleForgotPassword);
}

function showResetPasswordScreen() {
  authUiMode = "reset";
  renderAuthShell(`
    <div class="auth-heading">
      <p>Segurança</p>
      <h1>Nova senha</h1>
      <span>Escolha uma senha nova para continuar sua evolução.</span>
    </div>
    <form class="auth-form" id="resetPasswordForm">
      <label><span>Senha</span><input id="resetPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mín. 8 caracteres"></label>
      <label><span>Confirmar senha</span><input id="resetPasswordConfirm" type="password" autocomplete="new-password" minlength="8" required placeholder="Repita a senha"></label>
      <button class="auth-primary" type="submit">Criar nova senha</button>
    </form>
  `, { back: false });
  document.getElementById("resetPasswordForm")?.addEventListener("submit", handleResetPassword);
}

function showCheckEmailScreen(email) {
  authUiMode = "verify";
  renderAuthShell(`
    <div class="auth-success-icon">✓</div>
    <div class="auth-heading">
      <p>Conta criada</p>
      <h1>Confirme seu email</h1>
      <span>Enviamos um link para <b>${authEscape(email)}</b>. Abra o email e confirme a conta para continuar.</span>
    </div>
    <button class="auth-primary" id="backToLoginAfterVerify" type="button">Voltar ao login</button>
  `);
  document.getElementById("backToLoginAfterVerify")?.addEventListener("click", () => showLoginScreen(email));
}

async function handleLogin(event) {
  event.preventDefault();
  showAuthMessage("");
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const email = document.getElementById("loginEmail")?.value.trim() || "";
  const password = document.getElementById("loginPassword")?.value || "";
  setAuthBusy(button, true, "Entrando...");
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) await handleAuthenticatedSession(data.session);
  } catch (error) {
    showAuthMessage(authFriendlyError(error), "error");
  } finally {
    setAuthBusy(button, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  showAuthMessage("");
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const displayName = document.getElementById("registerName")?.value.trim() || "";
  const email = document.getElementById("registerEmail")?.value.trim() || "";
  const phone = document.getElementById("registerPhone")?.value.trim() || "";
  const password = document.getElementById("registerPassword")?.value || "";
  const confirmPassword = document.getElementById("registerPasswordConfirm")?.value || "";

  if (password !== confirmPassword) {
    showAuthMessage("As senhas não são iguais.", "error");
    return;
  }

  setAuthBusy(button, true, "Criando conta...");
  try {
    const redirectTo = getAuthRedirectUrl();
    const options = { data: { display_name: displayName, phone } };
    if (redirectTo) options.emailRedirectTo = redirectTo;
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options });
    if (error) throw error;

    if (!data.session) {
      showCheckEmailScreen(email);
      return;
    }
    await handleAuthenticatedSession(data.session);
  } catch (error) {
    showAuthMessage(authFriendlyError(error), "error");
  } finally {
    setAuthBusy(button, false);
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  showAuthMessage("");
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const email = document.getElementById("forgotEmail")?.value.trim() || "";
  const redirectTo = getAuthRedirectUrl();

  if (!redirectTo) {
    showAuthMessage("Recuperação por email precisa do app aberto por http(s), não file://. Hospede o projeto ou rode um servidor local e configure a Redirect URL no Supabase.", "error");
    return;
  }

  setAuthBusy(button, true, "Enviando...");
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    showAuthMessage("Link enviado. Verifique sua caixa de entrada e spam.", "success");
  } catch (error) {
    showAuthMessage(authFriendlyError(error), "error");
  } finally {
    setAuthBusy(button, false);
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  showAuthMessage("");
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const password = document.getElementById("resetPassword")?.value || "";
  const confirmPassword = document.getElementById("resetPasswordConfirm")?.value || "";
  if (password !== confirmPassword) {
    showAuthMessage("As senhas não são iguais.", "error");
    return;
  }
  setAuthBusy(button, true, "Atualizando...");
  try {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    showAuthMessage("Senha atualizada. Você já pode continuar sua jornada.", "success");
    window.setTimeout(async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session) await handleAuthenticatedSession(data.session);
      else showLoginScreen();
    }, 900);
  } catch (error) {
    showAuthMessage(authFriendlyError(error), "error");
  } finally {
    setAuthBusy(button, false);
  }
}

function authFriendlyError(error) {
  const message = String(error?.message || error || "Erro desconhecido");
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Email ou senha incorretos.";
  if (normalized.includes("email not confirmed")) return "Confirme seu email antes de entrar.";
  if (normalized.includes("user already registered")) return "Já existe uma conta com este email.";
  if (normalized.includes("password should be")) return "A senha não atende aos requisitos mínimos.";
  if (normalized.includes("rate limit")) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  return message;
}

async function loadOrCreateProfile(session) {
  const user = session.user;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const fallback = {
    id: user.id,
    email: user.email || null,
    display_name: user.user_metadata?.display_name || "Jogador",
    phone: user.user_metadata?.phone || null
  };
  const { data: inserted, error: insertError } = await supabaseClient
    .from("profiles")
    .insert(fallback)
    .select("*")
    .single();
  if (insertError) throw insertError;
  return inserted;
}

async function handleAuthenticatedSession(session) {
  if (!session?.user) return;
  authSession = session;
  window.RPG_GYM_AUTH_USER_ID = session.user.id;
  showLaunchScreen();
  try {
    authProfile = await loadOrCreateProfile(session);
    if (!authProfile.onboarding_completed) {
      authWizardStep = 0;
      authWizardDraft = {
        physiological_sex: authProfile.physiological_sex || "",
        birth_date: authProfile.birth_date || "",
        weight_kg: authProfile.weight_kg || "",
        height_cm: authProfile.height_cm || "",
        goal: authProfile.goal || "",
        activity_level: authProfile.activity_level || ""
      };
      renderProfileWizard();
      return;
    }
    if (!authProfile.tutorial_completed) {
      tutorialStep = 0;
      renderCloudTutorial();
      return;
    }
    if (typeof preloadCloudSaveForUser === "function") await preloadCloudSaveForUser();
    enterGameFromAuth();
  } catch (error) {
    console.error("Falha ao carregar perfil Supabase", error);
    renderAuthShell(`
      <div class="auth-heading"><p>Supabase</p><h1>Não foi possível carregar seu perfil</h1><span>Confira se você executou <code>supabase/schema.sql</code> e se as policies RLS foram criadas.</span></div>
      <button class="auth-primary" id="retryProfileLoad" type="button">Tentar novamente</button>
      <button class="auth-secondary" id="logoutAfterProfileError" type="button">Sair</button>
    `);
    showAuthMessage(authFriendlyError(error), "error");
    document.getElementById("retryProfileLoad")?.addEventListener("click", () => handleAuthenticatedSession(session));
    document.getElementById("logoutAfterProfileError")?.addEventListener("click", signOutRpgGym);
  }
}

function renderProfileWizard() {
  const stepKey = AUTH_PROFILE_STEPS[authWizardStep];
  const total = AUTH_PROFILE_STEPS.length;
  const progress = Math.round(((authWizardStep + 1) / total) * 100);

  let title = "";
  let subtitle = "";
  let control = "";

  if (stepKey === "physiological_sex") {
    title = "Como seu corpo deve ser analisado fisiologicamente?";
    subtitle = "Esse dado fica no seu perfil e pode ajudar futuras métricas corporais. Você também pode optar por não informar.";
    control = `
      <div class="auth-choice-stack auth-choice-icons">
        ${wizardChoice("physiological_sex", "masculino", "Masculino", "♂")}
        ${wizardChoice("physiological_sex", "feminino", "Feminino", "♀")}
        ${wizardChoice("physiological_sex", "nao_informado", "Prefiro não informar", "—")}
      </div>`;
  } else if (stepKey === "birth_date") {
    title = "Data de nascimento";
    subtitle = "Use sua data real. Ela fica associada ao seu perfil privado.";
    control = `<input class="auth-big-input" id="wizardBirthDate" type="date" value="${authEscape(authWizardDraft.birth_date || "")}" max="${new Date().toISOString().slice(0, 10)}">`;
  } else if (stepKey === "weight_kg") {
    title = "Qual é seu peso atual?";
    subtitle = "Você poderá atualizar esse valor depois no Perfil.";
    control = `<div class="auth-measure-input"><input id="wizardWeight" type="number" min="20" max="400" step="0.1" inputmode="decimal" value="${authEscape(authWizardDraft.weight_kg || "")}" placeholder="68"><span>kg</span></div>`;
  } else if (stepKey === "height_cm") {
    title = "Qual é sua altura?";
    subtitle = "Informe em centímetros. Você poderá alterar depois.";
    control = `<div class="auth-measure-input"><input id="wizardHeight" type="number" min="80" max="250" step="1" inputmode="numeric" value="${authEscape(authWizardDraft.height_cm || "")}" placeholder="170"><span>cm</span></div>`;
  } else if (stepKey === "goal") {
    title = "Qual é seu objetivo?";
    subtitle = "Isso personaliza seu perfil. O RPG não substitui orientação profissional.";
    control = `<div class="auth-choice-stack">
      ${wizardChoice("goal", "Perder gordura", "Emagrecimento")}
      ${wizardChoice("goal", "Ganhar força", "Ganho de força")}
      ${wizardChoice("goal", "Ganhar massa muscular", "Hipertrofia")}
      ${wizardChoice("goal", "Saúde e bem-estar", "Resistência / saúde")}
      ${wizardChoice("goal", "Criar consistência", "Criar consistência")}
    </div>`;
  } else if (stepKey === "activity_level") {
    title = "Qual é seu nível de atividade?";
    subtitle = "Escolha o nível que mais se aproxima da sua rotina atual.";
    control = `<div class="auth-choice-stack">
      ${wizardChoice("activity_level", "Iniciante", "Iniciante")}
      ${wizardChoice("activity_level", "Intermediário", "Intermediário")}
      ${wizardChoice("activity_level", "Avançado", "Avançado")}
    </div>`;
  }

  renderAuthShell(`
    <div class="auth-wizard-progress"><i style="width:${progress}%"></i></div>
    <div class="auth-heading auth-wizard-heading">
      <p>Perfil • ${authWizardStep + 1}/${total}</p>
      <h1>${title}</h1>
      <span>${subtitle}</span>
    </div>
    <div class="auth-wizard-control">${control}</div>
    <div class="auth-wizard-actions">
      ${authWizardStep > 0 ? `<button class="auth-secondary" id="wizardBack" type="button">Voltar</button>` : `<span></span>`}
      <button class="auth-primary" id="wizardNext" type="button">${authWizardStep === total - 1 ? "Concluir perfil" : "Continuar"}</button>
    </div>
  `, { wide: true });

  document.querySelectorAll("[data-wizard-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      authWizardDraft[button.dataset.wizardField] = button.dataset.wizardChoice;
      renderProfileWizard();
    });
  });
  document.getElementById("wizardBack")?.addEventListener("click", () => {
    captureWizardInput();
    authWizardStep = Math.max(0, authWizardStep - 1);
    renderProfileWizard();
  });
  document.getElementById("wizardNext")?.addEventListener("click", handleWizardNext);
}

function wizardChoice(field, value, label, icon = "") {
  const selected = String(authWizardDraft[field] || "") === String(value);
  return `<button class="auth-choice ${selected ? "is-selected" : ""}" type="button" data-wizard-field="${authEscape(field)}" data-wizard-choice="${authEscape(value)}">${icon ? `<b>${icon}</b>` : ""}<span>${authEscape(label)}</span><i aria-hidden="true"></i></button>`;
}

function captureWizardInput() {
  const stepKey = AUTH_PROFILE_STEPS[authWizardStep];
  if (stepKey === "birth_date") authWizardDraft.birth_date = document.getElementById("wizardBirthDate")?.value || "";
  if (stepKey === "weight_kg") authWizardDraft.weight_kg = document.getElementById("wizardWeight")?.value || "";
  if (stepKey === "height_cm") authWizardDraft.height_cm = document.getElementById("wizardHeight")?.value || "";
}

async function handleWizardNext() {
  captureWizardInput();
  const stepKey = AUTH_PROFILE_STEPS[authWizardStep];
  if (!authWizardDraft[stepKey]) {
    showAuthMessage("Escolha ou informe uma opção para continuar.", "error");
    return;
  }

  if (stepKey === "weight_kg") {
    const value = Number(authWizardDraft.weight_kg);
    if (!Number.isFinite(value) || value < 20 || value > 400) {
      showAuthMessage("Informe um peso entre 20 e 400 kg.", "error");
      return;
    }
  }
  if (stepKey === "height_cm") {
    const value = Number(authWizardDraft.height_cm);
    if (!Number.isFinite(value) || value < 80 || value > 250) {
      showAuthMessage("Informe uma altura entre 80 e 250 cm.", "error");
      return;
    }
  }

  if (authWizardStep < AUTH_PROFILE_STEPS.length - 1) {
    authWizardStep += 1;
    renderProfileWizard();
    return;
  }

  const button = document.getElementById("wizardNext");
  setAuthBusy(button, true, "Salvando...");
  try {
    const payload = {
      physiological_sex: authWizardDraft.physiological_sex,
      birth_date: authWizardDraft.birth_date,
      weight_kg: Number(authWizardDraft.weight_kg),
      height_cm: Number(authWizardDraft.height_cm),
      goal: authWizardDraft.goal,
      activity_level: authWizardDraft.activity_level,
      onboarding_completed: true
    };
    const { data, error } = await supabaseClient
      .from("profiles")
      .update(payload)
      .eq("id", authSession.user.id)
      .select("*")
      .single();
    if (error) throw error;
    authProfile = data;
    tutorialStep = 0;
    renderCloudTutorial();
  } catch (error) {
    showAuthMessage(authFriendlyError(error), "error");
    setAuthBusy(button, false);
  }
}

function renderCloudTutorial() {
  const slide = AUTH_TUTORIAL_SLIDES[tutorialStep];
  const total = AUTH_TUTORIAL_SLIDES.length;
  const dots = AUTH_TUTORIAL_SLIDES.map((_, index) => `<i class="${index === tutorialStep ? "is-active" : index < tutorialStep ? "is-done" : ""}"></i>`).join("");
  const isAttribute = Boolean(slide.attribute);

  renderAuthShell(`
    <div class="cloud-tutorial-progress">${dots}</div>
    <div class="cloud-tutorial-content ${isAttribute ? "is-attribute" : ""}">
      ${isAttribute
        ? `<div class="cloud-tutorial-spacer"></div><h1>${authEscape(slide.attribute)}</h1><div class="cloud-tutorial-band"><p>${authEscape(slide.text)}</p></div>`
        : `<p class="cloud-tutorial-kicker">${authEscape(slide.kicker)}</p><h1>${authEscape(slide.title)}</h1><div class="cloud-tutorial-band"><p>${authEscape(slide.text)}</p></div>`}
    </div>
    <div class="cloud-tutorial-actions">
      ${tutorialStep > 0 ? `<button class="auth-secondary" id="tutorialPrev" type="button">Voltar</button>` : `<span></span>`}
      <button class="auth-primary" id="tutorialNext" type="button">${tutorialStep === total - 1 ? "Entrar no RPG GYM" : "Próximo"}</button>
    </div>
  `, { wide: true, cardClass: "cloud-tutorial-card" });

  document.getElementById("tutorialPrev")?.addEventListener("click", () => {
    tutorialStep = Math.max(0, tutorialStep - 1);
    renderCloudTutorial();
  });
  document.getElementById("tutorialNext")?.addEventListener("click", async () => {
    if (tutorialStep < total - 1) {
      tutorialStep += 1;
      renderCloudTutorial();
      return;
    }
    await completeCloudTutorial();
  });
}

async function completeCloudTutorial() {
  const button = document.getElementById("tutorialNext");
  setAuthBusy(button, true, "Salvando...");
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .update({ tutorial_completed: true, tutorial_completed_at: new Date().toISOString() })
      .eq("id", authSession.user.id)
      .select("*")
      .single();
    if (error) throw error;
    authProfile = data;
    if (typeof preloadCloudSaveForUser === "function") await preloadCloudSaveForUser();
    enterGameFromAuth();
  } catch (error) {
    showAuthMessage(authFriendlyError(error), "error");
    setAuthBusy(button, false);
  }
}

function mapActivityLevelToFrequency(level) {
  if (level === "Iniciante") return "3 vezes por semana";
  if (level === "Avançado") return "5 vezes por semana";
  return "4 vezes por semana";
}

function applySupabaseProfileToGame() {
  if (!gameBootedAfterAuth || !authProfile || typeof state === "undefined" || !state) return;
  if (authProfile.display_name) state.player.name = authProfile.display_name.slice(0, 40);
  if (authProfile.weight_kg != null) state.profile.weight = String(authProfile.weight_kg);
  if (authProfile.height_cm != null) state.profile.height = String(authProfile.height_cm);
  if (authProfile.goal) state.profile.goal = authProfile.goal;
  if (authProfile.activity_level && (!state.profile.frequency || state.profile.frequency === "4 vezes por semana")) state.profile.frequency = mapActivityLevelToFrequency(authProfile.activity_level);
  state.profile.sex = authProfile.physiological_sex || state.profile.sex || "";
  state.profile.birthDate = authProfile.birth_date || state.profile.birthDate || "";
  state.profile.activityLevel = authProfile.activity_level || state.profile.activityLevel || "";
  state.tutorial ||= { welcomeSeen: true, dismissed: {}, viewedHelp: {} };
  state.tutorial.welcomeSeen = true;
  saveGame();
  profileHydrated = false;
  hydrateProfileForm();
  updateUI();
}

function enterGameFromAuth() {
  const root = ensureAuthRoot();
  root.hidden = true;
  root.innerHTML = "";
  document.body.classList.remove("auth-active");
  document.body.style.overflow = "";
  if (!gameBootedAfterAuth) {
    gameBootedAfterAuth = true;
    init();
  }
  applySupabaseProfileToGame();
  const emailLabel = document.getElementById("profileCloudEmail");
  if (emailLabel) emailLabel.textContent = authSession?.user?.email || "Conta conectada";
  const status = document.querySelector(".sidebar-status");
  if (status) {
    const strong = status.querySelector("strong");
    const small = status.querySelector("small");
    if (strong) strong.textContent = "Conta conectada";
    if (small) small.textContent = "Supabase conectado • sincronizando progresso";
  }
}

async function syncSupabaseProfileFromGame() {
  if (!supabaseClient || !authSession?.user || typeof state === "undefined" || !state) return;
  const payload = {
    display_name: state.player.name || "Jogador",
    weight_kg: state.profile.weight ? Number(state.profile.weight) : null,
    height_cm: state.profile.height ? Number(state.profile.height) : null,
    goal: state.profile.goal || null
  };
  const { data, error } = await supabaseClient
    .from("profiles")
    .update(payload)
    .eq("id", authSession.user.id)
    .select("*")
    .single();
  if (error) throw error;
  authProfile = data;
}

async function optimizeAvatarImage(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type || "")) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (file.size > 8 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 8 MB.");

  let source;
  let cleanup = () => {};
  if (window.createImageBitmap) {
    source = await createImageBitmap(file);
    cleanup = () => source.close?.();
  } else {
    const url = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      img.src = url;
    });
    cleanup = () => URL.revokeObjectURL(url);
  }

  try {
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const side = Math.min(width, height);
    const sx = Math.max(0, (width - side) / 2);
    const sy = Math.max(0, (height - side) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(source, sx, sy, side, side, 0, 0, 512, 512);
    return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível otimizar a imagem.")), "image/webp", 0.84));
  } finally {
    cleanup();
  }
}

async function uploadProfileAvatar(file) {
  if (!supabaseClient || !authSession?.user) {
    showToast("Conta necessária", "Entre na sua conta antes de alterar a foto.", "!");
    return;
  }
  const button = document.getElementById("profileAvatarUploadButton");
  if (button) { button.disabled = true; button.textContent = "Enviando..."; }
  try {
    const blob = await optimizeAvatarImage(file);
    const path = `${authSession.user.id}/avatar.webp`;
    const { error: uploadError } = await supabaseClient.storage
      .from("avatars")
      .upload(path, blob, { contentType: "image/webp", cacheControl: "3600", upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage.from("avatars").getPublicUrl(path);
    const baseUrl = publicData?.publicUrl || "";
    if (!baseUrl) throw new Error("Não foi possível obter a URL da foto.");
    const avatarUrl = `${baseUrl}?v=${Date.now()}`;
    const { data, error } = await supabaseClient
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", authSession.user.id)
      .select("*")
      .single();
    if (error) throw error;
    authProfile = data;
    renderCharacter?.();
    if (typeof syncSocialSnapshotNow === "function") await syncSocialSnapshotNow();
    showToast("Foto atualizada", "Sua foto de perfil foi salva no Supabase.", "✓");
  } catch (error) {
    console.warn("Falha ao enviar avatar", error);
    const message = /row-level security|bucket|not found/i.test(String(error?.message || ""))
      ? "Execute o SQL v0.5.3 no Supabase para criar o bucket e as permissões de avatar."
      : (error?.message || "Não foi possível enviar a imagem agora.");
    showToast("Não foi possível atualizar", message, "!");
  } finally {
    if (button) { button.disabled = false; button.textContent = "Alterar foto"; }
  }
}

async function replayCloudTutorial() {
  if (!authSession) return;
  closeProfileSettings?.();
  tutorialStep = 0;
  renderCloudTutorial();
}

async function signOutRpgGym() {
  try {
    if (supabaseClient) await supabaseClient.auth.signOut();
  } finally {
    authSession = null;
    authProfile = null;
    window.RPG_GYM_AUTH_USER_ID = null;
    // Reload to discard the previous account's in-memory state before another
    // user signs in on the same browser. Local saves are namespaced by user id.
    window.location.reload();
  }
}

async function bootstrapSupabaseAuth() {
  ensureAuthRoot();
  bindAuthGlobalActions();
  showLaunchScreen();

  if (!isSupabaseConfigured()) {
    window.setTimeout(showConfigRequired, 250);
    return;
  }
  if (!window.supabase?.createClient) {
    renderAuthShell(`<div class="auth-heading"><p>Erro de carregamento</p><h1>Supabase JS não carregou</h1><span>Verifique sua conexão com a internet e se o CDN está acessível.</span></div>`);
    return;
  }

  const config = getAuthConfig();
  supabaseClient = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  if (authStateSubscription) authStateSubscription.unsubscribe?.();
  const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
    authSession = session;
    if (event === "PASSWORD_RECOVERY") {
      window.setTimeout(showResetPasswordScreen, 0);
      return;
    }
    if (event === "SIGNED_OUT") {
      window.setTimeout(() => showLoginScreen(), 0);
    }
  });
  authStateSubscription = listener.subscription;

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    // PASSWORD_RECOVERY is emitted during URL session detection. Give it a brief
    // chance to take ownership of the screen before opening the normal app.
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    if (authUiMode === "reset") return;
    if (data.session) await handleAuthenticatedSession(data.session);
    else showLoginScreen();
  } catch (error) {
    console.error(error);
    showLoginScreen();
    window.setTimeout(() => showAuthMessage(authFriendlyError(error), "error"), 0);
  }
}

window.bootstrapSupabaseAuth = bootstrapSupabaseAuth;
window.signOutRpgGym = signOutRpgGym;
window.replayCloudTutorial = replayCloudTutorial;
window.syncSupabaseProfileFromGame = syncSupabaseProfileFromGame;

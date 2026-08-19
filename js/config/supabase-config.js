"use strict";

/*
 * Supabase client configuration.
 *
 * IMPORTANT:
 * - Use ONLY the Project URL and the public Publishable/Anon key here.
 * - NEVER place a service_role / secret key in browser code.
 * - For password recovery and email confirmation, host the app over http(s).
 *   file:// URLs cannot be used reliably as email redirect targets.
 */
window.RPG_GYM_SUPABASE_CONFIG = Object.freeze({
  url: "https://cvimjrwxifcjiiawwlmr.supabase.co",
  publishableKey: "sb_publishable_N5ojWXU2qLOLLLFmM7lgdQ_cwKjTKwS",

  /*
   * Optional. Leave blank to use the current page URL.
   * Example: "https://seu-dominio.com/"
   * Add the same URL to Authentication > URL Configuration > Redirect URLs.
   */
  redirectUrl: ""
});

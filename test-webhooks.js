// ============================================================================
// SCRIPT CONSOLE NAVIGATEUR — Test des deux webhooks ABEMA
// Coller dans la console (F12) sur https://www.abemaagency.com
// ============================================================================

(async function testAbemaWebhooks() {
  const CHAT_WEBHOOK = 'https://n8n.abemaagency.com/webhook/chatbot-abema';
  const LEAD_WEBHOOK = (window.ABEMA_CONFIG && window.ABEMA_CONFIG.n8n && window.ABEMA_CONFIG.n8n.leadWebhook)
                      || 'https://n8n.abemaagency.com/webhook/lead-qualification';

  const sessionId = (crypto.randomUUID && crypto.randomUUID()) || 'test-' + Date.now();
  const ok = (label) => console.log('%c✓ ' + label, 'color:#22c55e;font-weight:bold');
  const ko = (label, err) => console.error('%c✗ ' + label, 'color:#ef4444;font-weight:bold', err);

  // ── Test 1 : Chatbot ─────────────────────────────────────────────────────
  console.group('%c[1] Webhook chatbot', 'color:#3b5bdb;font-weight:bold');
  try {
    const t0 = performance.now();
    const res = await fetch(CHAT_WEBHOOK, {
      method     : 'POST',
      mode       : 'cors',
      credentials: 'omit',
      headers    : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body       : JSON.stringify({
        sessionId,
        message     : 'Bonjour, je teste le webhook',
        timestamp   : new Date().toISOString(),
        channel     : 'linkedin',
        utm_source  : 'linkedin',
        utm_medium  : 'social',
        utm_campaign: 'test-console',
        source      : 'chatbot-site'
      })
    });
    const latency = Math.round(performance.now() - t0);
    console.log('Status :', res.status, '— Latence :', latency, 'ms');
    console.log('CORS    :', res.headers.get('access-control-allow-origin') || '(absent)');
    const data = await res.json().catch(() => ({}));
    console.log('Body    :', data);

    if (!res.ok)               ko('HTTP non-OK');
    else if (!data.response)   ko('Réponse sans champ "response"');
    else if (!data.sessionId)  ko('Réponse sans champ "sessionId"');
    else if (typeof data.leadComplet !== 'boolean') ko('"leadComplet" doit être un boolean');
    else                       ok('Contrat respecté { response, sessionId, leadComplet }');
  } catch (e) { ko('Fetch failed', e); }
  console.groupEnd();

  // ── Test 2 : Form ────────────────────────────────────────────────────────
  console.group('%c[2] Webhook formulaire', 'color:#F59E0B;font-weight:bold');
  try {
    const t0 = performance.now();
    const res = await fetch(LEAD_WEBHOOK, {
      method     : 'POST',
      mode       : 'cors',
      credentials: 'omit',
      headers    : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body       : JSON.stringify({
        prenom       : 'Test',
        nom          : 'Console',
        email        : 'test@abemaagency.com',
        telephone    : '0600000000',
        entreprise   : 'Test SARL',
        activite     : 'artisan',
        budget       : '100-300',
        besoin       : 'Test webhook depuis console',
        urgence      : '<1mois',
        source       : 'formulaire-contact',
        channel      : 'linkedin',
        utm_source   : 'linkedin',
        utm_medium   : 'social',
        utm_campaign : 'test-console',
        utm_content  : '',
        utm_term     : '',
        referrer     : document.referrer,
        landing_url  : window.location.href,
        page_url     : window.location.href,
        timestamp    : new Date().toISOString()
      })
    });
    const latency = Math.round(performance.now() - t0);
    console.log('Status :', res.status, '— Latence :', latency, 'ms');
    console.log('CORS    :', res.headers.get('access-control-allow-origin') || '(absent)');
    const data = await res.json().catch(() => ({}));
    console.log('Body    :', data);
    if (res.ok) ok('Webhook lead-qualification déclenché');
    else        ko('HTTP non-OK');
  } catch (e) { ko('Fetch failed', e); }
  console.groupEnd();

  // ── Test 3 : Préflight OPTIONS ───────────────────────────────────────────
  console.group('%c[3] Préflight CORS (OPTIONS)', 'color:#8b5cf6;font-weight:bold');
  for (const url of [CHAT_WEBHOOK, LEAD_WEBHOOK]) {
    try {
      const res = await fetch(url, {
        method : 'OPTIONS',
        headers: {
          'Origin'                       : 'https://www.abemaagency.com',
          'Access-Control-Request-Method' : 'POST',
          'Access-Control-Request-Headers': 'content-type'
        }
      });
      console.log(url.split('/').pop(), '→', res.status,
        '| origin:', res.headers.get('access-control-allow-origin') || '(absent)',
        '| methods:', res.headers.get('access-control-allow-methods') || '(absent)');
    } catch (e) { ko('OPTIONS ' + url, e); }
  }
  console.groupEnd();

  console.log('%cTests terminés. Vérifie les ✓ verts.', 'color:#22c55e;font-weight:bold');
})();

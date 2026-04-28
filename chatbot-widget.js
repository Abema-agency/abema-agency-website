// TODO: Remplacer WEBHOOK_URL par l'URL N8N réelle avant le déploiement en production
(function () {
  'use strict';

  // ── Config ───────────────────────────────────────────────────────────────
  var WEBHOOK_URL = 'https://n8n.abemaagency.com/webhook/chatbot-abema';
  var SESSION_KEY = 'abema_chat_session_id';
  var WELCOME_MSG = "Bonjour 👋 Je suis l'assistant IA d'ABEMA Agency. Je suis là pour vous aider à découvrir comment l'IA peut vous faire gagner du temps au quotidien. Vous avez une question ou vous souhaitez en savoir plus sur nos services ?";
  var REQUEST_TIMEOUT_MS = 30000;  // 30s
  var MAX_RETRIES        = 2;       // 1 essai + 2 retries = 3 tentatives
  var RETRY_BACKOFF_MS   = 1200;    // 1.2s, 2.4s

  // ── UTM / channel (lus 1 fois au load) ───────────────────────────────────
  function readTracking() {
    try {
      var p = new URLSearchParams(window.location.search);
      var stored = {};
      try { stored = JSON.parse(sessionStorage.getItem('abema_tracking') || '{}'); } catch (e) {}
      var t = {
        utm_source  : p.get('utm_source')   || stored.utm_source   || '',
        utm_medium  : p.get('utm_medium')   || stored.utm_medium   || '',
        utm_campaign: p.get('utm_campaign') || stored.utm_campaign || '',
        utm_content : p.get('utm_content')  || stored.utm_content  || '',
        utm_term    : p.get('utm_term')     || stored.utm_term     || '',
        referrer    : document.referrer     || stored.referrer     || '',
        landing_url : stored.landing_url    || window.location.href
      };
      t.channel = (t.utm_source || '').toLowerCase() === 'linkedin'
        ? 'linkedin'
        : (t.utm_source ? 'paid' : (t.referrer ? 'referral' : 'direct'));
      sessionStorage.setItem('abema_tracking', JSON.stringify(t));
      return t;
    } catch (e) {
      return { channel: 'direct' };
    }
  }
  var tracking = readTracking();

  // ── Session ID ───────────────────────────────────────────────────────────
  function getSessionId() {
    var id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  // ── Inject CSS ───────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#abema-chat-wrapper{position:fixed;bottom:20px;right:20px;z-index:9999;font-family:system-ui,-apple-system,sans-serif}',

    /* Bouton toggle 56px */
    '#abema-chat-toggle{width:56px;height:56px;border-radius:50%;background:#3b5bdb;border:none;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 4px 16px rgba(59,91,219,.4);transition:transform .2s ease,box-shadow .2s ease;padding:0}',
    '#abema-chat-toggle:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(59,91,219,.55)}',
    '#abema-chat-toggle:focus-visible{outline:3px solid #fff;outline-offset:2px}',

    /* Fenêtre 360×500 */
    '#abema-chat-window{position:absolute;bottom:68px;right:0;width:360px;height:500px;background:#fff;',
    'border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden}',
    '#abema-chat-window[hidden]{display:none}',

    /* Header */
    '#abema-chat-header{background:#3b5bdb;color:#fff;padding:14px 16px;display:flex;',
    'justify-content:space-between;align-items:center;font-weight:600;font-size:15px;flex-shrink:0}',
    '#abema-chat-close{background:transparent;border:none;color:#fff;cursor:pointer;font-size:20px;',
    'line-height:1;padding:0 4px;display:flex;align-items:center}',
    '#abema-chat-close:focus-visible{outline:2px solid #fff;border-radius:4px}',

    /* Zone messages */
    '#abema-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;',
    'gap:10px;scroll-behavior:smooth}',

    /* Bulles */
    '.abema-msg{max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;word-break:break-word}',
    '.abema-msg--user{align-self:flex-end;background:#3b5bdb;color:#fff;border-bottom-right-radius:4px}',
    '.abema-msg--bot{align-self:flex-start;background:#f1f3f5;color:#212529;border-bottom-left-radius:4px}',
    '.abema-msg--error{align-self:flex-start;background:#fff5f5;color:#c92a2a;border:1px solid #ffc9c9;border-bottom-left-radius:4px}',

    /* Wrapper bulle bot (bulle + speaker) */
    '.abema-msg-wrap{display:flex;flex-direction:column;align-self:flex-start;max-width:80%}',
    '.abema-msg-wrap .abema-msg--bot{align-self:stretch}',

    /* Bouton speaker sous chaque réponse bot */
    '.abema-speak-btn{align-self:flex-start;margin-top:3px;background:transparent;border:none;',
    'cursor:pointer;padding:2px 5px;border-radius:4px;color:#adb5bd;transition:color .15s;line-height:1}',
    '.abema-speak-btn:hover{color:#3b5bdb}',
    '.abema-speak-btn.is-speaking{color:#3b5bdb}',
    '.abema-speak-btn:focus-visible{outline:2px solid #3b5bdb;border-radius:4px}',

    /* Indicateur frappe */
    '.abema-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;align-self:flex-start}',
    '.abema-typing span{width:8px;height:8px;background:#adb5bd;border-radius:50%;animation:abema-bounce 1s infinite}',
    '.abema-typing span:nth-child(2){animation-delay:.15s}',
    '.abema-typing span:nth-child(3){animation-delay:.30s}',
    '@keyframes abema-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',

    /* Formulaire */
    '#abema-chat-form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #e9ecef;background:#fff;flex-shrink:0;align-items:center}',
    '#abema-chat-input{flex:1;border:1px solid #ced4da;border-radius:8px;padding:9px 12px;',
    'font-size:14px;outline:none;transition:border-color .15s;font-family:inherit}',
    '#abema-chat-input:focus{border-color:#3b5bdb;box-shadow:0 0 0 3px rgba(59,91,219,.15)}',

    /* Bouton micro */
    '#abema-chat-mic{width:36px;height:36px;background:transparent;border:1px solid #ced4da;',
    'border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'flex-shrink:0;transition:border-color .15s,background .15s;padding:0;color:#6c757d;position:relative}',
    '#abema-chat-mic:hover{background:#f8f9fa;border-color:#3b5bdb;color:#3b5bdb}',
    '#abema-chat-mic:focus-visible{outline:2px solid #3b5bdb;outline-offset:2px}',
    '#abema-chat-mic.is-recording{background:#fff1f1;border-color:#e03131;color:#e03131}',

    /* Cercle pulsant rouge quand micro actif */
    '@keyframes abema-pulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(1.6);opacity:0}100%{opacity:0}}',
    '#abema-chat-mic.is-recording::after{content:"";position:absolute;inset:0;border-radius:8px;',
    'border:2px solid #e03131;animation:abema-pulse 1.2s ease-out infinite;pointer-events:none}',

    /* Bouton envoyer */
    '#abema-chat-send{width:40px;height:40px;background:#3b5bdb;border:none;border-radius:8px;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;padding:0}',
    '#abema-chat-send:hover{background:#3451c7}',
    '#abema-chat-send:disabled{background:#adb5bd;cursor:not-allowed}',

    /* Mobile */
    '@media(max-width:420px){#abema-chat-window{width:calc(100vw - 32px);right:-8px}}'
  ].join('');
  document.head.appendChild(style);

  // ── Inject HTML ──────────────────────────────────────────────────────────
  var wrapper = document.createElement('div');
  wrapper.id = 'abema-chat-wrapper';
  wrapper.innerHTML = [
    '<button id="abema-chat-toggle"',
    '  aria-label="Ouvrir le chat"',
    '  aria-expanded="false"',
    '  aria-controls="abema-chat-window">',
    '  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '    <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white"/>',
    '  </svg>',
    '</button>',

    '<div id="abema-chat-window"',
    '  role="dialog"',
    '  aria-label="Assistant ABEMA"',
    '  aria-modal="true"',
    '  hidden>',

    '  <header id="abema-chat-header">',
    '    <span>Assistant ABEMA</span>',
    '    <button id="abema-chat-close" aria-label="Fermer le chat">&#x2715;</button>',
    '  </header>',

    '  <div id="abema-chat-messages" aria-live="polite" aria-atomic="false"></div>',

    '  <form id="abema-chat-form" autocomplete="off">',
    '    <button id="abema-chat-mic" type="button" aria-label="Dicter un message" title="Microphone">',
    '      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">',
    '        <rect x="9" y="2" width="6" height="11" rx="3"/>',
    '        <path d="M5 11a7 7 0 0014 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
    '        <line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    '        <line x1="9" y1="23" x2="15" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    '      </svg>',
    '    </button>',
    '    <input id="abema-chat-input" type="text"',
    '      placeholder="Votre message…"',
    '      aria-label="Saisir votre message"',
    '      maxlength="500" required />',
    '    <button id="abema-chat-send" type="submit" aria-label="Envoyer">',
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '        <path d="M2 21L23 12 2 3v7l15 2-15 2v7z" fill="white"/>',
    '      </svg>',
    '    </button>',
    '  </form>',
    '</div>'
  ].join('');
  document.body.appendChild(wrapper);

  // ── DOM refs ─────────────────────────────────────────────────────────────
  var toggle   = document.getElementById('abema-chat-toggle');
  var chatWin  = document.getElementById('abema-chat-window');
  var closeBtn = document.getElementById('abema-chat-close');
  var form     = document.getElementById('abema-chat-form');
  var input    = document.getElementById('abema-chat-input');
  var messages = document.getElementById('abema-chat-messages');
  var sendBtn  = document.getElementById('abema-chat-send');
  var micBtn   = document.getElementById('abema-chat-mic');

  var welcomeShown = false;

  // ── Lead data (accumulé au fil de la conversation) ───────────────────────
  var leadData = {
    prenom    : '',
    nom       : '',
    email     : '',
    telephone : '',
    entreprise: '',
    activite  : '',
    budget    : '',
    besoin    : '',
    urgence   : '',
    source    : 'chatbot-site'
  };

  // ── Speech API detection ─────────────────────────────────────────────────
  var hasSR = ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  var hasSS = ('speechSynthesis' in window);

  // ── Helpers ──────────────────────────────────────────────────────────────
  var SPEAKER_SVG = [
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">',
    '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>',
    '</svg>'
  ].join('');

  function addMessage(text, type) {
    var el = document.createElement('div');
    el.className = 'abema-msg abema-msg--' + type;
    el.textContent = text;

    if (type === 'bot') {
      var wrap = document.createElement('div');
      wrap.className = 'abema-msg-wrap';
      wrap.appendChild(el);

      if (hasSS) {
        var speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className = 'abema-speak-btn';
        speakBtn.setAttribute('aria-label', 'Lire la réponse à voix haute');
        speakBtn.title = 'Lire à voix haute';
        speakBtn.innerHTML = SPEAKER_SVG;
        speakBtn.addEventListener('click', function () { speakText(text, speakBtn); });
        wrap.appendChild(speakBtn);
      }

      messages.appendChild(wrap);
    } else {
      messages.appendChild(el);
    }

    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'abema-typing';
    el.id = 'abema-typing-indicator';
    el.setAttribute('aria-label', 'Assistant en train d\'écrire');
    el.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('abema-typing-indicator');
    if (el) el.remove();
  }

  // ── Synthèse vocale ───────────────────────────────────────────────────────
  function speakText(text, btn) {
    if (!hasSS) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btn.classList.remove('is-speaking');
      return;
    }
    var utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'fr-FR';
    utt.rate = 1;
    utt.onstart = function () { btn.classList.add('is-speaking'); };
    utt.onend = utt.onerror = function () { btn.classList.remove('is-speaking'); };
    window.speechSynthesis.speak(utt);
  }

  // ── Reconnaissance vocale ─────────────────────────────────────────────────
  var recognition = null;
  var isRecording = false;

  function initMic() {
    if (!hasSR) {
      micBtn.style.display = 'none';
      return;
    }

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function (e) {
      var transcript = e.results[0][0].transcript;
      input.value = transcript;
      stopRecording();
      // Auto-envoi après dictée
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    };

    recognition.onerror = function () { stopRecording(); };
    recognition.onend   = function () { if (isRecording) stopRecording(); };

    micBtn.addEventListener('click', function () {
      isRecording ? stopRecording() : startRecording();
    });
  }

  function startRecording() {
    isRecording = true;
    micBtn.classList.add('is-recording');
    micBtn.setAttribute('aria-label', 'Arrêter la dictée');
    try { recognition.start(); } catch (e) { stopRecording(); }
  }

  function stopRecording() {
    isRecording = false;
    micBtn.classList.remove('is-recording');
    micBtn.setAttribute('aria-label', 'Dicter un message');
    try { recognition.stop(); } catch (e) {}
  }

  initMic();

  // ── Ouvrir / fermer ──────────────────────────────────────────────────────
  function openChat() {
    chatWin.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fermer le chat');
    if (!welcomeShown) {
      addMessage(WELCOME_MSG, 'bot');
      welcomeShown = true;
    }
    input.focus();
  }

  function closeChat() {
    chatWin.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le chat');
    if (isRecording) stopRecording();
    if (hasSS) window.speechSynthesis.cancel();
    toggle.focus();
  }

  toggle.addEventListener('click', function () {
    chatWin.hidden ? openChat() : closeChat();
  });

  closeBtn.addEventListener('click', closeChat);

  // Focus trap + Echap
  chatWin.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeChat(); return; }
    if (e.key !== 'Tab') return;
    var focusable = chatWin.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  // ── Fetch avec timeout + retry x2 ────────────────────────────────────────
  function sendWithRetry(payload, attempt) {
    attempt = attempt || 0;
    var controller = new AbortController();
    var timeoutId  = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);

    return fetch(WEBHOOK_URL, {
      method     : 'POST',
      mode       : 'cors',
      credentials: 'omit',
      headers    : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      signal     : controller.signal,
      body       : JSON.stringify(payload)
    })
    .then(function (res) {
      clearTimeout(timeoutId);
      if (!res.ok) {
        var err = new Error('HTTP ' + res.status);
        err.status = res.status;
        throw err;
      }
      return res.text().then(function (raw) {
        if (!raw || !raw.trim()) return {};
        try { return JSON.parse(raw); } catch (e) { return { response: raw }; }
      });
    })
    .catch(function (err) {
      clearTimeout(timeoutId);
      var retryable = (err.name === 'AbortError') ||
                      (typeof err.status !== 'number') ||
                      (err.status >= 500 && err.status < 600);
      if (retryable && attempt < MAX_RETRIES) {
        return new Promise(function (resolve) {
          setTimeout(resolve, RETRY_BACKOFF_MS * (attempt + 1));
        }).then(function () {
          return sendWithRetry(payload, attempt + 1);
        });
      }
      throw err;
    });
  }

  // ── Conversation libre — N8N gère le flow et collecte les infos ──────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    addMessage(text, 'user');
    showTyping();

    var payload = {
      sessionId   : getSessionId(),
      message     : text,
      timestamp   : new Date().toISOString(),
      prenom      : leadData.prenom,
      nom         : leadData.nom,
      email       : leadData.email,
      telephone   : leadData.telephone,
      entreprise  : leadData.entreprise,
      activite    : leadData.activite,
      budget      : leadData.budget,
      besoin      : leadData.besoin,
      urgence     : leadData.urgence,
      source      : leadData.source,
      channel     : tracking.channel,
      utm_source  : tracking.utm_source,
      utm_medium  : tracking.utm_medium,
      utm_campaign: tracking.utm_campaign,
      utm_content : tracking.utm_content,
      utm_term    : tracking.utm_term,
      referrer    : tracking.referrer,
      landing_url : tracking.landing_url,
      page_url    : window.location.href
    };

    sendWithRetry(payload)
      .then(function (d) {
        hideTyping();
        if (d.lead && typeof d.lead === 'object') {
          Object.keys(leadData).forEach(function (k) {
            if (d.lead[k] !== undefined && d.lead[k] !== null) leadData[k] = d.lead[k];
          });
        }
        // Contrat n8n attendu : { response, sessionId, leadComplet }
        var reply = d.response || d.output || d.message || d.text;
        if (reply) addMessage(reply, 'bot');
        if (d.leadComplet === true) {
          input.placeholder = 'Merci ! Un conseiller vous recontacte sous 24h.';
          input.disabled = true;
          sendBtn.disabled = true;
          return;
        }
      })
      .catch(function (err) {
        hideTyping();
        addMessage('Une erreur est survenue. Veuillez réessayer dans un instant.', 'error');
        console.error('[ABEMA chat]', err);
      })
      .finally(function () {
        if (input.disabled && input.placeholder.indexOf('conseiller') === -1) {
          input.disabled = false;
          sendBtn.disabled = false;
          input.focus();
        }
      });
  });

})();

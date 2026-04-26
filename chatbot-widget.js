// TODO: Remplacer WEBHOOK_URL par l'URL N8N réelle avant le déploiement en production
(function () {
  'use strict';

  // ── Config ───────────────────────────────────────────────────────────────
  var WEBHOOK_URL = 'https://placeholder-n8n.abemaagency.com/webhook/chat';
  var SESSION_KEY = 'abema_chat_session_id';
  var WELCOME_MSG = 'Bonjour ! Je suis l’assistant ABEMA. Comment puis-je vous aider ?';

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
    '#abema-chat-wrapper{position:fixed;bottom:24px;right:24px;z-index:9999;font-family:system-ui,-apple-system,sans-serif}',

    /* Bouton 56px */
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

    /* Indicateur frappe */
    '.abema-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;align-self:flex-start}',
    '.abema-typing span{width:8px;height:8px;background:#adb5bd;border-radius:50%;animation:abema-bounce 1s infinite}',
    '.abema-typing span:nth-child(2){animation-delay:.15s}',
    '.abema-typing span:nth-child(3){animation-delay:.30s}',
    '@keyframes abema-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',

    /* Formulaire */
    '#abema-chat-form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #e9ecef;background:#fff;flex-shrink:0}',
    '#abema-chat-input{flex:1;border:1px solid #ced4da;border-radius:8px;padding:9px 12px;',
    'font-size:14px;outline:none;transition:border-color .15s;font-family:inherit}',
    '#abema-chat-input:focus{border-color:#3b5bdb;box-shadow:0 0 0 3px rgba(59,91,219,.15)}',
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

  var welcomeShown = false;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function addMessage(text, type) {
    var el = document.createElement('div');
    el.className = 'abema-msg abema-msg--' + type;
    el.textContent = text;
    messages.appendChild(el);
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

  // ── Envoi webhook N8N ────────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    addMessage(text, 'user');
    showTyping();

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId : getSessionId(),
        message   : text,
        timestamp : new Date().toISOString()
      })
    })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      hideTyping();
      var reply = data.output || data.message || data.text || 'Réponse reçue.';
      addMessage(reply, 'bot');
    })
    .catch(function (err) {
      hideTyping();
      addMessage('Erreur de connexion. Réessaie dans un instant.', 'error');
      console.error('[ABEMA chat]', err);
    })
    .finally(function () {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    });
  });

})();

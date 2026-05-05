// ABEMA — endpoint Claude proxy, durci pour la prod
// - Origin allowlist
// - Rate-limit IP en mémoire (best-effort, suffisant à l'échelle TPE)
// - Validation taille des messages
// - max_tokens et model verrouillés serveur

const ALLOWED_ORIGINS = new Set([
  'https://www.abemaagency.com',
  'https://abemaagency.com',
  'https://abema-agency-website.vercel.app',
]);

const MAX_BODY_BYTES = 16 * 1024;       // 16 KB par requête
const MAX_MESSAGES = 20;                 // pas plus de 20 tours
const MAX_MESSAGE_CHARS = 4000;          // pas plus de 4000 car/message
const MAX_SYSTEM_CHARS = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;     // 1 min
const RATE_LIMIT_MAX = 12;               // 12 req/min/IP

const buckets = new Map();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
  if (now > b.reset) { b.count = 0; b.reset = now + RATE_LIMIT_WINDOW_MS; }
  b.count += 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  return b.count <= RATE_LIMIT_MAX;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function bodySize(body) {
  try { return Buffer.byteLength(JSON.stringify(body || {}), 'utf8'); } catch { return 0; }
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const ip = getClientIp(req);
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (bodySize(req.body) > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  const { messages, system } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'Invalid messages' });
  }
  if (typeof system !== 'string' || system.length === 0 || system.length > MAX_SYSTEM_CHARS) {
    return res.status(400).json({ error: 'Invalid system' });
  }
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (typeof m.content !== 'string' || m.content.length === 0 || m.content.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: 'Invalid content' });
    }
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfigured' });

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        system,
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error' });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream unavailable' });
  }
}

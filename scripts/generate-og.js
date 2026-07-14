/**
 * Génère les images Open Graph du site (1200×630, JPEG qualité 85).
 * Usage : node scripts/generate-og.js
 * Dépendance : sharp (devDependency).
 *
 * Les réseaux sociaux (Facebook, LinkedIn, WhatsApp, X) ne supportent pas
 * le SVG en og:image — on rend donc un SVG en vrai JPEG binaire.
 */
const sharp = require('sharp');
const path = require('path');

const ACCENT = '#F59E0B'; // --color-brand-amber (index.html :root)

function buildSvg({ subtitle }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="80" y="150" width="72" height="8" fill="${ACCENT}"/>
  <text x="80" y="290" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="bold" fill="#ffffff" letter-spacing="2">ABEMA AGENCY</text>
  <text x="80" y="375" font-family="Arial, Helvetica, sans-serif" font-size="36" fill="#d1d5db">${subtitle}</text>
  <text x="80" y="510" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="${ACCENT}">Hauts-de-France &#183; D&#232;s 99&#8364;/mois</text>
</svg>`;
}

const images = [
  {
    file: 'og-home.jpg',
    subtitle: 'Agent IA vocal pour TPE — Opérationnel en 48h',
  },
  {
    file: 'og-blog.jpg',
    subtitle: 'Blog — Automatisation IA &amp; agents vocaux pour TPE',
  },
];

(async () => {
  for (const { file, subtitle } of images) {
    const out = path.join(__dirname, '..', file);
    await sharp(Buffer.from(buildSvg({ subtitle })))
      .jpeg({ quality: 85 })
      .toFile(out);
    const meta = await sharp(out).metadata();
    console.log(`${file}: ${meta.format} ${meta.width}x${meta.height}`);
  }
})();

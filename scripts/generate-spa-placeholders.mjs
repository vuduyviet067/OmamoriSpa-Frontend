// Generates 13 placeholder JPEG files for public/images/spa/.
//
// Uses `sharp` (already present in node_modules) to convert a per-image
// SVG into a real, browser-decodable JPEG. Each placeholder is a soft
// spa-palette gradient with a warm-gold bottom band and a centred
// "OMAMORI" wordmark plus a one-word subtitle so the homepage reads as a
// branded layout instead of a wireframe.
//
// This script is one-shot and idempotent — run it once after cloning:
//
//     node scripts/generate-spa-placeholders.mjs
//
// It does not modify package.json, has no runtime impact on the app, and
// the only side effect is writing 13 JPEGs into public/images/spa/.

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', 'public', 'images', 'spa');

// ---------------------------------------------------------------------------
// Palette — soft spa tones. Each entry produces a branded placeholder that
// reads as "spa" rather than as a wireframe.
// ---------------------------------------------------------------------------
const targets = [
  { path: 'hero-spa.jpg',              bg: '#FCF8F0', accent: '#567A64', gold: '#C9A959', label: 'OMAMORI',   sub: 'spa',         w: 1200, h: 1500 },
  { path: 'services/massage.jpg',      bg: '#F6F0E4', accent: '#789678', gold: '#C9A959', label: 'MASSAGE',   sub: 'body',        w:  900, h:  900 },
  { path: 'services/facial.jpg',       bg: '#FAF6EE', accent: '#B49E8A', gold: '#C9A959', label: 'FACIAL',    sub: 'care',        w:  900, h:  900 },
  { path: 'services/hot-stone.jpg',    bg: '#EEE2D0', accent: '#946E52', gold: '#C9A959', label: 'STONE',     sub: 'therapy',     w:  900, h:  900 },
  { path: 'services/head-spa.jpg',     bg: '#F2ECDE', accent: '#829676', gold: '#C9A959', label: 'HEAD',      sub: 'spa',         w:  900, h:  900 },
  { path: 'cosmetics/serum.jpg',       bg: '#FAF7F0', accent: '#B4A88E', gold: '#C9A959', label: 'SERUM',     sub: 'restore',     w:  900, h:  900 },
  { path: 'cosmetics/moisturizer.jpg', bg: '#F6F2E8', accent: '#C8BCA8', gold: '#C9A959', label: 'CREAM',     sub: 'moisture',    w:  900, h:  900 },
  { path: 'cosmetics/lavender-oil.jpg',bg: '#F4EEF8', accent: '#9482AE', gold: '#C9A959', label: 'LAVENDER',  sub: 'oil',         w:  900, h:  900 },
  { path: 'cosmetics/detox-mask.jpg',  bg: '#FAF6F0', accent: '#ACA090', gold: '#C9A959', label: 'MASK',      sub: 'detox',       w:  900, h:  900 },
  { path: 'therapists/ha-linh.jpg',    bg: '#F4EEE4', accent: '#B69884', gold: '#C9A959', label: 'HA LINH',   sub: 'therapist',   w:  900, h:  900 },
  { path: 'therapists/thao-vy.jpg',    bg: '#F2ECE2', accent: '#AE9480', gold: '#C9A959', label: 'THAO VY',   sub: 'therapist',   w:  900, h:  900 },
  { path: 'therapists/minh-anh.jpg',   bg: '#F0EAE0', accent: '#AC8E7A', gold: '#C9A959', label: 'MINH ANH',  sub: 'therapist',   w:  900, h:  900 },
  { path: 'therapists/khanh-chi.jpg',  bg: '#F6F0E6', accent: '#BC9E8A', gold: '#C9A959', label: 'KHANH CHI', sub: 'therapist',   w:  900, h:  900 },
];

function buildSvg(t) {
  const { w, h, bg, accent, gold, label, sub } = t;
  const stripeY = h - Math.round(h * 0.06);
  const accentTopY = Math.round(h * 0.30);
  const accentBotY = Math.round(h * 0.62);
  const accentMid = (accentTopY + accentBotY) / 2;
  const accentHalf = (accentBotY - accentTopY) / 2;
  const steps = 16;
  const accentStops = [];
  for (let i = 0; i < steps; i++) {
    const y0 = accentTopY + Math.round((accentBotY - accentTopY) * (i / steps));
    const y1 = accentTopY + Math.round((accentBotY - accentTopY) * ((i + 1) / steps));
    const dy = Math.abs(((y0 + y1) / 2) - accentMid) / accentHalf;
    const t01 = Math.max(0, 1 - dy * 0.85);
    accentStops.push(
      `  <stop offset="${(i / steps).toFixed(3)}" stop-color="${bg}" stop-opacity="${(1 - t01).toFixed(3)}"/>` +
      `  <stop offset="${((i + 1) / steps).toFixed(3)}" stop-color="${accent}" stop-opacity="${t01.toFixed(3)}"/>`
    );
  }
  const accentGrad = `
  <linearGradient id="g" x1="0" y1="${accentTopY}" x2="0" y2="${accentBotY}" gradientUnits="userSpaceOnUse">
${accentStops.join('\n')}
  </linearGradient>`;
  const labelSize = Math.round(Math.min(w, h) * 0.07);
  const subSize = Math.round(labelSize * 0.42);
  const cx = w / 2;
  const cy = h / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${accentGrad}
  </defs>
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <rect x="0" y="${accentTopY}" width="${w}" height="${accentBotY - accentTopY}" fill="url(#g)"/>
  <rect x="0" y="${stripeY}" width="${w}" height="${h - stripeY}" fill="${gold}"/>
  <text x="${cx}" y="${cy}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${labelSize}" fill="#2D5A4A" letter-spacing="6"
        font-weight="500">${label}</text>
  <text x="${cx}" y="${cy + labelSize * 0.95}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${subSize}" fill="#6E6E6E" letter-spacing="3"
        font-style="italic">${sub}</text>
</svg>`;
}

mkdirSync(root, { recursive: true });
let count = 0;
let bytes = 0;
for (const t of targets) {
  const svg = buildSvg(t);
  const out = await sharp(Buffer.from(svg))
    .jpeg({ quality: 82, mozjpeg: false, chromaSubsampling: '4:4:4' })
    .toBuffer();
  const dest = resolve(root, t.path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, out);
  count++;
  bytes += out.length;
  process.stdout.write(`  ${t.path.padEnd(36)} ${(out.length / 1024).toFixed(1).padStart(7)} kB\n`);
}
console.log(`\nWrote ${count} placeholder JPEGs (${(bytes / 1024).toFixed(1)} kB total) into ${root}`);

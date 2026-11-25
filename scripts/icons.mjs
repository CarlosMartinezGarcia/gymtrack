// Genera los iconos PNG de la app a partir de un SVG (requiere sharp): node scripts/icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = join(new URL('..', import.meta.url).pathname, 'public/icons');
mkdirSync(out, { recursive: true });

// Disco de 20 kg visto de frente: anillo azul, borde exterior más oscuro y orificio central.
const svg = (pad, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="#161a20"/>
  <g transform="translate(256 256) scale(${(512 - pad * 2) / 512})">
    <circle r="200" fill="#2f6fe0"/>
    <circle r="182" fill="#4d8df7"/>
    <circle r="120" fill="none" stroke="#2f6fe0" stroke-width="10"/>
    <circle r="62" fill="#c9d2dc"/>
    <circle r="38" fill="#161a20"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg(24, 112))).resize(512).png().toFile(join(out, 'icon-512.png'));
await sharp(Buffer.from(svg(24, 112))).resize(192).png().toFile(join(out, 'icon-192.png'));
await sharp(Buffer.from(svg(70, 0))).resize(512).png().toFile(join(out, 'icon-maskable-512.png'));
await sharp(Buffer.from(svg(30, 0))).resize(180).png().toFile(join(out, 'apple-touch-icon.png'));
console.log('Iconos generados en public/icons');

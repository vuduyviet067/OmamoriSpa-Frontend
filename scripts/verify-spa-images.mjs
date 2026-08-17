// Verifies the generated JPEG files: checks SOI / EOI markers and dimensions.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('public/images/spa');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.jpe?g$/i.test(name)) out.push(p);
  }
  return out.sort();
}

function parseSOF(buf) {
  // Walk markers until we hit SOF0 / SOF2.
  let i = 2; // skip SOI
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) return null;
    let marker = buf[i + 1];
    while (marker === 0xff) { i++; marker = buf[i + 1]; }
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
    const segLen = (buf[i + 2] << 8) | buf[i + 3];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = (buf[i + 5] << 8) | buf[i + 6];
      const w = (buf[i + 7] << 8) | buf[i + 8];
      return { w, h, components: buf[i + 9] };
    }
    i += 2 + segLen;
  }
  return null;
}

let bad = 0;
for (const file of walk(root)) {
  const buf = readFileSync(file);
  const soi = buf[0] === 0xff && buf[1] === 0xd8;
  const eoi = buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
  const sof = parseSOF(buf);
  const ok = soi && eoi && sof;
  const rel = file.slice(root.length + 1).padEnd(36);
  const dims = sof ? `${sof.w}x${sof.h} comps=${sof.components}` : 'NO-SOF';
  console.log(`  ${rel}  ${ok ? 'OK' : 'BAD'}  SOI=${soi} EOI=${eoi}  ${dims}  (${buf.length} bytes)`);
  if (!ok) bad++;
}
console.log(`\n${bad === 0 ? 'All JPEG files look structurally valid.' : `${bad} files failed structural validation.`}`);
process.exit(bad === 0 ? 0 : 1);

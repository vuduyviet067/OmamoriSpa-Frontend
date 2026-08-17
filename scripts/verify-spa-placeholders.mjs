// Quick sanity check for the generated placeholders.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'D:/Vibe/FE/public/images/spa';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.jpg')) out.push(p);
  }
  return out;
}

let ok = 0;
let bad = 0;
for (const p of walk(root)) {
  const b = readFileSync(p);
  const soi = b[0] === 0xff && b[1] === 0xd8;
  const eoi = b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9;
  const hasSof = b.includes(0xc0) || b.includes(0xc2);
  const rel = p.replace(root, '').replace(/\\/g, '/');
  const status = soi && eoi ? 'OK' : 'BAD';
  if (soi && eoi) ok++; else bad++;
  console.log(`${status.padEnd(3)} ${rel.padEnd(40)} ${b.length} B  SOI=${soi} EOI=${eoi} SOF=${hasSof}`);
}
console.log(`\nTotal OK=${ok}  BAD=${bad}`);
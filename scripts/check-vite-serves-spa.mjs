// Hit Vite with HEAD requests to confirm all spa images are served.
const urls = [
  'http://localhost:3001/images/spa/hero-spa.jpg',
  'http://localhost:3001/images/spa/services/massage.jpg',
  'http://localhost:3001/images/spa/services/facial.jpg',
  'http://localhost:3001/images/spa/services/hot-stone.jpg',
  'http://localhost:3001/images/spa/services/head-spa.jpg',
  'http://localhost:3001/images/spa/cosmetics/serum.jpg',
  'http://localhost:3001/images/spa/cosmetics/moisturizer.jpg',
  'http://localhost:3001/images/spa/cosmetics/lavender-oil.jpg',
  'http://localhost:3001/images/spa/cosmetics/detox-mask.jpg',
  'http://localhost:3001/images/spa/therapists/ha-linh.jpg',
  'http://localhost:3001/images/spa/therapists/thao-vy.jpg',
  'http://localhost:3001/images/spa/therapists/minh-anh.jpg',
  'http://localhost:3001/images/spa/therapists/khanh-chi.jpg',
];

for (const u of urls) {
  try {
    const r = await fetch(u, { method: 'HEAD' });
    const len = r.headers.get('content-length');
    const type = r.headers.get('content-type');
    console.log(`${r.status} ${type.padEnd(11)} ${len.padStart(5)} B   ${u.replace('http://localhost:3001', '')}`);
  } catch (e) {
    console.log(`ERR  ${u}  ${e.message}`);
  }
}
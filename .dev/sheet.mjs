import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
const require = createRequire('/home/user/lotos/.dev/');
const { chromium } = require('playwright-core');
process.env.LD_LIBRARY_PATH = '/tmp/al2023/lib';

const pages = readdirSync('/home/user/lotos/site').filter((f) => f.endsWith('.html')).sort();
const order = [
  'index.html', 'products.html', 'product-qajar.html', 'process.html', 'quality.html', 'about.html',
  'vision.html', 'wholesale.html', 'shipping.html', 'export.html', 'custom.html', 'partners.html',
  'gallery.html', 'faq.html', 'contact.html', 'sitemap.html', '404.html',
];
const sorted = [...order.filter((p) => pages.includes(p)), ...pages.filter((p) => !order.includes(p))];

const b = await chromium.launch({
  executablePath: '/tmp/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
const p = await ctx.newPage();

const shots = [];
for (const f of sorted) {
  await p.goto(`http://localhost:4173/${f}`, { waitUntil: 'load' });
  await p.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in'));
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    for (const sc of document.querySelectorAll('*')) {
      if (sc.clientWidth > 0 && sc.scrollWidth > sc.clientWidth + 4) {
        const max = -(sc.scrollWidth - sc.clientWidth);
        for (let x = 0; x >= max; x -= sc.clientWidth * 0.9) {
          sc.scrollLeft = x;
          await new Promise((r) => setTimeout(r, 60));
        }
      }
    }
    window.scrollTo(0, 0);
  });
  await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(450);
  const name = f.replace('.html', '');
  await p.screenshot({ path: `/home/user/lotos/design/shots/${name}.png` });
  shots.push(name);
}
console.log('✓ ' + shots.length + ' تصویر گرفته شد');
await b.close();

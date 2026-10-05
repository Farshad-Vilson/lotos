/**
 * ممیزی جامع سایت چینی لوتوس
 * ------------------------------------------------------------------
 * هر صفحه را در چند عرض و مقیاس مختلف باز می‌کند و بررسی می‌کند:
 *   - سرریز افقی (scrollWidth > clientWidth)
 *   - خطای کنسول و درخواست‌های ناموفق
 *   - تصاویر شکسته
 *   - عناصری که از لبهٔ راست/چپ بیرون زده‌اند
 *   - اندازهٔ هدف لمسی روی موبایل
 *   - کیفیت انتخاب تصویر رسپانسیو (srcset)
 *
 * اجرا:  node .dev/audit.mjs
 */
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const require = createRequire('/home/user/lotos/.dev/');
const { chromium } = require('playwright-core');

// ─ آماده‌سازی کرومیوم ────────────────────────────────────────────
const BIN = '/home/user/lotos/.dev/node_modules/@sparticuz/chromium/bin';
if (!existsSync('/tmp/chromium') || !existsSync('/tmp/al2023')) {
  const extract = (src, out) => {
    if (existsSync(`/tmp/${out}`)) return;
    const buf = brotliDecompressSync(readFileSync(src));
    const tmp = `/tmp/${out}.tar`;
    writeFileSync(tmp, buf);
    execFileSync('tar', ['-xf', tmp, '-C', '/tmp']);
  };
  extract(`${BIN}/al2023.tar.br`, 'al2023');
  extract(`${BIN}/chromium.br`, 'chromium');
  chmodSync('/tmp/chromium', 0o755);
}
process.env.LD_LIBRARY_PATH = '/tmp/al2023/lib';

const BASE = process.env.BASE || 'http://localhost:4173';

/**
 * عرض‌ها و مقیاس‌ها (deviceScaleFactor) واقعی:
 *   - ۳۲۰ : آیفون SE نسل اول و موبایل‌های قدیمی
 *   - ۳۶۰/۳۹۰/۴۳۰ : رایج‌ترین موبایل‌ها
 *   - ۷۶۸ : تبلت عمودی (iPad)
 *   - ۸۲۰ : تبلت افقی کوچک
 *   - ۱۰۲۴ : تبلت افقی / لپ‌تاپ کوچک
 *   - ۱۲۸۰/۱۳۶۶/۱۴۴۰ : لپ‌تاپ
 *   - ۱۶۰۰/۱۹۲۰ : دسکتاپ و نمایشگر عریض
 *   - ۲۵۶۰ : نمایشگر رتینا و ۴K
 *   - مقیاس ۲ و ۳ روی موبایل برای بررسی تصاویر رتینا
 */
const VIEWPORTS = [
  { name: 'موبایل ۳۲۰', w: 320, h: 568, dsf: 2, touch: true },
  { name: 'موبایل ۳۶۰', w: 360, h: 780, dsf: 3, touch: true },
  { name: 'موبایل ۳۹۰', w: 390, h: 844, dsf: 3, touch: true },
  { name: 'موبایل ۴۳۰', w: 430, h: 932, dsf: 2, touch: true },
  { name: 'تبلت ۷۶۸', w: 768, h: 1024, dsf: 2, touch: true },
  { name: 'تبلت ۸۲۰', w: 820, h: 1180, dsf: 2, touch: true },
  { name: 'تبلت افقی ۱۰۲۴', w: 1024, h: 768, dsf: 2, touch: false },
  { name: 'لپ‌تاپ ۱۲۸۰', w: 1280, h: 800, dsf: 1, touch: false },
  { name: 'لپ‌تاپ ۱۳۶۶', w: 1366, h: 768, dsf: 1, touch: false },
  { name: 'دسکتاپ ۱۴۴۰', w: 1440, h: 900, dsf: 2, touch: false },
  { name: 'دسکتاپ ۱۶۰۰', w: 1600, h: 900, dsf: 1, touch: false },
  { name: 'عریض ۱۹۲۰', w: 1920, h: 1080, dsf: 1, touch: false },
  { name: 'رتینا ۲۵۶۰', w: 2560, h: 1440, dsf: 2, touch: false },
];

const pages = readdirSync('/home/user/lotos/site')
  .filter((f) => f.endsWith('.html'))
  .sort();

const browser = await chromium.launch({
  executablePath: '/tmp/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none'],
});

const problems = [];
let checks = 0;

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.dsf,
    isMobile: vp.touch,
    hasTouch: vp.touch,
  });

  for (const file of pages) {
    const page = await ctx.newPage();
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160));
    });
    page.on('requestfailed', (r) => {
      if (r.url().startsWith('data:')) return;
      failedRequests.push(`${r.url().replace(BASE, '')} — ${r.failure()?.errorText}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400) failedRequests.push(`${r.url().replace(BASE, '')} — HTTP ${r.status()}`);
    });

    try {
      await page.goto(`${BASE}/${file}`, { waitUntil: 'load', timeout: 30000 });

      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 70));
        }
        // اسکرولرهای افقی: باید داخل دید بیایند تا lazy-load فعال شود.
        // در RTL مقدار scrollLeft منفی می‌شود.
        const scrollers = [...document.querySelectorAll('*')].filter(
          (sc) => sc.clientWidth > 0 && sc.scrollWidth > sc.clientWidth + 4
        );
        for (const sc of scrollers) {
          sc.scrollIntoView({ block: 'center' });
          await new Promise((r) => setTimeout(r, 500));
          const max = -(sc.scrollWidth - sc.clientWidth);
          for (let x = 0; x >= max; x -= sc.clientWidth * 0.75) {
            sc.scrollLeft = x;
            await new Promise((r) => setTimeout(r, 300));
          }
          sc.scrollLeft = max;
          await new Promise((r) => setTimeout(r, 300));
        }
        await new Promise((r) => setTimeout(r, 600));
        window.scrollTo(0, 0);
      });

      await page
        .waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(150);

      const res = await page.evaluate(() => {
        const de = document.documentElement;
        const overflowX = de.scrollWidth - de.clientWidth;

        const vw = de.clientWidth;
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
          if (el.closest('[aria-hidden="true"]')) continue;
          let scroller = el.parentElement;
          let inScroller = false;
          while (scroller && scroller !== document.body) {
            const sc = getComputedStyle(scroller);
            if (
              (sc.overflowX === 'auto' || sc.overflowX === 'scroll' || sc.overflowX === 'hidden') &&
              scroller.scrollWidth > scroller.clientWidth + 1
            ) {
              inScroller = true;
              break;
            }
            scroller = scroller.parentElement;
          }
          if (inScroller) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (cs.position === 'absolute' || cs.position === 'fixed') continue;
          if (r.right > vw + 2 || r.left < -2) {
            if (cs.overflow === 'visible' || cs.overflow === 'visible visible') {
              out.push(
                `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} (left=${Math.round(
                  r.left
                )}, right=${Math.round(r.right)}, vw=${vw})`
              );
            }
          }
        }

        const brokenImgs = [...document.querySelectorAll('img')]
          .filter((i) => i.src && i.naturalWidth === 0 && i.offsetParent !== null)
          .map((i) => i.getAttribute('src'));

        const smallTargets = [];
        for (const el of document.querySelectorAll('a, button, [role="button"], input, select')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (el.closest('[aria-hidden="true"]') || el.closest('.drawer:not(.is-open)')) continue;
          if (r.height < 32 || r.width < 32) {
            const label = (el.textContent || '').trim().slice(0, 24) || el.tagName.toLowerCase();
            smallTargets.push(`${label} (${Math.round(r.width)}×${Math.round(r.height)})`);
          }
        }

        // تصاویری که نسخهٔ رسپانسیو ندارند (به‌جز نشان برند و لایت‌باکس)
        const noSrcset = [...document.querySelectorAll('img[src*="media/"]')]
          .filter((i) => !i.hasAttribute('srcset') && !/\/brand\/mark/.test(i.getAttribute('src')))
          .map((i) => i.getAttribute('src'));

        return {
          overflowX,
          out: [...new Set(out)].slice(0, 6),
          brokenImgs: [...new Set(brokenImgs)],
          smallTargets: [...new Set(smallTargets)].slice(0, 5),
          noSrcset: [...new Set(noSrcset)],
        };
      });

      checks++;
      if (res.overflowX > 1)
        problems.push(`[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — سرریز افقی ${res.overflowX}px`);
      if (res.out.length)
        problems.push(`[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — بیرون‌زدگی: ${res.out.join(' | ')}`);
      if (res.brokenImgs.length)
        problems.push(`[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — تصویر شکسته: ${res.brokenImgs.join(', ')}`);
      if (res.noSrcset.length)
        problems.push(`[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — بدون srcset: ${res.noSrcset.join(', ')}`);
      if (consoleErrors.length)
        problems.push(`[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — خطای کنسول: ${consoleErrors.join(' | ')}`);
      if (failedRequests.length)
        problems.push(
          `[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — درخواست ناموفق: ${[...new Set(failedRequests)].join(', ')}`
        );
      if (vp.touch && res.smallTargets.length)
        problems.push(`[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — هدف لمسی کوچک: ${res.smallTargets.join(', ')}`);
    } catch (e) {
      problems.push(`[${vp.name} ${vp.w}px@${vp.dsf}x] ${file} — خطای بارگذاری: ${e.message.slice(0, 120)}`);
    }
    await page.close();
  }
  await ctx.close();
  process.stdout.write(`  ✓ ${vp.name} — ${vp.w}px @${vp.dsf}x — ${pages.length} صفحه\n`);
}

await browser.close();

console.log(`\n${'─'.repeat(60)}`);
console.log(`مجموع بررسی: ${checks}`);
if (!problems.length) {
  console.log('✅ هیچ مشکلی پیدا نشد');
} else {
  console.log(`⚠️  ${problems.length} مورد:\n`);
  for (const p of problems) console.log('  • ' + p);
}
process.exit(problems.length ? 1 : 0);

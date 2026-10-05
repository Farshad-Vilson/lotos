#!/usr/bin/env node
/**
 * ابزار توسعه (خارج از خروجی سایت) — عکس‌برداری از صفحه‌ها با کرومیوم همراه.
 *   node .dev/shot.mjs <url> <out.png> [w] [h] [--full] [--fonts] [--scroll] [--selector=..]
 */
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const BIN = new URL('./node_modules/@sparticuz/chromium/bin/', import.meta.url).pathname;
const LIB = '/tmp/al2023';
const EXE = '/tmp/chromium';
const LIBPATH = `${LIB}/lib`;

if (!existsSync(`${LIBPATH}/libnss3.so`)) {
  mkdirSync(LIB, { recursive: true });
  writeFileSync('/tmp/al2023.tar', zlib.brotliDecompressSync(readFileSync(`${BIN}al2023.tar.br`)));
  execFileSync('tar', ['-xf', '/tmp/al2023.tar', '-C', LIB]);
}
if (!existsSync(EXE)) {
  writeFileSync(EXE, zlib.brotliDecompressSync(readFileSync(`${BIN}chromium.br`)), { mode: 0o700 });
}
process.env.LD_LIBRARY_PATH = LIBPATH;

const [url, out, w = '1440', h = '900'] = process.argv.slice(2);
const flags = process.argv.slice(5).filter((a) => a.startsWith('--'));
const has = (n) => flags.some((f) => f === `--${n}` || f.startsWith(`--${n}=`));
const val = (n, d) => {
  const f = flags.find((x) => x.startsWith(`--${n}=`));
  return f ? f.split('=').slice(1).join('=') : d;
};

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--hide-scrollbars', '--force-color-profile=srgb'],
});

const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: +val('dsf', '2'),
});

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
page.on('requestfailed', (r) => errors.push(`404/FAIL ${r.url()}`));

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
if (has('fonts')) await page.evaluate(() => document.fonts.ready);
const wait = +val('wait', '700');
if (wait) await page.waitForTimeout(wait);

if (has('scroll')) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior='auto';const step = window.innerHeight * 0.7;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
}

const sel = val('selector', null);
if (sel) await page.locator(sel).first().screenshot({ path: out });
else await page.screenshot({ path: out, fullPage: has('full') });

const meta = await page.evaluate(() => ({
  h: document.body.scrollHeight,
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1 ? document.documentElement.scrollWidth : 0,
}));
console.log(`shot: ${out} height=${meta.h}px overflowX=${meta.overflow || 'none'} errors=${errors.length}`);
if (errors.length) console.log(errors.slice(0, 10).join('\n'));
await browser.close();

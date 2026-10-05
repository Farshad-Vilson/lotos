#!/usr/bin/env node
/** آزمون تعاملی سایت — منو، پرسش‌ها، گالری، فرم و لینک‌ها. */
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
process.env.LD_LIBRARY_PATH = '/tmp/al2023/lib';

const BASE = 'http://localhost:4173';
const results = [];
const ok = (name, pass, extra = '') => results.push(`${pass ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch({
  executablePath: '/tmp/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

/* ---------- ۱. موبایل: منوی کشویی ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const burgerVisible = await page.locator('#burger').isVisible();
  ok('موبایل: دکمهٔ منو دیده می‌شود', burgerVisible);

  await page.locator('#burger').click();
  await page.waitForTimeout(400);
  const drawerOpen = await page.locator('#drawer.is-open').isVisible();
  ok('موبایل: کشوی منو باز می‌شود', drawerOpen);
  const lock = await page.evaluate(() => document.body.classList.contains('is-locked'));
  ok('موبایل: اسکرول قفل می‌شود', lock);

  const linkCount = await page.locator('#drawer .drawer__nav a').count();
  ok('موبایل: پیوندهای منو', linkCount === 6, `${linkCount} پیوند`);

  await page.locator('#drawerClose').click();
  await page.waitForTimeout(400);
  ok('موبایل: کشو بسته می‌شود', !(await page.locator('#drawer.is-open').count()));
  await page.close();
}

/* ---------- ۲. دسکتاپ: آکاردئون، گالری، گالری محصول ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });

  // پرسش‌های متداول
  const firstQ = page.locator('.faq__item').first();
  await firstQ.locator('.faq__q').click();
  await page.waitForTimeout(500);
  const expanded = await firstQ.locator('.faq__q').getAttribute('aria-expanded');
  const answerH = await firstQ.locator('.faq__a p').boundingBox();
  ok('پرسش‌ها: باز و بسته می‌شود', expanded === 'true' && answerH.height > 0, `aria=${expanded}`);

  // لینک‌های ناوبری
  const navHrefs = await page.locator('.nav__link').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  ok('ناوبری: ۶ پیوند', navHrefs.length === 6, navHrefs.join(' '));

  // فرم واتساپ — window.open را می‌گیریم (شبکهٔ بیرونی در سندباکس بسته است)
  const capture = async () => {
    await page.evaluate(() => {
      window.__opened = null;
      window.open = (url) => { window.__opened = url; return null; };
    });
  };

  await page.goto(BASE + '/wholesale.html', { waitUntil: 'load' });
  await capture();
  await page.fill('#w-name', 'آزمون');
  await page.fill('#w-phone', '09120000000');
  await page.fill('#w-city', 'تهران');
  await page.locator('form[data-inquiry] button[type=submit]').click();
  await page.waitForTimeout(300);
  const waUrl = (await page.evaluate(() => window.__opened)) || '';
  ok('فرم: واتساپ باز می‌شود', waUrl.startsWith('https://wa.me/989138900700'), waUrl.slice(0, 52) + '…');
  const decoded = decodeURIComponent(waUrl);
  ok('فرم: نام در متن هست', decoded.includes('آزمون'));
  ok('فرم: شهر در متن هست', decoded.includes('تهران'));
  ok('فرم: شماره در متن هست', decoded.includes('09120000000'));

  // اعتبارسنجی: فرم خالی
  await page.goto(BASE + '/custom.html', { waitUntil: 'load' });
  await capture();
  await page.locator('form[data-inquiry] button[type=submit]').click();
  await page.waitForTimeout(300);
  const empty = await page.evaluate(() => window.__opened);
  ok('فرم: با فیلد خالی ارسال نمی‌شود', !empty);
  const invalid = await page.locator('#c-name').getAttribute('aria-invalid');
  ok('فرم: فیلد خالی نشانه‌گذاری می‌شود', invalid === 'true', `aria-invalid=${invalid}`);

  // گالری کارگاه + جعبهٔ نور
  await page.goto(BASE + '/gallery.html', { waitUntil: 'load' });
  await page.locator('.gallery__item').first().click();
  await page.waitForTimeout(500);
  ok('گالری: جعبهٔ نور باز می‌شود', await page.locator('#lightbox.is-open').isVisible());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  ok('گالری: با Esc بسته می‌شود', !(await page.locator('#lightbox.is-open').count()));

  // فیلتر گالری کارگاه
  await page.goto(BASE + '/gallery.html', { waitUntil: 'load' });
  const allCount = await page.locator('.gallery__item:not(.is-hidden)').count();
  await page.locator('.filterbar__btn[data-filter="fire"]').click();
  await page.waitForTimeout(400);
  const fireCount = await page.locator('.gallery__item:not(.is-hidden)').count();
  const selected = await page.locator('.filterbar__btn[data-filter="fire"]').getAttribute('aria-selected');
  ok('گالری: فیلتر کار می‌کند', allCount > fireCount && fireCount > 0 && selected === 'true', `همه ${allCount} → پخت و لعاب ${fireCount}`);
  await page.locator('.filterbar__btn[data-filter="all"]').click();
  await page.waitForTimeout(400);
  const backCount = await page.locator('.gallery__item:not(.is-hidden)').count();
  ok('گالری: بازگشت به همه', backCount === allCount, `${backCount} تصویر`);

  // نوار مراحل فرآیند
  await page.goto(BASE + '/process.html', { waitUntil: 'load' });
  const stepLinks = await page.locator('.stepnav__link').count();
  ok('فرآیند: نوار ۱۱ مرحله', stepLinks === 11, `${stepLinks} مرحله`);
  const stepCards = await page.locator('.sflow').count();
  ok('فرآیند: ۱۱ کارت مرحله', stepCards === 11, `${stepCards} کارت`);
  const phases = await page.locator('.phase').count();
  ok('فرآیند: ۳ فاز', phases === 3, `${phases} فاز`);
  const checksTotal = await page.locator('.sflow__checks li').count();
  ok('فرآیند: چک‌لیست هر مرحله', checksTotal >= 22, `${checksTotal} مورد بازبینی`);

  // گالری محصول
  await page.goto(BASE + '/product-nastaliq.html', { waitUntil: 'load' });
  const thumbs = await page.locator('.pgallery__thumb').count();
  ok('محصول: نوار تصاویر', thumbs === 12, `${thumbs} تصویر`);
  const srcBefore = await page.locator('#pgMainImg').getAttribute('src');
  await page.locator('.pgallery__thumb').nth(3).click();
  await page.waitForTimeout(300);
  const srcAfter = await page.locator('#pgMainImg').getAttribute('src');
  ok('محصول: تغییر تصویر اصلی', srcBefore !== srcAfter, srcAfter.split('/').pop());

  await page.close();
}

/* ---------- ۳. بررسی همهٔ صفحه‌ها: خطای ۴۰۴ و سرریز افقی ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // فهرست صفحه‌ها از خروجی ساخت خوانده می‌شود تا با افزودن صفحهٔ تازه،
  // بررسی خودبه‌خود کامل بماند.
  const files = readdirSync(new URL('../site', import.meta.url))
    .filter((f) => f.endsWith('.html'))
    .sort();

  let failures = 0;
  const problems = [];

  for (const file of files) {
    const bad = [];
    const handler = (r) => {
      if (r.status() >= 400) bad.push(`${r.status()} ${r.url().split('/').pop()}`);
    };
    page.on('response', handler);
    await page.goto(`${BASE}/${file}`, { waitUntil: 'load' });
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      h1: document.querySelectorAll('h1').length,
      title: (document.title || '').slice(0, 40),
      imgsBroken: [...document.images]
        .filter((i) => i.id !== 'lightboxImg' && i.getAttribute('src') && i.complete && i.naturalWidth === 0)
        .map((i) => i.src.split('/').pop()),
    }));

    if (bad.length) problems.push(`${file}: ${bad.join(' | ')}`);
    if (info.overflow > 2) problems.push(`${file}: سرریز افقی ${info.overflow}px`);
    if (info.imgsBroken.length) problems.push(`${file}: تصویر شکسته ${info.imgsBroken.join(',')}`);
    if (info.h1 === 0) problems.push(`${file}: بدون h1`);
    if (!info.title) problems.push(`${file}: بدون عنوان`);
    if (bad.length || info.overflow > 2 || info.imgsBroken.length || info.h1 === 0 || !info.title) failures++;

    page.off('response', handler);
  }

  ok(`بررسی ${files.length} صفحه`, failures === 0, failures ? `${failures} صفحه مشکل دارد` : 'بی‌ایراد');
  problems.slice(0, 20).forEach((p) => console.log('   ·', p));
  await page.close();
}

console.log('\n' + results.join('\n'));
const failed = results.filter((r) => r.startsWith('✗')).length;
console.log(`\n${failed ? '✗ ' + failed + ' آزمون ناموفق' : '✓ همهٔ آزمون‌ها موفق'}`);

await browser.close();
process.exit(failed ? 1 : 0);

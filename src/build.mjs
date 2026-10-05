/**
 * سازندهٔ سایت چینی لوتوس
 * ---------------------------------------------------------------
 *   node src/build.mjs
 *
 * خروجی در پوشهٔ `site/` ساخته می‌شود. همهٔ صفحه‌ها از دادهٔ
 * `src/data/site.mjs` و `src/data/products.mjs` ساخته می‌شوند.
 */
import { mkdir, writeFile, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  site,
  wa,
  tel,
  nav,
  footerGroups,
  pillars,
  reasons,
  faqs,
  saleTerms,
  wholesaleAudience,
} from './data/site.mjs';
import {
  processPhases,
  processSteps,
  productionMethods,
  qualityStations,
  qualityCriteria,
} from './data/process.mjs';
import {
  collabPatterns,
  cooperationSteps,
  cooperationModels,
  wholesaleNeeds,
  customSteps,
  customOptions,
  exportSteps,
  milestones,
  galleryFilters,
  galleryItems,
} from './data/business.mjs';
import { products, bySlug } from './data/products.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// ─ نسخهٔ دارایی‌ها ───────────────────────────────────────────────
// هش محتوای css و js؛ با هر تغییر آدرس عوض می‌شود تا مرورگر
// نتواند نسخهٔ کش‌شدهٔ قدیمی را سرو کند.
// اندازه‌های نمایش تصویر — برای انتخاب درست نسخهٔ رسپانسیو
const CARD_SIZES = '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 33vw';
const WIDE_SIZES = '(max-width: 1024px) 92vw, 46vw';
const FULL_SIZES = '(max-width: 1024px) 100vw, 55vw';

// نشانی عمومی سایت — برای canonical، og:url و sitemap
const SITE_URL = 'https://lotusporcelain.ir';

const ASSET_V = (() => {
  const h = createHash('sha1');
  for (const f of ['assets/css/main.css', 'assets/js/app.js']) {
    try { h.update(readFileSync(join(__dirname, '..', 'src', f))); } catch {}
  }
  return h.digest('hex').slice(0, 8);
})();

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'site');

/* ================================================================
   ابزارهای کمکی
   ================================================================ */

/** تبدیل ارقام لاتین به فارسی. */
const fa = (value) =>
  String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

/** درج ارقام فارسی در متنی که ممکن است عدد داشته باشد. */
const T = (value) => fa(value);

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const abs = (path) => `${site.en ? '' : ''}${path}`;

/* ================================================================
   آیکون‌ها
   ================================================================ */
const ICONS = {
  phone: '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.6 3.6a1 1 0 0 1-.25 1z"/>',
  whatsapp:
    '<path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2m0 1.9a8.1 8.1 0 0 1 0 16.2 8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 0 1 12 3.9m-3 4c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1s1 2.4 1.1 2.6c.1.2 1.9 3 4.6 4.1 2.3.9 2.7.8 3.2.7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3l-.5-.3-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.1-.2-.1-.4 0-.5l.5-.6.3-.6v-.5l-.8-1.8c-.2-.5-.4-.4-.5-.4z"/>',
  mail: '<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1m1.4 2L12 12.3 19.6 7zM4 8.5V17h16V8.5l-8 5.2z"/>',
  instagram:
    '<path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.2 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2m0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.44-1.3.83-.4.4-.6.8-.8 1.3-.2.4-.4 1-.4 2.1C2.6 9.9 2.6 10.3 2.6 12s0 2.1.1 3.3c0 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .4 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1 0 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.4-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.4-2.1-.4-1.2-.1-1.6-.1-4.7-.1m0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8m0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4m6.2-8.3a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0"/>',
  pin: '<path d="M12 2a7.5 7.5 0 0 1 7.5 7.5c0 5.2-6.4 11.6-6.7 11.9a1.1 1.1 0 0 1-1.6 0C11 21.1 4.5 14.7 4.5 9.5A7.5 7.5 0 0 1 12 2m0 2a5.5 5.5 0 0 0-5.5 5.5c0 3.4 3.7 7.9 5.5 9.8 1.8-1.9 5.5-6.4 5.5-9.8A5.5 5.5 0 0 0 12 4m0 2.6a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8"/>',
  clock: '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m1 3v4.6l3 1.8-1 1.7-4-2.4V7z"/>',
  arrow: '<path d="M11.3 4.3 18 11H4v2h14l-6.7 6.7 1.4 1.4L21.4 12 12.7 3.3z"/>',
  arrowLeft: '<path d="M12.7 3.3 4 12l8.7 8.7 1.4-1.4L7.8 13H20v-2H7.8l6.3-6.3z"/>',
  drop: '<path d="M12 2s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9 12 2 12 2m0 3.6c-1.6 2-4.5 5.9-4.5 7.9a4.5 4.5 0 0 0 9 0c0-2-2.9-5.9-4.5-7.9"/>',
  flame:
    '<path d="M12 2c.6 3.2 2.3 5 4 6.8 2 2.1 3 3.9 3 6.2A7 7 0 0 1 5 15c0-2.1.8-3.6 1.9-5 .3.9.9 1.6 1.7 2 .4-3.3 1.9-6.3 3.4-10m0 5.2c-1 2-1.6 3.6-1.7 5.3a1 1 0 0 1-1.8.5 3 3 0 0 1-.8-1.3A5.6 5.6 0 0 0 7 15a5 5 0 0 0 10 0c0-1.6-.7-3-2.2-4.7-.5-.5-1-1.1-1.5-1.7z"/>',
  shield:
    '<path d="M12 2 4 5v7c0 4.6 3.4 8.7 8 10 4.6-1.3 8-5.4 8-10V5zm0 2.1 6 2.2V12a8 8 0 0 1-6 7.8 8 8 0 0 1-6-7.8V6.3zm-1 3.4-3 3 1.4 1.4L11 10.4l3.6 3.6 1.4-1.4-5-5z"/>',
  truck:
    '<path d="M2 5h11a1 1 0 0 1 1 1v2h3.3a1 1 0 0 1 .8.4l3 4a1 1 0 0 1 .2.6V17a1 1 0 0 1-1 1h-2a3 3 0 0 1-6 0H9a3 3 0 0 1-6 0H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1m1 2v9h.2a3 3 0 0 1 5.6 0H14V7zm12 3v5h.2a3 3 0 0 1 5.6 0H20v-3.4L17.6 10zM6 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>',
  box: '<path d="m12 2 9 5v10l-9 5-9-5V7zm0 2.2L5.6 7.8 12 11.3l6.4-3.5zM5 9.4v6.8l6 3.3v-6.8zm8 10.1 6-3.3V9.4l-6 3.3z"/>',
  spark: '<path d="M12 2c.6 3.1 1.4 4.9 2.6 6.1S17.6 10 21 10.6c-3.3.6-5.2 1.3-6.4 2.5S12.6 16 12 19c-.6-3.1-1.4-4.8-2.6-6S6.4 11.2 3 10.6c3.4-.6 5.2-1.4 6.4-2.6S11.4 5.1 12 2"/>',

  grid: '<path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z"/>',
  download:
    '<path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4L11 12.2zm-6 14h14v2H5z"/>',
  check: '<path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 8.2 19 6.8z"/>',
};

/**
 * آیکون‌های خطی — برای فرم‌هایی که با پرکردن (fill) درست خوانده نمی‌شوند.
 * (کرهٔ زمین، کارخانه و نماد همکاری)
 */
const STROKE_ICONS = {
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><ellipse cx="12" cy="12" rx="4.1" ry="9"/>`,
  factory: `<path d="M3 20V9.4l5 3v-3l5 3v-6l8-3V20z"/><path d="M3 20h18"/><path d="M7.4 16.4h2.4M13 16.4h2.4"/>`,
  handshake: `<circle cx="9" cy="12" r="5.8"/><circle cx="15" cy="12" r="5.8"/>`,
  shieldCheck: `<path d="M12 3 5 5.6V11c0 4.3 3 8.2 7 9.4 4-1.2 7-5.1 7-9.4V5.6z"/><path d="m9 11.6 2.2 2.2L15.4 9.6"/>`,
};

const icon = (name, cls = '') => {
  if (STROKE_ICONS[name]) {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STROKE_ICONS[name]}</svg>`;
  }
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[name] || ''}</svg>`;
};

/* ================================================================
   اجزای مشترک
   ================================================================ */

const brandMark = (cls = 'brand__mark', src = 'media/brand/mark-140.webp') =>
  `<img class="${cls}" src="${src}" alt="" width="34" height="37" aria-hidden="true">`;

function brandBlock({ tagline = true } = {}) {
  return `<a class="brand" href="index.html" aria-label="${site.fa} — ${site.tagline}">
      ${brandMark()}
      <span class="brand__name">
        <span class="brand__fa">${site.fa}</span>
        <span class="brand__en">${site.en}</span>
      </span>
    </a>`;
}

function header(current) {
  const links = nav
    .map(
      (item) =>
        `<a class="nav__link" href="${item.href}"${
          current === item.href ? ' aria-current="page"' : ''
        }>${item.label}</a>`
    )
    .join('');

  return `<header class="head" id="siteHead">
  <div class="wrap head__bar">
    ${brandBlock()}
    <nav class="nav" aria-label="منوی اصلی">${links}</nav>
    <div class="head__actions">
      <a class="btn btn--sm btn--outline" href="${wa('سلام، برای دریافت کاتالوگ و استعلام قیمت با شما تماس گرفتم.')}" target="_blank" rel="noopener">
        ${icon('whatsapp', 'btn__ico')} واتساپ
      </a>
      <a class="btn btn--sm btn--solid" href="wholesale.html">همکاری عمده</a>
      <button class="burger" id="burger" aria-label="باز کردن منو" aria-expanded="false" aria-controls="drawer"><span></span></button>
    </div>
  </div>
</header>`;
}

function drawer(current) {
  const links = nav
    .map((i) => `<a href="${i.href}"${current === i.href ? ' aria-current="page"' : ''}>${i.label}</a>`)
    .join('');
  return `<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="منوی سایت" hidden>
  <div class="drawer__top">
    ${brandBlock()}
    <button class="drawer__close" id="drawerClose" aria-label="بستن منو">✕</button>
  </div>
  <nav class="drawer__nav" aria-label="منوی موبایل">${links}</nav>
  <div class="drawer__cta">
    <a class="btn btn--solid btn--lg" href="${tel}">${icon('phone', 'btn__ico')} تماس تلفنی ${site.phoneFa}</a>
    <a class="btn btn--outline btn--lg" href="${wa('سلام، برای همکاری با چینی لوتوس پیام می‌دهم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} گفت‌وگو در واتساپ</a>
  </div>
</div>`;
}

function footer() {
  const groups = footerGroups
    .map(
      (g) => `<div>
      <h4>${g.title}</h4>
      <div class="foot__links">
        ${g.links.map((l) => `<a href="${l.href}">${l.label}</a>`).join('')}
      </div>
    </div>`
    )
    .join('');

  return `<footer class="foot">
  <div class="wrap">
    <div class="foot__grid">
      <div class="foot__brand">
        ${brandBlock()}
        <p class="foot__about">تولیدکنندهٔ قوری و ظروف چینی در اصفهان؛ از سال ${site.foundingYearFa} با تمرکز بر کیفیت، طراحی کاربردی و تأمین سفارش‌های عمده در سراسر ایران.</p>
        <div class="foot__contact">
          <div>${icon('pin')}<span>${site.addressWorkshop}</span></div>
          <div>${icon('pin')}<span>${site.addressOffice} <span class="muted">(دفتر فروش)</span></span></div>
          <a href="${tel}">${icon('phone')}<span>${site.phoneFa}</span></a>
          <a href="${wa('سلام، برای همکاری با چینی لوتوس پیام می‌دهم.')}" target="_blank" rel="noopener">${icon('whatsapp')}<span>واتساپ: ${site.phoneFa}</span></a>
          <div>${icon('clock')}<span>ساعات کاری: ${site.hours}</span></div>
        </div>
      </div>
      ${groups}
    </div>
    <div class="foot__bottom">
      <span>© تمامی حقوق برای ${site.fa} محفوظ است.</span>
      <span class="foot__slogan">${site.fa}؛ ${site.tagline}</span>
      <span><a href="sitemap.html">نقشهٔ سایت</a> · ${site.en} — ${T('Isfahan, Iran')}</span>
    </div>
  </div>
</footer>`;
}

function dock() {
  return `<nav class="dock" aria-label="دسترسی سریع">
  <a href="${tel}">${icon('phone')} تماس</a>
  <a href="${wa('سلام، برای دریافت کاتالوگ و استعلام قیمت پیام می‌دهم.')}" target="_blank" rel="noopener">${icon('whatsapp')} واتساپ</a>
  <a href="products.html">${icon('grid')} طرح‌ها</a>
</nav>`;
}

function lightbox() {
  return `<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="نمایش تصویر" hidden>
  <button class="lightbox__close" id="lightboxClose" aria-label="بستن">✕</button>
  <img id="lightboxImg" alt="">
  <div class="lightbox__cap" id="lightboxCap"></div>
</div>`;
}

/* ================================================================
   بلوک‌های محتوا
   ================================================================ */

const eyebrow = (text) => `<p class="eyebrow">${text}</p>`;

function secHead({ kicker, title, lead, center = false, rule = false }) {
  return `<div class="sec-head${center ? ' sec-head--center' : ''} reveal">
    ${kicker ? eyebrow(kicker) : ''}
    <h2 class="h1">${title}</h2>
    ${lead ? `<p class="lead mt-6">${lead}</p>` : ''}
    ${rule ? '<div class="sec-head__rule"></div>' : ''}
  </div>`;
}

/** کارت یک طرح. */
function productCard(p, { delay = 0 } = {}) {
  return `<a class="card reveal" href="product-${p.slug}.html" data-delay="${delay}">
    <div class="card__media">
      <img src="${p.images[0]}" alt="${escapeHtml(p.name)} — ${escapeHtml(p.summary)}" loading="lazy" width="1100" height="821"${srcAttrs(p.images[0], CARD_SIZES)}>
      <span class="card__badge">${p.sku}</span>
    </div>
    <div class="card__body">
      <div class="card__top">
        <h3>${p.name}</h3>
        <span class="sku">${p.motif}</span>
      </div>
      <p class="card__sum">${p.summary}</p>
      <div class="card__foot">
        <span class="muted">${p.colors.join(' · ')}</span>
        <span class="card__more">جزئیات طرح</span>
      </div>
    </div>
  </a>`;
}

/** قهرمان — صحنهٔ لایه‌لایه: کارخانه در پشت، محصول در جلو.
    هر عکس در نسبت طبیعی خودش می‌ماند تا هیچ قوری‌ای بریده نشود. */
function hero() {
  const factory = 'media/process/lotus-process-03.webp';
  const product = 'media/products/lotus-qajar-01.jpg';

  return `<section class="hero3">
  <div class="hero3__copy">
    <p class="eyebrow reveal">چینی لوتوس · اصفهان · از ${site.foundingYearFa}</p>
    <h1 class="hero3__title reveal" data-delay="1">چینی لوتوس؛<em>تولید با نگاه به کیفیت، زیبایی و ماندگاری</em></h1>
    <p class="hero3__text reveal" data-delay="2">چینی لوتوس با تمرکز بر تولید قوری و متعلقات مرتبط با سرو و پذیرایی، فعالیت خود را با هدف ارائهٔ محصولاتی با کیفیت، طراحی کاربردی و پاسخ‌گو به نیاز بازار آغاز کرده است. امروز با تکیه بر تجربهٔ تولید، شناخت بازار و توان تأمین سفارش‌های عمده، محصولات خود را به مشتریان و همکاران در سراسر ایران عرضه می‌کنیم و در مسیر توسعهٔ بازارهای صادراتی نیز گام برمی‌داریم.</p>

    <div class="hero3__actions reveal" data-delay="3">
      <a class="btn btn--solid btn--lg" href="products.html">${icon('grid', 'btn__ico')} مشاهدهٔ محصولات</a>
      <a class="btn btn--outline btn--lg" href="wholesale.html">${icon('handshake', 'btn__ico')} همکاری عمده</a>
    </div>

    <div class="hero__meta reveal" data-delay="4">
      <span><b>۱۵</b> طرح قوری</span>
      <span><b>${site.experienceFa}</b> تجربهٔ تولید</span>
      <span><b>سراسر ایران</b> تأمین و ارسال</span>
      <span><b>صادرات</b> آمادهٔ همکاری</span>
    </div>
  </div>

  <div class="hero3__stage reveal" data-delay="2">
    <div class="hero3__factory">
      <img src="${factory}" alt="سالن تولید چینی لوتوس؛ ردیف بدنه‌های قوری در کنار کورهٔ پخت" width="1100" height="522" fetchpriority="high">

      <p class="hero3__badge">
        <span class="hero3__spark" aria-hidden="true"></span>
        سالن تولید چینی لوتوس — اصفهان
      </p>

      <figure class="hero3__product">
        <img src="${product}" alt="قوری چینی لوتوس، طرح قاجار" width="1100" height="821" loading="lazy"${srcAttrs(product, '(max-width: 620px) 100vw, 275px')}>
        <figcaption><span>طرح قاجار</span><span>LT-01</span></figcaption>
      </figure>
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------
   نوار پخت — امضای سایت: چهار حالت ماده
   --------------------------------------------------------------- */
function fireBand() {
  const stages = [
    { n: '۰۱', title: 'خاکِ خام', desc: 'مواد اولیه، بی‌شکل و بی‌رنگ', cls: 'raw' },
    { n: '۰۲', title: 'شکل‌گرفته', desc: 'بدنه فرم می‌گیرد، هنوز خام است', cls: 'formed' },
    { n: '۰۳', title: 'آتش', desc: 'کوره؛ جایی که خاک، چینی می‌شود', cls: 'fire' },
    { n: '۰۴', title: 'چینی', desc: 'سپید، لعاب‌خورده و ماندگار', cls: 'glazed' },
  ];

  return `<section class="fireband" aria-label="مسیر تبدیل خاک به چینی">
  <div class="fireband__track">
    ${stages
      .map(
        (s) => `<div class="fb fb--${s.cls}">
      <span class="fb__n">${s.n}</span>
      <div>
        <div class="fb__title">${s.title}</div>
        <div class="fb__desc">${s.desc}</div>
      </div>
    </div>`
      )
      .join('')}
  </div>
</section>`;
}

/** «در یک نگاه». */
function pillarsSection() {
  return `<section class="sec sec--paper" id="at-a-glance">
  <div class="wrap">
    ${secHead({
      kicker: 'در یک نگاه',
      title: 'چینی لوتوس در یک نگاه',
      lead: 'پنج اصل که مسیر تولید و همکاری ما را مشخص می‌کند.',
    })}
    <div class="pillars">
      ${pillars
        .map(
          (p) => `<article class="pillar reveal">
        <span class="pillar__n">${p.n}</span>
        <h3>${p.title}</h3>
        <p>${p.text}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/** دربارهٔ کوتاه در صفحهٔ اصلی. */
function aboutTeaser() {
  return `<section class="sec sec--clay" id="about-teaser">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        ${eyebrow('دربارهٔ چینی لوتوس')}
        <h2 class="h1">هر محصولی که از یک کارگاه تولیدی خارج می‌شود، پشت خود داستانی از تجربه، تلاش و دقت دارد.</h2>
        <div class="prose mt-6">
          <p>چینی لوتوس فعالیت خود را در سال ${site.foundingYearFa} در شهر اصفهان آغاز کرد. این مجموعه از ابتدا با تمرکز بر تولید محصولات چینی به روش ریخته‌گری فعالیت خود را توسعه داد و در طول سال‌های فعالیت، با شناخت دقیق‌تر نیاز بازار و افزایش تجربه در تولید، مسیر رشد خود را ادامه داد.</p>
          <p>امروز چینی لوتوس با تکیه بر ${site.experienceFa} تجربه، توان تولید و شبکهٔ فروش و توزیع، محصولات خود را در اختیار مشتریان و همکاران در سراسر ایران قرار می‌دهد.</p>
          <p>تمرکز ما تنها بر تولید یک محصول نیست؛ بلکه تلاش می‌کنیم محصولی تولید کنیم که از نظر ظاهر، کاربرد، کیفیت و قابلیت عرضه در بازار پاسخ‌گوی نیاز مشتری باشد.</p>
        </div>
        <div class="cluster mt-7">
          <a class="btn btn--outline" href="about.html">${icon('arrow', 'btn__ico')} ادامهٔ داستان چینی لوتوس</a>
          <a class="btn btn--copper" href="vision.html">چشم‌انداز ما</a>
        </div>
      </div>
      <div class="sticky-media reveal" data-delay="2">
        <figure class="figure figure--tall">
          <img  src="media/workshop/lotus-workshop-05.webp" alt="سالن خشک کردن بدنه‌های قوری در کارگاه چینی لوتوس" loading="lazy" width="1100" height="522" srcset="media/workshop/lotus-workshop-05-550.webp 550w, media/workshop/lotus-workshop-05-800.webp 800w, media/workshop/lotus-workshop-05.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>کارگاه چینی لوتوس — اصفهان</span><span>${site.foundingYearFa}</span></figcaption>
        </figure>
        <div class="stats mt-6">
          <div class="stat"><div class="stat__v">${site.foundingYearFa}</div><div class="stat__k">سال آغاز فعالیت</div></div>
          <div class="stat"><div class="stat__v">${site.experienceFa}</div><div class="stat__k">سال تجربهٔ تولید</div></div>
          <div class="stat"><div class="stat__v">۱۵</div><div class="stat__k">طرح قوری فعال</div></div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/** طرح‌های شاخص. */
function featuredProducts({ limit = 8 } = {}) {
  const featured = products.filter((p) => p.featured).slice(0, limit);
  return `<section class="sec sec--paper" id="featured">
  <div class="wrap">
    <div class="sec-head reveal" style="max-width:none">
      <div class="cluster" style="justify-content:space-between;align-items:flex-end">
        <div>
          <div class="sec-head--ghost">
            <span class="ghost-num" aria-hidden="true">۱۵</span>
            ${eyebrow('محصولات')}
            <h2 class="h1">طرح‌های قوری چینی لوتوس</h2>
          </div>
          <p class="lead mt-6" style="max-width:56ch">طرح‌ها با تمرکز بر نیاز بازار و کاربرد واقعی طراحی و تولید می‌شوند؛ از نقش‌های سپید و برجسته تا گل‌وبوتهٔ رنگی، کتیبهٔ خوشنویسی و نوارهای زرین.</p>
        </div>
        <a class="btn btn--outline" href="products.html">همهٔ ۱۵ طرح ${icon('arrowLeft', 'btn__ico')}</a>
      </div>
      <div class="sec-head__rule"></div>
    </div>
    <div class="grid-products grid-products--stagger">
      ${featured.map((p, i) => productCard(p, { delay: (i % 4) + 1 })).join('')}
    </div>
  </div>
</section>`;
}

/** فرآیند تولید — ریل افقی روی زمینهٔ تیره. */
function processTeaser() {
  return `<section class="sec kiln" id="process-teaser">
  <div class="wrap">
    <div class="sec-head reveal">
      ${eyebrow('فرآیند تولید')}
      <h2 class="h1">از مواد اولیه تا محصول نهایی</h2>
      <p class="lead mt-6">هر محصول چینی لوتوس مسیر مشخصی را طی می‌کند تا از مرحلهٔ آماده‌سازی مواد اولیه به محصول نهایی برسد؛ یازده مرحلهٔ تعریف‌شده که کیفیت در هر یک از آن‌ها بررسی می‌شود.</p>
    </div>
    <div class="rail" id="processRail">
      ${processSteps
        .map(
          (s) => `<div class="rail__item reveal">
        <img src="${s.image}" alt="${escapeHtml(s.alt)}" loading="lazy" width="1100" height="522"${srcAttrs(s.image, WIDE_SIZES)}>
        <div class="rail__cap"><b>${s.n}</b><span>${s.title}</span></div>
      </div>`
        )
        .join('')}
    </div>
    <div class="cluster mt-7">
      <a class="btn btn--light" href="process.html">${icon('factory', 'btn__ico')} مشاهدهٔ کامل یازده مرحله</a>
      <a class="btn btn--ghost-light" href="quality.html">${icon('shield', 'btn__ico')} کنترل کیفیت</a>
    </div>
  </div>
</section>`;
}

/** کیفیت. */
function qualitySection() {
  return `<section class="sec sec--paper" id="quality">
  <div class="wrap">
    <div class="split">
      <div class="reveal">
        ${eyebrow('کنترل کیفیت')}
        <h2 class="h1">کیفیت، بخشی از فرآیند تولید است</h2>
        <div class="prose mt-6">
          <p>در چینی لوتوس، کیفیت محصول تنها در پایان فرآیند تولید بررسی نمی‌شود. تلاش مجموعه بر این است که در تمامی مراحل مختلف تولید، کیفیت محصولات با دقت بررسی شده و محصول نهایی پیش از بسته‌بندی و ارسال در چند مرحله بررسی شود.</p>
          <p>کنترل ظاهر، سلامت محصول، کیفیت سطح، یکنواختی تولید و شرایط بسته‌بندی، از جمله مواردی هستند که در فرآیند کنترل کیفیت مورد توجه قرار می‌گیرند.</p>
          <p><strong>هدف چینی لوتوس، ارائهٔ محصولی است که مشتری با اطمینان آن را خریداری، عرضه و استفاده کند.</strong></p>
        </div>
        <ul class="list-check mt-7">
          <li>کنترل مواد اولیه و آماده‌سازی پیش از شکل‌دهی</li>
          <li>بازرسی بدنه پس از خشک شدن و پیش از پخت</li>
          <li>کنترل کیفیت سطح و لعاب پس از پخت نهایی</li>
          <li>بررسی ظاهر، سلامت و یکنواختی پیش از بسته‌بندی</li>
        </ul>
        <div class="mt-7"><a class="btn btn--outline" href="quality.html">${icon('arrow', 'btn__ico')} جزئیات کنترل کیفیت</a></div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/workshop/quality-control.webp" alt="بررسی کیفیت قوری‌های چینی در کارگاه چینی لوتوس" loading="lazy" width="1100" height="922" srcset="media/workshop/quality-control-550.webp 550w, media/workshop/quality-control-800.webp 800w, media/workshop/quality-control.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>بررسی بدنه و سطح محصول</span><span>کنترل کیفیت</span></figcaption>
        </figure>
        <figure class="figure figure--wide mt-6">
          <img  src="media/workshop/glaze-stage.webp" alt="اجرای لعاب روی بدنه‌های قوری چینی لوتوس" loading="lazy" width="1100" height="547" srcset="media/workshop/glaze-stage-550.webp 550w, media/workshop/glaze-stage-800.webp 800w, media/workshop/glaze-stage.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>اجرای لعاب پیش از پخت نهایی</span><span>مرحلهٔ ۰۶</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`;
}

/** فروش عمده. */
function wholesaleSection({ long = false } = {}) {
  return `<section class="sec ${long ? 'sec--clay' : 'sec--clay'}" id="wholesale">
  <div class="wrap">
    <div class="split split--wide-right">
      <div class="reveal">
        ${eyebrow('فروش عمده')}
        <h2 class="h1">همکاری عمده با چینی لوتوس</h2>
        <p class="lead mt-6">اگر به دنبال تأمین مستقیم و مطمئن محصولات هستید، چینی لوتوس آمادهٔ همکاری با مجموعه‌های تجاری و خریداران عمده است. ما با هدف ایجاد همکاری‌های پایدار، محصولات خود را برای این مجموعه‌ها تأمین می‌کنیم:</p>
        <div class="chips mt-7">
          ${wholesaleAudience.map((a) => `<span class="chip">${a}</span>`).join('')}
        </div>
        <div class="cluster mt-7">
          <a class="btn btn--solid" href="${wa('سلام، درخواست همکاری عمده با چینی لوتوس دارم. لطفاً کاتالوگ، لیست محصولات و شرایط فروش را ارسال کنید.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} درخواست کاتالوگ و قیمت</a>
          <a class="btn btn--outline" href="wholesale.html">شرایط همکاری</a>
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/process/lotus-process-10.webp" alt="بسته‌بندی سفارش‌های عمده در کارتن برای ارسال" loading="lazy" width="1100" height="522" srcset="media/process/lotus-process-10-550.webp 550w, media/process/lotus-process-10-800.webp 800w, media/process/lotus-process-10.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>آماده‌سازی سفارش عمده</span><span>کارگاه اصفهان</span></figcaption>
        </figure>
        <div class="stats mt-6">
          <div class="stat"><div class="stat__v">خرده و عمده</div><div class="stat__k">هر دو فعال</div></div>
          <div class="stat"><div class="stat__v">سراسر ایران</div><div class="stat__k">پوشش ارسال</div></div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/** ارسال و صادرات — دو کارت کنار هم. */
function logisticsSection() {
  return `<section class="sec sec--paper" id="logistics">
  <div class="wrap">
    <div class="grid-2">
      <article class="reveal">
        ${eyebrow('ارسال به سراسر ایران')}
        <h2 class="h2">از کارگاه تا سراسر ایران</h2>
        <p class="lead mt-6">محدود به یک شهر نیستیم. محصولات چینی لوتوس برای مشتریان و همکاران در سراسر ایران تأمین و ارسال می‌شود. هدف ما این است که مشتریان، فارغ از موقعیت جغرافیایی، بتوانند سفارش خود را با هماهنگی واحد فروش ثبت کرده و محصول را در مقصد دریافت کنند.</p>
        <table class="spec-table mt-7">
          <tbody>
            <tr><th>شهرهای تحت پوشش</th><td>سراسر ایران</td></tr>
            <tr><th>روش ارسال</th><td>شرکت‌های حمل و نقل و باربری‌ها</td></tr>
            <tr><th>نحوهٔ بسته‌بندی</th><td>تک جعبه چیدمان‌شده در کارتن مادر</td></tr>
            <tr><th>زمان تقریبی ارسال</th><td>با توجه به سفارش متغیر است</td></tr>
          </tbody>
        </table>
        <div class="mt-7"><a class="btn btn--outline" href="shipping.html">${icon('truck', 'btn__ico')} جزئیات ارسال</a></div>
      </article>

      <article class="reveal" data-delay="2">
        ${eyebrow('صادرات')}
        <h2 class="h2">آماده برای بازارهای فراتر از ایران</h2>
        <p class="lead mt-6">کیفیت یک محصول زمانی معنا پیدا می‌کند که بتواند در بازارهای مختلف نیز جایگاه خود را پیدا کند. چینی لوتوس با تکیه بر توان تولید و ظرفیت تأمین سفارش‌های عمده، توسعهٔ همکاری با بازارهای خارجی را به عنوان یکی از مسیرهای رشد خود دنبال می‌کند.</p>
        <ul class="list-check mt-7">
          <li>همکاری با شرکت‌های بازرگانی و واردکنندگان</li>
          <li>همکاری با توزیع‌کنندگان و خریداران عمدهٔ خارج از ایران</li>
          <li>بررسی شرایط سفارش صادراتی متناسب با هر بازار</li>
        </ul>
        <div class="mt-7"><a class="btn btn--outline" href="export.html">${icon('globe', 'btn__ico')} درخواست همکاری صادراتی</a></div>
      </article>
    </div>
  </div>
</section>`;
}

/** الگوهای همکاری — جایگزین صادقانهٔ «نظرات مشتریان» برای یک سایت B2B. */
function collabSection() {
  return `<section class="sec sec--clay" id="collab">
  <div class="wrap">
    ${secHead({
      kicker: 'الگوهای همکاری',
      title: 'همکاران ما معمولاً با یکی از این نیازها سراغ ما می‌آیند',
      lead: 'این‌ها الگوهای رایج سفارش در چینی لوتوس است. اگر نیاز شما در این فهرست نیست، در گفت‌وگو با واحد فروش بررسی می‌شود.',
      rule: true,
    })}
    <div class="grid-quad">
      ${collabPatterns
        .map(
          (c, i) => `<article class="reveal collab" data-delay="${(i % 2) + 1}">
        <h3 class="collab__who">${c.who}</h3>
        <p class="collab__need">${c.need}</p>
        <p class="collab__how"><span class="collab__label">ساختار همکاری</span>${c.how}</p>
      </article>`
        )
        .join('')}
    </div>
    <p class="muted mt-7" style="font-size:var(--t--1)">دربارهٔ <a href="partners.html" style="color:var(--ember-600);font-weight:600">برندها و مجموعه‌های همکار</a> بیشتر بدانید.</p>
  </div>
</section>`;
}

/** نحوهٔ سفارش — هفت گام. */
function orderSteps({ compact = false } = {}) {
  const steps = [
    { t: 'انتخاب محصول', d: 'محصول یا محصولات مورد نظر خود را انتخاب کنید.' },
    { t: 'تماس و ثبت درخواست', d: 'تعداد مورد نیاز و اطلاعات سفارش را با واحد فروش چینی لوتوس هماهنگ کنید.' },
    { t: 'بررسی سفارش', d: 'تیم فروش، موجودی، تعداد، شرایط تأمین و زمان آماده‌سازی را بررسی می‌کند.' },
    { t: 'اعلام شرایط', d: 'قیمت، تعداد، شرایط پرداخت و زمان ارسال به مشتری اعلام می‌شود.' },
    { t: 'تأیید سفارش', d: 'پس از تأیید شرایط، سفارش وارد فرآیند آماده‌سازی می‌شود.' },
    { t: 'بسته‌بندی', d: 'محصولات متناسب با نوع سفارش و روش ارسال بسته‌بندی می‌شوند.' },
    { t: 'ارسال', d: 'سفارش برای مقصد مورد نظر ارسال می‌شود.' },
  ];

  return `<section class="sec ${compact ? 'sec--tight' : ''} sec--paper" id="order">
  <div class="wrap">
    ${secHead({
      kicker: 'نحوهٔ سفارش',
      title: 'سفارش از چینی لوتوس چگونه انجام می‌شود؟',
      lead: 'هفت گام ساده از انتخاب طرح تا تحویل سفارش در مقصد.',
    })}
    <ol class="list-num">
      ${steps
        .map(
          (s) => `<li><div><b>${s.t}</b><span>${s.d}</span></div></li>`
        )
        .join('')}
    </ol>
  </div>
</section>`;
}

/** شرایط فروش. */
function termsSection() {
  return `<section class="sec sec--clay" id="terms">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        ${secHead({ kicker: 'شرایط فروش', title: 'شرایط همکاری و فروش' })}
        <table class="spec-table">
          <tbody>
            ${saleTerms.map((t) => `<tr><th>${t.k}</th><td>${t.v}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="reveal" data-delay="2">
        ${eyebrow('سفارش اختصاصی')}
        <h3 class="h2">محصولی متناسب با نیاز شما</h3>
        <p class="lead mt-6">در صورت امکان، چینی لوتوس می‌تواند سفارش‌های خاص و نیازهای اختصاصی مشتریان را بررسی کند. از انتخاب مدل و ابعاد تا رنگ، طرح، بسته‌بندی یا درج نشان تجاری، نیاز مشتری بررسی شده و امکان اجرای آن بر اساس ظرفیت تولید مجموعه ارزیابی می‌شود.</p>
        <ul class="list-check mt-7">
          <li>تولید در ابعاد اختصاصی</li>
          <li>تولید در طرح و نقش اختصاصی</li>
          <li>تولید با برند مشتری</li>
        </ul>
        <div class="cluster mt-7">
          <a class="btn btn--solid" href="custom.html">ثبت درخواست سفارشی</a>
          <a class="btn btn--outline" href="${wa('سلام، درخواست تولید سفارشی / با برند خودم دارم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} واتساپ</a>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/** سؤالات متداول. */
function faqSection({ limit = 0, withSchema = true } = {}) {
  const list = limit ? faqs.slice(0, limit) : faqs;
  return `<section class="sec sec--paper" id="faq">
  <div class="wrap wrap--narrow">
    ${secHead({ kicker: 'سؤالات متداول', title: 'پرسش‌هایی که زیاد از ما می‌پرسند', center: true })}
    <div class="faq">
      ${list
        .map(
          (f, i) => `<div class="faq__item reveal" data-delay="${(i % 3) + 1}">
        <h3><button class="faq__q" aria-expanded="false" aria-controls="faq-a-${i}" id="faq-q-${i}">
          <span>${f.q}</span><span class="faq__sign" aria-hidden="true"></span>
        </button></h3>
        <div class="faq__a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${f.a}</p></div></div>
      </div>`
        )
        .join('')}
    </div>
    <p class="center muted mt-7">پاسخ پرسش خود را پیدا نکردید؟ <a href="contact.html" style="color:var(--ember-600);font-weight:600">با واحد فروش تماس بگیرید</a>.</p>
  </div>
</section>`;
}

/* ---------------------------------------------------------------
   اجزای صفحهٔ فرآیند تولید
   --------------------------------------------------------------- */

/** نشانگر حرارت — هر مرحله چقدر داغ است. */
function heatMeter(step) {
  const cells = Array.from({ length: 5 }, (_, i) =>
    `<i class="${i < step.heat ? 'on' : ''}"></i>`
  ).join('');
  return `<span class="heat" title="حرارت این مرحله: ${step.heatLabel}" aria-label="حرارت: ${step.heatLabel}">
    ${cells}<span class="heat__label">${step.heatLabel}</span>
  </span>`;
}

/** نوار راهنمای مراحل — پرش سریع به هر مرحله. */
function stepNav() {
  return `<nav class="stepnav" aria-label="پرش به مراحل تولید">
  <div class="wrap stepnav__inner">
    <span class="stepnav__label">مراحل:</span>
    <div class="stepnav__links">
      ${processSteps
        .map((s) => `<a class="stepnav__link" href="#${s.id}"><span>${s.n}</span>${s.title}</a>`)
        .join('')}
    </div>
  </div>
</nav>`;
}

/** نقشهٔ فرآیند: سه فاز، هر فاز با مراحل خودش. */
function processMap() {
  return processPhases
    .map(
      (phase) => `<div class="phase" id="${phase.id}">
    <header class="phase__head reveal">
      <span class="phase__n">${phase.n}</span>
      <h2 class="h2">${phase.title}</h2>
      <p class="phase__text">${phase.text}</p>
    </header>
    <div class="steps-flow steps-flow--${processSteps.filter((s) => s.phase === phase.id).length}">
      ${processSteps
        .filter((s) => s.phase === phase.id)
        .map(
          (s, i) => `<article class="sflow reveal" id="${s.id}" data-delay="${(i % 3) + 1}">
        <div class="sflow__media">
          <img src="${s.image}" alt="${escapeHtml(s.alt)}" loading="lazy" width="1100" height="522"${srcAttrs(s.image, WIDE_SIZES)}>
          <span class="sflow__num">${s.n}</span>
        </div>
        <div class="sflow__body">
          <div class="sflow__top">
            <h3 class="sflow__title">${s.title}</h3>
            ${heatMeter(s)}
          </div>
          <p class="sflow__text">${s.text}</p>
          <div class="sflow__checks">
            <span class="sflow__checks-label">در این مرحله بررسی می‌شود</span>
            <ul>${s.checks.map((c) => `<li>${c}</li>`).join('')}</ul>
          </div>
        </div>
      </article>`
        )
        .join('')}
    </div>
  </div>`
    )
    .join('');
}

/** جدول روش‌های تولید. */
function methodsSection() {
  return `<section class="sec sec--paper" id="methods">
  <div class="wrap">
    ${secHead({
      kicker: 'روش‌های تولید',
      title: 'هر محصول، روش متناسب خودش را دارد',
      lead: 'شکل‌دهی در چینی لوتوس بر یک روش واحد متکی نیست؛ بسته به فرم و کاربرد محصول، روش مناسب انتخاب می‌شود.',
      rule: true,
    })}
    <div class="grid-3">
      ${productionMethods
        .map(
          (m, i) => `<article class="method reveal" data-delay="${i + 1}">
        <span class="method__tag">${m.tag}</span>
        <h3 class="h3">${m.name}</h3>
        <p class="method__text">${m.text}</p>
        <p class="method__use"><span>کاربرد</span>${m.use}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------
   اجزای صفحهٔ فروش عمده
   --------------------------------------------------------------- */

/** مسیر شروع همکاری. */
function cooperationPath() {
  return `<section class="sec sec--paper" id="coop-path">
  <div class="wrap">
    ${secHead({
      kicker: 'شروع همکاری',
      title: 'مسیر همکاری، در پنج گام',
      lead: 'از اولین تماس تا تحویل سفارش، مسیر روشنی پیش روی همکاران تجاری ما قرار دارد.',
      rule: true,
    })}
    <ol class="list-num">
      ${cooperationSteps.map((s) => `<li><div><b>${s.t}</b><span>${s.d}</span></div></li>`).join('')}
    </ol>
  </div>
</section>`;
}

/** مدل‌های همکاری. */
function cooperationModelsSection() {
  return `<section class="sec sec--clay" id="coop-models">
  <div class="wrap">
    ${secHead({
      kicker: 'مدل‌های همکاری',
      title: 'چهار شکل همکاری با چینی لوتوس',
      lead: 'بسته به نوع فعالیت شما، شکل همکاری متفاوت است. اگر مطمئن نیستید کدام مدل مناسب شماست، در گفت‌وگو با واحد فروش مشخص می‌شود.',
    })}
    <div class="grid-quad">
      ${cooperationModels
        .map(
          (m, i) => `<article class="cmodel reveal" data-delay="${(i % 2) + 1}">
        <h3 class="cmodel__title">${m.title}</h3>
        <p class="cmodel__audience">${m.audience}</p>
        <p class="cmodel__text">${m.text}</p>
        <div class="cmodel__tags">${m.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/** چه اطلاعاتی برای شروع همکاری لازم است. */
function wholesaleNeedsSection() {
  return `<section class="sec sec--ink" id="coop-needs">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        ${eyebrow('برای شروع')}
        <h2 class="h1">چه اطلاعاتی لازم است تا سریع‌تر پاسخ بگیرید؟</h2>
        <p class="lead mt-6">اگر این چند مورد را همراه درخواست خود بفرستید، واحد فروش می‌تواند سریع‌تر لیست قیمت، حداقل تعداد و زمان تأمین را برای شما آماده کند.</p>
        <ul class="list-check mt-7">
          ${wholesaleNeeds.map((n) => `<li>${n}</li>`).join('')}
        </ul>
        <div class="cluster mt-7">
          <a class="btn btn--light" href="#wholesale-form">${icon('whatsapp', 'btn__ico')} تکمیل فرم درخواست</a>
          <a class="btn btn--ghost-light" href="${tel}">${icon('phone', 'btn__ico')} ${site.phoneFa}</a>
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/process/lotus-process-10.webp" alt="بسته‌بندی سفارش عمده در کارتن برای ارسال" loading="lazy" width="1100" height="522" srcset="media/process/lotus-process-10-550.webp 550w, media/process/lotus-process-10-800.webp 800w, media/process/lotus-process-10.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>آماده‌سازی سفارش عمده</span><span>کارگاه اصفهان</span></figcaption>
        </figure>
        <figure class="figure figure--wide mt-6">
          <img  src="media/workshop/lotus-workshop-02.webp" alt="انبار محصول نهایی چینی لوتوس" loading="lazy" width="1100" height="522" srcset="media/workshop/lotus-workshop-02-550.webp 550w, media/workshop/lotus-workshop-02-800.webp 800w, media/workshop/lotus-workshop-02.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>انبار محصول نهایی</span><span>آمادهٔ تأمین</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------
   اجزای صفحهٔ سفارش اختصاصی و صادرات
   --------------------------------------------------------------- */

function customStepsSection() {
  return `<section class="sec sec--paper" id="custom-path">
  <div class="wrap">
    ${secHead({
      kicker: 'مسیر سفارش اختصاصی',
      title: 'از درخواست شما تا تحویل سفارش',
      lead: 'سفارش اختصاصی مسیر مشخصی دارد؛ در هر گام نتیجه برای شما اعلام می‌شود.',
      rule: true,
    })}
    <ol class="list-num">
      ${customSteps.map((s) => `<li><div><b>${s.t}</b><span>${s.d}</span></div></li>`).join('')}
    </ol>
  </div>
</section>`;
}

function customOptionsSection() {
  return `<section class="sec sec--clay" id="custom-options">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        ${secHead({ kicker: 'قابلیت‌ها', title: 'چه چیزی قابل بررسی است؟' })}
        <table class="spec-table">
          <tbody>
            ${customOptions.map((o) => `<tr><th>${o.k}</th><td>${o.v}</td></tr>`).join('')}
          </tbody>
        </table>
        <p class="muted mt-7" style="font-size:var(--t--1)">امکان‌سنجی سفارش سفارشی بسته به نوع، تعداد و ظرفیت تولید مجموعه بررسی می‌شود و جزئیات پس از بررسی اعلام می‌گردد.</p>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/workshop/printed-transfer.webp" alt="اجرای نقش بر بدنهٔ قوری چینی در کارگاه چینی لوتوس" loading="lazy" width="1100" height="733" srcset="media/workshop/printed-transfer-550.webp 550w, media/workshop/printed-transfer-800.webp 800w, media/workshop/printed-transfer.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>اجرای نقش و دکورکاری</span><span>مرحلهٔ ۰۹</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`;
}

function exportStepsSection() {
  return `<section class="sec sec--paper" id="export-path">
  <div class="wrap">
    ${secHead({
      kicker: 'مسیر همکاری صادراتی',
      title: 'همکاری برای بازارهای خارج از ایران',
      lead: 'شرایط هر بازار متفاوت است؛ مسیر زیر کمک می‌کند بدانید همکاری از کجا شروع می‌شود.',
      rule: true,
    })}
    <ol class="list-num">
      ${exportSteps.map((s) => `<li><div><b>${s.t}</b><span>${s.d}</span></div></li>`).join('')}
    </ol>
  </div>
</section>`;
}

/* ---------------------------------------------------------------
   اجزای صفحهٔ دربارهٔ ما
   --------------------------------------------------------------- */

function milestonesSection() {
  return `<section class="sec sec--clay" id="milestones">
  <div class="wrap">
    ${secHead({ kicker: 'مسیر ما', title: 'از یک کارگاه تا امروز', rule: true })}
    <div class="flow">
      ${milestones
        .map(
          (m, i) => `<div class="flow__item reveal" data-delay="${i + 1}">
        <span class="flow__year">${m.year}</span>
        <h3 class="flow__title">${m.title}</h3>
        <p class="flow__text">${m.text}</p>
      </div>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/** فراخوان پایانی. */
function ctaSection({
  title = `برای دریافت کاتالوگ، لیست محصولات، شرایط فروش و استعلام قیمت با ما در ارتباط باشید`,
  text = 'کارشناسان واحد فروش چینی لوتوس آمادهٔ پاسخ‌گویی دربارهٔ طرح‌ها، شرایط تأمین عمده، زمان آماده‌سازی و ارسال به سراسر ایران هستند.',
} = {}) {
  return `<section class="sec kiln cta" id="cta">
  <div class="wrap cta__inner">
    <div class="reveal">
      <h2>${title}</h2>
      <p>${text}</p>
    </div>
    <div class="cta__actions reveal" data-delay="1">
      <a class="btn btn--light btn--lg" href="${wa('سلام، برای دریافت کاتالوگ و استعلام قیمت محصولات چینی لوتوس پیام می‌دهم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} گفت‌وگو در واتساپ</a>
      <a class="btn btn--ghost-light btn--lg" href="${tel}">${icon('phone', 'btn__ico')} ${site.phoneFa}</a>
      <a class="btn btn--ghost-light btn--lg" href="contact.html">${icon('mail', 'btn__ico')} فرم تماس</a>
    </div>
  </div>
</section>`;
}

/** سرصفحهٔ صفحه‌های داخلی. */
/* ---------- تصاویر رسپانسیو ----------
   نسخه‌های ۵۵۰ و ۸۰۰ پیکسلی کنار فایل اصلی ساخته می‌شوند
   (`.dev/images.mjs`) تا موبایل تصویر کوچک‌تر و سبک‌تر بگیرد. */
function srcSet(src, widths = [550, 800]) {
  if (!/^media\/(products|process|workshop)\//.test(src)) return '';
  const m = src.match(/^(.*)\.(jpg|jpeg|webp|png)$/i);
  if (!m) return '';
  const [, stem, ext] = m;
  return widths.map((w) => `${stem}-${w}.${ext} ${w}w`).join(', ');
}

/** ویژگی‌های srcset/sizes آماده برای درج در تگ img */
function srcAttrs(src, sizes) {
  const set = srcSet(src);
  if (!set) return '';
  return ` srcset="${set}, ${src} 1100w" sizes="${sizes}"`;
}

/* ---------- پس‌پردازندهٔ تصاویر ----------
   هر تصویری که از پوشه‌های رسانه می‌آید و هنوز srcset ندارد،
   نسخه‌های ۵۵۰ و ۸۰۰ پیکسلی می‌گیرد. اندازهٔ پیش‌فرض محافظه‌کارانه
   است (۱۰۰vw) تا در هیچ چیدمانی تصویر کم‌کیفیت دیده نشود. */
const MEDIA_RE = /^media\/(products|process|workshop)\//;
// نشان برند جداگانه بررسی می‌شود (نسخه‌های ۱۴۰ و ۲۸۰ پیکسلی)
const MARK_RE = /^media\/brand\/mark(-\d+)?\.(webp|png)$/;

function addSrcSets(html) {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    if (tag.includes('srcset=')) return tag;

    const srcMatch = tag.match(/src="([^"]+)"/);
    if (!srcMatch) return tag;

    const src = srcMatch[1];
    const isMark = MARK_RE.test(src);
    if (!MEDIA_RE.test(src) && !isMark) return tag;

    const m = src.match(/^(.*)\.(jpg|jpeg|webp|png)$/i);
    if (!m) return tag;
    const [, stem, ext] = m;

    // اندازه‌ای که تصویر واقعاً اشغال می‌کند از کلاس/نقش عنصر حدس زده می‌شود
    let sizes = '(max-width: 1024px) 92vw, 46vw';
    if (tag.includes('id="pgMainImg"')) sizes = FULL_SIZES;
    else if (tag.includes('class="card__media"') || tag.includes('gallery__img'))
      sizes = '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 33vw';
    else if (tag.includes('alt=""')) sizes = '(max-width: 640px) 22vw, 110px';
    else if (tag.includes('rail__item')) sizes = '(max-width: 640px) 80vw, 340px';
    // نشان برند همیشه ۳۴ پیکسل است — این بررسی باید آخر باشد
    if (isMark) sizes = '34px';

    const set = isMark
      ? `media/brand/mark-140.webp 140w, media/brand/mark-280.webp 280w`
      : `${stem}-550.${ext} 550w, ${stem}-800.${ext} 800w, ${src} 1100w`;
    return tag.replace(/\s*>$/, ` srcset="${set}" sizes="${sizes}">`);
  });
}

/** همکاری دوطرفه — ما چه می‌دهیم، چه انتظاری داریم. */
function partnerExchange() {
  const give = [
    'معرفی کامل طرح‌ها با کد و مشخصات، تا انتخاب و سفارش ساده باشد',
    'اعلام شفاف تعداد، شرایط تأمین و زمان آماده‌سازی پیش از تأیید سفارش',
    'بسته‌بندی مقاوم و مناسب حمل، با کارتن مادر برای سفارش‌های تعدادی',
    'هماهنگی ارسال با باربری به سراسر ایران',
  ];
  const ask = [
    'وضوح در تعداد، طرح و زمان مورد نیاز، از همان ابتدای گفت‌وگو',
    'تأیید شرایط پیش از شروع آماده‌سازی سفارش',
    'معرفی درست محصول به‌عنوان تولید چینی لوتوس',
    'بازخورد دربارهٔ آنچه در بازار می‌بینید؛ این بازخورد مسیر تولید را بهتر می‌کند',
  ];

  return `<section class="sec" id="exchange">
  <div class="wrap">
    ${secHead({
      kicker: 'همکاری دوطرفه',
      title: 'این همکاری، از دو طرف ساخته می‌شود',
      lead: 'ترجیح می‌دهیم از ابتدا روشن باشیم که در یک همکاری چه چیزی به همکارانمان می‌دهیم و در مقابل چه انتظاری داریم.',
      rule: true,
    })}
    <div class="split mt-8">
      <div class="reveal">
        <h3 class="h3">آنچه چینی لوتوس ارائه می‌دهد</h3>
        <ul class="list-check mt-5">
          ${give.map((t) => `<li>${t}</li>`).join('')}
        </ul>
      </div>
      <div class="reveal" data-delay="2">
        <h3 class="h3">آنچه از همکاران می‌خواهیم</h3>
        <ul class="list-check mt-5">
          ${ask.map((t) => `<li>${t}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>
</section>`;
}

/** چه مجموعه‌هایی با ما همکاری می‌کنند. */
function partnerTypes() {
  const types = [
    {
      ico: 'box',
      title: 'فروشگاه‌های لوازم خانه',
      text: 'مجموعه‌هایی که ظروف پذیرایی و قوری را برای مشتری نهایی عرضه می‌کنند و به تأمین مستمر نیاز دارند.',
    },
    {
      ico: 'truck',
      title: 'توزیع‌کنندگان و مراکز پخش',
      text: 'مجموعه‌هایی که محصول را در یک شهر یا منطقه پخش می‌کنند و سفارش‌های دوره‌ای می‌دهند.',
    },
    {
      ico: 'handshake',
      title: 'برندها و مجموعه‌های تجاری',
      text: 'برندهایی که به دنبال تأمین محصول برای عرضه با نام و بسته‌بندی خودشان هستند.',
    },
    {
      ico: 'globe',
      title: 'شرکت‌های بازرگانی و صادرکنندگان',
      text: 'مجموعه‌هایی که برای بازار خارج از ایران، به دنبال تأمین‌کنندهٔ تولیدکننده هستند.',
    },
  ];

  return `<section class="sec sec--clay" id="who">
  <div class="wrap">
    ${secHead({
      kicker: 'طیف همکاران',
      title: 'چه مجموعه‌هایی با چینی لوتوس همکاری می‌کنند',
      lead: 'شکل همکاری با هر مجموعه متفاوت است؛ آنچه مشترک است، تأمین محصول از یک تولیدکنندهٔ مستقیم است.',
    })}
    <div class="grid-quad mt-8">
      ${types
        .map(
          (t, i) => `<article class="card card--flat reveal" data-delay="${(i % 2) + 1}">
        <span class="card__icon" aria-hidden="true">${icon(t.ico)}</span>
        <h3>${t.title}</h3>
        <p class="card__sum">${t.text}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/** پرسش‌های همکاران تجاری. */
function partnerFaq() {
  const items = [
    {
      q: 'برای همکاری، حداقل تعداد سفارش چقدر است؟',
      a: 'حداقل سفارش بسته به نوع محصول، طرح و شرایط تأمین متفاوت است و به‌صورت ثابت اعلام نمی‌شود. برای سفارش‌های کوچک و عمده، شرایط جداگانه بررسی می‌شود؛ تعداد مورد نظر خود را به واحد فروش اعلام کنید تا شرایط همان سفارش اعلام شود.',
    },
    {
      q: 'امکان فروش به‌صورت خرده هم وجود دارد؟',
      a: 'بله. چینی لوتوس هم سفارش‌های خرده و هم عمده را تأمین می‌کند؛ اما شرایط تأمین، بسته‌بندی و ارسال در سفارش‌های تعدادی متفاوت است و پیش از تأیید سفارش شفاف اعلام می‌شود.',
    },
    {
      q: 'شرایط پرداخت چگونه است؟',
      a: 'شرایط پرداخت توافقی است و بر اساس نوع سفارش، تعداد و سابقهٔ همکاری تعیین می‌شود. جزئیات پرداخت پیش از شروع آماده‌سازی سفارش به‌صورت روشن اعلام می‌گردد.',
    },
    {
      q: 'هزینهٔ ارسال با چه کسی است؟',
      a: 'ارسال سفارش‌ها با باربری و به سراسر ایران انجام می‌شود و هزینهٔ ارسال بر عهدهٔ مشتری است. نوع بسته‌بندی و روش ارسال متناسب با مقصد و حجم سفارش هماهنگ می‌شود.',
    },
  ];

  return `<section class="sec sec--paper" id="partner-faq">
  <div class="wrap wrap--narrow">
    ${secHead({
      kicker: 'پرسش‌های همکاران',
      title: 'آنچه پیش از شروع همکاری می‌پرسند',
      rule: true,
    })}
    <div class="faq mt-8">
      ${items
        .map(
          (f, i) => `<div class="faq__item reveal" data-delay="${(i % 3) + 1}">
        <h3><button class="faq__q" aria-expanded="false" aria-controls="pfaq-a-${i}" id="pfaq-q-${i}">
          <span>${f.q}</span><span class="faq__sign" aria-hidden="true"></span>
        </button></h3>
        <div class="faq__a" id="pfaq-a-${i}" role="region" aria-labelledby="pfaq-q-${i}"><div><p>${f.a}</p></div></div>
      </div>`
        )
        .join('')}
    </div>
    <p class="center muted mt-7">پرسش دیگری دارید؟ <a href="${wa('سلام، دربارهٔ همکاری تجاری با چینی لوتوس سؤال دارم.')}" target="_blank" rel="noopener">در واتساپ بپرسید</a>.</p>
  </div>
</section>`;
}

/** چشم‌انداز — تعهدهایی که در آن‌ها مصالحه نمی‌کنیم. */
function visionValues() {
  const vals = [
    {
      n: '۰۱',
      title: 'کیفیت، پیش از تعداد',
      text: 'ظرفیت تولید می‌تواند رشد کند، اما نه به قیمت کیفیت. هر مرحلهٔ تولید بازبینی می‌شود و محصول معیوب به مرحلهٔ بعد نمی‌رسد.',
    },
    {
      n: '۰۲',
      title: 'شفافیت در گفت‌وگو',
      text: 'شرایط سفارش، تعداد، زمان آماده‌سازی و هزینه‌ها پیش از تأیید روشن می‌شود. ترجیح می‌دهیم از ابتدا صریح باشیم تا در میانهٔ کار سورپرایزی نباشد.',
    },
    {
      n: '۰۳',
      title: 'رابطهٔ بلندمدت، نه فروش یک‌باره',
      text: 'هدف ما این است که همکاران تجاری برای سفارش بعدی هم سراغ چینی لوتوس بیایند؛ این فقط با تأمین درست و به‌موقع به دست می‌آید.',
    },
  ];

  return `<section class="sec sec--ink" id="values">
  <div class="wrap">
    ${secHead({
      kicker: 'تعهدهای ما',
      title: 'سه چیزی که در آن مصالحه نمی‌کنیم',
      lead: 'این‌ها شعار نیستند؛ معیارهایی هستند که تصمیم‌های روزمرهٔ کارگاه بر اساس آن‌ها گرفته می‌شود.',
    })}
    <div class="grid-3 mt-8">
      ${vals
        .map(
          (v, i) => `<article class="reveal" data-delay="${i + 1}">
        <p class="ghost-num" style="font-size:2.6rem">${v.n}</p>
        <h3 class="h3 mt-5" style="color:var(--clay-50)">${v.title}</h3>
        <p class="mt-4" style="color:var(--clay-300);line-height:1.95">${v.text}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/** نقشهٔ سایت. */
function sitemapSection() {
  const groups = [
    {
      title: 'صفحه‌های اصلی',
      links: ['index.html', 'products.html', 'process.html', 'quality.html', 'wholesale.html', 'about.html', 'vision.html', 'contact.html'],
    },
    { title: 'طرح‌های قوری', links: products.map((x) => `product-${x.slug}.html`) },
    { title: 'همکاری و فروش', links: ['shipping.html', 'export.html', 'custom.html', 'partners.html', 'faq.html'] },
    { title: 'کارگاه', links: ['gallery.html', 'sitemap.html'] },
  ];

  const byFile = new Map(P.map((pg) => [pg.file, pg.title]));

  return `<section class="sec sec--paper">
  <div class="wrap">
    <p class="lead reveal">همهٔ صفحه‌های سایت چینی لوتوس، دسته‌بندی‌شده. اگر دنبال موضوع خاصی هستید، از این فهرست سریع‌تر پیدایش می‌کنید.</p>
    <div class="smap">
      ${groups
        .map(
          (g) => `<div class="smap__group reveal">
        <h2 class="smap__title">${g.title}</h2>
        <ul class="smap__list">
          ${g.links
            .map((f) => {
              const t = byFile.get(f);
              return t ? `<li><a href="${f}">${escapeHtml(t)}</a></li>` : '';
            })
            .join('')}
        </ul>
      </div>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

function pageHead({ kicker, title, lead, aside = '', crumbs = [] }) {
  const crumbHtml = crumbs.length
    ? `<nav class="wrap crumbs" aria-label="مسیر صفحه"><a href="index.html">خانه</a>${crumbs
        .map((c) => `<span aria-hidden="true">/</span>${c.href ? `<a href="${c.href}">${c.label}</a>` : `<span aria-current="page">${c.label}</span>`}`)
        .join('')}</nav>`
    : '';
  return `<section class="page-head">
  ${crumbHtml}
  <div class="wrap page-head__grid">
    <div class="reveal">
      ${eyebrow(kicker)}
      <h1 class="h1">${title}</h1>
      ${lead ? `<p class="lead mt-6">${lead}</p>` : ''}
    </div>
    ${aside ? `<div class="page-head__aside reveal" data-delay="1">${aside}</div>` : ''}
  </div>
</section>`;
}

/** بلوک متنی ساده در دو ستون. */
function textSection({ kicker, title, paragraphs = [], list = [], bg = 'paper', reverse = false, id = '' }) {
  const media = list.length
    ? `<ul class="list-check mt-7">${list.map((l) => `<li>${l}</li>`).join('')}</ul>`
    : '';
  return `<section class="sec sec--${bg}"${id ? ` id="${id}"` : ''}>
  <div class="wrap">
    <div class="split"${reverse ? ' style="direction:ltr"' : ''}>
      <div class="reveal"${reverse ? ' style="direction:rtl"' : ''}>
        ${kicker ? eyebrow(kicker) : ''}
        <h2 class="h1">${title}</h2>
        <div class="prose mt-6">${paragraphs.map((p) => `<p>${p}</p>`).join('')}</div>
        ${media}
      </div>
      <div class="reveal" data-delay="2"${reverse ? ' style="direction:rtl"' : ''}>
        <slot-media></slot-media>
      </div>
    </div>
  </div>
</section>`;
}

/* ================================================================
   JSON-LD
   ================================================================ */
function ldOrganization() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Manufacturer', 'Organization'],
    name: site.fa,
    alternateName: site.en,
    slogan: `${site.fa}؛ ${site.tagline}`,
    foundingDate: '2016',
    foundingLocation: { '@type': 'Place', name: 'اصفهان، ایران' },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'جادهٔ حبیب‌آباد، قبل از حبیب‌آباد، خیابان نجم‌آباد',
      addressLocality: 'اصفهان',
      addressRegion: 'اصفهان',
      addressCountry: 'IR',
    },
    telephone: `+98${site.phone.replace(/^0/, '')}`,
    email: site.email,
    openingHours: site.hoursEn,
    knowsLanguage: 'fa-IR',
    logo: { '@type': 'ImageObject', url: 'media/brand/mark.png', caption: site.fa },
    contactPoint: [
      { '@type': 'ContactPoint', telephone: `+98${site.phone.replace(/^0/, '')}`, contactType: 'sales', areaServed: 'IR', availableLanguage: 'fa' },
    ],
  };
}

function ldFaq() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

function ldProduct(p) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.name} | ${site.fa}`,
    description: p.summary,
    sku: p.sku,
    category: 'انواع قوری',
    brand: { '@type': 'Brand', name: site.fa },
    material: 'چینی',
    image: p.images.slice(0, 4),
    manufacturer: { '@type': 'Organization', name: site.fa },
  };
}

function ldCrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: item.href || undefined,
    })),
  };
}

/* ================================================================
   قالب اصلی صفحه
   ================================================================ */
function layout({ file, title, description, body, current = '', schemas = [], ogImage = '' }) {
  const fullTitle = file === 'index.html' ? `${site.fa} | ${title}` : `${title} | ${site.fa}`;
  const canonical = file === '404.html' ? '' : SITE_URL + '/' + file;
  const ogImagePath = ogImage || 'media/brand/og-card.png';
  const desc = description || `${site.fa} — تولیدکنندهٔ قوری و ظروف چینی در اصفهان. ${site.tagline}.`;
  const jsonLd = schemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n    ');

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="description" content="${escapeHtml(desc)}">
    <meta name="theme-color" content="#fdfbf9">
    <meta name="color-scheme" content="light">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="icon" type="image/png" href="media/brand/favicon-128.png" sizes="128x128">
    <link rel="apple-touch-icon" href="media/brand/icon-192.png">
    <link rel="manifest" href="site.webmanifest">
    ${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
    <meta property="og:type" content="website">
    <meta property="og:locale" content="fa_IR">
    <meta property="og:site_name" content="${site.fa}">
    <meta property="og:title" content="${escapeHtml(fullTitle)}">
    <meta property="og:description" content="${escapeHtml(desc)}">
    <meta property="og:image" content="${SITE_URL}/${ogImagePath}">
    <meta property="og:image:alt" content="${escapeHtml(fullTitle)}">
    ${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
    <meta name="twitter:description" content="${escapeHtml(desc)}">
    <meta name="twitter:image" content="${SITE_URL}/${ogImagePath}">
    <link rel="preload" href="assets/fonts/PeydaWebFaNum-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="assets/fonts/PeydaWebFaNum-Bold.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="assets/css/main.css?v=${ASSET_V}">
    <script>document.documentElement.classList.add('js');</script>
    <script type="application/ld+json">${JSON.stringify(ldOrganization())}</script>
    ${jsonLd}
</head>
<body>
    <a class="skip" href="#main">پرش به محتوای اصلی</a>
    ${header(current)}
    ${drawer(current)}
    <main id="main">
    ${body}
    </main>
    ${ctaSection()}
    ${footer()}
    ${dock()}
    ${lightbox()}
    <script src="assets/js/app.js?v=${ASSET_V}" defer></script>
</body>
</html>
`;
}

/* ================================================================
   صفحه‌ها
   ================================================================ */

const P = [];

/* ---------- ۱. صفحهٔ اصلی ---------- */
P.push({
  file: 'index.html',
  title: 'تولید قوری و ظروف چینی در اصفهان',
  description:
    'چینی لوتوس، تولیدکنندهٔ قوری و ظروف چینی در اصفهان؛ تولید مستقیم، فروش عمده، تأمین سفارش در سراسر ایران و آمادگی همکاری صادراتی. چینی لوتوس؛ هنر تولید، کیفیت ماندگار.',
  current: 'index.html',
  body: [
    hero(),
    fireBand(),
    pillarsSection(),
    aboutTeaser(),
    featuredProducts({ limit: 8 }),
    processTeaser(),
    qualitySection(),
    wholesaleSection(),
    logisticsSection(),
    collabSection(),
    orderSteps(),
    termsSection(),
    faqSection(),
  ].join('\n'),
});

/* ---------- ۲. محصولات ---------- */
const productAside = `<a class="btn btn--solid btn--lg" href="${wa('سلام، برای دریافت کاتالوگ کامل طرح‌ها و لیست قیمت پیام می‌دهم.')}" target="_blank" rel="noopener">${icon('download', 'btn__ico')} دریافت کاتالوگ در واتساپ</a>
      <p class="field__hint">۱۵ طرح فعال قوری؛ امکان تأمین عمدهٔ همهٔ طرح‌ها.</p>`;

P.push({
  file: 'products.html',
  title: 'محصولات و طرح‌های قوری چینی',
  description:
    'طرح‌های قوری چینی لوتوس: ابریشم، الماسه، گل نیلی، گلشن‌زر، حریر، مهتاب، مشبک سیمین، نستعلیق، پیچان، پلاتین، قاجار، سایه‌روشن، سیمین‌چلیپا، ترمهٔ سیمین و زرین‌چلیپا.',
  current: 'products.html',
  schemas: [
    ldCrumbs([
      { label: 'خانه', href: 'index.html' },
      { label: 'محصولات' },
    ]),
  ],
  body: [
    pageHead({
      kicker: 'محصولات',
      title: 'محصولات چینی لوتوس',
      lead: 'محصولات چینی لوتوس با تمرکز بر نیاز بازار و کاربرد واقعی طراحی و تولید می‌شوند. در این مجموعه تلاش می‌شود محصولات علاوه بر ظاهر مناسب، از نظر کیفیت ساخت، کاربرد، بسته‌بندی و قابلیت تأمین عمده نیز پاسخ‌گوی نیاز مشتریان باشند.',
      aside: productAside,
      crumbs: [{ label: 'محصولات' }],
    }),
    `<section class="sec sec--paper" id="all-products">
  <div class="wrap">
    <div class="sec-head reveal" style="max-width:none">
      <div class="cluster" style="justify-content:space-between;align-items:flex-end">
        <div>
          ${eyebrow('انواع قوری')}
          <h2 class="h2">۱۵ طرح فعال قوری چینی</h2>
        </div>
        <p class="muted" style="font-size:var(--t--1)">مرتب‌سازی: کد طرح</p>
      </div>
      <div class="sec-head__rule"></div>
    </div>
    <div class="grid-products grid-products--stagger">
      ${products.map((p, i) => productCard(p, { delay: (i % 4) + 1 })).join('')}
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay" id="categories">
  <div class="wrap">
    ${secHead({
      kicker: 'دسته‌بندی محصولات',
      title: 'چهار دستهٔ اصلی محصولات',
      lead: 'مجموعهٔ چینی لوتوس در چهار دستهٔ مشخص تولید و عرضه می‌شود.',
    })}
    <div class="grid-4">
      ${[
        { t: 'انواع قوری', d: 'قوری در مدل‌ها، ابعاد و ظرفیت‌های مختلف، شامل قوری سه‌سایز و قوری کف ۱۴ (سماوری).', i: 'drop' },
        { t: 'متعلقات قوری و چای', d: 'محصولات و لوازم مرتبط با سرو چای و پذیرایی.', i: 'spark' },
        { t: 'ظروف پذیرایی', d: 'ظروف و محصولات مرتبط با سرو و پذیرایی.', i: 'box' },
        { t: 'محصولات سفارشی', d: 'تولید در ابعاد، نقش یا با برند مشتری، بر اساس بررسی ظرفیت تولید.', i: 'handshake' },
      ]
        .map(
          (c, i) => `<article class="reveal" data-delay="${i + 1}">
        <div style="color:var(--ember-500);width:28px;height:28px;margin-block-end:1rem">${icon(c.i)}</div>
        <h3 class="h3">${c.t}</h3>
        <p class="muted mt-6" style="font-size:var(--t--1)">${c.d}</p>
      </article>`
        )
        .join('')}
    </div>
    <p class="muted mt-8" style="font-size:var(--t--1)">تصاویر محصولات در فاز بعدی تکمیل می‌شود. برای دریافت کاتالوگ کامل و لیست قیمت با واحد فروش در تماس باشید.</p>
  </div>
</section>`,
    faqSection({ limit: 4 }),
  ].join('\n'),
});

/* ---------- ۳. صفحه‌های جزئیات طرح ---------- */
for (const p of products) {
  const others = products.filter((x) => x.slug !== p.slug);
  const related = [
    ...others.filter((x) => x.motif === p.motif),
    ...others.filter((x) => x.motif !== p.motif),
  ].slice(0, 3);
  const idx = products.findIndex((x) => x.slug === p.slug);
  const prev = products[(idx - 1 + products.length) % products.length];
  const next = products[(idx + 1) % products.length];

  const body = [
    pageHead({
      kicker: `مجموعهٔ قوری‌های چینی لوتوس · طرح ${p.sku} · نقش ${p.motif}`,
      title: p.name,
      lead: p.summary,
      crumbs: [{ label: 'محصولات', href: 'products.html' }, { label: p.name }],
      aside: `<a class="btn btn--solid btn--lg" href="${wa(`سلام، دربارهٔ ${p.name} (کد ${p.sku}) استعلام قیمت دارم.`)}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} استعلام قیمت در واتساپ</a>
        <a class="btn btn--outline" href="${wa(`سلام، درخواست تأمین عمدهٔ ${p.name} (کد ${p.sku}) دارم.`)}" target="_blank" rel="noopener">درخواست تأمین عمده</a>`,
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <div class="pgallery" id="pgallery" data-images='${JSON.stringify(p.images)}' data-name="${escapeHtml(p.name)}">
          <figure class="pgallery__main" id="pgMain">
            <img src="${p.images[0]}" alt="${escapeHtml(p.name)} — تصویر ۱ از ${fa(p.images.length)}" width="1100" height="821" id="pgMainImg"${srcAttrs(p.images[0], FULL_SIZES)}>
          </figure>
          <div class="pgallery__thumbs" id="pgThumbs" role="tablist" aria-label="تصاویر ${escapeHtml(p.name)}">
            ${p.images
              .map(
                (src, i) => `<button class="pgallery__thumb" role="tab" aria-current="${i === 0}" aria-label="تصویر ${fa(i + 1)}" data-src="${src}">
              <img src="${src}" alt="" loading="lazy" width="1100" height="821">
            </button>`
              )
              .join('')}
          </div>
        </div>
        <p class="field__hint mt-6">برای بزرگ‌نمایی روی تصویر کلیک کنید. ${fa(p.images.length)} تصویر از این طرح موجود است.</p>
      </div>

      <div class="reveal" data-delay="2">
        ${eyebrow('شناسنامهٔ طرح')}
        <table class="spec-table">
          <tbody>
            <tr><th>کد طرح</th><td>${p.sku}</td></tr>
            <tr><th>نام طرح</th><td>${p.name}</td></tr>
            <tr><th>نقش</th><td>${p.motif}</td></tr>
            <tr><th>رنگ تزئین</th><td>${p.colors.join(' · ')}</td></tr>
            <tr><th>جنس</th><td>چینی</td></tr>
            <tr><th>دسته</th><td>انواع قوری</td></tr>
            <tr><th>قابلیت تأمین</th><td>خرده و عمده</td></tr>
            <tr><th>سفارش اختصاصی</th><td>قابل بررسی</td></tr>
          </tbody>
        </table>

        <div class="mt-7">
          <h3 class="h3">توضیحات تکمیلی</h3>
          <div class="prose mt-6"><p>${p.note}</p></div>
        </div>

        <div class="mt-8" style="padding:1.25rem;border:1px solid var(--clay-200);background:var(--clay-50)">
          <h3 class="h3">این طرح را برای برند خودتان بخواهید</h3>
          <p class="muted mt-6" style="font-size:var(--t--1);line-height:1.9">با دکمهٔ زیر، نام و کد این طرح همراه پیام شما به ما می‌رسد تا سفارش اختصاصی و بررسی چاپ روی محصول انجام شود. امکان‌سنجی و جزئیات پس از بررسی اعلام می‌شود.</p>
          <a class="btn btn--copper mt-6" href="${wa(`سلام، درخواست تولید ${p.name} (کد ${p.sku}) با برند خودم را دارم.`)}" target="_blank" rel="noopener">${icon('handshake', 'btn__ico')} درخواست چاپ این طرح</a>
        </div>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay sec--tight">
  <div class="wrap">
    <div class="cluster" style="justify-content:space-between">
      <a class="btn btn--outline" href="product-${prev.slug}.html">${icon('arrow', 'btn__ico')} طرح قبلی: ${prev.name}</a>
      <a class="btn btn--outline" href="product-${next.slug}.html">طرح بعدی: ${next.name} ${icon('arrowLeft', 'btn__ico')}</a>
    </div>
  </div>
</section>`,
    `<section class="sec sec--paper" id="related">
  <div class="wrap">
    ${secHead({ kicker: 'طرح‌های هم‌خانواده', title: 'محصولات مرتبط', rule: true })}
    <div class="grid-products grid-products--stagger">
      ${related.map((r, i) => productCard(r, { delay: i + 1 })).join('')}
    </div>
  </div>
</section>`,
  ].join('\n');

  P.push({
    file: `product-${p.slug}.html`,
    title: `${p.name} — کد ${p.sku}`,
    description: p.summary,
    current: 'products.html',
    ogImage: p.images[0],
    schemas: [
      ldProduct(p),
      ldCrumbs([
        { label: 'خانه', href: 'index.html' },
        { label: 'محصولات', href: 'products.html' },
        { label: p.name },
      ]),
    ],
    body,
  });
}

/* ---------- ۴. فرآیند تولید ---------- */
P.push({
  file: 'process.html',
  title: 'فرآیند تولید، از مواد اولیه تا محصول نهایی',
  description:
    'یازده مرحلهٔ تولید در چینی لوتوس: آماده‌سازی مواد اولیه، شکل‌دهی، خشک شدن، پرداخت، پخت بیسکویت، لعاب، پخت لعاب، کنترل کیفیت، دکورکاری، بسته‌بندی و ارسال.',
  current: 'process.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'فرآیند تولید' }])],
  body: [
    pageHead({
      kicker: 'فرآیند تولید',
      title: 'از مواد اولیه تا محصول نهایی',
      lead: 'هر محصول چینی لوتوس مسیر مشخصی را طی می‌کند تا از مرحلهٔ آماده‌سازی مواد اولیه به محصول نهایی برسد.',
      aside: `<a class="btn btn--solid btn--lg" href="quality.html">${icon('shield', 'btn__ico')} کنترل کیفیت</a>
        <a class="btn btn--outline" href="gallery.html">گالری کارگاه</a>`,
      crumbs: [{ label: 'فرآیند تولید' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <h2 class="h2">یازده مرحلهٔ تولید</h2>
        <p class="lead mt-6">تولید در چینی لوتوس یک مسیر پیوسته است؛ در هر مرحله، محصول پیش از رفتن به مرحلهٔ بعد بررسی می‌شود. روش شکل‌دهی اصلی در این مجموعه ریخته‌گری است و بسته به محصول، از فرمینگ و روش‌های متناسب دیگر نیز استفاده می‌شود.</p>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/workshop/lotus-workshop-04.webp" alt="سالن تولید و قفسه‌های بدنهٔ قوری در کارگاه چینی لوتوس" loading="lazy" width="1100" height="521" srcset="media/workshop/lotus-workshop-04-550.webp 550w, media/workshop/lotus-workshop-04-800.webp 800w, media/workshop/lotus-workshop-04.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>سالن تولید چینی لوتوس</span><span>اصفهان</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    stepNav(),
    `<section class="sec sec--clay" id="steps">
  <div class="wrap">
    ${secHead({
      kicker: 'مراحل تولید',
      title: 'مسیر ساخت یک قوری، در یازده مرحله',
      lead: 'مراحل در سه فاز دسته‌بندی شده‌اند: آماده‌سازی و شکل‌دهی، پخت و لعاب، و در پایان دکور، کنترل و ارسال. تصاویر همه از کارگاه چینی لوتوس است.',
      rule: true,
    })}
    ${processMap()}
  </div>
</section>`,
    methodsSection(),
    `<section class="sec sec--ink">
  <div class="wrap">
    <div class="split">
      <div class="reveal">
        ${eyebrow('توان تولید')}
        <h2 class="h1">تولید مستقیم، از قالب تا کوره</h2>
        <p class="lead mt-6">چینی لوتوس با تمرکز بر تولید، تلاش می‌کند فرآیند ساخت و کیفیت محصول را با دقت بیشتری مدیریت کند. تولید مستقیم به این معناست که سفارش شما از مرحلهٔ مواد اولیه تا بسته‌بندی در همین مجموعه کنترل می‌شود.</p>
        <div class="cluster mt-7">
          <a class="btn btn--light" href="gallery.html">${icon('factory', 'btn__ico')} گالری کارگاه</a>
          <a class="btn btn--ghost-light" href="wholesale.html">همکاری عمده</a>
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/process/lotus-process-02.webp" alt="قفسه‌های محصول در کنار کوره در کارگاه چینی لوتوس" loading="lazy" width="1100" height="522" srcset="media/process/lotus-process-02-550.webp 550w, media/process/lotus-process-02-800.webp 800w, media/process/lotus-process-02.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>پیش از ورود به کوره</span><span>پخت اولیه</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۵. کنترل کیفیت ---------- */
P.push({
  file: 'quality.html',
  title: 'کنترل کیفیت در تولید چینی',
  description:
    'کیفیت در چینی لوتوس بخشی از فرآیند تولید است؛ کنترل مواد اولیه، بدنه، سطح، لعاب، یکنواختی تولید و شرایط بسته‌بندی در چند مرحله بررسی می‌شود.',
  current: 'quality.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'کنترل کیفیت' }])],
  body: [
    pageHead({
      kicker: 'کنترل کیفیت',
      title: 'کیفیت، بخشی از فرآیند تولید است',
      lead: 'در چینی لوتوس، کیفیت محصول تنها در پایان فرآیند تولید بررسی نمی‌شود.',
      crumbs: [{ label: 'کنترل کیفیت' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <div class="prose">
          <p>تلاش مجموعه بر این است که در تمامی مراحل مختلف تولید، کیفیت محصولات با دقت بررسی شده و محصول نهایی پیش از بسته‌بندی و ارسال در چند مرحله بررسی شود.</p>
          <p>کنترل ظاهر، سلامت محصول، کیفیت سطح، یکنواختی تولید و شرایط بسته‌بندی، از جمله مواردی هستند که می‌توانند در فرآیند کنترل کیفیت مورد توجه قرار گیرند.</p>
          <p><strong>هدف چینی لوتوس، ارائهٔ محصولی است که مشتری با اطمینان آن را خریداری، عرضه و استفاده کند.</strong></p>
        </div>
        <ul class="list-check mt-8">
          <li>بررسی و آزمایش مواد اولیه پیش از ورود به خط تولید</li>
          <li>کنترل بدنه پس از شکل‌دهی و خشک شدن</li>
          <li>بررسی سطح و لعاب پس از پخت نهایی</li>
          <li>جداسازی محصولات دارای ایراد پیش از دکورکاری</li>
          <li>بازرسی نهایی ظاهر، سلامت و یکنواختی</li>
          <li>کنترل شرایط بسته‌بندی پیش از ارسال</li>
        </ul>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--tall">
          <img  src="media/workshop/quality-control.webp" alt="کنترل کیفیت قوری‌های چینی پیش از بسته‌بندی" loading="lazy" width="1100" height="922" srcset="media/workshop/quality-control-550.webp 550w, media/workshop/quality-control-800.webp 800w, media/workshop/quality-control.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>بازرسی نهایی محصول</span><span>چینی لوتوس</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay" id="stations">
  <div class="wrap">
    ${secHead({
      kicker: 'چهار ایستگاه کنترلی',
      title: 'کیفیت در کدام مراحل بررسی می‌شود؟',
      lead: 'کنترل کیفیت در چینی لوتوس یک ایستگاه پایانی نیست؛ در چهار نقطهٔ مسیر تولید انجام می‌شود.',
    })}
    <div class="grid-4">
      ${qualityStations
        .map(
          (c, i) => `<article class="station reveal" data-delay="${i + 1}">
        <span class="pillar__n">${c.n}</span>
        <h3 class="h3">${c.title}</h3>
        <p>${c.text}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`,
    `<section class="sec sec--paper" id="criteria">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        ${secHead({
          kicker: 'معیارها',
          title: 'چه چیزهایی بررسی می‌شود؟',
          lead: 'این‌ها معیارهایی است که در بازبینی محصول در نظر گرفته می‌شود.',
        })}
        <table class="spec-table">
          <tbody>
            ${qualityCriteria.map((c) => `<tr><th>${c.k}</th><td>${c.v}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/process/lotus-process-08.webp" alt="بررسی بدنه و سطح قوری‌های چینی در کارگاه چینی لوتوس" loading="lazy" width="1100" height="522" srcset="media/process/lotus-process-08-550.webp 550w, media/process/lotus-process-08-800.webp 800w, media/process/lotus-process-08.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>بررسی بدنه پیش از دکورکاری</span><span>مرحلهٔ ۰۸</span></figcaption>
        </figure>
        <figure class="figure figure--wide mt-6">
          <img  src="media/workshop/glaze-stage.webp" alt="اجرای لعاب روی بدنه‌های قوری چینی لوتوس" loading="lazy" width="1100" height="547" srcset="media/workshop/glaze-stage-550.webp 550w, media/workshop/glaze-stage-800.webp 800w, media/workshop/glaze-stage.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>سطح و لعاب، پیش از پخت نهایی</span><span>مرحلهٔ ۰۶</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--ink">
  <div class="wrap wrap--narrow center">
    ${eyebrow('تعهد ما')}
    <p class="lead" style="font-size:var(--t-2);color:var(--clay-100)">هدف چینی لوتوس، ارائهٔ محصولی است که مشتری با اطمینان آن را خریداری، عرضه و استفاده کند.</p>
    <div class="cluster mt-8" style="justify-content:center">
      <a class="btn btn--light" href="process.html">${icon('factory', 'btn__ico')} مشاهدهٔ فرآیند تولید</a>
      <a class="btn btn--ghost-light" href="gallery.html">گالری کارگاه</a>
    </div>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۶. دربارهٔ ما ---------- */
P.push({
  file: 'about.html',
  title: 'دربارهٔ چینی لوتوس',
  description:
    'چینی لوتوس از سال ۱۳۹۵ در اصفهان فعالیت خود را با تولید محصولات چینی به روش ریخته‌گری آغاز کرد و امروز با یک دهه تجربه، محصولات خود را در سراسر ایران عرضه می‌کند.',
  current: 'about.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'دربارهٔ ما' }])],
  body: [
    pageHead({
      kicker: 'دربارهٔ چینی لوتوس',
      title: 'هر محصولی که از یک کارگاه تولیدی خارج می‌شود، پشت خود داستانی از تجربه، تلاش و دقت دارد.',
      lead: 'چینی لوتوس فعالیت خود را در سال ۱۳۹۵ در شهر اصفهان آغاز کرد.',
      aside: `<a class="btn btn--outline" href="vision.html">${icon('spark', 'btn__ico')} چشم‌انداز چینی لوتوس</a>
        <a class="btn btn--outline" href="partners.html">برندها و همکاران</a>`,
      crumbs: [{ label: 'دربارهٔ ما' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <div class="prose">
          <p>این مجموعه از ابتدا با تمرکز بر تولید محصولات چینی به روش ریخته‌گری فعالیت خود را توسعه داد و در طول سال‌های فعالیت، با شناخت دقیق‌تر نیاز بازار و افزایش تجربه در تولید، مسیر رشد خود را ادامه داد.</p>
          <p>امروز چینی لوتوس با تکیه بر یک دهه تجربه، توان تولید و شبکهٔ فروش و توزیع، محصولات خود را در اختیار مشتریان و همکاران در سراسر ایران قرار می‌دهد.</p>
          <p>تمرکز ما در چینی لوتوس تنها بر تولید یک محصول نیست؛ بلکه تلاش می‌کنیم محصولی تولید کنیم که از نظر ظاهر، کاربرد، کیفیت و قابلیت عرضه در بازار پاسخ‌گوی نیاز مشتری باشد.</p>
          <p>همکاری با فروشندگان، عمده‌فروشان و مجموعه‌های تجاری در سراسر کشور، بخش مهمی از فعالیت چینی لوتوس را تشکیل می‌دهد و توسعهٔ همکاری‌های صادراتی نیز یکی از مسیرهای پیش روی این مجموعه است.</p>
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--tall">
          <img src="media/process/lotus-process-13.webp" alt="قوری سفید و قوری با نقش گل نیلی در کارگاه چینی لوتوس" loading="lazy" width="1100" height="521">
          <figcaption><span>از بدنهٔ سپید تا نقش نهایی</span><span>چینی لوتوس</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay">
  <div class="wrap">
    ${secHead({ kicker: 'اطلاعات مجموعه', title: 'چینی لوتوس در یک نگاه' })}
    <table class="spec-table" style="max-width:820px">
      <tbody>
        <tr><th>سال شروع فعالیت</th><td>۱۳۹۵</td></tr>
        <tr><th>محل شروع فعالیت</th><td>اصفهان</td></tr>
        <tr><th>محل فعلی کارگاه</th><td>منطقهٔ صنعتی دولت‌آباد اصفهان</td></tr>
        <tr><th>سابقهٔ فعالیت</th><td>یک دهه (۱۰ سال)</td></tr>
        <tr><th>زمینهٔ فعالیت اولیه</th><td>تولید محصولات چینی به روش ریخته‌گری</td></tr>
        <tr><th>زمینهٔ فعالیت فعلی</th><td>تولید محصولات چینی از جمله قوری، نمک‌پاش، سس‌خوری و …</td></tr>
        <tr><th>دفتر فروش</th><td>${site.addressOffice}</td></tr>
        <tr><th>آدرس کارگاه</th><td>${site.addressWorkshop}</td></tr>
      </tbody>
    </table>
  </div>
</section>`,
    `<section class="sec sec--paper">
  <div class="wrap">
    ${secHead({ kicker: 'چرا چینی لوتوس؟', title: 'شش دلیل برای همکاری با ما', rule: true })}
    <div class="grid-3">
      ${reasons
        .map(
          (r, i) => `<article class="reveal" data-delay="${(i % 3) + 1}" style="padding-block:1.5rem;border-top:1px solid var(--clay-200)">
        <span class="pillar__n">${r.n}</span>
        <h3 class="h3">${r.title}</h3>
        <p class="muted mt-6" style="font-size:var(--t--1);line-height:1.9">${r.text}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`,
    milestonesSection(),
    `<section class="sec sec--ink">
  <div class="wrap">
    <div class="split split--wide-right">
      <div class="reveal">
        ${eyebrow('فرآیند و کیفیت')}
        <h2 class="h1">تولیدکننده بودن، یعنی کنترل همهٔ مراحل</h2>
        <p class="lead mt-6">یازده مرحلهٔ تولید، چهار ایستگاه کنترل کیفیت و بسته‌بندی متناسب با روش ارسال؛ این‌ها چیزی است که پشت هر قوری چینی لوتوس قرار دارد.</p>
        <div class="cluster mt-7">
          <a class="btn btn--light" href="process.html">${icon('factory', 'btn__ico')} فرآیند تولید</a>
          <a class="btn btn--ghost-light" href="quality.html">${icon('shield', 'btn__ico')} کنترل کیفیت</a>
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img  src="media/workshop/lotus-workshop-02.webp" alt="سالن انبار و قفسه‌های محصولات چینی لوتوس" loading="lazy" width="1100" height="522" srcset="media/workshop/lotus-workshop-02-550.webp 550w, media/workshop/lotus-workshop-02-800.webp 800w, media/workshop/lotus-workshop-02.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>انبار محصول نهایی</span><span>اصفهان</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۷. چشم‌انداز ---------- */
P.push({
  file: 'vision.html',
  title: 'چشم‌انداز چینی لوتوس',
  description:
    'چشم‌انداز چینی لوتوس، توسعهٔ یک برند ایرانی با توان رقابت در بازارهای داخلی و بین‌المللی است؛ از یک کارگاه تولیدی تا یک نام ماندگار.',
  current: 'about.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'دربارهٔ ما', href: 'about.html' }, { label: 'چشم‌انداز' }])],
  body: [
    pageHead({
      kicker: 'چشم‌انداز',
      title: 'از یک کارگاه تولیدی تا یک نام ماندگار',
      lead: 'چشم‌انداز چینی لوتوس، توسعهٔ یک برند ایرانی با توان رقابت در بازارهای داخلی و بین‌المللی است.',
      crumbs: [{ label: 'دربارهٔ ما', href: 'about.html' }, { label: 'چشم‌انداز' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split">
      <div class="reveal">
        <div class="prose">
          <p>ما می‌خواهیم چینی لوتوس تنها به عنوان یک تولیدکننده شناخته نشود؛ بلکه به عنوان یک شریک قابل اعتماد برای تأمین محصولات در ذهن مشتریان و فعالان بازار قرار گیرد.</p>
          <p>توسعهٔ تنوع محصولات، افزایش ظرفیت تولید، ارتقای کیفیت، گسترش شبکهٔ همکاری در ایران و ورود قدرتمندتر به بازارهای صادراتی، مسیر آیندهٔ چینی لوتوس را شکل می‌دهد.</p>
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <ul class="list-check">
          <li>توسعهٔ تنوع محصولات و طرح‌ها</li>
          <li>افزایش ظرفیت تولید</li>
          <li>ارتقای مستمر کیفیت</li>
          <li>گسترش شبکهٔ همکاری در ایران</li>
          <li>ورود قدرتمندتر به بازارهای صادراتی</li>
          <li>تبدیل شدن به شریک قابل اعتماد تأمین</li>
        </ul>
      </div>
    </div>
  </div>
</section>`,
    visionValues(),
    `<section class="sec sec--ink">
  <div class="wrap">
    ${secHead({ kicker: 'مسیر پیش رو', title: 'پنج محور توسعه' })}
    <div class="stats">
      ${[
        { v: '۱۵', k: 'طرح فعال قوری' },
        { v: '۱۱', k: 'مرحلهٔ تولید' },
        { v: '۴', k: 'دستهٔ محصول' },
        { v: 'سراسر ایران', k: 'پوشش فروش' },
        { v: 'صادرات', k: 'مسیر پیش رو' },
      ]
        .map((s) => `<div class="stat"><div class="stat__v">${s.v}</div><div class="stat__k">${s.k}</div></div>`)
        .join('')}
    </div>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۸. فروش عمده ---------- */
P.push({
  file: 'wholesale.html',
  title: 'فروش عمده و همکاری تجاری',
  description:
    'همکاری عمده با چینی لوتوس؛ تأمین قوری و ظروف چینی برای عمده‌فروشان، کتری‌سازان، فروشگاه‌ها، مراکز پخش، توزیع‌کنندگان، رستوران‌ها و هتل‌ها.',
  current: 'wholesale.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'فروش عمده' }])],
  body: [
    pageHead({
      kicker: 'فروش عمده',
      title: 'همکاری عمده با چینی لوتوس',
      lead: 'اگر به دنبال تأمین مستقیم و مطمئن محصولات هستید، چینی لوتوس آمادهٔ همکاری با مجموعه‌های تجاری و خریداران عمده است.',
      aside: `<a class="btn btn--solid btn--lg" href="${wa('سلام، درخواست همکاری عمده دارم. لطفاً کاتالوگ، لیست محصولات و شرایط فروش را ارسال کنید.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} درخواست کاتالوگ و قیمت</a>
        <a class="btn btn--outline" href="contact.html">فرم درخواست همکاری</a>`,
      crumbs: [{ label: 'فروش عمده' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    ${secHead({ kicker: 'مخاطبان همکاری', title: 'محصولات خود را برای این مجموعه‌ها تأمین می‌کنیم', lead: 'ما با هدف ایجاد همکاری‌های پایدار، محصولات خود را برای مجموعه‌های زیر تأمین می‌کنیم.' })}
    <div class="chips">
      ${wholesaleAudience.map((a) => `<span class="chip">${a}</span>`).join('')}
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        ${secHead({ kicker: 'درخواست همکاری', title: 'برای دریافت کاتالوگ و شرایط فروش' })}
        <p class="lead">برای دریافت کاتالوگ، لیست محصولات، شرایط فروش و استعلام قیمت، اطلاعات خود را برای واحد فروش چینی لوتوس ارسال کنید. کارشناسان ما در اولین فرصت پاسخ می‌دهند.</p>
        <ul class="list-check mt-7">
          <li>کاتالوگ کامل ۱۵ طرح قوری همراه با کد طرح</li>
          <li>لیست قیمت و شرایط تأمین عمده</li>
          <li>زمان آماده‌سازی و شرایط ارسال به شهر شما</li>
          <li>امکان بررسی تولید سفارشی و درج نشان تجاری شما</li>
        </ul>
        <div class="cluster mt-7">
          <a class="btn btn--solid" href="${tel}">${icon('phone', 'btn__ico')} تماس با واحد فروش</a>
          <a class="btn btn--outline" href="${wa('سلام، درخواست همکاری عمده دارم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} واتساپ</a>
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <form class="form" data-inquiry="wholesale" novalidate>
          <div class="form__row">
            <div class="field"><label for="w-name">نام و نام خانوادگی</label><input id="w-name" name="name" autocomplete="name" required></div>
            <div class="field"><label for="w-phone">شمارهٔ تماس</label><input id="w-phone" name="phone" inputmode="tel" autocomplete="tel" required></div>
          </div>
          <div class="field"><label for="w-biz">نام مجموعه / فروشگاه</label><input id="w-biz" name="business" autocomplete="organization"></div>
          <div class="field"><label for="w-city">شهر</label><input id="w-city" name="city" autocomplete="address-level2"></div>
          <div class="field">
            <label for="w-type">نوع همکاری</label>
            <select id="w-type" name="type">
              <option>خرید عمده</option>
              <option>نمایندگی / توزیع</option>
              <option>تولید سفارشی با برند مجموعه</option>
              <option>صادرات</option>
            </select>
          </div>
          <div class="field">
            <label for="w-msg">توضیحات سفارش</label>
            <textarea id="w-msg" name="message" placeholder="طرح‌های مورد نظر، تعداد تقریبی و زمان مورد نیاز"></textarea>
          </div>
          <button class="btn btn--solid btn--lg" type="submit">${icon('whatsapp', 'btn__ico')} ارسال درخواست در واتساپ</button>
          <p class="field__hint">با زدن دکمه، متن درخواست به‌صورت آماده در واتساپ باز می‌شود تا برای واحد فروش ارسال کنید. اطلاعات شما در این سایت ذخیره نمی‌شود.</p>
        </form>
      </div>
    </div>
  </div>
</section>`,
    cooperationModelsSection(),
    cooperationPath(),
    wholesaleNeedsSection(),
    termsSection(),
    faqSection({ limit: 5 }),
  ].join('\n'),
});

/* ---------- ۹. ارسال ---------- */
P.push({
  file: 'shipping.html',
  title: 'ارسال به سراسر ایران',
  description:
    'ارسال محصولات چینی لوتوس به سراسر ایران با شرکت‌های حمل و نقل و باربری؛ بسته‌بندی تک جعبه چیدمان‌شده در کارتن مادر.',
  current: 'shipping.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'ارسال به سراسر ایران' }])],
  body: [
    pageHead({
      kicker: 'ارسال',
      title: 'چینی لوتوس؛ از کارگاه تا سراسر ایران',
      lead: 'محدود به یک شهر نیستیم. محصولات چینی لوتوس برای مشتریان و همکاران در سراسر ایران تأمین و ارسال می‌شود.',
      crumbs: [{ label: 'ارسال به سراسر ایران' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <div class="prose">
          <p>هدف ما این است که مشتریان، فارغ از موقعیت جغرافیایی، بتوانند سفارش خود را با هماهنگی واحد فروش ثبت کرده و محصول را در مقصد دریافت کنند.</p>
          <p>بسته‌بندی محصولات متناسب با نوع سفارش و روش ارسال انجام می‌شود تا محصول سالم و بدون آسیب به دست مشتری برسد.</p>
        </div>
        <table class="spec-table mt-8">
          <tbody>
            <tr><th>شهرهای تحت پوشش</th><td>سراسر ایران</td></tr>
            <tr><th>روش ارسال</th><td>شرکت‌های حمل و نقل و باربری‌ها</td></tr>
            <tr><th>نحوهٔ بسته‌بندی برای ارسال</th><td>تک جعبه چیدمان‌شده در کارتن مادر</td></tr>
            <tr><th>زمان تقریبی ارسال</th><td>با توجه به سفارش متغیر است</td></tr>
            <tr><th>هزینهٔ ارسال</th><td>بر عهدهٔ مشتری</td></tr>
            <tr><th>شرایط ارسال</th><td>با توافق با مشتری</td></tr>
          </tbody>
        </table>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--tall">
          <img src="media/process/lotus-process-04.webp" alt="آماده‌سازی سفارش‌ها برای ارسال در کارگاه چینی لوتوس" loading="lazy" width="1100" height="521">
          <figcaption><span>آماده‌سازی سفارش‌ها</span><span>کارگاه اصفهان</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay">
  <div class="wrap">
    ${secHead({ kicker: 'مسیر سفارش', title: 'از ثبت سفارش تا تحویل در مقصد', rule: true })}
    <div class="grid-4">
      ${[
        { n: '۰۱', t: 'ثبت سفارش', d: 'تعداد و طرح مورد نظر را با واحد فروش هماهنگ می‌کنید.' },
        { n: '۰۲', t: 'آماده‌سازی', d: 'سفارش بر اساس زمان اعلام‌شده آماده و بسته‌بندی می‌شود.' },
        { n: '۰۳', t: 'تحویل به باربری', d: 'سفارش به شرکت حمل و نقل یا باربری انتخابی تحویل داده می‌شود.' },
        { n: '۰۴', t: 'دریافت در مقصد', d: 'محصول در شهر مقصد در اختیار مشتری قرار می‌گیرد.' },
      ]
        .map(
          (c, i) => `<article class="reveal" data-delay="${i + 1}" style="background:var(--clay-50);border:1px solid var(--clay-200);padding:1.5rem 1.35rem">
        <span class="pillar__n">${c.n}</span>
        <h3 class="h3">${c.t}</h3>
        <p class="muted mt-6" style="font-size:var(--t--1);line-height:1.9">${c.d}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`,
    `<section class="sec sec--ink">
  <div class="wrap">
    <div class="split split--wide-right">
      <div class="reveal">
        ${eyebrow('صادرات')}
        <h2 class="h1">آماده برای بازارهای فراتر از ایران</h2>
        <p class="lead mt-6">چینی لوتوس امکان همکاری با مشتریان و مجموعه‌های تجاری خارج از ایران را نیز بررسی و دنبال می‌کند.</p>
        <div class="mt-7"><a class="btn btn--light" href="export.html">${icon('globe', 'btn__ico')} درخواست همکاری صادراتی</a></div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--wide">
          <img src="media/process/lotus-process-11.webp" alt="ردیف محصولات آمادهٔ ارسال در کارگاه چینی لوتوس" loading="lazy" width="1100" height="522">
          <figcaption><span>محصولات آمادهٔ ارسال</span><span>چینی لوتوس</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۱۰. صادرات ---------- */
P.push({
  file: 'export.html',
  title: 'صادرات محصولات چینی',
  description:
    'چینی لوتوس آمادهٔ بررسی همکاری صادراتی با شرکت‌های بازرگانی، واردکنندگان، توزیع‌کنندگان و خریداران عمدهٔ خارج از ایران است.',
  current: 'export.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'صادرات' }])],
  body: [
    pageHead({
      kicker: 'صادرات',
      title: 'چینی لوتوس؛ آماده برای بازارهای فراتر از ایران',
      lead: 'کیفیت یک محصول زمانی معنا پیدا می‌کند که بتواند در بازارهای مختلف نیز جایگاه خود را پیدا کند.',
      aside: `<a class="btn btn--solid btn--lg" href="${wa('سلام، درخواست همکاری صادراتی با چینی لوتوس دارم.')}" target="_blank" rel="noopener">${icon('globe', 'btn__ico')} درخواست همکاری صادراتی</a>`,
      crumbs: [{ label: 'صادرات' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <div class="prose">
          <p>چینی لوتوس با تکیه بر توان تولید و ظرفیت تأمین سفارش‌های عمده، توسعهٔ همکاری با بازارهای خارجی را به عنوان یکی از مسیرهای رشد خود دنبال می‌کند.</p>
          <p>ما آمادهٔ بررسی همکاری با شرکت‌های بازرگانی، واردکنندگان، توزیع‌کنندگان و خریداران عمدهٔ خارج از ایران هستیم. شرایط سفارش صادراتی متناسب با هر بازار و حجم سفارش تعیین می‌شود.</p>
        </div>
        <ul class="list-check mt-8">
          <li>شرکت‌های بازرگانی و صادرات/واردات</li>
          <li>واردکنندگان ظروف و محصولات چینی</li>
          <li>توزیع‌کنندگان و عمده‌فروشان منطقه‌ای</li>
          <li>خریداران عمدهٔ سازمانی در بازارهای خارجی</li>
        </ul>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--tall">
          <img  src="media/workshop/lotus-workshop-04.webp" alt="ظرفیت تولید و قفسه‌های محصولات چینی لوتوس برای سفارش‌های عمده" loading="lazy" width="1100" height="521" srcset="media/workshop/lotus-workshop-04-550.webp 550w, media/workshop/lotus-workshop-04-800.webp 800w, media/workshop/lotus-workshop-04.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>ظرفیت تولید برای سفارش عمده</span><span>اصفهان</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay">
  <div class="wrap">
    ${secHead({ kicker: 'مزیت‌های همکاری', title: 'چرا چینی لوتوس برای همکاری صادراتی؟' })}
    <div class="grid-3">
      ${[
        { i: 'factory', t: 'تولید مستقیم', d: 'کنترل فرآیند ساخت از مواد اولیه تا بسته‌بندی، در مجموعهٔ خودمان.' },
        { i: 'box', t: 'توان تأمین عمده', d: 'ظرفیت تولید و تأمین برای سفارش‌های حجمی و همکاری بلندمدت.' },
        { i: 'grid', t: 'تنوع طرح', d: '۱۵ طرح فعال قوری در نقش‌های سپید، برجسته، گل‌وبوته و هندسی.' },
        { i: 'handshake', t: 'تولید با برند شما', d: 'امکان بررسی درج نشان تجاری و تولید سفارشی متناسب با بازار شما.' },
        { i: 'shield', t: 'کنترل کیفیت', d: 'بازبینی محصول در چند مرحله پیش از بسته‌بندی و ارسال.' },
        { i: 'truck', t: 'هماهنگی ارسال', d: 'بسته‌بندی مناسب حمل و هماهنگی ارسال با شرکت‌های حمل.' },
      ]
        .map(
          (c, i) => `<article class="reveal" data-delay="${(i % 3) + 1}" style="background:var(--clay-50);border:1px solid var(--clay-200);padding:1.6rem 1.4rem">
        <div style="color:var(--ember-500);width:26px;height:26px;margin-block-end:1rem">${icon(c.i)}</div>
        <h3 class="h3">${c.t}</h3>
        <p class="muted mt-6" style="font-size:var(--t--1);line-height:1.9">${c.d}</p>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`,
    exportStepsSection(),
  ].join('\n'),
});

/* ---------- ۱۱. سفارش اختصاصی ---------- */
P.push({
  file: 'custom.html',
  title: 'سفارش اختصاصی و تولید سفارشی',
  description:
    'تولید سفارشی در چینی لوتوس: تولید در ابعاد اختصاصی، طرح و نقش اختصاصی و تولید با برند مشتری، بر اساس بررسی ظرفیت تولید.',
  current: 'custom.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'سفارش اختصاصی' }])],
  body: [
    pageHead({
      kicker: 'سفارش اختصاصی',
      title: 'محصولی متناسب با نیاز شما',
      lead: 'در صورت امکان، چینی لوتوس می‌تواند سفارش‌های خاص و نیازهای اختصاصی مشتریان را بررسی کند.',
      aside: `<a class="btn btn--solid btn--lg" href="${wa('سلام، درخواست تولید سفارشی دارم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} ثبت درخواست سفارشی</a>`,
      crumbs: [{ label: 'سفارش اختصاصی' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <div class="prose">
          <p>از انتخاب مدل و ابعاد تا رنگ، طرح، بسته‌بندی یا درج نشان تجاری، نیاز مشتری بررسی شده و امکان اجرای آن بر اساس ظرفیت تولید مجموعه ارزیابی می‌شود.</p>
        </div>
        <div class="grid-3 mt-8">
          ${[
            { i: 'drop', t: 'تولید در ابعاد اختصاصی', d: 'امکان بررسی تولید در ابعاد و ظرفیت‌های متفاوت از محصولات موجود.' },
            { i: 'spark', t: 'تولید در طرح و نقش اختصاصی', d: 'اجرای نقش، کتیبه یا ترکیب رنگی اختصاصی بر اساس نیاز مشتری.' },
            { i: 'handshake', t: 'تولید با برند مشتری', d: 'امکان بررسی درج نشان تجاری مشتری روی محصول و بسته‌بندی.' },
          ]
            .map(
              (c, i) => `<article class="reveal" data-delay="${i + 1}">
            <div style="color:var(--ember-500);width:26px;height:26px;margin-block-end:1rem">${icon(c.i)}</div>
            <h3 class="h3">${c.t}</h3>
            <p class="muted mt-6" style="font-size:var(--t--1);line-height:1.9">${c.d}</p>
          </article>`
            )
            .join('')}
        </div>
        <hr class="rule mt-8">
        <p class="muted mt-6" style="font-size:var(--t--1)">امکان‌سنجی سفارش سفارشی بسته به نوع، تعداد و ظرفیت تولید مجموعه بررسی می‌شود و جزئیات پس از بررسی اعلام می‌گردد.</p>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--tall">
          <img  src="media/workshop/printed-transfer.webp" alt="اجرای نقش بر بدنهٔ قوری چینی در کارگاه چینی لوتوس" loading="lazy" width="1100" height="733" srcset="media/workshop/printed-transfer-550.webp 550w, media/workshop/printed-transfer-800.webp 800w, media/workshop/printed-transfer.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>اجرای نقش و دکورکاری</span><span>مرحلهٔ ۰۹</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay">
  <div class="wrap wrap--narrow">
    ${secHead({ kicker: 'فرم درخواست', title: 'نیاز خود را برای ما بنویسید', center: true, lead: 'اطلاعات را تکمیل کنید؛ متن درخواست به‌صورت آماده در واتساپ باز می‌شود.' })}
    <form class="form" data-inquiry="custom" novalidate>
      <div class="form__row">
        <div class="field"><label for="c-name">نام و نام خانوادگی</label><input id="c-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="c-phone">شمارهٔ تماس</label><input id="c-phone" name="phone" inputmode="tel" autocomplete="tel" required></div>
      </div>
      <div class="field">
        <label for="c-kind">نوع سفارش اختصاصی</label>
        <select id="c-kind" name="kind">
          <option>تولید در ابعاد اختصاصی</option>
          <option>تولید در طرح و نقش اختصاصی</option>
          <option>تولید با برند مشتری</option>
          <option>ترکیبی از موارد بالا</option>
        </select>
      </div>
      <div class="form__row">
        <div class="field"><label for="c-qty">تعداد تقریبی</label><input id="c-qty" name="quantity" inputmode="numeric"></div>
        <div class="field"><label for="c-when">زمان مورد نیاز</label><input id="c-when" name="when"></div>
      </div>
      <div class="field">
        <label for="c-msg">توضیح سفارش</label>
        <textarea id="c-msg" name="message" placeholder="مدل، ابعاد، رنگ، طرح یا نشان تجاری مورد نظر"></textarea>
      </div>
      <button class="btn btn--solid btn--lg" type="submit">${icon('whatsapp', 'btn__ico')} ارسال درخواست در واتساپ</button>
      <p class="field__hint">اطلاعات شما در این سایت ذخیره نمی‌شود.</p>
    </form>
  </div>
</section>`,
    customStepsSection(),
    customOptionsSection(),
  ].join('\n'),
});

/* ---------- ۱۲. برندها و همکاران ---------- */
P.push({
  file: 'partners.html',
  title: 'برندها و مجموعه‌های همکار',
  description:
    'همکاری چینی لوتوس با فروشندگان، توزیع‌کنندگان و مجموعه‌های تجاری در سراسر ایران؛ اعتماد ساخته می‌شود، همکاری ادامه پیدا می‌کند.',
  current: 'partners.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'برندها و همکاران' }])],
  body: [
    pageHead({
      kicker: 'برندها و همکاران',
      title: 'اعتماد ساخته می‌شود؛ همکاری ادامه پیدا می‌کند.',
      lead: 'در طول فعالیت چینی لوتوس، همکاری با مجموعه‌های مختلف بخشی از مسیر رشد این برند بوده است.',
      crumbs: [{ label: 'برندها و همکاران' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <div class="prose">
          <p>همکاری با فروشندگان، توزیع‌کنندگان، مجموعه‌های تجاری و سایر فعالان این حوزه، تجربه‌ای ارزشمند برای چینی لوتوس ایجاد کرده است.</p>
          <p>ما در چینی لوتوس همکاری را یک رابطهٔ یک‌طرفه نمی‌بینیم؛ هدف ما این است که در کنار همکاران تجاری، مسیر رشد مشترک و پایداری شکل بگیرد.</p>
        </div>
        <div class="grid-3 mt-8">
          ${[
            { v: 'سراسر ایران', k: 'شبکهٔ همکاری' },
            { v: 'خرده و عمده', k: 'انواع همکاری' },
            { v: 'بلندمدت', k: 'رویکرد ما' },
          ]
            .map((s, i) => `<div class="stat reveal" data-delay="${i + 1}" style="border:1px solid var(--clay-200)"><div class="stat__v" style="font-size:1.5rem">${s.v}</div><div class="stat__k">${s.k}</div></div>`)
            .join('')}
        </div>
      </div>
      <div class="reveal" data-delay="2">
        <figure class="figure figure--tall">
          <img  src="media/process/lotus-process-10.webp" alt="بسته‌بندی و آماده‌سازی سفارش همکاران تجاری چینی لوتوس" loading="lazy" width="1100" height="522" srcset="media/process/lotus-process-10-550.webp 550w, media/process/lotus-process-10-800.webp 800w, media/process/lotus-process-10.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
          <figcaption><span>آماده‌سازی سفارش همکاران</span><span>چینی لوتوس</span></figcaption>
        </figure>
      </div>
    </div>
  </div>
</section>`,
    cooperationModelsSection(),
    partnerExchange(),
    partnerTypes(),
    cooperationPath(),
    partnerFaq(),
    `<section class="sec sec--clay sec--tight">
  <div class="wrap wrap--narrow center">
    <p class="lead reveal">اگر فروشنده، توزیع‌کننده یا مجموعهٔ تجاری هستید و به همکاری بلندمدت با یک تولیدکنندهٔ چینی علاقه‌مندید، خوشحال می‌شویم گفت‌وگو را شروع کنیم.</p>
    <div class="cluster mt-7" style="justify-content:center">
      <a class="btn btn--solid btn--lg" href="wholesale.html">شروع همکاری</a>
      <a class="btn btn--outline btn--lg" href="${wa('سلام، برای همکاری بلندمدت با چینی لوتوس پیام می‌دهم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} واتساپ</a>
    </div>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۱۳. گالری کارگاه ---------- */

P.push({
  file: 'gallery.html',
  title: 'گالری کارگاه',
  description:
    'تصاویر کارگاه چینی لوتوس؛ از آماده‌سازی مواد اولیه و شکل‌دهی تا لعاب، پخت، کنترل کیفیت، دکورکاری، بسته‌بندی و ارسال.',
  current: 'gallery.html',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'گالری کارگاه' }])],
  body: [
    pageHead({
      kicker: 'گالری کارگاه',
      title: 'جایی که ایده به محصول تبدیل می‌شود',
      lead: 'در این بخش می‌خواهیم مخاطب فقط محصول نهایی را نبیند؛ بلکه با پشت صحنهٔ تولید چینی لوتوس نیز آشنا شود.',
      aside: `<a class="btn btn--outline" href="process.html">${icon('factory', 'btn__ico')} فرآیند تولید</a>`,
      crumbs: [{ label: 'گالری کارگاه' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="filterbar reveal" id="galleryFilters" role="tablist" aria-label="دسته‌بندی تصاویر">
      ${galleryFilters
        .map(
          (f, i) => `<button class="filterbar__btn" role="tab" aria-selected="${i === 0}" data-filter="${f.id}">${f.label}</button>`
        )
        .join('')}
    </div>
    <div class="gallery" id="gallery">
      ${galleryItems
        .map(
          (g) => `<figure class="gallery__item ${g.lead ? 'gallery__item--lead' : ''} reveal" data-cat="${g.cat}" data-full="${g.src}" data-cap="${escapeHtml(g.cap)}" tabindex="0" role="button" aria-label="بزرگ‌نمایی: ${escapeHtml(g.cap)}">
        <img src="${g.src}" alt="${escapeHtml(g.cap)} — کارگاه چینی لوتوس" loading="lazy" width="1100" height="522">
        <figcaption class="gallery__cap">${g.cap}</figcaption>
      </figure>`
        )
        .join('')}
    </div>
    <p class="muted mt-7" style="font-size:var(--t--1)">تصاویر بیشتر و کلیپ کارگاه در فاز بعدی تکمیل می‌شود. برای هماهنگی بازدید یا عکاسی از مجموعه، با مدیریت تماس بگیرید.</p>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۱۴. سؤالات متداول ---------- */
P.push({
  file: 'faq.html',
  title: 'سؤالات متداول',
  description: 'پاسخ پرسش‌های رایج دربارهٔ فروش عمده، ارسال به سراسر ایران، سفارش تعداد بالا، دریافت قیمت، صادرات و تولید سفارشی.',
  current: 'faq.html',
  schemas: [ldFaq(), ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'سؤالات متداول' }])],
  body: [
    pageHead({
      kicker: 'سؤالات متداول',
      title: 'پرسش‌های رایج دربارهٔ چینی لوتوس',
      lead: 'اگر پرسش شما در این فهرست نبود، واحد فروش چینی لوتوس آمادهٔ پاسخ‌گویی است.',
      aside: `<a class="btn btn--solid btn--lg" href="${tel}">${icon('phone', 'btn__ico')} ${site.phoneFa}</a>
        <a class="btn btn--outline" href="${wa('سلام، پرسشی دربارهٔ محصولات چینی لوتوس دارم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} واتساپ</a>`,
      crumbs: [{ label: 'سؤالات متداول' }],
    }),
    faqSection(),
    termsSection(),
  ].join('\n'),
});

/* ---------- ۱۵. تماس با ما ---------- */
P.push({
  file: 'contact.html',
  title: 'تماس با ما',
  description:
    'تماس با چینی لوتوس در اصفهان؛ شمارهٔ تماس و واتساپ ۰۹۱۳۸۹۰۰۷۰۰، آدرس کارگاه و دفتر فروش، ساعات کاری ۸ الی ۱۷.',
  current: 'contact.html',
  schemas: [
    ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'تماس با ما' }]),
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `تماس با ${site.fa}`,
      description: 'راه‌های تماس با واحد فروش و کارگاه چینی لوتوس',
    },
  ],
  body: [
    pageHead({
      kicker: 'تماس با ما',
      title: 'با چینی لوتوس در ارتباط باشید',
      lead: 'برای دریافت اطلاعات محصولات، استعلام قیمت، ثبت سفارش، همکاری عمده یا درخواست همکاری صادراتی، با کارشناسان چینی لوتوس در ارتباط باشید.',
      crumbs: [{ label: 'تماس با ما' }],
    }),
    `<section class="sec sec--paper">
  <div class="wrap">
    <div class="split split--wide-left">
      <div class="reveal">
        <h2 class="h2">راه‌های ارتباطی</h2>
        <div class="grid-2 mt-7">
          <div>
            <h3 class="h3">شمارهٔ تماس و فروش</h3>
            <p class="mt-6"><a href="${tel}" style="font-size:var(--t-2);font-weight:600">${site.phoneFa}</a></p>
            <p class="muted" style="font-size:var(--t--1)">شمارهٔ تماس و شمارهٔ فروش یک شماره است.</p>
          </div>
          <div>
            <h3 class="h3">واتساپ</h3>
            <p class="mt-6"><a href="${wa('سلام، با چینی لوتوس تماس می‌گیرم.')}" target="_blank" rel="noopener" style="font-size:var(--t-2);font-weight:600">${site.phoneFa}</a></p>
            <p class="muted" style="font-size:var(--t--1)">ارسال تصویر، کاتالوگ و استعلام قیمت در واتساپ.</p>
          </div>
        </div>

        <hr class="rule mt-8">

        <div class="mt-8">
          <h3 class="h3">${icon('pin')} آدرس کارگاه</h3>
          <p class="lead mt-6">${site.addressWorkshop}</p>
        </div>
        <div class="mt-8">
          <h3 class="h3">آدرس دفتر فروش</h3>
          <p class="lead mt-6">${site.addressOffice}</p>
        </div>
        <div class="mt-8">
          <h3 class="h3">ساعات کاری</h3>
          <p class="lead mt-6">${site.hours}</p>
        </div>

        <div class="cluster mt-8">
          <a class="btn btn--solid" href="${wa('سلام، آدرس دقیق کارگاه چینی لوتوس را می‌خواهم.')}" target="_blank" rel="noopener">${icon('pin', 'btn__ico')} دریافت موقعیت روی نقشه</a>
          <a class="btn btn--outline" href="${tel}">${icon('phone', 'btn__ico')} تماس تلفنی</a>
        </div>
      </div>

      <div class="reveal" data-delay="2">
        <form class="form" data-inquiry="contact" novalidate>
          <h2 class="h3">فرم تماس</h2>
          <div class="form__row">
            <div class="field"><label for="f-name">نام و نام خانوادگی</label><input id="f-name" name="name" autocomplete="name" required></div>
            <div class="field"><label for="f-phone">شمارهٔ تماس</label><input id="f-phone" name="phone" inputmode="tel" autocomplete="tel" required></div>
          </div>
          <div class="field">
            <label for="f-subject">موضوع</label>
            <select id="f-subject" name="subject">
              <option>استعلام قیمت</option>
              <option>همکاری عمده</option>
              <option>سفارش اختصاصی</option>
              <option>همکاری صادراتی</option>
              <option>سایر موارد</option>
            </select>
          </div>
          <div class="field">
            <label for="f-msg">متن پیام</label>
            <textarea id="f-msg" name="message" required></textarea>
          </div>
          <button class="btn btn--solid btn--lg" type="submit">${icon('whatsapp', 'btn__ico')} ارسال پیام در واتساپ</button>
          <p class="field__hint">با زدن دکمه، متن پیام آماده در واتساپ باز می‌شود. اطلاعات شما در این سایت ذخیره نمی‌شود.</p>
        </form>
      </div>
    </div>
  </div>
</section>`,
    `<section class="sec sec--clay sec--tight">
  <div class="wrap">
    <div class="figure figure--wide reveal" style="aspect-ratio:auto">
      <img  src="media/workshop/lotus-workshop-02.webp" alt="کارگاه و انبار چینی لوتوس در اصفهان" loading="lazy" width="1100" height="522" style="aspect-ratio:21/7" srcset="media/workshop/lotus-workshop-02-550.webp 550w, media/workshop/lotus-workshop-02-800.webp 800w, media/workshop/lotus-workshop-02.webp 1100w" sizes="(max-width: 1024px) 92vw, 46vw">
      <figcaption><span>کارگاه و انبار چینی لوتوس — اصفهان، جادهٔ حبیب‌آباد</span><span>برای هماهنگی بازدید تماس بگیرید</span></figcaption>
    </div>
  </div>
</section>`,
  ].join('\n'),
});

/* ---------- ۱۶. صفحهٔ ۴۰۴ ---------- */
P.push({
  file: '404.html',
  title: 'صفحه یافت نشد',
  description: 'صفحهٔ مورد نظر پیدا نشد. برای یافتن محصول، طرح یا اطلاعات تماس از میان‌برهای این صفحه استفاده کنید.',
  body: `<section class="sec sec--porcelain">
  <div class="wrap wrap--narrow center">
    <p class="eyebrow" style="justify-content:center">خطای ۴۰۴</p>
    <h1 class="h1">این صفحه پیدا نشد</h1>
    <p class="lead mt-6">ممکن است نشانی تغییر کرده باشد یا صفحه جابه‌جا شده باشد. از میان‌برهای زیر استفاده کنید، یا اگر دنبال طرح خاصی هستید مستقیم با واحد فروش تماس بگیرید.</p>
    <div class="cluster mt-8" style="justify-content:center">
      <a class="btn btn--solid btn--lg" href="index.html">${icon('arrow', 'btn__ico')} بازگشت به صفحهٔ اصلی</a>
      <a class="btn btn--outline btn--lg" href="${wa('سلام، از سایت چینی لوتوس؛ نیاز به راهنمایی دارم.')}" target="_blank" rel="noopener">${icon('whatsapp', 'btn__ico')} پرسش در واتساپ</a>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <div class="reveal">
        <p class="eyebrow">میان‌برهای پرکاربرد</p>
        <h2 class="h3">از این‌جا ادامه بدهید</h2>
      </div>
    </div>
    <div class="grid-quad mt-7">
      ${[
        ['products.html', 'همهٔ طرح‌ها', '۱۵ مدل قوری چینی با مشخصات کامل'],
        ['wholesale.html', 'فروش عمده', 'مدل‌های همکاری، حداقل سفارش و شرایط تأمین'],
        ['process.html', 'فرآیند تولید', 'یازده مرحله از خاک تا چینی آماده'],
        ['contact.html', 'تماس با ما', 'نشانی کارگاه، دفتر فروش و شمارهٔ تماس'],
      ]
        .map(
          ([href, title, desc], i) => `<a class="card reveal" href="${href}" data-delay="${(i % 3) + 1}">
        <span class="card__body">
          <span class="card__title">${title}</span>
          <span class="card__text">${desc}</span>
          <span class="card__more">مشاهده ${icon('arrow', 'card__ico')}</span>
        </span>
      </a>`
        )
        .join('')
        .replace(/<a class="card reveal"/g, '<a class="card reveal"')}
    </div>
    <p class="center muted mt-7" style="font-size:var(--t--1)">
      شمارهٔ واحد فروش: <a href="${tel}" style="color:var(--ember-600);font-weight:600">${fa('09138900700')}</a>
      · ساعات کاری: ۸ الی ۱۷
    </p>
  </div>
</section>`,
});

/* ---------- ۲۱. نقشهٔ سایت ---------- */

P.push({
  file: 'sitemap.html',
  title: 'نقشهٔ سایت',
  description:
    'فهرست همهٔ صفحه‌های سایت چینی لوتوس؛ طرح‌های قوری، فرآیند تولید، کنترل کیفیت، فروش عمده، ارسال، صادرات، سفارش اختصاصی، گالری کارگاه و اطلاعات تماس.',
  current: '',
  schemas: [ldCrumbs([{ label: 'خانه', href: 'index.html' }, { label: 'نقشهٔ سایت' }])],
  body: [
    pageHead({
      kicker: 'نقشهٔ سایت',
      title: 'همهٔ صفحه‌ها، در یک نگاه',
      lead: 'سایت چینی لوتوس از چند بخش تشکیل شده است؛ این صفحه فهرست کامل آن‌هاست.',
      crumbs: [{ label: 'نقشهٔ سایت' }],
    }),
    sitemapSection(),
  ].join('\n'),
});

/* ================================================================
   ساخت خروجی
   ================================================================ */

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dest = join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dest);
    else await cp(src, dest);
  }
}

async function build() {
  if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // دارایی‌ها
  await copyDir(join(ROOT, 'src/assets'), join(OUT, 'assets'));
  await copyDir(join(ROOT, 'media'), join(OUT, 'media'));

  // manifest و robots
  await writeFile(
    join(OUT, 'site.webmanifest'),
    JSON.stringify(
      {
        name: `${site.fa} — ${site.tagline}`,
        short_name: site.fa,
        lang: 'fa-IR',
        dir: 'rtl',
        background_color: '#fdfbf9',
        theme_color: '#fdfbf9',
        icons: [
          { src: 'media/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'media/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      null,
      2
    )
  );
  await writeFile(
    join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );

  // صفحه‌ها
  for (const page of P) {
    const html = addSrcSets(layout(page));
    await writeFile(join(OUT, page.file), html, 'utf-8');
  }

  // نقشهٔ سایت
  const today = new Date().toISOString().slice(0, 10);
  const prio = (f) =>
    f === 'index.html'
      ? '1.0'
      : f === 'products.html' || f === 'wholesale.html' || f === 'contact.html'
        ? '0.9'
        : f.startsWith('product-')
          ? '0.7'
          : '0.8';
  const urlEntries = P.filter((page) => page.file !== '404.html')
    .map(
      (page) => `  <url>\n    <loc>${SITE_URL}/${page.file}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${
        page.file === 'index.html' ? 'weekly' : 'monthly'
      }</changefreq>\n    <priority>${prio(page.file)}</priority>\n  </url>`
    )
    .join('\n');
  await writeFile(
    join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`
  );

  // آمار
  const files = await readdir(OUT);
  let bytes = 0;
  for (const f of files) {
    const s = await stat(join(OUT, f));
    bytes += s.size;
  }
  console.log(`✓ ${P.length} صفحه ساخته شد در ${OUT}`);
  console.log(`  حجم HTML: ${(bytes / 1024).toFixed(0)} کیلوبایت`);
  console.log(`  صفحه‌ها: ${P.map((p) => p.file).join(', ')}`);
}

build().catch((error) => {
  console.error('خطا در ساخت:', error);
  process.exit(1);
});

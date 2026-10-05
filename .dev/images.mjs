/**
 * تولید نسخه‌های رسپانسیو تصاویر
 * ------------------------------------------------------------------
 * برای هر تصویر محصول (۱۱۰۰ عرض):
 *   -۰۱.jpg  →  -01-550.jpg و -01-800.jpg
 * برای هر تصویر فرآیند/کارگاه (عرض متغیر):
 *   -550.webp و -800.webp
 *
 * og-card.png هم به JPEG سبک تبدیل می‌شود (JPEG برای پیش‌نمایش
 * شبکه‌های اجتماعی امن‌تر از PNG ۵۵۰ کیلوبایتی است).
 *
 * اجرا:  node .dev/images.mjs
 */
import { readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = '/home/user/lotos';
const WIDTHS = [550, 800];
let made = 0;
let skipped = 0;
let savedOriginal = 0;
let savedNew = 0;

/** ساخت یک نسخهٔ کوچک با ImageMagick */
function resize(src, dst, width) {
  execFileSync('convert', [
    src,
    '-resize', `${width}x>`,      // فقط کوچک کن، بزرگ نکن
    '-strip',                      // حذف متادیتا
    '-quality', '82',
    '-define', 'webp:method=6',
    dst,
  ]);
  made++;
  savedNew += statSync(dst).size;
}

/** پردازش یک پوشه */
function processDir(dir, extOut) {
  for (const name of readdirSync(dir)) {
    if (!/\.(jpg|jpeg|webp)$/i.test(name)) continue;
    if (/-\d{3}\.(jpg|webp)$/i.test(name)) continue; // نسخهٔ ساخته‌شده
    const src = join(dir, name);
    const stem = name.replace(/\.(jpg|jpeg|webp)$/i, '');
    savedOriginal += statSync(src).size;

    for (const w of WIDTHS) {
      const dst = join(dir, `${stem}-${w}${extOut}`);
      if (existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) {
        skipped++;
        savedNew += statSync(dst).size;
        continue;
      }
      resize(src, dst, w);
    }
  }
}

console.log('ساخت نسخه‌های رسپانسیو…');
processDir(join(ROOT, 'media/products'), '.jpg');
processDir(join(ROOT, 'media/process'), '.webp');
processDir(join(ROOT, 'media/workshop'), '.webp');

// کارت اشتراک‌گذاری: PNG → JPEG سبک
const ogPng = join(ROOT, 'media/brand/og-card.png');
if (existsSync(ogPng)) {
  const ogJpg = join(ROOT, 'media/brand/og-card.jpg');
  execFileSync('convert', [ogPng, '-strip', '-quality', '86', ogJpg]);
  const a = statSync(ogPng).size;
  const b = statSync(ogJpg).size;
  console.log(`  og-card.png ${(a / 1024).toFixed(0)}KB → og-card.jpg ${(b / 1024).toFixed(0)}KB`);
}

console.log(`✓ ${made} تصویر ساخته شد، ${skipped} تصویر از قبل موجود بود`);
console.log(`  حجم اصلی تصاویر: ${(savedOriginal / 1024 / 1024).toFixed(2)} مگابایت`);
console.log(`  حجم نسخه‌های ساخته‌شده: ${(savedNew / 1024 / 1024).toFixed(2)} مگابایت`);

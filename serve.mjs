#!/usr/bin/env node
/**
 * چینی لوتوس — static preview server (zero dependencies).
 *
 *   node serve.mjs                 # serves ./site on :4173
 *   node serve.mjs --dir . --port 8080
 *
 * Binds to 0.0.0.0 so the sandbox preview proxy can reach it.
 */
import { createServer } from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import { extname, join, normalize, resolve, sep, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ROOT = resolve(arg('dir', 'site'));
const PORT = Number(arg('port', process.env.PORT || 4173));
const HOST = arg('host', '0.0.0.0');

// اگر خروجی ساخت وجود ندارد (پوشهٔ site/ در git نادیده گرفته می‌شود و
// ممکن است پاک شده باشد)، پیش از سرو، یک‌بار بیلد می‌کنیم تا پیش‌نمایش
// هیچ‌وقت خالی تحویل داده نشود.
if (!existsSync(join(ROOT, 'index.html'))) {
  const here = dirname(fileURLToPath(import.meta.url));
  console.log('… خروجی ساخت پیدا نشد؛ در حال ساخت سایت');
  const built = spawnSync(process.execPath, [join(here, 'src', 'build.mjs')], {
    stdio: 'inherit',
    cwd: here,
  });
  if (built.status !== 0) {
    console.error('✗ ساخت سایت ناموفق بود');
    process.exit(built.status ?? 1);
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** Extensions we should never re-process (treat as-is). */
const BINARY = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.ico', '.woff', '.woff2']);

async function resolveFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (rel.endsWith('/')) rel += 'index.html';

  const target = normalize(join(ROOT, rel));
  if (!target.startsWith(ROOT + sep) && target !== ROOT) return null; // path traversal guard

  const candidates = BINARY.has(extname(target)) ? [target] : [target, `${target}.html`, join(target, 'index.html')];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return { path: candidate, stat };
    } catch {
      /* keep looking */
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const found = await resolveFile(req.url || '/');

    if (!found) {
      const custom404 = join(ROOT, '404.html');
      try {
        const body = await fs.readFile(custom404);
        res.writeHead(404, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
        return res.end(body);
      } catch {
        res.writeHead(404, { 'content-type': MIME['.txt'] });
        return res.end('404 — یافت نشد');
      }
    }

    const ext = extname(found.path).toLowerCase();

    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': found.stat.size,
      'cache-control': 'no-store, must-revalidate',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(found.path).pipe(res);
  } catch (error) {
    res.writeHead(500, { 'content-type': MIME['.txt'] });
    res.end(`500 — ${error.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`چینی لوتوس preview → http://${HOST}:${PORT}  (root: ${ROOT})`);
});

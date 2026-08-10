/* A static server for the mirror, and it is not a convenience.
 *
 * *** ON file:// EVERY LINKED STYLESHEET IS CROSS-ORIGIN. *** sheet.cssRules
 * throws a SecurityError for all of them, so any probe that walks the CSSOM sees
 * only inline <style> blocks and cannot see darling.build.css at all. The seam
 * inventory came back with zero seams on a page that visibly has them, which is
 * the tell: a measurement that returns nothing is either a clean bill of health
 * or a broken instrument, and it is worth ten minutes to find out which.
 *
 * Serving over http://127.0.0.1 makes the whole mirror same-origin, which also
 * makes it closer to the real page: no file:// CORS on fonts, and fetches that
 * fail the way they would fail in a browser rather than the way file:// fails.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon',
};

function start(root, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/home.html';
      const file = path.join(root, p);
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not mirrored: ' + p); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
                             'cache-control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(port || 0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

module.exports = { start };

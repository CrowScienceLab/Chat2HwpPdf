import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
const root = path.resolve(import.meta.dirname, '..');
const iconRoot = path.join(root, 'chrome-extension/icons');
const image = name => 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'branding', name)).toString('base64');
const crow = image('crow-master.png');
const master = image('app-master.png');
function render(size, compact = size < 128) {
  const drawing = compact
    ? `<rect width="128" height="128" rx="26" fill="white"/><image x="5" y="5" width="118" height="118" href="${crow}"/>`
    : `<defs><clipPath id="tile"><rect width="128" height="128" rx="26"/></clipPath></defs><image width="128" height="128" href="${master}" clip-path="url(#tile)"/>`;
  return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">${drawing}</svg>`).render().asPng();
}
for (const size of [16, 32, 48, 64, 128]) fs.writeFileSync(path.join(iconRoot, `icon-${size}.png`), render(size));
fs.writeFileSync(path.join(root, 'branding/app-large.png'), render(512, false));
fs.writeFileSync(path.join(root, 'branding/store-promo.png'), new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280"><rect width="440" height="280" fill="white"/><image x="80" y="0" width="280" height="280" href="${master}"/></svg>`).render().asPng());
fs.copyFileSync(path.join(root, 'branding/app-large.png'), path.join(root, 'docs/assets/app-large.png'));
const sizes = [16, 32, 48, 64, 128, 256];
const frames = sizes.map(size => render(size));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((png, i) => {
  const at = 6 + i * 16;
  header[at] = header[at + 1] = sizes[i] === 256 ? 0 : sizes[i];
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(png.length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
fs.writeFileSync(path.join(root, 'branding/app.ico'), Buffer.concat([header, ...frames]));
console.log('Reference image applied: Chrome 16/32/48/64/128, Windows ICO 16–256, large 512, promotion 440×280.');

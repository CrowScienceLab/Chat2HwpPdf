import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
const root = path.resolve(import.meta.dirname, '..');
const iconRoot = path.join(root, 'chrome-extension/icons');
for (const size of [16, 32, 48, 128]) {
  const png = new Resvg(fs.readFileSync(path.join(iconRoot, 'icon.svg')), { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(iconRoot, `icon-${size}.png`), png);
}
for (const name of ['app-large', 'store-promo']) {
  const png = new Resvg(fs.readFileSync(path.join(root, `branding/${name}.svg`))).render().asPng();
  fs.writeFileSync(path.join(root, `branding/${name}.png`), png);
}
// PNG entries in ICO preserve the same drawing in Windows and Chrome.
const sizes = [16, 32, 48, 128, 256];
const frames = sizes.map(size => new Resvg(fs.readFileSync(path.join(iconRoot, 'icon.svg')), { fitTo: { mode: 'width', value: size } }).render().asPng());
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
console.log('Chrome PNG, Windows ICO and large promotional assets prepared.');

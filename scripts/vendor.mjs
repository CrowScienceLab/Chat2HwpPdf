import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
const root = path.resolve(import.meta.dirname, '..');
for (const size of [16, 32, 48, 128]) {
  const png = new Resvg(fs.readFileSync(path.join(root, 'icons/icon.svg')), { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(root, `icons/icon-${size}.png`), png);
}
console.log('Crow icons prepared.');

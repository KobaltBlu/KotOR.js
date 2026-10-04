import fs from 'node:fs';

const src = fs.readFileSync('src/core/resource/TPCObject.ts', 'utf8');
const start = src.indexOf('  //Convert the TPC into a THREE.CompressedTexture');
const endMarker = 'Write an Odyssey TPC file';
const endIdx = src.indexOf(endMarker);
const end = endIdx >= 0 ? src.lastIndexOf('  /**', endIdx) : -1;
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}

const method = src.slice(start, end);
const body = method
  .replace(
    '  //Convert the TPC',
    '/** Convert TPC bytes into an OdysseyCompressedTexture for the engine. */\nexport function tpcToCompressedTexture(tpc: TPCObject) {\n  //Convert the TPC'
  )
  .replace('  toCompressedTexture(){', '')
  .replace(/\bthis\./g, 'tpc.');

const header = `import * as THREE from 'three';
import { TXIPROCEDURETYPE } from "@core/enums/graphics/txi/TXIPROCEDURETYPE";
import { TPCObject } from "@core/resource/TPCObject";
import { PixelManager } from "@core/utility/PixelManager";
import { OdysseyCompressedTexture } from "@engine/render/three/odyssey/OdysseyCompressedTexture";

const CUBEMAP_FACE_REMAP = [1, 0, 2, 3, 4, 5];
const CUBEMAP_FACE_ROTATIONS = [3, 1, 0, 2, 2, 0];

`;

fs.writeFileSync('src/engine/loaders/tpcToCompressedTexture.ts', header + body + '}\n');

let next = src.slice(0, start) + src.slice(end);
next = next.replace(
  /import \{ OdysseyCompressedTexture \} from "@engine\/render\/three\/odyssey\/OdysseyCompressedTexture";\r?\n/,
  ''
);
next = next.replace(
  /import \{ PixelManager \} from "@core\/utility\/PixelManager";\r?\n/,
  ''
);
if (!next.includes('CUBEMAP_FACE_REMAP')) {
  next = next.replace(
    /const CUBEMAP_FACE_REMAP = \[1, 0, 2, 3, 4, 5\];\r?\nconst CUBEMAP_FACE_ROTATIONS = \[3, 1, 0, 2, 2, 0\];\r?\n\r?\n/,
    ''
  );
}
fs.writeFileSync('src/core/resource/TPCObject.ts', next);
console.log('ok');

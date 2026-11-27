import * as THREE from "three";
import { GUIControlAlignment } from "@core/enums/gui/GUIControlAlignment";
import { asExtentInt, truncDiv } from "@engine/gui/GUICoord";
import { TXI } from "@core/resource/TXI";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { createQuadElements as createIndicies } from "@engine/render/QuadIndices";

/** Draw UV inset to reduce atlas bleeding. */
const UV_BIAS = 0.0001;

interface Line {
  chars: GUIFontChar[];
  width: number;
  y: number;
}

/**
 * Axis-aligned bbox for GUI / TextSprite geometries that store positions as vec2.
 * Three r152+ `Box3.setFromBufferAttribute` reads `getZ()`, which is out-of-range
 * (NaN) when `itemSize === 2`, spamming computeBoundingBox errors.
 */
export function computeBoundingBoxXY(
  geometry: THREE.BufferGeometry,
  positions?: ArrayLike<number>,
): void {
  if(geometry.boundingBox === null){
    geometry.boundingBox = new THREE.Box3();
  }
  const bbox = geometry.boundingBox;
  const arr = positions ?? geometry.attributes?.position?.array;
  if(!arr || arr.length < 2){
    bbox.makeEmpty();
    return;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for(let i = 0; i < arr.length; i += 2){
    const x = arr[i];
    const y = arr[i + 1];
    if(x < minX) minX = x;
    if(y < minY) minY = y;
    if(x > maxX) maxX = x;
    if(y > maxY) maxY = y;
  }
  if(!Number.isFinite(minX) || !Number.isFinite(minY)){
    bbox.makeEmpty();
    return;
  }
  bbox.min.set(minX, minY, 0);
  bbox.max.set(maxX, maxY, 0);
}

export class GUIFont {

  texture: OdysseyTexture;
  txi: TXI;

  scale: number = 1;
  ratio: number;
  height: number;
  bsline: number;
  spaceR: number;
  spaceB: number;
  /** Vertical advance between lines: (fontheight + spacingB) * 100 */
  lineStep: number;

  charCount: number = 0;
  chars: GUIFontChar[] = [];

  builtLines: Line[] = [];

  constructor(texture: OdysseyTexture){
    if(!texture){ return }
    this.texture = texture;

    if(this.texture.txi){
      this.txi = this.texture.txi;
      this.scale = 1;

      this.ratio = texture.image.width / texture.image.height;

      // GetFontPixelHeight / GetIdealPixelHeight
      this.height = asExtentInt(this.txi.fontheight     * 100 * this.scale);
      this.bsline = asExtentInt(this.txi.baselineheight * 100 * this.scale);
      this.spaceR = asExtentInt(this.txi.spacingr       * 100 * this.scale);
      this.spaceB = asExtentInt(this.txi.spacingb       * 100 * this.scale);
      this.lineStep = this.height + this.spaceB;
      this.charCount = this.txi.numchars;

      const coordCount = Math.min(
        this.txi.upperleftcoords.length,
        this.txi.lowerrightcoords.length
      );
      const buildCount = Math.max(this.charCount, coordCount);

      this.chars = new Array(buildCount);
      for(let i = 0; i < buildCount; i++){
        this.chars[i] = new GUIFontChar(this, i);
      }
    }
  }

  /**
   * TextOutA / WrapStrings clamp char index to the smaller UV array size.
   */
  getChar(charCode: number): GUIFontChar {
    let idx = charCode | 0;
    const ulLen = this.txi?.upperleftcoords?.length ?? 0;
    const lrLen = this.txi?.lowerrightcoords?.length ?? 0;
    if(lrLen > 0 && idx >= lrLen){
      idx = lrLen - 1;
    }
    if(ulLen > 0 && idx >= ulLen){
      idx = ulLen - 1;
    }
    if(idx < 0){
      idx = 0;
    }
    if(idx >= this.chars.length){
      idx = Math.max(0, this.chars.length - 1);
    }
    return this.chars[idx];
  }

  /**
   * Line / word pixel width: sum(content) + spacingR * (n - 1).
   * Matches WrapStrings accumulation.
   */
  getCharsWidth(chars: GUIFontChar[]): number {
    if(!chars || !chars.length) return 0;

    let width = 0;
    for(let i = 0; i < chars.length; i++){
      width += chars[i].contentWidth;
      if(i < chars.length - 1){
        width += this.spaceR;
      }
    }
    return width;
  }

  getWordWidth(word: string): number {
    if(!word || !word.length) return 0;
    return this.getCharsWidth(this.getWordChars(word));
  }

  getWordChars(word: string): GUIFontChar[] {
    const chars: GUIFontChar[] = new Array(word.length);
    for(let i = 0; i < word.length; i++){
      chars[i] = this.getChar(word.charCodeAt(i));
    }
    return chars;
  }

  private isAlphaCharCode(code: number): boolean {
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  }

  /**
   * Wrap a single paragraph to maxWidth using WrapStrings break rules:
   * spaces, soft hyphen between alpha chars, and forced mid-word splits.
   */
  private wrapParagraph(paragraph: string, maxWidth: number, startY: number, out: Line[]): number {
    let lineY = startY;

    if(!paragraph.length){
      out.push({chars: [], width: 0, y: lineY});
      return lineY - this.lineStep;
    }

    if(!maxWidth){
      const chars = this.getWordChars(paragraph);
      out.push({chars, width: this.getCharsWidth(chars), y: lineY});
      return lineY - this.lineStep;
    }

    const codes: number[] = new Array(paragraph.length);
    for(let i = 0; i < paragraph.length; i++){
      codes[i] = paragraph.charCodeAt(i);
    }

    let lineStart = 0;
    let i = 0;
    let lineWidth = 0;
    let lastBreak = -1;

    const flushLine = (end: number, nextStart: number) => {
      const lineChars: GUIFontChar[] = [];
      for(let c = lineStart; c < end; c++){
        lineChars.push(this.getChar(codes[c]));
      }
      out.push({chars: lineChars, width: this.getCharsWidth(lineChars), y: lineY});
      lineY -= this.lineStep;
      lineStart = nextStart;
      i = nextStart;
      lineWidth = 0;
      lastBreak = -1;
      if(lineStart < codes.length){
        // First character on a line: content only (no leading spacingR)
        lineWidth = this.getChar(codes[lineStart]).contentWidth;
      }
    };

    if(codes.length){
      lineWidth = this.getChar(codes[0]).contentWidth;
    }

    while(i < codes.length){
      // Soft hyphen break opportunity: alpha '-' alpha (WrapStrings)
      if(
        codes[i] === 0x2d &&
        i > lineStart &&
        i + 1 < codes.length &&
        this.isAlphaCharCode(codes[i - 1]) &&
        this.isAlphaCharCode(codes[i + 1])
      ){
        lastBreak = i;
      }

      if(codes[i] === 0x20){
        lastBreak = i;
      }

      const next = i + 1;
      if(next >= codes.length){
        flushLine(codes.length, codes.length);
        break;
      }

      const nextChar = this.getChar(codes[next]);
      // Subsequent chars: content + spacingR (+0.25 bias in WrapStrings)
      const advance = Math.floor(nextChar.contentWidth + this.spaceR + 0.25);
      const nextWidth = lineWidth + advance;

      if(nextWidth < maxWidth){
        lineWidth = nextWidth;
        i = next;
        continue;
      }

      // Need to break
      if(lastBreak > lineStart || (lastBreak === lineStart && codes[lastBreak] === 0x20)){
        if(codes[lastBreak] === 0x20){
          // Break at space; space itself is omitted from both lines 
          flushLine(lastBreak, lastBreak + 1);
        }else{
          // Soft hyphen: keep hyphen on current line
          flushLine(lastBreak + 1, lastBreak + 1);
        }
      }else{
        // Forced mid-word break: keep chars through i on this line, start next at next
        flushLine(next, next);
      }
    }

    return lineY;
  }

  buildGeometry(geometry: THREE.BufferGeometry, text: string, alignment: GUIControlAlignment, maxWidth: number = 0): void {
    if(!this.chars.length){
      this.builtLines = [];
      if(geometry){
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 2));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(0), 2));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(0), 1));
        computeBoundingBoxXY(geometry, []);
      }
      return;
    }

    const paragraphs: string[] = text.split('\n');
    const lines2: Line[] = [];
    let lineY = 0;

    for(let l = 0; l < paragraphs.length; l++){
      lineY = this.wrapParagraph(paragraphs[l], maxWidth, lineY, lines2);
    }

    this.builtLines = lines2;

    let textCharCount: number = 0;
    for(let l = 0; l < lines2.length; l++){
      textCharCount += lines2[l].chars.length;
    }

    const positions = new Float32Array(textCharCount * 8);
    const uvs = new Float32Array(textCharCount * 8);
    const horizontal = alignment & GUIControlAlignment.HorizontalMask;

    const indices = createIndicies({
      clockwise: true,
      type: 'uint16',
      count: textCharCount
    });

    let charIndex = 0;
    for(let l = 0; l < lines2.length; l++){
      const line = lines2[l];

      let lineX = 0;
      if(horizontal == GUIControlAlignment.HorizontalLeft){
        lineX = 0;
      }else if(horizontal == GUIControlAlignment.HorizontalCenter){
        lineX = truncDiv(maxWidth - line.width, 2);
      }else if(horizontal == GUIControlAlignment.HorizontalRight){
        lineX = maxWidth - line.width;
      }

      for(let c = 0; c < line.chars.length; c++){
        const char = line.chars[c];
        const stride = charIndex * 8;
        const quadW = char.contentWidth;
        // Draw always uses fontheight for quad height; UVs only sample the atlas
        const quadH = this.height;

        // BL
        positions[stride + 0] = lineX;
        positions[stride + 1] = line.y;
        // TL
        positions[stride + 2] = lineX;
        positions[stride + 3] = line.y - quadH;
        // TR
        positions[stride + 4] = lineX + quadW;
        positions[stride + 5] = line.y - quadH;
        // BR
        positions[stride + 6] = lineX + quadW;
        positions[stride + 7] = line.y;

        const ulx = char.ul.x - UV_BIAS;
        const uly = char.ul.y - UV_BIAS;
        const lrx = char.lr.x - UV_BIAS;
        const lry = char.lr.y - UV_BIAS;

        // BL
        uvs[stride + 0] = ulx;
        uvs[stride + 1] = uly;
        // TL
        uvs[stride + 2] = ulx;
        uvs[stride + 3] = lry;
        // TR
        uvs[stride + 4] = lrx;
        uvs[stride + 5] = lry;
        // BR
        uvs[stride + 6] = lrx;
        uvs[stride + 7] = uly;

        // Advance: content + spacingR (trailing spacingR sits past last glyph visual edge)
        lineX += quadW + this.spaceR;
        charIndex++;
      }
    }

    if(geometry){
      geometry.index = new THREE.BufferAttribute( indices, 1 ).setUsage( THREE.StaticDrawUsage );

      const posAttribute = new THREE.BufferAttribute( positions, 2 ).setUsage( THREE.StaticDrawUsage );
      const uvAttribute = new THREE.BufferAttribute( uvs, 2 ).setUsage( THREE.StaticDrawUsage );
      geometry.setAttribute( 'position', posAttribute );
      geometry.setAttribute( 'uv', uvAttribute );

      geometry.index.needsUpdate = true;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.uv.needsUpdate = true;
      computeBoundingBoxXY(geometry, positions);
    }
  }

}

export class GUIFontChar {
  font: GUIFont;
  char: number;
  ul: {x: number, y: number, z: number};
  lr: {x: number, y: number, z: number};

  /** Textured quad width in GUI pixels: (lr.x - ul.x) * texturewidth * 100 */
  contentWidth: number = 0;
  /** Advance including spacingR (contentWidth + spaceR). Prefer getCharsWidth for strings. */
  width: number = 0;
  /** Quad height — always fontheight * 100 (Draw / TextOutA). */
  height: number = 0;

  constructor(font: GUIFont, charCode: number){
    this.font = font;
    this.char = charCode;

    const ulArr = font.txi.upperleftcoords;
    const lrArr = font.txi.lowerrightcoords;
    let idx = charCode;
    if(lrArr.length > 0 && idx >= lrArr.length){
      idx = lrArr.length - 1;
    }
    if(ulArr.length > 0 && idx >= ulArr.length){
      idx = ulArr.length - 1;
    }
    if(idx < 0){
      idx = 0;
    }

    this.ul = ulArr[idx] || {x: 0, y: 0, z: 0};
    this.lr = lrArr[idx] || {x: 0, y: 0, z: 0};

    // : (lr.x - ul.x) * texturewidth [world] → * 100 for GUI pixels
    this.contentWidth = asExtentInt(((this.lr.x - this.ul.x) * font.txi.texturewidth) * font.scale * 100);
    this.width = this.contentWidth + font.spaceR;
    this.height = font.height;
  }
}

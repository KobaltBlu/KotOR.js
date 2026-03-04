import * as THREE from "three";

import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import { TXI } from "@/resource/TXI";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createQuadElements as createIndicies } from "@/utility/QuadIndices";

interface Line {
  chars: GUIFontChar[];
  width: number;
  y: number;
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

  charCount: number = 0;
  chars: GUIFontChar[] = [];

  builtLines: Line[] = [];

  /** Fallback char index when a character code is out of range (e.g. space or first char). */
  private getFallbackCharIndex(): number {
    if (this.charCount <= 0) return 0;
    if (32 < this.charCount) return 32; // space
    return 0;
  }

  /** Safe lookup: returns a valid GUIFontChar for any code, using fallback when out of range. */
  getChar(code: number): GUIFontChar {
    if (this.charCount <= 0) return (this.chars[0] ?? new GUIFontChar(this, ' ')) as GUIFontChar;
    const index = (code >= 0 && code < this.charCount) ? code : this.getFallbackCharIndex();
    const fallbackIndex = this.getFallbackCharIndex();
    const c = (this.chars[index] ?? this.chars[fallbackIndex] ?? this.chars[0]) as GUIFontChar;

    // Many KotOR GUI fonts only ship uppercase glyphs. If the lowercase glyph is missing
    // (0-sized due to missing TXI coords), fall back to the uppercase equivalent.
    if (c && c.width === 0 && c.height === 0 && code >= 97 && code <= 122) { // a-z
      const upper = code - 32; // A-Z
      if (upper >= 0 && upper < this.charCount) {
        const uc = this.chars[upper];
        if (uc && (uc.width > 0 || uc.height > 0)) return uc;
      }
    }

    // If still 0-sized, fall back to the configured fallback glyph (usually space).
    if (c && c.width === 0 && c.height === 0) {
      return (this.chars[fallbackIndex] ?? this.chars[0] ?? c) as GUIFontChar;
    }

    return c;
  }

  constructor(texture: OdysseyTexture){
    if(!texture){ return }
    this.texture = texture;

    if(this.texture.txi){
      this.txi = this.texture.txi;
      this.scale = 1;

      this.ratio = ((texture.image as HTMLImageElement)?.width ?? 1) / ((texture.image as HTMLImageElement)?.height ?? 1);

      this.height = this.txi.fontheight     * 100;
      this.bsline = this.txi.baselineheight * 100;
      this.spaceR = this.txi.spacingr       * 100;
      this.spaceB = this.txi.spacingb       * 100;
      this.charCount = this.txi.numchars;

      this.chars = Array.from({ length: this.charCount }, (_, i) => new GUIFontChar(this, String.fromCharCode(i)));
    }
  }

  getWordWidth(word: string): number {
    if(!word || !word.length) return 0;

    let width = 0;

    const chars = word.split('');
    for(let i = 0; i < chars.length; i++){
      width += this.getChar(word.charCodeAt(i)).width;
    }

    return width;
  }

  getWordChars(word: string): GUIFontChar[] {
    return word.split('').map( (char) => this.getChar(char.charCodeAt(0)) );
  }

  buildGeometry(geometry: THREE.BufferGeometry, text: string, alignment: GUIControlAlignment, maxWidth: number = 0): void {
    const lines: string[] = text.split('\n');
    const lineCount: number = lines.length;
    const spaceChar = this.getChar(32);
    const lines2: Line[] = [];

    let lineY = 0
    for(let l = 0; l < lineCount; l++){
      const words: string[] = lines[l].split(' ');
      let newLine: Line = {chars: [], width: 0, y: lineY};

      for(let w = 0; w < words.length; w++){
        const word = words[w];
        const chars = this.getWordChars(word);
        const wordWidth = this.getWordWidth(word);
        const spacing = (w) ? spaceChar.width : 0;
        if(newLine.width + (wordWidth + spacing) < maxWidth || !maxWidth){
          if(w){ chars.unshift(spaceChar); }
          newLine.chars.push(...chars);
          newLine.width += (wordWidth + spacing);
        }else{
          lines2.push(newLine);
          lineY -= this.height;
          newLine = {chars: [], width: 0, y: lineY};
          newLine.chars.push(...chars);
          newLine.width += wordWidth;
        }
      }

      if(newLine.chars.length > 0){
        lines2.push(newLine);
      }
      lineY -= this.height;
    }

    this.builtLines = lines2;

    let textCharCount: number = 0;
    for(let l = 0; l < lines2.length; l++){
      textCharCount += lines2[l].chars.length;
    }

    const positions = new Float32Array(textCharCount * 8);
    const uvs = new Float32Array(textCharCount * 8);
    const horizontal = alignment & GUIControlAlignment.HorizontalMask;

    const indices = createIndicies(
      new Uint16Array(textCharCount),
      {
        clockwise: true,
        type: 'uint16',
        count: textCharCount
      }
    );

    let charIndex = 0;
    for(let l = 0; l < lines2.length; l++){
      const line = lines2[l];

      let lineX = 0;
      // Apply horizontal alignment - center the text within the available width
      if(horizontal == GUIControlAlignment.HorizontalLeft){
        lineX = 0; // Default left alignment
      }else if(horizontal == GUIControlAlignment.HorizontalCenter){
        lineX = (maxWidth - line.width) / 2;
      }else if(horizontal == GUIControlAlignment.HorizontalRight){
        lineX = maxWidth - line.width;
      }

      let char: GUIFontChar;
      let stride = 0;
      for(let c = 0; c < line.chars.length; c++){
        char = line.chars[c];
        stride = (charIndex * 8);

        // Remove the incorrect first character offset
        // Characters should be positioned normally without special first-character handling

        // BL
        positions[stride + 0] = lineX;
        positions[stride + 1] = line.y;
        // TL
        positions[stride + 2] = lineX ;
        positions[stride + 3] = line.y - char.height;
        // TR
        positions[stride + 4] = lineX + char.width;
        positions[stride + 5] = line.y - char.height;
        // BR
        positions[stride + 6] = lineX + char.width;
        positions[stride + 7] = line.y;

        // BL
        uvs[stride + 0] = char.ul.x;
        uvs[stride + 1] = char.ul.y;
        // TL
        uvs[stride + 2] = char.ul.x;
        uvs[stride + 3] = char.lr.y;
        // TR
        uvs[stride + 4] = char.lr.x;
        uvs[stride + 5] = char.lr.y;
        // BR
        uvs[stride + 6] = char.lr.x;
        uvs[stride + 7] = char.ul.y;
        lineX += char.width;
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
      geometry.computeBoundingBox();
    }
  }

}

export class GUIFontChar {
  font: GUIFont;
  char: number;
  ul: {x: number, y: number, z: number};
  lr: {x: number, y: number, z: number};

  width: number = 0;
  height: number = 0;

  constructor(font: GUIFont, letter: string){
    this.font = font;
    this.char = letter.charCodeAt(0);
    const ul = font.txi?.upperleftcoords?.[this.char];
    const lr = font.txi?.lowerrightcoords?.[this.char];
    this.ul = ul ?? { x: 0, y: 0, z: 0 };
    this.lr = lr ?? { x: 0, y: 0, z: 0 };
    const w = (this.lr.x - this.ul.x) * ((font.texture?.image as HTMLImageElement)?.width ?? 1);
    const h = (this.ul.y - this.lr.y) * ((font.texture?.image as HTMLImageElement)?.height ?? 1);
    this.width = (isFinite(w) ? w : 0) * this.font.scale;
    this.height = (isFinite(h) ? h : 0) * this.font.scale;
  }
}

import * as THREE from "three";
import { GUIControlAlignment } from "../enums/gui/GUIControlAlignment";
import { TXI } from "../resource/TXI";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { createQuadElements as createIndicies } from "../utility/QuadIndices";

interface Line {
  chars: GUIFontChar[];
  width: number;
  y: number;
}

export default class GUIFont {

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

  constructor(texture: OdysseyTexture){
    if(!texture){ return }
    this.texture = texture;

    if(this.texture.txi){
      this.txi = this.texture.txi;
      this.scale = 1;
  
      this.ratio = texture.image.width / texture.image.height;
  
      this.height = this.txi.fontheight     * 100;
      this.bsline = this.txi.baselineheight * 100;
      this.spaceR = this.txi.spacingr       * 100;
      this.spaceB = this.txi.spacingb       * 100;
      this.charCount = this.txi.numchars;

      this.chars = new Array(this.charCount);
      for(let i = 0; i < this.charCount; i++){
        this.chars[i] = new GUIFontChar(this, String.fromCharCode(i));
      }
    }
  }

  getWordWidth(word: string): number {
    if(!word || !word.length) return 0;

    let width = 0;

    const chars = word.split('');
    for(let i = 0; i < chars.length; i++){
      width += this.chars[word.charCodeAt(i)].width;
    }

    return width;
  }

  getWordChars(word: string): GUIFontChar[] {
    return word.split('').map( (char) => this.chars[char.charCodeAt(0)] );
  }

  buildGeometry(geometry: THREE.BufferGeometry, text: string, alignment: GUIControlAlignment, maxWidth: number = 0): void {
    let lines: string[] = text.split('\n');
    let lineCount: number = lines.length;
    let spaceChar = this.chars[32];
    let lines2: Line[] = [];

    let lineY = 0
    for(let l = 0; l < lineCount; l++){
      let words: string[] = lines[l].split(' ');
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

      if(newLine.chars){
        lines2.push(newLine);
      }
      lineY -= this.height;
    }

    // console.log(text, lines2);
    this.builtLines = lines2;

    const maxHeight = lines2.length * this.height;

    let textCharCount: number = 0;
    for(let l = 0; l < lines2.length; l++){
      textCharCount += lines2[l].chars.length;
    }

    const positions = new Float32Array(textCharCount * 8);
    const uvs = new Float32Array(textCharCount * 8);
    const horizontal = alignment & GUIControlAlignment.HorizontalMask;
    const vertical   = alignment & GUIControlAlignment.VerticalMask;

    const indices = createIndicies({
      clockwise: true,
      type: 'uint16',
      count: textCharCount
    });

    let charIndex = 0;
    for(let l = 0; l < lines2.length; l++){
      const line = lines2[l];

      let lineX = 0;
      if(horizontal == GUIControlAlignment.HorizontalCenter){
        lineX = (maxWidth - line.width)/2;
      }else if(horizontal == GUIControlAlignment.HorizontalRight){
        lineX = (maxWidth - line.width);
      }

      let char: GUIFontChar;
      let halfWidth = 0;
      let halfHeight = 0;
      let stride = 0;
      for(let c = 0; c < line.chars.length; c++){
        char = line.chars[c];
        halfWidth = char.width/2;
        halfHeight = char.height/2;
        stride = (charIndex * 8);

        if(!c){
          lineX -= char.width/2;
        }

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

      const posAttribute = new THREE.BufferAttribute( new Float32Array(positions), 2 ).setUsage( THREE.StaticDrawUsage );
      const uvAttribute = new THREE.BufferAttribute( new Float32Array(uvs), 2 ).setUsage( THREE.StaticDrawUsage );
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
    this.ul = font.txi.upperleftcoords[this.char];
    this.lr = font.txi.lowerrightcoords[this.char];
    this.width = ((this.lr.x - this.ul.x) * font.texture.image.width) * this.font.scale;
    this.height = ((this.ul.y - this.lr.y) * font.texture.image.height) * this.font.scale;
  }
}
import { TXI } from "../resource/TXI";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";

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

      for(let i = 0; i < this.charCount; i++){
        this.chars.push(new GUIFontChar(this, String.fromCharCode(i)))
      }
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
    this.width += ((this.lr.x - this.ul.x) * font.texture.image.width) * this.font.scale;
    this.height += ((this.lr.y - this.ul.y) * font.texture.image.height) * this.font.scale;
  }
}
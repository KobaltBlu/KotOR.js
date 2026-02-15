import { TXIBlending } from "@/enums/graphics/txi/TXIBlending";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Resource);
import { TXITexType } from "@/enums/graphics/txi/TXITexType";

/**
 * TXI class.
 * 
 * Class representing a Extra Texture Information file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TwoDAObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TXI {
  blending: TXIBlending;
  textureType: TXITexType;
  procedureType: TXIPROCEDURETYPE;
  isCompressed: boolean;
  bumpMapScaling: number;
  isbumpmap: boolean;
  bumpMapTexture: string | null;
  envMapTexture: string | null;
  waterAlpha: number | null;
  defaultWidth: number;
  defaultHeight: number;
  downSampleMin: number;
  downSampleMax: number;
  mipMap: number;
  decal: number;
  numchars: number;
  filter: number;
  fontheight: number;
  baselineheight: number;
  texturewidth: number;
  spacingr: number;
  spacingb: number;
  caretindent: number;
  upperleftcoords: {x: number, y: number, z: number}[];
  lowerrightcoords: {x: number, y: number, z: number}[];
  isAnimated: boolean;
  numx: number;
  numy: number;
  fps: number;
  info: string;

  constructor(info: Uint8Array|Uint8Array|string = ''){

    this.blending = TXIBlending.NONE;
    this.textureType = TXITexType.DIFFUSE;
    this.procedureType = TXIPROCEDURETYPE.NONE;

    this.isCompressed = true;

    this.bumpMapScaling = 1;
    this.isbumpmap = false;
    this.bumpMapTexture = null;
    this.envMapTexture = null;

    this.waterAlpha = null;

    this.downSampleMin = 0;
    this.downSampleMax = 0;
    this.mipMap = 0;
    this.decal = 0;
    this.defaultWidth = 0;
    this.defaultHeight = 0;

    this.numchars = 0;
    this.fontheight = 0;
    this.baselineheight = 0;
    this.texturewidth = 0;
    this.spacingr = 0;
    this.spacingr = 0;
    this.caretindent = 0;
    this.upperleftcoords = [];
    this.lowerrightcoords = [];

    //Animation
    this.isAnimated = false;
    this.numx = 0;
    this.numy = 0;
    this.fps = 0;

    this.info = '';

    if(info instanceof Uint8Array){
      this.info = (new TextDecoder('utf8')).decode(info).toLowerCase();
      this.ParseInfo();
    }else if(typeof info === 'string'){
      this.info = info.toLowerCase();
      this.ParseInfo();
    }

    //log.info('TXI', this.info, typeof info, info instanceof Uint8Array);

  }

  ParseInfo(){
    const lines = this.info.split('\n');
    for(let i = 0; i < lines.length; i++){
      const line = lines[i];
      const args = line.split(' ');

      if(typeof args[1] != 'undefined')
        args[1] = args[1].trim();

      switch(args[0]){
        /*case 'isbumpmap':
          if(this.textureType != TXITexType.NORMALMAP)
            this.textureType = TXITexType.BUMPMAP;
        break;*/
        case 'isbumpmap':
          this.isbumpmap = parseInt(args[1]) ? true : false;
        break;
        case 'islightmap':
          this.textureType = TXITexType.LIGHTMAP;
        break;
        case 'cube':
          this.textureType = TXITexType.ENVMAP;
        break;
        case 'compresstexture':
          this.isCompressed = parseInt(args[1]) == 1 ? true : false;
        break;
        case 'mipmap':
          this.mipMap = parseInt(args[1]);
        break;
        case 'downsamplemin':
          this.downSampleMin = parseInt(args[1]);
        break;
        case 'downsamplemax':
          this.downSampleMax = parseInt(args[1]);
        break;
        case 'decal':
          this.decal = parseInt(args[1]);
        break;
        case 'defaultwidth':
          this.defaultWidth = parseInt(args[1]);
        break;
        case 'defaultheight':
          this.defaultHeight = parseInt(args[1]);
        break;
        case 'filter':
          this.filter = parseInt(args[1]);
        break;
        case 'blending':
          switch(args[1]){
            case 'punchthrough':
              this.blending = TXIBlending.PUNCHTHROUGH;
            break;
            case 'additive':
              this.blending = TXIBlending.ADDITIVE;
            break;
          }
        break;
        case 'bumpmapscaling':
          this.bumpMapScaling = parseFloat(args[1]);
        break;
        case 'bumpmaptexture':
          this.bumpMapTexture = args[1].trim().replace(/\0[\s\S]*$/g,'');
        break;
        case 'bumpyshinytexture':
        case 'envmaptexture':
          this.envMapTexture = args[1].trim().replace(/\0[\s\S]*$/g,'');
        break;
        case 'wateralpha':
          this.waterAlpha = parseFloat(args[1]);
        break;

        // TXI Animation
        case 'proceduretype':
          this.isAnimated = true;
          switch(args[1]){
            case 'cycle':
              this.procedureType = TXIPROCEDURETYPE.CYCLE;
            break;
            case 'water':
              this.isAnimated = false;
              this.procedureType = TXIPROCEDURETYPE.WATER;
            break;
            case 'random':
              this.procedureType = TXIPROCEDURETYPE.RANDOM;
            break;
            case 'ringtexdistort':
              this.procedureType = TXIPROCEDURETYPE.RINGTEXDISTORT;
            break;
          }
        break;
        case 'numx':
          this.numx = parseInt(args[1]);
        break;
        case 'numy':
          this.numy = parseInt(args[1]);
        break;
        case 'fps':
          this.fps = parseInt(args[1]);
        break;

        //FONTS
        case 'numchars':
          this.numchars = parseInt(args[1]);
        break;
        case 'fontheight':
          this.fontheight = parseFloat(args[1]);
        break;
        case 'baselineheight':
          this.baselineheight = parseFloat(args[1]);
        break;
        case 'texturewidth':
          this.texturewidth = parseFloat(args[1]);
        break;
        case 'spacingr':
          this.spacingr = parseFloat(args[1]);
        break;
        case 'spacingb':
          this.spacingb = parseFloat(args[1]);
        break;
        case 'caretindent':
          this.caretindent = parseFloat(args[1]);
        break;
        case 'upperleftcoords':
          const _num = parseInt(args[1]);

          const _max = i + 1 + _num;
          
          for(let _i = i + 1; _i < _max; _i++){
            const line = lines[_i];
            const args = line.split(' ');
            this.upperleftcoords.push({x: parseFloat(args[0]), y: parseFloat(args[1]), z: parseFloat(args[2])});
          }

          i += _num-1;

        break;
        case 'lowerrightcoords':
          const _num2 = parseInt(args[1]);

          const _max2 = i + 1 + _num2;
          
          for(let _i = i + 1; _i < _max2; _i++){
            const line = lines[_i];
            const args = line.split(' ');
            this.lowerrightcoords.push({x: parseFloat(args[0]), y:parseFloat(args[1]), z:parseFloat(args[2])});
          }

          i += _num2-1;

        break;


      }

    }
  }

  /**
   * Serialize TXI to binary (UTF-8). Use for saving to file; same as encoding toString().
   */
  toBuffer(): Uint8Array {
    return new TextEncoder().encode(this.toString());
  }

  /**
   * Serialize TXI to string (same format as file). Use for saving/writing TXI.
   */
  toString(): string {
    const lines: string[] = [];
    const append = (cmd: string, value: string | number | boolean) => {
      if (typeof value === 'boolean') value = value ? 1 : 0;
      lines.push(`${cmd} ${value}`);
    };
    if (this.isbumpmap) append('isbumpmap', 1);
    if (this.textureType === TXITexType.LIGHTMAP) lines.push('islightmap');
    if (this.textureType === TXITexType.ENVMAP) append('cube', 1);
    if (!this.isCompressed) append('compresstexture', 0);
    if (this.mipMap !== 0) append('mipmap', this.mipMap);
    if (this.downSampleMin !== 0) append('downsamplemin', this.downSampleMin);
    if (this.downSampleMax !== 0) append('downsamplemax', this.downSampleMax);
    if (this.decal !== 0) append('decal', this.decal);
    if (this.defaultWidth !== 0) append('defaultwidth', this.defaultWidth);
    if (this.defaultHeight !== 0) append('defaultheight', this.defaultHeight);
    if (this.filter !== 0) append('filter', this.filter);
    if (this.blending !== TXIBlending.NONE) {
      lines.push(this.blending === TXIBlending.ADDITIVE ? 'blending additive' : 'blending punchthrough');
    }
    if (this.bumpMapScaling !== 1) append('bumpmapscaling', this.bumpMapScaling);
    if (this.bumpMapTexture) append('bumpmaptexture', this.bumpMapTexture);
    if (this.envMapTexture) append('envmaptexture', this.envMapTexture);
    if (this.waterAlpha != null) append('wateralpha', this.waterAlpha);
    if (this.procedureType !== TXIPROCEDURETYPE.NONE) {
      const pt = this.procedureType === TXIPROCEDURETYPE.CYCLE ? 'cycle'
        : this.procedureType === TXIPROCEDURETYPE.WATER ? 'water'
        : this.procedureType === TXIPROCEDURETYPE.RANDOM ? 'random'
        : this.procedureType === TXIPROCEDURETYPE.RINGTEXDISTORT ? 'ringtexdistort' : 'cycle';
      lines.push(`proceduretype ${pt}`);
    }
    if (this.numx !== 0) append('numx', this.numx);
    if (this.numy !== 0) append('numy', this.numy);
    if (this.fps !== 0) append('fps', this.fps);
    if (this.numchars !== 0) append('numchars', this.numchars);
    if (this.fontheight !== 0) append('fontheight', this.fontheight);
    if (this.baselineheight !== 0) append('baselineheight', this.baselineheight);
    if (this.texturewidth !== 0) append('texturewidth', this.texturewidth);
    if (this.spacingr !== 0) append('spacingr', this.spacingr);
    if (this.spacingb !== 0) append('spacingb', this.spacingb);
    if (this.caretindent !== 0) append('caretindent', this.caretindent);
    if (this.upperleftcoords && this.upperleftcoords.length > 0) {
      lines.push(`upperleftcoords ${this.upperleftcoords.length}`);
      for (const c of this.upperleftcoords) {
        lines.push(`${c.x} ${c.y} ${c.z}`);
      }
    }
    if (this.lowerrightcoords && this.lowerrightcoords.length > 0) {
      lines.push(`lowerrightcoords ${this.lowerrightcoords.length}`);
      for (const c of this.lowerrightcoords) {
        lines.push(`${c.x} ${c.y} ${c.z}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Create TXI from raw buffer (e.g. file bytes). Same as new TXI(buffer).
   */
  static fromBuffer(buffer: Uint8Array): TXI {
    return new TXI(buffer);
  }
}

/**
 * Load TXI from buffer (PyKotor read_txi).
 */
export function readTXIFromBuffer(buffer: Uint8Array): TXI {
  return TXI.fromBuffer(buffer);
}

/**
 * Serialize TXI to buffer (PyKotor bytes_txi).
 */
export function writeTXIToBuffer(txi: TXI): Uint8Array {
  return txi.toBuffer();
}


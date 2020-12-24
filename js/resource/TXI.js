/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TXI class.
 */

class TXI {

  constructor(info = ''){

    this.blending = TXI.BLENDING.NONE;
    this.textureType = TXI.TEXTYPE.DIFFUSE;
    this.procedureType = TXI.PROCEDURETYPE.NONE;

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

    this.numchars = 0;
    this.fontheight = 0;
    this.baselineheight = 0;
    this.texturewidth = 0;
    this.spacingr = 0;
    this.spacingb = 0;
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
      this.info = new StringDecoder('utf8').write(info).toLowerCase();
      this.ParseInfo();
    }else if(typeof info === 'string'){
      this.info = info.toLowerCase();
      this.ParseInfo();
    }

    //console.log('TXI', this.info, typeof info, info instanceof Uint8Array);

  }

  ParseInfo(){
    let lines = this.info.split('\n');
    for(let i = 0; i!= lines.length; i++){
      let line = lines[i];
      let args = line.split(' ');

      if(typeof args[1] != 'undefined')
        args[1] = args[1].trim();

      switch(args[0]){
        /*case 'isbumpmap':
          if(this.textureType != TXI.TEXTYPE.NORMALMAP)
            this.textureType = TXI.TEXTYPE.BUMPMAP;
        break;*/
        case 'isbumpmap':
          this.isbumpmap = parseInt(args[1]) ? true : false;
        break;
        case 'islightmap':
          this.textureType = TXI.TEXTYPE.LIGHTMAP;
        break;
        case 'cube':
          this.textureType = TXI.TEXTYPE.ENVMAP;
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
              this.blending = TXI.BLENDING.PUNCHTHROUGH;
            break;
            case 'additive':
              this.blending = TXI.BLENDING.ADDITIVE;
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
              this.procedureType = TXI.PROCEDURETYPE.CYCLE;
            break;
            case 'water':
              this.isAnimated = false;
              this.procedureType = TXI.PROCEDURETYPE.WATER;
            break;
            case 'random':
              this.procedureType = TXI.PROCEDURETYPE.RANDOM;
            break;
            case 'ringtexdistort':
              this.procedureType = TXI.PROCEDURETYPE.RINGTEXDISTORT;
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
          let _num = parseInt(args[1]);

          let _max = i + 1 + _num;
          
          for(let _i = i + 1; _i != _max; _i++){
            let line = lines[_i];
            let args = line.split(' ');
            this.upperleftcoords.push({x: parseFloat(args[0]), y: parseFloat(args[1]), z: parseFloat(args[2])});
          }

          i += _num-1;

        break;
        case 'lowerrightcoords':
          let _num2 = parseInt(args[1]);

          let _max2 = i + 1 + _num2;
          
          for(let _i = i + 1; _i != _max2; _i++){
            let line = lines[_i];
            let args = line.split(' ');
            this.lowerrightcoords.push({x: parseFloat(args[0]), y:parseFloat(args[1]), z:parseFloat(args[2])});
          }

          i += _num2-1;

        break;


      }

    }
  }

}

TXI.BLENDING = {
  'NONE': 0,
  'ADDITIVE': 1,
  'PUNCHTHROUGH': 2
}

TXI.TEXTYPE = {
  'DIFFUSE': 0,
  'BUMPMAP': 1,
  'NORMALMAP': 2,
  'ENVMAP': 3,
  'LIGHTMAP': 4
};

TXI.PROCEDURETYPE = {
  'NONE': 0,
  'CYCLE': 1,
  'WATER': 2,
  'RANDOM': 3,
  'RINGTEXDISTORT': 4
};

module.exports = TXI;

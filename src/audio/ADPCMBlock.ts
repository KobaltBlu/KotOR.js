/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ADPCMBlock is used in conjunction with ADPCMDecoder to decode ADPCM wav files in the game.
 */

export class ADPCMBlock {
  header: any = {};
  samples: any[] = [];

  constructor( args: any = {} ){

    args = Object.assign({
      channels: 2
    }, args); 

    this.header = { samples: [] };
    this.samples = [];

    for(let i = 0; i < args.channels; i++){
      this.header.samples.push([]);
      this.samples.push([]);
    }

  }

}

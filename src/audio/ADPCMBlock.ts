/**
 * ADPCMBlock class.
 *
 * The ADPCMBlock is used in conjunction with ADPCMDecoder to decode ADPCM wav files in the game.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ADPCMBlock.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface ADPCMBlockHeader {
  samples: number[][];
}

export interface ADPCMBlockConstructorArgs {
  channels?: number;
}

export class ADPCMBlock {
  header: ADPCMBlockHeader = { samples: [] };
  samples: number[][] = [];

  constructor(args: ADPCMBlockConstructorArgs = {}) {
    const opts = Object.assign({ channels: 2 }, args);

    this.header = { samples: [] };
    this.samples = [];

    for (let i = 0; i < opts.channels; i++) {
      this.header.samples.push([]);
      this.samples.push([]);
    }
  }
}

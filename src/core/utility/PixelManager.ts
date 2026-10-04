/**
 * PixelManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file PixelManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class PixelManager {

  constructor(){

  }

  static Rotate90deg(buffer: Uint8Array, channels: number = 4, width: number = 0, height: number = 0){

    if(!(buffer instanceof Uint8Array))
      throw 'Buffer is not of type Uint8Array';

    let sizeBuffer = width * height * channels;
    let tempBuffer = new Uint8Array(sizeBuffer);

    for (let y = 0, destinationColumn = height - 1; y < height; ++y, --destinationColumn) {
        let offset = y * width;


        for (let x = 0; x < width; x++){
          for (let i = 0; i < channels; i++){
            tempBuffer[(x * height + destinationColumn) * channels + i] = buffer[(offset + x) * channels + i];
          }
        }

    }

    return tempBuffer;

  }

}

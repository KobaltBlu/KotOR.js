import { BinaryReader } from "../BinaryReader";

const LTR_HEADER_LENGTH = 9;

/**
 * LTRObject class
 * 
 * Class representing a LTR file in memory.
 * uses Markov Chains to generate random names for character generation ingame
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LTRObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @see https://nwn.wiki/display/NWN1/LTR
 * @see http://web.archive.org/web/20160801205623/https://forum.bioware.com/topic/134653-ltr-file-format/#entry3901817
 */
export class LTRObject {

  static CharacterArrays: any = {
    26: 'abcdefghijklmnopqrstuvwxyz',
    28: 'abcdefghijklmnopqrstuvwxyz\'-'
  };

  buffer: Uint8Array;
  file: string;
  fileType: string;
  fileVersion: string;
  charCount: number;
  singleArray: number[][] = [];
  doubleArray: number[][][] = [];
  tripleArray: number[][][][] = [];

  constructor( data: string|Uint8Array){

    if(typeof data === 'string'){
      this.file = data;
      this.openFile(this.file);
    }else if(data instanceof Uint8Array){
      this.buffer = data;
      this.readBuffer(this.buffer);
    }

  }

  openFile(file: string){

  }

  readBuffer(data: Uint8Array){
    if(data instanceof Uint8Array){
      const br = new BinaryReader(data);

      this.fileType = br.readChars(4);
      this.fileVersion = br.readChars(4);
      this.charCount = br.readByte();

      br.seek(LTR_HEADER_LENGTH);

      //Single Markov Chains
      this.singleArray[0] = [];
      for(let i = 0; i < this.charCount; i++){
        this.singleArray[0][i] = br.readSingle();
      }

      this.singleArray[1] = [];
      for(let i = 0; i < this.charCount; i++){
        this.singleArray[1][i] = br.readSingle();
      }

      this.singleArray[2] = [];
      for(let i = 0; i < this.charCount; i++){
        this.singleArray[2][i] = br.readSingle();
      }

      //Double Markov Chains
      for(let i = 0; i < this.charCount; i++){
        this.doubleArray[i] = [
          [], [], []
        ];

        for(let j = 0; j < this.charCount; j++){
          this.doubleArray[i][0][j] = br.readSingle();
        }
  
        for(let j = 0; j < this.charCount; j++){
          this.doubleArray[i][1][j] = br.readSingle();
        }
  
        for(let j = 0; j < this.charCount; j++){
          this.doubleArray[i][2][j] = br.readSingle();
        }

      }

      //Tripple Markov Chains
      for(let i = 0; i < this.charCount; i++){
        this.tripleArray[i] = [];
        for(let j = 0; j < this.charCount; j++){
          this.tripleArray[i][j] = [
            [], [], []
          ];

          for(let k = 0; k < this.charCount; k++){
            this.tripleArray[i][j][0][k] = br.readSingle();
          }
    
          for(let k = 0; k < this.charCount; k++){
            this.tripleArray[i][j][1][k] = br.readSingle();
          }
    
          for(let k = 0; k < this.charCount; k++){
            this.tripleArray[i][j][2][k] = br.readSingle();
          }
        }
      }

      this.buffer = new Uint8Array(0);
      br.dispose();
    }
  }

  /**
   * generates a single name from the Markov Chains found the this LTRObject
   * @see https://github.com/mtijanic/nwn-misc/blob/master/nwnltr.c
   */
  public getName(): string {
    const letters = LTRObject.CharacterArrays[this.charCount];
    if(!letters){
      throw new Error('Invalid letter count');
    }

    let prob: number = 0;
    let i = 0;
    let wordIndex = 0;
    let chars = [];
    
    let attempts = 0;
    let bGetFirstThree = true;
    let bGenerating = false;
    let bDone = false;

    while(bGetFirstThree && !bDone){
      for (i = 0, prob = Math.random(); i < this.charCount; i++)
        if (prob < this.singleArray[0][i])
          break;
        
      if (i == this.charCount){
        continue;
      }
      chars[wordIndex++] = i;

      for (i = 0, prob = Math.random(); i < this.charCount; i++)
        if (prob < this.doubleArray[chars[wordIndex-1]][0][i])
          break;

      if (i == this.charCount){
        continue;
      }
      chars[wordIndex++] = i;

      for (i = 0, prob = Math.random(); i < this.charCount; i++)
        if (prob < this.tripleArray[chars[wordIndex-2]][chars[wordIndex-1]][0][i])
          break;

      if (i == this.charCount){
        continue;
      }
      chars[wordIndex++] = i;
      
      bGenerating = true;
      while(bGenerating && !bDone){
        prob = Math.random();
        if ((Math.floor(Math.random() * 2147483647) % 12) <= chars.length) {
          for (i = 0; i < this.charCount; i++) {
            if (prob < this.tripleArray[chars[wordIndex-2]][chars[wordIndex-1]][2][i]) {
              chars[wordIndex++] = i;
              bGenerating = false;
              break;
            }
          }
        }
  
        if(!bGenerating){ 
          bDone = true;
          break; 
        }
  
        for (i = 0; i < this.charCount; i++) {
          if (prob < this.tripleArray[chars[wordIndex-2]][chars[wordIndex-1]][1][i]) {
            chars[wordIndex++] = i;
            break;
          }
        }
  
        if (i == this.charCount) {
          if (chars.length < 3 || ++attempts > 100){
            bGenerating = false;
          }
        }
      }
    }
    
    return chars.map((value: number, index: number) => {
      return index == 0 ? letters[value].toUpperCase() : letters[value];
    }).join('') as string;
  }

}

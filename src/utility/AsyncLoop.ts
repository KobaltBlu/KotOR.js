import { IAsyncLoopOptions } from "../interface/utility/IAsyncLoopOptions";

/**
 * AsyncLoop class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AsyncLoop.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AsyncLoop {

  index: number = 0;
  array: any[] = [];
  onLoop: Function|undefined;
  onComplete: Function|undefined;

  constructor(args: IAsyncLoopOptions = {}){

    args = Object.assign({
      array: [],        //The array to iterate over
      onLoop: undefined,     //The callback to fire on each iteration
      onComplete: undefined  //The callback to fire when all array elements have been iterated over
    }, args);

    this.index = 0; //index tracks the position of the current array element that is being iterated over.

    this.array = args.array || [];
    this.onLoop = args.onLoop;
    this.onComplete = args.onComplete;

  }

  next(){
    if(this.index < this.array.length){
      const index = this.index;
      const count = this.array.length;
      let obj = this.array[this.index++];

      if(typeof this.onLoop === 'function')
        this.onLoop(obj, this, index, count);
        
    }else if(typeof this.onComplete === 'function'){
      this.onComplete();
    }
  }

  iterate( onComplete?: Function ){
    //Set the array index variable to 0
    this.index = 0;
    //Callback to fire once the array is exhausted
    this.onComplete = onComplete || this.onComplete;
    //Start the loop
    this.next();
  }

  // _Loop(){
  //   //console.warn('AsyncLoop._Loop() is depricated. please use AsyncLoop.next() instead');
  //   this.next();
  // }

  Begin( onComplete: Function ){
    //console.warn('AsyncLoop.iterate() is depricated. please use AsyncLoop.iterate() instead');
    this.iterate( onComplete );
  }

}

/*
  EXAMPLE:

  _test = new AsyncLoop({
    array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    onLoop: (obj, looper) => {
      console.log(obj);
      looper.next();
      }
  });
  _test.iterate( () => {
    console.log('Done looping');
  });
*/
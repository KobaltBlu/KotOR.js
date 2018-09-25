class NWScriptStack {


  constructor(){
    this.stack = [];
    this.pointer = 0;
    this.basePointer = 0;

  }

  //Data pushed to the stack must be no longer and no shorter than 4 bytes
  push(data = 0, instr = null){
    /*if(!(data instanceof Uint8Array))
      throw 'Data is not of type Uint8Array';

    if(data.length != 4)
      throw 'Data is not 4Bytes in length. All data pushed to the stack must be 4Bytes in length.';*/

    //data._instr = instr;

    this.stack.push(data);
    this.pointer += 4;
    //debugger;
  }

  pop(){
    //debugger;
    this.pointer -= 4;
    return this.stack.pop();
  }

  peek(){
    return this.stack[(this.pointer - 4) / 4];
  }

  getAtPointer(index = -4){
    return this.stack[(this.pointer + index) / 4];
  }

  getAtTop(index = -4){
    return this.stack[((this.stack.length*4) + index) / 4];
  }

  getAtBasePointer(index = -4){
    return this.stack[(this.basePointer + index) / 4];
  }

  replace(index = -4, data){

    /*if(!(data instanceof Uint8Array))
      throw 'Data is not of type Uint8Array';

    if(data.length != 4)
      throw 'Data is not 4Bytes in length. All data pushed to the stack must be 4Bytes in length.';*/

    /*index = index / 4; //This is always a negative value

    if(index > -1)
      throw 'Index cannot be greater than -1.';

    console.log('STACK_LEN', this.stack.length, index, (this.stack.length*4) + index)

    this.stack[this.stack.length + index] = data;*/

    //index = index / 4; //This is always a negative value
    
    //if(index > -1)
    //  throw 'Index cannot be greater than -1.';

    this.stack[((this.pointer + index)/4)] = data;

  }

  replaceBP(index = -4, data){
    
    /*if(!(data instanceof Uint8Array))
      throw 'Data is not of type Uint8Array';

    if(data.length != 4)
      throw 'Data is not 4Bytes in length. All data pushed to the stack must be 4Bytes in length.';*/

    //index = index / 4; //This is always a negative value

    /*if(index > -4)
      throw 'Index cannot be greater than -4.';

    this.stack[(this.basePointer*4) + index] = data;*/

    //index = index / 4; //This is always a negative value
    
    //if(index > -1)
    //  throw 'Index cannot be greater than -1.';

    this.stack[(this.basePointer + index)/4] = data;

  }

  getSize(){

  }

  getPointer(){
    return this.pointer;
  }

  setPointer(pos){
    this.pointer += pos;
  }

  setBasePointer(pos){
    this.basePointer += pos;
  }

  storeState(bpO, spO){

    let stack = [];
    for(let i = 0; i < spO; i++){
      let tmpPointer = (this.pointer - i);
      stack.push(this.stack[tmpPointer])
    }

    this._storeState = {
      localStack: this.stack,//stack.reverse(),
      globalStack: this.stack,//globalStack.reverse(),
      pointer: this.pointer,
      basePointer: this.basePointer
    };
    //TODO:: Actually implement this properly

  }

  restoreState(){
    this.stack = this._storeState.localStack;
    this.stack = this._storeState.globalStack;
    this.pointer = this._storeState.pointer;
    this.basePointer = this._storeState.basePointer;
    //TODO:: Actually implement this properly
  }

  saveBP() {
    this.oldBP = this.basePointer;
    this.basePointer = this.pointer;
    //this.pointer = 0;
  }

  restoreBP() {
    //alert('restore BP');
    //this.basePointer = this.oldBP;
  }


}



NWScriptStack.intToUint8Array = function(integer) {
  return integer;
  try{
    let _temp = new Buffer(4);
    _temp.writeInt32LE(parseInt(integer));
    // we want to represent the input as a 4-byte array
    return new Uint8Array(_temp);
  }catch(e){
    return new Uint8Array(new Buffer(4));
    console.error(e, integer);
  }
};

NWScriptStack.uint8ArrayToInt = function(byteArray) {
  return byteArray;
  if(!(byteArray instanceof Uint8Array)){
    console.error('uint8ArrayToInt', byteArray);
    //byteArray = new Uint8Array([1, 0, 0, 0]);
  }
  //try{
    let _temp = new Buffer(byteArray);
    return _temp.readInt32LE();
  /*}catch(e){
    console.error(e, byteArray);
    return 0;
  }*/
};

module.exports = NWScriptStack;
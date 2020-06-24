class NWScriptInstruction {

  constructor(args = {}){

    args = Object.assign({
      code: 0,
      type: 0,
      address: 0,
      prevInstr: null,
      nextInstr: null,
      eof: false,
      isArg: false,
      index: -1
    }, args);

    this.code = args.code;
    this.type = args.type;
    this.address = args.address;
    this.prevInstr = args.prevInstr;
    this.nextInstr = args.nextInstr;

    this.codeName = NWScript.ByteCodes[this.code];

    this.eof = args.eof;
    this.isArg = args.isArg;
    this.index = args.index;

    this.code_hex = this.intToHex(this.code, 2);
    this.type_hex = this.intToHex(this.type, 2);
    this.address_hex = this.intToHex(this.address, 8);

  }

  intToHex( number = 0, min_length = 1 ){
    let hex = (number).toString(16);
    let hex_length = hex.length < min_length ? min_length : hex.length;
    let hex_pad = (new Array(hex_length)).fill('0').join('');
    return (hex_pad + hex).substr(-hex_length);
  }

}

module.exports = NWScriptInstruction;

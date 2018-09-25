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

  }

}

module.exports = NWScriptInstruction;

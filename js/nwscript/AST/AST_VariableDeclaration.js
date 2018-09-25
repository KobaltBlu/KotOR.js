class VariableDeclaration {

  constructor(args={}){

    args = Object.assign({
      identifier: null,
      name: '',
      value: null
    }, args);

    this.identifier = args.identifier;
    this.name = args.name;
    this.value = args.value;

  }

}

module.exports = VariableDeclaration;
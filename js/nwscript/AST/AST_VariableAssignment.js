class VariableAssignment {

  constructor(args={}){

    args = Object.assign({
      identifier: null,
      variable: null,
      value: null
    }, args);

    this.identifier = args.identifier;
    this.variable = args.variable;
    this.value = args.value;

  }

}

module.exports = VariableAssignment;
class AST_FunctionNode extends AST_Block {

  constructor( args = {} ){
    super();
    args = Object.assign({
      return: null,
      name: '',
      arguments: [],
      statements: []
    }, args);

    this.return = args.return;
    this.name = args.name;
    this.arguments = args.arguments;
    this.statements = args.statements;

  }

}

module.exports = AST_FunctionNode;
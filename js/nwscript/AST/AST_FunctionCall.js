class AST_FunctionCall extends AST_Block {

  constructor( args = {} ){
    super();
    args = Object.assign({
      name: '',
      arguments: []
    }, args);

    this.return = args.return;
    this.name = args.name;
    this.arguments = args.arguments;
    this.statements = args.statements;

  }

}

module.exports = AST_FunctionCall;
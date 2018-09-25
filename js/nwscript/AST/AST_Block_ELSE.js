class AST_Block_ELSE extends AST_Block {
  
  constructor(args = {}){
    super();
    args = Object.assign({
      arguments: [],
      statements: []
    }, args);

    this.arguments = args.arguments;
    this.statements = args.statements;

  }

}

module.exports = AST_Block_ELSE;
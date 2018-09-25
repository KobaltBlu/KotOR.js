class AST_Block_IF extends AST_Block {
  
  constructor(args = {}){
    super();
    args = Object.assign({
      expression: [],
      statements: [],
      sub_condition: null
    }, args);

    this.expression = args.expression;
    this.statements = args.statements;
    this.sub_condition = args.sub_condition;

  }

}

module.exports = AST_Block_IF;
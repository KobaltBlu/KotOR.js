class StatementReturn extends AST_Statement{

  constructor( args = {} ){
    super();
    args = Object.assign({
      value: null
    }, args);

    this.value = args.value;

  }

}

module.exports = StatementReturn;
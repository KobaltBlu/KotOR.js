class AST_Program {

  constructor( args = {} ){

    args = Object.assign({
      body: []
    }, args);

    this.body = args.body;

  }

}

module.exports = AST_Program;
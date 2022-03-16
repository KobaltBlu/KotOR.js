class NWScriptCompile {

  constructor( args = {} ){

    args = Object.assign({
      source: ''
    }, args);

    this.source = args.source;

    this.CreateScriptTree();

  }

  CreateScriptTree(){

    if(this.source === '')
      return;

    

  }

}

module.exports = NWScriptCompile;
class NWScriptCompile {

  constructor( args = {} ){

    args = $.extend({
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
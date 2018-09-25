/*
The ScopeStack is in charge of keeping track of variable scope as the AST builds

*/

class ScopeStack {

  constructor (){
    this.scopes = [];
  }


  pop(){
    if(this.scopes.length > 1){
      this.scopes.pop();
    }
  }

  push(){
    this.scopes.push({

    });
  }

  variableExists(varName){
    let len = this.scopes.length;
    while(len--){
      if(this.scopes[len].hasOwnProperty(varName))
        return true;
    }
    return false;
  }

  getVariable(varName){
    let len = this.scopes.length;
    while(len--){
      if(this.scopes[len].hasOwnProperty(varName))
        return this.scopes[len][varName];
    }
    return undefined;
  }

  setVariable(varName, varObj){
    this.scopes[this.scopes.length - 1][varName] = varObj;
  }

  getTopStack(){
    return this.scopes[this.scopes.length - 1];
  }



}

module.exports = ScopeStack;
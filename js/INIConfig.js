class INIConfig {

  constructor( ini_path = null, defaults = {} ){
    this.ini_path = ini_path;
    this.defaults = defaults;
    this.options = {};
    this.nodes = [];
    
    try{
      let ini_text = fs.readFileSync(this.ini_path).toString('utf8');
      let lines = ini_text.split(/\r?\n/);

      this.current_section = null;

      for(let i = 0, len = lines.length; i < len; i++){
        let line = lines[i].trim();
        if( !line.length ){

        }else{
          let section = line.match(/^\[(.*)\]$/);
          let property = line.split('=');
          if(section != null && section.length){
            this.current_section = section[1];
            this.options[section[1]] = {};
          }else if(property.length){

            let name = property.shift();
            let value = property.join('=');

            try{
              value = JSON.parse(value.toString());
            }catch(e){
              value = value.toString();
            }

            if(this.current_section){
              this.options[this.current_section][name] = value;
            }else{
              this.options[name] = value;
            }
          }
        }
      }
    }catch(e){

    }

    this.options = this._mergeDeep(this.defaults, this.options);

  }

  /**
   * Simple object check.
   * @param item
   * @returns {boolean}
   */
  _isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   */
  _mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this._isObject(target) && this._isObject(source)) {
      for (const key in source) {
        if (this._isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this._mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this._mergeDeep(target, ...sources);
  }

  // Code copied from linked Stack Overflow question
  // https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  // Answer by Salakar:
  // https://stackoverflow.com/users/2938161/salakar

  getProperty(key, value) {
    //https://stackoverflow.com/a/20424385
    var parts = key.split('.');
    var o = this.options;
    if (parts.length > 1) {
      for (var i = 0; i < parts.length - 1; i++) {
          if (!o[parts[i]])
              o[parts[i]] = {};
          o = o[parts[i]];
      }
    }

    return o[parts[parts.length - 1]];
  }

  setProperty(key, value) {
    //https://stackoverflow.com/a/20424385
    var parts = key.split('.');
    var o = this.options;
    if (parts.length > 1) {
      for (var i = 0; i < parts.length - 1; i++) {
          if (!o[parts[i]])
              o[parts[i]] = {};
          o = o[parts[i]];
      }
    }

    o[parts[parts.length - 1]] = value;
  }

  toString(){
    let string = '';
    let keys = Object.keys(this.options);
    for(let i = 0, len = keys.length; i < len; i++){
      string += this.toStringNodeWalker(keys[i], this.options[keys[i]]);
    }
    return '\r\n'+string;
  }

  toStringNodeWalker(key = '', value = ''){
    if(typeof value == 'object'){
      let string = '['+key+']\r\n';
      let keys = Object.keys(value);
      for(let i = 0, len = keys.length; i < len; i++){
        string += this.toStringNodeWalker(keys[i], value[keys[i]]);
      }
      return string+'\r\n';
    }else{
      return key+'='+value+'\r\n';
    }
  }

  save( onSave = null ){
    fs.writeFile(this.ini_path, this.toString(), function(err) {
      if(err) {
        return console.log(err);
      }
  
      console.log("INIConfig saved!");

      if(typeof onSave === 'function')
        onSave();

    });
  }

}

module.exports = INIConfig;
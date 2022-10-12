
import { DeepObject } from "./DeepObject";
import * as fs from "fs";

export class INIConfig {
  ini_path: string;
  defaults: any;
  options: any = {};
  nodes: any[];
  current_section: any;

  constructor( ini_path: string, defaults: any = {} ){
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

    this.options = DeepObject.Merge(this.defaults, this.options);

  }

  // Code copied from linked Stack Overflow question
  // https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  // Answer by Salakar:
  // https://stackoverflow.com/users/2938161/salakar

  getProperty(key: string) {
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

  setProperty(key: string, value: any) {
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

  toStringNodeWalker(key: string, value: any){
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

  save( onSave?: Function ){
    fs.writeFile(this.ini_path, this.toString(), function(err) {
      if(err) {
        return console.log(err);
      }
  
      //console.log("INIConfig saved!");

      if(typeof onSave === 'function')
        onSave();

    });
  }

}

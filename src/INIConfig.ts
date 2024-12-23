import { DeepObject } from "./DeepObject";
import * as swKotOR from "./game/kotor/swkotor-config";
import * as swKotOR2 from "./game/tsl/swkotor2-config";
import { GameFileSystem } from "./utility/GameFileSystem";

/**
 * INIConfig class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file INIConfig.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class INIConfig {
  ini_path: string;
  defaults: any;
  options: any = {};
  current_section: any;
  
  static defaultConfigs: any = {
    swKotOR: swKotOR.default,
    swKotOR2: swKotOR2.default
  };

  constructor( ini_path: string, defaults: any = {} ){
    this.ini_path = ini_path;
    this.defaults = defaults;
    this.options = {};
    console.log('defaults', defaults)
  }

  async load(): Promise<void> {
    try{
      const buffer = await GameFileSystem.readFile(this.ini_path);
      const decoder = new TextDecoder('utf-8');
      let ini_text = decoder.decode(buffer);
      let lines = ini_text.split(/\r?\n/);

      this.current_section = null;

      for(let i = 0, len = lines.length; i < len; i++){
        const line = lines[i].trim();
        if( !line.length ){
          continue;
        }

        const section = line.match(/^\[(.*)\]$/);
        const property = line.split('=');
        if(section != null && section.length){
          this.current_section = section[1];
          this.options[section[1]] = {};
        }else if(property.length){
          const name = property.shift();
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
      this.options = DeepObject.Merge(this.defaults, this.options);
      return;
    }catch(e){
      console.error(e);
      this.options = DeepObject.Merge(this.defaults, this.options);
      return;
    }
  }

  // Code copied from linked Stack Overflow question
  // https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  // Answer by Salakar:
  // https://stackoverflow.com/users/2938161/salakar
  getProperty(key: string) {
    //https://stackoverflow.com/a/20424385
    const parts = key.split('.');
    let o = this.options;
    if (parts.length > 1) {
      for (let i = 0; i < parts.length - 1; i++) {
          if (!o[parts[i]])
            o[parts[i]] = {};
          o = o[parts[i]];
      }
    }

    return o[parts[parts.length - 1]];
  }

  setProperty(key: string, value: any) {
    //https://stackoverflow.com/a/20424385
    const parts = key.split('.');
    let o = this.options;
    if (parts.length > 1) {
      for (let i = 0; i < parts.length - 1; i++) {
          if (!o[parts[i]])
            o[parts[i]] = {};
          o = o[parts[i]];
      }
    }

    o[parts[parts.length - 1]] = value;
  }

  toString(): string {
    let string = '';
    const keys = Object.keys(this.options);
    for(let i = 0, len = keys.length; i < len; i++){
      string += this.toStringNodeWalker(keys[i], this.options[keys[i]]);
    }
    return '\r\n'+string;
  }

  toStringNodeWalker(key: string, value: any): string {
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

  async save(){
    try{
      console.log(`INIConfig saving: ${this.ini_path}`);
      await GameFileSystem.writeFile(this.ini_path, Buffer.from(this.toString()));
      console.log(`INIConfig saved: ${this.ini_path}`);
    }catch(e){
      console.error(e);
    }
  }

}

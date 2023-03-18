/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from "fs";
import * as path from "path";

/* @file
 * The TemplateEngine class.
 */

export class TemplateEngine {
  static templates: any = {};

  constructor(){
    TemplateEngine.templates = {};
  }

  static GetTemplate(file: string, data = {}){
    if(!(file in TemplateEngine.templates)){

      /*let link = document.createElement('link');
      link.rel = 'import';
      link.href = file;
      //link.setAttribute('async', ''); // make it async!
      link.onload = function(e) {...};
      link.onerror = function(e) {...};
      document.head.appendChild(link);*/

      TemplateEngine.templates[file] = fs.readFileSync(file).toString();
      return TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m: any,key: string){return data.hasOwnProperty(key)?(data as any)[key]:"";});
    }else{
      return TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m: any,key: string){return data.hasOwnProperty(key)?(data as any)[key]:"";});
    }

    return 'not yet';

  }

  static GetTemplateAsync(file: string, data: any = {}, onSuccess?: Function){
    if(typeof data != 'object'){ data = {} };
    if(!(file in TemplateEngine.templates)){
      jQuery.ajax({
        url: path.join('..', file),
        success: (result: any) => {
          TemplateEngine.templates[file] = result;
          if(onSuccess != null)
            onSuccess(TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m: any,key: string){return data.hasOwnProperty(key)?data[key]:"";}));
        }
      });
    }else{
      if(onSuccess != null)
        onSuccess(TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m: any,key: string){return data.hasOwnProperty(key)?data[key]:"";}));
    }

  }

}

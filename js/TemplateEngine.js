/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TemplateEngine class.
 */

class TemplateEngine {

  constructor(){
    TemplateEngine.templates = {};
  }

  static GetTemplate(file, data = {}){
    if(!(file in TemplateEngine.templates)){

      /*var link = document.createElement('link');
      link.rel = 'import';
      link.href = file;
      //link.setAttribute('async', ''); // make it async!
      link.onload = function(e) {...};
      link.onerror = function(e) {...};
      document.head.appendChild(link);*/

      TemplateEngine.templates[file] = fs.readFileSync(file).toString();
      return TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m,key){return data.hasOwnProperty(key)?data[key]:"";});
    }else{
      return TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m,key){return data.hasOwnProperty(key)?data[key]:"";});
    }

    return 'not yet';

  }

  static GetTemplateAsync(file, data = {}, onSuccess = null){
    if(typeof data != 'object'){ data = {} };
    if(!(file in TemplateEngine.templates)){
      jQuery.ajax({
        url: path.join('..', file),
        success: (result) => {
          TemplateEngine.templates[file] = result;
          if(onSuccess != null)
            onSuccess(TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m,key){return data.hasOwnProperty(key)?data[key]:"";}));
        }
      });
    }else{
      if(onSuccess != null)
        onSuccess(TemplateEngine.templates[file].replace(/{(\w*)}/g,function(m,key){return data.hasOwnProperty(key)?data[key]:"";}));
    }

  }

}

module.exports = TemplateEngine;

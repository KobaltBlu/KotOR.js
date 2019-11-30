class INIConfig {

  constructor( ini_path = null ){
    this.ini_path = ini_path;
    let ini_text = fs.readFileSync(this.ini_path).toString('utf8');
    let lines = ini_text.split(/\r?\n/);

    this.nodes = [];
    this.current_section = null;

    for(let i = 0, len = lines.length; i < len; i++){
      let line = lines[i].trim();
      if( !line.length ){
        /*if(this.current_section){
          this.current_section.nodes.push({
            type: 'newline'
          });
          this.current_section = null;
        }else{
          this.nodes.push({
            type: 'newline'
          });
        }*/
      }else{
        let section = line.match(/^\[(.*)\]$/);
        let property = line.split('=');
        if(section != null && section.length){
          this.current_section = {
            type: 'section', 
            name: section[1], 
            nodes: []
          };
          this.nodes.push(this.current_section);
        }else if(property.length){

          let name = property.shift();
          let value = property.join('=');

          try{
            value = JSON.parse(value.toString());
          }catch(e){
            value = value.toString();
          }

          if(this.current_section){
            this.current_section.nodes.push({
              type: 'property', 
              name: name,
              value: value
            });
          }else{
            this.nodes.push({
              type: 'property', 
              name: name,
              value: value
            });
          }
        }
      }
    }

  }

  getProperty(key = ''){

    let parts = key.split('.');
    if(parts.length == 1){
      for(let i = 0, len = this.nodes.length; i < len; i++){
        let node = this.nodes[i];
        if(node.type == 'property' && node.name === parts[0]){
          return node;
        }
      }
    }else if(parts.length == 2){
      for(let i = 0, len = this.nodes.length; i < len; i++){
        let section = this.nodes[i];
        if(section.type == 'section' && section.name === parts[0]){
          for(let j = 0, j_len = section.nodes.length; j < j_len; j++){
            let node = section.nodes[j];
            if(node.type == 'property' && node.name === parts[1]){
              return node;
            }
          }
        }
      }
    }

    return null;

  }

  setProperty(key = '', value = ''){
    let property = this.getProperty(key);
    if(property){
      property.value = value.toString();
    }
  }

  toString(){
    let string = '';
    for(let i = 0, len = this.nodes.length; i < len; i++){
      string += this.toStringNodeWalker(this.nodes[i]);
    }
    return '\r\n'+string;
  }

  toStringNodeWalker(node = null){

    if(typeof node == 'object' && typeof node.type === 'string'){
      switch(node.type){
        case 'newline':
          return '\r\n';
        case 'section':
          let string = '['+node.name+']\r\n';
          for(let i = 0, len = node.nodes.length; i < len; i++){
            string += this.toStringNodeWalker(node.nodes[i]);
          }
          return string+'\r\n';
        case 'property':
          return node.name+'='+node.value+'\r\n';
      }
    }

    return '';

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
class TreeView {

  constructor($listNode = null){

    this.$nodeList = $listNode || $('<ul class="tree css-treeview js" />');

  }

  attachTo($element = null){
    if($element != null){
      $element.append(this.$nodeList);
    }
  }

  addNode($node){
    if($node instanceof TreeViewNode){
      this.$nodeList.append($node.$node)
    }else{
      this.$nodeList.append($node);
    }
  }

}

class TreeViewNode {

  constructor(name = '', type = 'list'){

    this.name = name;
    this.type = type;

    switch(this.type){
      case 'file':
        this.$node = $(`<li class="tree-node"><span class="glyphicon glyphicon-file"></span>`+this.name+`<ul></ul></li>`);
      break;
      default:
        this.$node = $(`<li class="tree-node"><label>`+this.name+`</label><ul></ul></li>`);
      break;
    }

    this.$fileIcon = $('span.glyphicon.glyphicon-file', this.$node);
    this.$nodeList = $('ul', this.$node);

    this.$node.on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleListVisibility();
    });

  }

  attachTo($element = null){
    if($element != null){
      $element.append(this.$listNode);
    }
  }

  addNode($node){

    if($node instanceof TreeViewNode){
      this.$nodeList.append($node.$node)
    }else{
      this.$nodeList.append($node);
    }
    
  }

  toggleListVisibility(){

      if(this.$nodeList.hasClass('open')){
        this.$nodeList.removeClass('open');
      }else{
        this.$nodeList.addClass('open');
      }

  }

}

module.exports = {
  TreeView: TreeView,
  TreeViewNode: TreeViewNode
};

/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The utility class holds random utility functions that are used thoughout the project
 */

String.prototype.titleCase = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

//Adding a java like string.equalsIgnoreCase method to the String prototype in Javascript
String.prototype.equalsIgnoreCase = function(str2){

	if(typeof str2 !== 'string')
		throw 'You can only pass a string to be compared';

  return this.localeCompare(str2, undefined, { sensitivity: 'accent' }) === 0;
  
};


/*
// Note that the API is still vendor-prefixed in browsers implementing it
document.addEventListener("pointerlockchange", function( event ) {
  //console.log(event, document.pointerLockElement)
});

// Note that the API is still vendor-prefixed in browsers implementing it
document.addEventListener("pointerlockerror", function( event ) {
  //console.log('plError', event)
});*/

class AsyncLoop {

  constructor(args = {}){

    args = Object.assign({
      array: [],
      onLoop: null,
      onComplete: null
    }, args);

    this.array = args.array;
    this.onLoop = args.onLoop;
    this.onComplete = args.onComplete;

  }

  _Loop(){

    if(this.index < this.array.length){
      let obj = this.array[this.index++];

      if(typeof this.onLoop === 'function')
        this.onLoop(obj, this);
        
    }else if(typeof this.onComplete === 'function'){
      this.onComplete();
    }

  }

  Begin( onComplete = null ){

    this.index = 0;
    this.onComplete = onComplete;
    this._Loop()

  }

}

/*
  EXAMPLE:

  _test = new AsyncLoop({
    array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    onLoop: (obj, looper) => {
      console.log(obj);
      looper._Loop();
      }
  });
  _test.Begin( () => {
    console.log('Done looping');
  });
*/



class UI {

}

class UIItem {

  constructor (args) {

    this.args = $.extend({
      type: UIItem.TYPE.DEFAULT,
      name: '',
      icon: '',
      color: 'white',
      onClick: null,
      parent: null
    }, args);

    switch(this.args.type){
      case UIItem.TYPE.DEFAULT:
        this.$item = $('<li class="title">'+this.args.name+'</li>');
      break;
      case UIItem.TYPE.ICON:
        this.$item = $('<li><img src="'+this.args.icon+'" title="'+this.args.name+'" style="width: 20px; height: 20px;"/></a></li>');
      break;
      case UIItem.TYPE.GLYPHICON:
        this.$item = $('<li><a href="#" class="glyphicon '+this.args.icon+'" style="color: '+this.args.color+';"></a></li>');
      break;
      case UIItem.TYPE.SEPARATOR:
        this.$item = $('<li role="separator" class="divider" />');
      break;
      default:
        this.$item = $('<li><a href="#">'+this.args.name+'</a></li>');
      break;
    }

    //Set onClick Event
    if (typeof this.args.onClick !== null) {
      this.$item.on('click', this.args.onClick);
    }else{
      this.$item.on('click', function(e){
        e.preventDefault();
      });
    }

    if(this.args.parent != null){
      this.args.parent.append(this.$item);
    }

  }

}

UIItem.TYPE = {
  DEFAULT: 0,
  ICON: 1,
  GLYPHICON: 2,
  SEPARATOR: 3
};

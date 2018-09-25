/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LoadingScren class. This is used in KotOR Forge
 */

class LoadingScreen {

  constructor($parent, isGlobal = true){

    this.message = 'Loading...';
    this.$loader = $('<div '+(isGlobal? 'id="loader"' : '')+' class="se-pre-con">'+
      '<div class="loading-container">'+
        '<div class="ball"></div>'+
        '<div class="ball1"></div>'+
        '<div id="loading-message" class="loading-message">'+this.message+'</div>'+
      '</div>'+
    '</div>');

    this.$loading_container = $('div.loading-container', this.$loader);
    this.$message = $('.loading-message', this.$loading_container);

    if(typeof $parent === 'undefined'){
      $parent = $('body');
    }

    if(!isGlobal){
      this.$loader.css({'position': 'absolute'})
    }

    console.log($parent);
    $parent.append(this.$loader);
  }

  SetMessage(msg){
    console.log(msg);
    this.$message.html(msg);
    this.$loading_container.css('left', '50%').css('left', '-='+this.$message.width()/2+'px');
  }

  Show(msg = null){
    if(msg != null)
      this.$message.html(msg);

    this.$loader.stop(true, true).show();
    this.$loading_container.css('left', '50%').css('left', '-='+this.$message.width()/2+'px');
  }

  Hide(){
    this.$loader.hide();
  }

  Dismiss(){
    this.$loader.fadeOut('slow');
  }

}

module.exports = LoadingScreen;

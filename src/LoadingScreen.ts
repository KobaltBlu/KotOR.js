/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LoadingScren class. This is used in KotOR Forge
 */

class LoadingScreen {

  constructor($parent, isGlobal = true){

    this.message = 'Loading...';
    this.$loader = $('<div '+(isGlobal? 'id="loader"' : '')+' class="loading-screen se-pre-con">'+
      '<div class="background"></div>'+
      '<div class="logo-wrapper"><img src="" /></div>'+
      '<div class="loading-container">'+
        '<div class="ball"></div>'+
        '<div class="ball1"></div>'+
        '<div id="loading-message" class="loading-message">'+this.message+'</div>'+
      '</div>'+
    '</div>');

    this.$background = $('div.background', this.$loader);
    this.$logo_wrapper = $('div.logo-wrapper', this.$loader);
    this.$logo = $('img', this.$logo_wrapper);
    this.$loading_container = $('div.loading-container', this.$loader);
    this.$message = $('.loading-message', this.$loading_container);

    if(typeof $parent === 'undefined'){
      $parent = $('body');
    }

    if(!isGlobal){
      this.$loader.css({'position': 'absolute'})
    }

    //console.log($parent);
    $parent.append(this.$loader);
  }

  SetLogo(src){
    this.$logo.attr('src', src);
  }

  SetBackgroundImage(src){
    this.$background.css({
      backgroundColor: 'black',
      backgroundImage: `url(${src})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover'
    });
  }

  SetMessage(msg){
    this.$message.html(msg);
    //this.$loading_container.css('left', '50%').css('left', '-='+this.$message.width()/2+'px');
  }

  Show(msg = null){
    if(msg != null)
      this.$message.html(msg);

    this.$loader.stop(true, true).fadeIn('slow');
    //this.$loading_container.css('left', '50%').css('left', '-='+this.$message.width()/2+'px');
  }

  Hide(){
    this.$loader.fadeOut('slow');
  }

  Dismiss(){
    this.$loader.fadeOut('slow');
  }

}

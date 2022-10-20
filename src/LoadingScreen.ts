/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LoadingScren class. This is used in KotOR Forge
 */

export class LoadingScreen {
  static main: LoadingScreen;
  message: string;

  loader: HTMLElement;
  background: HTMLElement;
  logo_wrapper: HTMLElement;
  logo: HTMLImageElement;
  loading_container: HTMLElement;
  messageElement: HTMLElement;

  constructor(parent?: HTMLElement, isGlobal: boolean = true){
    // this.message = 'Loading...';
    // this.loader = document.createElement('div');
    // this.loader.id = (isGlobal? 'id="loader"' : '');
    // this.loader.classList.add('loading-screen', 'se-pre-con')
    // this.loader.innerHTML = '<div class="background"></div>'+
    //   '<div class="logo-wrapper"><img src="" /></div>'+
    //   '<div class="loading-container">'+
    //     '<div class="ball"></div>'+
    //     '<div class="ball1"></div>'+
    //     '<div id="loading-message" class="loading-message">'+this.message+'</div>'+
    //   '</div>';

    // this.background = this.loader.querySelector('div.background');
    // this.logo_wrapper = this.loader.querySelector('div.logo-wrapper');
    // this.logo = this.logo_wrapper.querySelector('img');
    // this.loading_container = this.loader.querySelector('div.loading-container');
    // this.messageElement = this.loading_container.querySelector('.loading-message');

    // if(typeof parent === 'undefined'){
    //   parent = document.body;
    // }

    // if(!isGlobal){
    //   this.loader.style.position = 'absolute';
    // }

    // //console.log(parent);
    // parent.append(this.loader);
  }

  SetLogo(src: string){
    this.logo.src = src;
  }

  SetBackgroundImage(src?: string){
    this.background.style.backgroundColor = 'black';
    this.background.style.backgroundImage = `url({src})`;
    this.background.style.backgroundPosition = 'center';
    this.background.style.backgroundSize = 'cover';
  }

  SetMessage(msg: string = ''){
    this.message = msg;
    this.messageElement.innerHTML = this.message;
    //this.loading_container.css('left', '50%').css('left', '-='+this.message.width()/2+'px');
  }

  Show(msg?: string){
    this.SetMessage(msg);
    this.loader.style.display = 'block';
    // this.loader.stop(true, true).fadeIn('slow');
    //this.loading_container.css('left', '50%').css('left', '-='+this.message.width()/2+'px');
  }

  Hide(){
    this.loader.style.display = 'none';
    // this.loader.fadeOut('slow');
  }

  Dismiss(){
    this.loader.style.display = 'none';
    // this.loader.fadeOut('slow');
  }

}

LoadingScreen.main = new LoadingScreen();

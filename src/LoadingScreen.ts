/**
 * LoadingScreen class.
 * 
 * The LoadingScren class. This is used in KotOR Forge
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LoadingScreen.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LoadingScreen {
  static main: LoadingScreen;
  message: string;

  parent: HTMLElement;
  loader: HTMLElement;
  background: HTMLElement;
  logo_wrapper: HTMLElement;
  logo: HTMLImageElement;
  loading_container: HTMLElement;
  messageElement: HTMLElement;

  fadeOutTimeout: any;

  constructor(parent?: HTMLElement, isGlobal: boolean = true){
    this.message = 'Loading...';
    this.loader = document.createElement('div');
    this.loader.id = (isGlobal? 'loader' : '');
    this.loader.classList.add('loading-screen', 'se-pre-con')
    this.loader.innerHTML = '<div class="background"></div>'+
      '<div class="logo-wrapper"><img src="" /></div>'+
      '<div class="loading-container">'+
        '<div class="spinner-wrapper">'+
          '<div class="ball"></div>'+
          '<div class="ball1"></div>'+
        '</div>'+
        '<div id="loading-message" class="loading-message">'+this.message+'</div>'+
      '</div>';

    this.background = this.loader.querySelector('div.background');
    this.logo_wrapper = this.loader.querySelector('div.logo-wrapper');
    this.logo = this.logo_wrapper.querySelector('img');
    this.loading_container = this.loader.querySelector('div.loading-container');
    this.messageElement = this.loading_container.querySelector('.loading-message');

    if(typeof parent === 'undefined'){
      parent = document.body;
    }

    if(!isGlobal){
      this.loader.style.position = 'absolute';
    }
    this.parent = parent;
  }

  SetLogo(src: string){
    this.logo.src = src;
  }

  SetBackgroundImage(src?: string){
    this.background.style.backgroundColor = 'black';
    this.background.style.backgroundImage = `url(${src})`;
    this.background.style.backgroundPosition = 'center';
    this.background.style.backgroundSize = 'cover';
  }

  SetMessage(msg: string = ''){
    this.message = msg;
    this.messageElement.innerHTML = this.message;
    //this.loading_container.css('left', '50%').css('left', '-='+this.message.width()/2+'px');
  }

  Show(msg?: string){
    if(!this.parent){
      return;
    }
    if(!this.loader.parentNode){
      this.parent.append(this.loader);
    }

    clearTimeout(this.fadeOutTimeout);
    this.SetMessage(msg);
    this.loader.style.display = 'block';
    this.loader.classList.remove('fade-in');
    this.loader.classList.remove('fade-out');
    this.loader.classList.add('fade-in');
    // this.loader.stop(true, true).fadeIn('slow');
    //this.loading_container.css('left', '50%').css('left', '-='+this.message.width()/2+'px');
  }

  Hide(){
    clearTimeout(this.fadeOutTimeout);
    // this.loader.style.display = 'none';
    this.loader.classList.remove('fade-in');
    this.loader.classList.remove('fade-out');
    this.loader.classList.add('fade-out');

    this.fadeOutTimeout = setTimeout( () => {
      this.loader.style.display = 'none';
    }, 1000);
  }

  Dismiss(){
    this.Hide();
  }

}

LoadingScreen.main = new LoadingScreen();

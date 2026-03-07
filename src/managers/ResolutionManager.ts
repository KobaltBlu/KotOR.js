import { IScreenResolution } from "../interface/graphics/IScreenResolution";

/**
 * ResolutionManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ResolutionManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ResolutionManager {

  public static vpScaleFactor: number = 1;
  public static hpScaleFactor: number = 1;

  public static windowResolution: {width: number; height: number;} = {
    width: 0,
    height: 0
  };

  private static resolutionsGenerated: boolean = false;
  static #_screenResolution: IScreenResolution = {
    label: 'Auto Resolution',
    width: 1,
    height: 1,
    ratio: 1.33,
    isDynamicRes: true,
    getName: function(){ return this.label }
  };
  static availableResolutions: IScreenResolution[] = [];

  public static get screenResolution(): IScreenResolution {
    return this.#_screenResolution;
  };

  public static set screenResolution(res: IScreenResolution) {
    const isChanging = this.#_screenResolution != res;
    const oldRes = this.#_screenResolution;
    this.#_screenResolution = res;
    if(isChanging){
      this.processEventListener('onChange', res, oldRes);
    }
  };


  static #eventListeners: {[key: string]: Function[]} = {
    'onChange': [],
    'onResize': []
  };

  static addEventListener(key: string, func: Function){
    const el = this.#eventListeners[key];
    if(Array.isArray(el)){
      const canPush = el.indexOf(func) == -1;
      if(canPush){
        el.push(func);
      }
    }
  }

  static removeEventListener(key: string, func: Function){
    const el = this.#eventListeners[key];
    if(Array.isArray(el)){
      const idx = el.indexOf(func);
      const removeAll = typeof func === 'undefined';
      if(removeAll){
        this.#eventListeners[key] = [];
      }else if(idx >= 0){
        el.splice(idx, 1);
      }
    }
  }

  static processEventListener(key: string, ...args: any[]){
    const el = this.#eventListeners[key];
    if(Array.isArray(el)){
      for(let i = 0, len = el.length; i < len; i++){
        el[i](...args);
      }
    }
  }

  static getViewportWidth(): number {
    return this.screenResolution.isDynamicRes ? window.innerWidth : this.screenResolution.width;
  }

  static getViewportHeight(): number {
    return this.screenResolution.isDynamicRes ? window.innerHeight : this.screenResolution.height;
  }

  static getViewportWidthScaled(): number {
    return this.screenResolution.isDynamicRes ? window.innerWidth : this.screenResolution.width * this.vpScaleFactor;
  }

  static getViewportHeightScaled(): number {
    return this.screenResolution.isDynamicRes ? window.innerHeight : this.screenResolution.height * this.hpScaleFactor;
  }

  static getWindowWidth(): number {
    return this.windowResolution.width;
  }

  static getWindowHeight(): number {
    return this.windowResolution.height;
  }

  static recalculate(): void {
    const scaleX = window.innerWidth / this.getViewportWidth();
    const scaleY = window.innerHeight / this.getViewportHeight();

    const xExceeds = (this.getViewportWidth() * scaleX) > window.innerWidth;
    const yExceeds = (this.getViewportHeight() * scaleY) > window.innerHeight;

    this.vpScaleFactor = 1.0;
    this.hpScaleFactor = 1.0;

    if(!this.screenResolution.isDynamicRes){
      this.vpScaleFactor = scaleY;
      this.hpScaleFactor = scaleX;
      // if(!xExceeds && !yExceeds){
      //   this.vpScaleFactor = scaleY;
      // }else if(!yExceeds){
      //   this.vpScaleFactor = scaleY;
      // }else if(!xExceeds){
      //   this.vpScaleFactor = scaleX;
      // }
    }
  }

  static getSupportedResolutions(){
    if(!this.resolutionsGenerated){
      this.availableResolutions.push({
        label: 'Auto Resolution',
        width: 1,
        height: 1,
        ratio: 1,
        isDynamicRes: true,
        getName: function(){ return this.label }
      });

      //4:3
      this.availableResolutions.push({
        label: '640 x 480 (4:3)',
        width: 640,
        height: 480,
        ratio: 1.33,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '800 x 600 (4:3)',
        width: 800,
        height: 600,
        ratio: 1.33,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '960 x 720 (4:3)',
        width: 960,
        height: 720,
        ratio: 1.33,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '1024 x 768 (4:3)',
        width: 1024,
        height: 768,
        ratio: 1.33,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '1280 x 1024 (4:3)',
        width: 1280,
        height: 1024,
        ratio: 1.33,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '1600 x 1200 (4:3)',
        width: 1600,
        height: 1200,
        ratio: 1.33,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      //16:9
      this.availableResolutions.push({
        label: '1280 x 720 (16:9)',
        width: 1280,
        height: 720,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '1600 x 900 (16:9)',
        width: 1600,
        height: 900,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '1920 x 1080 (16:9)',
        width: 1920,
        height: 1080,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '2048 x 1152 (16:9)',
        width: 2048,
        height: 1152,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '2880 x 1620 (16:9)',
        width: 2880,
        height: 1620,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '3072 x 1728 (16:9)',
        width: 3072,
        height: 1728,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '3840 x 2160 (16:9)',
        width: 3840,
        height: 2160,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '4096 x 2304 (16:9)',
        width: 4096,
        height: 2304,
        ratio: 1.78,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });

      this.availableResolutions.push({
        label: '3440 x 1440 (Ultra-wide)',
        width: 3440,
        height: 1440,
        ratio: 2.39,
        isDynamicRes: false,
        getName: function(){ return this.label }
      });
      this.resolutionsGenerated = true;
    }

    return this.availableResolutions;

  }

}

window.addEventListener('resize', () => {
  ResolutionManager.windowResolution.width = window.innerWidth;
  ResolutionManager.windowResolution.height = window.innerHeight;
  ResolutionManager.recalculate();
});

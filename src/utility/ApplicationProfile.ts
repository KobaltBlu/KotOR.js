import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { ApplicationMode } from "../enums/ApplicationMode";
import * as path from "path";

export class ApplicationProfile {

  static MODE: ApplicationMode = ApplicationMode.GAME;
  static ENV: ApplicationEnvironment = ApplicationEnvironment.BROWSER;
  static directory: string;
  static key: string;
  static launch: any;
  static path_sep: string = '/';

  static InitEnvironment(){
    if(window.location.origin === 'file://'){
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      if(window.navigator.platform.toLocaleLowerCase() == 'win32'){
        ApplicationProfile.path_sep = '\\';
      }else{
        ApplicationProfile.path_sep = '/';
      }
    }else{
      ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
      if(window.navigator.platform.toLocaleLowerCase() == 'win32'){
        ApplicationProfile.path_sep = '/';
      }else{
        ApplicationProfile.path_sep = '/';
      }
    }
  }

}
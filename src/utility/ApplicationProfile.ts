import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { ApplicationMode } from "../enums/ApplicationMode";
import { GameEngineType } from "../enums/engine/GameEngineType";

export class ApplicationProfile {

  static MODE: ApplicationMode = ApplicationMode.GAME;
  static ENV: ApplicationEnvironment = ApplicationEnvironment.BROWSER;
  static directory: string;
  static directoryHandle: FileSystemDirectoryHandle;
  static key: string;
  static launch: any;
  static path_sep: string = '/';
  static GameKey: GameEngineType = GameEngineType.KOTOR;
  static profile: any = {};
  static isMac: boolean = false;

  static InitEnvironment(profile: any){
    if(typeof profile === 'object'){
      ApplicationProfile.profile = profile;
    }
    if(window.location.origin === 'file://'){
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      if(window.navigator.platform.toLocaleLowerCase() == 'win32'){
        ApplicationProfile.path_sep = '/';
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

    if(ApplicationProfile.profile){
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        ApplicationProfile.directory = ApplicationProfile.profile.directory;
      }else{
        ApplicationProfile.directoryHandle = ApplicationProfile.profile.directory_handle;
      }
    }
  }

}
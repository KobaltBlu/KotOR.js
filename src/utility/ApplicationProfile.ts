import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { ApplicationMode } from "@/enums/ApplicationMode";
import { GameEngineType } from "@/enums/engine";
import { OSInfo } from "@/utility/OSInfo";

/**
 * ApplicationProfile class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ApplicationProfile.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ApplicationProfile {

  static MODE: ApplicationMode = ApplicationMode.GAME;
  static ENV: ApplicationEnvironment = ApplicationEnvironment.BROWSER;
  static directory: string;
  static directoryHandle: FileSystemDirectoryHandle;
  static key: string;
  static launch: (() => void) | undefined;
  static path_sep: string = '/';
  static GameKey: GameEngineType = GameEngineType.KOTOR;
  static profile: Record<string, unknown> = {};
  static isMac: boolean = false;

  static InitEnvironment(profile: Record<string, unknown>): void {
    if(typeof profile === 'object'){
      ApplicationProfile.profile = profile;
    }
    if(window.location.origin === 'file://'){
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      if(OSInfo.isWindows()){
        ApplicationProfile.path_sep = '/';
      }else{
        ApplicationProfile.path_sep = '/';
      }
    }else{
      ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
      if(OSInfo.isWindows()){
        ApplicationProfile.path_sep = '/';
      }else{
        ApplicationProfile.path_sep = '/';
      }
    }

    if (ApplicationProfile.profile && Object.keys(ApplicationProfile.profile).length > 0) {
      if (ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON) {
        ApplicationProfile.directory = ApplicationProfile.profile.directory as string;
      } else {
        ApplicationProfile.directoryHandle = ApplicationProfile.profile.directory_handle as FileSystemDirectoryHandle;
      }
    }
  }

}
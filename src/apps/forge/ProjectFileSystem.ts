import * as KotOR from "./KotOR";
import { ForgeState } from "./states/ForgeState";
import { TabProjectExplorerState } from "./states/tabs/TabProjectExplorerState";

export class ProjectFileSystem extends KotOR.GameFileSystem {

  static rootDirectoryHandle: FileSystemDirectoryHandle;
  static rootDirectoryPath: string;

  static initializeProjectExplorer() {
    return new Promise<void>( (resolve, reject) => {
      TabProjectExplorerState.GenerateResourceList( ForgeState.projectExplorerTab ).then( (resourceList) => {
        KotOR.LoadingScreen.main.Hide();
        setTimeout( () => {
          KotOR.LoadingScreen.main.loader.style.display = 'none';
          resolve();
        }, 500);
      });
    });
  }

}

import { EditorFile } from "./EditorFile";
import * as KotOR from "./KotOR";
import { EditorFileProtocol } from "./enum/EditorFileProtocol";
import { ForgeState } from "./states/ForgeState";
import { TabProjectExplorerState } from "./states/tabs";

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

  static async openEditorFile(resource: string): Promise<EditorFile> {
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      return new EditorFile({
        path: `${EditorFileProtocol.FILE}//project.dir/${resource}`,
        useProjectFileSystem: true,
      });
    }else{
      const handle = await this.open(resource, "w") as FileSystemFileHandle;
      return new EditorFile({
        handle: handle,
        useProjectFileSystem: true,
      });
    }
  }

}

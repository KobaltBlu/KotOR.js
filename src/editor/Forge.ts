import { LoadingScreen } from "../LoadingScreen";
import { ConfigClient } from "../utility/ConfigClient";
import { EditorFile } from "./EditorFile";
import { EditorTabManager } from "./EditorTabManager";
import { InlineAudioPlayer } from "./InlineAudioPlayer";
import { GameMap } from "./interface/GameMap";
import { Project } from "./Project";
import { ProjectExplorerTab, ResourceExplorerTab } from "./tabs";
import { MenuTop } from "./ui/MenuTop";

export class Forge {
  static MenuTop: MenuTop = new MenuTop()
  static Project: Project;
  static loader: LoadingScreen;// = new LoadingScreen();
  static tabManager: EditorTabManager;
  static projectExplorerTab: ProjectExplorerTab;
  static resourceExplorerTab: ResourceExplorerTab;
  static inlineAudioPlayer: InlineAudioPlayer;
  static GameMaps: GameMap[] = [];

  static getRecentProjects(): string[] {
    if(Array.isArray(ConfigClient.options.recent_projects)){
      // ConfigClient.options.recent_projects = ConfigClient.options.recent_projects.map( (file: any) => {
      //   return Object.assign(new EditorFile(), file);
      // });
    }else{
      ConfigClient.options.recent_projects = [];
    }
    return ConfigClient.options.recent_projects;
  }

  static getRecentFiles(): EditorFile[] {
    if(Array.isArray(ConfigClient.options.recent_files)){
      ConfigClient.options.recent_files = ConfigClient.options.recent_files.map( (file: any) => {
        return Object.assign(new EditorFile(), file);
      });
    }else{
      ConfigClient.options.recent_files = [];
    }
    return ConfigClient.options.recent_files;
  }
}

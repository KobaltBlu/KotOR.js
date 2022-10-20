import { LoadingScreen } from "../LoadingScreen";
import { EditorTabManager } from "./EditorTabManager";
import { InlineAudioPlayer } from "./InlineAudioPlayer";
import { GameMap } from "./interface/GameMap";
import { Project } from "./Project";
import { ProjectExplorerTab } from "./tabs/ProjectExplorerTab";
import { ResourceExplorerTab } from "./tabs/ResourceExplorerTab";

export class Forge {
  static Project: Project;
  static loader: LoadingScreen;// = new LoadingScreen();
  static tabManager: EditorTabManager;
  static projectExplorerTab: ProjectExplorerTab;
  static resourceExplorerTab: ResourceExplorerTab;
  static inlineAudioPlayer: InlineAudioPlayer;
  static GameMaps: GameMap[] = [];
}
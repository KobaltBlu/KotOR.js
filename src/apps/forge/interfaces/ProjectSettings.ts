import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { GameEngineType } from "@/enums/engine/GameEngineType";

type OpenFilesList = string[];

interface ModuleEditorSettings {
  open: boolean;
}

export interface ProjectSettings {
  name: string;
  game: GameEngineType;
  type: ProjectType;
  module_editor: ModuleEditorSettings;
  open_files: OpenFilesList;
}
import { ProjectType } from "../enum/ProjectType";

import { GameEngineType } from "../../../enums/engine/GameEngineType";

interface OpenFilesList extends Array<string> { }

interface ModuleEditorSettings {
  open: boolean;
}

export interface ProjectSettings {
  name: string;
  game: GameEngineType;
  type: ProjectType;
  module_editor: ModuleEditorSettings,
  open_files: OpenFilesList,
}
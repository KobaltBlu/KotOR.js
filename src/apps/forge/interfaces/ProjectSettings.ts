import { GameEngineType } from "../../../enums/engine/GameEngineType";
import { ProjectType } from "../enum/ProjectType";

export interface ProjectSettings {
  name: string;
  game: GameEngineType;
  type: ProjectType;
  module_editor: {
    open: false
  },
  open_files: [],
}
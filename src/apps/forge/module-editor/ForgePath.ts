import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import * as KotOR from "@/apps/forge/KotOR";

/**
 * Lightweight path placeholder for module scene / future GIT path markers.
 * Deep path editing remains in TabPTHEditorState (.pth).
 */
export class ForgePath extends ForgeGameObject {
  pathId: string = '';

  constructor(pathId?: string){
    super();
    if(pathId){
      this.pathId = pathId;
    }
  }

  async load(){
    // No mesh yet — module editor opens area .pth via forge.module.openAreaPth
  }

  getEditorName(): string {
    return this.pathId || 'Path';
  }
}

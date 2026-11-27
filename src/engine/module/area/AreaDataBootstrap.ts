import type { Area } from "@engine/module/Area";
import { AreaAreBootstrap } from "@engine/module/area/AreaAreBootstrap";
import { AreaGitDeserializer } from "@engine/module/area/AreaGitDeserializer";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";
import { AreaResourceBootstrap } from "@engine/module/area/AreaResourceBootstrap";

/**
 * Orchestrates Area data attachment: ARE → GIT → VIS/LYT/scripts.
 * Scene realization is AreaSceneBootstrap (via Area.loadScene).
 */
export class AreaDataBootstrap {
  static async load(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): Promise<void> {
    //BEGIN AREA LOAD
    AreaAreBootstrap.hydrate(area, context);
    AreaGitDeserializer.deserialize(area, context);
    await AreaResourceBootstrap.bootstrap(area, context);
  }
}

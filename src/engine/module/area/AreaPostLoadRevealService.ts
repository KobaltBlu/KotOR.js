import type { Area } from "@engine/module/Area";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { GameLoop } from "@engine/runtime/GameLoop";
import {
  getDefaultAreaLoadContext,
  type AreaLoadContext,
} from "@engine/module/area/AreaLoadContext";

/**
 * Pre-reveal camera / VIS settle so the first playable world frame matches
 * the chase pose before the load UI hides.
 */
export class AreaPostLoadRevealService {
  /**
   * Snap chase camera + apply room VIS/frustum before the load UI hides so the
   * first renderable world frame matches the settled chase pose (no neighbor pop-in).
   */
  static prime(
    area: Area,
    context: AreaLoadContext = getDefaultAreaLoadContext(),
  ): void {
    const player = context.getPartyManager().getCurrentPlayer();
    if(player && !player.room){
      player.getCurrentRoom();
    }
    area.lastRoom = undefined;
    FollowerCamera.snapToChasePosition();
    GameLoop.updateViewportFrustum();
    area.updateRoomVisibility(0);
    area.applyRoomRenderFrustumCull();
    area.syncObjectModelVisibility();
  }
}

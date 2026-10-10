import * as THREE from "three";
import { asExtentInt, truncDiv } from "@engine/gui";
import type { GUIButton } from "@engine/gui";
import type { GameObject } from "@engine/module/GameObject";
import { isCreature } from "@engine/module/guards/isCreature";
import { setClientCombatMode } from "@engine/combat/combat-engagement";
import type { Creature } from "@engine/module/Creature";

/** PositionMenu / UpdateIndicator edge inset (0x20). */
export const TARGET_MENU_EDGE = 0x20;

/** Screen-space menu anchor from GetMenuPoint / object vtable. */
export type TargetMenuPoint = {
  x: number;
  y: number;
  /** 1 = in front of camera, 2 = behind / off-axis (edge treatment). */
  status: 0 | 1 | 2;
};

/** Full-viewport clamp for floating target menu (KotOR.js dock+scale). */
export type TargetMenuBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Optional scratch / out vectors so callers can reuse buffers. */
export type MenuPointScratch = {
  world: THREE.Vector3;
  ndc: THREE.Vector3;
  camForward: THREE.Vector3;
  reticlePosition?: THREE.Vector3;
  reticleScreenPosition?: THREE.Vector3;
};

const defaultScratch = (): MenuPointScratch => ({
  world: new THREE.Vector3(),
  ndc: new THREE.Vector3(),
  camForward: new THREE.Vector3(),
});

/**
 * Full viewport clamp for floating target menu.
 * Diverges from MainInterface ctor (ARROW_MARGIN / MENUBG / PAUSE gutters):
 * single mipc28x6 + dock/scale needs the whole ResolutionManager viewport.
 */
export function getTargetMenuBounds(vpW: number, vpH: number): TargetMenuBounds {
  return {
    left: 0,
    top: 0,
    width: asExtentInt(vpW),
    height: asExtentInt(vpH),
  };
}

/**
 * Project a world point to screen-space menu coordinates.
 * Does not call camera.getWorldDirection — that desyncs matrixWorld mid-frame.
 */
export function projectWorldToMenuPoint(
  world: THREE.Vector3,
  camera: THREE.Camera,
  vpW: number,
  vpH: number,
  scratch: MenuPointScratch = defaultScratch(),
): TargetMenuPoint {
  scratch.reticlePosition?.copy(world);

  scratch.camForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const toPointX = world.x - camera.position.x;
  const toPointY = world.y - camera.position.y;
  const toPointZ = world.z - camera.position.z;
  const inFront =
    toPointX * scratch.camForward.x +
      toPointY * scratch.camForward.y +
      toPointZ * scratch.camForward.z >
    0;
  const status: 1 | 2 = inFront ? 1 : 2;

  scratch.ndc.copy(world).project(camera);
  const x = (scratch.ndc.x * 0.5 + 0.5) * vpW;
  const y = (-scratch.ndc.y * 0.5 + 0.5) * vpH;
  scratch.reticleScreenPosition?.set(x, y, 0);
  return { x, y, status };
}

/** Resolve GetMenuPoint world position for a selected object into scratch.world. */
export function resolveTargetMenuWorld(
  selectedObject: GameObject,
  scratch: MenuPointScratch,
): void {
  if (isCreature(selectedObject)) {
    scratch.world.copy(selectedObject.position);
    const tag = (selectedObject.tag || "").toLowerCase();
    scratch.world.z += tag === "zaalbar" || tag === "hk47" ? 2.0 : 1.75;
  } else {
    const node = selectedObject.getReticleNode?.();
    if (node) {
      node.getWorldPosition(scratch.world);
    } else {
      scratch.world.copy(selectedObject.position);
    }
  }
}

/** Resolve GetReticlePoint world position into scratch.world. */
export function resolveReticleWorld(
  selectedObject: GameObject,
  scratch: MenuPointScratch,
): void {
  const node = selectedObject.getReticleNode?.();
  if (node) {
    node.getWorldPosition(scratch.world);
  } else {
    scratch.world.copy(selectedObject.position);
    scratch.world.z += 1;
  }
}

/**
 * GetMenuPoint / object vtable.
 * Returns top-left screen pixels and visibility status (1 front, 2 behind).
 */
export function getTargetMenuPoint(
  selectedObject: GameObject | undefined,
  camera: THREE.Camera | undefined,
  vpW: number,
  vpH: number,
  scratch: MenuPointScratch = defaultScratch(),
): TargetMenuPoint {
  if (!camera || !selectedObject) {
    return { x: truncDiv(vpW, 2), y: truncDiv(vpH, 2), status: 0 };
  }
  resolveTargetMenuWorld(selectedObject, scratch);
  return projectWorldToMenuPoint(scratch.world, camera, vpW, vpH, scratch);
}

/**
 * GetReticlePoint screen projection for UpdateIndicator edge arrow.
 */
export function getReticleScreenPoint(
  selectedObject: GameObject | undefined,
  camera: THREE.Camera | undefined,
  vpW: number,
  vpH: number,
  scratch: MenuPointScratch = defaultScratch(),
): TargetMenuPoint {
  if (!camera || !selectedObject) {
    return { x: truncDiv(vpW, 2), y: truncDiv(vpH, 2), status: 0 };
  }
  resolveReticleWorld(selectedObject, scratch);
  return projectWorldToMenuPoint(scratch.world, camera, vpW, vpH, scratch);
}

/**
 * PositionMenu.
 * Positions the floating target menu viewport origin (top-left screen pixels).
 */
export function positionTargetMenu(
  point: TargetMenuPoint,
  menuWidth: number,
  menuHeight: number,
  vpW: number,
  vpH: number,
  edge: number = TARGET_MENU_EDGE,
): { x: number; y: number } {
  const bounds = getTargetMenuBounds(vpW, vpH);
  const halfW = truncDiv(menuWidth, 2);
  let menuX = 0;
  let menuY = 0;
  const screenX = point.x;
  const screenY = point.y;
  const sx = asExtentInt(screenX);
  const sy = asExtentInt(screenY);
  const vpWi = asExtentInt(vpW);
  const vpHi = asExtentInt(vpH);

  if (point.status === 2) {
    menuX =
      screenX <= vpWi / 2 ? bounds.left : bounds.left + bounds.width - menuWidth;

    if (screenY < bounds.top + edge) {
      menuY = bounds.top + bounds.height - menuHeight - edge;
    } else if (screenY > bounds.top + bounds.height - edge) {
      menuY = bounds.top;
    } else if (screenY < vpHi / 2) {
      menuY = vpHi - asExtentInt(menuHeight + screenY + edge);
    } else {
      menuY = sy - menuHeight - edge;
    }
  } else {
    if (screenX - halfW < bounds.left) {
      menuX = bounds.left;
      if (screenY < bounds.top + edge) {
        menuY = bounds.top;
      } else if (screenY > bounds.top + bounds.height - edge) {
        menuY = bounds.top + bounds.height - menuHeight - edge;
      } else {
        menuY = sy - menuHeight - edge;
      }
    } else if (screenX + halfW > bounds.left + bounds.width) {
      menuX = bounds.left + bounds.width - menuWidth;
      if (screenY < bounds.top + edge) {
        menuY = bounds.top;
      } else if (screenY > bounds.top + bounds.height - edge) {
        menuY = bounds.top + bounds.height - menuHeight - edge;
      } else {
        menuY = sy - menuHeight - edge;
      }
    } else {
      menuX = sx - halfW;
      if (screenY < bounds.top + edge) {
        menuY = bounds.top;
      } else if (screenY > bounds.top + bounds.height - edge) {
        menuY = bounds.top + bounds.height - menuHeight - edge;
      } else {
        menuY = sy - menuHeight - edge;
      }
    }
  }

  const maxX = bounds.left + bounds.width - menuWidth;
  const maxY = bounds.top + bounds.height - menuHeight;
  menuX = Math.min(Math.max(menuX, bounds.left), maxX);
  menuY = Math.min(Math.max(menuY, bounds.top), maxY);
  return { x: menuX, y: menuY };
}

/**
 * ClearAllActions path: SetCombatMode(0) → ClearAllActions(1) + round clear.
 */
export function clearAllCombatActions(oPC: Creature | undefined): void {
  if (!oPC) return;
  setClientCombatMode(oPC, false);
  oPC.clearAllActions(true);
  oPC.combatRound?.clearActions?.();
}

/**
 * ClearOneAction path: remove last scheduled action, else ClearAllActions(1).
 */
export function clearOneCombatAction(oPC: Creature | undefined): void {
  if (!oPC?.combatRound) return;
  if (!oPC.combatRound.removeLastAction()) {
    oPC.clearAllActions(true);
  }
}

export function clearActionIcon(guiControl: GUIButton | undefined): void {
  guiControl?.clearFillTexture();
}

export function applyActionIconEnabled(
  guiControl: GUIButton | undefined,
  enabled: boolean,
): void {
  if (!guiControl) return;
  const alpha = enabled ? 1.0 : 0.25;
  try {
    guiControl.setChromeOpacity(alpha);
  } catch (_e) {
    /* chrome may be unavailable during teardown */
  }
  guiControl.disableSelection = !enabled;
}

import * as THREE from "three";
import type { ModuleCreature } from "@/module";
import { spawnWorldImpactVfx } from "@/combat/ranged-impact-vfx";

/**
 * Retail ShowLightSaberContactVisual
 * Contact anim event → fire-and-forget VFX 0xFAB at LightSaberHook.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file lightsaber-contact-vfx.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** VFX row for saber blade contact sparks — ApplyFireAndForgetVisualEffect(0xFAB). */
export const VFX_COM_LIGHTSABER_CONTACT = 0xfab; // 4011

const _hookWorldPos = new THREE.Vector3();

/**
 * Spawn the Contact spark at the creature's LightSaberHook (fallback: creature origin).
 */
export function showLightSaberContactVisual(creature: ModuleCreature): void {
  if(!creature) return;

  const hook = creature.model?.lightsaberhook;
  if(hook){
    hook.getWorldPosition(_hookWorldPos);
  }else{
    _hookWorldPos.set(creature.position.x, creature.position.y, creature.position.z);
  }

  spawnWorldImpactVfx(VFX_COM_LIGHTSABER_CONTACT, _hookWorldPos, creature.context);
}

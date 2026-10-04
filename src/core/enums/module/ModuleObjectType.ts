/**
 * ModuleObjectType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleObjectType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ModuleObjectType {
  ModuleObject        = (1 << 0),
  ModuleArea          = (1 << 1),
  ModuleAreaOfEffect  = (1 << 2),
  ModuleCreature      = (1 << 3),
  ModuleDoor          = (1 << 4),
  ModuleEncounter     = (1 << 5),
  ModuleItem          = (1 << 6),
  ModuleMGEnemy       = (1 << 7),
  ModuleMGGunBank     = (1 << 8),
  ModuleMGGunBullet   = (1 << 9),
  ModuleMGObstacle    = (1 << 10),
  ModuleMGPlayer      = (1 << 11),
  ModuleMGTrack       = (1 << 12),
  ModulePlaceable     = (1 << 13),
  ModulePlayer        = (1 << 14),
  ModuleSound         = (1 << 15),
  ModuleStore         = (1 << 16),
  ModuleTrigger       = (1 << 17),
  ModuleWaypoint      = (1 << 18),
  ModuleRoom          = (1 << 19),
  ModuleCamera        = (1 << 20),
}
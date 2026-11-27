/**
 * GameObjectType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameObjectType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum GameObjectType {
  GameObject        = (1 << 0),
  Area          = (1 << 1),
  AreaEffect  = (1 << 2),
  Creature      = (1 << 3),
  Door          = (1 << 4),
  Encounter     = (1 << 5),
  Item          = (1 << 6),
  MiniGameEnemy       = (1 << 7),
  MiniGameGunBank     = (1 << 8),
  MiniGameGunBullet   = (1 << 9),
  MiniGameObstacle    = (1 << 10),
  MiniGamePlayer      = (1 << 11),
  MiniGameTrack       = (1 << 12),
  Placeable     = (1 << 13),
  PlayerCharacter        = (1 << 14),
  Sound         = (1 << 15),
  Store         = (1 << 16),
  Trigger       = (1 << 17),
  Waypoint      = (1 << 18),
  AreaRoom          = (1 << 19),
  AreaCamera        = (1 << 20),
}
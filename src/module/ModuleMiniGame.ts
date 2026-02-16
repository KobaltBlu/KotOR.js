import { MiniGameType } from "@/enums/engine/MiniGameType";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { GameState } from "@/GameState";
import { ModuleMGEnemy } from "@/module/ModuleMGEnemy";
import type { ModuleMGObstacle } from "@/module/ModuleMGObstacle";
import type { ModuleMGPlayer } from "@/module/ModuleMGPlayer";


const log = createScopedLogger(LogScope.Module);
import type { ModuleMGTrack } from "@/module/ModuleMGTrack";
import type { ModuleObject } from "@/module/ModuleObject";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { createScopedLogger, LogScope } from "@/utility/Logger";

/**
* ModuleMiniGame class.
*
* Class representing the minigame instance in a minigame module.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file ModuleMiniGame.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMiniGame {
  type: MiniGameType;

  /** Bump plane. */
  bumpPlane: number = 0;
  /** Camera FOV in degrees (default 65). */
  cameraViewAngle: number = 65;
  /** Depth of field. */
  dof: number = 0;
  /** Do bumping. */
  doBumping: number = 0;
  player: ModuleMGPlayer | undefined;

  /** Far clip plane (default 100). */
  farClip: number = 100;
  /** Lateral acceleration. */
  lateralAccel: number = 0;
  /** Movement per second. */
  movementPerSec: number = 0;
  /** Music resref. */
  music: string = '';
  /** Near clip plane (default 0.1). */
  nearClip: number = 0.1;
  /** Use inertia. */
  useInertia: number = 0;
  /** Enemy count; synced from enemies.length. */
  get enemy_count(): number { return this.enemies.length; }
  /** Obstacle count; synced from obstacles.length. */
  get obstacle_count(): number { return this.obstacles.length; }

  enemies: ModuleMGEnemy[] = [];
  obstacles: ModuleMGObstacle[] = [];
  tracks: ModuleMGTrack[] = [];

  /** Last HP change (for script queries). */
  lastHPChange: number = 0;
  /** Last bullet hit part name. */
  lastBulletHitPart: string = '';
  /** Last bullet hit damage (for script queries). */
  lastBulletHitDamage: number = 0;
  /** Last bullet hit target (object). */
  lastBulletHitTarget: ModuleObject | undefined;
  /** Last bullet shooter (object). */
  lastBulletHitShooter: ModuleObject | undefined;
  /** Last bullet fired damage. */
  lastBulletFiredDamage: number = 0;
  /** Last bullet fired target type. */
  lastBulletFiredTarget: number = 0;
  /** Last animation key event name. */
  lastAnimEvent: string = '';
  /** Last animation key event model name. */
  lastAnimEventModelName: string = '';

  constructor(struct: GFFStruct) {
    if (struct.hasField('Bump_Plane')) this.bumpPlane = struct.getNumberByLabel('Bump_Plane');
    if (struct.hasField('CameraViewAngle')) this.cameraViewAngle = struct.getNumberByLabel('CameraViewAngle');
    if (struct.hasField('DOF')) this.dof = struct.getNumberByLabel('DOF');
    if (struct.hasField('DoBumping')) this.doBumping = struct.getBooleanByLabel('DoBumping');
    if (struct.hasField('Far_Clip')) this.farClip = struct.getNumberByLabel('Far_Clip');
    if (struct.hasField('LateralAccel')) this.lateralAccel = struct.getNumberByLabel('LateralAccel');
    if (struct.hasField('MovementPerSec')) this.movementPerSec = struct.getNumberByLabel('MovementPerSec');
    if (struct.hasField('Music')) this.music = struct.getStringByLabel('Music');
    if (struct.hasField('Near_Clip')) this.nearClip = struct.getNumberByLabel('Near_Clip');
    if (struct.hasField('Type')) this.type = struct.getNumberByLabel('Type');
    if (struct.hasField('UseInertia')) this.useInertia = struct.getBooleanByLabel('UseInertia');

    if (struct.hasField('Player')) {
      const playerStructs = struct.getFieldByLabel('Player').getChildStructs();
      if (playerStructs.length > 0) {
        this.player = new GameState.Module.ModuleArea.ModuleMGPlayer(
          GFFObject.FromStruct(playerStructs[0])
        );
      }
    }
    if (struct.hasField('Enemies')) {
      const enemyList = struct.getFieldByLabel('Enemies').getChildStructs();
      for (let i = 0; i < enemyList.length; i++) {
        this.enemies.push(
          new ModuleMGEnemy(GFFObject.FromStruct(enemyList[i]))
        );
      }
    }
  }

  tick(delta: number = 0) {
    if (this.player) this.player.update(delta);
    for (let i = 0; i < this.enemies.length; i++) this.enemies[i].update(delta);
    for (let i = 0; i < this.obstacles.length; i++) this.obstacles[i].update(delta);
  }

  tickPaused(delta: number = 0) {
    if (this.player) this.player.updatePaused(delta);
    for (let i = 0; i < this.enemies.length; i++) this.enemies[i].updatePaused(delta);
    for (let i = 0; i < this.obstacles.length; i++) this.obstacles[i].updatePaused(delta);
  }

  async load() {
    try { await this.loadMGTracks(); } catch (e) { log.error(e); }
    if (this.player) { try { await this.loadMGPlayer(); } catch (e) { log.error(e); } }
    try { await this.loadMGEnemies(); } catch (e) { log.error(e); }
  }

  initMiniGameObjects() {
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i]) {
        this.enemies[i].onCreate();
      }
    }

    for (let i = 0; i < this.obstacles.length; i++) {
      if (this.obstacles[i]) {
        this.obstacles[i].onCreate();
      }
    }

    this.player.onCreate();
  }

  async loadMGPlayer(): Promise<void> {
    log.info('Loading MG Player')
    const player: ModuleMGPlayer = this.player;
    await player.load();
    await player.loadCamera();
    await player.loadModel();
    await player.loadGunBanks();
    const track = this.tracks.find(o => o.track === player.trackName);
    player.setTrack(track.model);
    player.getCurrentRoom();
  }

  async loadMGTracks(): Promise<void> {
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      await track.load();
      const model = await track.loadModel();
      track.model = model;
      model.userData.moduleObject = track;
      model.userData.index = i;
      //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
      model.hasCollision = true;
      GameState.group.creatures.add(track.model);

      track.computeBoundingBox();
      track.getCurrentRoom();
    }
  }

  async loadMGEnemies(): Promise<void> {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      await enemy.load();
      await enemy.loadModel();
      await enemy.loadGunBanks();
      const track = this.tracks.find(o => o.track === enemy.trackName);
      enemy.setTrack(track.model);
      enemy.computeBoundingBox();
      enemy.getCurrentRoom();
    }
  }

  runMiniGameScripts() {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const onCreate = enemy.scripts[ModuleObjectScript.MGEnemyOnCreate];
      if (!onCreate) { return; }
      onCreate.run(enemy, 0);
    }
  }

}

import { GameState } from "../GameState";
import { MiniGameType } from "../enums/engine/MiniGameType";
import { ModuleObjectScript } from "../enums/module/ModuleObjectScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleMGEnemy } from "./ModuleMGEnemy";
import type { ModuleMGObstacle } from "./ModuleMGObstacle";
import type { ModuleMGPlayer } from "./ModuleMGPlayer";
import type { ModuleMGTrack } from "./ModuleMGTrack";

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

  bumpPlane: number = 0;
  cameraViewAngle: number = 0;
  dof: number = 0;
  doBumping: number = 0;
  player: ModuleMGPlayer;

  farClip: number = 0;
  lateralAccel: number = 0;
  movementPerSec: number = 0;
  music: number = 0;
  nearClip: number = 0;
  useInertia: number = 0;

  enemies: ModuleMGEnemy[] = [];
  obstacles: ModuleMGObstacle[] = [];
  tracks: ModuleMGTrack[] = [];

  constructor(struct: GFFStruct){
    this.bumpPlane = struct.getFieldByLabel('Bump_Plane').getValue();
    this.cameraViewAngle = struct.getFieldByLabel('CameraViewAngle').getValue();
    this.dof = struct.getFieldByLabel('DOF').getValue();
    this.doBumping = struct.getFieldByLabel('DoBumping').getValue();
    this.farClip = struct.getFieldByLabel('Far_Clip').getValue();
    this.lateralAccel = struct.getFieldByLabel('LateralAccel').getValue();
    this.movementPerSec = struct.getFieldByLabel('MovementPerSec').getValue();
    this.music = struct.getFieldByLabel('Music').getValue();
    this.nearClip = struct.getFieldByLabel('Near_Clip').getValue();
    this.type = struct.getFieldByLabel('Type').getValue();
    this.useInertia = struct.getFieldByLabel('UseInertia').getValue();

    this.player = new GameState.Module.ModuleArea.ModuleMGPlayer(
      GFFObject.FromStruct(struct.getFieldByLabel('Player').getChildStructs()[0])
    );

    const enemies = struct.getFieldByLabel('Enemies').getChildStructs();
    for(let i = 0; i < enemies.length; i++){
      this.enemies.push(
        new ModuleMGEnemy(
          GFFObject.FromStruct(enemies[i])
        )
      );
    }
  }

  tick(delta: number = 0){
    this.player.update(delta);

    for(let i = 0; i < this.enemies.length; i++){
      this.enemies[i].update(delta);
    }
    
    for(let i = 0; i < this.obstacles.length; i++){
      this.obstacles[i].update(delta);
    }
  }

  tickPaused(delta: number = 0){
    this.player.updatePaused(delta);
    
    for(let i = 0; i < this.enemies.length; i++){
      this.enemies[i].updatePaused(delta);
    }

    for(let i = 0; i < this.obstacles.length; i++){
      this.obstacles[i].updatePaused(delta);
    }
  }

  async load(){
    try { await this.loadMGTracks(); } catch(e){ console.error(e); }
    try { await this.loadMGPlayer(); } catch(e){ console.error(e); }
    try { await this.loadMGEnemies(); } catch(e){ console.error(e); }
  }

  initMiniGameObjects(){
    for(let i = 0; i < this.enemies.length; i++){
      if(this.enemies[i]){
        this.enemies[i].onCreate();
      }
    }

    for(let i = 0; i < this.obstacles.length; i++){
      if(this.obstacles[i]){
        this.obstacles[i].onCreate();
      }
    }

    this.player.onCreate();
  }

  async loadMGPlayer(): Promise<void> {
    console.log('Loading MG Player')
    const player: ModuleMGPlayer = this.player;
      await player.load();
      await player.loadCamera();
      await player.loadModel();
      await player.loadGunBanks();
      const track = this.tracks.find(o => o.track === player.trackName);
      player.setTrack(track.model);
      player.getCurrentRoom();
  }

  async loadMGTracks(): Promise<void>{
    for(let i = 0; i < this.tracks.length; i++){
      const track = this.tracks[i];
      await track.load();
      const model = await track.loadModel();
      track.model = model;
      model.userData.moduleObject = track;
      model.userData.index = i;
      //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
      model.hasCollision = true;
      GameState.group.creatures.add( track.model );

      track.computeBoundingBox();
      track.getCurrentRoom();
    }
  }

  async loadMGEnemies(): Promise<void> {
    for(let i = 0; i < this.enemies.length; i++){
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

  runMiniGameScripts(){
    for(let i = 0; i < this.enemies.length; i++){
      const enemy = this.enemies[i];
      const onCreate = enemy.scripts[ModuleObjectScript.MGEnemyOnCreate];
      if(!onCreate){ return; }
      onCreate.run(enemy, 0);
    }
  }

}
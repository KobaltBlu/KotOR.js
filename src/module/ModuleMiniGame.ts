import { GameState } from "../GameState";
import { MiniGameType } from "../enums/engine/MiniGameType";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { OdysseyModel3D } from "../three/odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
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

  async loadMGPlayer(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading MG Player')
      let player: ModuleMGPlayer = this.player;
      player.load();
      player.loadCamera( () => {
        player.loadModel( () => {
          player.loadGunBanks( () => {
            let track = this.tracks.find(o => o.track === player.trackName);
            // model.userData.moduleObject = player;
            // model.hasCollision = true;
            player.setTrack(track.model);
  
            player.getCurrentRoom();
            // player.computeBoundingBox();
  
            resolve();
          });
        });
      });
    });
  }

  async loadMGTracks(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      let trackIndex = 0;
      let loop = new AsyncLoop({
        array: this.tracks,
        onLoop: (track: ModuleMGTrack, asyncLoop: AsyncLoop) => {
          track.load( () => {
            track.loadModel( (model: OdysseyModel3D) => {
              track.model = model;
              model.userData.moduleObject = track;
              model.userData.index = trackIndex;
              //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
              model.hasCollision = true;
              GameState.group.creatures.add( track.model );
    
              track.computeBoundingBox();
              track.getCurrentRoom();
              trackIndex++;
              asyncLoop.next();
            });
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async loadMGEnemies(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
    
      let loop = new AsyncLoop({
        array: this.enemies,
        onLoop: (enemy: ModuleMGEnemy, asyncLoop: AsyncLoop) => {
          enemy.load();
          enemy.loadModel( () => {
            enemy.loadGunBanks( () => {
              let track = this.tracks.find(o => o.track === enemy.trackName);
              // model.userData.moduleObject = enemy;
              // model.hasCollision = true;
              enemy.setTrack(track.model);
              enemy.computeBoundingBox();
              enemy.getCurrentRoom();
              asyncLoop.next();

            });
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  runMiniGameScripts(){
    for(let i = 0; i < this.enemies.length; i++){
      const enemy = this.enemies[i];
      if(enemy.scripts.onCreate instanceof NWScriptInstance){
        enemy.scripts.onCreate.run(enemy, 0)
      }
    }
  }

}
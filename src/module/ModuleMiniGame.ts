import { ModuleMGTrack, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModuleObject } from ".";
import { GameState } from "../GameState";
import { MiniGameType } from "../enums/engine/MiniGameType";
import { PartyManager } from "../managers/PartyManager";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { OdysseyModel3D } from "../three/odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";

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
    this.bumpPlane = struct.GetFieldByLabel('Bump_Plane').GetValue();
    this.cameraViewAngle = struct.GetFieldByLabel('CameraViewAngle').GetValue();
    this.dof = struct.GetFieldByLabel('DOF').GetValue();
    this.doBumping = struct.GetFieldByLabel('DoBumping').GetValue();
    this.farClip = struct.GetFieldByLabel('Far_Clip').GetValue();
    this.lateralAccel = struct.GetFieldByLabel('LateralAccel').GetValue();
    this.movementPerSec = struct.GetFieldByLabel('MovementPerSec').GetValue();
    this.music = struct.GetFieldByLabel('Music').GetValue();
    this.nearClip = struct.GetFieldByLabel('Near_Clip').GetValue();
    this.type = struct.GetFieldByLabel('Type').GetValue();
    this.useInertia = struct.GetFieldByLabel('UseInertia').GetValue();

    this.player = new ModuleMGPlayer(
      GFFObject.FromStruct(struct.GetFieldByLabel('Player').GetChildStructs()[0])
    );

    const enemies = struct.GetFieldByLabel('Enemies').GetChildStructs();
    for(let i = 0; i < enemies.length; i++){
      this.enemies.push(
        new ModuleMGEnemy(
          GFFObject.FromStruct(enemies[i])
        )
      );
    }
  }

  tick(delta: number = 0){
    for(let i = 0; i < this.enemies.length; i++){
      this.enemies[i].update(delta);
    }
  }

  tickPaused(delta: number = 0){

  }

  async load(){
    try { await this.loadMGTracks(); } catch(e){ console.error(e); }
    try { await this.loadMGPlayer(); } catch(e){ console.error(e); }
    try { await this.loadMGEnemies(); } catch(e){ console.error(e); }
  }

  initMiniGameObjects(){
    for(let i = 0; i < this.enemies.length; i++){
      if(this.enemies[i] instanceof ModuleObject){
        this.enemies[i].onCreate();
      }
    }

    for(let i = 0; i < this.obstacles.length; i++){
      if(this.obstacles[i] instanceof ModuleObject){
        this.obstacles[i].onCreate();
      }
    }

    this.player.onCreate();
  }

  async loadMGPlayer(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading MG Player')
      let player: ModuleMGPlayer = this.player;
      (player as any).partyID = -1;
      PartyManager.party.push(player as any);
      player.Load( ( object: ModuleMGPlayer ) => {
        
        if(typeof object == 'undefined'){
          // asyncLoop.next();
          return;
        }

        player.LoadCamera( () => {
          player.LoadModel( (model: OdysseyModel3D) => {
            player.LoadGunBanks( () => {
              let track = this.tracks.find(o => o.track === player.trackName);
              model.userData.moduleObject = player;
              model.hasCollision = true;
              player.setTrack(track.model);
    
              player.getCurrentRoom();
              // player.computeBoundingBox();
    
              resolve();
            });
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
          track.Load( () => {
            track.LoadModel( (model: OdysseyModel3D) => {
              track.model = model;
              model.userData.moduleObject = track;
              model.userData.index = trackIndex;
              //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
              model.hasCollision = true;
              GameState.group.creatures.add( track.container );
    
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
          enemy.Load();
          enemy.LoadModel( (model: OdysseyModel3D) => {
            enemy.LoadGunBanks( () => {
              let track = this.tracks.find(o => o.track === enemy.trackName);
              model.userData.moduleObject = enemy;
              model.hasCollision = true;
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
import * as KotOR from "../KotOR";
import { ForgeMGEnemy } from "./ForgeMGEnemy";
import { ForgeMGPlayer } from "./ForgeMGPlayer";
import { ForgeMGObstacle } from "./ForgeMGObstacle";
import { ForgeMGTrack } from "./ForgeMGTrack";

export class ForgeMiniGame {
  type: KotOR.MiniGameType;

  bumpPlane: number = 0;
  cameraViewAngle: number = 0;
  dof: number = 0;
  doBumping: number = 0;
  player: ForgeMGPlayer;

  farClip: number = 0;
  lateralAccel: number = 0;
  movementPerSec: number = 0;
  music: number = 0;
  nearClip: number = 0;
  useInertia: number = 0;

  enemies: ForgeMGEnemy[] = [];
  obstacles: ForgeMGObstacle[] = [];
  tracks: ForgeMGTrack[] = [];

  constructor(struct: KotOR.GFFStruct){
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
    

    this.player = new ForgeMGPlayer(
      struct.getFieldByLabel('Player').getChildStructs()[0]
    );

    const enemies = struct.getFieldByLabel('Enemies').getChildStructs();
    for(let i = 0; i < enemies.length; i++){
      this.enemies.push(
        new ForgeMGEnemy(enemies[i])
      );
    }

    // Load Obstacles list if it exists
    if(struct.hasField('Obstacles')){
      const obstacles = struct.getFieldByLabel('Obstacles').getChildStructs();
      for(let i = 0; i < obstacles.length; i++){
        this.obstacles.push(
          new ForgeMGObstacle(obstacles[i])
        );
      }
    }
  }


  exportToGFFStruct(): KotOR.GFFStruct {
    const struct = new KotOR.GFFStruct(0);
    
    // Basic fields
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Bump_Plane', this.bumpPlane));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'CameraViewAngle', this.cameraViewAngle));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'DOF', this.dof));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DoBumping', this.doBumping));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Far_Clip', this.farClip));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'LateralAccel', this.lateralAccel));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MovementPerSec', this.movementPerSec));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Music', this.music));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Near_Clip', this.nearClip));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Type', this.type));
    struct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'UseInertia', this.useInertia));

    // Player struct
    if(this.player){
      const playerField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Player');
      const playerStruct = this.player.exportToGFFStruct();
      playerField.addChildStruct(playerStruct);
      struct.addField(playerField);
    }

    // Enemies list
    const enemiesField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Enemies');
    for(let i = 0; i < this.enemies.length; i++){
      const enemy = this.enemies[i];
      const enemyStruct = enemy.exportToGFFStruct();
      enemiesField.addChildStruct(enemyStruct);
    }
    struct.addField(enemiesField);

    // Obstacles list
    const obstaclesField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Obstacles');
    for(let i = 0; i < this.obstacles.length; i++){
      const obstacle = this.obstacles[i];
      const obstacleStruct = obstacle.exportToGFFStruct();
      obstaclesField.addChildStruct(obstacleStruct);
    }
    struct.addField(obstaclesField);

    return struct;
  }
}
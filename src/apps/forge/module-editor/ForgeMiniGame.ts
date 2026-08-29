import * as KotOR from "@/apps/forge/KotOR";
import { ForgeMGEnemy } from "@/apps/forge/module-editor/ForgeMGEnemy";
import { ForgeMGPlayer } from "@/apps/forge/module-editor/ForgeMGPlayer";
import { ForgeMGObstacle } from "@/apps/forge/module-editor/ForgeMGObstacle";
import { ForgeMGTrack } from "@/apps/forge/module-editor/ForgeMGTrack";

export class ForgeMiniGame {
  type: KotOR.MiniGameType = KotOR.MiniGameType.SWOOPRACE;

  bumpPlane: number = 0;
  cameraViewAngle: number = 65;
  dof: number = 0;
  doBumping: number = 0;
  player: ForgeMGPlayer = new ForgeMGPlayer();

  farClip: number = 100;
  lateralAccel: number = 60;
  movementPerSec: number = 6;
  music: number = 0;
  nearClip: number = 0.1;
  useInertia: number = 0;

  /** Present on turret MiniGames (e.g. m12ab); absent on swoop. */
  mouse?: {
    axisX: number;
    axisY: number;
    flipAxisX: boolean;
    flipAxisY: boolean;
  };

  enemies: ForgeMGEnemy[] = [];
  obstacles: ForgeMGObstacle[] = [];
  tracks: ForgeMGTrack[] = [];

  /** Default MiniGame for areas that do not yet have one (swoop-style Type 1). */
  static createDefault(type: KotOR.MiniGameType = KotOR.MiniGameType.SWOOPRACE): ForgeMiniGame {
    const mg = new ForgeMiniGame();
    mg.type = type;
    mg.movementPerSec = type === KotOR.MiniGameType.TURRET ? 90 : 6;
    mg.player = new ForgeMGPlayer();
    return mg;
  }

  addEnemy(): ForgeMGEnemy {
    const enemy = new ForgeMGEnemy();
    this.enemies.push(enemy);
    return enemy;
  }

  removeEnemy(index: number): void {
    if(index < 0 || index >= this.enemies.length){
      return;
    }
    this.enemies.splice(index, 1);
  }

  addObstacle(): ForgeMGObstacle {
    const obstacle = new ForgeMGObstacle();
    this.obstacles.push(obstacle);
    return obstacle;
  }

  removeObstacle(index: number): void {
    if(index < 0 || index >= this.obstacles.length){
      return;
    }
    this.obstacles.splice(index, 1);
  }

  constructor(struct?: KotOR.GFFStruct){
    if(!struct){
      return;
    }
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

    if(struct.hasField('Mouse')){
      const mouseField = struct.getFieldByLabel('Mouse');
      const mouseStruct = mouseField.getFieldStruct()
        || mouseField.getChildStructs()?.[0];
      if(mouseStruct){
        this.mouse = {
          axisX: mouseStruct.hasField('AxisX') ? mouseStruct.getFieldByLabel('AxisX').getValue() : 0,
          axisY: mouseStruct.hasField('AxisY') ? mouseStruct.getFieldByLabel('AxisY').getValue() : 0,
          flipAxisX: mouseStruct.hasField('FlipAxisX') ? !!mouseStruct.getFieldByLabel('FlipAxisX').getValue() : false,
          flipAxisY: mouseStruct.hasField('FlipAxisY') ? !!mouseStruct.getFieldByLabel('FlipAxisY').getValue() : false,
        };
      }
    }

    if(struct.hasField('Player')){
      const playerStructs = struct.getFieldByLabel('Player').getChildStructs();
      this.player = new ForgeMGPlayer(playerStructs[0]);
    } else {
      this.player = new ForgeMGPlayer();
    }

    if(struct.hasField('Enemies')){
      const enemies = struct.getFieldByLabel('Enemies').getChildStructs();
      for(let i = 0; i < enemies.length; i++){
        this.enemies.push(
          new ForgeMGEnemy(enemies[i])
        );
      }
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

    if(this.mouse){
      const mouseField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Mouse');
      const mouseStruct = new KotOR.GFFStruct(0);
      mouseStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'AxisX', this.mouse.axisX));
      mouseStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'AxisY', this.mouse.axisY));
      mouseStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'FlipAxisX', this.mouse.flipAxisX ? 1 : 0));
      mouseStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'FlipAxisY', this.mouse.flipAxisY ? 1 : 0));
      mouseField.addChildStruct(mouseStruct);
      struct.addField(mouseField);
    }

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
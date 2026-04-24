import * as KotOR from "@/apps/forge/KotOR";
import { IModelListItem } from "@/interface/module/minigame/IModelListItem";
import { ForgeMGGunBank } from "@/apps/forge/module-editor/ForgeMGGunBank";

export class ForgeMGPlayer {
  // Basic properties
  accel_secs: number = 0;
  bump_damage: number = 0;
  cameraName: string = '';
  cameraRotate: number = 0;
  hit_points: number = 0;
  invince_period: number = 0;
  max_hps: number = 0;
  maximum_speed: number = 0;
  minimum_speed: number = 0;
  num_loops: number = 1;
  sphere_radius: number = 0;
  trackName: string = '';
  type: number = 1;
  useInertia: number = 0;

  // Offset properties
  startOffsetX: number = 0;
  startOffsetY: number = 0;
  startOffsetZ: number = 0;
  targetOffsetX: number = 0;
  targetOffsetY: number = 0;
  targetOffsetZ: number = 0;

  // Tunnel properties
  tunnelXNeg: number = 0;
  tunnelXPos: number = 0;
  tunnelYNeg: number = 0;
  tunnelYPos: number = 0;
  tunnelZNeg: number = 0;
  tunnelZPos: number = 0;
  tunnelInfinite: {x: number, y: number, z: number} = {x: 0, y: 0, z: 0};

  // Complex properties
  modelProps: IModelListItem[] = [];
  gunBanks: ForgeMGGunBank[] = [];
  
  // Scripts - stored as resref strings
  scripts: {[key: string]: string} = {};

  // Sounds
  deathSound: string = '';
  engineSound: string = '';

  // Template reference for additional data
  template: KotOR.GFFObject;

  constructor(struct?: KotOR.GFFStruct){
    if(struct){
      this.loadFromStruct(struct);
    } else {
      this.template = new KotOR.GFFObject();
    }
  }

  loadFromStruct(struct: KotOR.GFFStruct){
    this.template = KotOR.GFFObject.FromStruct(struct);

    // Load basic properties
    if(struct.hasField('Accel_Secs')){
      this.accel_secs = struct.getNumberByLabel('Accel_Secs');
    }
    if(struct.hasField('Bump_Damage')){
      this.bump_damage = struct.getNumberByLabel('Bump_Damage');
    }
    if(struct.hasField('Camera')){
      this.cameraName = struct.getStringByLabel('Camera');
    }
    if(struct.hasField('CameraRotate')){
      this.cameraRotate = struct.getNumberByLabel('CameraRotate');
    }
    if(struct.hasField('Hit_Points')){
      this.hit_points = struct.getNumberByLabel('Hit_Points');
    }
    if(struct.hasField('Invince_Period')){
      this.invince_period = struct.getNumberByLabel('Invince_Period');
    }
    if(struct.hasField('Max_HPs')){
      this.max_hps = struct.getNumberByLabel('Max_HPs');
    }
    if(struct.hasField('Maximum_Speed')){
      this.maximum_speed = struct.getNumberByLabel('Maximum_Speed');
    }
    if(struct.hasField('Minimum_Speed')){
      this.minimum_speed = struct.getNumberByLabel('Minimum_Speed');
    }
    if(struct.hasField('Num_Loops')){
      this.num_loops = struct.getNumberByLabel('Num_Loops');
    }
    if(struct.hasField('Sphere_Radius')){
      this.sphere_radius = struct.getNumberByLabel('Sphere_Radius');
    }
    if(struct.hasField('Track')){
      this.trackName = struct.getStringByLabel('Track');
    }
    if(struct.hasField('Type')){
      this.type = struct.getNumberByLabel('Type');
    }
    if(struct.hasField('Uselnertia')){
      this.useInertia = struct.getNumberByLabel('Uselnertia');
    }

    // Load offset properties
    if(struct.hasField('Start_Offset_X')){
      this.startOffsetX = struct.getNumberByLabel('Start_Offset_X');
    }
    if(struct.hasField('Start_Offset_Y')){
      this.startOffsetY = struct.getNumberByLabel('Start_Offset_Y');
    }
    if(struct.hasField('Start_Offset_Z')){
      this.startOffsetZ = struct.getNumberByLabel('Start_Offset_Z');
    }
    if(struct.hasField('Target_Offset_X')){
      this.targetOffsetX = struct.getNumberByLabel('Target_Offset_X');
    }
    if(struct.hasField('Target_Offset_Y')){
      this.targetOffsetY = struct.getNumberByLabel('Target_Offset_Y');
    }
    if(struct.hasField('Target_Offset_Z')){
      this.targetOffsetZ = struct.getNumberByLabel('Target_Offset_Z');
    }

    // Load tunnel properties
    if(struct.hasField('TunnelXNeg')){
      this.tunnelXNeg = struct.getNumberByLabel('TunnelXNeg');
    }
    if(struct.hasField('TunneXPos')){
      this.tunnelXPos = struct.getNumberByLabel('TunneXPos');
    }
    if(struct.hasField('TunnelYNeg')){
      this.tunnelYNeg = struct.getNumberByLabel('TunnelYNeg');
    }
    if(struct.hasField('TunnelYPos')){
      this.tunnelYPos = struct.getNumberByLabel('TunnelYPos');
    }
    if(struct.hasField('TunneZNeg')){
      this.tunnelZNeg = struct.getNumberByLabel('TunneZNeg');
    }
    if(struct.hasField('TunnelZPos')){
      this.tunnelZPos = struct.getNumberByLabel('TunnelZPos');
    }
    if(struct.hasField('Tunnellnfinite')){
      const tunnelInfiniteField = struct.getFieldByLabel('Tunnellnfinite');
      if(tunnelInfiniteField && tunnelInfiniteField.vector){
        this.tunnelInfinite = tunnelInfiniteField.vector;
      }
    }

    // Load Models list
    if(struct.hasField('Models')){
      const models = struct.getFieldByLabel('Models').getChildStructs();
      for(let i = 0; i < models.length; i++){
        const modelStruct = models[i];
        this.modelProps.push({
          model: modelStruct.getStringByLabel('Model'),
          rotating: modelStruct.getBooleanByLabel('RotatingModel')
        });
      }
    }

    // Load Gun_Banks list
    if(struct.hasField('Gun_Banks')){
      const gun_banks = struct.getFieldByLabel('Gun_Banks').getChildStructs();
      for(let i = 0; i < gun_banks.length; i++){
        this.gunBanks.push(
          new ForgeMGGunBank(gun_banks[i])
        );
      }
    }

    // Load Scripts struct
    if(struct.hasField('Scripts')){
      const scriptsNode = struct.getFieldByLabel('Scripts').getFieldStruct();
      if(scriptsNode){
        const scriptKeys = [
          'OnAnimEvent',
          'OnCreate',
          'OnDamage',
          'OnDeath',
          'OnFire',
          'OnHeartbeat',
          'OnHitBullet',
          'OnHitFollower',
          'OnHitObstacle',
          'OnTrackLoop',
        ];

        for(const scriptKey of scriptKeys){
          if(scriptsNode.hasField(scriptKey)){
            const resRef = scriptsNode.getStringByLabel(scriptKey);
            if(resRef){
              this.scripts[scriptKey] = resRef;
            }
          }
        }
      }
    }

    // Load Sounds struct
    if(struct.hasField('Sounds')){
      const soundsNode = struct.getFieldByLabel('Sounds').getFieldStruct();
      if(soundsNode){
        if(soundsNode.hasField('Death')){
          this.deathSound = soundsNode.getStringByLabel('Death');
        }
        if(soundsNode.hasField('Engine')){
          this.engineSound = soundsNode.getStringByLabel('Engine');
        }
      }
    }
  }

  exportToGFFStruct(): KotOR.GFFStruct {
    const playerStruct = new KotOR.GFFStruct(0);

    // Basic player fields
    if(this.accel_secs !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Accel_Secs', this.accel_secs));
    }
    if(this.bump_damage !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Bump_Damage', this.bump_damage));
    }
    if(this.cameraName !== undefined && this.cameraName !== ''){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Camera', this.cameraName));
    }
    if(this.cameraRotate !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'CameraRotate', this.cameraRotate));
    }
    if(this.hit_points !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Hit_Points', this.hit_points));
    }
    if(this.invince_period !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Invince_Period', this.invince_period));
    }
    if(this.max_hps !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Max_HPs', this.max_hps));
    }
    if(this.maximum_speed !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Maximum_Speed', this.maximum_speed));
    }
    if(this.minimum_speed !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Minimum_Speed', this.minimum_speed));
    }
    if(this.num_loops !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Num_Loops', this.num_loops));
    }
    if(this.sphere_radius !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Sphere_Radius', this.sphere_radius));
    }
    if(this.trackName !== undefined && this.trackName !== ''){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Track', this.trackName));
    }
    if(this.type !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Type', this.type));
    }
    if(this.useInertia !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Uselnertia', this.useInertia));
    }

    // Offset fields
    if(this.startOffsetX !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Start_Offset_X', this.startOffsetX));
    }
    if(this.startOffsetY !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Start_Offset_Y', this.startOffsetY));
    }
    if(this.startOffsetZ !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Start_Offset_Z', this.startOffsetZ));
    }
    if(this.targetOffsetX !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Target_Offset_X', this.targetOffsetX));
    }
    if(this.targetOffsetY !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Target_Offset_Y', this.targetOffsetY));
    }
    if(this.targetOffsetZ !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Target_Offset_Z', this.targetOffsetZ));
    }

    // Tunnel fields
    if(this.tunnelXNeg !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'TunnelXNeg', this.tunnelXNeg));
    }
    if(this.tunnelXPos !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'TunneXPos', this.tunnelXPos));
    }
    if(this.tunnelYNeg !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'TunnelYNeg', this.tunnelYNeg));
    }
    if(this.tunnelYPos !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'TunnelYPos', this.tunnelYPos));
    }
    if(this.tunnelZNeg !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'TunneZNeg', this.tunnelZNeg));
    }
    if(this.tunnelZPos !== undefined){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'TunnelZPos', this.tunnelZPos));
    }
    if(this.tunnelInfinite !== undefined && (this.tunnelInfinite.x !== 0 || this.tunnelInfinite.y !== 0 || this.tunnelInfinite.z !== 0)){
      playerStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.VECTOR, 'Tunnellnfinite', this.tunnelInfinite));
    }

    // Gun_Banks list
    const gunBanksField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Gun_Banks');
    for(let i = 0; i < this.gunBanks.length; i++){
      const gunBank = this.gunBanks[i];
      const gunBankStruct = gunBank.exportToGFFStruct();
      gunBanksField.addChildStruct(gunBankStruct);
    }
    playerStruct.addField(gunBanksField);

    // Models list
    const modelsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Models');
    for(let i = 0; i < this.modelProps.length; i++){
      const modelProp = this.modelProps[i];
      const modelStruct = new KotOR.GFFStruct(0);
      modelStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Model', modelProp.model || ''));
      modelStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'RotatingModel', modelProp.rotating ? 1 : 0));
      modelsField.addChildStruct(modelStruct);
    }
    playerStruct.addField(modelsField);

    // Scripts struct
    const scriptsField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Scripts');
    const scriptsStruct = new KotOR.GFFStruct(0);
    
    const scriptKeys = [
      'OnAnimEvent',
      'OnCreate',
      'OnDamage',
      'OnDeath',
      'OnFire',
      'OnHeartbeat',
      'OnHitBullet',
      'OnHitFollower',
      'OnHitObstacle',
      'OnTrackLoop',
    ];

    for(const scriptKey of scriptKeys){
      const resref = this.scripts[scriptKey] || '';
      scriptsStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, scriptKey, resref));
    }
    
    scriptsField.addChildStruct(scriptsStruct);
    playerStruct.addField(scriptsField);

    // Sounds struct
    const soundsField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Sounds');
    const soundsStruct = new KotOR.GFFStruct(0);
    soundsStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Death', this.deathSound || ''));
    soundsStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Engine', this.engineSound || ''));
    soundsField.addChildStruct(soundsStruct);
    playerStruct.addField(soundsField);

    return playerStruct;
  }
}


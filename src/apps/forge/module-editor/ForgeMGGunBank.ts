import * as KotOR from "@/apps/forge/KotOR";
import { ForgeMGGunBullet } from "@/apps/forge/module-editor/ForgeMGGunBullet";

export class ForgeMGGunBank {
  // Basic properties
  bankID: number = 0;
  fireSound: string = '';
  gunModel: string = '';
  horizSpread: number = 0;
  inaccuracy: number = 0;
  sensingRadius: number = 0;
  vertSpread: number = 0;

  // Bullet template
  bullet: ForgeMGGunBullet;

  // Template reference for additional data
  template: KotOR.GFFObject;

  constructor(struct?: KotOR.GFFStruct){
    if(struct){
      this.loadFromStruct(struct);
    } else {
      this.template = new KotOR.GFFObject();
      this.bullet = new ForgeMGGunBullet();
    }
  }

  loadFromStruct(struct: KotOR.GFFStruct){
    this.template = KotOR.GFFObject.FromStruct(struct);

    // Load basic properties
    if(struct.hasField('BankID')){
      this.bankID = struct.getFieldByLabel('BankID').getValue();
    }
    if(struct.hasField('Fire_Sound')){
      this.fireSound = struct.getFieldByLabel('Fire_Sound').getValue();
    }
    if(struct.hasField('Gun_Model')){
      this.gunModel = struct.getFieldByLabel('Gun_Model').getValue();
    }
    if(struct.hasField('Horiz_Spread')){
      this.horizSpread = struct.getFieldByLabel('Horiz_Spread').getValue();
    }
    if(struct.hasField('Inaccuracy')){
      this.inaccuracy = struct.getFieldByLabel('Inaccuracy').getValue();
    }
    if(struct.hasField('Sensing_Radius')){
      this.sensingRadius = struct.getFieldByLabel('Sensing_Radius').getValue();
    }
    if(struct.hasField('Vert_Spread')){
      this.vertSpread = struct.getFieldByLabel('Vert_Spread').getValue();
    }

    // Load Bullet struct
    if(struct.hasField('Bullet')){
      const bulletStructs = struct.getFieldByLabel('Bullet').getChildStructs();
      if(bulletStructs.length > 0){
        this.bullet = new ForgeMGGunBullet(bulletStructs[0]);
      } else {
        this.bullet = new ForgeMGGunBullet();
      }
    } else {
      this.bullet = new ForgeMGGunBullet();
    }
  }

  exportToGFFStruct(): KotOR.GFFStruct {
    const gunBankStruct = new KotOR.GFFStruct();

    // Basic gun bank fields
    if(this.bankID !== undefined){
      gunBankStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'BankID', this.bankID));
    }
    if(this.fireSound !== undefined && this.fireSound !== ''){
      gunBankStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Fire_Sound', this.fireSound));
    }
    if(this.gunModel !== undefined && this.gunModel !== ''){
      gunBankStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Gun_Model', this.gunModel));
    }
    if(this.horizSpread !== undefined){
      gunBankStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Horiz_Spread', this.horizSpread));
    }
    if(this.inaccuracy !== undefined){
      gunBankStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Inaccuracy', this.inaccuracy));
    }
    if(this.sensingRadius !== undefined){
      gunBankStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Sensing_Radius', this.sensingRadius));
    }
    if(this.vertSpread !== undefined){
      gunBankStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Vert_Spread', this.vertSpread));
    }

    // Bullet struct
    if(this.bullet){
      const bulletField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Bullet');
      const bulletStruct = this.bullet.exportToGFFStruct();
      bulletField.addChildStruct(bulletStruct);
      gunBankStruct.addField(bulletField);
    }

    return gunBankStruct;
  }
}


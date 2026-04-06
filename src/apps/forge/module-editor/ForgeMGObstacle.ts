import * as KotOR from "@/apps/forge/KotOR";

export class ForgeMGObstacle {
  // Basic properties
  name: string = '';

  // Scripts - stored as resref strings
  scripts: {[key: string]: string} = {};

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

    // Load Name field
    if(struct.hasField('Name')){
      this.name = struct.getFieldByLabel('Name').getValue();
    }

    // Load Scripts struct
    if(struct.hasField('Scripts')){
      const scriptsNode = struct.getFieldByLabel('Scripts').getFieldStruct();
      if(scriptsNode){
        const scriptKeys = [
          'OnAnimEvent',
          'OnCreate',
          'OnHeartbeat',
          'OnHitBullet',
          'OnHitFollower',
        ];

        for(const scriptKey of scriptKeys){
          if(scriptsNode.hasField(scriptKey)){
            const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
            if(resRef){
              this.scripts[scriptKey] = resRef;
            }
          }
        }
      }
    }
  }

  exportToGFFStruct(): KotOR.GFFStruct {
    const obstacleStruct = new KotOR.GFFStruct(0);

    // Name field
    if(this.name !== undefined && this.name !== ''){
      obstacleStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Name', this.name));
    }

    // Scripts struct
    const scriptsField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Scripts');
    const scriptsStruct = new KotOR.GFFStruct(0);
    
    const scriptKeys = [
      'OnAnimEvent',
      'OnCreate',
      'OnHeartbeat',
      'OnHitBullet',
      'OnHitFollower',
    ];

    for(const scriptKey of scriptKeys){
      const resref = this.scripts[scriptKey] || '';
      scriptsStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, scriptKey, resref));
    }
    
    scriptsField.addChildStruct(scriptsStruct);
    obstacleStruct.addField(scriptsField);

    return obstacleStruct;
  }
}


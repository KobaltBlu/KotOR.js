/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleWaypoint class.
 */

class ModuleWaypoint extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super(gff);

    this.template = gff;
    this.InitProperties();

  }

  SetFacingVector(facing = new THREE.Vector3()){
    if(this.model != THREE.AuroraModel)
      this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.getXOrientation(), this.getYOrientation()));
  }

  GetFacingVector(){
    if(this.model != THREE.AuroraModel){
      let facing = new THREE.Vector3(0, 1, 0);
      facing.applyQuaternion(this.model.quaternion);
      return facing;
    }
    return new THREE.Vector3(0, 0, 0);
  }

  getXPosition(){
    return this.position.x;
  }

  getYPosition(){
    return this.position.y;
  }

  getZPosition(){
    return this.position.z;
  }

  getXOrientation(){
    return this.xOrientation;
  }

  getYOrientation(){
    return this.yOrientation;
  }

  getZOrientation(){
    return this.zOrientation;
  }

  getTag(){
    return this.tag;
  }

  getTemplateResRef(){
    return this.templateResRef;
  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields

      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: ResourceTypes.utw,
        onLoad: (gff) => {
          this.template.Merge(gff);
          this.InitProperties();
          if(onLoad != null)
            onLoad(this.template);
        },
        onFail: () => {
          console.error('Failed to load waypoint template');
          if(onLoad != null)
            onLoad(undefined);
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      if(onLoad != null)
        onLoad(this.template);
    }
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTW ';
    gff.RootNode.Type = 5;

    gff.RootNode.AddField( new Field(GFFDataTypes.LIST,  'ActionList') );
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE,  'Commandable') ).SetValue(1);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE,  'HasMapNote') ).SetValue(1);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'LocalizedName') ).SetValue(this.locName);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue(this.id);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new Field(GFFDataTypes.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new Field(GFFDataTypes.LIST,  'VarTable') );
    
    if(this.template.RootNode.HasField('XOrientation')){
      gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'XOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('XOrientation').GetValue());
    }else{
      gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'XOrientation') ).SetValue(0);
    }

    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'XPosition') ).SetValue(this.position.x);
    
    if(this.template.RootNode.HasField('YOrientation')){
      gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'YOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('YOrientation').GetValue());
    }else{
      gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'YOrientation') ).SetValue(0);
    }
    
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'YPosition') ).SetValue(this.position.y);
    
    if(this.template.RootNode.HasField('ZOrientation'))
      gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ZOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue());
    
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ZPosition') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){

    let instance = new Struct(8);
    
    instance.AddField(
      new Field(GFFDataTypes.BYTE, 'Appearance', this.appearance)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.CEXOLOCSTRING, 'Description')
    ).CExoLocString = new CExoLocString();
    
    instance.AddField(
      new Field(GFFDataTypes.BYTE, 'HasMapNote', this.hasMapNote)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.CEXOSTRING, 'LinkedTo', this.linkedTo)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.BYTE, 'LinkedToFlags', this.linkedToFlags)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'LinkedToModule', this.linkedToModule)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.CEXOLOCSTRING, 'MapNote')
    ).CExoLocString = this.mapNote;
    
    instance.AddField(
      new Field(GFFDataTypes.BYTE, 'MapNoteEnabled', this.mapNoteEnabled)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'Tag', this.tag)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XOrientation', this.xOrientation)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YOrientation', this.yOrientation)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

}

module.exports = ModuleWaypoint;

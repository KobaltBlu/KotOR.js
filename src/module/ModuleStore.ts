/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleStore class.
 */



export class ModuleStore extends ModuleObject {

  constructor( gff = new GFFObject() ){
    super(gff);
    
    this.template = gff;
    this.buySellFlag = -1;
    this.markDown = 0;
    this.markUp = 0;
    this.onOpenStore = null;
    this.tag = '';
    this.inventory = [];

  }

  getInventory(){
    return this.inventory;
  }

  getMarkDown(){
    return this.markDown * .01;
  }

  getMarkUp(){
    return this.markUp * .01;
  }

  Load( onLoad = null ){
    if(this.getResRef()){
      //Load template and merge fields

      TemplateLoader.Load({
        ResRef: this.getResRef(),
        ResType: ResourceTypes.utm,
        onLoad: (gff) => {
          this.template.Merge(gff);
          this.InitProperties();
          if(onLoad != null)
            onLoad(this);     
        },
        onFail: (e) => {
          console.error('Failed to load merchant template', this.getResRef());
          if(onLoad != null)
            onLoad(undefined);
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      if(onLoad != null)
        onLoad(this);
    }
  }

  InitProperties( onLoad = null ){
    
    if(!this.initialized){
      if(this.template.RootNode.HasField('ObjectId')){
        this.id = this.template.GetFieldByLabel('ObjectId').GetValue();
      }else if(this.template.RootNode.HasField('ID')){
        this.id = this.template.GetFieldByLabel('ID').GetValue();
      }else{
        this.id = ModuleObject.COUNT++;
      }
      
      ModuleObject.List.set(this.id, this);
    }

    if(this.template.RootNode.HasField('BuySellFlag'))
      this.buySellFlag = this.template.GetFieldByLabel('BuySellFlag').GetValue()

    if(this.template.RootNode.HasField('LocName'))
      this.locName = this.template.GetFieldByLabel('LocName').GetCExoLocString();

    if(this.template.RootNode.HasField('MarkDown'))
      this.markDown = this.template.GetFieldByLabel('MarkDown').GetValue();

    if(this.template.RootNode.HasField('MarkUp'))
      this.markUp = this.template.GetFieldByLabel('MarkUp').GetChildStructs();

    if(this.template.RootNode.HasField('OnOpenStore'))
      this.onOpenStore = this.template.GetFieldByLabel('OnOpenStore').GetValue();
      
    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue(); 
    
    if(this.template.RootNode.HasField('XPosition'))
      this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();
    
    if(this.template.RootNode.HasField('XOrientation'))
      this.rotation.x = this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();

    if(this.template.RootNode.HasField('YOrientation'))
      this.rotation.y = this.template.RootNode.GetFieldByLabel('YOrientation').GetValue();

    if(this.template.RootNode.HasField('ZOrientation'))
      this.rotation.z = this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();

    if(this.template.RootNode.HasField('SWVarTable')){
      let swVarTableStruct = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0];
      if(swVarTableStruct){
        if(swVarTableStruct.HasField('BitArray')){
          let localBools = swVarTableStruct.GetFieldByLabel('BitArray').GetChildStructs();
          for(let i = 0; i < localBools.length; i++){
            let data = localBools[i].GetFieldByLabel('Variable').GetValue();
            for(let bit = 0; bit < 32; bit++){
              this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
            }
          }
        }

        if(swVarTableStruct.HasField('ByteArray')){
          let localNumbers = swVarTableStruct.GetFieldByLabel('ByteArray').GetChildStructs();
          for(let i = 0; i < localNumbers.length; i++){
            let data = localNumbers[i].GetFieldByLabel('Variable').GetValue();
            this.setLocalNumber(i, data);
          }
        }
      }
    }
            
    if(this.template.RootNode.HasField('ItemList')){
      let items = this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs() || [];

      let loop = new AsyncLoop({
        array: items,
        onLoop: (item, asyncLoop) => {
          let moduleItem = new ModuleItem(GFFObject.FromStruct(item));
          this.inventory.push(moduleItem)
          moduleItem.Load( () => {
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        if(typeof onLoad == 'function')
          onLoad();
      });
    }else{
      if(typeof onLoad == 'function')
        onLoad();
    }
    
    this.initialized = true;

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTM ';
    gff.RootNode.Type = 6;

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).SetValue(this.locName);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'MarkDown') ).SetValue(this.markDown);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'MarkUp') ).SetValue(this.markUp);
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnOpenStore') ).SetValue (this.onOpenStore instanceof NWScriptInstance ? this.onOpenStore.name : '' );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BuySellFlag') ).SetValue(this.buySellFlag);

    let itemList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ItemList') );
    for(let i = 0; i < this.inventory.length; i++){
      itemList.AddChildStruct( this.inventory[i].save().RootNode );
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue(this.position.x);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue(this.position.y);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue(this.position.z);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue(this.rotation.x);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue(this.rotation.y);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).SetValue(this.rotation.z);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Commandable') ).SetValue(1);


    this.template = gff;
    return gff;
  }

  toToolsetInstance(){

    let instance = new GFFStruct(11);
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'ResRef', this.resref)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', 0.0)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', 1.0)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

}
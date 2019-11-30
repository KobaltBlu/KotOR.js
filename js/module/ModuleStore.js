/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleStore class.
 */



class ModuleStore extends ModuleObject {

  constructor( gff = new GFFObject() ){
    super(gff);
    
    this.template = gff;
    this.buySellFlag = -1;
    this.ID = 0;
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

    if(this.template.RootNode.HasField('BuySellFlag'))
      this.buySellFlag = this.template.GetFieldByLabel('BuySellFlag').GetValue()

    if(this.template.RootNode.HasField('ID'))
      this.ID = this.template.GetFieldByLabel('ID').GetValue();

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
            
    if(this.template.RootNode.HasField('ItemList')){
      let items = this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs() || [];

      let loop = new AsyncLoop({
        array: items,
        onLoop: (item, asyncLoop) => {

          let moduleItem = new ModuleItem(GFFObject.FromStruct(item));
          this.inventory.push(moduleItem)
          moduleItem.Load( () => {
            asyncLoop._Loop();
          });
        }
      });
      loop.Begin(() => {
        if(typeof onLoad == 'function')
          onLoad();
      });
    }else{
      if(typeof onLoad == 'function')
        onLoad();
    }

  }

  toToolsetInstance(){

    let instance = new Struct(11);
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'ResRef', this.resref)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XOrientation', 0.0)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YPosition', this.position.y)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YOrientation', 1.0)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

}

module.exports = ModuleStore;
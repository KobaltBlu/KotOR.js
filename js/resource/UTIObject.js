/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UTIObject class.
 */

class UTIObject {

  constructor(gff = undefined){
    this.mesh = null
    this.moduleObject = null;
    this.gff = gff;
    this.resType = UTIObject.ResType;

    this.model = new THREE.Object3D();

  }

  getBaseItemId(){
    if(this.gff.RootNode.HasField('BaseItem')){
      return this.gff.RootNode.GetFieldByLabel('BaseItem').GetValue();
    }
    return 0;
  }

  getBaseItem(){
    return Global.kotor2DA['baseitems'].rows[this.getBaseItemId()];
  }

  getBodyVariation(){
    return this.getBaseItem().bodyvar;
  }

  getModelVariation(){
    if(this.gff.RootNode.HasField('ModelVariation')){
      return this.gff.RootNode.GetFieldByLabel('ModelVariation').GetValue();
    }
    return 0;
  }

  getTextureVariation(){
    if(this.gff.RootNode.HasField('TextureVar')){
      return this.gff.RootNode.GetFieldByLabel('TextureVar').GetValue();
    }
    return 1;
  }

  getWeaponWield(){
    return null;
  }

  isStolen(){
    if(this.gff.RootNode.HasField('Stolen')){
      return this.gff.RootNode.GetFieldByLabel('Stolen').GetValue() ? true : false;
    }
    return false; 
  }

  getName(){
    return this.gff.GetFieldByLabel('LocalizedName').GetCExoLocString().GetValue();
  }

  getEquippedRes(){
    if(this.gff.RootNode.HasField('EquippedRes')){
      return this.gff.RootNode.GetFieldByLabel('EquippedRes').GetValue();
    }
    return null;
  }

  getTag(){
    if(this.gff.RootNode.HasField('Tag')){
      return this.gff.RootNode.GetFieldByLabel('Tag').GetValue();
    }
    return null;
  }

  Load( onLoad = null ){
    if(this.getEquippedRes()){
      //Load template and merge fields
      console.log('UTIObject', 'Loading Template', this.getEquippedRes())
      TemplateLoader.Load({
        ResRef: this.getEquippedRes(),
        ResType: ResourceTypes.uti,
        onLoad: (gff) => {
          console.log('UTIObject', 'Template Loaded')
          this.gff.Merge(gff);
          this.LoadModel( () => {
            console.log('UTIObject', 'Model Loaded')
            if(onLoad != null)
              onLoad(this);
          });
          
        },
        onFail: () => {
          console.error('Failed to load placeable template');
        }
      });

    }else{
      console.log('UTIObject', '(From SAVEGAME)')
      //We already have the template (From SAVEGAME)
      this.LoadModel( () => {
        console.log('UTIObject', 'Model Loaded')
        if(onLoad != null)
          onLoad(this);
      });
    }
  }

  LoadModel(onLoad = null){
    let DefaultModel = this.getBaseItem()['defaultmodel'];
    DefaultModel = DefaultModel.replace(/\0[\s\S]*$/g,'').toLowerCase();

    if(DefaultModel != 'i_null'){
      DefaultModel = this.nthStringConverter(DefaultModel, this.getModelVariation());
    }

    let itemLoader = new THREE.MDLLoader();
    itemLoader.load({
      file: DefaultModel,
      onLoad: (mdl) => {
        THREE.AuroraModel.FromMDL(mdl, {
          onComplete: (model) => {
            this.model = model;
            TextureLoader.LoadQueue(() => {
              if(typeof onLoad === 'function')
                onLoad();
            });
          },
          castShadow: false,
          receiveShadow: false
        });
      }
    });
  }

  nthStringConverter(name = '', nth = 1){
    nth = nth.toString();
    name = name.substr(0, name.length - nth.length);
    return name + nth;
  }

  /*static FromTemplate(ResRef = null, onLoad = null){
    
    let uti = new UTIObject();

    if(ResRef != null){

      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTIObject.ResType,
        onLoad: (gff) => {
          uti.gff = gff;
          if(gff instanceof GFFObject){
            let BaseItemId = gff.GetFieldByLabel('BaseItem').GetValue();
            uti.BaseItem = Global.kotor2DA['baseitems'].rows[BaseItemId];
          }
          if(typeof onLoad == 'function')
            onLoad(uti);
        }
      });

    }

  }*/

  getIcon(onLoad = null){

    let baseClass = Global.kotor2DA.baseitems.rows[this.gff.GetFieldByLabel('BaseItem').Value]['itemclass'].toLowerCase();
    let texVariantNode = this.gff.GetFieldByLabel('TextureVar');
    let modelVariantNode = this.gff.GetFieldByLabel('ModelVariation');

    let variant = 1;

    if(texVariantNode != null)
      variant = texVariantNode.Value;
    else if(modelVariantNode != null)
      variant = modelVariantNode.Value;

    TextureLoader.tpcLoader.loadFromArchive('swpc_tex_gui', 'i'+baseClass+'_'+Utility.PadInt(variant, 3), (image) => {
      if(typeof onLoad == 'function')
        onLoad(image);
    });
  }

}

UTIObject.ResType = ResourceTypes['uti'];

module.exports = UTIObject;

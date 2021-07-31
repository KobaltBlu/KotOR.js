/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenFeats menu class.
 */

class CharGenFeats extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'ftchrgen',
      onLoad: () => {

        //this.LB_FEATS;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();

    this.addGrantedFeats();
    this.LB_FEATS.GUIProtoItemClass = GUIFeatItem;
    this.LB_FEATS.clearItems();
    this.buildFeatList();

    TextureLoader.LoadQueue();
  }

  addGrantedFeats(){
    let feats = Global.kotor2DA.feat.rows;
    let featCount = Global.kotor2DA.feat.RowCount;
    let granted = [];
    for(let i = 0; i < featCount; i++){
      let feat = feats[i];
      let character = Game.getCurrentPlayer();
      let mainClass = character.getMainClass();

      if(feat.constant != '****'){
        if(mainClass.isFeatAvailable(feat)){
          let status = mainClass.getFeatStatus(feat);
          if(status == 3 && character.getTotalClassLevel() >= mainClass.getFeatGrantedLevel(feat)){
            if(!character.getHasFeat(feat.__index)){
              console.log('Feat Granted', feat);
              character.addFeat(TalentFeat.From2DA(feat));
              granted.push(feat);
            }
          }
        }
      }
    }

    //TODO: Notify Player about granted feats with MenuConfirm

  }

  buildFeatList(){
    let feats = Global.kotor2DA.feat.rows;
    let featCount = Global.kotor2DA.feat.RowCount;

    let list = [];
    let character = Game.getCurrentPlayer();
    let mainClass = character.getMainClass();

    for(let i = 0; i < featCount; i++){
      let feat = feats[i];

      if(feat.constant != '****'){
        if(mainClass.isFeatAvailable(feat)){
          let status = mainClass.getFeatStatus(feat);
          if(character.getHasFeat(feat.__index) || status == 0 || status == 1){ //AVAILABLE 0 AND 1 Appear to act the same
            list.push(feat);
          }
        }
      }
    }

    let groups = [];
    for(let i = 0; i < list.length; i++){
      let feat = list[i];
      let group = [];
      let prereqfeat1 = Global.kotor2DA.feat.rows[feat.prereqfeat1];
      let prereqfeat2 = Global.kotor2DA.feat.rows[feat.prereqfeat2];

      //if((feat.mincharlevel == '****' || feat.mincharlevel == 0) && !prereqfeat1 && !prereqfeat2){
      if(!prereqfeat1 && !prereqfeat2){
        group.push(feat);
        for(let j = 0; j < featCount; j++){
          let chainFeat = feats[j];
          if(chainFeat.prereqfeat1 == feat.__index || chainFeat.prereqfeat2 == feat.__index){

            if(chainFeat.prereqfeat1 != '****' && chainFeat.prereqfeat2 != '****'){
              group[2] = chainFeat;
            }else{
              group[1] = chainFeat;
            }
          }
        }
        this.LB_FEATS.addItem(group);
      }
      groups.push(group);
    }

    groups.sort((groupa, groupb) => (groupa[0].toolscategories > groupb[0].toolscategories) ? 1 : -1);
    console.log(groups);
  }

}

class GUIFeatItem extends GUIProtoItem {

  constructor(menu = null, control = null, parent = null, scale = false){
    super(menu, control, parent, scale);
    this.disableSelection = true;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below

      let featList = this.node;
      for(let i = 0; i < featList.length; i++){
        let feat = featList[i];

        let hasPrereqfeat1 = (feat.prereqfeat1 == '****' || Game.getCurrentPlayer().getHasFeat(feat.prereqfeat1));
        let hasPrereqfeat2 = (feat.prereqfeat2 == '****' || Game.getCurrentPlayer().getHasFeat(feat.prereqfeat2));
        let hasFeat = Game.getCurrentPlayer().getHasFeat(feat.__index);

        console.log(feat.constant, hasPrereqfeat1, hasPrereqfeat2);

        let locked = !hasFeat || (!hasPrereqfeat1 || !hasPrereqfeat2);

        let buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
        buttonIcon.text.text = '';
        buttonIcon.disableTextAlignment();
        buttonIcon.extent.width = 56;
        buttonIcon.extent.height = 56;
        buttonIcon.extent.top = 0;
        buttonIcon.extent.left = 0;
        buttonIcon.hasBorder = false;
        buttonIcon.hasHighlight = false;
        buttonIcon.hasText = false;
        buttonIcon.autoCalculatePosition = false;
        this.children.push(buttonIcon);

        let _buttonIconWidget = buttonIcon.createControl();
        switch(i){
          case 2:
            _buttonIconWidget.position.x = (this.extent.width/2 - buttonIcon.extent.width/2);
          break;
          case 1:
            _buttonIconWidget.position.x = 0;
          break;
          default:
            _buttonIconWidget.position.x = -(this.extent.width/2 - buttonIcon.extent.width/2);
          break;
        }
        _buttonIconWidget.position.y = 0;
        _buttonIconWidget.position.z = this.zIndex + 1;

        this.widget.add(_buttonIconWidget);

        TextureLoader.enQueue('lbl_indent', this.border.fill.material, TextureLoader.Type.TEXTURE, (texture, tex) => {
          buttonIcon.setMaterialTexture( buttonIcon.border.fill.material, texture);
          buttonIcon.border.fill.material.transparent = true;
          buttonIcon.setMaterialTexture( buttonIcon.highlight.fill.material, texture);
          buttonIcon.highlight.fill.material.transparent = true;
          if(locked){
            buttonIcon.getFill().material.uniforms.opacity.value = 0.25;
          }
        });

        buttonIcon.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        /* FEAT ICON */

        this.widget.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
        this.widget.iconSprite = new THREE.Sprite( this.widget.iconMaterial );

        this.widget.iconSprite.scale.x = 32;
        this.widget.iconSprite.scale.y = 32;
        this.widget.iconSprite.position.z = 5;
        this.widget.iconSprite.renderOrder = 5;
        TextureLoader.enQueue(feat.icon, this.widget.iconMaterial, TextureLoader.Type.TEXTURE, (texture) => {
          this.widget.iconSprite.scale.x = texture.image.width;
          this.widget.iconSprite.scale.y = texture.image.height;
          if(locked){
            this.widget.iconMaterial.opacity = 0.25;
          }
          this.widget.iconMaterial.transparent = true;
          this.widget.iconMaterial.needsUpdate = true;
        });

        _buttonIconWidget.add(this.widget.iconSprite);

        /*
        * BLUE ARROW
        */
        
        let arrowOffset = (this.extent.width/2 - buttonIcon.extent.width/2)/2;
        if(i > 0){
          let arrowIcon = new GUIButton(this.menu, this.control, this, this.scale);
          arrowIcon.text.text = '';
          arrowIcon.disableTextAlignment();
          arrowIcon.extent.width = 32;
          arrowIcon.extent.height = 32;
          arrowIcon.extent.top = 0;
          arrowIcon.extent.left = 0;
          arrowIcon.hasBorder = false;
          arrowIcon.hasHighlight = false;
          arrowIcon.disableBorder();
          arrowIcon.disableHighlight();
          arrowIcon.hasText = false;
          arrowIcon.autoCalculatePosition = false;
          this.children.push(arrowIcon);

          let _arrowIconWidget = arrowIcon.createControl();
          switch(i){
            case 2:
              _arrowIconWidget.position.x = arrowOffset;
            break;
            case 1:
              _arrowIconWidget.position.x = -arrowOffset;
            break;
          }
          _arrowIconWidget.position.y = 0;
          _arrowIconWidget.position.z = this.zIndex + 1;

          this.widget.add(_arrowIconWidget);

          TextureLoader.enQueue('lbl_skarr', this.border.fill.material, TextureLoader.Type.TEXTURE, (texture, tex) => {
            arrowIcon.setMaterialTexture( arrowIcon.border.fill.material, texture);
            arrowIcon.border.fill.material.transparent = true;
            arrowIcon.setMaterialTexture( arrowIcon.highlight.fill.material, texture);
            arrowIcon.highlight.fill.material.transparent = true;
            if(locked){
              arrowIcon.border.fill.material.uniforms.opacity.value = 0.25;
              arrowIcon.highlight.fill.material.uniforms.opacity.value = 0.25;
            }
          });

          //lbl_skarr
        }

      }
      return this.widget;
    }catch(e){
      console.error(e);
    }
    return this.widget;

  }

}

module.exports = CharGenFeats;
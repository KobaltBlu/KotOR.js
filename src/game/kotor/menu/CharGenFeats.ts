/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { TextureType } from "../../../enums/loaders/TextureType";
import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton, GUIProtoItem, GUIControl } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import { TalentFeat } from "../../../talents";
import * as THREE from "three";

/* @file
* The CharGenFeats menu class.
*/

export class CharGenFeats extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  DESC_LBL: GUILabel;
  STD_SELECTIONS_REMAINING_LBL: GUILabel;
  STD_REMAINING_SELECTIONS_LBL: GUILabel;
  LB_FEATS: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_NAME: GUILabel;
  BTN_RECOMMENDED: GUIButton;
  BTN_SELECT: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'ftchrgen';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  Show() {
    super.Show();
    this.addGrantedFeats();
    this.LB_FEATS.GUIProtoItemClass = GUIFeatItem;
    this.LB_FEATS.clearItems();
    this.buildFeatList();
    TextureLoader.LoadQueue();
  }

  addGrantedFeats() {
    let feats = TwoDAManager.datatables.get('feat').rows;
    let featCount = TwoDAManager.datatables.get('feat').RowCount;
    let granted = [];
    for (let i = 0; i < featCount; i++) {
      let feat = feats[i];
      let character = GameState.getCurrentPlayer();
      let mainClass = character.getMainClass();
      if (feat.constant != '****') {
        if (mainClass.isFeatAvailable(feat)) {
          let status = mainClass.getFeatStatus(feat);
          if (status == 3 && character.getTotalClassLevel() >= mainClass.getFeatGrantedLevel(feat)) {
            if (!character.getHasFeat(feat.__index)) {
              console.log('Feat Granted', feat);
              character.addFeat(TalentFeat.From2DA(feat));
              granted.push(feat);
            }
          }
        }
      }
    }
  }

  buildFeatList() {
    let feats = TwoDAManager.datatables.get('feat').rows;
    let featCount = TwoDAManager.datatables.get('feat').RowCount;
    let list = [];
    let character = GameState.getCurrentPlayer();
    let mainClass = character.getMainClass();
    for (let i = 0; i < featCount; i++) {
      let feat = feats[i];
      if (feat.constant != '****') {
        if (mainClass.isFeatAvailable(feat)) {
          let status = mainClass.getFeatStatus(feat);
          if (character.getHasFeat(feat.__index) || status == 0 || status == 1) {
            list.push(feat);
          }
        }
      }
    }
    let groups = [];
    for (let i = 0; i < list.length; i++) {
      let feat = list[i];
      let group = [];
      let prereqfeat1 = TwoDAManager.datatables.get('feat').rows[feat.prereqfeat1];
      let prereqfeat2 = TwoDAManager.datatables.get('feat').rows[feat.prereqfeat2];
      if (!prereqfeat1 && !prereqfeat2) {
        group.push(feat);
        for (let j = 0; j < featCount; j++) {
          let chainFeat = feats[j];
          if (chainFeat.prereqfeat1 == feat.__index || chainFeat.prereqfeat2 == feat.__index) {
            if (chainFeat.prereqfeat1 != '****' && chainFeat.prereqfeat2 != '****') {
              group[2] = chainFeat;
            } else {
              group[1] = chainFeat;
            }
          }
        }
        this.LB_FEATS.addItem(group);
      }
      groups.push(group);
    }
    groups.sort((groupa, groupb) => groupa[0].toolscategories > groupb[0].toolscategories ? 1 : -1);
    console.log(groups);
  }
  
}

export class GUIFeatItem extends GUIProtoItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl = null, scale = false){
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

        let hasPrereqfeat1 = (feat.prereqfeat1 == '****' || GameState.getCurrentPlayer().getHasFeat(feat.prereqfeat1));
        let hasPrereqfeat2 = (feat.prereqfeat2 == '****' || GameState.getCurrentPlayer().getHasFeat(feat.prereqfeat2));
        let hasFeat = GameState.getCurrentPlayer().getHasFeat(feat.__index);

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

        TextureLoader.enQueue('lbl_indent', this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          buttonIcon.setMaterialTexture( buttonIcon.border.fill.material, texture);
          buttonIcon.border.fill.material.transparent = true;
          buttonIcon.setMaterialTexture( buttonIcon.highlight.fill.material, texture);
          buttonIcon.highlight.fill.material.transparent = true;
          if(locked){
            (buttonIcon.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = 0.25;
          }
        });

        buttonIcon.addEventListener('click', (e: any) => {
          e.stopPropagation();
        });

        /* FEAT ICON */

        this.widget.userData.iconMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
        this.widget.userData.iconSprite = new THREE.Sprite( this.widget.userData.iconMaterial );

        this.widget.userData.iconSprite.scale.x = 32;
        this.widget.userData.iconSprite.scale.y = 32;
        this.widget.userData.iconSprite.position.z = 5;
        this.widget.userData.iconSprite.renderOrder = 5;
        TextureLoader.enQueue(feat.icon, this.widget.userData.iconMaterial, TextureType.TEXTURE, (texture: OdysseyTexture) => {
          this.widget.userData.iconSprite.scale.x = texture.image.width;
          this.widget.userData.iconSprite.scale.y = texture.image.height;
          if(locked){
            this.widget.userData.iconMaterial.opacity = 0.25;
          }
          this.widget.userData.iconMaterial.transparent = true;
          this.widget.userData.iconMaterial.needsUpdate = true;
        });

        _buttonIconWidget.add(this.widget.userData.iconSprite);

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

          TextureLoader.enQueue('lbl_skarr', this.border.fill.material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
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

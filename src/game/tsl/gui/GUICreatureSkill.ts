import * as THREE from "three";

import { GameMenu, GUIButton, GUIControl, GUIListBox, GUIProtoItem } from "@/gui";
import { TextureLoader } from "@/loaders";
import { GFFStruct } from "@/resource/GFFStruct";
import type { TalentSkill } from "@/talents/TalentSkill";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

/**
 * GUICreatureSkill class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUICreatureSkill.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUICreatureSkill extends GUIProtoItem {

  declare node: TalentSkill;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.extent.height = 43.5;
  }

  buildFill(){}
  buildBorder(){}
  buildHighlight(){}
  buildText(){}

  createControl(){
    try{
      super.createControl();
      //Create the actual control elements below

      const spacing = 2;
      const protoWidth = this.extent.width;
      const protoHeight = this.extent.height - spacing;
      const iconWidth = this.extent.height - spacing;
      const iconHeight = this.extent.height - spacing;

      const labelWidth = protoWidth - iconWidth - this.parent.border.inneroffset;

      //Label
      const buttonLabel = new GUIButton(this.menu, this.control, this, this.scale);
      buttonLabel.extent.left = 0;
      buttonLabel.extent.width = labelWidth;
      buttonLabel.extent.height = protoHeight;
      buttonLabel.setText(this.node.getName() || '');
      buttonLabel.autoCalculatePosition = false;
      this.children.push(buttonLabel);

      const _buttonWidget = buttonLabel.createControl();
      _buttonWidget.position.x = (protoWidth - buttonLabel.extent.width) / 2;
      _buttonWidget.position.y = 0;
      _buttonWidget.position.z = this.zIndex + 1;
      this.widget.add(_buttonWidget);

      //Icon
      const buttonIcon = new GUIButton(this.menu, this.control, this, this.scale);
      buttonIcon.setText('');
      buttonIcon.disableTextAlignment();
      buttonIcon.extent.width = iconWidth;
      buttonIcon.extent.height = iconHeight;
      buttonIcon.extent.top = 0;
      buttonIcon.extent.left = 0;
      buttonIcon.disableBorder();
      buttonIcon.disableHighlight();
      buttonIcon.hasText = true;
      buttonIcon.autoCalculatePosition = false;
      this.children.push(buttonIcon);

      const _buttonIconWidget = buttonIcon.createControl();
      _buttonIconWidget.position.x = -(protoWidth/2 - buttonIcon.extent.width/2);
      _buttonIconWidget.position.y = 0;
      _buttonIconWidget.position.z = this.zIndex + 1;

      this.widget.add(_buttonIconWidget);

      const iconMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      iconMaterial.transparent = true;
      const iconSprite = new THREE.Sprite(iconMaterial);
      TextureLoader.Load(this.node.getIcon()).then((texture: OdysseyTexture) => {
        if(texture){
          iconMaterial.map = texture;
          iconMaterial.needsUpdate = true;
        }
      });

      const spriteGroup = new THREE.Group();
      //this.widget.spriteGroup.position.x = -(protoWidth/2)-(52/2); //HACK
      //this.widget.spriteGroup.position.y -= 4;
      iconSprite.scale.x = iconWidth * 0.5;
      iconSprite.scale.y = iconHeight * 0.5;
      iconSprite.position.z = 2;

      const hexMaterial = new THREE.SpriteMaterial({ map: null, color: 0xffffff });
      hexMaterial.transparent = true;
      const hexSprite = new THREE.Sprite(hexMaterial);
      hexSprite.scale.x = hexSprite.scale.y = iconWidth;
      hexSprite.position.z = 1;

      spriteGroup.add(hexSprite);
      spriteGroup.add(iconSprite);

      hexMaterial.map = GUIListBox.hexTextures.get('uibit_eqp_itm1');
      hexMaterial.needsUpdate = true;

      this.onSelect = () => {
        if(this.selected){
          this.showHighlight();
          this.hideBorder();
          this.pulsing = true;
          this.text.color.copy(this.defaultColor);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;

          buttonLabel.showHighlight();
          buttonLabel.hideBorder();
          hexMaterial.color.copy(this.defaultHighlightColor);
          buttonLabel.setHighlightColor(this.defaultHighlightColor.r, this.defaultHighlightColor.g, this.defaultHighlightColor.b);
          buttonLabel.pulsing = true;
          buttonIcon.pulsing = true;

          buttonLabel.text.color.copy(this.defaultHighlightColor);
          buttonLabel.text.material.uniforms.diffuse.value = buttonLabel.text.color;
          buttonLabel.text.material.needsUpdate = true;
        }else{
          this.hideHighlight();
          this.showBorder();
          this.pulsing = false;
          this.text.color.copy(this.defaultColor);
          this.text.material.uniforms.diffuse.value = this.text.color;
          this.text.material.needsUpdate = true;

          buttonLabel.hideHighlight();
          buttonLabel.showBorder();
          hexMaterial.color.copy(this.defaultColor);
          buttonLabel.setBorderColor(this.defaultColor.r, this.defaultColor.g, this.defaultColor.b);
          buttonLabel.pulsing = false;
          buttonIcon.pulsing = false;

          buttonLabel.text.color.copy(this.defaultColor);
          buttonLabel.text.material.uniforms.diffuse.value = buttonLabel.text.color;
          buttonLabel.text.material.needsUpdate = true;
        }
      };
      this.onSelect.call(this);

      //StackCount Text
      _buttonIconWidget.add(spriteGroup);
      return this.widget;
    }catch(e){
      log.error(e);
    }
    return this.widget;

  }

}

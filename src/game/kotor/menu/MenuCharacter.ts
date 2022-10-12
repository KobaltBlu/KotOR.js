/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, GUISlider } from "../../../gui";

/* @file
* The MenuCharacter menu class.
*/

export class MenuCharacter extends GameMenu {

  LBL_3DCHAR: GUILabel;
  BTN_3DCHAR: GUIButton;
  LBL_ADORN: GUILabel;
  SLD_ALIGN: GUISlider;
  LBL_STR: GUILabel;
  LBL_FORTITUDE_STAT: GUILabel;
  LBL_REFLEX_STAT: GUILabel;
  LBL_WILL_STAT: GUILabel;
  LBL_DEFENSE_STAT: GUILabel;
  LBL_FORCE_STAT: GUILabel;
  LBL_VITALITY_STAT: GUILabel;
  LBL_DEX: GUILabel;
  LBL_CON: GUILabel;
  LBL_INT: GUILabel;
  LBL_CHA: GUILabel;
  LBL_WIS: GUILabel;
  LBL_STR_MOD: GUILabel;
  LBL_DEX_MOD: GUILabel;
  LBL_CON_MOD: GUILabel;
  LBL_INT_MOD: GUILabel;
  LBL_WIS_MOD: GUILabel;
  LBL_CHA_MOD: GUILabel;
  LBL_CLASS1: GUILabel;
  LBL_EXPERIENCE_STAT: GUILabel;
  LBL_NAME: GUILabel;
  LBL_NEEDED_XP: GUILabel;
  LBL_STRENGTH: GUILabel;
  LBL_DEXTERITY: GUILabel;
  LBL_CONSTITUTION: GUILabel;
  LBL_INTELLIGENCE: GUILabel;
  LBL_CHARISMA: GUILabel;
  LBL_REFLEX: GUILabel;
  LBL_WILL: GUILabel;
  LBL_EXPERIENCE: GUILabel;
  LBL_NEXT_LEVEL: GUILabel;
  LBL_FORCE: GUILabel;
  LBL_VITALITY: GUILabel;
  LBL_DEFENSE: GUILabel;
  LBL_FORTITUDE: GUILabel;
  LBL_BEVEL: GUILabel;
  LBL_CLASS2: GUILabel;
  LBL_WISDOM: GUILabel;
  LBL_CLASS: GUILabel;
  LBL_LEVEL: GUILabel;
  LBL_LEVEL1: GUILabel;
  LBL_LEVEL2: GUILabel;
  LBL_GOOD1: GUIButton;
  LBL_GOOD2: GUIButton;
  LBL_GOOD3: GUIButton;
  LBL_GOOD4: GUIButton;
  LBL_GOOD5: GUIButton;
  LBL_GOOD6: GUIButton;
  LBL_GOOD7: GUIButton;
  LBL_GOOD8: GUIButton;
  LBL_GOOD9: GUIButton;
  LBL_GOOD10: GUIButton;
  LBL_BEVEL2: GUILabel;
  LBL_MORE: GUILabel;
  LBL_LIGHT: GUILabel;
  LBL_DARK: GUILabel;
  BTN_EXIT: GUIButton;
  BTN_SCRIPTS: GUIButton;
  BTN_AUTO: GUIButton;
  BTN_LEVELUP: GUIButton;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'character';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Update(delta = 0) {
  super.Update(delta);
  if (!this.bVisible)
    return;
  if (this.char)
    this.char.update(delta);
  try {
    this._3dView.render(delta);
  } catch (e: any) {
  }
}

updateCharacterStats(character) {
  this.LBL_CLASS1.hide();
  this.LBL_LEVEL1.hide();
  this.LBL_CLASS2.hide();
  this.LBL_LEVEL2.hide();
  if (character.classes[0]) {
    this.LBL_CLASS1.setText(character.classes[0].getName());
    this.LBL_LEVEL1.setText(character.classes[0].level);
    this.LBL_CLASS1.show();
    this.LBL_LEVEL1.show();
    this.LBL_CLASS1.extent.top = 98;
    this.LBL_CLASS1.recalculate();
  }
  if (character.classes[1]) {
    this.LBL_CLASS2.setText(character.classes[1].getName());
    this.LBL_LEVEL2.setText(character.classes[1].level);
    this.LBL_CLASS2.show();
    this.LBL_LEVEL2.show();
  }
  this.LBL_VITALITY_STAT.setText(character.getHP() + '/' + character.getMaxHP());
  this.LBL_FORCE_STAT.setText(character.getFP() + '/' + character.getMaxFP());
  this.LBL_DEFENSE_STAT.setText(character.getAC());
  this.LBL_STR.setText(character.getSTR());
  this.LBL_DEX.setText(character.getDEX());
  this.LBL_CON.setText(character.getCON());
  this.LBL_INT.setText(character.getINT());
  this.LBL_WIS.setText(character.getWIS());
  this.LBL_CHA.setText(character.getCHA());
  this.LBL_STR_MOD.setText(Math.floor((character.getSTR() - 10) / 2));
  this.LBL_DEX_MOD.setText(Math.floor((character.getDEX() - 10) / 2));
  this.LBL_CON_MOD.setText(Math.floor((character.getCON() - 10) / 2));
  this.LBL_INT_MOD.setText(Math.floor((character.getINT() - 10) / 2));
  this.LBL_WIS_MOD.setText(Math.floor((character.getWIS() - 10) / 2));
  this.LBL_CHA_MOD.setText(Math.floor((character.getCHA() - 10) / 2));
  this.LBL_EXPERIENCE_STAT.setText(character.experience.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  this.LBL_NEEDED_XP.setText(Global.kotor2DA.exptable.rows[character.getTotalClassLevel()].xp.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  if (character.canLevelUp()) {
    this.BTN_AUTO.show();
  } else {
    this.BTN_AUTO.hide();
  }
}

Show() {
  super.Show();
  GameState.MenuTop.LBLH_CHA.onHoverIn();
  this.RecalculatePosition();
  if (this.char) {
    this._3dViewModel.children[0].children[0].remove(this.char);
  }
  this._3dView.camera.position.z = 1;
  let objectCreature = new ModuleCreature();
  let clone = PartyManager.party[0];
  objectCreature.appearance = clone.appearance;
  if (clone.equipment.ARMOR) {
    objectCreature.equipment.ARMOR = new ModuleItem(clone.equipment.ARMOR.template);
  }
  if (clone.goodEvil >= 95) {
    this._3dViewModel.playAnimation('good');
  } else if (clone.goodEvil >= 90) {
    this._3dViewModel.playAnimation('align18');
  } else if (clone.goodEvil >= 85) {
    this._3dViewModel.playAnimation('align17');
  } else if (clone.goodEvil >= 80) {
    this._3dViewModel.playAnimation('align16');
  } else if (clone.goodEvil >= 75) {
    this._3dViewModel.playAnimation('align15');
  } else if (clone.goodEvil >= 70) {
    this._3dViewModel.playAnimation('align14');
  } else if (clone.goodEvil >= 65) {
    this._3dViewModel.playAnimation('align13');
  } else if (clone.goodEvil >= 60) {
    this._3dViewModel.playAnimation('align12');
  } else if (clone.goodEvil >= 55) {
    this._3dViewModel.playAnimation('align11');
  } else if (clone.goodEvil >= 50) {
    this._3dViewModel.playAnimation('align10');
  } else if (clone.goodEvil >= 45) {
    this._3dViewModel.playAnimation('align9');
  } else if (clone.goodEvil >= 40) {
    this._3dViewModel.playAnimation('align8');
  } else if (clone.goodEvil >= 35) {
    this._3dViewModel.playAnimation('align7');
  } else if (clone.goodEvil >= 30) {
    this._3dViewModel.playAnimation('align6');
  } else if (clone.goodEvil >= 25) {
    this._3dViewModel.playAnimation('align5');
  } else if (clone.goodEvil >= 20) {
    this._3dViewModel.playAnimation('align4');
  } else if (clone.goodEvil >= 15) {
    this._3dViewModel.playAnimation('align3');
  } else if (clone.goodEvil >= 10) {
    this._3dViewModel.playAnimation('align2');
  } else if (clone.goodEvil >= 5) {
    this._3dViewModel.playAnimation('align1');
  } else if (clone.goodEvil >= 0) {
    this._3dViewModel.playAnimation('evil');
  }
  objectCreature.LoadModel(model => {
    model.position.set(0, 0, 0);
    model.rotation.x = -Math.PI / 2;
    model.rotation.z = Math.PI;
    model.box = new THREE.Box3().setFromObject(model);
    this.char = model;
    this._3dViewModel.children[0].children[0].add(this.char);
    TextureLoader.LoadQueue(() => {
      if (clone.goodEvil >= 95) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 90) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 85) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 80) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 75) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 70) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 65) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 60) {
        this.char.playAnimation('good', true);
      } else if (clone.goodEvil >= 55) {
        this.char.playAnimation('neutral', true);
      } else if (clone.goodEvil >= 50) {
        this.char.playAnimation('neutral', true);
      } else if (clone.goodEvil >= 45) {
        this.char.playAnimation('neutral', true);
      } else if (clone.goodEvil >= 40) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 35) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 30) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 25) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 20) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 15) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 10) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 5) {
        this.char.playAnimation('evil', true);
      } else if (clone.goodEvil >= 0) {
        this.char.playAnimation('evil', true);
      }
    }, texName => {
    });
  });
  this.updateCharacterStats(PartyManager.party[0]);
  GameState.MenuActive = true;
  this['BTN_CHANGE1'].hide();
  this['BTN_CHANGE2'].hide();
  for (let i = 0; i < PartyManager.party.length; i++) {
    let partyMember = PartyManager.party[i];
    let portraitId = partyMember.getPortraitId();
    let portrait = Global.kotor2DA['portraits'].rows[portraitId];
    if (i) {
      this['BTN_CHANGE' + i].show();
      if (this['BTN_CHANGE' + i].getFillTextureName() != portrait.baseresref) {
        this['BTN_CHANGE' + i].setFillTextureName(portrait.baseresref);
        TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
          this['BTN_CHANGE' + i].setFillTexture(texture);
        });
      }
    }
  }
}

triggerControllerBumperLPress() {
  GameState.MenuTop.BTN_INV.click();
}

triggerControllerBumperRPress() {
  GameState.MenuTop.BTN_ABI.click();
}
  
}

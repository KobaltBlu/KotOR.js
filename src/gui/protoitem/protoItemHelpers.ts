import { GameEngineType } from "@/enums/engine";
import { GameState } from "@/GameState";
import { GUIListBox } from "@/gui/GUIListBox";
import type { GUIControl } from "@/gui/GUIControl";
import type { GUIButton } from "@/gui/GUIButton";
import { TextureType } from "@/enums/loaders/TextureType";
import { TextureLoader } from "@/loaders";
import type { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import * as THREE from "three";

/**
 * Stack-size → hex border texture (retail lbl_hex_* / uibit_eqp_itm*).
 */
export function getProtoItemHexTextureName(stackSize: number): string {
  const isK1 = GameState.GameKey == GameEngineType.KOTOR;
  if(stackSize >= 100){
    return isK1 ? 'lbl_hex_7' : 'uibit_eqp_itm3';
  }
  if(stackSize > 1){
    return isK1 ? 'lbl_hex_6' : 'uibit_eqp_itm2';
  }
  return isK1 ? 'lbl_hex_3' : 'uibit_eqp_itm1';
}

export function applyProtoItemHexMap(
  hexMaterial: THREE.SpriteMaterial | undefined,
  stackSize: number,
): void {
  if(!hexMaterial) return;
  hexMaterial.map = GUIListBox.hexTextures.get(getProtoItemHexTextureName(stackSize)) ?? null;
  hexMaterial.needsUpdate = true;
}

/**
 * Apply selected/idle chrome using theme defaultColor / defaultHighlightColor.
 */
export function applyProtoSelectVisuals(
  ctrl: GUIControl,
  selected: boolean,
  opts?: {
    buttonLabel?: GUIButton;
    buttonIcon?: GUIButton;
    hexMaterial?: THREE.SpriteMaterial;
  },
): void {
  const hi = ctrl.defaultHighlightColor;
  const lo = ctrl.defaultColor;

  if(selected){
    ctrl.showHighlight();
    ctrl.hideBorder();
    ctrl.pulsing = true;
    ctrl.text.color.copy(hi);
    if(ctrl.text.material?.uniforms?.diffuse){
      ctrl.text.material.uniforms.diffuse.value = ctrl.text.color;
      ctrl.text.material.needsUpdate = true;
    }

    if(opts?.buttonLabel){
      opts.buttonLabel.showHighlight();
      opts.buttonLabel.hideBorder();
      opts.buttonLabel.setHighlightColor(hi.r, hi.g, hi.b);
      opts.buttonLabel.pulsing = true;
      opts.buttonLabel.text.color.copy(hi);
      if(opts.buttonLabel.text.material?.uniforms?.diffuse){
        opts.buttonLabel.text.material.uniforms.diffuse.value = opts.buttonLabel.text.color;
        opts.buttonLabel.text.material.needsUpdate = true;
      }
    }
    if(opts?.buttonIcon){
      opts.buttonIcon.pulsing = true;
    }
    if(opts?.hexMaterial){
      opts.hexMaterial.color.copy(hi);
    }
  }else{
    ctrl.hideHighlight();
    ctrl.showBorder();
    ctrl.pulsing = false;
    ctrl.text.color.copy(lo);
    if(ctrl.text.material?.uniforms?.diffuse){
      ctrl.text.material.uniforms.diffuse.value = ctrl.text.color;
      ctrl.text.material.needsUpdate = true;
    }

    if(opts?.buttonLabel){
      opts.buttonLabel.hideHighlight();
      opts.buttonLabel.showBorder();
      opts.buttonLabel.setBorderColor(lo.r, lo.g, lo.b);
      opts.buttonLabel.pulsing = false;
      opts.buttonLabel.text.color.copy(lo);
      if(opts.buttonLabel.text.material?.uniforms?.diffuse){
        opts.buttonLabel.text.material.uniforms.diffuse.value = opts.buttonLabel.text.color;
        opts.buttonLabel.text.material.needsUpdate = true;
      }
    }
    if(opts?.buttonIcon){
      opts.buttonIcon.pulsing = false;
    }
    if(opts?.hexMaterial){
      opts.hexMaterial.color.copy(lo);
    }
  }
}

type TextureGateControl = GUIControl & {
  _beginTextureLoad: () => void;
  _endTextureLoad: () => void;
  invalidateListRtt: () => void;
};

/** K1 vs TSL ability-row chrome textures (CSWGuiSkillFlow). */
export function getAbilityBackTextureName(): string {
  return GameState.GameKey == GameEngineType.TSL ? 'uibit_abi_back' : 'lbl_indent';
}

export function getAbilityArrowTextureName(): string {
  return GameState.GameKey == GameEngineType.TSL ? 'uibit_abi_arrow' : 'lbl_skarr';
}

/** Retail SetSkillStatus locked/unavailable icon alpha (case 0 / 3). */
export const ABILITY_LOCKED_ICON_ALPHA = 0.25;

export function applyAbilityButtonTexture(
  buttonIcon: GUIButton,
  texture: OdysseyTexture | undefined,
  locked: boolean,
  lockedAlpha: number = ABILITY_LOCKED_ICON_ALPHA,
): void {
  if(!texture) return;
  buttonIcon.setMaterialTexture(buttonIcon.border.fill.material, texture);
  buttonIcon.border.fill.material.transparent = true;
  buttonIcon.setMaterialTexture(buttonIcon.highlight.fill.material, texture);
  buttonIcon.highlight.fill.material.transparent = true;
  if(locked){
    const fillMat = buttonIcon.getFill()?.material as THREE.ShaderMaterial | undefined;
    if(fillMat?.uniforms?.opacity){
      fillMat.uniforms.opacity.value = lockedAlpha;
    }
  }
}

/**
 * Queue an icon texture load with ListBox RTT publish gating.
 * Returns true if a load was started (or already in flight).
 */
export function enqueueProtoIconLoad(
  ctrl: TextureGateControl,
  iconName: string | undefined,
  iconMaterial: THREE.SpriteMaterial,
  startedFlag: { value: boolean },
): boolean {
  if(startedFlag.value){
    return true;
  }
  if(!iconName){
    ctrl.invalidateListRtt();
    return false;
  }
  startedFlag.value = true;
  ctrl._beginTextureLoad();
  TextureLoader.Load(iconName).then((texture: OdysseyTexture) => {
    if(texture){
      iconMaterial.map = texture;
      iconMaterial.needsUpdate = true;
      iconMaterial.visible = true;
    }
    ctrl._endTextureLoad();
  });
  return true;
}

/**
 * Wrap TextureLoader.enQueue with ListBox RTT publish gating.
 */
export function enqueueProtoTexture(
  ctrl: TextureGateControl,
  name: string,
  material: THREE.Material,
  onLoaded?: (texture: OdysseyTexture) => void,
): void {
  ctrl._beginTextureLoad();
  TextureLoader.enQueue(name, material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
    try{
      onLoaded?.(texture);
    }finally{
      ctrl._endTextureLoad();
    }
  });
}

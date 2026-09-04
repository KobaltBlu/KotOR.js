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

/** K1 vs TSL ability-row chrome textures (skill flow). */
export function getAbilityBackTextureName(): string {
  return GameState.GameKey == GameEngineType.TSL ? 'uibit_abi_back' : 'lbl_indent';
}

export function getAbilityArrowTextureName(): string {
  return GameState.GameKey == GameEngineType.TSL ? 'uibit_abi_arrow' : 'lbl_skarr';
}

/**
 * Retail SetSkillStatus status byte (K1 / TSL).
 * CharGen BuildButtons assigns these; in-game SetCharacter uses InGame (6) for all.
 */
export enum SkillFlowStatus {
  /** Available to pick — icon alpha 0.25; yellow border when selected. */
  Available = 0,
  /** Already owned — green border; border alpha 0.5 when not selected. */
  Owned = 1,
  /** Granted this level — same chrome as Owned. */
  Granted = 2,
  /** Locked / unmet prereqs — icon+arrow alpha 0.25; red border when selected. */
  Locked = 3,
  /**
   * Chosen this CharGen/level-up session (field / BuildButtons status 4).
   * Green border; Select button shows Remove Feat.
   */
  Chosen = 4,
  /** Partial / mid-chain visual — yellow-ish; arrow alpha 0.25. */
  Partial = 5,
  /** In-game abilities — border hidden unless selected (yellow pulse). */
  InGame = 6,
}

/** Retail SetSkillStatus locked/unavailable icon alpha (case 0 / 3 @ 0x3e800000). */
export const ABILITY_LOCKED_ICON_ALPHA = 0.25;

/** Retail SetSkillStatus case 1/2 unselected border_params.alpha. */
export const ABILITY_OWNED_BORDER_ALPHA = 0.5;

/** Retail colorYellow / COLOR_YELLOW. */
export const SKILL_FLOW_COLOR_YELLOW = { r: 0.980392, g: 1, b: 0 };
/** Retail colorGreen. */
export const SKILL_FLOW_COLOR_GREEN = { r: 0, g: 1, b: 0 };
/** Retail colorRed. */
export const SKILL_FLOW_COLOR_RED = { r: 1, g: 0, b: 0 };

export type SkillFlowSlotVisuals = {
  button: GUIButton;
  status: SkillFlowStatus | number;
  selected: boolean;
  iconMaterial?: THREE.SpriteMaterial;
  arrowButton?: GUIButton;
  /** True when this slot is mid/end (has a preceding arrow). */
  hasArrow?: boolean;
};

/**
 * Apply retail SetSkillStatus visuals for one feat/power slot.
 * Pass `chromeOnly: false` (default) for full status; use `alphasOnly` after
 * GUIControl.update so locked icon/fill alphas stick without killing pulse.
 */
export function applySkillFlowStatus(
  slot: SkillFlowSlotVisuals,
  opts?: { alphasOnly?: boolean },
): void {
  const { button, status, selected, iconMaterial, arrowButton, hasArrow } = slot;
  if(!button) return;

  const isTsl = GameState.GameKey == GameEngineType.TSL;
  const statusNum = status | 0;
  const alphasOnly = !!opts?.alphasOnly;

  // Defaults — full alpha, white chrome; selection flag drives pulse separately.
  let iconAlpha = 1;
  let arrowAlpha = 1;
  let borderAlpha = 1;
  let borderColor = { r: 1, g: 1, b: 1 };
  let showBorder = false;
  let pulse = false;

  switch(statusNum){
    case SkillFlowStatus.Available:
      iconAlpha = ABILITY_LOCKED_ICON_ALPHA;
      if(selected){
        borderColor = SKILL_FLOW_COLOR_YELLOW;
        showBorder = true;
        pulse = true;
      }
      break;
    case SkillFlowStatus.Owned:
    case SkillFlowStatus.Granted:
      borderColor = SKILL_FLOW_COLOR_GREEN;
      showBorder = true;
      if(selected){
        pulse = true;
        borderAlpha = 1;
      }else{
        borderAlpha = ABILITY_OWNED_BORDER_ALPHA;
      }
      break;
    case SkillFlowStatus.Locked:
      iconAlpha = ABILITY_LOCKED_ICON_ALPHA;
      arrowAlpha = ABILITY_LOCKED_ICON_ALPHA;
      if(selected){
        borderColor = SKILL_FLOW_COLOR_RED;
        showBorder = true;
        pulse = true;
      }
      break;
    case SkillFlowStatus.Chosen:
      borderColor = SKILL_FLOW_COLOR_GREEN;
      showBorder = true;
      if(selected) pulse = true;
      break;
    case SkillFlowStatus.Partial:
      if(selected){
        borderColor = SKILL_FLOW_COLOR_YELLOW;
        showBorder = true;
        pulse = true;
      }
      if(hasArrow) arrowAlpha = ABILITY_LOCKED_ICON_ALPHA;
      break;
    case SkillFlowStatus.InGame:
    default:
      // K1 case 6: border alpha 0 unless selected (yellow pulse).
      // TSL case 6: tint yellow when selected.
      if(selected){
        borderColor = SKILL_FLOW_COLOR_YELLOW;
        showBorder = true;
        pulse = true;
      }else{
        showBorder = false;
        borderAlpha = 0;
      }
      break;
  }

  if(iconMaterial){
    iconMaterial.transparent = true;
    iconMaterial.opacity = iconAlpha;
    iconMaterial.needsUpdate = true;
  }

  // Keep indent/back fill visible; dim only when locked (field alpha on case 3).
  const fillAlpha = statusNum === SkillFlowStatus.Locked
    ? ABILITY_LOCKED_ICON_ALPHA
    : 1;
  if(button.chrome?.material){
    button.chrome.material.transparent = true;
    button.chrome.material.uniforms.fillOpacity.value = fillAlpha;
    button.chrome.material.uniformsNeedUpdate = true;
  }

  if(arrowButton?.chrome?.material){
    arrowButton.chrome.material.transparent = true;
    arrowButton.chrome.material.uniforms.fillOpacity.value = arrowAlpha;
    arrowButton.chrome.material.uniformsNeedUpdate = true;
  }

  if(alphasOnly){
    // Owned-unselected uses border alpha 0.5; resetPulse would force 1.0.
    // Do not touch opacity while pulsing — MenuManager.pulseOpacity owns that.
    if(!pulse && showBorder){
      button.setChromeOpacity?.(borderAlpha, fillAlpha);
    }
    return;
  }

  button.pulsing = pulse;
  button.setBorderColor(borderColor.r, borderColor.g, borderColor.b);
  if(isTsl && selected){
    button.setFillColor?.(borderColor.r, borderColor.g, borderColor.b);
  }else if(isTsl){
    button.setFillColor?.(1, 1, 1);
  }

  if(showBorder){
    button.enableBorder?.();
    button.borderEnabled = true;
    button.setChromeOpacity?.(borderAlpha, fillAlpha);
  }else{
    button.disableBorder?.();
    button.borderEnabled = false;
  }
}

export function applyAbilityButtonTexture(
  buttonIcon: GUIButton,
  texture: OdysseyTexture | undefined,
  locked: boolean,
  lockedAlpha: number = ABILITY_LOCKED_ICON_ALPHA,
): void {
  if(!texture) return;
  buttonIcon.setFillTexture(texture);
  buttonIcon.setHighlightFillTexture(texture);
  if(buttonIcon.chrome?.material){
    buttonIcon.chrome.material.transparent = true;
  }
  if(locked){
    buttonIcon.setChromeOpacity?.(1, lockedAlpha);
  }
}

/** Resolve feat id from a TalentFeat / 2DA row. */
export function getFeatId(feat: { id?: number; __index?: number } | null | undefined): number {
  if(!feat) return -1;
  if(typeof feat.id === 'number' && Number.isFinite(feat.id)) return feat.id | 0;
  if(typeof feat.__index === 'number' && Number.isFinite(feat.__index)) return feat.__index | 0;
  return -1;
}

/** True when prereq feat id is unset (**** / -1 / 0xFFFFFFFF). */
export function isUnsetFeatPrereq(id: number | string | null | undefined): boolean {
  if(id == null || id === '****') return true;
  const n = typeof id === 'number' ? id : parseInt(String(id), 10);
  return !Number.isFinite(n) || n < 0 || n === 0xffffffff;
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
  uniformName?: string,
): void {
  ctrl._beginTextureLoad();
  TextureLoader.enQueue(name, material, TextureType.TEXTURE, (texture: OdysseyTexture) => {
    try{
      onLoaded?.(texture);
    }finally{
      ctrl._endTextureLoad();
    }
  }, undefined, uniformName);
}

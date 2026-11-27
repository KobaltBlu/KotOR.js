import type { Item } from "@engine/module/Item";

/**
 * Why an entry is greyed out. Clicking it shows the matching feedback line
 * (see ACTION_MENU_DISABLED_REASON_STRREF) instead of acting.
 */
export const ActionMenuDisabledReason = {
  NONE: 0,
  /** Not enough Force points. */
  FORCE_POINTS: 1,
  /** A worn item forbids the power. */
  FORBIDDEN_ITEM: 2,
  /** The power needs an item that is not worn. */
  REQUIRED_ITEM: 3,
  /** Target is inside the power's minimum range. */
  TOO_CLOSE: 4,
  /** Healing item while nobody it could heal is hurt. */
  NOT_INJURED: 5,
  /** The acting character is dead. */
  PC_DEAD: 6,
} as const;

/**
 * dialog.tlk lines shown when a greyed entry is clicked, by reason:
 * Force Depleted, Restricted by Armor, Missing Item, Target too Close,
 * Full Health, PC Dead.
 */
export const ACTION_MENU_DISABLED_REASON_STRREF: Record<number, number> = {
  1: 38613,
  2: 38614,
  3: 38615,
  4: 42422,
  5: 42498,
  6: 47936,
};

/**
 * ActionMenuItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionMenuItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionMenuItem {
  type = 0;
  target: any = undefined;
  action: any = undefined;
  talent: any = undefined;
  icon = '';
  item: Item;
  /** bit0: false → dimmed / inactive icon. */
  enabled: boolean = true;
  /** ActionMenuDisabledReason when greyed out. */
  disabledReason: number = ActionMenuDisabledReason.NONE;
  name: string = '';
  /**
   * Stable entry id the slot remembers its selection by (personal slots).
   * Items use their object id, powers their spell id, behaviors/forms/implants
   * their fixed codes.
   */
  id?: number;
  /** Stack size; the description reads "Name (N)" above 1. */
  stackSize: number = 1;
  /**
   * Picks a standing mode (behavior, form, implant). Scrolling only previews
   * it; leaving the slot without clicking snaps back to the active one.
   */
  isState: boolean = false;
  /** TSL GetBehaviors — ActionMenuSelectBehavior AISTATE value. */
  aiState?: number;
  /** TSL GetStances — ActionMenuForm spell id. */
  formId?: number;
  /** TSL swappable implant number (1–4). */
  implant?: number;

  constructor( props: any = {} ){
    props = Object.assign({
      action: undefined,
      talent: undefined,
      // Do not default to oTarget — self/force entries must stamp the caster
      // (GetSelfForcePowers). Missing target falls through to activateMenuItem.
      target: undefined,
      icon: '',
      item: undefined,
      enabled: true,
      disabledReason: ActionMenuDisabledReason.NONE,
      name: '',
      id: undefined,
      stackSize: 1,
      isState: false,
      aiState: undefined,
      formId: undefined,
      implant: undefined,
    }, props);
    this.action = props.action;
    this.talent = props.talent;
    this.icon = props.icon;
    this.target = props.target;
    this.item = props.item;
    this.enabled = props.enabled !== false;
    this.disabledReason = props.disabledReason | 0;
    this.name = props.name || '';
    this.id = typeof props.id === 'number' ? props.id : undefined;
    this.stackSize = Math.max(1, props.stackSize | 0);
    this.isState = !!props.isState;
    this.aiState = props.aiState;
    this.formId = props.formId;
    this.implant = props.implant;
  }

}

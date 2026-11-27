import { Action } from "@engine/actions/Action";
import { isInUseRange, queueMoveIntoUseRange } from "@engine/actions/use-range";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { DiceType } from "@core/enums/combat/DiceType";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { SkillType } from "@core/enums/nwscript/SkillType";
import { GameState } from "@engine/runtime/GameState";
import type { Item } from "@engine/module/Item";
import type { GameObject } from "@engine/module/GameObject";
import { Dice } from "@core/utility/Dice";

import { isCreature } from "@engine/module/guards/isCreature";
import { isItem } from "@engine/module/guards/isItem";

/** PlayAnimation id for heal (0x2721). */
const HEAL_ANIM = 0x2721;
/** EffectVisualEffect int0 for heal impact. */
const HEAL_VFX = 0x3e9;
/** BroadcastSkillData skill-broadcast id used by the heal action. */
const HEAL_SKILL_BROADCAST_ID = 0x14a;

/**
 * ActionHeal — heal / medpac / repair-kit action.
 *
 * Params:
 * 0 - dword: oTarget (target creature object id to heal)
 * 1 - dword: oItem (medpac / repair kit item object id)
 * 2 - int: nRequeueScratch (internal requeue scratch pad)
 * 3 - int: bAllowMove (1 = move into use range allowed, cleared to 0 on requeue)
 *
 * Repair kits also enqueue this action (TalentSkill); skill remains Treat Injury
 * per GetSkillRank(7).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionHeal.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionHeal extends Action {

  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionHeal;

    //PARAMS
    // 0 - dword: oTarget (target creature object id to heal)
    // 1 - dword: oItem (medpac / repair kit item object id)
    // 2 - int: nRequeueScratch (internal requeue scratch pad)
    // 3 - int: bAllowMove (1 = move into use range allowed, cleared to 0 on requeue)
  }

  update(_delta: number = 0): ActionStatus {
    if (!isCreature(this.owner)) {
      return ActionStatus.ERROR;
    }

    if (this.owner.isDead() || this.owner.isDebilitated()) {
      this.animQueued = false;
      return ActionStatus.ERROR;
    }

    this.target = this.getParameter<GameObject>(0);
    const item = this.getParameter<Item>(1);
    const allowMove = this.getParameter<number>(3) !== 0;

    if (!isCreature(this.target)) {
      this.animQueued = false;
      return ActionStatus.ERROR;
    }
    if (!isItem(item)) {
      this.animQueued = false;
      return ActionStatus.ERROR;
    }

    if (!isInUseRange(this.owner, this.target)) {
      if (!allowMove) {
        this.animQueued = false;
        return ActionStatus.ERROR;
      }
      // clears bAllowMove on requeue; keep same instance behind Move.
      this.setParameter(3, ActionParameterType.INT, 0);
      const face = new GameState.ActionFactory.ActionChangeFacingObject(undefined, this.groupId);
      face.setParameter(0, ActionParameterType.DWORD, this.target);
      this.owner.actionQueue.addFront(face);
      queueMoveIntoUseRange(this.owner, this.target, this.groupId);
      return ActionStatus.IN_PROGRESS;
    }

    this.owner.setFacingObject(this.target);

    if (!this.animQueued) {
      this.animQueued = true;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, HEAL_ANIM);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 2.0);
      this.owner.actionQueue.addFront(playAnim);
      return ActionStatus.IN_PROGRESS;
    }

    // always GetSkillRank(7 /* Treat Injury */, target)
    const skillRank = this.owner.getSkillLevel(SkillType.TREAT_INJURY) | 0;
    let roll = Dice.roll(1, DiceType.d20);
    // auto-20 cheat — no JS hook yet; leave natural roll.
    const autoFlag = 0;

    const poisonOrDisease = this.target.effects.find(
      (e) => e.type === GameEffectType.EffectPoison || e.type === GameEffectType.EffectDisease,
    );

    let dc = 0;
    if (poisonOrDisease) {
      dc = resolvePoisonDiseaseDC(poisonOrDisease);
      if (roll + skillRank >= dc) {
        this.target.removeEffect(poisonOrDisease);
      }
    } else {
      // Feedback 0x37 before full-HP gate
      GameState.FeedbackMessageManager?.SendFeedbackMessage?.(0x37);
      if (this.target.getHP() >= this.target.getMaxHP()) {
        GameState.FeedbackMessageManager?.SendFeedbackMessage?.(0x38);
        this.animQueued = false;
        return ActionStatus.ERROR;
      }
    }

    const total = roll + skillRank;
    let result = 1;
    if (poisonOrDisease && total < dc) {
      result = autoFlag ? 3 : 0;
    } else if (!poisonOrDisease) {
      result = 1;
    }

    GameState.FeedbackMessageManager?.BroadcastSkillData?.({
      skillBroadcastId: HEAL_SKILL_BROADCAST_ID,
      roll,
      rank: skillRank,
      dc,
      autoFlag,
      result,
    });

    const inventory = this.owner.getInventory();
    if (!GameState.infiniteUses && inventory.includes(item)) {
      const stack = item.getStackSize();
      if (stack <= 1) {
        const idx = inventory.indexOf(item);
        if (idx >= 0) {
          inventory.splice(idx, 1);
        }
        item.destroy();
      } else {
        item.setStackSize(stack - 1);
      }
    }

    const healEffect = new GameState.GameEffectFactory.EffectHeal();
    healEffect.setCreator(this.owner);
    healEffect.setInt(0, total);
    this.target.addEffect(healEffect);

    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setCreator(this.owner);
    vfx.setInt(0, HEAL_VFX);
    this.target.addEffect(vfx);

    this.animQueued = false;
    return ActionStatus.COMPLETE;
  }

}

function resolvePoisonDiseaseDC(effect: { type: number; getInt?: (n: number) => number }): number {
  const rowId = effect.getInt?.(0) | 0;
  const tables = GameState.TwoDAManager?.datatables;
  if (effect.type === GameEffectType.EffectPoison) {
    const table = tables?.get("poison") || tables?.get("Poison");
    const row = table?.getByID?.(rowId) || table?.rows?.[rowId];
    const raw = parseInt(String(row?.save_dc ?? row?.Save_DC ?? "1"), 10);
    return Math.max(1, Number.isFinite(raw) ? raw : 1);
  }
  if (effect.type === GameEffectType.EffectDisease) {
    const table = tables?.get("disease") || tables?.get("Disease");
    const row = table?.getByID?.(rowId) || table?.rows?.[rowId];
    const raw = parseInt(String(row?.subs_save ?? row?.Subs_Save ?? "1"), 10);
    return Math.max(1, Number.isFinite(raw) ? raw : 1);
  }
  return 1;
}

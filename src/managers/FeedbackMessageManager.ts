import type { INIConfig } from "@/engine/INIConfig";
import { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { FeedbackOption } from "@/enums/engine/FeedbackOption";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import { TextSprite3DType } from "@/enums/engine/TextSprite3DType";
import { TextSprite3D } from "@/engine/TextSprite3D";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module";
import { formatTlkWithCustoms } from "@/utility/tlk-tokens";

/**
 * FeedbackMessageManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file FeedbackMessageManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FeedbackMessageManager {

  static INIConfig: INIConfig;

  static FeedbackOptions = {
    HideUnequippable: false,
    TutorialPopups: true,
    Subtitles: true,
    MiniMap: true,
    FloatingNumbers: true,
    StatusSummary: true,
    HideQuickMenuButtons: false,
    UseSmallFonts: false,
    EnableToolTips: true,
  }

  static Entries: FeedbackMessageEntry[] = [];

  /**
   * Retail SuppressStatusSummaryEntry — next N AddEntry calls are dropped.
   * Replace (not accumulate); 0 clears.
   */
  static suppressStatusSummaryCount: number = 0;

  static Init(){
    console.log('FeedbackMessageManager.Init');
    this.FeedbackOptions.HideUnequippable = this.INIConfig.getProperty('Game Options.Hide Unequippable') == 1;
    this.FeedbackOptions.TutorialPopups = this.INIConfig.getProperty('Game Options.Tutorial Popups') == 1;
    this.FeedbackOptions.Subtitles = this.INIConfig.getProperty('Game Options.Subtitles') == 1;
    this.FeedbackOptions.MiniMap = this.INIConfig.getProperty('Game Options.Mini Map') == 1;
    this.FeedbackOptions.FloatingNumbers = this.INIConfig.getProperty('Game Options.Floating Numbers') == 1;
    this.FeedbackOptions.StatusSummary = this.INIConfig.getProperty('Game Options.Status Summary') == 1;
    this.FeedbackOptions.HideQuickMenuButtons = this.INIConfig.getProperty('Game Options.Hide InGame GUI') == 1;
    this.FeedbackOptions.UseSmallFonts = this.INIConfig.getProperty('Game Options.Use Small Fonts') == 1;
    this.FeedbackOptions.EnableToolTips = this.INIConfig.getProperty('Game Options.Enable Tooltips') == 1;
  }

  static AddEntry(entry: FeedbackMessageEntry, opts?: { bypassStatusSummary?: boolean }){
    if(this.suppressStatusSummaryCount > 0){
      this.suppressStatusSummaryCount--;
      return;
    }
    if(!opts?.bypassStatusSummary && !this.GetFeedbackTypeEnabled(FeedbackOption.StatusSummary)){
      return;
    }
    FeedbackMessageManager.Entries.push(entry);
  }

  /**
   * Append a resolved string to the Messages feedback buffer.
   * Status Summary gated unless `bypassStatusSummary` (e.g. SendMessageToPC).
   */
  static AddMessage(
    message: string,
    color: FeebackMessageColor = FeebackMessageColor.INFO,
    type: number = 0,
    opts?: { bypassStatusSummary?: boolean },
  ){
    if(!message) return;
    const entry = new FeedbackMessageEntry();
    entry.message = message;
    entry.color = color;
    entry.type = type;
    this.AddEntry(entry, opts);
  }

  /**
   * Append a TLK string (with optional &lt;CUSTOM*&gt; tokens) to the Messages buffer.
   */
  static AddStrRef(strRef: number, customs: string[] = [], color: FeebackMessageColor = FeebackMessageColor.INFO){
    const message = formatTlkWithCustoms(strRef, customs);
    this.AddMessage(message, color);
  }

  /**
   * Retail CSWSCreature::SendFeedbackMessage @ 004ede10 → client
   * CClientExoAppInternal::AddFeedbackMessage @ 005fcd10.
   * Simple IDs map to GetGUIString / TLK indices (case N → TLK).
   */
  static readonly FEEDBACK_TLK: Readonly<Record<number, number>> = {
    0: 0x59b,
    7: 0x595,   // CounterSpell OOR (out of combat)
    0xb: 0x59e,
    0xe: 0x596,
    0xf: 0x597,
    0x10: 0x598,
    // 0xd = already-locked etc. needs object context — callers use dedicated paths
  };

  /**
   * Send a retail combat/action feedback message by ID.
   * @param feedbackId ushort passed to SendFeedbackMessage
   */
  static SendFeedbackMessage(
    feedbackId: number,
    color: FeebackMessageColor = FeebackMessageColor.INFO
  ){
    const tlk = this.FEEDBACK_TLK[feedbackId | 0];
    if(tlk == null){
      this.AddMessage(`Feedback ${feedbackId | 0}`, color, feedbackId | 0);
      return;
    }
    this.AddStrRef(tlk, [], color);
  }

  /**
   * Retail DisplayFeedBackText — FeedBackText.2da row → floaty + status summary.
   * Rows: 0 Resisted, 1 Immune, 2 Saved.
   */
  static DisplayFeedBackText(target: ModuleObject | undefined, textConstant: number){
    if(!target) return;

    const table =
      GameState.TwoDAManager.datatables.get('feedbacktext') ||
      GameState.TwoDAManager.datatables.get('FeedBackText');
    if(!table) return;

    const row =
      table.getByID?.(textConstant) ||
      table.getRowByIndex?.(textConstant) ||
      table.rows?.[textConstant];
    if(!row) return;

    const strRef = parseInt(String(row.strref ?? row.StrRef ?? ''), 10);
    if(!Number.isFinite(strRef) || strRef < 0) return;

    const text =
      GameState.TLKManager.GetStringById(strRef)?.getDisplayText?.() ||
      GameState.TLKManager.GetStringById(strRef)?.Value ||
      '';
    if(!text) return;

    if(this.GetFeedbackTypeEnabled(FeedbackOption.FloatingNumbers)){
      TextSprite3D.CreateOnObject(target, text, TextSprite3DType.INFORMATION, 1500);
    }

    this.AddMessage(text, FeebackMessageColor.INFO);
  }

  /**
   * Retail FloatingTextStrRefOnCreature / FloatingTextStringOnCreature (simplified).
   * Floaty above the creature and Messages-buffer line.
   */
  static FloatingTextOnCreature(
    text: string,
    creature: ModuleObject | undefined,
    _broadcastToFaction: boolean = false,
    color: FeebackMessageColor = FeebackMessageColor.INFO,
  ){
    if(!creature || !text) return;

    if(this.GetFeedbackTypeEnabled(FeedbackOption.FloatingNumbers)){
      TextSprite3D.CreateOnObject(creature, text, TextSprite3DType.INFORMATION, 1500);
    }
    this.AddMessage(text, color);
  }

  static FloatingTextStrRefOnCreature(
    strRef: number,
    creature: ModuleObject | undefined,
    broadcastToFaction: boolean = false,
    customs: string[] = [],
  ){
    const text = formatTlkWithCustoms(strRef, customs);
    this.FloatingTextOnCreature(text, creature, broadcastToFaction);
  }

  /** Retail SuppressStatusSummaryEntry — replace, do not accumulate. */
  static SuppressStatusSummaryEntry(count: number){
    this.suppressStatusSummaryCount = Math.max(0, count | 0);
  }

  static ClearEntries(){
    FeedbackMessageManager.Entries = [];
  }

  static GetFeedbackTypeEnabled(type: FeedbackOption){
    switch(type){
      case FeedbackOption.HideUnequippable:
        return this.FeedbackOptions.HideUnequippable;
      case FeedbackOption.TutorialPopups:
        return this.FeedbackOptions.TutorialPopups;
      case FeedbackOption.Subtitles:
        return this.FeedbackOptions.Subtitles;
      case FeedbackOption.MiniMap:
        return this.FeedbackOptions.MiniMap;
      case FeedbackOption.FloatingNumbers:
        return this.FeedbackOptions.FloatingNumbers;
      case FeedbackOption.StatusSummary:
        return this.FeedbackOptions.StatusSummary;
      case FeedbackOption.HideQuickMenuButtons:
        return this.FeedbackOptions.HideQuickMenuButtons;
      case FeedbackOption.UseSmallFonts:
        return this.FeedbackOptions.UseSmallFonts;
      case FeedbackOption.EnableToolTips:
        return this.FeedbackOptions.EnableToolTips;
    }
    return false;
  }

  static SetFeedbackTypeEnabled(type: FeedbackOption, value: boolean){
    switch(type){
      case FeedbackOption.HideUnequippable:
        this.FeedbackOptions.HideUnequippable = value;
      break;
      case FeedbackOption.TutorialPopups:
        this.FeedbackOptions.TutorialPopups = value;
      break;
      case FeedbackOption.Subtitles:
        this.FeedbackOptions.Subtitles = value;
      break;
      case FeedbackOption.MiniMap:
        this.FeedbackOptions.MiniMap = value;
        // Retail OnMiniMap → CGuiInGame::InitializeMap
        GameState.MenuManager?.InGameOverlay?.updateMiniMapVisibility?.();
      break;
      case FeedbackOption.FloatingNumbers:
        this.FeedbackOptions.FloatingNumbers = value;
      break;
      case FeedbackOption.StatusSummary:
        this.FeedbackOptions.StatusSummary = value;
      break;
      case FeedbackOption.HideQuickMenuButtons:
        this.FeedbackOptions.HideQuickMenuButtons = value;
      break;
      case FeedbackOption.UseSmallFonts:
        this.FeedbackOptions.UseSmallFonts = value;
      break;
      case FeedbackOption.EnableToolTips:
        this.FeedbackOptions.EnableToolTips = value;
      break;
    }
  }

}

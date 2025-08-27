import type { INIConfig } from "../engine/INIConfig";
import { FeedbackMessageEntry } from "../engine/FeedbackMessageEntry";
import { FeedbackOption } from "../enums/engine/FeedbackOption";

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
    EnableToolTips: true,
  }
  
  static Entries: FeedbackMessageEntry[] = [];

  static Init(){
    console.log('FeedbackMessageManager.Init');
    this.FeedbackOptions.HideUnequippable = this.INIConfig.getProperty('Game Options.Hide Unequippable') == 1;
    this.FeedbackOptions.TutorialPopups = this.INIConfig.getProperty('Game Options.Tutorial Popups') == 1;
    this.FeedbackOptions.Subtitles = this.INIConfig.getProperty('Game Options.Subtitles') == 1;
    this.FeedbackOptions.MiniMap = this.INIConfig.getProperty('Game Options.Mini Map') == 1;
    this.FeedbackOptions.FloatingNumbers = this.INIConfig.getProperty('Game Options.Floating Numbers') == 1;
    this.FeedbackOptions.StatusSummary = this.INIConfig.getProperty('Game Options.Status Summary') == 1;
    this.FeedbackOptions.HideQuickMenuButtons = this.INIConfig.getProperty('Game Options.Hide InGame GUI') == 1;
    this.FeedbackOptions.EnableToolTips = this.INIConfig.getProperty('Game Options.Enable Tooltips') == 1;
  }

  static AddEntry(entry: FeedbackMessageEntry){
    FeedbackMessageManager.Entries.push(entry);
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
      case FeedbackOption.EnableToolTips:
        this.FeedbackOptions.EnableToolTips = value;
      break;
    }
  }

}
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";

export const GetSubScreenID = defineAction({
  id: 53,
  name: "GetSubScreenID",
  comment: "53: Return the ID of the subscreen currently onscreen.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuEquipment).length) return 1;
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuInventory).length) return 2;
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuCharacter).length) return 3;
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuAbilities).length) return 4;
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuMap).length) return 5;
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuJournal).length) return 6;
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuOptions).length) return 7;
    if (GameState.MenuManager.activeMenus.filter((menu) => menu === GameState.MenuManager.MenuMessages).length) return 8;
    return 0;
  },
});

export const ShowUpgradeScreen = defineAction({
  id: 354,
  name: "ShowUpgradeScreen",
  comment: "354: Display the upgrade screen where the player can modify weapons and armor.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oCharacter", { availability: "tsl", optional: true, default: undefined }),
    intParam("bDisableItemCreation", { availability: "tsl", optional: true, default: 0 }),
    intParam("bDisableUpgrade", { availability: "tsl", optional: true, default: 0 }),
    stringParam("sUpgradeType", { availability: "tsl", optional: true, default: "" }),
  ] as const,
  kotor(this: NWScriptInstance, oItem, oCharacter, bDisableItemCreation, bDisableUpgrade, sUpgradeType) {
    GameState.MenuManager.MenuUpgradeSelect.open();
  },
});

export const ShowChemicalUpgradeScreen = defineAction({
  availability: "tsl",
  id: 773,
  name: "ShowChemicalUpgradeScreen",
  comment: "773: Start the GUI for Chemical Workshop.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject | undefined>("oCharacter", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, oCharacter) {
    GameState.MenuManager.MenuChemicals.open();
  },
});

export const RevealMap = defineAction({
  id: 515,
  name: "RevealMap",
  comment: "515: Reveal the map at the given WORLD point with a map grid radius.",
  returnType: NWScriptDataType.VOID,
  params: [
    vectorParam<{ x: number; y: number; z: number }>("vPoint"),
    intParam("nRadius", { optional: true, default: -1 }),
  ] as const,
  kotor(this: NWScriptInstance, vPoint, nRadius) {
    GameState.module.area.areaMap.revealPosition(vPoint.x, vPoint.y, nRadius);
  },
});

export const SetTutorialWindowsEnabled = defineAction({
  id: 516,
  name: "SetTutorialWindowsEnabled",
  comment: "516: Set whether or not tutorial windows are enabled.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("bEnabled")] as const,
});

export const ShowTutorialWindow = defineAction({
  id: 517,
  name: "ShowTutorialWindow",
  comment: "517: Pop up the specified tutorial window.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nWindow")] as const,
  kotor(this: NWScriptInstance, nWindow) {
    switch (nWindow) {
      case 2:
        GameState.MenuManager.InGameConfirm.ShowTutorialMessage(42);
        break;
      case 0:
        GameState.MenuManager.InGameConfirm.ShowTutorialMessage(9);
        break;
      default:
        break;
    }
  },
  tsl(this: NWScriptInstance, nWindow) {
    GameState.MenuManager.InGameConfirm.ShowTutorialMessage(nWindow);
  },
});

export const ShowPartySelectionGUI = defineAction({
  id: 712,
  name: "ShowPartySelectionGUI",
  comment: "712: Bring up the party selection GUI.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sExitScript"),
    intParam("nForceNPC1", { optional: true, default: -1 }),
    intParam("nForceNPC2", { optional: true, default: -1 }),
    intParam("bAllowCancel", { availability: "tsl", optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, sExitScript, nForceNPC1, nForceNPC2, _bAllowCancel) {
    GameState.MenuManager.MenuPartySelection.ignoreUnescapable = true;
    GameState.MenuManager.MenuPartySelection.open(sExitScript, nForceNPC1, nForceNPC2);
  },
});

export const uiActions = [
  GetSubScreenID,
  ShowUpgradeScreen,
  ShowChemicalUpgradeScreen,
  RevealMap,
  SetTutorialWindowsEnabled,
  ShowTutorialWindow,
  ShowPartySelectionGUI,
] as const;

export * from "@/nwscript/builtins/actionBuilder";
export * from "@/nwscript/builtins/audio";
export * from "@/nwscript/builtins/combat";
export * from "@/nwscript/builtins/core";
export * from "@/nwscript/builtins/creatures";
export * from "@/nwscript/builtins/dialog";
export * from "@/nwscript/builtins/dice";
export * from "@/nwscript/builtins/doorsplaceables";
export * from "@/nwscript/builtins/effectManagement";
export * from "@/nwscript/builtins/effects";
export * from "@/nwscript/builtins/effectsLegacy";
export * from "@/nwscript/builtins/encounters";
export * from "@/nwscript/builtins/events";
export * from "@/nwscript/builtins/faction";
export * from "@/nwscript/builtins/galaxy";
export * from "@/nwscript/builtins/globals";
export * from "@/nwscript/builtins/items";
export * from "@/nwscript/builtins/itemsLegacy";
export * from "@/nwscript/builtins/journal";
export * from "@/nwscript/builtins/k2special";
export * from "@/nwscript/builtins/localvars";
export * from "@/nwscript/builtins/mathString";
export * from "@/nwscript/builtins/minigame";
export * from "@/nwscript/builtins/miscLegacy";
export * from "@/nwscript/builtins/missing";
export * from "@/nwscript/builtins/movement";
export * from "@/nwscript/builtins/objects";
export * from "@/nwscript/builtins/party";
export * from "@/nwscript/builtins/perception";
export * from "@/nwscript/builtins/scripting";
export * from "@/nwscript/builtins/talents";
export * from "@/nwscript/builtins/traps";
export * from "@/nwscript/builtins/ui";
export * from "@/nwscript/builtins/video";
export * from "@/nwscript/builtins/world";

import { audioActions } from "@/nwscript/builtins/audio";
import { combatActions } from "@/nwscript/builtins/combat";
import { coreActions } from "@/nwscript/builtins/core";
import { creaturesActions } from "@/nwscript/builtins/creatures";
import { dialogActions } from "@/nwscript/builtins/dialog";
import { diceActions } from "@/nwscript/builtins/dice";
import { doorsplaceablesActions } from "@/nwscript/builtins/doorsplaceables";
import { effectManagementActions } from "@/nwscript/builtins/effectManagement";
import { effectsActions } from "@/nwscript/builtins/effects";
import { effectsLegacyActions } from "@/nwscript/builtins/effectsLegacy";
import { encountersActions } from "@/nwscript/builtins/encounters";
import { eventsActions } from "@/nwscript/builtins/events";
import { factionActions } from "@/nwscript/builtins/faction";
import { galaxyActions } from "@/nwscript/builtins/galaxy";
import { globalsActions } from "@/nwscript/builtins/globals";
import { itemsActions } from "@/nwscript/builtins/items";
import { itemsLegacyActions } from "@/nwscript/builtins/itemsLegacy";
import { journalActions } from "@/nwscript/builtins/journal";
import { k2specialActions } from "@/nwscript/builtins/k2special";
import { localvarsActions } from "@/nwscript/builtins/localvars";
import { mathStringActions } from "@/nwscript/builtins/mathString";
import { minigameActions } from "@/nwscript/builtins/minigame";
import { miscLegacyActions } from "@/nwscript/builtins/miscLegacy";
import { missingActions } from "@/nwscript/builtins/missing";
import { movementActions } from "@/nwscript/builtins/movement";
import { objectsActions } from "@/nwscript/builtins/objects";
import { partyActions } from "@/nwscript/builtins/party";
import { perceptionActions } from "@/nwscript/builtins/perception";
import { scriptingActions } from "@/nwscript/builtins/scripting";
import { talentsActions } from "@/nwscript/builtins/talents";
import { trapsActions } from "@/nwscript/builtins/traps";
import { uiActions } from "@/nwscript/builtins/ui";
import { videoActions } from "@/nwscript/builtins/video";
import { worldActions } from "@/nwscript/builtins/world";

export const authoredActions = [
  ...coreActions,
  ...mathStringActions,
  ...diceActions,
  ...dialogActions,
  ...effectsActions,
  ...effectsLegacyActions,
  ...effectManagementActions,
  ...objectsActions,
  ...itemsActions,
  ...itemsLegacyActions,
  ...audioActions,
  ...globalsActions,
  ...partyActions,
  ...miscLegacyActions,
  ...missingActions,
  ...movementActions,
  ...combatActions,
  ...talentsActions,
  ...factionActions,
  ...minigameActions,
  ...localvarsActions,
  ...uiActions,
  ...videoActions,
  ...galaxyActions,
  ...k2specialActions,
  ...worldActions,
  ...creaturesActions,
  ...encountersActions,
  ...doorsplaceablesActions,
  ...journalActions,
  ...scriptingActions,
  ...eventsActions,
  ...perceptionActions,
  ...trapsActions,
] as const;

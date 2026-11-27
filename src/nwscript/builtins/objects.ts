export * from "@/nwscript/builtins/objects/query";
export * from "@/nwscript/builtins/objects/control";
export * from "@/nwscript/builtins/objects/conversation";
export * from "@/nwscript/builtins/objects/relations";
export * from "@/nwscript/builtins/objects/lifecycle";
export * from "@/nwscript/builtins/objects/perception";
export * from "@/nwscript/builtins/objects/spellcasting";
export * from "@/nwscript/builtins/objects/animation";
export * from "@/nwscript/builtins/objects/combat";
export * from "@/nwscript/builtins/objects/skills";
export * from "@/nwscript/builtins/objects/inventory";
export * from "@/nwscript/builtins/objects/interaction";
export * from "@/nwscript/builtins/objects/effects";
export * from "@/nwscript/builtins/objects/economy";
export * from "@/nwscript/builtins/objects/equipment";
export * from "@/nwscript/builtins/objects/progression";
export * from "@/nwscript/builtins/objects/minigame";
export * from "@/nwscript/builtins/objects/feedback";
export * from "@/nwscript/builtins/objects/module";
export * from "@/nwscript/builtins/objects/party";

import { queryObjectActions } from "@/nwscript/builtins/objects/query";
import { controlObjectActions } from "@/nwscript/builtins/objects/control";
import { conversationObjectActions } from "@/nwscript/builtins/objects/conversation";
import { relationsObjectActions } from "@/nwscript/builtins/objects/relations";
import { lifecycleObjectActions } from "@/nwscript/builtins/objects/lifecycle";
import { perceptionObjectActions } from "@/nwscript/builtins/objects/perception";
import { spellcastingObjectActions } from "@/nwscript/builtins/objects/spellcasting";
import { animationObjectActions } from "@/nwscript/builtins/objects/animation";
import { combatObjectActions } from "@/nwscript/builtins/objects/combat";
import { skillsObjectActions } from "@/nwscript/builtins/objects/skills";
import { inventoryObjectActions } from "@/nwscript/builtins/objects/inventory";
import { interactionObjectActions } from "@/nwscript/builtins/objects/interaction";
import { effectsObjectActions } from "@/nwscript/builtins/objects/effects";
import { economyObjectActions } from "@/nwscript/builtins/objects/economy";
import { equipmentObjectActions } from "@/nwscript/builtins/objects/equipment";
import { progressionObjectActions } from "@/nwscript/builtins/objects/progression";
import { minigameObjectActions } from "@/nwscript/builtins/objects/minigame";
import { feedbackObjectActions } from "@/nwscript/builtins/objects/feedback";
import { moduleObjectActions } from "@/nwscript/builtins/objects/module";
import { partyObjectActions } from "@/nwscript/builtins/objects/party";

export const objectsActions = [
  ...queryObjectActions,
  ...controlObjectActions,
  ...conversationObjectActions,
  ...relationsObjectActions,
  ...lifecycleObjectActions,
  ...perceptionObjectActions,
  ...spellcastingObjectActions,
  ...animationObjectActions,
  ...combatObjectActions,
  ...skillsObjectActions,
  ...inventoryObjectActions,
  ...interactionObjectActions,
  ...effectsObjectActions,
  ...economyObjectActions,
  ...equipmentObjectActions,
  ...progressionObjectActions,
  ...minigameObjectActions,
  ...feedbackObjectActions,
  ...moduleObjectActions,
  ...partyObjectActions,
] as const;

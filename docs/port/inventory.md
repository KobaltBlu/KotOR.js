# Exhaustive original contribution inventory

Original tracked worktree (including staged changes), relative to `ea9491d5`; original HEAD `f8bfc1e2`. Target baseline `002dfe03`. Generated from protected projected source, not from the list of files a worker happened to edit.

All **276 original changed paths** are accounted for. “Ported / reconciled” means destination bytes differ from upstream; it is not a claim of behavioral equivalence. See each linked subsystem ledger for semantic decisions and remaining asset-driven acceptance work.

The retained upstream instanced particle chunk renderer is an explicit difference from the original animated/full-model-per-chunk backend. Existing empty schema/graphics files contain no implementation. No game assets, saves, logs or private Git history are included.

| Original path | Disposition | Details |
| --- | --- | --- |
| `.DS_Store` | Excluded operating-system metadata | [integration](integration.md) |
| `.gitignore` | Ported / reconciled | [integration](integration.md) |
| `package-lock.json` | Kept upstream dependency versions and lockfile | [integration](integration.md) |
| `src/GameInitializer.ts` | Translated into src/apps/game/GameInitializer.ts | [integration](integration.md) |
| `src/GameState.ts` | Ported / reconciled | [integration](integration.md) |
| `src/KotOR.ts` | Ported / reconciled | [integration](integration.md) |
| `src/actions/Action.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionCastSpell.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionCloseDoor.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionCombat.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionDialogObject.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionDisarmMine.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionDropItem.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionExamineMine.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionFollowLeader.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionForceFollowObject.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionGiveItem.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionLockObject.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionMoveToPoint.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionOpenDoor.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionParameter.ts` | Ported / reconciled | [resources](resources.md) |
| `src/actions/ActionPhysicalAttacks.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionPickUpItem.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionQueue.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionRandomWalk.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionRecoverMine.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionSetMine.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionTakeItem.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionUnequipItem.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionUnlockObject.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/ActionUseObject.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/helpers/CreatureAvoidance.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/actions/helpers/enqueueMoveToPoint.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/apps/forge/components/tabs/tab-quick-start/TabQuickStart.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/forge/components/tabs/tab-utm-editor/TabUTMEditor.tsx` | Ported / reconciled | [interface](interface.md) |
| `src/apps/forge/module-editor/ForgeStore.ts` | Ported / reconciled | [interface](interface.md) |
| `src/apps/game/components/cheat-console/cheat-console.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/game/components/cheat-console/cheatConsole.tsx` | Ported / reconciled | [interface](interface.md) |
| `src/apps/game/context/AppContext.tsx` | Ported / reconciled | [interface](interface.md) |
| `src/apps/game/states/AppState.ts` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/components/ProfileMenuItem.tsx` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/components/ProfileTabContent.tsx` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/index.tsx` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/profiles/forge.ts` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/profiles/kotor.ts` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/profiles/tsl.ts` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/DiscordWidget.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/launch-buttons.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/launcher-menu.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/launcher-profile-nav.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/launcher.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/promo-items.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/promo-items/promo-gallery.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/promo-items/promo-video.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/promo-items/promo-webview.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/promo-items/promo-ytvideo.scss` | Ported / reconciled | [interface](interface.md) |
| `src/apps/launcher/styles/tabhost.scss` | Ported / reconciled | [interface](interface.md) |
| `src/audio/AmbientAudioEmitter.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/audio/AudioEmitter.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/audio/AudioEngine.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/audio/binkaudio_dct.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/combat/CombatAttackData.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/combat/CombatRound.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/combat/SpellCastInstance.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/controls/IngameControls.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/effects/EffectDamage.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/effects/EffectVisualEffect.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/electron/WindowManager.ts` | Ported / reconciled | [interface](interface.md) |
| `src/electron/preload.ts` | Ported / reconciled | [interface](interface.md) |
| `src/engine/CurrentGame.ts` | Ported / reconciled | [state](state.md) |
| `src/engine/FollowerCamera.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/engine/ItemProperty.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/engine/JournalEntry.ts` | Ported / reconciled | [state](state.md) |
| `src/engine/SaveGame.ts` | Ported / reconciled | [state](state.md) |
| `src/engine/menu/ActionMenuManager.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/engine/pathfinding/ComputedPath.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/engine/rules/SWCreatureAppearance.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/enums/audio/BackgroundMusicMode.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/events/EventSignalEvent.ts` | Ported / reconciled | [resources](resources.md) |
| `src/game/kotor/menu/CharGenAbilities.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/CharGenCustomPanel.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/CharGenMain.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/CharGenQuickOrCustom.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/InGameAreaTransition.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/InGameBark.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/InGameComputer.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/InGameDialog.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/InGameOverlay.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MainMenu.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuEquipment.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuInventory.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuJournal.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuPartySelection.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuQuestItem.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuSaveLoad.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuStore.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/kotor/menu/MenuTop.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/gui/GUIJournalItem.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/gui/GUISaveGameItem.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/InGameDialog.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MainMusic.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuEquipment.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuJournal.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuPartySelection.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuQuestItem.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuSaveLoad.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuSaveName.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuStore.ts` | Ported / reconciled | [interface](interface.md) |
| `src/game/tsl/menu/MenuTop.ts` | Ported / reconciled | [interface](interface.md) |
| `src/gui/GUICheckBox.ts` | Ported / reconciled | [interface](interface.md) |
| `src/gui/GUIListBox.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [interface](interface.md) |
| `src/gui/GUIProtoItem.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [interface](interface.md) |
| `src/loaders/ResourceLoader.ts` | Ported / reconciled | [integration](integration.md) |
| `src/managers/CharGenManager.ts` | Ported / reconciled | [state](state.md) |
| `src/managers/CheatConsoleManager.ts` | Ported / reconciled | [resources](resources.md) |
| `src/managers/CursorManager.ts` | Ported / reconciled | [state](state.md) |
| `src/managers/CutsceneManager.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/managers/GraphicsManager.ts` | Omitted empty original placeholder (no implementation to port) | [audiovisual](audiovisual.md) |
| `src/managers/InventoryManager.ts` | Ported / reconciled | [state](state.md) |
| `src/managers/JournalManager.ts` | Ported / reconciled | [state](state.md) |
| `src/managers/MenuManager.ts` | Ported / reconciled | [state](state.md) |
| `src/managers/ModuleObjectManager.ts` | Ported / reconciled | [state](state.md) |
| `src/managers/MusicManager.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/managers/PartyManager.ts` | Ported / reconciled | [state](state.md) |
| `src/managers/VideoEffectManager.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/managers/VideoManager.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/managers/index.ts` | Ported / reconciled | [integration](integration.md) |
| `src/module/AreaMap.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/AreaWeather.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/Module.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleArea.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleAreaOfEffect.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleCamera.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleCreature.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleDoor.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleEncounter.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleItem.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleMGEnemy.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleMGGunBank.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleMGObstacle.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleMGPlayer.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleMGTrack.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleMiniGame.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleObject.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModulePath.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModulePlaceable.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModulePlayer.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleRoom.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleSound.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleStore.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleTrigger.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/module/ModuleWaypoint.ts` | Ported / reconciled | [simulation](simulation.md) |
| `src/nwscript/NWScriptDefK1.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/NWScriptDefK2.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/NWScriptInstructionSet.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/NWScriptStack.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/actionBuilder.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/audio.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/combat.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/core.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/creatures.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/dialog.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/dice.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/doorsplaceables.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/effectManagement.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/effects.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/effectsLegacy.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/encounters.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/events.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/faction.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/galaxy.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/globals.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/index.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/items.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/itemsLegacy.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/journal.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/k2special.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/localvars.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/mathString.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/minigame.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/miscLegacy.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/missing.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/movement.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/animation.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/combat.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/control.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/conversation.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/economy.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/effects.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/equipment.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/feedback.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/interaction.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/inventory.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/lifecycle.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/minigame.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/module.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/party.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/perception.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/progression.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/query.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/relations.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/skills.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/objects/spellcasting.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/party.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/perception.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/scripting.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/talents.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/traps.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/ui.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/video.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/builtins/world.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/engineRoutineFallbacks.ts` | Ported / reconciled | [scripting](scripting.md) |
| `src/nwscript/k1_nwscript_engine_routines.json` | Replaced with compact upstream-derived routineMetadata.ts and ABI fixtures | [scripting](scripting.md) |
| `src/nwscript/tsl_nwscript_engine_routines.json` | Replaced with compact upstream-derived routineMetadata.ts and ABI fixtures | [scripting](scripting.md) |
| `src/odyssey/controllers/BirthRateController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/BlurLengthController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/BounceCoefficientController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/CombineTimeController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/DetonateController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/DragController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/FPSController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/FrameEndController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/FrameStartController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/GravityController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/LifeExpController.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/LightningDelayController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/LightningRadiusController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/LightningScaleController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/LightningSubDivController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/LightningZigZagController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/OdysseyControllerFactory.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/P2PBezier2Controller.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/P2PBezier3Controller.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/ParticleRotationController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/PercentEndController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/PercentMidController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/PercentStartController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/RandomBirthRateController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/RandomVelocityController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/SizeEndController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/SizeEndYController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/SizeMidController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/SizeMidYController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/SizeStartController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/SizeStartYController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/SpreadController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/ThresholdController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/VelocityController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/XSizeController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/odyssey/controllers/YSizeController.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/resource/BIFObject.ts` | Ported / reconciled | [resources](resources.md) |
| `src/resource/BIKObject.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `src/resource/DLGNode.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/resource/DLGObject.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/resource/ERFObject.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [resources](resources.md) |
| `src/resource/GFFField.ts` | Ported / reconciled | [resources](resources.md) |
| `src/resource/LIPObject.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/resource/RIMObject.ts` | Ported / reconciled | [resources](resources.md) |
| `src/resource/schema/CommonSchemas.ts` | Omitted empty original placeholder (no implementation to port) | [resources](resources.md) |
| `src/resource/schema/GFFFieldCodecs.ts` | Omitted empty original placeholder (no implementation to port) | [resources](resources.md) |
| `src/resource/schema/GFFSchema.ts` | Omitted empty original placeholder (no implementation to port) | [resources](resources.md) |
| `src/shaders/ShaderOdysseyEmitter.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/shaders/pass/LightsaberGlowPass.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/shaders/pass/OdysseyShader.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/shaders/pass/OdysseyShaderPass.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/three/odyssey/OdysseyEmitter3D.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/three/odyssey/OdysseyLightsaberEffect.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/three/odyssey/OdysseyModel3D.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/three/odyssey/index.ts` | Ported / reconciled | [audiovisual](audiovisual.md) |
| `src/utility/BitWise.ts` | Ported / reconciled | [resources](resources.md) |
| `src/utility/GameResourceDumper.ts` | Ported / reconciled | [resources](resources.md) |
| `src/utility/GameStateSnapshot.ts` | Ported / reconciled | [resources](resources.md) |
| `src/utility/RuntimeFaultManager.ts` | Ported / reconciled | [resources](resources.md) |
| `src/worker/bink-worker.ts` | Retained upstream; reconciliation rationale in subsystem ledger | [audiovisual](audiovisual.md) |
| `tsconfig.json` | Ported / reconciled | [integration](integration.md) |

## Disposition counts

- 1: Excluded operating-system metadata
- 1: Kept upstream dependency versions and lockfile
- 4: Omitted empty original placeholder (no implementation to port)
- 227: Ported / reconciled
- 2: Replaced with compact upstream-derived routineMetadata.ts and ABI fixtures
- 40: Retained upstream; reconciliation rationale in subsystem ledger
- 1: Translated into src/apps/game/GameInitializer.ts

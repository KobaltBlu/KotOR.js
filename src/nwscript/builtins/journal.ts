import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const AddJournalQuestEntry = defineAction({
  id: 367,
  name: "AddJournalQuestEntry",
  comment: "367: Add a journal quest entry to the player.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("szPlotID"), intParam("nState"), intParam("bAllowOverrideHigher", { optional: true, default: 0 })] as const,
  kotor(this: NWScriptInstance, szPlotID, nState, bAllowOverrideHigher) {
    return GameState.JournalManager.AddJournalQuestEntry(szPlotID, nState, !!bAllowOverrideHigher);
  },
});

export const RemoveJournalQuestEntry = defineAction({
  id: 368,
  name: "RemoveJournalQuestEntry",
  comment: "368: Remove a journal quest entry from the player.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("szPlotID")] as const,
  kotor(this: NWScriptInstance, szPlotID) {
    return GameState.JournalManager.RemoveJournalQuestEntry(szPlotID);
  },
});

export const GetJournalEntry = defineAction({
  id: 369,
  name: "GetJournalEntry",
  comment: "369: Get the state value of a journal quest.",
  returnType: NWScriptDataType.INTEGER,
  params: [stringParam("szPlotID")] as const,
  kotor(this: NWScriptInstance, szPlotID) {
    return GameState.JournalManager.GetJournalEntryState(szPlotID);
  },
});

export const GetJournalQuestExperience = defineAction({
  id: 384,
  name: "GetJournalQuestExperience",
  comment: "384: Get the experience assigned in the journal editor for szPlotID.",
  returnType: NWScriptDataType.INTEGER,
  params: [stringParam("szPlotID")] as const,
  kotor(this: NWScriptInstance, szPlotID) {
    return GameState.JournalManager.GetJournalQuestExperience(szPlotID);
  },
});

export const AddJournalWorldEntry = defineAction({
  id: 669,
  name: "AddJournalWorldEntry",
  comment: "669: Add a user-entered entry to the world notices.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nIndex"), stringParam("sTitle"), stringParam("sBody")] as const,
  kotor(this: NWScriptInstance, nIndex, sTitle, sBody) {
    return GameState.JournalManager.AddJournalWorldEntry(nIndex, sTitle, sBody);
  },
});

export const AddJournalWorldEntryStrref = defineAction({
  id: 670,
  name: "AddJournalWorldEntryStrref",
  comment: "670: Add an entry to the world notices using stringrefs.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nIndex"), intParam("nStrRef")] as const,
  kotor(this: NWScriptInstance, nIndex, nStrRef) {
    return GameState.JournalManager.AddJournalWorldEntryStrref(nIndex, nStrRef);
  },
});

export const DeleteJournalWorldAllEntries = defineAction({
  id: 672,
  name: "DeleteJournalWorldAllEntries",
  comment: "672: Delete all journal world entries.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.JournalManager.DeleteJournalWorldAllEntries();
  },
});

export const DeleteJournalWorldEntry = defineAction({
  id: 673,
  name: "DeleteJournalWorldEntry",
  comment: "673: Delete a user-entered world notice.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nIndex")] as const,
  kotor(this: NWScriptInstance, nIndex) {
    return GameState.JournalManager.DeleteJournalWorldEntry(nIndex);
  },
});

export const DeleteJournalWorldEntryStrref = defineAction({
  id: 674,
  name: "DeleteJournalWorldEntryStrref",
  comment: "674: Delete the world notice pertaining to the string ref.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nStrRef")] as const,
  kotor(this: NWScriptInstance, nStrRef) {
    return GameState.JournalManager.DeleteJournalWorldEntryStrref(nStrRef);
  },
});

export const journalActions = [
  AddJournalQuestEntry,
  RemoveJournalQuestEntry,
  GetJournalEntry,
  GetJournalQuestExperience,
  AddJournalWorldEntry,
  AddJournalWorldEntryStrref,
  DeleteJournalWorldAllEntries,
  DeleteJournalWorldEntry,
  DeleteJournalWorldEntryStrref,
] as const;

# Reva: DisplayFeedBackText (ExecuteCommandDisplayFeedBackText)

## Overview

`ExecuteCommandDisplayFeedBackText` (0x00530170) displays a feedback string for an object. The string comes from FeedBackText.2da row `nTextConstant`, column `StrRef` (TLK string ID). Reversed from CSWVirtualMachineCommands and CSWCObject::SetFeedbackInfo.

## Signature

```c
DisplayFeedBackText(object oObject, int nTextConstant);
// Stack: pop object id, pop nTextConstant (row index in FeedBackText.2da)
```

## Logic (Reva)

1. StackPopObject → object id (client-converted)
2. StackPopInteger → nTextConstant (row index)
3. Get object via CClientExoApp::GetGameObject
4. If object has AsSWCObject:
   - C2DA::GetINTEntry(feedbacktext, nTextConstant, "StrRef", &strref)
   - If strref == 0: SetFeedbackInfo(object, "BAD STRREF")
   - Else: CTlkTable::GetSimpleString(strref) → string, SetFeedbackInfo(object, string)

## SetFeedbackInfo (0x0063d2d0)

Stores the feedback string in the object (field57_0xe8) and sets display timing/color fields. The string is shown when the object is selected (target UI / reticle label).

## FeedBackText.2da

- Row index = nTextConstant
- Column "StrRef" = TLK string ID
- TLK lookup yields the displayed text

## KotOR.js Mapping

- Object: ModuleObjectManager.GetObjectById or args[0]
- 2DA: GameState.TwoDAManager.datatables.get('feedbacktext')
- Row: feedbacktext.rows[nTextConstant] or getRowByIndex(nTextConstant)
- StrRef: row['StrRef'] or row['strref']
- TLK: GameState.TLKManager.GetStringById(strref)?.Value
- Storage: ModuleObject.feedbackInfo, ModuleObject.setFeedbackInfo(text)
- Display: InGameOverlay target UI uses feedbackInfo ?? getName() for LBL_NAME

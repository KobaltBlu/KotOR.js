# DisplayFeedBackText (observed original game behavior)

## Overview

The `DisplayFeedBackText` script command shows a feedback string for an object. The string is taken from `FeedBackText.2da`: row index `nTextConstant`, column `StrRef` (TLK string id).

## NWScript API

`DisplayFeedBackText(object oObject, int nTextConstant);`

## Logic (observed)

1. Resolve the target object.
2. Read `nTextConstant` as a row index into `FeedBackText.2da`.
3. Look up the `StrRef` column for that row; resolve the string via the TLK table.
4. If the string reference is invalid, a placeholder error string may be shown; otherwise the text is stored on the object for feedback UI (for example, selection / reticle label when the object is targeted).

## FeedBackText.2da

- Row index = `nTextConstant`
- Column `StrRef` = TLK string id
- TLK lookup yields the displayed text

## KotOR.js mapping

- Object: `ModuleObjectManager.GetObjectById` or `args[0]`
- 2DA: `GameState.TwoDAManager.datatables.get('feedbacktext')`
- Row: `feedbacktext.rows[nTextConstant]` or `getRowByIndex(nTextConstant)`
- StrRef: `row['StrRef']` or `row['strref']`
- TLK: `GameState.TLKManager.GetStringById(strref)?.Value`
- Storage: `ModuleObject.feedbackInfo`, `ModuleObject.setFeedbackInfo(text)`
- Display: in-game overlay target UI uses `feedbackInfo ?? getName()` for `LBL_NAME`

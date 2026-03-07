# Reva: GUIControl initProperties (Non-GFFStruct Control)

## Overview

GUIControl.initProperties() parses extent, border, text, highlight, and moveto from a control structure. The primary path uses GFFStruct (hasField, getFieldByLabel, getChildStructs). The else branch handles control defined but not instanceof GFFStruct.

## KotOR.js Architecture

- **GameMenu** loads GUI from GFF (gui files); tGuiPanel receives gff.RootNode (GFFStruct).
- **GUIControlFactory** creates controls from GFF child structs; all inputs are GFFStruct.
- **buildChildren** returns false when control is not GFFStruct, so no children are built.

## When control is not GFFStruct

1. **Cross-realm instanceof** – GFFStruct from another context may fail `instanceof`.
2. **GFF-like wrapper** – Loaders or tools may provide objects with the same interface.
3. **Plain object** – JSON-deserialized or programmatically built control data.

## Solution: Duck-typed GFF-like interface

Support any object that implements:
- `hasField(label: string): boolean`
- `getFieldByLabel(label: string): { getValue(), getChildStructs?(), getVector?() } | null`

This allows initProperties to parse correctly when control has the GFF API without requiring `instanceof GFFStruct`.

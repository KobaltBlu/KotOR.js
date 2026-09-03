/**
 * Inspector pane for the generic GFF editor.
 *
 * @file GFFProperties.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { ChangeEvent, useEffect, useState } from "react";
import * as KotOR from "@/apps/forge/KotOR";
import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor";
import { ForgeInput, ForgeInputGroup } from "@/apps/forge/components/ui";
import { TabGFFEditorState } from "@/apps/forge/states/tabs";
import {
  clampGffLabel,
  clampGffResRef,
  clampInteger,
  getDword64Value,
  getInt64Value,
  gffTypeName,
  parseOptionalBigInt,
  parseOptionalInteger,
  parseOptionalNumber,
  setDword64Value,
  setInt64Value,
} from "@/apps/forge/helpers/gffFieldValue";
import { gffBreadcrumb, findGffNode, isGffField, isGffStruct } from "@/apps/forge/helpers/gffTreePath";
import { GFFVoidHexEditor } from "@/apps/forge/components/tabs/tab-gff-editor/GFFVoidHexEditor";

export interface GFFPropertiesProps {
  tab: TabGFFEditorState;
  generation?: number;
}

function InspectorHeader(props: { tab: TabGFFEditorState }): React.ReactElement {
  const fileType = (props.tab.gff?.FileType || "GFF ").trim() || "GFF";
  const version = props.tab.gff?.FileVersion || "V3.2";
  return (
    <div className="gff-inspector__meta">
      <div className="gff-inspector__file">{fileType} {version}</div>
      <div className="gff-inspector__path" title={gffBreadcrumb(props.tab.selectedPath)}>
        {gffBreadcrumb(props.tab.selectedPath)}
      </div>
    </div>
  );
}

function LabelField(props: { tab: TabGFFEditorState; field: KotOR.GFFField }): React.ReactElement {
  const [label, setLabel] = useState(props.field.getLabel());
  useEffect(() => {
    setLabel(props.field.getLabel());
  }, [props.field, props.tab.generation, props.tab.selectedPath]);

  const commit = (next: string) => {
    const clamped = clampGffLabel(next);
    setLabel(clamped);
    if (clamped === props.field.getLabel()) {
      return;
    }
    props.tab.renameField(props.tab.selectedPath, clamped);
  };

  return (
    <ForgeInputGroup>
      <ForgeInputGroup.Text>Label</ForgeInputGroup.Text>
      <ForgeInput
        maxLength={16}
        value={label}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setLabel(e.target.value.slice(0, 16))}
        onBlur={() => commit(label)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </ForgeInputGroup>
  );
}

function NumericFieldInput(props: {
  tab: TabGFFEditorState;
  field: KotOR.GFFField;
  type: KotOR.GFFDataType;
  integer: boolean;
}): React.ReactElement {
  const [text, setText] = useState(String(props.field.getValue() ?? 0));
  useEffect(() => {
    setText(String(props.field.getValue() ?? 0));
  }, [props.field, props.tab.generation, props.tab.selectedPath]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setText(next);
    const parsed = props.integer ? parseOptionalInteger(next) : parseOptionalNumber(next);
    if (parsed === undefined) {
      return;
    }
    const value = props.integer ? clampInteger(props.type, parsed) : parsed;
    props.tab.captureCoalescedUndo(props.field.uuid);
    props.field.setValue(value);
    props.tab.markUnsaved();
  };

  return (
    <ForgeInputGroup>
      <ForgeInputGroup.Text>Value</ForgeInputGroup.Text>
      <ForgeInput type="text" inputMode="decimal" value={text} onChange={onChange} />
    </ForgeInputGroup>
  );
}

function BigIntFieldInput(props: {
  tab: TabGFFEditorState;
  field: KotOR.GFFField;
  unsigned: boolean;
}): React.ReactElement {
  const current = props.unsigned ? getDword64Value(props.field) : getInt64Value(props.field);
  const [text, setText] = useState(current.toString());
  useEffect(() => {
    const value = props.unsigned ? getDword64Value(props.field) : getInt64Value(props.field);
    setText(value.toString());
  }, [props.field, props.tab.generation, props.tab.selectedPath, props.unsigned]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setText(next);
    const parsed = parseOptionalBigInt(next);
    if (parsed === undefined) {
      return;
    }
    if (props.unsigned && parsed < 0n) {
      return;
    }
    props.tab.captureCoalescedUndo(props.field.uuid);
    if (props.unsigned) {
      setDword64Value(props.field, parsed);
    } else {
      setInt64Value(props.field, parsed);
    }
    props.tab.markUnsaved();
  };

  return (
    <ForgeInputGroup>
      <ForgeInputGroup.Text>Value</ForgeInputGroup.Text>
      <ForgeInput type="text" inputMode="numeric" value={text} onChange={onChange} />
    </ForgeInputGroup>
  );
}

function StringFieldInput(props: {
  tab: TabGFFEditorState;
  field: KotOR.GFFField;
  resref?: boolean;
  char?: boolean;
}): React.ReactElement {
  const [text, setText] = useState(String(props.field.getValue() ?? ""));
  useEffect(() => {
    setText(String(props.field.getValue() ?? ""));
  }, [props.field, props.tab.generation, props.tab.selectedPath]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    let next = e.target.value;
    if (props.char) {
      next = next.slice(0, 1);
    }
    if (props.resref) {
      next = clampGffResRef(next);
    }
    setText(next);
    props.tab.captureCoalescedUndo(props.field.uuid);
    props.field.setValue(next);
    props.tab.markUnsaved();
  };

  return (
    <ForgeInputGroup>
      <ForgeInputGroup.Text>Value</ForgeInputGroup.Text>
      <ForgeInput
        type="text"
        maxLength={props.char ? 1 : props.resref ? 16 : undefined}
        value={text}
        onChange={onChange}
        as={props.char || props.resref ? undefined : "textarea"}
        rows={props.char || props.resref ? undefined : 4}
      />
    </ForgeInputGroup>
  );
}

function VectorInputs(props: {
  tab: TabGFFEditorState;
  field: KotOR.GFFField;
  orientation?: boolean;
}): React.ReactElement {
  const vec = props.orientation ? props.field.getOrientation() : props.field.getVector();
  const [x, setX] = useState(String(vec?.x ?? 0));
  const [y, setY] = useState(String(vec?.y ?? 0));
  const [z, setZ] = useState(String(vec?.z ?? 0));
  const [w, setW] = useState(String(props.orientation ? (props.field.getOrientation()?.w ?? 1) : 1));

  useEffect(() => {
    if (props.orientation) {
      const o = props.field.getOrientation() || { x: 0, y: 0, z: 0, w: 1 };
      setX(String(o.x));
      setY(String(o.y));
      setZ(String(o.z));
      setW(String(o.w));
    } else {
      const v = props.field.getVector() || { x: 0, y: 0, z: 0 };
      setX(String(v.x));
      setY(String(v.y));
      setZ(String(v.z));
    }
  }, [props.field, props.tab.generation, props.tab.selectedPath, props.orientation]);

  const applyAxis = (axis: "x" | "y" | "z" | "w", text: string) => {
    const parsed = parseOptionalNumber(text);
    if (parsed === undefined) {
      return;
    }
    props.tab.captureCoalescedUndo(`${props.field.uuid}:${axis}`);
    if (props.orientation) {
      props.field.getOrientation()[axis] = parsed;
    } else if (axis !== "w") {
      props.field.getVector()[axis] = parsed;
    }
    props.tab.markUnsaved();
  };

  return (
    <>
      <ForgeInputGroup>
        <ForgeInputGroup.Text>X</ForgeInputGroup.Text>
        <ForgeInput type="text" inputMode="decimal" value={x} onChange={(e: ChangeEvent<HTMLInputElement>) => { setX(e.target.value); applyAxis("x", e.target.value); }} />
      </ForgeInputGroup>
      <ForgeInputGroup>
        <ForgeInputGroup.Text>Y</ForgeInputGroup.Text>
        <ForgeInput type="text" inputMode="decimal" value={y} onChange={(e: ChangeEvent<HTMLInputElement>) => { setY(e.target.value); applyAxis("y", e.target.value); }} />
      </ForgeInputGroup>
      <ForgeInputGroup>
        <ForgeInputGroup.Text>Z</ForgeInputGroup.Text>
        <ForgeInput type="text" inputMode="decimal" value={z} onChange={(e: ChangeEvent<HTMLInputElement>) => { setZ(e.target.value); applyAxis("z", e.target.value); }} />
      </ForgeInputGroup>
      {props.orientation ? (
        <ForgeInputGroup>
          <ForgeInputGroup.Text>W</ForgeInputGroup.Text>
          <ForgeInput type="text" inputMode="decimal" value={w} onChange={(e: ChangeEvent<HTMLInputElement>) => { setW(e.target.value); applyAxis("w", e.target.value); }} />
        </ForgeInputGroup>
      ) : null}
    </>
  );
}

function GFFStructProperties(props: { tab: TabGFFEditorState; struct: KotOR.GFFStruct }): React.ReactElement {
  const [typeText, setTypeText] = useState(String(props.struct.getType()));
  useEffect(() => {
    setTypeText(String(props.struct.getType()));
  }, [props.struct, props.tab.generation, props.tab.selectedPath]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTypeText(e.target.value);
    const parsed = parseOptionalInteger(e.target.value);
    if (parsed === undefined) {
      return;
    }
    props.tab.captureCoalescedUndo(`${props.struct.uuid}:type`);
    props.struct.setType(parsed);
    props.tab.markUnsaved();
    props.tab.notifyTree();
  };

  return (
    <fieldset>
      <legend>Struct</legend>
      <ForgeInputGroup>
        <ForgeInputGroup.Text>Struct ID</ForgeInputGroup.Text>
        <ForgeInput type="text" inputMode="numeric" value={typeText} onChange={onChange} />
      </ForgeInputGroup>
      <div className="gff-inspector__hint">{props.struct.getFields().length} field{props.struct.getFields().length === 1 ? "" : "s"}</div>
    </fieldset>
  );
}

function GFFFieldProperties(props: { tab: TabGFFEditorState; field: KotOR.GFFField }): React.ReactElement {
  const type = props.field.getType();
  const typeLabel = gffTypeName(type);

  let editor: React.ReactElement = <div className="gff-inspector__hint">No scalar value for this type.</div>;
  switch (type) {
    case KotOR.GFFDataType.BYTE:
    case KotOR.GFFDataType.WORD:
    case KotOR.GFFDataType.SHORT:
    case KotOR.GFFDataType.DWORD:
    case KotOR.GFFDataType.INT:
      editor = <NumericFieldInput tab={props.tab} field={props.field} type={type} integer={true} />;
      break;
    case KotOR.GFFDataType.FLOAT:
    case KotOR.GFFDataType.DOUBLE:
      editor = <NumericFieldInput tab={props.tab} field={props.field} type={type} integer={false} />;
      break;
    case KotOR.GFFDataType.DWORD64:
      editor = <BigIntFieldInput tab={props.tab} field={props.field} unsigned={true} />;
      break;
    case KotOR.GFFDataType.INT64:
      editor = <BigIntFieldInput tab={props.tab} field={props.field} unsigned={false} />;
      break;
    case KotOR.GFFDataType.CHAR:
      editor = <StringFieldInput tab={props.tab} field={props.field} char={true} />;
      break;
    case KotOR.GFFDataType.RESREF:
      editor = <StringFieldInput tab={props.tab} field={props.field} resref={true} />;
      break;
    case KotOR.GFFDataType.CEXOSTRING:
      editor = <StringFieldInput tab={props.tab} field={props.field} />;
      break;
    case KotOR.GFFDataType.VECTOR:
      editor = <VectorInputs tab={props.tab} field={props.field} />;
      break;
    case KotOR.GFFDataType.ORIENTATION:
      editor = <VectorInputs tab={props.tab} field={props.field} orientation={true} />;
      break;
    case KotOR.GFFDataType.VOID:
      editor = <GFFVoidHexEditor tab={props.tab} field={props.field} />;
      break;
    case KotOR.GFFDataType.CEXOLOCSTRING:
      editor = (
        <CExoLocStringEditor
          value={props.field.getCExoLocString()}
          onChange={(value) => {
            props.tab.captureUndoSnapshot();
            props.field.setCExoLocString(value);
            props.tab.markUnsaved();
            props.tab.notifyTree();
          }}
        />
      );
      break;
    case KotOR.GFFDataType.LIST:
      editor = <div className="gff-inspector__hint">{props.field.getChildStructs().length} struct{props.field.getChildStructs().length === 1 ? "" : "s"}</div>;
      break;
    case KotOR.GFFDataType.STRUCT:
      editor = <div className="gff-inspector__hint">Nested struct</div>;
      break;
    default:
      editor = <div className="gff-inspector__hint">Unsupported type {type}</div>;
      break;
  }

  return (
    <fieldset>
      <legend>[{typeLabel}] {props.field.getLabel()}</legend>
      <LabelField tab={props.tab} field={props.field} />
      {editor}
    </fieldset>
  );
}

export const GFFProperties = function GFFProperties(props: GFFPropertiesProps): React.ReactElement {
  const tab = props.tab;
  const node = findGffNode(tab.gff?.RootNode, tab.selectedPath) || tab.selectedNode;
  return (
    <div className="gff-inspector" key={`${tab.selectedPath}:${props.generation ?? tab.generation}`}>
      <InspectorHeader tab={tab} />
      {isGffField(node) ? (
        <GFFFieldProperties tab={tab} field={node} />
      ) : isGffStruct(node) ? (
        <GFFStructProperties tab={tab} struct={node} />
      ) : (
        <div className="gff-inspector__hint">Select a field or struct.</div>
      )}
    </div>
  );
};

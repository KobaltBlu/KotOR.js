/**
 * Shared TEXT nest fields for the GUI inspector.
 *
 * @file GUITextFields.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { InfoBubble } from "@/apps/forge/components/info-bubble/info-bubble";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { ForgeColorField, ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { TabGUIEditorState } from "@/apps/forge/states/tabs/TabGUIEditorState";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import { GFFDataType } from "@/enums/resource/GFFDataType";

function FieldRow(props: { label: string; info?: string; children: React.ReactNode }) {
  const label = props.info ? (
    <InfoBubble content={props.info} position="right" maxWidth={320}>
      <label className="tab-gui-editor__field-label tab-gui-editor__field-label--help">{props.label}</label>
    </InfoBubble>
  ) : (
    <label className="tab-gui-editor__field-label">{props.label}</label>
  );
  return (
    <div className="tab-gui-editor__field">
      {label}
      <div className="tab-gui-editor__field-ctrl">{props.children}</div>
    </div>
  );
}

const ALIGNMENT_OPTIONS: Array<{ value: number; label: string }> = [
  {
    value: GUIControlAlignment.HorizontalLeft | GUIControlAlignment.VerticalTop,
    label: "Left · Top",
  },
  {
    value: GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalTop,
    label: "Center · Top",
  },
  {
    value: GUIControlAlignment.HorizontalRight | GUIControlAlignment.VerticalTop,
    label: "Right · Top",
  },
  {
    value: GUIControlAlignment.HorizontalLeft | GUIControlAlignment.VerticalCenter,
    label: "Left · Center",
  },
  {
    value: GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter,
    label: "Center · Center",
  },
  {
    value: GUIControlAlignment.HorizontalRight | GUIControlAlignment.VerticalCenter,
    label: "Right · Center",
  },
  {
    value: GUIControlAlignment.HorizontalLeft | GUIControlAlignment.VerticalBottom,
    label: "Left · Bottom",
  },
  {
    value: GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalBottom,
    label: "Center · Bottom",
  },
  {
    value: GUIControlAlignment.HorizontalRight | GUIControlAlignment.VerticalBottom,
    label: "Right · Bottom",
  },
];

export interface GUITextFieldsProps {
  tab: TabGUIEditorState;
  group?: string;
  nestPath?: string | null;
}

export function GUITextFields(props: GUITextFieldsProps) {
  const tab = props.tab;
  const group = props.group ?? "TEXT";
  const nestPath = props.nestPath;
  const path = `${tab.selectedPath}:${nestPath ?? ""}`;

  const text = String(tab.readSelectedNestedScalar(group, "TEXT", "", nestPath));
  const strref = Number(tab.readSelectedNestedScalar(group, "STRREF", 0xffffffff, nestPath));
  const font = String(tab.readSelectedNestedScalar(group, "FONT", "", nestPath));
  const alignment = Number(
    tab.readSelectedNestedScalar(
      group,
      "ALIGNMENT",
      GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter,
      nestPath,
    ),
  );
  const pulsing = Number(tab.readSelectedNestedScalar(group, "PULSING", 0, nestPath)) !== 0;
  const color = tab.readSelectedNestedColor(group, "COLOR", nestPath);

  const alignmentOptions = ALIGNMENT_OPTIONS.some((o) => o.value === alignment)
    ? ALIGNMENT_OPTIONS
    : [{ value: alignment, label: `${alignment} · Custom` }, ...ALIGNMENT_OPTIONS];

  return (
    <>
      <FieldRow label="TEXT" info="Literal caption. Used when non-empty; otherwise STRREF is resolved via TLK.">
        <ForgeInput
          value={text}
          onChange={(e) =>
            tab.setSelectedNestedScalar(
              group,
              "TEXT",
              GFFDataType.CEXOSTRING,
              e.target.value,
              `text:${path}`,
              nestPath,
            )
          }
        />
      </FieldRow>
      <FieldRow label="STRREF">
        <ForgeInput
          type="number"
          step={1}
          value={strref >>> 0}
          onChange={(e) =>
            tab.setSelectedNestedScalar(
              group,
              "STRREF",
              GFFDataType.DWORD,
              Number(e.target.value) >>> 0,
              `strref:${path}`,
              nestPath,
            )
          }
        />
      </FieldRow>
      <FieldRow label="Font" info="Font resref (e.g. fnt_d16x16).">
        <ForgeInput
          value={font}
          className="font-monospace"
          onChange={(e) =>
            tab.setSelectedNestedScalar(group, "FONT", GFFDataType.RESREF, e.target.value, `font:${path}`, nestPath)
          }
        />
      </FieldRow>
      <FieldRow label="Alignment" info="TEXT.ALIGNMENT bit flags (horizontal | vertical).">
        <ForgeSelect
          value={String(alignment)}
          onChange={(e) =>
            tab.setSelectedNestedScalar(
              group,
              "ALIGNMENT",
              GFFDataType.INT,
              Number(e.target.value),
              undefined,
              nestPath,
            )
          }
        >
          {alignmentOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </ForgeSelect>
      </FieldRow>
      <FieldRow label="Pulsing">
        <ForgeCheckbox
          label=""
          value={pulsing}
          onChange={(v) =>
            tab.setSelectedNestedScalar(group, "PULSING", GFFDataType.BYTE, v ? 1 : 0, undefined, nestPath)
          }
        />
      </FieldRow>
      <FieldRow label="Color">
        <ForgeColorField
          value={color}
          onChange={(rgb) => tab.setSelectedNestedColor(group, "COLOR", rgb, `text-color:${path}`, nestPath)}
        />
      </FieldRow>
    </>
  );
}

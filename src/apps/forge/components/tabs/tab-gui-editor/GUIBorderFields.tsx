/**
 * Shared field UI for GUI border-like nests (BORDER, HILIGHT, SELECTED, PROGRESS).
 *
 * @file GUIBorderFields.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { InfoBubble } from "@/apps/forge/components/info-bubble/info-bubble";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { ForgeColorField, ForgeInput } from "@/apps/forge/components/ui";
import { TabGUIEditorState } from "@/apps/forge/states/tabs/TabGUIEditorState";
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

function NumField(props: { value: number; onChange: (n: number) => void }) {
  return (
    <ForgeInput
      type="number"
      step={1}
      value={Number.isFinite(props.value) ? props.value : 0}
      onChange={(e) => props.onChange(Number(e.target.value))}
    />
  );
}

export interface GUIBorderFieldsProps {
  tab: TabGUIEditorState;
  group: string;
  showInnerOffsetY?: boolean;
  coalescePrefix?: string;
  /** When set, edit this nest under the selected control (e.g. PROTOITEM). */
  nestPath?: string | null;
}

export function GUIBorderFields(props: GUIBorderFieldsProps) {
  const { tab, group, showInnerOffsetY, nestPath } = props;
  const key = props.coalescePrefix ?? group.toLowerCase();
  const path = `${tab.selectedPath}:${nestPath ?? ""}`;

  const fill = String(tab.readSelectedNestedScalar(group, "FILL", "", nestPath));
  const edge = String(tab.readSelectedNestedScalar(group, "EDGE", "", nestPath));
  const corner = String(tab.readSelectedNestedScalar(group, "CORNER", "", nestPath));
  const dim = Number(tab.readSelectedNestedScalar(group, "DIMENSION", 0, nestPath));
  const fillStyle = Number(tab.readSelectedNestedScalar(group, "FILLSTYLE", 0, nestPath));
  const inner = Number(tab.readSelectedNestedScalar(group, "INNEROFFSET", 0, nestPath));
  const innerY = Number(tab.readSelectedNestedScalar(group, "INNEROFFSETY", 0, nestPath));
  const pulsing = Number(tab.readSelectedNestedScalar(group, "PULSING", 0, nestPath)) !== 0;
  const color = tab.readSelectedNestedColor(group, "COLOR", nestPath);

  return (
    <>
      <FieldRow label="Fill">
        <ForgeInput
          value={fill}
          className="font-monospace"
          onChange={(e) =>
            tab.setSelectedNestedScalar(group, "FILL", GFFDataType.RESREF, e.target.value, `${key}-fill:${path}`, nestPath)
          }
        />
      </FieldRow>
      <FieldRow label="Edge">
        <ForgeInput
          value={edge}
          className="font-monospace"
          onChange={(e) =>
            tab.setSelectedNestedScalar(group, "EDGE", GFFDataType.RESREF, e.target.value, `${key}-edge:${path}`, nestPath)
          }
        />
      </FieldRow>
      <FieldRow label="Corner">
        <ForgeInput
          value={corner}
          className="font-monospace"
          onChange={(e) =>
            tab.setSelectedNestedScalar(group, "CORNER", GFFDataType.RESREF, e.target.value, `${key}-corner:${path}`, nestPath)
          }
        />
      </FieldRow>
      <FieldRow label="Dimension">
        <NumField
          value={dim}
          onChange={(n) =>
            tab.setSelectedNestedScalar(group, "DIMENSION", GFFDataType.INT, n, `${key}-dim:${path}`, nestPath)
          }
        />
      </FieldRow>
      <FieldRow label="Fill style" info="FILLSTYLE — fill mode used by the border renderer.">
        <NumField
          value={fillStyle}
          onChange={(n) =>
            tab.setSelectedNestedScalar(group, "FILLSTYLE", GFFDataType.INT, n, `${key}-fs:${path}`, nestPath)
          }
        />
      </FieldRow>
      <FieldRow label="Inner offset">
        <NumField
          value={inner}
          onChange={(n) =>
            tab.setSelectedNestedScalar(group, "INNEROFFSET", GFFDataType.INT, n, `${key}-io:${path}`, nestPath)
          }
        />
      </FieldRow>
      {showInnerOffsetY ? (
        <FieldRow label="Inner offset Y" info="TSL INNEROFFSETY.">
          <NumField
            value={innerY}
            onChange={(n) =>
              tab.setSelectedNestedScalar(group, "INNEROFFSETY", GFFDataType.INT, n, `${key}-ioy:${path}`, nestPath)
            }
          />
        </FieldRow>
      ) : null}
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
          onChange={(rgb) => tab.setSelectedNestedColor(group, "COLOR", rgb, `${key}-color:${path}`, nestPath)}
        />
      </FieldRow>
    </>
  );
}

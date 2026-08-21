/**
 * Property inspector for selected GUI controls.
 *
 * @file GUIInspector.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { InfoBubble } from "@/apps/forge/components/info-bubble/info-bubble";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { ForgeColorField, ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { TabGUIEditorState } from "@/apps/forge/states/tabs/TabGUIEditorState";
import { GUI_ROOT_PATH, guiControlTypeOptions, listGuiMoveToTargets, GUI_MOVETO_NONE, GUI_MOVETO_DIRS } from "@/apps/forge/gui/guiOutline";
import { GFFDataType } from "@/enums/resource/GFFDataType";

export interface GUIInspectorProps {
  tab: TabGUIEditorState;
  generation: number;
}

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

function NumField(props: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <ForgeInput
      type="number"
      step={props.step ?? 1}
      value={Number.isFinite(props.value) ? props.value : 0}
      onChange={(e) => props.onChange(Number(e.target.value))}
    />
  );
}

function MoveToField(props: {
  label: string;
  dir: string;
  value: number;
  options: ReturnType<typeof listGuiMoveToTargets>;
  onChange: (id: number) => void;
}) {
  return (
    <FieldRow
      label={props.label}
      info={`MOVETO.${props.dir} — control ID focused when the gamepad d-pad is pressed ${props.label.toLowerCase()}. Use -1 for none.`}
    >
      <div className="tab-gui-editor__moveto-row">
        <ForgeSelect
          value={String(Number.isFinite(props.value) ? props.value : GUI_MOVETO_NONE)}
          onChange={(e) => props.onChange(Number(e.target.value))}
          aria-label={`Move to ${props.label}`}
        >
          {props.options.map((opt) => (
            <option key={`${props.dir}-${opt.id}`} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </ForgeSelect>
        <ForgeInput
          type="number"
          step={1}
          className="tab-gui-editor__moveto-id font-monospace"
          title="Raw control ID"
          value={Number.isFinite(props.value) ? props.value : GUI_MOVETO_NONE}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
      </div>
    </FieldRow>
  );
}

export function GUIInspector(props: GUIInspectorProps) {
  const { tab, generation } = props;
  void generation;
  const struct = tab.selectedNode;
  if (!struct) {
    return <div className="tab-gui-editor__inspector"><p className="tab-gui-editor__empty">Select a control.</p></div>;
  }

  const isRoot = tab.selectedPath === GUI_ROOT_PATH;
  const type = Number(tab.readSelectedScalar("CONTROLTYPE", -1));
  const tag = String(tab.readSelectedScalar("TAG", ""));
  const id = Number(tab.readSelectedScalar("ID", 0));
  const parent = String(tab.readSelectedScalar("Obj_Parent", ""));
  const locked = Number(tab.readSelectedScalar("Obj_Locked", 0)) !== 0;
  const padding = Number(tab.readSelectedScalar("PADDING", 0));

  const left = Number(tab.readSelectedNestedScalar("EXTENT", "LEFT", 0));
  const top = Number(tab.readSelectedNestedScalar("EXTENT", "TOP", 0));
  const width = Number(tab.readSelectedNestedScalar("EXTENT", "WIDTH", 0));
  const height = Number(tab.readSelectedNestedScalar("EXTENT", "HEIGHT", 0));

  const text = String(tab.readSelectedNestedScalar("TEXT", "TEXT", ""));
  const strref = Number(tab.readSelectedNestedScalar("TEXT", "STRREF", 0xffffffff));
  const font = String(tab.readSelectedNestedScalar("TEXT", "FONT", ""));
  const textColor = tab.readSelectedNestedColor("TEXT", "COLOR");

  const borderFill = String(tab.readSelectedNestedScalar("BORDER", "FILL", ""));
  const borderEdge = String(tab.readSelectedNestedScalar("BORDER", "EDGE", ""));
  const borderCorner = String(tab.readSelectedNestedScalar("BORDER", "CORNER", ""));
  const borderDim = Number(tab.readSelectedNestedScalar("BORDER", "DIMENSION", 0));
  const borderColor = tab.readSelectedNestedColor("BORDER", "COLOR");

  const hilightFill = String(tab.readSelectedNestedScalar("HILIGHT", "FILL", ""));
  const hilightColor = tab.readSelectedNestedColor("HILIGHT", "COLOR");

  const moveToUp = Number(tab.readSelectedNestedScalar("MOVETO", "UP", GUI_MOVETO_NONE));
  const moveToDown = Number(tab.readSelectedNestedScalar("MOVETO", "DOWN", GUI_MOVETO_NONE));
  const moveToLeft = Number(tab.readSelectedNestedScalar("MOVETO", "LEFT", GUI_MOVETO_NONE));
  const moveToRight = Number(tab.readSelectedNestedScalar("MOVETO", "RIGHT", GUI_MOVETO_NONE));
  const moveToTargetOptions = listGuiMoveToTargets(tab.gff, [
    moveToUp,
    moveToDown,
    moveToLeft,
    moveToRight,
  ]);

  const setMoveTo = (dir: (typeof GUI_MOVETO_DIRS)[number], nextId: number) => {
    const value = Number.isFinite(nextId) ? (nextId | 0) : GUI_MOVETO_NONE;
    tab.setSelectedNestedScalar("MOVETO", dir, GFFDataType.INT, value, `moveto-${dir}:${tab.selectedPath}`);
  };
  return (
    <div className="tab-gui-editor__inspector">
      <div className="tab-gui-editor__inspector-scroll">
        <h4 className="tab-gui-editor__section-title">{isRoot ? "Root panel" : "Control"}</h4>

        <FieldRow label="TAG" info="Control name. Child Obj_Parent values reference this string.">
          <ForgeInput
            value={tag}
            className="font-monospace"
            onChange={(e) => tab.setSelectedScalar("TAG", GFFDataType.RESREF, e.target.value, `tag:${tab.selectedPath}`)}
          />
        </FieldRow>

        {!isRoot ? (
          <FieldRow label="Type" info="CONTROLTYPE — Label(4), Button(6), CheckBox(7), etc.">
            <ForgeSelect
              value={String(type)}
              onChange={(e) =>
                tab.setSelectedScalar("CONTROLTYPE", GFFDataType.INT, Number(e.target.value))
              }
            >
              {guiControlTypeOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </ForgeSelect>
          </FieldRow>
        ) : null}

        <FieldRow label="ID" info="Numeric control ID. MOVETO d-pad links reference this value (not TAG).">
          <NumField
            value={id}
            onChange={(n) => tab.setSelectedScalar("ID", GFFDataType.INT, n >>> 0, `id:${tab.selectedPath}`)}
          />
        </FieldRow>

        {!isRoot ? (
          <FieldRow label="Parent" info="Obj_Parent — TAG of the parent control (usually the root panel).">
            <ForgeInput
              value={parent}
              className="font-monospace"
              onChange={(e) =>
                tab.setSelectedScalar("Obj_Parent", GFFDataType.CEXOSTRING, e.target.value, `parent:${tab.selectedPath}`)
              }
            />
          </FieldRow>
        ) : null}

        <FieldRow label="Locked">
          <ForgeCheckbox
            label=""
            value={locked}
            onChange={(v) => tab.setSelectedScalar("Obj_Locked", GFFDataType.BYTE, v ? 1 : 0)}
          />
        </FieldRow>

        <FieldRow label="Padding">
          <NumField
            value={padding}
            onChange={(n) => tab.setSelectedScalar("PADDING", GFFDataType.INT, n, `pad:${tab.selectedPath}`)}
          />
        </FieldRow>

        <h4 className="tab-gui-editor__section-title">Extent</h4>
        <div className="tab-gui-editor__extent-grid">
          <FieldRow label="Left">
            <NumField
              value={left}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "LEFT", GFFDataType.INT, n, `ext-l:${tab.selectedPath}`)
              }
            />
          </FieldRow>
          <FieldRow label="Top">
            <NumField
              value={top}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "TOP", GFFDataType.INT, n, `ext-t:${tab.selectedPath}`)
              }
            />
          </FieldRow>
          <FieldRow label="Width">
            <NumField
              value={width}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "WIDTH", GFFDataType.INT, n, `ext-w:${tab.selectedPath}`)
              }
            />
          </FieldRow>
          <FieldRow label="Height">
            <NumField
              value={height}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "HEIGHT", GFFDataType.INT, n, `ext-h:${tab.selectedPath}`)
              }
            />
          </FieldRow>
        </div>

        <h4 className="tab-gui-editor__section-title">Text</h4>
        <FieldRow label="TEXT" info="Literal caption. Used when non-empty; otherwise STRREF is resolved via TLK.">
          <ForgeInput
            value={text}
            onChange={(e) =>
              tab.setSelectedNestedScalar("TEXT", "TEXT", GFFDataType.CEXOSTRING, e.target.value, `text:${tab.selectedPath}`)
            }
          />
        </FieldRow>
        <FieldRow label="STRREF">
          <NumField
            value={strref >>> 0}
            onChange={(n) =>
              tab.setSelectedNestedScalar("TEXT", "STRREF", GFFDataType.DWORD, n >>> 0, `strref:${tab.selectedPath}`)
            }
          />
        </FieldRow>
        <FieldRow label="Font" info="Font resref (e.g. fnt_d16x16).">
          <ForgeInput
            value={font}
            className="font-monospace"
            onChange={(e) =>
              tab.setSelectedNestedScalar("TEXT", "FONT", GFFDataType.RESREF, e.target.value, `font:${tab.selectedPath}`)
            }
          />
        </FieldRow>
        <FieldRow label="Color">
          <ForgeColorField
            value={textColor}
            onChange={(rgb) =>
              tab.setSelectedNestedColor("TEXT", "COLOR", rgb, `text-color:${tab.selectedPath}`)
            }
          />
        </FieldRow>

        <h4 className="tab-gui-editor__section-title">Border</h4>
        <FieldRow label="Fill">
          <ForgeInput
            value={borderFill}
            className="font-monospace"
            onChange={(e) =>
              tab.setSelectedNestedScalar("BORDER", "FILL", GFFDataType.RESREF, e.target.value, `b-fill:${tab.selectedPath}`)
            }
          />
        </FieldRow>
        <FieldRow label="Edge">
          <ForgeInput
            value={borderEdge}
            className="font-monospace"
            onChange={(e) =>
              tab.setSelectedNestedScalar("BORDER", "EDGE", GFFDataType.RESREF, e.target.value, `b-edge:${tab.selectedPath}`)
            }
          />
        </FieldRow>
        <FieldRow label="Corner">
          <ForgeInput
            value={borderCorner}
            className="font-monospace"
            onChange={(e) =>
              tab.setSelectedNestedScalar(
                "BORDER",
                "CORNER",
                GFFDataType.RESREF,
                e.target.value,
                `b-corner:${tab.selectedPath}`,
              )
            }
          />
        </FieldRow>
        <FieldRow label="Dimension">
          <NumField
            value={borderDim}
            onChange={(n) =>
              tab.setSelectedNestedScalar("BORDER", "DIMENSION", GFFDataType.INT, n, `b-dim:${tab.selectedPath}`)
            }
          />
        </FieldRow>
        <FieldRow label="Color">
          <ForgeColorField
            value={borderColor}
            onChange={(rgb) =>
              tab.setSelectedNestedColor("BORDER", "COLOR", rgb, `b-color:${tab.selectedPath}`)
            }
          />
        </FieldRow>

        <h4 className="tab-gui-editor__section-title">Highlight</h4>
        <FieldRow label="Fill">
          <ForgeInput
            value={hilightFill}
            className="font-monospace"
            onChange={(e) =>
              tab.setSelectedNestedScalar(
                "HILIGHT",
                "FILL",
                GFFDataType.RESREF,
                e.target.value,
                `h-fill:${tab.selectedPath}`,
              )
            }
          />
        </FieldRow>
        <FieldRow label="Color">
          <ForgeColorField
            value={hilightColor}
            onChange={(rgb) =>
              tab.setSelectedNestedColor("HILIGHT", "COLOR", rgb, `h-color:${tab.selectedPath}`)
            }
          />
        </FieldRow>

        <h4 className="tab-gui-editor__section-title">Move To (d-pad)</h4>
        <p className="tab-gui-editor__section-hint">
          Gamepad navigation targets by control <code>ID</code>. <code>-1</code> means no move in that direction.
        </p>
        <div className="tab-gui-editor__moveto-grid">
          <MoveToField
            label="Up"
            dir="UP"
            value={moveToUp}
            options={moveToTargetOptions}
            onChange={(n) => setMoveTo("UP", n)}
          />
          <MoveToField
            label="Down"
            dir="DOWN"
            value={moveToDown}
            options={moveToTargetOptions}
            onChange={(n) => setMoveTo("DOWN", n)}
          />
          <MoveToField
            label="Left"
            dir="LEFT"
            value={moveToLeft}
            options={moveToTargetOptions}
            onChange={(n) => setMoveTo("LEFT", n)}
          />
          <MoveToField
            label="Right"
            dir="RIGHT"
            value={moveToRight}
            options={moveToTargetOptions}
            onChange={(n) => setMoveTo("RIGHT", n)}
          />
        </div>
      </div>
    </div>
  );
}

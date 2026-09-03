/**
 * Property inspector for selected GUI controls (engine-read field parity).
 * Progressive disclosure: identity + extent first; chrome/type details on demand.
 *
 * @file GUIInspector.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useState } from "react";
import { InfoBubble } from "@/apps/forge/components/info-bubble/info-bubble";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { ForgeButton, ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { TabGUIEditorState } from "@/apps/forge/states/tabs/TabGUIEditorState";
import {
  GUI_ROOT_PATH,
  guiControlTypeLabel,
  guiControlTypeOptions,
  listGuiMoveToTargets,
  GUI_MOVETO_NONE,
  GUI_MOVETO_DIRS,
  getNestedStruct,
} from "@/apps/forge/gui/guiOutline";
import { GUIBorderFields } from "@/apps/forge/components/tabs/tab-gui-editor/GUIBorderFields";
import { GUITextFields } from "@/apps/forge/components/tabs/tab-gui-editor/GUITextFields";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { isTslGuiGame } from "@/gui/guiControlSchema";
import { GameState } from "@/GameState";

export interface GUIInspectorProps {
  tab: TabGUIEditorState;
  generation: number;
}

type SectionKey =
  | "identity"
  | "hierarchy"
  | "extent"
  | "text"
  | "border"
  | "highlight"
  | "type"
  | "proto"
  | "scroll"
  | "nav";

const DEFAULT_OPEN: Record<SectionKey, boolean> = {
  identity: true,
  hierarchy: false,
  extent: true,
  text: false,
  border: false,
  highlight: false,
  type: true,
  proto: false,
  scroll: false,
  nav: false,
};

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

function InspectorSection(props: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`tab-gui-editor__section${props.open ? " is-open" : ""}`}>
      <button
        type="button"
        className="tab-gui-editor__section-head"
        onClick={props.onToggle}
        aria-expanded={props.open}
      >
        <span className="tab-gui-editor__section-chevron" aria-hidden>
          {props.open ? "▾" : "▸"}
        </span>
        <span className="tab-gui-editor__section-title-text">{props.title}</span>
        {!props.open && props.summary ? (
          <span className="tab-gui-editor__section-summary">{props.summary}</span>
        ) : null}
      </button>
      {props.open ? <div className="tab-gui-editor__section-body">{props.children}</div> : null}
    </section>
  );
}

function useInspectorSections(resetKey: string) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(() => ({ ...DEFAULT_OPEN }));

  useEffect(() => {
    setOpen({ ...DEFAULT_OPEN });
  }, [resetKey]);

  const toggle = (key: SectionKey) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setOpen({
      identity: true,
      hierarchy: true,
      extent: true,
      text: true,
      border: true,
      highlight: true,
      type: true,
      proto: true,
      scroll: true,
      nav: true,
    });
  };

  const collapseAll = () => {
    setOpen({
      identity: true,
      hierarchy: false,
      extent: false,
      text: false,
      border: false,
      highlight: false,
      type: false,
      proto: false,
      scroll: false,
      nav: false,
    });
  };

  return { open, toggle, expandAll, collapseAll };
}

function ControlChromeFields(props: {
  tab: TabGUIEditorState;
  isRoot: boolean;
  hideType?: boolean;
  showTslY: boolean;
  nestPath?: string | null;
  sectionPrefix?: string;
  open: Record<SectionKey, boolean>;
  toggle: (key: SectionKey) => void;
}) {
  const { tab, isRoot, hideType, showTslY, nestPath, open, toggle } = props;
  const pathKey = `${tab.selectedPath}:${nestPath ?? ""}`;
  const type = Number(tab.readSelectedScalar("CONTROLTYPE", -1, nestPath));
  const tag = String(tab.readSelectedScalar("TAG", "", nestPath));
  const id = Number(tab.readSelectedScalar("ID", 0, nestPath));
  const parent = String(tab.readSelectedScalar("Obj_Parent", "", nestPath));
  const parentId = Number(tab.readSelectedScalar("Obj_ParentID", -1, nestPath));
  const locked = Number(tab.readSelectedScalar("Obj_Locked", 0, nestPath)) !== 0;
  const padding = Number(tab.readSelectedScalar("PADDING", 0, nestPath));

  const left = Number(tab.readSelectedNestedScalar("EXTENT", "LEFT", 0, nestPath));
  const top = Number(tab.readSelectedNestedScalar("EXTENT", "TOP", 0, nestPath));
  const width = Number(tab.readSelectedNestedScalar("EXTENT", "WIDTH", 0, nestPath));
  const height = Number(tab.readSelectedNestedScalar("EXTENT", "HEIGHT", 0, nestPath));

  const textPreview = String(tab.readSelectedNestedScalar("TEXT", "TEXT", "", nestPath)).trim();
  const fontPreview = String(tab.readSelectedNestedScalar("TEXT", "FONT", "", nestPath)).trim();
  const borderFill = String(tab.readSelectedNestedScalar("BORDER", "FILL", "", nestPath)).trim();
  const hilightFill = String(tab.readSelectedNestedScalar("HILIGHT", "FILL", "", nestPath)).trim();

  const textSummary = textPreview
    ? textPreview.slice(0, 28) + (textPreview.length > 28 ? "…" : "")
    : fontPreview || "empty";
  const borderSummary = borderFill || "no fill";
  const hilightSummary = hilightFill || "no fill";

  return (
    <>
      <InspectorSection
        title="Identity"
        summary={`${tag || "(untitled)"} · id ${id}`}
        open={open.identity}
        onToggle={() => toggle("identity")}
      >
        <FieldRow label="TAG" info="Control name (CEXOSTRING). Child Obj_Parent values reference this string.">
          <ForgeInput
            value={tag}
            className="font-monospace"
            onChange={(e) =>
              tab.setSelectedScalar("TAG", GFFDataType.CEXOSTRING, e.target.value, `tag:${pathKey}`, nestPath)
            }
          />
        </FieldRow>

        {!isRoot && !hideType ? (
          <FieldRow label="Type" info="CONTROLTYPE — Label(4), Button(6), CheckBox(7), etc.">
            <ForgeSelect
              value={String(type)}
              onChange={(e) =>
                tab.setSelectedScalar("CONTROLTYPE", GFFDataType.INT, Number(e.target.value), undefined, nestPath)
              }
            >
              {guiControlTypeOptions()
                .filter((opt) => {
                  if (
                    opt.value === GUIControlType.ProtoItem ||
                    opt.value === GUIControlType.ScrollBar
                  ) {
                    return opt.value === type;
                  }
                  return true;
                })
                .map((opt) => (
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
            onChange={(n) => tab.setSelectedScalar("ID", GFFDataType.INT, n >>> 0, `id:${pathKey}`, nestPath)}
          />
        </FieldRow>
      </InspectorSection>

      {!isRoot || nestPath ? (
        <InspectorSection
          title="Hierarchy"
          summary={parent ? `parent ${parent}` : "no parent"}
          open={open.hierarchy}
          onToggle={() => toggle("hierarchy")}
        >
          <FieldRow label="Parent" info="Obj_Parent — TAG of the parent control.">
            <ForgeInput
              value={parent}
              className="font-monospace"
              onChange={(e) =>
                tab.setSelectedScalar(
                  "Obj_Parent",
                  GFFDataType.CEXOSTRING,
                  e.target.value,
                  `parent:${pathKey}`,
                  nestPath,
                )
              }
            />
          </FieldRow>
          <FieldRow label="Parent ID" info="Obj_ParentID — numeric parent control ID.">
            <NumField
              value={parentId}
              onChange={(n) =>
                tab.setSelectedScalar("Obj_ParentID", GFFDataType.INT, n | 0, `parentId:${pathKey}`, nestPath)
              }
            />
          </FieldRow>
          <FieldRow label="Locked">
            <ForgeCheckbox
              label=""
              value={locked}
              onChange={(v) =>
                tab.setSelectedScalar("Obj_Locked", GFFDataType.BYTE, v ? 1 : 0, undefined, nestPath)
              }
            />
          </FieldRow>
          <FieldRow label="Padding">
            <NumField
              value={padding}
              onChange={(n) => tab.setSelectedScalar("PADDING", GFFDataType.INT, n, `pad:${pathKey}`, nestPath)}
            />
          </FieldRow>
        </InspectorSection>
      ) : (
        <InspectorSection
          title="Flags"
          summary={locked ? "locked" : "unlocked"}
          open={open.hierarchy}
          onToggle={() => toggle("hierarchy")}
        >
          <FieldRow label="Locked">
            <ForgeCheckbox
              label=""
              value={locked}
              onChange={(v) =>
                tab.setSelectedScalar("Obj_Locked", GFFDataType.BYTE, v ? 1 : 0, undefined, nestPath)
              }
            />
          </FieldRow>
          <FieldRow label="Padding">
            <NumField
              value={padding}
              onChange={(n) => tab.setSelectedScalar("PADDING", GFFDataType.INT, n, `pad:${pathKey}`, nestPath)}
            />
          </FieldRow>
        </InspectorSection>
      )}

      <InspectorSection
        title="Extent"
        summary={`${Math.round(width)}×${Math.round(height)} @ ${Math.round(left)},${Math.round(top)}`}
        open={open.extent}
        onToggle={() => toggle("extent")}
      >
        <div className="tab-gui-editor__extent-grid">
          <FieldRow label="Left">
            <NumField
              value={left}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "LEFT", GFFDataType.INT, n, `ext-l:${pathKey}`, nestPath)
              }
            />
          </FieldRow>
          <FieldRow label="Top">
            <NumField
              value={top}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "TOP", GFFDataType.INT, n, `ext-t:${pathKey}`, nestPath)
              }
            />
          </FieldRow>
          <FieldRow label="Width">
            <NumField
              value={width}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "WIDTH", GFFDataType.INT, n, `ext-w:${pathKey}`, nestPath)
              }
            />
          </FieldRow>
          <FieldRow label="Height">
            <NumField
              value={height}
              onChange={(n) =>
                tab.setSelectedNestedScalar("EXTENT", "HEIGHT", GFFDataType.INT, n, `ext-h:${pathKey}`, nestPath)
              }
            />
          </FieldRow>
        </div>
      </InspectorSection>

      <InspectorSection
        title="Text"
        summary={textSummary}
        open={open.text}
        onToggle={() => toggle("text")}
      >
        <GUITextFields tab={tab} nestPath={nestPath} />
      </InspectorSection>

      <InspectorSection
        title="Border"
        summary={borderSummary}
        open={open.border}
        onToggle={() => toggle("border")}
      >
        <GUIBorderFields tab={tab} group="BORDER" showInnerOffsetY={showTslY} nestPath={nestPath} />
      </InspectorSection>

      <InspectorSection
        title="Highlight"
        summary={hilightSummary}
        open={open.highlight}
        onToggle={() => toggle("highlight")}
      >
        <GUIBorderFields
          tab={tab}
          group="HILIGHT"
          showInnerOffsetY={showTslY}
          coalescePrefix="hilight"
          nestPath={nestPath}
        />
      </InspectorSection>
    </>
  );
}

export function GUIInspector(props: GUIInspectorProps) {
  const { tab, generation } = props;
  void generation;
  const struct = tab.selectedNode;
  const resetKey = tab.selectedPath || GUI_ROOT_PATH;
  const { open, toggle, expandAll, collapseAll } = useInspectorSections(resetKey);
  const nestSections = useInspectorSections(`${resetKey}:nest`);

  const isRoot = tab.selectedPath === GUI_ROOT_PATH;
  const controlType = struct ? Number(getScalarFieldValueSafe(struct, "CONTROLTYPE", -1)) : GUIControlType.Invalid;
  const showTslY = isTslGuiGame(GameState.GameKey);
  const tag = struct ? String(tab.readSelectedScalar("TAG", "")) : "";
  const typeLabel = guiControlTypeLabel(controlType);

  const moveToUp = struct
    ? Number(tab.readSelectedNestedScalar("MOVETO", "UP", GUI_MOVETO_NONE))
    : GUI_MOVETO_NONE;
  const moveToDown = struct
    ? Number(tab.readSelectedNestedScalar("MOVETO", "DOWN", GUI_MOVETO_NONE))
    : GUI_MOVETO_NONE;
  const moveToLeft = struct
    ? Number(tab.readSelectedNestedScalar("MOVETO", "LEFT", GUI_MOVETO_NONE))
    : GUI_MOVETO_NONE;
  const moveToRight = struct
    ? Number(tab.readSelectedNestedScalar("MOVETO", "RIGHT", GUI_MOVETO_NONE))
    : GUI_MOVETO_NONE;
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

  const hasTypeSection =
    controlType === GUIControlType.CheckBox ||
    controlType === GUIControlType.Progress ||
    controlType === GUIControlType.Slider ||
    controlType === GUIControlType.ScrollBar ||
    controlType === GUIControlType.Listbox;

  let typeSectionTitle = "Type options";
  if (controlType === GUIControlType.CheckBox) typeSectionTitle = "CheckBox";
  else if (controlType === GUIControlType.Progress) typeSectionTitle = "Progress";
  else if (controlType === GUIControlType.Slider) typeSectionTitle = "Slider";
  else if (controlType === GUIControlType.ScrollBar) typeSectionTitle = "ScrollBar";
  else if (controlType === GUIControlType.Listbox) typeSectionTitle = "ListBox";

  let typeSummary = typeLabel;
  if (controlType === GUIControlType.Slider) {
    typeSummary = String(tab.readSelectedNestedScalar("THUMB", "IMAGE", "")) || "no thumb";
  } else if (controlType === GUIControlType.Progress) {
    typeSummary = `${tab.readSelectedScalar("CURVALUE", 0)} / ${tab.readSelectedScalar("MAXVALUE", 100)}`;
  } else if (controlType === GUIControlType.Listbox) {
    typeSummary = Number(tab.readSelectedScalar("LEFTSCROLLBAR", 0)) ? "left scrollbar" : "right scrollbar";
  }

  const navSummary = [moveToUp, moveToDown, moveToLeft, moveToRight].every((v) => v === GUI_MOVETO_NONE)
    ? "none"
    : "linked";

  if (!struct) {
    return (
      <div className="tab-gui-editor__inspector">
        <p className="tab-gui-editor__empty">Select a control.</p>
      </div>
    );
  }

  return (
    <div className="tab-gui-editor__inspector">
      <div className="tab-gui-editor__inspector-header">
        <div className="tab-gui-editor__inspector-heading">
          <div className="tab-gui-editor__inspector-tag font-monospace" title={tag || "(untitled)"}>
            {tag || "(untitled)"}
          </div>
          <div className="tab-gui-editor__inspector-meta">
            {isRoot ? "Root panel" : typeLabel}
          </div>
        </div>
        <div className="tab-gui-editor__inspector-tools">
          <ForgeButton size="sm" variant="secondary" onClick={expandAll} title="Expand all sections">
            Expand
          </ForgeButton>
          <ForgeButton size="sm" variant="secondary" onClick={collapseAll} title="Collapse detail sections">
            Collapse
          </ForgeButton>
        </div>
      </div>

      <div className="tab-gui-editor__inspector-scroll">
        <ControlChromeFields
          tab={tab}
          isRoot={isRoot}
          showTslY={showTslY}
          open={open}
          toggle={toggle}
        />

        {hasTypeSection ? (
          <InspectorSection
            title={typeSectionTitle}
            summary={String(typeSummary)}
            open={open.type}
            onToggle={() => toggle("type")}
          >
            {controlType === GUIControlType.CheckBox ? (
              <>
                <p className="tab-gui-editor__section-hint">Checked-state border nests.</p>
                <h5 className="tab-gui-editor__subhead">Selected</h5>
                <GUIBorderFields tab={tab} group="SELECTED" showInnerOffsetY={showTslY} coalescePrefix="sel" />
                <h5 className="tab-gui-editor__subhead">Highlight selected</h5>
                <GUIBorderFields
                  tab={tab}
                  group="HILIGHTSELECTED"
                  showInnerOffsetY={showTslY}
                  coalescePrefix="hsel"
                />
              </>
            ) : null}

            {controlType === GUIControlType.Progress ? (
              <>
                <FieldRow label="Start from left">
                  <ForgeCheckbox
                    label=""
                    value={Number(tab.readSelectedScalar("STARTFROMLEFT", 1)) !== 0}
                    onChange={(v) => tab.setSelectedScalar("STARTFROMLEFT", GFFDataType.BYTE, v ? 1 : 0)}
                  />
                </FieldRow>
                <FieldRow label="Current">
                  <NumField
                    value={Number(tab.readSelectedScalar("CURVALUE", 0))}
                    onChange={(n) =>
                      tab.setSelectedScalar("CURVALUE", GFFDataType.INT, n, `cur:${tab.selectedPath}`)
                    }
                  />
                </FieldRow>
                <FieldRow label="Maximum">
                  <NumField
                    value={Number(tab.readSelectedScalar("MAXVALUE", 100))}
                    onChange={(n) =>
                      tab.setSelectedScalar("MAXVALUE", GFFDataType.INT, n, `max:${tab.selectedPath}`)
                    }
                  />
                </FieldRow>
                <h5 className="tab-gui-editor__subhead">Progress fill</h5>
                <GUIBorderFields tab={tab} group="PROGRESS" showInnerOffsetY={showTslY} coalescePrefix="prog" />
              </>
            ) : null}

            {controlType === GUIControlType.Slider ? (
              <FieldRow label="Thumb image">
                <ForgeInput
                  className="font-monospace"
                  value={String(tab.readSelectedNestedScalar("THUMB", "IMAGE", ""))}
                  onChange={(e) =>
                    tab.setSelectedNestedScalar(
                      "THUMB",
                      "IMAGE",
                      GFFDataType.RESREF,
                      e.target.value,
                      `thumb:${tab.selectedPath}`,
                    )
                  }
                />
              </FieldRow>
            ) : null}

            {controlType === GUIControlType.ScrollBar ? (
              <>
                <FieldRow label="DIR image">
                  <ForgeInput
                    className="font-monospace"
                    value={String(tab.readSelectedNestedScalar("DIR", "IMAGE", ""))}
                    onChange={(e) =>
                      tab.setSelectedNestedScalar("DIR", "IMAGE", GFFDataType.RESREF, e.target.value)
                    }
                  />
                </FieldRow>
                <FieldRow label="THUMB image">
                  <ForgeInput
                    className="font-monospace"
                    value={String(tab.readSelectedNestedScalar("THUMB", "IMAGE", ""))}
                    onChange={(e) =>
                      tab.setSelectedNestedScalar("THUMB", "IMAGE", GFFDataType.RESREF, e.target.value)
                    }
                  />
                </FieldRow>
              </>
            ) : null}

            {controlType === GUIControlType.Listbox ? (
              <>
                <FieldRow label="Left scrollbar" info="LEFTSCROLLBAR — place scrollbar on the left.">
                  <ForgeCheckbox
                    label=""
                    value={Number(tab.readSelectedScalar("LEFTSCROLLBAR", 0)) !== 0}
                    onChange={(v) => tab.setSelectedScalar("LEFTSCROLLBAR", GFFDataType.BYTE, v ? 1 : 0)}
                  />
                </FieldRow>

                <InspectorSection
                  title="PROTOITEM"
                  summary={
                    String(tab.readSelectedScalar("TAG", "", "PROTOITEM")) ||
                    (getNestedStruct(struct, "PROTOITEM") ? "nested item" : "missing")
                  }
                  open={open.proto}
                  onToggle={() => {
                    const next = !open.proto;
                    toggle("proto");
                    if (next) {
                      tab.ensureSelectedTypeNests();
                    }
                  }}
                >
                  {getNestedStruct(struct, "PROTOITEM") || tab.resolveInspectorStruct("PROTOITEM") ? (
                    <ControlChromeFields
                      tab={tab}
                      isRoot={false}
                      hideType
                      showTslY={showTslY}
                      nestPath="PROTOITEM"
                      open={nestSections.open}
                      toggle={nestSections.toggle}
                    />
                  ) : (
                    <p className="tab-gui-editor__section-hint">PROTOITEM nest is missing on this ListBox.</p>
                  )}
                </InspectorSection>

                <InspectorSection
                  title="SCROLLBAR"
                  summary={
                    String(tab.readSelectedNestedScalar("THUMB", "IMAGE", "", "SCROLLBAR")) ||
                    (getNestedStruct(struct, "SCROLLBAR") ? "nested bar" : "missing")
                  }
                  open={open.scroll}
                  onToggle={() => {
                    const next = !open.scroll;
                    toggle("scroll");
                    if (next) {
                      tab.ensureSelectedTypeNests();
                    }
                  }}
                >
                  {getNestedStruct(struct, "SCROLLBAR") ? (
                    <>
                      <ControlChromeFields
                        tab={tab}
                        isRoot={false}
                        hideType
                        showTslY={showTslY}
                        nestPath="SCROLLBAR"
                        open={nestSections.open}
                        toggle={nestSections.toggle}
                      />
                      <h5 className="tab-gui-editor__subhead">Images</h5>
                      <FieldRow label="DIR image">
                        <ForgeInput
                          className="font-monospace"
                          value={String(tab.readSelectedNestedScalar("DIR", "IMAGE", "", "SCROLLBAR"))}
                          onChange={(e) =>
                            tab.setSelectedNestedScalar(
                              "DIR",
                              "IMAGE",
                              GFFDataType.RESREF,
                              e.target.value,
                              `sb-dir:${tab.selectedPath}`,
                              "SCROLLBAR",
                            )
                          }
                        />
                      </FieldRow>
                      <FieldRow label="THUMB image">
                        <ForgeInput
                          className="font-monospace"
                          value={String(tab.readSelectedNestedScalar("THUMB", "IMAGE", "", "SCROLLBAR"))}
                          onChange={(e) =>
                            tab.setSelectedNestedScalar(
                              "THUMB",
                              "IMAGE",
                              GFFDataType.RESREF,
                              e.target.value,
                              `sb-thumb:${tab.selectedPath}`,
                              "SCROLLBAR",
                            )
                          }
                        />
                      </FieldRow>
                    </>
                  ) : (
                    <p className="tab-gui-editor__section-hint">SCROLLBAR nest is missing on this ListBox.</p>
                  )}
                </InspectorSection>
              </>
            ) : null}
          </InspectorSection>
        ) : null}

        <InspectorSection
          title="Navigation"
          summary={navSummary}
          open={open.nav}
          onToggle={() => toggle("nav")}
        >
          <p className="tab-gui-editor__section-hint">
            Gamepad d-pad targets by control <code>ID</code>. <code>-1</code> means none.
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
        </InspectorSection>
      </div>
    </div>
  );
}

function getScalarFieldValueSafe(
  struct:
    | {
        hasField?: (l: string) => boolean;
        getFieldByLabel?: (l: string) => { getValue?: () => unknown } | undefined;
      }
    | undefined,
  label: string,
  fallback: number,
): number {
  if (!struct?.hasField?.(label)) {
    return fallback;
  }
  const value = struct.getFieldByLabel?.(label)?.getValue?.();
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

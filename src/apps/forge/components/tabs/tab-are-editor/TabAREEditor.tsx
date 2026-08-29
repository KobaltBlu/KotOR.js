import React, { useEffect, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { TabAREEditorState, AREEditorModel } from "@/apps/forge/states/tabs/TabAREEditorState";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import "@/apps/forge/components/tabs/tab-ifo-editor/TabIFOEditor.scss";

export const TabAREEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabAREEditorState;
  const [model, setModel] = useState<AREEditorModel>({ ...tab.model });

  useEffect(() => {
    const refresh = () => setModel({ ...tab.model });
    tab.addEventListener("onAREChanged", refresh);
    tab.addEventListener("onEditorFileLoad", refresh);
    refresh();
    return () => {
      tab.removeEventListener("onAREChanged", refresh);
      tab.removeEventListener("onEditorFileLoad", refresh);
    };
  }, [tab]);

  const field = (
    label: string,
    key: keyof AREEditorModel,
    type: "text" | "number" = "text",
  ) => (
    <label key={String(key)}>
      {label}
      <ForgeInput
        type={type}
        value={model[key] as string | number | boolean as any}
        onChange={(e) => {
          const value = type === "number" ? Number(e.target.value) || 0 : e.target.value;
          tab.patchModel({ [key]: value } as Partial<AREEditorModel>, `are-${String(key)}`);
        }}
      />
    </label>
  );

  return (
    <div className="tab-are-editor">
      <div className="tab-are-editor__header">
        <div>
          <h2>Area (ARE)</h2>
          <p>Odyssey area properties. Use Raw GFF for Rooms list and advanced fields.</p>
        </div>
        <ForgeButton size="sm" onClick={() => tab.openAsRawGff()}>
          Open Raw GFF
        </ForgeButton>
      </div>
      <div className="tab-are-editor__grid">
        {field("Name", "name")}
        {field("Tag", "tag")}
        {field("Grass Texture", "grassTexName")}
        {field("Env Audio", "envAudio", "number")}
        {field("Chance Rain", "chanceRain", "number")}
        {field("Chance Snow", "chanceSnow", "number")}
        {field("Chance Lightning", "chanceLightning", "number")}
        {field("Sun Fog Near", "fogNear", "number")}
        {field("Sun Fog Far", "fogFar", "number")}
        <label>
          Sun Fog
          <input
            type="checkbox"
            checked={model.sunFogOn}
            onChange={(e) => tab.patchModel({ sunFogOn: e.target.checked }, "are-sunFogOn")}
          />
        </label>
        <label>
          Moon Fog
          <input
            type="checkbox"
            checked={model.moonFogOn}
            onChange={(e) => tab.patchModel({ moonFogOn: e.target.checked }, "are-moonFogOn")}
          />
        </label>
      </div>
      <label className="tab-are-editor__description">
        Comments
        <textarea
          className="forge-input"
          rows={4}
          value={model.comments}
          onChange={(e) => tab.patchModel({ comments: e.target.value }, "are-comments")}
        />
      </label>
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { TabIFOEditorState, IFOEditorModel } from "@/apps/forge/states/tabs/TabIFOEditorState";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import "@/apps/forge/components/tabs/tab-ifo-editor/TabIFOEditor.scss";

export const TabIFOEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabIFOEditorState;
  const [model, setModel] = useState<IFOEditorModel>({ ...tab.model });

  useEffect(() => {
    const refresh = () => setModel({ ...tab.model });
    tab.addEventListener("onIFOChanged", refresh);
    tab.addEventListener("onEditorFileLoad", refresh);
    refresh();
    return () => {
      tab.removeEventListener("onIFOChanged", refresh);
      tab.removeEventListener("onEditorFileLoad", refresh);
    };
  }, [tab]);

  const field = (
    label: string,
    key: keyof IFOEditorModel,
    type: "text" | "number" = "text",
  ) => (
    <label key={key}>
      {label}
      <ForgeInput
        type={type}
        value={model[key] as string | number}
        onChange={(e) => {
          const value = type === "number" ? Number(e.target.value) || 0 : e.target.value;
          tab.patchModel({ [key]: value } as Partial<IFOEditorModel>, `ifo-${key}`);
        }}
      />
    </label>
  );

  return (
    <div className="tab-ifo-editor">
      <div className="tab-ifo-editor__header">
        <div>
          <h2>Module Info (IFO)</h2>
          <p>Odyssey module metadata. Use Raw GFF for advanced fields.</p>
        </div>
        <ForgeButton size="sm" onClick={() => tab.openAsRawGff()}>
          Open Raw GFF
        </ForgeButton>
      </div>
      <div className="tab-ifo-editor__grid">
        {field("Module Name", "modName")}
        {field("Module Tag", "modTag")}
        {field("Entry Area", "entryArea")}
        {field("Start Movie", "startMovie")}
        {field("VO ID", "voId")}
        {field("Entry X", "entryX", "number")}
        {field("Entry Y", "entryY", "number")}
        {field("Entry Z", "entryZ", "number")}
        {field("Entry Dir X", "entryDirX", "number")}
        {field("Entry Dir Y", "entryDirY", "number")}
        {field("Dawn Hour", "dawnHour", "number")}
        {field("Dusk Hour", "duskHour", "number")}
        {field("XP Scale", "xpScale", "number")}
      </div>
      <label className="tab-ifo-editor__description">
        Description
        <textarea
          className="forge-input"
          rows={5}
          value={model.description}
          onChange={(e) => tab.patchModel({ description: e.target.value }, "ifo-description")}
        />
      </label>
    </div>
  );
};

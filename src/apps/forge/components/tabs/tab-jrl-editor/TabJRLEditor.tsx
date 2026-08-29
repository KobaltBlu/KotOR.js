import React, { useEffect, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { TabJRLEditorState, JournalCategory } from "@/apps/forge/states/tabs/TabJRLEditorState";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import "@/apps/forge/components/tabs/tab-jrl-editor/TabJRLEditor.scss";

export const TabJRLEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabJRLEditorState;
  const [categories, setCategories] = useState<JournalCategory[]>([...tab.categories]);
  const [selected, setSelected] = useState(tab.selectedCategoryIndex);

  useEffect(() => {
    const refresh = () => {
      setCategories([...tab.categories]);
      setSelected(tab.selectedCategoryIndex);
    };
    tab.addEventListener("onJournalChanged", refresh);
    tab.addEventListener("onEditorFileLoad", refresh);
    refresh();
    return () => {
      tab.removeEventListener("onJournalChanged", refresh);
      tab.removeEventListener("onEditorFileLoad", refresh);
    };
  }, [tab]);

  const category = categories[selected];

  return (
    <div className="tab-jrl-editor">
      <div className="tab-jrl-editor__sidebar">
        <div className="tab-jrl-editor__sidebar-header">
          <strong>Categories</strong>
          <ForgeButton size="sm" variant="primary" onClick={() => tab.addCategory()}>
            Add
          </ForgeButton>
        </div>
        <ul className="tab-jrl-editor__category-list">
          {categories.map((item, index) => (
            <li key={`${item.tag}-${index}`}>
              <button
                type="button"
                className={index === selected ? "is-active" : ""}
                onClick={() => {
                  tab.selectedCategoryIndex = index;
                  setSelected(index);
                }}
              >
                <span>{item.name || item.tag || `Category ${index + 1}`}</span>
                <small>{item.tag}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="tab-jrl-editor__main">
        {!category ? (
          <div className="tab-jrl-editor__empty">No journal categories. Click Add to create a plot.</div>
        ) : (
          <>
            <div className="tab-jrl-editor__fields">
              <label>
                Tag
                <ForgeInput
                  value={category.tag}
                  maxLength={32}
                  onChange={(e) => {
                    category.tag = e.target.value;
                    tab.updateFile({ coalesceKey: `jrl-tag-${selected}` });
                  }}
                />
              </label>
              <label>
                Name
                <ForgeInput
                  value={category.name}
                  onChange={(e) => {
                    category.name = e.target.value;
                    tab.updateFile({ coalesceKey: `jrl-name-${selected}` });
                  }}
                />
              </label>
              <label>
                Priority
                <ForgeInput
                  type="number"
                  value={category.priority}
                  onChange={(e) => {
                    category.priority = Number(e.target.value) || 0;
                    tab.updateFile({ coalesceKey: `jrl-priority-${selected}` });
                  }}
                />
              </label>
              <label className="tab-jrl-editor__comment">
                Comment
                <textarea
                  className="forge-input"
                  rows={2}
                  value={category.comment}
                  onChange={(e) => {
                    category.comment = e.target.value;
                    tab.updateFile({ coalesceKey: `jrl-comment-${selected}` });
                  }}
                />
              </label>
              <ForgeButton
                size="sm"
                variant="danger"
                onClick={() => tab.removeCategory(selected)}
              >
                Remove Category
              </ForgeButton>
            </div>
            <div className="tab-jrl-editor__entries-header">
              <strong>Entries</strong>
              <ForgeButton size="sm" onClick={() => tab.addEntry(selected)}>
                Add Entry
              </ForgeButton>
            </div>
            <div className="tab-jrl-editor__entries">
              {category.entries.map((entry, entryIndex) => (
                <div key={entryIndex} className="tab-jrl-editor__entry">
                  <div className="tab-jrl-editor__entry-meta">
                    <label>
                      ID
                      <ForgeInput
                        type="number"
                        value={entry.id}
                        onChange={(e) => {
                          entry.id = Number(e.target.value) || 0;
                          tab.updateFile({ coalesceKey: `jrl-entry-id-${selected}-${entryIndex}` });
                        }}
                      />
                    </label>
                    <label>
                      End
                      <ForgeInput
                        type="number"
                        value={entry.end}
                        onChange={(e) => {
                          entry.end = Number(e.target.value) || 0;
                          tab.updateFile({ coalesceKey: `jrl-entry-end-${selected}-${entryIndex}` });
                        }}
                      />
                    </label>
                    <label>
                      XP %
                      <ForgeInput
                        type="number"
                        value={entry.xp_percentage}
                        onChange={(e) => {
                          entry.xp_percentage = Number(e.target.value) || 0;
                          tab.updateFile({ coalesceKey: `jrl-entry-xp-${selected}-${entryIndex}` });
                        }}
                      />
                    </label>
                    <ForgeButton
                      size="sm"
                      variant="danger"
                      onClick={() => tab.removeEntry(selected, entryIndex)}
                    >
                      Remove
                    </ForgeButton>
                  </div>
                  <textarea
                    className="forge-input"
                    rows={3}
                    value={entry.text}
                    onChange={(e) => {
                      entry.text = e.target.value;
                      tab.updateFile({ coalesceKey: `jrl-entry-text-${selected}-${entryIndex}` });
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

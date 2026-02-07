import React from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabHelpState } from "../../../states/tabs/TabHelpState";
import {
  HELP_FOLDERS,
  getHelpDocUrl,
  type HelpFolder,
  type HelpDocument,
} from "../../../data/HelpContents";
import { WIKI_BASE_URL } from "../../../data/EditorWikiMapping";

export const TabHelp = function TabHelp(props: BaseTabProps) {
  const tab = props.tab as TabHelpState;

  const openUrl = (url: string) => {
    if (typeof window !== "undefined") window.open(url, "_blank");
  };

  return (
    <div className="tab-help p-4">
      <h2 className="h5 mb-3">Documentation</h2>
      <p className="text-muted small mb-4">
        Open documentation and tutorials in your browser. Use{" "}
        <strong>Help → Open Editor Documentation</strong> for the current editor&apos;s format.
      </p>
      {HELP_FOLDERS.map((folder: HelpFolder) => (
        <div key={folder.name} className="mb-4">
          <h3 className="h6 text-uppercase text-muted mb-2">{folder.name}</h3>
          <ul className="list-unstyled">
            {folder.documents.map((doc: HelpDocument) => (
              <li key={doc.file} className="mb-1">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-start text-decoration-none"
                  onClick={() => openUrl(doc.url ?? getHelpDocUrl(doc.file))}
                  title={doc.url ?? getHelpDocUrl(doc.file)}
                >
                  {doc.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <hr className="my-4" />
      <h3 className="h6 text-uppercase text-muted mb-2">Wiki</h3>
      <button
        type="button"
        className="btn btn-outline-primary btn-sm"
        onClick={() => openUrl(WIKI_BASE_URL)}
      >
        Open KotOR.js Wiki
      </button>
    </div>
  );
};

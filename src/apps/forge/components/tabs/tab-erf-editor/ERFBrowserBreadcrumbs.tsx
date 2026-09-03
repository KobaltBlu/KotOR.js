/**
 * Breadcrumb trail for nested archive navigation.
 *
 * @file ERFBrowserBreadcrumbs.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import type { TabERFEditorState } from "@/apps/forge/states/tabs/TabERFEditorState";

export interface ERFBrowserBreadcrumbsProps {
  tab: TabERFEditorState;
}

export function ERFBrowserBreadcrumbs(props: ERFBrowserBreadcrumbsProps) {
  const { tab } = props;
  const path = tab.cwdPath;

  return (
    <nav className="erf-breadcrumbs" aria-label="Archive path">
      {path.map((node, index) => {
        const isLast = index === path.length - 1;
        return (
          <React.Fragment key={`${node.id}-${index}`}>
            {index > 0 && <span className="erf-breadcrumbs__sep" aria-hidden="true">/</span>}
            {isLast ? (
              <span className="erf-breadcrumbs__current" aria-current="page">
                {node.name}
              </span>
            ) : (
              <button
                type="button"
                className="erf-breadcrumbs__crumb"
                onClick={() => tab.navigateToBreadcrumb(index)}
              >
                {node.name}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

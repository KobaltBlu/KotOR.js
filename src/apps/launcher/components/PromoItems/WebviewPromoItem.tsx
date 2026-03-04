import React from "react";

import type { LauncherProfileElement } from "@/apps/launcher/types";

export interface WebviewPromoItemProps {
  element: LauncherProfileElement;
  onClick?: (element: LauncherProfileElement) => void;
  onDoubleClick?: (element: LauncherProfileElement) => void;
}

export const WebviewPromoItem = function(props: WebviewPromoItemProps) {
  const element = props.element;

  return (
    <div className="promo-element webview">
      <iframe src={element.url} width="646" height="190" />
    </div>
  );

}

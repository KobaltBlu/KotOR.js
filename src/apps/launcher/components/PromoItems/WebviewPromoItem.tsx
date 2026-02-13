import React from "react";

import { useApp } from "../../context/AppContext";

import type { LauncherProfileElement } from "../../../types";

export interface WebviewPromoItemProps {
  element: LauncherProfileElement;
  onClick?: (element: LauncherProfileElement) => void;
  onDoubleClick?: (element: LauncherProfileElement) => void;
}

export const WebviewPromoItem = function(props: WebviewPromoItemProps) {
  const element = props.element;
  const appContext = useApp();

  return (
    <div className="promo-element webview">
      <iframe src={element.url} width="646" height="190" />
    </div>
  );

}

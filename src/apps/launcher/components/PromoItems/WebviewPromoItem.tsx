import React from "react";
import { useApp } from "../../context/AppContext";

export interface ProfilePromoItemProps {
  element: any;
}

export const WebviewPromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;
  const appContext = useApp();

  return (
    <div className="promo-element webview">
      <iframe src={element.url} width="646" height="190" />
    </div>
  );

}

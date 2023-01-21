import React from "react";
import { useApp } from "../../context/AppContext";

export interface ProfilePromoItemProps {
  element: any;
}

export const WebviewPromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;
  const myContext = useApp();

  return (
    <div className="promo-element webview">
      <iframe src={element.url} width="646" height="190" />
    </div>
  );

}

function setState(arg0: number): [any, any] {
  throw new Error("Function not implemented.");
}
